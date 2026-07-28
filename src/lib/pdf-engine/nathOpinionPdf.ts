/**
 * "Opinião da Nath" — blueprint declarativo renderizado pela MESMA engine
 * vetorial usada nos vouchers/propostas (src/lib/pdf-engine/index.ts + jsPDF).
 * Identidade visual própria (roxa/premium), sem html2canvas.
 */
import { jsPDF } from "jspdf";
import { renderDocument, col, text, draw, type Node, type Pdf } from "./index";
import { loadLogoAsset, PAGE, SPACING, type LogoAsset } from "./theme/institutional";

// ── Paleta exclusiva do recurso ─────────────────────────────────────────────
export const NATH = {
  purple: "#7C3AED",
  purpleDeep: "#4C1D95",
  purpleSoft: "#F5F3FF",
  purpleLine: "#E9D5FF",
  pink: "#EC4899",
  textDark: "#1F2937",
  textSoft: "#4B5563",
  muted: "#6B7280",
  hairline: "#E5E7EB",
  white: "#FFFFFF",
} as const;

/** Tokens de forma · um único raio e uma única espessura de hairline. */
const RADIUS = 2;
const HAIRLINE = 0.2;
const CONTENT_W = PAGE.widthMm - PAGE.marginMm * 2;

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

const ptToMm = (pt: number) => (pt * 25.4) / 72;
/** Altura de caixa alta aproximada (Helvetica ≈ 0.72em) · usada para centrar baselines. */
const capMm = (pt: number) => ptToMm(pt) * 0.72;

/** Helvetica (WinAnsi) não possui glifos de emoji · removidos antes do render. */
export function stripEmoji(s: string) {
  return s
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const stripInlineMarks = (s: string) =>
  stripEmoji(s.replace(/\*\*(.*?)\*\*/g, "$1").replace(/(^|\s)\*(\S.*?\S)\*(?=\s|$)/g, "$1$2").replace(/`/g, ""));

/**
 * Formata telefone brasileiro bruto para exibição.
 * "5521964311748" → "+55 (21) 96431-1748" · "552133334444" → "+55 (21) 3333-4444".
 * Qualquer padrão não reconhecido retorna o valor original, sem quebrar.
 */
export function formatPhoneForPdf(raw?: string | null): string {
  const original = (raw ?? "").trim();
  if (!original) return "Não informado";
  const d = original.replace(/\D/g, "");
  const local = d.startsWith("55") && (d.length === 12 || d.length === 13) ? d.slice(2) : d;
  if (local.length === 11) return `+55 (${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `+55 (${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return original;
}

export interface NathBlock {
  title?: string;
  body: string;
}

/** Converte o markdown da análise em blocos (título de seção + parágrafo). */
export function parseNathMarkdown(markdown: string): NathBlock[] {
  const blocks: NathBlock[] = [];
  const lines = (markdown || "").split("\n");
  let current: NathBlock | null = null;

  const pushBody = (t: string) => {
    if (!t.trim()) return;
    if (current) current.body = current.body ? `${current.body}\n${t}` : t;
    else { current = { body: t }; blocks.push(current); }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    const heading =
      line.match(/^#{1,6}\s*(.+)$/) ||
      line.match(/^\*\*(.+?)\*\*\s*[:：]?\s*(.*)$/);

    if (heading) {
      const title = stripInlineMarks(heading[1]).replace(/[:：]\s*$/, "");
      const rest = heading[2] ? stripInlineMarks(heading[2]) : "";
      current = { title, body: rest };
      blocks.push(current);
      continue;
    }
    pushBody(stripInlineMarks(line.replace(/^\s*[-*•]\s*/, "· ")));
  }

  return blocks.filter((b) => (b.title && b.title.length > 0) || b.body.trim().length > 0);
}

// ── Header / Footer vetoriais (identidade roxa) ─────────────────────────────
const HEADER_MM = 22;
const FOOTER_MM = 16;
const BAND_PURPLE_MM = 1.8;
const BAND_PINK_MM = 0.8;

function drawNathHeader(pdf: Pdf, logo: LogoAsset | null) {
  const leftX = PAGE.marginMm;
  const rightX = PAGE.widthMm - PAGE.marginMm;
  const hairlineY = HEADER_MM - 1;

  // Faixa superior · roxo sólido + filete rosa (vetorial, nítido em qualquer zoom)
  pdf.setFillColor(...hexToRgb(NATH.purple));
  pdf.rect(0, 0, PAGE.widthMm, BAND_PURPLE_MM, "F");
  pdf.setFillColor(...hexToRgb(NATH.pink));
  pdf.rect(0, BAND_PURPLE_MM, PAGE.widthMm, BAND_PINK_MM, "F");

  const zoneTop = BAND_PURPLE_MM + BAND_PINK_MM;
  const zoneMid = zoneTop + (hairlineY - zoneTop) / 2;

  if (logo) {
    try {
      pdf.addImage(logo.dataUrl, "PNG", leftX, zoneMid - logo.heightMm / 2, logo.widthMm, logo.heightMm, undefined, "FAST");
    } catch { /* silent */ }
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...hexToRgb(NATH.purpleDeep));
    pdf.text("NatLeva", leftX, zoneMid + capMm(13) / 2, { baseline: "alphabetic" });
  }

  // Bloco direito · duas linhas no mesmo grid, opticamente centradas na zona
  const lineH = 4.5;
  const blockTop = zoneMid - lineH;
  const baseline1 = blockTop + capMm(12) + 0.6;
  const baseline2 = baseline1 + lineH;

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setCharSpace(0.3);
  pdf.setTextColor(...hexToRgb(NATH.purpleDeep));
  pdf.text("OPINIÃO DA NATH", rightX, baseline1, { align: "right", baseline: "alphabetic" });
  pdf.setCharSpace(0);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...hexToRgb(NATH.muted));
  pdf.text("CEO & Fundadora · NatLeva", rightX, baseline2, { align: "right", baseline: "alphabetic" });

  pdf.setDrawColor(...hexToRgb(NATH.purpleLine));
  pdf.setLineWidth(HAIRLINE);
  pdf.line(leftX, hairlineY, rightX, hairlineY);
}

function drawNathFooter(pdf: Pdf, page: number, total: number) {
  const leftX = PAGE.marginMm;
  const rightX = PAGE.widthMm - PAGE.marginMm;
  const dividerY = PAGE.heightMm - FOOTER_MM + 3;
  const lineH = 4.5;
  const baseline1 = dividerY + lineH + capMm(8) / 2;
  const baseline2 = baseline1 + lineH;

  pdf.setDrawColor(...hexToRgb(NATH.hairline));
  pdf.setLineWidth(HAIRLINE);
  pdf.line(leftX, dividerY, rightX, dividerY);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setCharSpace(0.4);
  pdf.setTextColor(...hexToRgb(NATH.purple));
  pdf.text("NATH · CEO NATLEVA", leftX, baseline1, { baseline: "alphabetic" });
  pdf.setCharSpace(0);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...hexToRgb(NATH.muted));
  pdf.text("Gerado automaticamente pela IA da NatLeva", leftX, baseline2, { baseline: "alphabetic" });

  if (total > 1) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...hexToRgb(NATH.muted));
    pdf.text(`${page} / ${total}`, rightX, baseline1, { align: "right", baseline: "alphabetic" });
  }
}

// ── Selos de categoria (medidos com getTextWidth · nunca estouram) ──────────
const BADGES = ["Guardiã da Marca", "Experiência do Cliente", "Oportunidades", "Riscos"];
const BADGE_PAD_X = 2.5;
const BADGE_H = 8;
const BADGE_ROW_GAP = 2;

interface BadgeLayout {
  size: number;
  gap: number;
  letterSpacing: number;
  rows: Array<Array<{ label: string; w: number; textW: number }>>;
}

function measureBadgeText(pdf: Pdf, label: string, size: number, ls: number) {
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(size);
  pdf.setCharSpace(0);
  // getTextWidth ignora charSpace · somamos manualmente (mm por caractere).
  return pdf.getTextWidth(label.toUpperCase()) + ls * label.length;
}

function computeBadgeLayout(pdf: Pdf, width: number): BadgeLayout {
  const ls = 0.3;
  for (const size of [6.6, 6.4, 6.2]) {
    for (const gap of [SPACING.sm, 2.4, 2, 1.5]) {
      const items = BADGES.map((label) => {
        const textW = measureBadgeText(pdf, label, size, ls);
        return { label, textW, w: textW + BADGE_PAD_X * 2 };
      });
      const total = items.reduce((a, b) => a + b.w, 0) + gap * (items.length - 1);
      if (total <= width) return { size, gap, letterSpacing: ls, rows: [items] };
    }
  }
  // Fallback: duas (ou mais) linhas alinhadas à esquerda, mesmo gap.
  const size = 6.2;
  const gap = SPACING.sm;
  const items = BADGES.map((label) => {
    const textW = measureBadgeText(pdf, label, size, ls);
    return { label, textW, w: Math.min(textW + BADGE_PAD_X * 2, width) };
  });
  const rows: BadgeLayout["rows"] = [[]];
  let used = 0;
  for (const it of items) {
    const rowIdx = rows.length - 1;
    const add = rows[rowIdx].length ? gap + it.w : it.w;
    if (used + add > width && rows[rowIdx].length) {
      rows.push([it]);
      used = it.w;
    } else {
      rows[rowIdx].push(it);
      used += add;
    }
  }
  return { size, gap, letterSpacing: ls, rows };
}

const badgesNode = (): Node =>
  draw(
    (pdf, width) => {
      const l = computeBadgeLayout(pdf, width);
      return l.rows.length * BADGE_H + (l.rows.length - 1) * BADGE_ROW_GAP;
    },
    (pdf, x, y, width) => {
      const l = computeBadgeLayout(pdf, width);
      l.rows.forEach((rowItems, ri) => {
        let cx = x;
        const by = y + ri * (BADGE_H + BADGE_ROW_GAP);
        for (const it of rowItems) {
          pdf.setFillColor(...hexToRgb(NATH.purpleSoft));
          pdf.setDrawColor(...hexToRgb(NATH.purpleLine));
          pdf.setLineWidth(HAIRLINE);
          pdf.roundedRect(cx, by, it.w, BADGE_H, RADIUS, RADIUS, "FD");

          pdf.setFont("helvetica", "bold");
          pdf.setFontSize(l.size);
          pdf.setCharSpace(l.letterSpacing);
          pdf.setTextColor(...hexToRgb(NATH.purpleDeep));
          const tx = cx + (it.w - it.textW) / 2;
          const ty = by + BADGE_H / 2 + capMm(l.size) / 2;
          pdf.text(it.label.toUpperCase(), tx, ty, { baseline: "alphabetic" });
          pdf.setCharSpace(0);

          cx += it.w + l.gap;
        }
      });
    },
  );

// ── Cartão de identificação (baselines compartilhadas rótulo/valor) ─────────
const CARD_PAD = SPACING.md;
const CARD_LINE_H = 5.4;

const idCardNode = (rows: Array<[string, string]>): Node =>
  draw(
    () => CARD_PAD * 2 + rows.length * CARD_LINE_H,
    (pdf, x, y, width) => {
      const h = CARD_PAD * 2 + rows.length * CARD_LINE_H;
      pdf.setFillColor(...hexToRgb(NATH.purpleSoft));
      pdf.setDrawColor(...hexToRgb(NATH.purpleLine));
      pdf.setLineWidth(HAIRLINE);
      pdf.roundedRect(x, y, width, h, RADIUS, RADIUS, "FD");

      rows.forEach(([label, value], i) => {
        const rowTop = y + CARD_PAD + i * CARD_LINE_H;
        // Baseline tipográfica única para rótulo (8pt) e valor (9pt).
        const baseline = rowTop + CARD_LINE_H / 2 + capMm(9) / 2;

        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(8);
        pdf.setCharSpace(0.4);
        pdf.setTextColor(...hexToRgb(NATH.purpleDeep));
        pdf.text(label.toUpperCase(), x + CARD_PAD, baseline, { baseline: "alphabetic" });
        pdf.setCharSpace(0);

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(9);
        pdf.setTextColor(...hexToRgb(NATH.textDark));
        const maxValueW = width - CARD_PAD * 2 - pdf.getTextWidth(label.toUpperCase()) - 6;
        const [clipped]: string[] = pdf.splitTextToSize(value, Math.max(10, maxValueW));
        const shown = clipped === value ? value : `${clipped.trimEnd()}…`;
        pdf.text(shown, x + width - CARD_PAD, baseline, { align: "right", baseline: "alphabetic" });
      });
    },
  );

// ── Blueprint ───────────────────────────────────────────────────────────────
export interface NathOpinionPdfData {
  opinion: string;
  contactName?: string | null;
  contactPhone?: string | null;
  context?: string | null;
  generatedAt?: Date;
}

const BODY_FONT = { size: 10, color: NATH.textDark, lineHeight: 1.55 } as const;
const BODY_LINE_MM = ptToMm(BODY_FONT.size) * BODY_FONT.lineHeight;
const TITLE_FONT = {
  size: 9.5,
  weight: "bold" as const,
  color: NATH.purpleDeep,
  transform: "uppercase" as const,
  letterSpacing: 0.5,
  lineHeight: 1.25,
};

/** Espaço ACIMA do título é maior que o de baixo · título pertence ao bloco. */
const GAP_ABOVE_SECTION = SPACING.lg;
const GAP_TITLE_TO_BODY = SPACING.xs;
const KEEP_WITH_TITLE_LINES = 2;
const CHUNK_LINES = 10;

function splitBodyLines(pdf: Pdf | null, body: string, width: number): string[] {
  if (!pdf) return [body];
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(BODY_FONT.size);
  pdf.setCharSpace(0);
  return pdf.splitTextToSize(body, width) as string[];
}

export function buildNathOpinionTree(data: NathOpinionPdfData, pdf?: Pdf): Node {
  const when = data.generatedAt ?? new Date();
  const stamp = `${when.toLocaleDateString("pt-BR")} às ${when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  const idRows: Array<[string, string]> = [
    ["Cliente / Lead", data.contactName?.trim() || "Não identificado"],
    ["Telefone", formatPhoneForPdf(data.contactPhone)],
    ["Análise gerada em", stamp],
  ];

  const sections: Node[] = [
    badgesNode(),
    idCardNode(idRows),
  ];

  const push = (node: Node, gapAbove: number) => {
    sections.push(col({ padding: [gapAbove, 0, 0, 0], gap: GAP_TITLE_TO_BODY }, [node]));
  };

  const blocks = parseNathMarkdown(data.opinion);
  if (blocks.length === 0) {
    push(text(stripInlineMarks(data.opinion || "Sem conteúdo."), { font: { ...BODY_FONT } }), SPACING.lg);
    return col({ gap: 0, padding: [SPACING.lg, 0, 0, 0] }, sections);
  }

  for (const b of blocks) {
    const bodyLines = b.body.trim() ? splitBodyLines(pdf ?? null, b.body.trim(), CONTENT_W) : [];
    const head: Node[] = [];
    if (b.title) head.push(text(b.title, { font: TITLE_FONT }));

    // Keep-together: título + ao menos 2 linhas do corpo no mesmo bloco.
    const headLines = bodyLines.slice(0, b.title ? KEEP_WITH_TITLE_LINES : CHUNK_LINES);
    if (headLines.length) head.push(text(headLines.join("\n"), { font: { ...BODY_FONT } }));
    sections.push(col({ padding: [GAP_ABOVE_SECTION, 0, 0, 0], gap: GAP_TITLE_TO_BODY }, head));

    // Continuações do mesmo parágrafo · sem espaço extra, contíguas.
    const rest = bodyLines.slice(headLines.length);
    for (let i = 0; i < rest.length; i += CHUNK_LINES) {
      const chunk = rest.slice(i, i + CHUNK_LINES);
      sections.push(text(chunk.join("\n"), { font: { ...BODY_FONT }, minHeight: chunk.length * BODY_LINE_MM }));
    }
  }

  return col({ gap: 0 }, sections);
}

export function nathOpinionFileName(contactName?: string | null, when: Date = new Date()) {
  const slug = (contactName || "cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "cliente";
  const d = `${when.getFullYear()}-${String(when.getMonth() + 1).padStart(2, "0")}-${String(when.getDate()).padStart(2, "0")}`;
  return `opiniao-nath-${slug}-${d}.pdf`;
}

/** Monta o documento (sem salvar) · usado pelo export e pelos testes visuais. */
export function createNathOpinionDocument(data: NathOpinionPdfData, logo: LogoAsset | null) {
  const when = data.generatedAt ?? new Date();
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  pdf.setProperties({
    title: `Opinião da Nath · ${data.contactName || "Conversa"}`,
    author: "NatLeva Viagens",
    creator: "NatLeva PDF Engine",
  });

  renderDocument(pdf, buildNathOpinionTree({ ...data, generatedAt: when }, pdf), {
    pageMargin: PAGE.marginMm,
    headerHeight: HEADER_MM,
    footerHeight: FOOTER_MM,
    renderHeader: (p) => drawNathHeader(p, logo),
    renderFooter: (p, page, total) => drawNathFooter(p, page, total),
  });

  return { pdf, when };
}

export async function exportNathOpinionPdf(data: NathOpinionPdfData) {
  const logo = await loadLogoAsset();
  const { pdf, when } = createNathOpinionDocument(data, logo);
  pdf.save(nathOpinionFileName(data.contactName, when));
}
