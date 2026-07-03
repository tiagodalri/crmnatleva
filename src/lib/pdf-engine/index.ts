/**
 * PDF Engine POC — Declarative layout tree → jsPDF vector render.
 *
 * Scope (POC):
 * - Node types: box, text
 * - Layout: column (default), row, grid (fixed fractional cols)
 * - Properties: width, minHeight, padding, gap, bg, border, radius, textAlign,
 *   font{size,weight,color}, gridCols
 * - Passes: measure → layout → render (no pagination, no QA)
 * - Fonts: Helvetica nativa (jsPDF built-in), 100% vetorial/selecionável
 *
 * All coordinates in mm. All final positions snapped via Math.round to
 * 0.1mm precision to avoid sub-point drift.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pdf = any;

export type Edges = number | [number, number] | [number, number, number, number];

export interface FontSpec {
  size?: number;              // pt
  weight?: "normal" | "bold";
  color?: string;             // hex
  lineHeight?: number;        // multiplier of size
  letterSpacing?: number;     // mm added between chars (jsPDF charSpace)
  align?: "left" | "center" | "right";
  transform?: "none" | "uppercase";
}

export interface Style {
  width?: number | "auto" | "fill";
  minHeight?: number;
  height?: number;
  padding?: Edges;
  gap?: number;
  bg?: string;                // hex
  border?: { color: string; width: number; sides?: ("top"|"right"|"bottom"|"left")[] };
  radius?: number;            // mm; 0 = square
  layout?: "column" | "row" | "grid";
  gridCols?: number[];        // fractions summing to any positive number
  align?: "start" | "center" | "end";       // cross-axis for row / row-in-column
  font?: FontSpec;
  textAlign?: "left" | "center" | "right";
}

export type Node =
  | { kind: "box"; style?: Style; children?: Node[] }
  | { kind: "text"; text: string; style?: Style };

interface Box {
  node: Node;
  x: number;
  y: number;
  w: number;
  h: number;
  contentX: number;
  contentY: number;
  contentW: number;
  contentH: number;
  children: Box[];
}

// ── utils ────────────────────────────────────────────────────────────────────
const round = (n: number) => Math.round(n * 10) / 10;

function edges(e?: Edges): [number, number, number, number] {
  if (e == null) return [0, 0, 0, 0];
  if (typeof e === "number") return [e, e, e, e];
  if (e.length === 2) return [e[0], e[1], e[0], e[1]];
  return e;
}

function ptToMm(pt: number) { return (pt * 25.4) / 72; }

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}

function applyFont(pdf: Pdf, f?: FontSpec) {
  const size = f?.size ?? 10;
  const weight = f?.weight ?? "normal";
  pdf.setFont("helvetica", weight);
  pdf.setFontSize(size);
  const [r, g, b] = hexToRgb(f?.color ?? "#111827");
  pdf.setTextColor(r, g, b);
  if (typeof f?.letterSpacing === "number") pdf.setCharSpace(f.letterSpacing);
  else pdf.setCharSpace(0);
}

function transformText(t: string, f?: FontSpec) {
  return f?.transform === "uppercase" ? t.toUpperCase() : t;
}

// ── measure ──────────────────────────────────────────────────────────────────
/** Returns text height in mm for a given width and font. */
function measureText(pdf: Pdf, text: string, widthMm: number, f?: FontSpec): { h: number; lines: string[] } {
  applyFont(pdf, f);
  const size = f?.size ?? 10;
  const lh = (f?.lineHeight ?? 1.35) * ptToMm(size);
  const lines: string[] = pdf.splitTextToSize(transformText(text, f), Math.max(1, widthMm));
  return { h: lines.length * lh, lines };
}

// ── layout ───────────────────────────────────────────────────────────────────
function resolveNodeIntrinsicHeight(pdf: Pdf, node: Node, contentW: number): number {
  if (node.kind === "text") {
    const { h } = measureText(pdf, node.text, contentW, node.style?.font);
    return Math.max(h, node.style?.minHeight ?? 0);
  }
  const style = node.style ?? {};
  const [pt, pr, pb, pl] = edges(style.padding);
  const gap = style.gap ?? 0;
  const layout = style.layout ?? "column";
  const innerW = contentW - pl - pr;
  const children = node.children ?? [];

  let contentH = 0;
  if (layout === "column") {
    for (let i = 0; i < children.length; i++) {
      contentH += resolveNodeIntrinsicHeight(pdf, children[i], innerW);
      if (i < children.length - 1) contentH += gap;
    }
  } else if (layout === "row") {
    // row: children share width equally unless width set (POC: equal split)
    const cols = children.length || 1;
    const totalGap = gap * (cols - 1);
    const each = (innerW - totalGap) / cols;
    let maxH = 0;
    for (const c of children) maxH = Math.max(maxH, resolveNodeIntrinsicHeight(pdf, c, each));
    contentH = maxH;
  } else if (layout === "grid") {
    const cols = style.gridCols ?? [1];
    const sum = cols.reduce((a, b) => a + b, 0) || 1;
    const totalGap = gap * (cols.length - 1);
    const widths = cols.map((f) => ((innerW - totalGap) * f) / sum);
    let maxH = 0;
    for (let i = 0; i < children.length; i++) {
      const w = widths[i % cols.length];
      maxH = Math.max(maxH, resolveNodeIntrinsicHeight(pdf, children[i], w));
    }
    // grid rows: for POC we assume single row per grid; caller composes rows via column-of-grids
    contentH = maxH;
  }

  return Math.max(contentH + pt + pb, style.minHeight ?? 0, style.height ?? 0);
}

function layoutNode(pdf: Pdf, node: Node, x: number, y: number, w: number): Box {
  const style = node.kind === "box" ? node.style ?? {} : node.style ?? {};
  const [pt, pr, pb, pl] = edges(style.padding);
  const gap = style.gap ?? 0;
  const layout = style.layout ?? "column";
  const contentW = w - pl - pr;
  const h = resolveNodeIntrinsicHeight(pdf, node, w);

  const box: Box = {
    node,
    x: round(x),
    y: round(y),
    w: round(w),
    h: round(h),
    contentX: round(x + pl),
    contentY: round(y + pt),
    contentW: round(contentW),
    contentH: round(h - pt - pb),
    children: [],
  };

  if (node.kind === "text") return box;
  const children = node.children ?? [];
  if (children.length === 0) return box;

  if (layout === "column") {
    let cy = box.contentY;
    for (let i = 0; i < children.length; i++) {
      const cb = layoutNode(pdf, children[i], box.contentX, cy, box.contentW);
      box.children.push(cb);
      cy += cb.h + (i < children.length - 1 ? gap : 0);
    }
  } else if (layout === "row") {
    const cols = children.length;
    const totalGap = gap * (cols - 1);
    const each = (box.contentW - totalGap) / cols;
    let cx = box.contentX;
    for (let i = 0; i < children.length; i++) {
      const cb = layoutNode(pdf, children[i], cx, box.contentY, each);
      // stretch child height to row height
      cb.h = box.contentH;
      box.children.push(cb);
      cx += each + gap;
    }
  } else if (layout === "grid") {
    const cols = style.gridCols ?? [1];
    const sum = cols.reduce((a, b) => a + b, 0) || 1;
    const totalGap = gap * (cols.length - 1);
    const widths = cols.map((f) => ((box.contentW - totalGap) * f) / sum);
    let cx = box.contentX;
    for (let i = 0; i < children.length; i++) {
      const cw = widths[i % cols.length];
      const cb = layoutNode(pdf, children[i], cx, box.contentY, cw);
      cb.h = box.contentH;
      box.children.push(cb);
      cx += cw + gap;
      if ((i + 1) % cols.length === 0) cx = box.contentX;
    }
  }

  return box;
}

// ── render ───────────────────────────────────────────────────────────────────
function renderBox(pdf: Pdf, box: Box) {
  const node = box.node;
  const style = node.style ?? {};

  if (node.kind === "box") {
    if (style.bg) {
      const [r, g, b] = hexToRgb(style.bg);
      pdf.setFillColor(r, g, b);
      if (style.radius && style.radius > 0) {
        pdf.roundedRect(box.x, box.y, box.w, box.h, style.radius, style.radius, "F");
      } else {
        pdf.rect(box.x, box.y, box.w, box.h, "F");
      }
    }
    if (style.border) {
      const [r, g, b] = hexToRgb(style.border.color);
      pdf.setDrawColor(r, g, b);
      pdf.setLineWidth(style.border.width);
      const sides = style.border.sides;
      if (!sides) {
        if (style.radius && style.radius > 0) {
          pdf.roundedRect(box.x, box.y, box.w, box.h, style.radius, style.radius, "S");
        } else {
          pdf.rect(box.x, box.y, box.w, box.h, "S");
        }
      } else {
        if (sides.includes("top")) pdf.line(box.x, box.y, box.x + box.w, box.y);
        if (sides.includes("bottom")) pdf.line(box.x, box.y + box.h, box.x + box.w, box.y + box.h);
        if (sides.includes("left")) pdf.line(box.x, box.y, box.x, box.y + box.h);
        if (sides.includes("right")) pdf.line(box.x + box.w, box.y, box.x + box.w, box.y + box.h);
      }
    }
    for (const c of box.children) renderBox(pdf, c);
    return;
  }

  // text
  applyFont(pdf, style.font);
  const size = style.font?.size ?? 10;
  const lhMm = (style.font?.lineHeight ?? 1.35) * ptToMm(size);
  const ascentMm = ptToMm(size) * 0.78; // approx baseline offset
  const align = style.font?.align ?? style.textAlign ?? "left";
  const t = transformText(node.text, style.font);
  const lines: string[] = pdf.splitTextToSize(t, Math.max(1, box.contentW));

  // vertical centering within box
  const textBlockH = lines.length * lhMm;
  const yStart = box.contentY + Math.max(0, (box.contentH - textBlockH) / 2) + ascentMm;

  let xAnchor = box.contentX;
  if (align === "center") xAnchor = box.contentX + box.contentW / 2;
  else if (align === "right") xAnchor = box.contentX + box.contentW;

  lines.forEach((line, i) => {
    pdf.text(line, round(xAnchor), round(yStart + i * lhMm), { align });
  });
}

// ── public API ───────────────────────────────────────────────────────────────
export interface RenderOptions {
  format?: "a4";
  pageMargin?: number; // mm
}

export function renderDocument(pdf: Pdf, root: Node, opts: RenderOptions = {}) {
  const margin = opts.pageMargin ?? 12;
  const pageW = 210;
  const contentW = pageW - margin * 2;
  const box = layoutNode(pdf, root, margin, margin, contentW);
  renderBox(pdf, box);
  return box;
}

// ── convenience builders ─────────────────────────────────────────────────────
export const box = (style: Style, children: Node[]): Node => ({ kind: "box", style, children });
export const col = (style: Style, children: Node[]): Node => ({ kind: "box", style: { ...style, layout: "column" }, children });
export const row = (style: Style, children: Node[]): Node => ({ kind: "box", style: { ...style, layout: "row" }, children });
export const grid = (cols: number[], style: Style, children: Node[]): Node => ({
  kind: "box",
  style: { ...style, layout: "grid", gridCols: cols },
  children,
});
export const text = (t: string, style?: Style): Node => ({ kind: "text", text: t ?? "", style });
export const spacer = (h: number): Node => ({ kind: "box", style: { minHeight: h } });
