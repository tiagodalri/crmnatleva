/**
 * POC — Aéreo voucher rendered via the declarative PDF engine.
 * No html2canvas. 100% vector text. Single page.
 */
import { jsPDF } from "jspdf";
import { renderDocument, col, grid, text, spacer, type Node } from "./index";
import { NATLEVA_FOOTER_LINE } from "./theme/institutional";
import type { AereoVoucherData } from "@/components/sales/ConfirmationVoucher";

// Brand palette (mirrors ConfirmationVoucher.tsx)
const GREEN = "#1f5f3a";
const GREEN_DARK = "#0f3d24";
const TEXT_DARK = "#1f2937";
const MUTED = "#6b7280";
const ROW_ALT = "#f3f5f1";
const BORDER = "#e2e6df";
const WHITE = "#ffffff";

const fmtDateBR = (s?: string | null) => {
  if (!s) return "—";
  const [y, m, d] = s.split("T")[0].split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y.slice(2)}`;
};
const fmtTime = (s?: string | null) => (s ? s.slice(0, 5) : "—");

// Reusable style atoms
const H1 = { font: { size: 24, weight: "bold" as const, color: GREEN_DARK, letterSpacing: -0.05 } };
const SUBTITLE = { font: { size: 8, weight: "bold" as const, color: GREEN, transform: "uppercase" as const, letterSpacing: 0.25 } };
const H2 = { font: { size: 11, weight: "bold" as const, color: GREEN_DARK, transform: "uppercase" as const, letterSpacing: 0.15 } };

const CELL_H = 9; // mm
const HEAD_H = 8; // mm

const cellStyle = (bg?: string) => ({
  minHeight: CELL_H,
  padding: [0, 4] as [number, number],
  bg,
  font: { size: 9, color: TEXT_DARK },
});
const cellHeadStyle = {
  minHeight: HEAD_H,
  padding: [0, 4] as [number, number],
  bg: ROW_ALT,
  font: { size: 7.5, weight: "bold" as const, color: GREEN_DARK, transform: "uppercase" as const, letterSpacing: 0.1 },
  border: { color: BORDER, width: 0.15, sides: ["bottom" as const] },
};

function labelValueRow(label: string, value: string, alt: boolean, isLast: boolean): Node {
  return grid([38, 62], {
    bg: alt ? ROW_ALT : WHITE,
    border: isLast ? undefined : { color: BORDER, width: 0.1, sides: ["bottom"] },
  }, [
    { kind: "text", text: label, style: { ...cellStyle(), font: { ...cellStyle().font, weight: "bold", color: GREEN_DARK } } },
    { kind: "text", text: value, style: { ...cellStyle(), font: { ...cellStyle().font, weight: "bold" } } },
  ]);
}

export function buildAereoVoucherTree(data: AereoVoucherData): Node {
  const basics: Array<[string, string]> = [
    ["Classe:", data.flight_class || "Econômica"],
    ["Código Reserva:", data.reservation_code || "—"],
  ];

  const paxCols = [40, 25, 35];
  const paxHeader = grid(paxCols, {}, [
    text("Nome completo", { ...cellHeadStyle }),
    text("Tipo", { ...cellHeadStyle, textAlign: "left" }),
    text("Documento", { ...cellHeadStyle, textAlign: "left" }),
  ]);
  const paxRows = data.passengers.map((p, i) => {
    const alt = i % 2 === 1;
    const isLast = i === data.passengers.length - 1;
    return grid(paxCols, {
      bg: alt ? ROW_ALT : WHITE,
      border: isLast ? undefined : { color: BORDER, width: 0.1, sides: ["bottom"] },
    }, [
      text(p.name || "—", cellStyle()),
      text(p.type || "Adulto", cellStyle()),
      text(p.doc || "—", cellStyle()),
    ]);
  });

  const segCols = [10, 22, 22, 12, 12, 11, 11]; // fractions
  const segHeaders = ["Voo", "De", "Para", "Cia", "Data", "Partida", "Chegada"];
  const segHeader = grid(segCols, {}, segHeaders.map((h, i) => text(h, {
    ...cellHeadStyle,
    textAlign: i === 0 ? "left" : "center",
    font: { ...cellHeadStyle.font, align: i === 0 ? "left" : "center" },
  })));
  const segRows = data.segments.map((s, i) => {
    const alt = i % 2 === 1;
    const isLast = i === data.segments.length - 1;
    const values = [
      s.flight_number || "—",
      s.origin_label || s.origin_iata || "—",
      s.destination_label || s.destination_iata || "—",
      s.airline || "—",
      fmtDateBR(s.date),
      fmtTime(s.departure_time),
      fmtTime(s.arrival_time),
    ];
    return grid(segCols, {
      bg: alt ? ROW_ALT : WHITE,
      border: isLast ? undefined : { color: BORDER, width: 0.1, sides: ["bottom"] },
    }, values.map((v, j) => text(v, {
      ...cellStyle(),
      font: { ...cellStyle().font, size: 8.5, align: j === 0 ? "left" : "center" },
    })));
  });

  return col({ gap: 4 }, [
    // Header block
    text("Voucher de Viagem", { minHeight: 5, ...SUBTITLE }),
    text("Confirmação de Reserva", { minHeight: 11, ...H1 }),
    { kind: "box", style: { minHeight: 1.2, width: 20, bg: GREEN, radius: 0.6 } },
    spacer(6),

    // Section: Informações Básicas
    text("Informações Básicas", { minHeight: 7, ...H2 }),
    col({
      border: { color: BORDER, width: 0.15 },
      radius: 1.5,
    }, basics.map(([k, v], i) => labelValueRow(k, v, i % 2 === 1, i === basics.length - 1))),

    spacer(4),

    // Section: Passageiros
    text("Informações dos Passageiros", { minHeight: 7, ...H2 }),
    col({
      border: { color: BORDER, width: 0.15 },
      radius: 1.5,
    }, [paxHeader, ...paxRows]),

    spacer(4),

    // Section: Trechos
    text("Detalhes da Viagem", { minHeight: 7, ...H2 }),
    col({
      border: { color: BORDER, width: 0.15 },
      radius: 1.5,
    }, [segHeader, ...segRows]),
  ]);
}

// ── Institutional footer (fixed, centered, identical on every page) ──────────
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const FOOTER_BASELINE_MM = 286;   // baseline central do rodapé
const FOOTER_LINE_MM = 280;       // divisória sutil acima do rodapé
const FOOTER_SIDE_MARGIN_MM = 14;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawInstitutionalFooter(pdf: any) {
  // divisória
  pdf.setDrawColor(0xd8, 0xdf, 0xd5);
  pdf.setLineWidth(0.25);
  pdf.line(FOOTER_SIDE_MARGIN_MM, FOOTER_LINE_MM, PAGE_WIDTH_MM - FOOTER_SIDE_MARGIN_MM, FOOTER_LINE_MM);

  // texto institucional (fonte única de verdade)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setCharSpace(0);
  pdf.setTextColor(15, 61, 36);
  pdf.text(NATLEVA_FOOTER_LINE, PAGE_WIDTH_MM / 2, FOOTER_BASELINE_MM, { align: "center", baseline: "alphabetic" });
}

// ── Pre-render validations (block export if inconsistent) ────────────────────
function validateFooterInvariants() {
  const errors: string[] = [];
  if (!NATLEVA_FOOTER_LINE.includes("+55 (11) 96639-6692")) errors.push("footer:phone missing");
  if (!NATLEVA_FOOTER_LINE.includes("@natlevaviagens")) errors.push("footer:instagram missing");
  if (FOOTER_BASELINE_MM <= FOOTER_LINE_MM) errors.push("footer:baseline above divider");
  if (FOOTER_BASELINE_MM >= PAGE_HEIGHT_MM) errors.push("footer:baseline outside page");
  return errors;
}

export function exportAereoVoucherBeta(data: AereoVoucherData, fileName: string) {
  const preErrors = validateFooterInvariants();
  if (preErrors.length > 0) {
    throw new Error(`[pdf-engine] export blocked: ${preErrors.join(", ")}`);
  }

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  pdf.setProperties({
    title: "Voucher Aéreo · NatLeva Viagens",
    author: "NatLeva Viagens",
    creator: "NatLeva PDF Engine",
  });
  const tree = buildAereoVoucherTree(data);
  renderDocument(pdf, tree, { pageMargin: 14 });

  // Footer institucional fixo em toda página (mesmo layout, sempre centralizado)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anyPdf = pdf as any;
  const totalPages: number = anyPdf.getNumberOfPages?.() ?? 1;
  for (let p = 1; p <= totalPages; p++) {
    anyPdf.setPage?.(p);
    drawInstitutionalFooter(pdf);
  }

  pdf.save(fileName);
}
