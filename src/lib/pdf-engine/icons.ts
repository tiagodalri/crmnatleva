/**
 * Vector icons — hand-coded with jsPDF primitives (circle/rect/line/bezier).
 * All icons render inside a 24×24 mm design grid at `size` mm, stroke-only,
 * following Lucide's visual language (round caps/joins, 1.8 stroke-width).
 */
import type { IconDraw, Pdf } from "./index";
import { hexToRgb } from "./index";

// Every icon draws around a center (cx, cy) at scale = size / 24.
function setup(pdf: Pdf, color: string, strokeWidth: number) {
  const [r, g, b] = hexToRgb(color);
  pdf.setDrawColor(r, g, b);
  pdf.setLineWidth(strokeWidth);
  pdf.setLineCap("round");
  pdf.setLineJoin("round");
}

/** Draw at (cx, cy) mapping design units (-12..12) to real mm. */
function u(cx: number, cy: number, s: number) {
  return (x: number, y: number): [number, number] => [cx + x * s, cy + y * s];
}

export const iconClock: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  pdf.circle(cx, cy, 10 * s, "S");
  // 12 → center
  pdf.line(cx, cy - 5 * s, cx, cy);
  // center → 3 o'clock-ish (4h direction: right & slightly down)
  pdf.line(cx, cy, cx + 4 * s, cy + 2 * s);
};

export const iconMessageCircle: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  // Bubble: rounded square with tail
  pdf.roundedRect(cx - 10 * s, cy - 10 * s, 20 * s, 18 * s, 4 * s, 4 * s, "S");
  // Tail
  const p = u(cx, cy, s);
  const [x1, y1] = p(-6, 8);
  const [x2, y2] = p(-3, 11);
  const [x3, y3] = p(-1, 8);
  pdf.line(x1, y1, x2, y2);
  pdf.line(x2, y2, x3, y3);
};

export const iconAlertCircle: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  pdf.circle(cx, cy, 10 * s, "S");
  pdf.line(cx, cy - 4 * s, cx, cy + 2 * s);
  // dot at bottom
  pdf.setFillColor(...(color === "#ffffff" ? [255, 255, 255] : hexToRgb(color)));
  pdf.circle(cx, cy + 5 * s, 0.6 * s, "F");
};

export const iconShieldCheck: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  // Shield outline (approximated with lines)
  const p = u(cx, cy, s);
  const pts: [number, number][] = [
    p(0, -10), p(9, -7), p(9, -1), p(7, 5), p(0, 11), p(-7, 5), p(-9, -1), p(-9, -7), p(0, -10),
  ];
  for (let i = 0; i < pts.length - 1; i++) pdf.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  // Check
  const [c1x, c1y] = p(-4, 0);
  const [c2x, c2y] = p(-1, 3);
  const [c3x, c3y] = p(5, -3);
  pdf.line(c1x, c1y, c2x, c2y);
  pdf.line(c2x, c2y, c3x, c3y);
};

export const iconShield: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  const p = u(cx, cy, s);
  const pts: [number, number][] = [
    p(0, -10), p(9, -7), p(9, -1), p(7, 5), p(0, 11), p(-7, 5), p(-9, -1), p(-9, -7), p(0, -10),
  ];
  for (let i = 0; i < pts.length - 1; i++) pdf.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
};

export const iconMapPin: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  // Teardrop: circle (upper) + two lines converging to point
  const topY = cy - 3 * s;
  pdf.circle(cx, topY, 6 * s, "S");
  const p = u(cx, cy, s);
  const [x1, y1] = p(-4, 3);
  const [x2, y2] = p(0, 11);
  const [x3, y3] = p(4, 3);
  pdf.line(x1, y1, x2, y2);
  pdf.line(x2, y2, x3, y3);
  // inner dot
  pdf.circle(cx, topY, 2 * s, "S");
};

export const iconTicket: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  pdf.roundedRect(cx - 10 * s, cy - 6 * s, 20 * s, 12 * s, 2 * s, 2 * s, "S");
  // dashed middle line
  const yTop = cy - 6 * s + 2 * s;
  const yBot = cy + 6 * s - 2 * s;
  for (let dy = yTop; dy < yBot; dy += 1.4 * s) {
    pdf.line(cx, dy, cx, Math.min(dy + 0.8 * s, yBot));
  }
};

export const iconCar: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  // body
  pdf.roundedRect(cx - 10 * s, cy - 2 * s, 20 * s, 7 * s, 1.5 * s, 1.5 * s, "S");
  // roof
  const p = u(cx, cy, s);
  const pts: [number, number][] = [p(-7, -2), p(-5, -7), p(5, -7), p(7, -2)];
  for (let i = 0; i < pts.length - 1; i++) pdf.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  // wheels
  pdf.circle(cx - 6 * s, cy + 6 * s, 1.5 * s, "S");
  pdf.circle(cx + 6 * s, cy + 6 * s, 1.5 * s, "S");
};

export const iconShip: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  // hull (u-shape approximated with 3 lines)
  const p = u(cx, cy, s);
  const [x1, y1] = p(-10, 4);
  const [x2, y2] = p(-8, 10);
  const [x3, y3] = p(8, 10);
  const [x4, y4] = p(10, 4);
  pdf.line(x1, y1, x2, y2);
  pdf.line(x2, y2, x3, y3);
  pdf.line(x3, y3, x4, y4);
  pdf.line(x1, y1, x4, y4);
  // mast
  pdf.line(cx, cy - 10 * s, cx, cy + 4 * s);
  // sail
  const [s1x, s1y] = p(0, -10);
  const [s2x, s2y] = p(6, -2);
  const [s3x, s3y] = p(0, -2);
  pdf.line(s1x, s1y, s2x, s2y);
  pdf.line(s2x, s2y, s3x, s3y);
};

export const iconTrain: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  pdf.roundedRect(cx - 8 * s, cy - 10 * s, 16 * s, 16 * s, 3 * s, 3 * s, "S");
  // window
  pdf.line(cx - 8 * s, cy - 2 * s, cx + 8 * s, cy - 2 * s);
  // wheels
  pdf.circle(cx - 5 * s, cy + 9 * s, 1.5 * s, "S");
  pdf.circle(cx + 5 * s, cy + 9 * s, 1.5 * s, "S");
};

export const iconBus: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  pdf.roundedRect(cx - 10 * s, cy - 10 * s, 20 * s, 16 * s, 2 * s, 2 * s, "S");
  pdf.line(cx - 10 * s, cy - 2 * s, cx + 10 * s, cy - 2 * s);
  pdf.circle(cx - 6 * s, cy + 9 * s, 1.5 * s, "S");
  pdf.circle(cx + 6 * s, cy + 9 * s, 1.5 * s, "S");
};

export const iconBackpack: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  // straps
  pdf.line(cx - 5 * s, cy - 10 * s, cx - 5 * s, cy - 6 * s);
  pdf.line(cx + 5 * s, cy - 10 * s, cx + 5 * s, cy - 6 * s);
  // body
  pdf.roundedRect(cx - 8 * s, cy - 8 * s, 16 * s, 18 * s, 3 * s, 3 * s, "S");
  // pocket
  pdf.line(cx - 8 * s, cy + 2 * s, cx + 8 * s, cy + 2 * s);
  pdf.line(cx - 4 * s, cy + 2 * s, cx - 4 * s, cy + 7 * s);
  pdf.line(cx + 4 * s, cy + 2 * s, cx + 4 * s, cy + 7 * s);
};

export const iconBriefcase: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  pdf.roundedRect(cx - 10 * s, cy - 5 * s, 20 * s, 14 * s, 2 * s, 2 * s, "S");
  // handle
  pdf.line(cx - 4 * s, cy - 5 * s, cx - 4 * s, cy - 9 * s);
  pdf.line(cx - 4 * s, cy - 9 * s, cx + 4 * s, cy - 9 * s);
  pdf.line(cx + 4 * s, cy - 9 * s, cx + 4 * s, cy - 5 * s);
  // divider
  pdf.line(cx - 10 * s, cy + 1 * s, cx + 10 * s, cy + 1 * s);
};

export const iconLuggage: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  // handle
  pdf.line(cx - 3 * s, cy - 10 * s, cx - 3 * s, cy - 7 * s);
  pdf.line(cx + 3 * s, cy - 10 * s, cx + 3 * s, cy - 7 * s);
  pdf.line(cx - 3 * s, cy - 10 * s, cx + 3 * s, cy - 10 * s);
  // body
  pdf.roundedRect(cx - 7 * s, cy - 7 * s, 14 * s, 16 * s, 2 * s, 2 * s, "S");
  // divider
  pdf.line(cx, cy - 7 * s, cx, cy + 9 * s);
  // wheels
  pdf.circle(cx - 4 * s, cy + 10 * s, 0.8 * s, "S");
  pdf.circle(cx + 4 * s, cy + 10 * s, 0.8 * s, "S");
};

export const iconPackage: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  // box outline (isometric)
  const p = u(cx, cy, s);
  const pts: [number, number][] = [p(-10, -4), p(0, -9), p(10, -4), p(10, 6), p(0, 11), p(-10, 6), p(-10, -4)];
  for (let i = 0; i < pts.length - 1; i++) pdf.line(pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1]);
  // vertical center + top diagonals
  const [mx, my] = p(0, 1);
  pdf.line(mx, my, mx, cy + 11 * s);
  pdf.line(cx - 10 * s, cy - 4 * s, mx, my);
  pdf.line(cx + 10 * s, cy - 4 * s, mx, my);
};

export const iconSparkles: IconDraw = (pdf, cx, cy, size, color, sw) => {
  setup(pdf, color, sw);
  const s = size / 24;
  // 4-point star (large)
  pdf.line(cx, cy - 8 * s, cx, cy + 8 * s);
  pdf.line(cx - 8 * s, cy, cx + 8 * s, cy);
  pdf.line(cx - 5 * s, cy - 5 * s, cx + 5 * s, cy + 5 * s);
  pdf.line(cx - 5 * s, cy + 5 * s, cx + 5 * s, cy - 5 * s);
};

/** Round badge (thin outline) — use as icon frame in InfoLine components. */
export function drawIconBadge(pdf: Pdf, cx: number, cy: number, radiusMm: number, color: string, strokeWidth: number) {
  const [r, g, b] = hexToRgb(color);
  pdf.setDrawColor(r, g, b);
  pdf.setLineWidth(strokeWidth);
  pdf.circle(cx, cy, radiusMm, "S");
}
