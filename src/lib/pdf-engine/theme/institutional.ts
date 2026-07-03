/**
 * Fonte única de verdade para dados institucionais da NatLeva usados em
 * qualquer PDF renderizado pela engine. NUNCA hardcodar esses valores em
 * componentes — sempre importar daqui.
 */
import logoNatleva from "@/assets/logo-natleva.png";
import type { Pdf } from "../index";

export const NATLEVA_FOOTER = {
  phone: "+55 (11) 96639-6692",
  instagram: "@natlevaviagens",
} as const;

/** Texto único, centralizado, exibido no rodapé de toda página. */
export const NATLEVA_FOOTER_LINE = `${NATLEVA_FOOTER.phone}   ·   ${NATLEVA_FOOTER.instagram}`;

// ── Paleta institucional (espelha ConfirmationVoucher.tsx) ──────────────────
export const BRAND = {
  green: "#1f5f3a",
  greenDark: "#0f3d24",
  textDark: "#1f2937",
  muted: "#6b7280",
  rowAlt: "#f3f5f1",
  border: "#e2e6df",
  borderLight: "#d8dfd5",
  white: "#ffffff",
} as const;

// ── Dimensões reservadas por página ─────────────────────────────────────────
export const PAGE = {
  widthMm: 210,
  heightMm: 297,
  marginMm: 14,       // lateral
  headerMm: 22,       // altura reservada para o header institucional
  footerMm: 16,       // altura reservada para o footer institucional
} as const;

// Logo asset (carregado uma vez por export)
export type LogoAsset = { dataUrl: string; widthMm: number; heightMm: number };

let cachedLogo: Promise<LogoAsset | null> | null = null;
export function loadLogoAsset(): Promise<LogoAsset | null> {
  if (cachedLogo) return cachedLogo;
  cachedLogo = (async () => {
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
      const heightMm = 9;
      const widthMm = (img.naturalWidth / img.naturalHeight) * heightMm;
      return { dataUrl, widthMm, heightMm };
    } catch {
      return null;
    }
  })();
  return cachedLogo;
}

// ── Header institucional ────────────────────────────────────────────────────
export interface HeaderMeta {
  label: string;                // "Voucher Aéreo" / "Voucher Hospedagem" / ...
  reservationCode?: string | null;
}

const hexToRgbLocal = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
};

export function drawInstitutionalHeader(pdf: Pdf, logo: LogoAsset | null, meta: HeaderMeta) {
  const rightX = PAGE.widthMm - PAGE.marginMm;
  const topY = 10;

  // Logo (identidade da marca)
  if (logo) {
    try {
      pdf.addImage(logo.dataUrl, "PNG", PAGE.marginMm, topY + 1, logo.widthMm, logo.heightMm, undefined, "FAST");
    } catch {
      /* silent */
    }
  }

  // Label do voucher — canto direito, uppercase, verde escuro
  const [dr, dg, db] = hexToRgbLocal(BRAND.greenDark);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setCharSpace(0.3);
  pdf.setTextColor(dr, dg, db);
  pdf.text(meta.label.toUpperCase(), rightX, topY + 4, { align: "right", baseline: "alphabetic" });
  pdf.setCharSpace(0);

  // Segunda linha: código de reserva (opcional)
  if (meta.reservationCode) {
    const [mr, mg, mb] = hexToRgbLocal(BRAND.muted);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(mr, mg, mb);
    pdf.text(`Reserva ${meta.reservationCode}`, rightX, topY + 9, { align: "right", baseline: "alphabetic" });
  }

  // Divisória sutil (verde da marca)
  const [gr, gg, gb] = hexToRgbLocal(BRAND.green);
  pdf.setDrawColor(gr, gg, gb);
  pdf.setLineWidth(0.35);
  pdf.line(PAGE.marginMm, topY + 12, rightX, topY + 12);
}

// ── Footer institucional ────────────────────────────────────────────────────
export function drawInstitutionalFooter(pdf: Pdf, pageNumber: number, totalPages: number) {
  const rightX = PAGE.widthMm - PAGE.marginMm;
  const dividerY = PAGE.heightMm - PAGE.footerMm + 2;
  const baselineY = PAGE.heightMm - 6;

  // Divisória
  const [bl_r, bl_g, bl_b] = hexToRgbLocal(BRAND.borderLight);
  pdf.setDrawColor(bl_r, bl_g, bl_b);
  pdf.setLineWidth(0.25);
  pdf.line(PAGE.marginMm, dividerY, rightX, dividerY);

  // Texto central (fonte única de verdade)
  const [dr, dg, db] = hexToRgbLocal(BRAND.greenDark);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setCharSpace(0);
  pdf.setTextColor(dr, dg, db);
  pdf.text(NATLEVA_FOOTER_LINE, PAGE.widthMm / 2, baselineY, { align: "center", baseline: "alphabetic" });

  // Paginação discreta à direita (só se >1 página)
  if (totalPages > 1) {
    const [mr, mg, mb] = hexToRgbLocal(BRAND.muted);
    pdf.setFontSize(7);
    pdf.setTextColor(mr, mg, mb);
    pdf.text(`${pageNumber} / ${totalPages}`, rightX, baselineY, { align: "right", baseline: "alphabetic" });
  }
}

// ── Validação pré-render ────────────────────────────────────────────────────
export function validateFooterInvariants(): string[] {
  const errors: string[] = [];
  if (!NATLEVA_FOOTER_LINE.includes("+55 (11) 96639-6692")) errors.push("footer:phone missing");
  if (!NATLEVA_FOOTER_LINE.includes("@natlevaviagens")) errors.push("footer:instagram missing");
  if (PAGE.footerMm < 10) errors.push("footer:zone too small");
  return errors;
}
