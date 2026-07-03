/**
 * Voucher Aéreo — modelo tabular institucional NatLeva.
 * Estrutura: intro (kicker + H1) · Informações Básicas · Passageiros ·
 * Detalhes da Viagem (tabela de voos) · Bagagens · Check-in · Alterações ·
 * Cancelamento · No-Show.
 */
import { jsPDF } from "jspdf";
import { renderDocument, col, spacer, grid, text, type Node } from "./index";
import {
  loadLogoAsset,
  drawInstitutionalHeader,
  drawInstitutionalFooter,
  validateFooterInvariants,
  PAGE,
  BRAND,
  SPACING,
} from "./theme/institutional";
import {
  labelValueCard, dataTable, sectionTitle, infoLine, bagItem, highlightBlock, style,
  voucherIntro,
} from "./primitives";
import {
  iconBackpack, iconBriefcase, iconLuggage, iconClock, iconMessageCircle, iconAlertCircle,
} from "./icons";
import type { AereoVoucherData } from "@/components/sales/ConfirmationVoucher";

// ─── Formatação ──────────────────────────────────────────────────────────────
const fmtDateShort = (s?: string | null) => {
  if (!s) return "—";
  const iso = s.split("T")[0];
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return s;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${String(y).slice(-2)}`;
};

const fmtDateFull = (s?: string | null) => {
  if (!s) return "—";
  const iso = s.split("T")[0];
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return s;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
};

const fmtTime = (s?: string | null) => (s ? s.slice(0, 5) : "—");

const fmtRoute = (label?: string | null, iata?: string | null) => {
  const clean = (label || "").trim();
  const code = (iata || "").toUpperCase().trim();
  if (clean && code) {
    // se label já contém IATA, mostra só o label; senão "Cidade / IATA"
    if (clean.toUpperCase().includes(code)) return clean;
    return `${clean} / ${code}`;
  }
  return clean || code || "—";
};

export function buildAereoVoucherTree(data: AereoVoucherData): Node {
  const today = new Date();
  const todayLabel = `${String(today.getDate()).padStart(2, "0")}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getFullYear()).slice(-2)}`;

  const basics: Array<[string, string]> = [
    ["Classe:", data.flight_class || "Econômica"],
    ["Data da emissão:", todayLabel],
    ["Código Reserva:", (data.reservation_code || "—").toUpperCase()],
  ];

  return col({ gap: SPACING.md }, [
    voucherIntro("Voucher de Viagem", "Confirmação de Reserva"),

    col({ gap: SPACING.sm }, [
      sectionTitle("Informações Básicas"),
      labelValueCard(basics),
    ]),

    col({ gap: SPACING.sm }, [
      sectionTitle("Informações dos Passageiros"),
      dataTable({
        cols: [46, 26, 28],
        headers: ["Nome completo:", "Tipo de passageiro:", "Documento:"],
        align: ["left", "left", "left"],
        rows: data.passengers.map((p) => [p.name || "—", p.type || "Adulto", p.doc || "—"]),
        emptyLabel: "Nenhum passageiro cadastrado.",
      }),
    ]),

    col({ gap: SPACING.sm }, [
      sectionTitle("Detalhes da Viagem"),
      dataTable({
        cols: [10, 20, 20, 10, 14, 13, 13],
        headers: ["Voo:", "De:", "Para:", "Cia:", "Data:", "Partida:", "Chegada:"],
        align: ["left", "left", "left", "left", "left", "left", "left"],
        rows: data.segments.map((s) => [
          s.flight_number || "—",
          fmtRoute(s.origin_label, s.origin_iata),
          fmtRoute(s.destination_label, s.destination_iata),
          s.airline || "—",
          fmtDateShort(s.date),
          fmtTime(s.departure_time),
          fmtTime(s.arrival_time),
        ]),
        emptyLabel: "Nenhum trecho cadastrado.",
      }),
    ]),


    // Bagagens
    col({ gap: SPACING.sm }, [
      sectionTitle("Bagagens Incluídas (por passageiro)"),
      grid([1, 1, 1], { gap: SPACING.lg }, [
        bagItem(iconBackpack, "1 item pessoal (10kg)", "Deve ser acomodado sob o assento"),
        bagItem(iconBriefcase, "1 bagagem de mão (12kg)", "Levado na cabine do avião"),
        bagItem(iconLuggage, "1 bagagem despachada (23kg)", "Entregue no check-in"),
      ]),
      spacer(SPACING.sm),
      text("Medidas:", { font: { size: 9.5, weight: "bold", color: BRAND.textDark } }),
      grid([1, 1], { gap: SPACING.lg }, [
        col({ gap: SPACING.xs }, [
          text("Item pessoal", { font: { size: 8.5, weight: "bold", color: BRAND.textSoft, transform: "uppercase", letterSpacing: 0.4 } }),
          text("Altura 45 cm × Comprimento 35 cm × Largura 20 cm, incluindo bolsos, rodas e alça.", style.BODY_MUTED),
        ]),
        col({ gap: SPACING.xs }, [
          text("Bagagem de mão", { font: { size: 8.5, weight: "bold", color: BRAND.textSoft, transform: "uppercase", letterSpacing: 0.4 } }),
          text("Altura 55 cm × Comprimento 35 cm × Largura 25 cm, incluindo bolsos, rodas e alça.", style.BODY_MUTED),
        ]),
      ]),
      col({ gap: SPACING.xs }, [
        text("Bagagem despachada", { font: { size: 8.5, weight: "bold", color: BRAND.textSoft, transform: "uppercase", letterSpacing: 0.4 } }),
        text("Soma das três dimensões até 158 cm lineares e peso máximo de 23 kg por volume.", style.BODY_MUTED),
      ]),
    ]),

    // Check-in Automático
    col({ gap: SPACING.md }, [
      sectionTitle("Check-in Automático"),
      infoLine(iconClock, "24 horas antes", ["Realizamos o check-in automaticamente um dia antes da sua partida."]),
      infoLine(iconMessageCircle, "Cartão de embarque", ["Enviamos seus cartões de embarque diretamente pelo WhatsApp."]),
      infoLine(iconAlertCircle, "Exceções", ["Eventualmente a companhia aérea pode exigir check-in presencial para verificação de documentos."]),
    ]),

    // Alterações
    col({ gap: SPACING.sm }, [
      sectionTitle("Alterações"),
      text(
        "O Cliente pode solicitar alterações no itinerário sujeitas à disponibilidade e às políticas de cancelamento dos prestadores de serviços. O cliente é responsável por quaisquer custos adicionais associados a tais alterações.",
        style.BODY,
      ),
    ]),

    // Cancelamento
    col({ gap: SPACING.sm }, [
      sectionTitle("Cancelamento"),
      text(
        "Em caso de cancelamento por parte do Cliente, a Agência não efetuará reembolsos, exceto quando permitido pelas políticas dos prestadores de serviços envolvidos. O cliente será responsável por todas as despesas de cancelamento, taxas ou penalidades aplicáveis.",
        style.BODY,
      ),
    ]),

    // No-show
    highlightBlock(
      "Política de No-Show",
      "Em caso de não comparecimento (no-show), a Agência não efetuará reembolsos e não será responsável por quaisquer custos ou despesas adicionais incorridas pelo cliente. Em caso de não comparecimento, as incidências são:",
      ["Perda total do valor pago", "Cancelamento automático da reserva", "Impossibilidade de remarcação"],
    ),
  ]);
}

export async function exportAereoVoucherPdf(data: AereoVoucherData, fileName: string) {
  const errors = validateFooterInvariants();
  if (errors.length > 0) throw new Error(`[pdf-engine] export blocked: ${errors.join(", ")}`);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  pdf.setProperties({
    title: `Voucher Aéreo · NatLeva Viagens`,
    subject: `Reserva ${data.reservation_code || ""}`.trim(),
    author: "NatLeva Viagens",
    creator: "NatLeva PDF Engine",
    keywords: "voucher, viagem, aéreo, natleva",
  });

  const logo = await loadLogoAsset();
  const tree = buildAereoVoucherTree(data);

  renderDocument(pdf, tree, {
    pageMargin: PAGE.marginMm,
    headerHeight: PAGE.headerMm,
    footerHeight: PAGE.footerMm,
    renderHeader: (p) => drawInstitutionalHeader(p, logo, {
      label: "Voucher Aéreo",
      reservationCode: data.reservation_code,
    }),
    renderFooter: (p, page, total) => drawInstitutionalFooter(p, page, total),
  });

  pdf.save(fileName);
}

// Retro-compat: função antiga (usada pelo botão beta atual). Aponta pro novo pipeline.
export const exportAereoVoucherBeta = exportAereoVoucherPdf;
