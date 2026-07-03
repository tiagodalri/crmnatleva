/**
 * Voucher Genérico — blueprint declarativo (seguros, passeios, transfer,
 * cruzeiros, ingressos, aluguel de carro, etc.). Renderizado pela engine.
 */
import { jsPDF } from "jspdf";
import { renderDocument, col, text, type Node, type IconDraw } from "./index";
import {
  loadLogoAsset, drawInstitutionalHeader, drawInstitutionalFooter,
  validateFooterInvariants, PAGE,
} from "./theme/institutional";
import { labelValueCard, dataTable, sectionTitle, voucherIntro, infoLine, style } from "./primitives";
import {
  iconAlertCircle, iconMessageCircle, iconShield, iconMapPin, iconTicket, iconCar,
  iconShip, iconTrain, iconBus, iconLuggage, iconPackage, iconSparkles,
} from "./icons";
import type { GenericVoucherData, GenericServiceSlug } from "@/components/sales/ConfirmationVoucher";

const fmtDateBR = (s?: string | null) => {
  if (!s) return "—";
  const [y, m, d] = s.split("T")[0].split("-");
  if (!y || !m || !d) return s;
  return `${d}/${m}/${y.slice(2)}`;
};
const fmtTime = (s?: string | null) => (s ? s.slice(0, 5) : "—");

interface SlugMeta {
  headerLabel: string;
  title: string;
  sectionTitle: string;
  icon: IconDraw;
}

const SLUG_META: Record<GenericServiceSlug, SlugMeta> = {
  "seguro-viagem":         { headerLabel: "Voucher de Seguro Viagem",    title: "Confirmação de Cobertura", sectionTitle: "Detalhes da Cobertura", icon: iconShield },
  "passeios":              { headerLabel: "Voucher de Passeio",          title: "Confirmação de Reserva",   sectionTitle: "Detalhes do Passeio",   icon: iconMapPin },
  "ingressos":             { headerLabel: "Voucher de Ingresso",         title: "Confirmação de Reserva",   sectionTitle: "Detalhes do Ingresso",  icon: iconTicket },
  "transfer":              { headerLabel: "Voucher de Transfer",         title: "Confirmação de Reserva",   sectionTitle: "Detalhes do Transfer",  icon: iconCar },
  "aluguel-carro":         { headerLabel: "Voucher de Aluguel de Carro", title: "Confirmação de Reserva",   sectionTitle: "Detalhes do Aluguel",   icon: iconCar },
  "cruzeiro":              { headerLabel: "Voucher de Cruzeiro",         title: "Confirmação de Reserva",   sectionTitle: "Detalhes do Cruzeiro",  icon: iconShip },
  "trem":                  { headerLabel: "Voucher de Passagem de Trem", title: "Confirmação de Reserva",   sectionTitle: "Detalhes do Trecho",    icon: iconTrain },
  "onibus":                { headerLabel: "Voucher de Passagem de Ônibus", title: "Confirmação de Reserva", sectionTitle: "Detalhes do Trecho",    icon: iconBus },
  "bagagem":               { headerLabel: "Voucher de Bagagem Extra",    title: "Confirmação de Serviço",   sectionTitle: "Detalhes do Serviço",   icon: iconLuggage },
  "assento-conforto":      { headerLabel: "Voucher de Assento Conforto", title: "Confirmação de Serviço",   sectionTitle: "Detalhes do Serviço",   icon: iconSparkles },
  "roteiro-personalizado": { headerLabel: "Voucher de Roteiro",          title: "Confirmação de Serviço",   sectionTitle: "Detalhes do Roteiro",   icon: iconMapPin },
  "servicos-extras":       { headerLabel: "Voucher de Serviço",          title: "Confirmação de Serviço",   sectionTitle: "Detalhes do Serviço",   icon: iconSparkles },
  "pacote":                { headerLabel: "Voucher de Pacote",           title: "Confirmação de Reserva",   sectionTitle: "Detalhes do Pacote",    icon: iconPackage },
  "outros":                { headerLabel: "Voucher de Serviço",          title: "Confirmação de Serviço",   sectionTitle: "Detalhes do Serviço",   icon: iconPackage },
  "generico":              { headerLabel: "Voucher de Serviço",          title: "Confirmação de Serviço",   sectionTitle: "Detalhes do Serviço",   icon: iconPackage },
};

export function buildGenericVoucherTree(data: GenericVoucherData): Node {
  const meta = SLUG_META[data.slug] || SLUG_META["generico"];

  const period = (() => {
    const a = fmtDateBR(data.start_date);
    const b = fmtDateBR(data.end_date);
    if (a !== "—" && b !== "—" && a !== b) return `${a} → ${b}`;
    if (a !== "—") return a;
    return "—";
  })();

  const times = (() => {
    const a = data.start_time ? fmtTime(data.start_time) : "";
    const b = data.end_time ? fmtTime(data.end_time) : "";
    if (a && b) return `${a} · ${b}`;
    return a || b || "";
  })();

  const basics: Array<[string, string]> = [
    ["Serviço:", data.service_name || meta.headerLabel],
    ...(data.supplier ? [["Fornecedor:", data.supplier] as [string, string]] : []),
    ...(data.category_label && data.category_value
      ? [[`${data.category_label}:`, data.category_value] as [string, string]]
      : []),
    ["Código da reserva:", data.reservation_code || "—"],
    ["Período:", period],
    ...(times ? [["Horário:", times] as [string, string]] : []),
    ...(data.location ? [["Local:", data.location] as [string, string]] : []),
    ...(data.extras || []),
  ];

  const sections: Node[] = [
    voucherIntro(meta.headerLabel, meta.title),

    col({ gap: 2 }, [
      sectionTitle("Informações Básicas"),
      labelValueCard(basics),
    ]),
  ];

  if (data.description) {
    sections.push(col({ gap: 2 }, [
      sectionTitle(meta.sectionTitle),
      col({ border: { color: "#e2e6df", width: 0.15 }, radius: 1.5, padding: [4, 5] }, [
        text(data.description, { font: { size: 9.5, color: "#1f2937", lineHeight: 1.55 } }),
      ]),
    ]));
  }

  sections.push(col({ gap: 2 }, [
    sectionTitle("Beneficiários"),
    dataTable({
      cols: [50, 20, 30],
      headers: ["Nome completo", "Tipo", "Documento"],
      align: ["left", "left", "left"],
      rows: data.passengers.map((p) => [p.name || "—", p.type || "Adulto", p.doc || "—"]),
      emptyLabel: "Nenhum beneficiário cadastrado.",
    }),
  ]));

  sections.push(col({ gap: 3 }, [
    sectionTitle("Informações importantes"),
    infoLine(meta.icon, "Sobre este serviço", [
      data.notes || "Apresente este voucher ao fornecedor no momento da utilização. Chegue com antecedência ao ponto de encontro/embarque.",
    ]),
    infoLine(iconAlertCircle, "Documentação", [
      "Tenha em mãos um documento oficial com foto e este voucher (impresso ou digital).",
    ]),
    infoLine(iconMessageCircle, "Suporte", [
      "Fale com a NatLeva pelo WhatsApp em caso de dúvida ou imprevisto.",
    ]),
  ]));

  return col({ gap: 6 }, sections);
}

export async function exportGenericVoucherPdf(data: GenericVoucherData, fileName: string) {
  const errors = validateFooterInvariants();
  if (errors.length > 0) throw new Error(`[pdf-engine] export blocked: ${errors.join(", ")}`);

  const meta = SLUG_META[data.slug] || SLUG_META["generico"];

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
  pdf.setProperties({
    title: `${meta.headerLabel} · NatLeva Viagens`,
    author: "NatLeva Viagens",
    creator: "NatLeva PDF Engine",
  });

  const logo = await loadLogoAsset();
  const tree = buildGenericVoucherTree(data);

  renderDocument(pdf, tree, {
    pageMargin: PAGE.marginMm,
    headerHeight: PAGE.headerMm,
    footerHeight: PAGE.footerMm,
    renderHeader: (p) => drawInstitutionalHeader(p, logo, {
      label: meta.headerLabel.replace(/^Voucher (de |da |do |dos |das )?/, "Voucher "),
      reservationCode: data.reservation_code,
    }),
    renderFooter: (p, page, total) => drawInstitutionalFooter(p, page, total),
  });

  pdf.save(fileName);
}
