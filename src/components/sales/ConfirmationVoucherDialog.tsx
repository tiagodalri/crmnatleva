import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plane, Hotel, Download, Pencil, Package, FileCode2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { HotelVoucher, AereoVoucher, GenericVoucher, GENERIC_PRESETS, type HotelVoucherData, type AereoVoucherData, type GenericVoucherData, type GenericServiceSlug } from "./ConfirmationVoucher";
import { exportAereoVoucherPdf } from "@/lib/pdf-engine/aereoVoucher";
import { exportHotelVoucherPdf } from "@/lib/pdf-engine/hotelVoucher";
import { exportGenericVoucherPdf } from "@/lib/pdf-engine/genericVoucher";
import { NATLEVA_FOOTER_LINE } from "@/lib/pdf-engine/theme/institutional";
import { iataToLabel } from "@/lib/iataUtils";
import { ALL_AIRLINES } from "@/lib/airlinesData";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { normalizePassengerName } from "@/lib/nameUtils";
import logoNatleva from "@/assets/logo-natleva.png";

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
const PREVIEW_SCALE = 0.78;

// ── Sistema de página do PDF (todas medidas em mm; A4 = 210 × 297) ───────────
// O conteúdo do voucher é renderizado apenas dentro da BODY zone. HEADER e
// FOOTER são desenhados como camada VETORIAL selecionável em toda página.
const PDF_SIDE_MARGIN_MM = 10;         // margem lateral (esquerda/direita)
const PDF_HEADER_TOP_MM = 10;          // topo do header (onde o logo começa)
const PDF_HEADER_LINE_MM = 24;         // linha divisória horizontal do header
const PDF_BODY_TOP_MM = 28;            // início da área de conteúdo
const PDF_FOOTER_LINE_MM = 280;        // linha divisória horizontal do footer
const PDF_FOOTER_TEXT_MM = 286;        // baseline dos textos do footer
const PDF_BODY_BOTTOM_MM = 277;        // fim da área de conteúdo (antes do footer)
const PDF_CONTINUATION_TOP_PAD_PX = 24; // respiro no topo de páginas 2+

// Paleta oficial da marca (espelha ConfirmationVoucher.tsx)
// BRAND_GREEN reservado para futura customização vetorial; hoje usamos BRAND_DIVIDER.
const BRAND_GREEN_DARK = "#0f3d24";
const BRAND_MUTED = "#6b7280";
const BRAND_DIVIDER: [number, number, number] = [0x1f, 0x5f, 0x3a];
const BRAND_DIVIDER_LIGHT: [number, number, number] = [0xd8, 0xdf, 0xd5];



type DbRecord = Record<string, unknown>;

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  saleId: string;
}

type VoucherKind =
  | { type: "aereo"; id: "aereo"; label: string; data: AereoVoucherData }
  | { type: "hotel"; id: string; label: string; data: HotelVoucherData }
  | { type: "generic"; id: string; label: string; data: GenericVoucherData };

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function shortAirportLabel(iata?: string | null): string {
  if (!iata) return "—";
  const full = iataToLabel(iata) || iata;
  const city = full.replace(/\s*\(.*\)\s*/g, "").trim();
  return `${city} / ${iata.toUpperCase()}`;
}

function prettyAirline(code?: string | null): string {
  if (!code) return "—";
  const c = code.trim().toUpperCase();
  const found = ALL_AIRLINES.find((a) => a.iata === c || a.icao === c);
  return found ? found.name.split(/\s+/)[0] : c;
}

function cleanFlightNumber(airline?: string | null, flightNumber?: string | null): string {
  const air = (airline || "").trim().toUpperCase();
  const fn = (flightNumber || "").trim().toUpperCase();
  if (!fn) return air || "—";
  const stripped = air ? fn.replace(new RegExp(`^(?:${air}\\s*)+`, "i"), "").trim() : fn;
  return air ? `${air} ${stripped || fn}` : fn;
}

function inferPaxType(birth?: string | null): string {
  if (!birth) return "Adulto";
  const b = new Date(birth);
  if (Number.isNaN(b.getTime())) return "Adulto";
  const age = (Date.now() - b.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (age < 2) return "Bebê";
  if (age < 12) return "Criança";
  return "Adulto";
}

function prettyClass(c?: string | null): string {
  if (!c) return "Econômica";
  const map: Record<string, string> = {
    economy: "Econômica",
    economica: "Econômica",
    premium_economy: "Premium Economy",
    business: "Executiva",
    executiva: "Executiva",
    first: "Primeira Classe",
    primeira: "Primeira Classe",
  };
  return map[c.toLowerCase()] || c;
}

function normalizePaxName(value: unknown): string {
  return normalizePassengerName(asString(value)) || "—";
}

function normalizeGenericSlug(productType?: string | null, category?: string | null, description?: string | null): GenericServiceSlug {
  const pt = (productType || "").toLowerCase().trim();
  const cat = (category || "").toLowerCase().trim();
  const desc = (description || "").toLowerCase();

  const knownSlugs: GenericServiceSlug[] = [
    "seguro-viagem", "passeios", "ingressos", "transfer", "aluguel-carro",
    "cruzeiro", "trem", "onibus", "bagagem", "assento-conforto",
    "roteiro-personalizado", "servicos-extras", "pacote", "outros",
  ];
  if (knownSlugs.includes(pt as GenericServiceSlug)) return pt as GenericServiceSlug;

  if (pt === "insurance" || /seguro/.test(desc)) return "seguro-viagem";
  if (pt === "cruise" || /cruzeiro|msc|costa cruzeiros/.test(desc)) return "cruzeiro";
  if (/transfer|traslado/.test(desc)) return "transfer";
  if (/aluguel.*(carro|ve[ií]culo)|rent.*a.*car|locadora/.test(desc)) return "aluguel-carro";
  if (/passeio|city.?tour|tour|excurs[aã]o/.test(desc)) return "passeios";
  if (/ingresso|ticket|entrada/.test(desc)) return "ingressos";
  if (/trem|train/.test(desc)) return "trem";
  if (/[oô]nibus|bus/.test(desc)) return "onibus";
  if (/bagagem|luggage/.test(desc)) return "bagagem";
  if (/assento/.test(desc)) return "assento-conforto";
  if (/roteiro|itiner[aá]rio/.test(desc)) return "roteiro-personalizado";
  if (cat === "outro" || cat === "outros") return "servicos-extras";
  return "generico";
}

function createLongTestVouchers(): VoucherKind[] {
  const passengers = [
    { name: normalizePassengerName("MARIA CAROLINA ALBUQUERQUE VASCONCELLOS DE ANDRADE"), type: "Adulto", doc: "12345678900" },
    { name: normalizePassengerName("joão pedro albuquerque vasconcellos de andrade neto"), type: "Adulto", doc: "98765432100" },
  ];

  return [
    {
      type: "aereo",
      id: "aereo",
      label: "Teste A4 · Voucher Aéreo",
      data: {
        flight_class: "Premium Economy",
        emission_date: "2026-07-16",
        reservation_code: "NATLEVA2026LONG",
        passengers,
        segments: [
          { flight_number: "LA 3278", origin_label: "São Paulo / GRU", destination_label: "Buenos Aires / EZE", airline: "LATAM", date: "2026-07-16", departure_time: "06:05", arrival_time: "09:10" },
          { flight_number: "AR 1894", origin_label: "Buenos Aires / EZE", destination_label: "Ushuaia / USH", airline: "Aerolíneas", date: "2026-07-16", departure_time: "11:45", arrival_time: "15:25" },
          { flight_number: "G3 1422", origin_label: "São Paulo / CGH", destination_label: "Cuiabá / CGB", airline: "GOL", date: "2026-07-18", departure_time: "14:20", arrival_time: "15:40" },
          { flight_number: "AD 4098", origin_label: "Belo Horizonte / CNF", destination_label: "Fernando de Noronha / FEN", airline: "Azul", date: "2026-07-22", departure_time: "08:35", arrival_time: "13:15" },
        ],
      },
    },
    {
      type: "hotel",
      id: "hotel-test",
      label: "Teste A4 · Voucher Hospedagem",
      data: {
        hotel_name: "Hotel Internacional Grand Resort & Convention Center Praia do Forte",
        meal_plan: "Café da manhã buffet incluso todos os dias",
        room_type: "Suíte Família Premium Vista Mar com varanda privativa",
        reservation_code: "HTL-LONG-2026-998877",
        pin_code: "4821",
        address: "Avenida das Nações Unidas, 12345, Torre Jardins, São Paulo, SP, Brasil",
        checkin_date: "2026-07-16",
        checkout_date: "2026-07-24",
        checkin_time: "15:00",
        checkout_time: "12:00",
        guests: passengers.map((p) => ({ name: p.name, doc: p.doc })),
      },
    },
  ];
}

// ── PDF header/footer vetorial ────────────────────────────────────────────────
// Estas helpers desenham o cabeçalho e rodapé institucionais em CAMADA
// VETORIAL (texto selecionável) sobre cada página do PDF, sem interferir na
// identidade visual da marca — apenas usam o logo oficial e a paleta atual.

type LogoAsset = { dataUrl: string; widthMm: number; heightMm: number };

async function loadLogoAsset(): Promise<LogoAsset | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = logoNatleva;
    await new Promise<void>((resolve, reject) => {
      if (img.complete && img.naturalWidth > 0) return resolve();
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("logo load failed"));
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    const heightMm = 9; // altura fixa do logo no header
    const widthMm = (img.naturalWidth / img.naturalHeight) * heightMm;
    return { dataUrl, widthMm, heightMm };
  } catch {
    return null;
  }
}

interface HeaderMeta {
  label: string;               // "Voucher Aéreo" / "Voucher Hospedagem" / "Voucher de Passeio" etc.
  reservationCode: string | null;
}

function buildHeaderMeta(voucher: VoucherKind): HeaderMeta {
  if (voucher.type === "aereo") {
    return {
      label: "Voucher Aéreo",
      reservationCode: voucher.data.reservation_code || null,
    };
  }
  if (voucher.type === "hotel") {
    return {
      label: "Voucher Hospedagem",
      reservationCode: voucher.data.reservation_code || null,
    };
  }
  const preset = GENERIC_PRESETS[voucher.data.slug] || GENERIC_PRESETS["generico"];
  return {
    label: preset.headerLabel,
    reservationCode: voucher.data.reservation_code || null,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawPdfHeader(pdf: any, logo: LogoAsset | null, meta: HeaderMeta) {
  const pageWidth = 210;
  const rightX = pageWidth - PDF_SIDE_MARGIN_MM;

  // Logo à esquerda (identidade da marca preservada)
  if (logo) {
    try {
      pdf.addImage(logo.dataUrl, "PNG", PDF_SIDE_MARGIN_MM, PDF_HEADER_TOP_MM + 1, logo.widthMm, logo.heightMm);
    } catch {
      /* fallback silencioso */
    }
  }

  // Meta institucional à direita: label do voucher · código · data de emissão
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(BRAND_GREEN_DARK);
  pdf.text(meta.label.toUpperCase(), rightX, PDF_HEADER_TOP_MM + 4, { align: "right" });

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(BRAND_MUTED);
  const line2Parts: string[] = [];
  if (meta.reservationCode) line2Parts.push(`Reserva ${meta.reservationCode}`);
  if (line2Parts.length > 0) {
    pdf.text(line2Parts.join("  ·  "), rightX, PDF_HEADER_TOP_MM + 9, { align: "right" });
  }

  // Divisória sutil (paleta da marca) separando header do body
  pdf.setDrawColor(BRAND_DIVIDER[0], BRAND_DIVIDER[1], BRAND_DIVIDER[2]);
  pdf.setLineWidth(0.35);
  pdf.line(PDF_SIDE_MARGIN_MM, PDF_HEADER_LINE_MM, rightX, PDF_HEADER_LINE_MM);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function drawPdfFooter(pdf: any, pageNumber: number, totalPages: number) {
  const pageWidth = 210;
  const rightX = pageWidth - PDF_SIDE_MARGIN_MM;

  // Divisória sutil separando footer do body
  pdf.setDrawColor(BRAND_DIVIDER_LIGHT[0], BRAND_DIVIDER_LIGHT[1], BRAND_DIVIDER_LIGHT[2]);
  pdf.setLineWidth(0.25);
  pdf.line(PDF_SIDE_MARGIN_MM, PDF_FOOTER_LINE_MM, rightX, PDF_FOOTER_LINE_MM);

  // Footer institucional — fonte única de verdade, centralizado
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setCharSpace(0);
  pdf.setTextColor(BRAND_GREEN_DARK);
  pdf.text(NATLEVA_FOOTER_LINE, pageWidth / 2, PDF_FOOTER_TEXT_MM, { align: "center", baseline: "alphabetic" });

  // Paginação discreta à direita (não conflita com o footer central)
  if (totalPages > 1) {
    pdf.setFontSize(7);
    pdf.setTextColor(BRAND_MUTED);
    pdf.text(`${pageNumber} / ${totalPages}`, rightX, PDF_FOOTER_TEXT_MM, { align: "right", baseline: "alphabetic" });
  }
}



export default function ConfirmationVoucherDialog({ open, onOpenChange, saleId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [realVouchers, setRealVouchers] = useState<VoucherKind[]>([]);
  const [draftVouchers, setDraftVouchers] = useState<VoucherKind[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const [clientFileName, setClientFileName] = useState("voucher");
  const previewRef = useRef<HTMLDivElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !saleId) return;
    void load();
  }, [open, saleId]);

  const visibleVouchers = testMode ? createLongTestVouchers() : draftVouchers;
  const current = useMemo(() => visibleVouchers.find((v) => v.id === selectedId) || visibleVouchers[0] || null, [visibleVouchers, selectedId]);

  useEffect(() => {
    if (!current && visibleVouchers[0]) setSelectedId(visibleVouchers[0].id);
  }, [current, visibleVouchers]);

  const load = async () => {
    setLoading(true);
    try {
      const [saleRes, segRes, costRes, paxRes] = await Promise.all([
        supabase.from("sales").select("*").eq("id", saleId).single(),
        supabase.from("flight_segments").select("*").eq("sale_id", saleId).order("segment_order"),
        supabase.from("cost_items").select("*").eq("sale_id", saleId),
        supabase.from("sale_passengers").select("*, passengers(*)").eq("sale_id", saleId),
      ]);

      const sale = (saleRes.data || {}) as DbRecord;
      const segments = (segRes.data || []) as DbRecord[];
      const costItems = (costRes.data || []) as DbRecord[];
      const passengersRaw = (paxRes.data || [])
        .map((sp: DbRecord) => sp.passengers as DbRecord | null)
        .filter((p): p is DbRecord => Boolean(p));

      let clientName = asString(sale.name) || "voucher";
      const clientId = asString(sale.client_id);
      if (clientId) {
        const { data: c } = await supabase.from("clients").select("display_name").eq("id", clientId).single();
        if (c?.display_name) clientName = c.display_name;
      }
      setClientFileName(clientName.replace(/[^\w\-]+/g, "_"));

      const out: VoucherKind[] = [];
      if (segments.length > 0) {
        const aereoCost = costItems.find((c) => asString(c.category) === "aereo");
        const passengers = passengersRaw.map((p) => ({
          name: normalizePaxName(p.full_name),
          type: inferPaxType(asString(p.birth_date)),
          doc: asString(p.passport_number) || asString(p.cpf) || asString(p.rg),
        }));
        out.push({
          type: "aereo",
          id: "aereo",
          label: "Voucher Aéreo",
          data: {
            flight_class: prettyClass(asString(sale.flight_class)),
            emission_date: asString(sale.emission_date) || asString(sale.close_date),
            reservation_code: asString(aereoCost?.reservation_code) || asArray(sale.locators)[0] || asString(sale.locators),
            passengers,
            segments: segments.map((s) => ({
              flight_number: cleanFlightNumber(asString(s.airline), asString(s.flight_number)),
              origin_label: shortAirportLabel(asString(s.origin_iata)),
              origin_iata: asString(s.origin_iata),
              destination_label: shortAirportLabel(asString(s.destination_iata)),
              destination_iata: asString(s.destination_iata),
              airline: prettyAirline(asString(s.airline)),
              date: asString(s.departure_date),
              departure_time: asString(s.departure_time),
              arrival_time: asString(s.arrival_time),
            })),
          },
        });
      }

      const guests = passengersRaw.map((p) => ({ name: normalizePaxName(p.full_name), doc: asString(p.cpf) || asString(p.passport_number) || asString(p.rg) }));
      const hotelCosts = costItems.filter((c) => asString(c.category) === "hotel");
      const hotelSources = hotelCosts.length > 0
        ? hotelCosts.map((h) => ({
            id: asString(h.id) || crypto.randomUUID(),
            name: (asString(h.description) || asString(sale.hotel_name) || "").replace(/^Hotel:\s*/i, ""),
            reservation_code: asString(h.reservation_code),
          }))
        : asString(sale.hotel_name)
          ? [{ id: "hotel-main", name: asString(sale.hotel_name), reservation_code: asString(sale.hotel_reservation_code) }]
          : [];

      hotelSources.forEach((h, i) => {
        out.push({
          type: "hotel",
          id: `hotel-${h.id || i}`,
          label: `Voucher Hospedagem · ${h.name || `Hotel ${i + 1}`}`,
          data: {
            hotel_name: h.name,
            meal_plan: asString(sale.hotel_meal_plan),
            room_type: asString(sale.hotel_room),
            reservation_code: h.reservation_code,
            pin_code: null,
            address: asString(sale.hotel_address),
            checkin_date: asString(sale.hotel_checkin_date),
            checkout_date: asString(sale.hotel_checkout_date),
            guests,
          },
        });
      });

      // Vouchers genéricos: qualquer cost_item que não seja aéreo nem hospedagem
      // (seguro, passeio, transfer, cruzeiro, aluguel de carro, ingressos, etc.)
      const paxForGeneric = passengersRaw.map((p) => ({
        name: normalizePaxName(p.full_name),
        type: inferPaxType(asString(p.birth_date)),
        doc: asString(p.passport_number) || asString(p.cpf) || asString(p.rg),
      }));

      const genericItems = costItems.filter((c) => {
        const cat = asString(c.category);
        const pt = asString(c.product_type);
        // exclui aéreo e hotel (já geraram vouchers dedicados)
        if (cat === "aereo") return false;
        if (cat === "hotel" || pt === "hotel" || pt === "hospedagem") return false;
        return true;
      });

      genericItems.forEach((item, i) => {
        const rawDesc = asString(item.description) || "";
        const [firstLine, ...rest] = rawDesc.split("·").map((s) => s.trim()).filter(Boolean);
        const serviceName = firstLine || "Serviço";
        const detail = rest.join(" · ");
        const slug = normalizeGenericSlug(asString(item.product_type), asString(item.category), rawDesc);
        const preset = GENERIC_PRESETS[slug];

        out.push({
          type: "generic",
          id: `generic-${asString(item.id) || i}`,
          label: `${preset.headerLabel} · ${serviceName}`,
          data: {
            slug,
            service_name: serviceName,
            supplier: null,
            reservation_code: asString(item.reservation_code),
            description: detail || (rawDesc && rawDesc !== serviceName ? rawDesc : null),
            location: null,
            start_date: asString(sale.departure_date) || asString(sale.hotel_checkin_date) || null,
            end_date: asString(sale.return_date) || asString(sale.hotel_checkout_date) || null,
            passengers: paxForGeneric,
            notes: null,
          },
        });
      });


      setRealVouchers(out);
      setDraftVouchers(out);
      setSelectedId(out[0]?.id || null);
      setTestMode(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : "Não foi possível carregar os dados do voucher.";
      toast({ title: "Erro ao carregar dados", description: message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const updateCurrent = (updater: (voucher: VoucherKind) => VoucherKind) => {
    if (testMode || !current) return;
    setDraftVouchers((items) => items.map((item) => (item.id === current.id ? updater(item) : item)));
  };

  const handleExportEngine = async () => {
    if (!current) return;
    setExporting(true);
    try {
      const prefix = current.type === "aereo" ? "Voucher-Aereo" : current.type === "hotel" ? "Voucher-Hotel" : `Voucher-${(current.data as GenericVoucherData).slug || "Servico"}`;
      const fileName = `${prefix}_${testMode ? "Teste-A4" : clientFileName}.pdf`;
      if (current.type === "aereo") {
        await exportAereoVoucherPdf(current.data, fileName);
      } else if (current.type === "hotel") {
        await exportHotelVoucherPdf(current.data, fileName);
      } else {
        await exportGenericVoucherPdf(current.data, fileName);
      }
      toast({ title: "PDF gerado", description: fileName });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Falha ao gerar PDF pela engine.";
      toast({ title: "Erro ao gerar PDF", description: msg, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };


  const handleExport = async () => {
    if (!current || !exportRef.current) return;
    setExporting(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf"),
      ]);
      await document.fonts?.ready;
      // Aguarda layout (ícones SVG, fontes) estabilizar
      await new Promise((r) => setTimeout(r, 180));

      const root = exportRef.current;

      const rootWidth = Math.round(root.getBoundingClientRect().width || A4_WIDTH_PX);
      const rootHeight = Math.ceil(root.scrollHeight || root.getBoundingClientRect().height || A4_HEIGHT_PX);
      // Captura em 3x → ~300 DPI equivalente, texto muito mais nítido no PDF final.
      const captureScale = 3;
      const minSlicePx = Math.round(160 * captureScale);

      // 1) Captura única do voucher inteiro no mesmo grid de pixels do preview.
      const bodyCanvas = await html2canvas(root, {
        scale: captureScale,
        useCORS: true,
        backgroundColor: "#ffffff",
        logging: false,
        windowWidth: rootWidth,
        windowHeight: Math.max(rootHeight, A4_HEIGHT_PX),
        width: rootWidth,
        height: rootHeight,
        scrollX: 0,
        scrollY: 0,
      });

      // 2) Zonas físicas da folha A4 (mm). O body do voucher só desenha entre
      // PDF_BODY_TOP_MM e PDF_BODY_BOTTOM_MM; header e footer vetoriais ocupam
      // as áreas reservadas em toda página.
      const innerWidthMm = 210 - 2 * PDF_SIDE_MARGIN_MM;
      const bodyHeightMm = PDF_BODY_BOTTOM_MM - PDF_BODY_TOP_MM;
      const pxPerMm = bodyCanvas.width / innerWidthMm;
      const pdfBodyPxCapacity = Math.round(bodyHeightMm * pxPerMm);

      // 3) Pontos de quebra naturais = topo de cada [data-pdf-section] no canvas.
      const rootRect = root.getBoundingClientRect();
      const sectionTops = Array.from(
        root.querySelectorAll<HTMLElement>("[data-pdf-section]"),
      )
        .map((el) => Math.round((el.getBoundingClientRect().top - rootRect.top) * (bodyCanvas.height / rootHeight)))
        .filter((y) => y > 0);
      const breaks = Array.from(new Set([0, ...sectionTops, bodyCanvas.height])).sort((a, b) => a - b);

      // 4) Fatia o canvas em N buffers (um por página), respeitando quebras.
      type PageBuffer = { dataUrl: string; heightMm: number };
      const pageBuffers: PageBuffer[] = [];
      let pageStart = 0;
      let pageIndex = 0;

      while (pageStart < bodyCanvas.height - 1) {
        const topPad = pageIndex === 0 ? 0 : PDF_CONTINUATION_TOP_PAD_PX;
        const pageCapacityPx = pdfBodyPxCapacity - topPad;
        const idealEnd = pageStart + pageCapacityPx;
        let pageEnd: number;

        if (idealEnd >= bodyCanvas.height) {
          pageEnd = bodyCanvas.height;
        } else {
          // Maior ponto de quebra que cabe na página atual
          const candidate = [...breaks]
            .reverse()
            .find((bp) => bp > pageStart + minSlicePx && bp <= idealEnd);
          pageEnd = candidate ?? Math.floor(idealEnd);
        }

        const sliceH = pageEnd - pageStart;
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = bodyCanvas.width;
        // Buffer apenas com o conteúdo real (sem padding) — o topPad vira
        // margem no momento de posicionar no PDF, sem inflar o buffer.
        pageCanvas.height = sliceH + topPad;
        const ctx = pageCanvas.getContext("2d")!;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
        ctx.drawImage(bodyCanvas, 0, pageStart, bodyCanvas.width, sliceH, 0, topPad, bodyCanvas.width, sliceH);

        pageBuffers.push({
          dataUrl: pageCanvas.toDataURL("image/png"),
          heightMm: (sliceH + topPad) / pxPerMm,
        });
        pageStart = pageEnd;
        pageIndex += 1;
      }

      // 5) Carrega logo como dataURL para o header vetorial de cada página.
      const logoAsset = await loadLogoAsset();

      // 6) Metadados do voucher para o header institucional.
      const headerMeta = buildHeaderMeta(current);
      const totalPages = Math.max(1, pageBuffers.length);

      // 7) Monta o PDF: em cada página desenha header vetorial → body (imagem) → footer vetorial.
      const pdf = new jsPDF("p", "mm", "a4", true);
      pdf.setProperties({
        title: `${headerMeta.label} · NatLeva Viagens`,
        subject: headerMeta.label,
        author: "NatLeva Viagens",
        creator: "NatLeva Viagens",
      });

      for (let i = 0; i < pageBuffers.length; i++) {
        if (i > 0) pdf.addPage();
        drawPdfHeader(pdf, logoAsset, headerMeta);
        pdf.addImage(
          pageBuffers[i].dataUrl,
          "PNG",
          PDF_SIDE_MARGIN_MM,
          PDF_BODY_TOP_MM,
          innerWidthMm,
          Math.min(bodyHeightMm, pageBuffers[i].heightMm),
          undefined,
          "SLOW",
        );
        drawPdfFooter(pdf, i + 1, totalPages);
      }

      const prefix = current.type === "aereo" ? "Voucher-Aereo" : current.type === "hotel" ? "Voucher-Hotel" : `Voucher-${(current.data as GenericVoucherData).slug || "Servico"}`;
      const fileName = `${prefix}_${testMode ? "Teste-A4" : clientFileName}.pdf`;
      pdf.save(fileName);
      toast({ title: "PDF gerado", description: fileName });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Falha inesperada ao gerar PDF.";
      toast({ title: "Erro ao gerar PDF", description: message, variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };


  const resetDraft = () => {
    setDraftVouchers(realVouchers);
    setEditMode(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[96vw] h-[92vh] overflow-hidden flex flex-col p-5 sm:p-6 rounded-xl">
        <DialogHeader>
          <div className="flex flex-col gap-3 pr-10 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <DialogTitle>Gerar PDF de Confirmação</DialogTitle>
              <DialogDescription>Valide o voucher em A4, ajuste campos se necessário e baixe o PDF final.</DialogDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant={editMode ? "default" : "outline"} size="sm" onClick={() => setEditMode((v) => !v)} disabled={testMode || !current}>
                <Pencil className="w-4 h-4 mr-2" /> Editar campos
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
        ) : visibleVouchers.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">Esta venda ainda não tem produtos cadastrados para gerar voucher.</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-[320px_minmax(0,1fr)] gap-4 flex-1 min-h-0">
            <div className="min-h-0 flex flex-col gap-3">
              
              <div className="grid gap-2">
                {visibleVouchers.map((v) => (
                  <button key={v.id} onClick={() => setSelectedId(v.id)} className={cn("min-h-11 text-left px-3 py-2.5 rounded-lg border text-sm flex items-start gap-2 transition-colors", selectedId === v.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted")}> 
                    {v.type === "aereo" ? <Plane className="w-4 h-4 mt-0.5 shrink-0" /> : v.type === "hotel" ? <Hotel className="w-4 h-4 mt-0.5 shrink-0" /> : <Package className="w-4 h-4 mt-0.5 shrink-0" />}
                    <span className="flex-1 leading-snug">{v.label}</span>
                  </button>
                ))}
              </div>
              {editMode && current && !testMode && <EditPanel voucher={current} onChange={updateCurrent} onReset={resetDraft} />}
              <Button onClick={handleExport} disabled={!current || exporting} className="mt-auto min-h-11">
                {exporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />} Baixar PDF
              </Button>
            </div>

            <ScrollArea className="min-h-0 border rounded-lg bg-muted/30 overflow-hidden">
              <div className="min-w-full flex justify-center px-4 py-6">
                <div style={{ width: A4_WIDTH_PX * PREVIEW_SCALE, minHeight: A4_HEIGHT_PX * PREVIEW_SCALE, position: "relative", flex: "0 0 auto" }}>
                  <div style={{ width: A4_WIDTH_PX, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: "top left", pointerEvents: "none" }}>
                    {current?.type === "aereo" && <AereoVoucher ref={previewRef} data={current.data} />}
                    {current?.type === "hotel" && <HotelVoucher ref={previewRef} data={current.data} />}
                    {current?.type === "generic" && <GenericVoucher ref={previewRef} data={current.data} />}
                  </div>
                </div>
              </div>
            </ScrollArea>
            {typeof document !== "undefined" && createPortal(
              <div aria-hidden="true" style={{ position: "absolute", left: -10000, top: 0, width: A4_WIDTH_PX, background: "#ffffff", overflow: "visible", pointerEvents: "none" }}>
                {current?.type === "aereo" && <AereoVoucher ref={exportRef} data={current.data} exportMode />}
                {current?.type === "hotel" && <HotelVoucher ref={exportRef} data={current.data} exportMode />}
                {current?.type === "generic" && <GenericVoucher ref={exportRef} data={current.data} exportMode />}
              </div>,
              document.body,
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}

function SectionTitle({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between pt-2 pb-1 border-b border-border/60">
      <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">{children}</h4>
      {action}
    </div>
  );
}

function EditPanel({ voucher, onChange, onReset }: { voucher: VoucherKind; onChange: (updater: (voucher: VoucherKind) => VoucherKind) => void; onReset: () => void }) {
  if (voucher.type === "aereo") {
    const data = voucher.data;

    const setAereo = (patch: Partial<AereoVoucherData>) =>
      onChange((v) => (v.type === "aereo" ? { ...v, data: { ...v.data, ...patch } } : v));

    const updatePax = (i: number, patch: Partial<AereoVoucherData["passengers"][number]>) =>
      setAereo({ passengers: data.passengers.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });

    const addPax = () => setAereo({ passengers: [...data.passengers, { name: "", type: "Adulto", doc: "" }] });
    const removePax = (i: number) => setAereo({ passengers: data.passengers.filter((_, idx) => idx !== i) });

    const updateSeg = (i: number, patch: Partial<AereoVoucherData["segments"][number]>) =>
      setAereo({ segments: data.segments.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) });

    const addSeg = () => setAereo({ segments: [...data.segments, { flight_number: "", origin_label: "", destination_label: "", airline: "", date: "", departure_time: "", arrival_time: "" }] });
    const removeSeg = (i: number) => setAereo({ segments: data.segments.filter((_, idx) => idx !== i) });

    return (
      <ScrollArea className="border rounded-lg p-3 max-h-[52vh] bg-muted/20">
        <div className="space-y-4 pr-2">
          <SectionTitle>Informações Básicas</SectionTitle>
          <Field label="Classe"><Input value={data.flight_class || ""} onChange={(e) => setAereo({ flight_class: e.target.value })} /></Field>
          <Field label="Data da emissão"><Input value={data.emission_date || ""} placeholder="AAAA-MM-DD" onChange={(e) => setAereo({ emission_date: e.target.value })} /></Field>
          <Field label="Código de reserva"><Input value={data.reservation_code || ""} onChange={(e) => setAereo({ reservation_code: e.target.value })} /></Field>

          <SectionTitle action={<Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={addPax}>+ Adicionar</Button>}>Passageiros</SectionTitle>
          {data.passengers.map((p, i) => (
            <div key={i} className="rounded-lg border border-border/50 p-3 space-y-2 bg-background/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Passageiro {i + 1}</p>
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => removePax(i)}>Remover</Button>
              </div>
              <Field label="Nome completo"><Input value={p.name || ""} onChange={(e) => updatePax(i, { name: e.target.value })} onBlur={(e) => updatePax(i, { name: normalizePassengerName(e.target.value) })} /></Field>
              <Field label="Tipo de passageiro"><Input value={p.type || ""} placeholder="Adulto / Criança / Bebê" onChange={(e) => updatePax(i, { type: e.target.value })} /></Field>
              <Field label="Documento"><Input value={p.doc || ""} onChange={(e) => updatePax(i, { doc: e.target.value })} /></Field>
            </div>
          ))}

          <SectionTitle action={<Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={addSeg}>+ Adicionar</Button>}>Trechos da Viagem</SectionTitle>
          {data.segments.map((s, i) => (
            <div key={i} className="rounded-lg border border-border/50 p-3 space-y-2 bg-background/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Trecho {i + 1}</p>
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => removeSeg(i)}>Remover</Button>
              </div>
              <Field label="Número do voo"><Input value={s.flight_number || ""} onChange={(e) => updateSeg(i, { flight_number: e.target.value })} /></Field>
              <Field label="Companhia aérea"><Input value={s.airline || ""} onChange={(e) => updateSeg(i, { airline: e.target.value })} /></Field>
              <Field label="Origem (cidade / IATA)"><Input value={s.origin_label || ""} onChange={(e) => updateSeg(i, { origin_label: e.target.value })} /></Field>
              <Field label="Destino (cidade / IATA)"><Input value={s.destination_label || ""} onChange={(e) => updateSeg(i, { destination_label: e.target.value })} /></Field>
              <Field label="Data"><Input value={s.date || ""} placeholder="AAAA-MM-DD" onChange={(e) => updateSeg(i, { date: e.target.value })} /></Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Partida"><Input value={s.departure_time || ""} placeholder="HH:MM" onChange={(e) => updateSeg(i, { departure_time: e.target.value })} /></Field>
                <Field label="Chegada"><Input value={s.arrival_time || ""} placeholder="HH:MM" onChange={(e) => updateSeg(i, { arrival_time: e.target.value })} /></Field>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={onReset} className="w-full">Restaurar dados originais</Button>
        </div>
      </ScrollArea>
    );
  }

  if (voucher.type === "generic") {
    const data = voucher.data;
    const setGeneric = (patch: Partial<GenericVoucherData>) =>
      onChange((v) => (v.type === "generic" ? { ...v, data: { ...v.data, ...patch } } : v));
    const updatePax = (i: number, patch: Partial<GenericVoucherData["passengers"][number]>) =>
      setGeneric({ passengers: data.passengers.map((p, idx) => (idx === i ? { ...p, ...patch } : p)) });
    const addPax = () => setGeneric({ passengers: [...data.passengers, { name: "", doc: "", type: "Adulto" }] });
    const removePax = (i: number) => setGeneric({ passengers: data.passengers.filter((_, idx) => idx !== i) });

    return (
      <ScrollArea className="border rounded-lg p-3 max-h-[52vh] bg-muted/20">
        <div className="space-y-4 pr-2">
          <SectionTitle>Informações Básicas</SectionTitle>
          <Field label="Nome do serviço"><Input value={data.service_name || ""} onChange={(e) => setGeneric({ service_name: e.target.value })} /></Field>
          <Field label="Fornecedor"><Input value={data.supplier || ""} onChange={(e) => setGeneric({ supplier: e.target.value })} /></Field>
          <Field label="Código de reserva"><Input value={data.reservation_code || ""} onChange={(e) => setGeneric({ reservation_code: e.target.value })} /></Field>
          <Field label="Local"><Input value={data.location || ""} onChange={(e) => setGeneric({ location: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Data início"><Input value={data.start_date || ""} placeholder="AAAA-MM-DD" onChange={(e) => setGeneric({ start_date: e.target.value })} /></Field>
            <Field label="Data fim"><Input value={data.end_date || ""} placeholder="AAAA-MM-DD" onChange={(e) => setGeneric({ end_date: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Hora início"><Input value={data.start_time || ""} placeholder="HH:MM" onChange={(e) => setGeneric({ start_time: e.target.value })} /></Field>
            <Field label="Hora fim"><Input value={data.end_time || ""} placeholder="HH:MM" onChange={(e) => setGeneric({ end_time: e.target.value })} /></Field>
          </div>
          <Field label="Descrição"><Textarea rows={4} value={data.description || ""} onChange={(e) => setGeneric({ description: e.target.value })} /></Field>
          <Field label="Observações importantes"><Textarea rows={3} value={data.notes || ""} onChange={(e) => setGeneric({ notes: e.target.value })} /></Field>

          <SectionTitle action={<Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={addPax}>+ Adicionar</Button>}>Beneficiários</SectionTitle>
          {data.passengers.map((p, i) => (
            <div key={i} className="rounded-lg border border-border/50 p-3 space-y-2 bg-background/40">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-foreground">Beneficiário {i + 1}</p>
                <Button type="button" size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => removePax(i)}>Remover</Button>
              </div>
              <Field label="Nome completo"><Input value={p.name || ""} onChange={(e) => updatePax(i, { name: e.target.value })} onBlur={(e) => updatePax(i, { name: normalizePassengerName(e.target.value) })} /></Field>
              <Field label="Documento"><Input value={p.doc || ""} onChange={(e) => updatePax(i, { doc: e.target.value })} /></Field>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={onReset} className="w-full">Restaurar dados originais</Button>
        </div>
      </ScrollArea>
    );
  }

  const data = voucher.data;
  const setHotel = (patch: Partial<HotelVoucherData>) =>
    onChange((v) => (v.type === "hotel" ? { ...v, data: { ...v.data, ...patch } } : v));

  const updateGuest = (i: number, patch: Partial<HotelVoucherData["guests"][number]>) =>
    setHotel({ guests: data.guests.map((g, idx) => (idx === i ? { ...g, ...patch } : g)) });
  const addGuest = () => setHotel({ guests: [...data.guests, { name: "", doc: "" }] });
  const removeGuest = (i: number) => setHotel({ guests: data.guests.filter((_, idx) => idx !== i) });

  return (
    <ScrollArea className="border rounded-lg p-3 max-h-[52vh] bg-muted/20">
      <div className="space-y-4 pr-2">
        <SectionTitle>Informações Básicas</SectionTitle>
        <Field label="Hotel"><Input value={data.hotel_name || ""} onChange={(e) => setHotel({ hotel_name: e.target.value })} /></Field>
        <Field label="Alimentação"><Input value={data.meal_plan || ""} onChange={(e) => setHotel({ meal_plan: e.target.value })} /></Field>
        <Field label="Tipo de quarto"><Input value={data.room_type || ""} onChange={(e) => setHotel({ room_type: e.target.value })} /></Field>
        <Field label="Número de reserva"><Input value={data.reservation_code || ""} onChange={(e) => setHotel({ reservation_code: e.target.value })} /></Field>
        <Field label="Código PIN"><Input value={data.pin_code || ""} onChange={(e) => setHotel({ pin_code: e.target.value })} /></Field>

        <SectionTitle action={<Button type="button" size="sm" variant="ghost" className="h-7 text-xs" onClick={addGuest}>+ Adicionar</Button>}>Hóspedes</SectionTitle>
        {data.guests.map((g, i) => (
          <div key={i} className="rounded-lg border border-border/50 p-3 space-y-2 bg-background/40">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">Hóspede {i + 1}</p>
              <Button type="button" size="sm" variant="ghost" className="h-6 text-xs text-destructive" onClick={() => removeGuest(i)}>Remover</Button>
            </div>
            <Field label="Nome completo"><Input value={g.name || ""} onChange={(e) => updateGuest(i, { name: e.target.value })} onBlur={(e) => updateGuest(i, { name: normalizePassengerName(e.target.value) })} /></Field>
            <Field label="Documento"><Input value={g.doc || ""} onChange={(e) => updateGuest(i, { doc: e.target.value })} /></Field>
          </div>
        ))}

        <SectionTitle>Detalhes da Hospedagem</SectionTitle>
        <Field label="Endereço"><Textarea rows={2} value={data.address || ""} onChange={(e) => setHotel({ address: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Data de chegada"><Input value={data.checkin_date || ""} placeholder="AAAA-MM-DD" onChange={(e) => setHotel({ checkin_date: e.target.value })} /></Field>
          <Field label="Data de saída"><Input value={data.checkout_date || ""} placeholder="AAAA-MM-DD" onChange={(e) => setHotel({ checkout_date: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Horário check-in"><Input value={data.checkin_time || ""} placeholder="15:00" onChange={(e) => setHotel({ checkin_time: e.target.value })} /></Field>
          <Field label="Horário check-out"><Input value={data.checkout_time || ""} placeholder="12:00" onChange={(e) => setHotel({ checkout_time: e.target.value })} /></Field>
        </div>

        <SectionTitle>Informações Importantes</SectionTitle>
        <Field label="Observação sobre documentação"><Textarea rows={2} value={data.doc_note || ""} placeholder="Apresente seu passaporte no momento do check-in." onChange={(e) => setHotel({ doc_note: e.target.value })} /></Field>

        <Button type="button" variant="outline" size="sm" onClick={onReset} className="w-full">Restaurar dados originais</Button>
      </div>
    </ScrollArea>
  );
}