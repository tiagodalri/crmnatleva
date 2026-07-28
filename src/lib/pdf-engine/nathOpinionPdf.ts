/**
 * "Opinião da Nath" — blueprint declarativo renderizado pela MESMA engine
 * vetorial usada nos vouchers/propostas (src/lib/pdf-engine/index.ts + jsPDF).
 * Identidade visual própria (roxo/premium) definida abaixo, sem html2canvas.
 */
import { jsPDF } from "jspdf";
import { renderDocument, col, row, text, rule, type Node, type Pdf } from "./index";
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

const hexToRgb = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
};

/** Helvetica (WinAnsi) não possui glifos de emoji · removidos antes do render. */
export function stripEmoji(s: string) {
  return s
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2190}-\u{21FF}\u{2B00}-\u{2BFF}]/gu, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

const stripInlineMarks = (s: string) =>
  stripEmoji(s.replace(/\*\*(.*?)\*\*/g, "$1").replace(/(^|\s)\*(\S.*?\S)\*(?=\s|$)/g, "$1$2").replace(/`/g, ""));

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
    if (!line) { if (current?.title) { /* mantém seção aberta */ } continue; }

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

function drawNathHeader(pdf: Pdf, logo: LogoAsset | null) {
  const leftX = PAGE.marginMm;
  const rightX = PAGE.widthMm - PAGE.marginMm;

  // Faixa superior gradiente simulada por segmentos (vetorial)
  const steps = 40;
  const [pr0, pg0, pb0] = hexToRgb(NATH.purple);
  const [pr1, pg1, pb1] = hexToRgb(NATH.pink);
  const segW = PAGE.widthMm / steps;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    pdf.setFillColor(
      Math.round(pr0 + (pr1 - pr0) * t),
      Math.round(pg0 + (pg1 - pg0) * t),
      Math.round(pb0 + (pb1 - pb0) * t),
    );
    pdf.rect(i * segW, 0, segW + 0.2, 2.2, "F");
  }

  if (logo) {
    try {
      pdf.addImage(logo.dataUrl, "PNG", leftX, 7, logo.widthMm, logo.heightMm, undefined, "FAST");
    } catch { /* silent */ }
  } else {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(13);
    pdf.setTextColor(...hexToRgb(NATH.purpleDeep));
    pdf.text("NatLeva", leftX, 13, { baseline: "alphabetic" });
  }

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(12);
  pdf.setCharSpace(0.3);
  pdf.setTextColor(...hexToRgb(NATH.purpleDeep));
  pdf.text("OPINIÃO DA NATH", rightX, 11.5, { align: "right", baseline: "alphabetic" });
  pdf.setCharSpace(0);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...hexToRgb(NATH.muted));
  pdf.text("CEO & Fundadora · NatLeva", rightX, 16, { align: "right", baseline: "alphabetic" });

  pdf.setDrawColor(...hexToRgb(NATH.purpleLine));
  pdf.setLineWidth(0.3);
  pdf.line(leftX, HEADER_MM - 1, rightX, HEADER_MM - 1);
}

function drawNathFooter(pdf: Pdf, page: number, total: number) {
  const leftX = PAGE.marginMm;
  const rightX = PAGE.widthMm - PAGE.marginMm;
  const dividerY = PAGE.heightMm - FOOTER_MM + 3;

  pdf.setDrawColor(...hexToRgb(NATH.hairline));
  pdf.setLineWidth(0.2);
  pdf.line(leftX, dividerY, rightX, dividerY);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setCharSpace(0.4);
  pdf.setTextColor(...hexToRgb(NATH.purple));
  pdf.text("NATH · CEO NATLEVA", leftX, dividerY + 5, { baseline: "alphabetic" });
  pdf.setCharSpace(0);

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setTextColor(...hexToRgb(NATH.muted));
  pdf.text("Gerado automaticamente pela IA da NatLeva", leftX, dividerY + 9, { baseline: "alphabetic" });

  if (total > 1) {
    pdf.setFontSize(8);
    pdf.text(`${page} / ${total}`, rightX, dividerY + 5, { align: "right", baseline: "alphabetic" });
  }
}

// ── Blueprint ───────────────────────────────────────────────────────────────
const BADGES = [
  { label: "Guardiã da Marca", color: "#DC2626" },
  { label: "Experiência do Cliente", color: "#DB2777" },
  { label: "Oportunidades", color: "#059669" },
  { label: "Riscos", color: "#D97706" },
];

export interface NathOpinionPdfData {
  opinion: string;
  contactName?: string | null;
  contactPhone?: string | null;
  context?: string | null;
  generatedAt?: Date;
}

export function buildNathOpinionTree(data: NathOpinionPdfData): Node {
  const when = data.generatedAt ?? new Date();
  const stamp = `${when.toLocaleDateString("pt-BR")} às ${when.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}`;

  const idRows: Array<[string, string]> = [
    ["Cliente / Lead", data.contactName?.trim() || "Não identificado"],
    ["Telefone", data.contactPhone?.trim() || "—"],
    ["Análise gerada em", stamp],
  ];

  const sections: Node[] = [
    // Selos de categoria
    row({ gap: SPACING.sm }, BADGES.map((b) =>
      col({
        bg: NATH.white,
        border: { color: b.color, width: 0.3 },
        radius: 1.5,
        padding: [2.2, 2],
        minHeight: 8,
      }, [
        text(b.label, {
          textAlign: "center",
          font: { size: 6.6, weight: "bold", color: b.color, transform: "uppercase", letterSpacing: 0.35, lineHeight: 1.2 },
        }),
      ]),
    )),

    // Identificação
    col({
      bg: NATH.purpleSoft,
      border: { color: NATH.purpleLine, width: 0.25 },
      radius: 2,
      padding: [SPACING.md, SPACING.md],
      gap: SPACING.xs,
    }, idRows.map(([k, v]) =>
      row({ gap: SPACING.sm }, [
        text(k, { font: { size: 8, weight: "bold", color: NATH.purpleDeep, transform: "uppercase", letterSpacing: 0.4 } }),
        text(v, { textAlign: "right", font: { size: 9, color: NATH.textDark, align: "right" } }),
      ]),
    )),

    rule(NATH.purpleLine, 0.3),
  ];

  const blocks = parseNathMarkdown(data.opinion);
  if (blocks.length === 0) {
    sections.push(text(stripInlineMarks(data.opinion || "Sem conteúdo."), {
      font: { size: 10, color: NATH.textDark, lineHeight: 1.55 },
    }));
  } else {
    for (const b of blocks) {
      const children: Node[] = [];
      if (b.title) {
        children.push(text(b.title, {
          font: { size: 9.5, weight: "bold", color: NATH.purpleDeep, transform: "uppercase", letterSpacing: 0.5, lineHeight: 1.25 },
        }));
      }
      if (b.body.trim()) {
        children.push(text(b.body.trim(), {
          font: { size: 10, color: NATH.textDark, lineHeight: 1.55 },
        }));
      }
      sections.push(col({ gap: SPACING.xs }, children));
    }
  }

  return col({ gap: SPACING.md }, sections);
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

export async function exportNathOpinionPdf(data: NathOpinionPdfData) {
  const when = data.generatedAt ?? new Date();
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  pdf.setProperties({
    title: `Opinião da Nath · ${data.contactName || "Conversa"}`,
    author: "NatLeva Viagens",
    creator: "NatLeva PDF Engine",
  });

  const logo = await loadLogoAsset();

  renderDocument(pdf, buildNathOpinionTree({ ...data, generatedAt: when }), {
    pageMargin: PAGE.marginMm,
    headerHeight: HEADER_MM,
    footerHeight: FOOTER_MM,
    renderHeader: (p) => drawNathHeader(p, logo),
    renderFooter: (p, page, total) => drawNathFooter(p, page, total),
  });

  pdf.save(nathOpinionFileName(data.contactName, when));
}
