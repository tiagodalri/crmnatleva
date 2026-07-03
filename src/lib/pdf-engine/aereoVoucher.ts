/**
 * Voucher Aéreo — blueprint declarativo renderizado pela engine.
 * 100% vetorial (texto selecionável, ícones vetoriais, header/footer institucionais).
 *
 * Design language: linguagem de boarding-pass moderno (Amadeus / Airbnb / Stripe).
 * Zero tabela de voos, zero zebra, zero linha divisória verde no header.
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
  labelValueCard, dataTable, sectionTitle, voucherIntro, infoLine, bagItem, highlightBlock, style,
  boardingPassCard, type BoardingPassSegment,
} from "./primitives";
import {
  iconBackpack, iconBriefcase, iconLuggage, iconClock, iconMessageCircle, iconAlertCircle,
} from "./icons";
import type { AereoVoucherData } from "@/components/sales/ConfirmationVoucher";

// ─── Formatação (edge cases isolados) ────────────────────────────────────────
const WEEKDAY = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_ABBR = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const fmtDateLong = (s?: string | null) => {
  if (!s) return "—";
  const iso = s.split("T")[0];
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return s;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAY[dt.getUTCDay()]}, ${String(d).padStart(2, "0")} ${MONTH_ABBR[m - 1]} ${y}`;
};

const fmtTime = (s?: string | null) => (s ? s.slice(0, 5) : "—");

const durationBetween = (dep?: string | null, arr?: string | null): string => {
  if (!dep || !arr) return "";
  const [dh, dm] = dep.split(":").map(Number);
  const [ah, am] = arr.split(":").map(Number);
  if ([dh, dm, ah, am].some((n) => Number.isNaN(n))) return "";
  let mins = ah * 60 + am - (dh * 60 + dm);
  if (mins < 0) mins += 24 * 60;                    // trans-noite
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}min`;
};

// Extrai IATA + cidade a partir de "GRU · São Paulo" ou fallback.
const splitLabel = (label?: string, iata?: string | null): { iata: string; city: string } => {
  const clean = (label || "").trim();
  if (!clean) return { iata: (iata || "").toUpperCase(), city: "" };
  // Se vier "IATA · Cidade"
  const parts = clean.split(/[·•\-—|]/).map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { iata: (iata || parts[0]).toUpperCase(), city: parts.slice(1).join(" ") };
  if (iata) return { iata: iata.toUpperCase(), city: clean };
  return { iata: clean.slice(0, 3).toUpperCase(), city: clean };
};

const toBoardingPass = (s: AereoVoucherData["segments"][number]): BoardingPassSegment => {
  const o = splitLabel(s.origin_label, s.origin_iata);
  const d = splitLabel(s.destination_label, s.destination_iata);
  return {
    flightNumber: s.flight_number || undefined,
    airline: s.airline || undefined,
    cabin: undefined,
    dateLabel: fmtDateLong(s.date),
    originIata: o.iata, originCity: o.city,
    destinationIata: d.iata, destinationCity: d.city,
    departureTime: fmtTime(s.departure_time),
    arrivalTime: fmtTime(s.arrival_time),
    duration: durationBetween(s.departure_time, s.arrival_time),
  };
};

export function buildAereoVoucherTree(data: AereoVoucherData): Node {
  const basics: Array<[string, string]> = [
    ["Classe", data.flight_class || "Econômica"],
    ["Código Reserva", (data.reservation_code || "—").toUpperCase()],
  ];

  return col({ gap: SPACING.md }, [
    // (Intro removida — header já rotula o documento)

    // Informações Básicas
    col({ gap: SPACING.sm }, [
      sectionTitle("Informações Básicas"),
      labelValueCard(basics),
    ]),

    // Passageiros
    col({ gap: SPACING.sm }, [
      sectionTitle("Passageiros"),
      dataTable({
        cols: [46, 22, 32],
        headers: ["Nome completo", "Tipo", "Documento"],
        align: ["left", "left", "left"],
        rows: data.passengers.map((p) => [p.name || "—", p.type || "Adulto", p.doc || "—"]),
        emptyLabel: "Nenhum passageiro cadastrado.",
      }),
    ]),

    // Voos — BOARDING-PASS style (upgrade principal)
    col({ gap: SPACING.sm }, [
      sectionTitle("Voos"),
      col({ gap: SPACING.sm }, data.segments.length === 0
        ? [text("Nenhum trecho cadastrado.", style.BODY_MUTED)]
        : data.segments.map((s) => boardingPassCard(toBoardingPass(s)))
      ),
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
