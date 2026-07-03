/**
 * Voucher Aéreo — blueprint declarativo renderizado pela engine.
 * 100% vetorial (texto selecionável, ícones vetoriais, header/footer institucionais).
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
} from "./theme/institutional";
import {
  labelValueCard, dataTable, sectionTitle, voucherIntro, infoLine, bagItem, highlightBlock, style,
} from "./primitives";
import {
  iconBackpack, iconBriefcase, iconLuggage, iconClock, iconMessageCircle, iconAlertCircle,
} from "./icons";
import type { AereoVoucherData } from "@/components/sales/ConfirmationVoucher";

const fmtDateBR = (s?: string | null) => {
  if (!s) return "—";
  const [y, m, d] = s.split("T")[0].split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y.slice(2)}`;
};
const fmtTime = (s?: string | null) => (s ? s.slice(0, 5) : "—");

export function buildAereoVoucherTree(data: AereoVoucherData): Node {
  const basics: Array<[string, string]> = [
    ["Classe:", data.flight_class || "Econômica"],
    ["Código Reserva:", data.reservation_code || "—"],
  ];

  return col({ gap: 6 }, [
    voucherIntro("Voucher de Viagem", "Confirmação de Reserva"),

    // Informações Básicas
    col({ gap: 2 }, [
      sectionTitle("Informações Básicas"),
      labelValueCard(basics),
    ]),

    // Passageiros
    col({ gap: 2 }, [
      sectionTitle("Informações dos Passageiros"),
      dataTable({
        cols: [40, 25, 35],
        headers: ["Nome completo", "Tipo", "Documento"],
        align: ["left", "left", "left"],
        rows: data.passengers.map((p) => [p.name || "—", p.type || "Adulto", p.doc || "—"]),
        emptyLabel: "Nenhum passageiro cadastrado.",
      }),
    ]),

    // Detalhes da Viagem
    col({ gap: 2 }, [
      sectionTitle("Detalhes da Viagem"),
      dataTable({
        cols: [10, 22, 22, 12, 12, 11, 11],
        headers: ["Voo", "De", "Para", "Cia", "Data", "Partida", "Chegada"],
        align: ["left", "center", "center", "center", "center", "center", "center"],
        fontSize: 8.5,
        rows: data.segments.map((s) => [
          s.flight_number || "—",
          s.origin_label || s.origin_iata || "—",
          s.destination_label || s.destination_iata || "—",
          s.airline || "—",
          fmtDateBR(s.date),
          fmtTime(s.departure_time),
          fmtTime(s.arrival_time),
        ]),
        emptyLabel: "Nenhum trecho cadastrado.",
      }),
    ]),

    // Bagagens
    col({ gap: 2 }, [
      sectionTitle("Bagagens Incluídas (por passageiro)"),
      grid([1, 1, 1], { gap: 6 }, [
        bagItem(iconBackpack, "1 item pessoal (10kg)", "Deve ser acomodado sob o assento"),
        bagItem(iconBriefcase, "1 bagagem de mão (12kg)", "Levado na cabine do avião"),
        bagItem(iconLuggage, "1 bagagem despachada (23kg)", "Entregue no check-in"),
      ]),
      spacer(3),
      text("Medidas:", { font: { size: 10.5, weight: "bold", color: BRAND.greenDark } }),
      grid([1, 1], { gap: 8 }, [
        col({ gap: 1 }, [
          text("Item pessoal:", { font: { size: 9.5, weight: "bold", color: BRAND.greenDark } }),
          text("Altura: 45 cm x Comprimento: 35 cm x Largura: 20 cm, incluindo bolsos, rodas e alça.", style.BODY),
        ]),
        col({ gap: 1 }, [
          text("Bagagem de mão:", { font: { size: 9.5, weight: "bold", color: BRAND.greenDark } }),
          text("Altura: 55 cm x Comprimento: 35 cm x Largura: 25 cm, incluindo bolsos, rodas e alça.", style.BODY),
        ]),
      ]),
      col({ gap: 1 }, [
        text("Bagagem despachada:", { font: { size: 9.5, weight: "bold", color: BRAND.greenDark } }),
        text("Soma das três dimensões até 158 cm lineares e peso máximo de 23 kg por volume.", style.BODY),
      ]),
    ]),

    // Check-in Automático
    col({ gap: 3 }, [
      sectionTitle("Check-in Automático"),
      infoLine(iconClock, "24 Horas Antes", ["Realizamos o check-in automaticamente um dia antes da sua partida."]),
      infoLine(iconMessageCircle, "Cartão de Embarque", ["Enviamos seus cartões de embarque diretamente pelo WhatsApp."]),
      infoLine(iconAlertCircle, "Exceções", ["Eventualmente a companhia aérea pode exigir check-in presencial para verificação de documentos."]),
    ]),

    // Alterações
    col({ gap: 2 }, [
      sectionTitle("Alterações"),
      text(
        "O Cliente pode solicitar alterações no itinerário sujeitas à disponibilidade e às políticas de cancelamento dos prestadores de serviços. O cliente é responsável por quaisquer custos adicionais associados a tais alterações.",
        style.BODY,
      ),
    ]),

    // Cancelamento
    col({ gap: 2 }, [
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
    author: "NatLeva Viagens",
    creator: "NatLeva PDF Engine",
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
