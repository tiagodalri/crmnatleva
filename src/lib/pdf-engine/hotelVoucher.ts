/**
 * Voucher Hospedagem — blueprint declarativo renderizado pela engine.
 */
import { jsPDF } from "jspdf";
import { renderDocument, col, grid, text, type Node } from "./index";
import {
  loadLogoAsset, drawInstitutionalHeader, drawInstitutionalFooter,
  validateFooterInvariants, PAGE,
} from "./theme/institutional";
import { labelValueCard, dataTable, sectionTitle, voucherIntro, infoLine, style } from "./primitives";
import { iconClock, iconShieldCheck } from "./icons";
import type { HotelVoucherData } from "@/components/sales/ConfirmationVoucher";

const fmtDateBR = (s?: string | null) => {
  if (!s) return "—";
  const [y, m, d] = s.split("T")[0].split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y.slice(2)}`;
};

export function buildHotelVoucherTree(data: HotelVoucherData): Node {
  const basics: Array<[string, string]> = [
    ["Hotel:", data.hotel_name || "—"],
    ["Alimentação:", data.meal_plan || "—"],
    ["Tipo de quarto:", data.room_type || "—"],
    ["Número de reserva:", data.reservation_code || "—"],
    ["Código pin:", data.pin_code || "—"],
  ];

  return col({ gap: 6 }, [
    voucherIntro("Voucher de Hospedagem", "Confirmação de Reserva"),

    col({ gap: 2 }, [
      sectionTitle("Informações Básicas"),
      labelValueCard(basics),
    ]),

    col({ gap: 2 }, [
      sectionTitle("Informações do Hóspede"),
      dataTable({
        cols: [60, 40],
        headers: ["Nome completo", "Documento"],
        align: ["left", "left"],
        rows: data.guests.map((g) => [g.name || "—", g.doc || "—"]),
        emptyLabel: "Nenhum hóspede cadastrado.",
      }),
    ]),

    col({ gap: 2 }, [
      sectionTitle("Detalhes da Hospedagem"),
      col({ border: { color: "#e2e6df", width: 0.15 }, radius: 1.5 }, [
        grid([48, 26, 26], {}, [
          text("Endereço", { ...style.CELL_HEAD }),
          text("Data de Chegada", { ...style.CELL_HEAD, textAlign: "center", font: { ...style.CELL_HEAD.font, align: "center" } }),
          text("Data de Saída", { ...style.CELL_HEAD, textAlign: "center", font: { ...style.CELL_HEAD.font, align: "center" } }),
        ]),
        grid([48, 26, 26], {}, [
          text(data.address || "—", { ...style.CELL, minHeight: 11 }),
          text(fmtDateBR(data.checkin_date), { ...style.CELL, minHeight: 11, textAlign: "center", font: { ...style.CELL.font, align: "center" } }),
          text(fmtDateBR(data.checkout_date), { ...style.CELL, minHeight: 11, textAlign: "center", font: { ...style.CELL.font, align: "center" } }),
        ]),
      ]),
    ]),

    col({ gap: 3 }, [
      sectionTitle("Informações importantes"),
      infoLine(iconClock, "Horários", [
        `Check-in: a partir das ${data.checkin_time || "15:00"}`,
        `Check-out: até às ${data.checkout_time || "12:00"}`,
      ]),
      infoLine(iconShieldCheck, "Documentação", [
        data.doc_note || "Apresente seu passaporte no momento do check-in.",
      ]),
    ]),
  ]);
}

export async function exportHotelVoucherPdf(data: HotelVoucherData, fileName: string) {
  const errors = validateFooterInvariants();
  if (errors.length > 0) throw new Error(`[pdf-engine] export blocked: ${errors.join(", ")}`);

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  pdf.setProperties({
    title: `Voucher Hospedagem · NatLeva Viagens`,
    author: "NatLeva Viagens",
    creator: "NatLeva PDF Engine",
  });

  const logo = await loadLogoAsset();
  const tree = buildHotelVoucherTree(data);

  renderDocument(pdf, tree, {
    pageMargin: PAGE.marginMm,
    headerHeight: PAGE.headerMm,
    footerHeight: PAGE.footerMm,
    renderHeader: (p) => drawInstitutionalHeader(p, logo, {
      label: "Voucher Hospedagem",
      reservationCode: data.reservation_code,
    }),
    renderFooter: (p, page, total) => drawInstitutionalFooter(p, page, total),
  });

  pdf.save(fileName);
}
