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
  greenDark: "#0b2f1c",
  textDark: "#111827",
  textSoft: "#4b5563",
  muted: "#6b7280",
  hairline: "#e5e7eb",
  rowAlt: "#f4f7f2",       // linhas alternadas — zebra sutil verde-tint
  border: "#e5e7eb",
  borderLight: "#eef1ec",
  white: "#ffffff",
} as const;

// ── Grid 4pt (≈1.41mm). Todos os spacings da engine devem sair daqui. ───────
export const SPACING = {
  xs: 1.5,   // ~4pt
  sm: 3,     // ~8pt
  md: 4.5,   // ~12pt
  lg: 6,     // ~16pt
  xl: 9,     // ~24pt
  xxl: 12,   // ~32pt
} as const;

// ── Dimensões reservadas por página ─────────────────────────────────────────
export const PAGE = {
  widthMm: 210,
  heightMm: 297,
  marginMm: 18,       // lateral (18mm = ritmo editorial premium)
  headerMm: 16,       // altura reservada para o header institucional
  footerMm: 14,       // altura reservada para o footer institucional
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
  issueDate?: string | null;    // "DD/MM/YYYY"
}

const hexToRgbLocal = (hex: string): [number, number, number] => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
};

export function drawInstitutionalHeader(pdf: Pdf, logo: LogoAsset | null, meta: HeaderMeta) {
  const rightX = PAGE.widthMm - PAGE.marginMm;
  const leftX = PAGE.marginMm;
  const topY = 10;

  // Logo à esquerda
  if (logo) {
    try {
      pdf.addImage(logo.dataUrl, "PNG", leftX, topY, logo.widthMm, logo.heightMm, undefined, "FAST");
    } catch { /* silent */ }
  }

  // Label + "Emitido em" à direita
  const [dr, dg, db] = hexToRgbLocal(BRAND.greenDark);
  const [sr, sg, sb] = hexToRgbLocal(BRAND.textSoft);
  const [hr, hg, hb] = hexToRgbLocal(BRAND.hairline);

  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setCharSpace(0.5);
  pdf.setTextColor(dr, dg, db);
  pdf.text(meta.label.toUpperCase(), rightX, topY + 4, { align: "right", baseline: "alphabetic" });
  pdf.setCharSpace(0);

  if (meta.issueDate) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(sr, sg, sb);
    pdf.text(`Emitido em ${meta.issueDate}`, rightX, topY + 8.5, { align: "right", baseline: "alphabetic" });
  }

  // Divisor horizontal sob o header
  pdf.setDrawColor(hr, hg, hb);
  pdf.setLineWidth(0.25);
  pdf.line(leftX, PAGE.headerMm - 1, rightX, PAGE.headerMm - 1);
}

// ── Footer institucional ────────────────────────────────────────────────────
export function drawInstitutionalFooter(pdf: Pdf, pageNumber: number, totalPages: number) {
  const rightX = PAGE.widthMm - PAGE.marginMm;
  const leftX = PAGE.marginMm;
  const dividerY = PAGE.heightMm - PAGE.footerMm + 2;
  const baselineY = PAGE.heightMm - 6;

  // Hairline suave
  const [bl_r, bl_g, bl_b] = hexToRgbLocal(BRAND.hairline);
  pdf.setDrawColor(bl_r, bl_g, bl_b);
  pdf.setLineWidth(0.2);
  pdf.line(leftX, dividerY, rightX, dividerY);

  // Footer 3 colunas: telefone à esquerda · handle ao centro · página à direita
  const [sr, sg, sb] = hexToRgbLocal(BRAND.textSoft);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7.5);
  pdf.setCharSpace(0);
  pdf.setTextColor(sr, sg, sb);
  pdf.text(NATLEVA_FOOTER.phone, leftX, baselineY, { align: "left", baseline: "alphabetic" });
  pdf.setFont("helvetica", "bold");
  pdf.text(NATLEVA_FOOTER.instagram, PAGE.widthMm / 2, baselineY, { align: "center", baseline: "alphabetic" });
  pdf.setFont("helvetica", "normal");
  if (totalPages > 1) {
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
