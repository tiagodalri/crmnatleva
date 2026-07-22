// Tipos para o módulo Attractions/Ingressos (Booking.com via RapidAPI · BETA)
// Isolado do restante do sistema · defensivo, todos os campos opcionais.

export interface AttractionLocation {
  id: string;
  cityUfi?: number | string;
  cityName?: string;
  country?: string;
  productCount?: number;
  /** rótulo já formatado pela API, ex: "Orlando, Estados Unidos" */
  label?: string;
  /** tipo de destino (city / attraction / etc) */
  productType?: string;
}

export interface AttractionMoney {
  chargeAmount?: number;
  publicAmount?: number;
  currency?: string;
}

export interface AttractionRepresentativePrice {
  chargeAmount?: number;
  publicAmount?: number;
  currency?: string;
}

export interface AttractionReviewStats {
  combinedNumericStats?: { average?: number; total?: number };
  allReviewsCount?: number;
  percentage?: number;
}

export interface AttractionCancellationPolicy {
  hasFreeCancellation?: boolean;
}

export interface AttractionProduct {
  id: string;
  slug?: string;
  name?: string;
  shortDescription?: string;
  primaryPhoto?: { small?: string; medium?: string; large?: string };
  reviewsStats?: AttractionReviewStats;
  representativePrice?: AttractionRepresentativePrice;
  taxonomySlug?: string;
  ufiDetails?: { bCityName?: string; url?: { country?: string; city?: string } };
  cancellationPolicy?: AttractionCancellationPolicy;
  /** duração humana, ex: "2 horas" */
  typicalDurationFormatted?: string;
  /** flags variadas */
  isBookable?: boolean;
  [key: string]: unknown;
}

export interface AttractionSearchResult {
  products: AttractionProduct[];
  totalCount?: number;
  page?: number;
  cache_hit?: boolean;
}

export interface AttractionDetails {
  id?: string;
  slug?: string;
  name?: string;
  description?: string;
  shortDescription?: string;
  photos?: Array<{ small?: string; medium?: string; large?: string; url?: string }>;
  reviewsStats?: AttractionReviewStats;
  representativePrice?: AttractionRepresentativePrice;
  ufiDetails?: { bCityName?: string };
  typicalDurationFormatted?: string;
  cancellationPolicy?: AttractionCancellationPolicy;
  whatsIncluded?: string[];
  notSuitableFor?: string[];
  languages?: string[];
  meetingPoint?: { address?: string; description?: string };
  location?: { latitude?: number; longitude?: number; address?: string };
  faqs?: Array<{ question?: string; answer?: string }>;
  [key: string]: unknown;
}

export interface AttractionAvailabilityCalendarDay {
  date: string; // YYYY-MM-DD
  available?: boolean;
  price?: AttractionRepresentativePrice;
}

export interface AttractionReview {
  id?: string | number;
  author?: { name?: string; countryCode?: string };
  content?: string;
  numericRating?: number;
  submittedAt?: string;
  [key: string]: unknown;
}

/**
 * Formata preço em BRL (ou moeda passada). Retorna "" se sem valor.
 */
export function formatAttractionPrice(
  price: AttractionRepresentativePrice | AttractionMoney | undefined,
): string {
  if (!price) return "";
  const amount = price.publicAmount ?? price.chargeAmount;
  const currency = price.currency ?? "BRL";
  if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) return "";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(0)}`;
  }
}
