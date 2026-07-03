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

export function exportAereoVoucherBeta(data: AereoVoucherData, fileName: string) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  pdf.setProperties({
    title: "Voucher Aéreo · NatLeva Viagens (beta)",
    author: "NatLeva Viagens",
    creator: "NatLeva PDF Engine",
  });
  const tree = buildAereoVoucherTree(data);
  renderDocument(pdf, tree, { pageMargin: 14 });

  // Institutional footer (baseline vector text)
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setTextColor(107, 114, 128);
  pdf.text("NatLeva Viagens · natleva.com · @natleva", 14, 288);
  pdf.setFont("helvetica", "bold");
  pdf.setTextColor(15, 61, 36);
  pdf.text("Beta engine · POC", 196, 288, { align: "right" });

  pdf.save(fileName);
}
