// Hooks para Attractions/Ingressos (Booking.com via RapidAPI · BETA)
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  AttractionDetails,
  AttractionLocation,
  AttractionProduct,
  AttractionReview,
  AttractionSearchResult,
} from "@/components/booking-rapidapi/attractionTypes";

const FUNCTION_NAME = "booking-rapidapi";

async function invokeAttraction<T = unknown>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  // Strip undefined/null/empty-string fields so we never send `id: undefined`
  const cleanParams: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null || v === "") continue;
    cleanParams[k] = v;
  }
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action, ...cleanParams },
  });
  if (error) throw new Error(error.message || "Erro desconhecido");
  if (data?.error) {
    const details =
      typeof data.details === "object"
        ? JSON.stringify(data.details)
        : data.details ?? "";
    throw new Error(`${data.error}${details ? ` · ${details}` : ""}`);
  }
  return data as T;
}


/**
 * Normaliza a resposta variável do endpoint searchLocation em uma lista plana.
 * A API às vezes retorna { data: { destinations: [], products: [] } } ou array direto.
 */
function normalizeLocations(raw: any): AttractionLocation[] {
  if (!raw) return [];
  const d = raw.data ?? raw;
  const pool: any[] = Array.isArray(d)
    ? d
    : Array.isArray(d?.products)
      ? d.products
      : Array.isArray(d?.destinations)
        ? d.destinations
        : Array.isArray(d?.results)
          ? d.results
          : [];

  const mapped = pool
    .map((it: any): AttractionLocation | null => {
      const id = it?.id ?? it?.destId ?? it?.cityUfi ?? it?.ufi;
      if (id === undefined || id === null) return null;
      const cityName =
        it?.cityName ?? it?.name ?? it?.b_name ?? it?.label ?? it?.title;
      const country =
        it?.country ?? it?.countryName ?? it?.cc1 ?? it?.countryCode;
      const label = [cityName, country].filter(Boolean).join(", ") || String(id);
      return {
        id: String(id),
        cityUfi: it?.cityUfi ?? it?.ufi,
        cityName,
        country,
        productCount: it?.productCount ?? it?.nrHotels ?? it?.count,
        productType: it?.productType ?? it?.type ?? it?.destType ?? it?.taxonomySlug,
        label,
      };
    })
    .filter((v): v is AttractionLocation => v !== null);

  // Dedup por cityUfi (a API costuma devolver 10 sugestões de produto pra mesma cidade)
  const seen = new Set<string>();
  const deduped: AttractionLocation[] = [];
  for (const item of mapped) {
    const key = item.cityUfi ? String(item.cityUfi) : item.id;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }
  return deduped;
}

export function useAttractionLocationSearch(query: string, enabled = true) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["booking-attractions", "location", trimmed],
    enabled: enabled && trimmed.length >= 2,
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const envelope = await invokeAttraction<any>("searchAttractionLocation", {
        query: trimmed,
      });
      return normalizeLocations(envelope);
    },
  });
}

function normalizeSearch(raw: any): AttractionSearchResult {
  const d = raw?.data ?? raw ?? {};
  const products: any[] = Array.isArray(d?.products)
    ? d.products
    : Array.isArray(d?.searchProducts)
      ? d.searchProducts
      : Array.isArray(d?.results)
        ? d.results
        : Array.isArray(d)
          ? d
          : [];
  return {
    products: products.map((p: any): AttractionProduct => ({
      id: String(p?.id ?? p?.productId ?? p?.slug ?? crypto.randomUUID()),
      slug: p?.slug ?? p?.productSlug,
      name: p?.name ?? p?.title ?? p?.productName,
      shortDescription: p?.shortDescription ?? p?.description,
      primaryPhoto: p?.primaryPhoto ?? p?.photo ?? p?.image,
      reviewsStats: p?.reviewsStats ?? p?.reviews,
      representativePrice: p?.representativePrice ?? p?.price ?? p?.priceInfo,
      taxonomySlug: p?.taxonomySlug ?? p?.category,
      ufiDetails: p?.ufiDetails,
      cancellationPolicy: p?.cancellationPolicy,
      typicalDurationFormatted:
        p?.typicalDurationFormatted ?? p?.duration ?? p?.durationText,
      isBookable: p?.isBookable,
    })),
    totalCount: d?.pagination?.totalCount ?? d?.totalCount ?? products.length,
    cache_hit: raw?.__cache === true,
  };
}

export interface AttractionSearchParams {
  id: string;
  page?: number;
  sortBy?: string;
  startDate?: string;
  endDate?: string;
  currency_code?: string;
  languagecode?: string;
}

export function useSearchAttractions(
  params: AttractionSearchParams | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["booking-attractions", "search", params],
    enabled: enabled && !!params?.id,
    staleTime: 30 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      if (!params) throw new Error("Params inválidos");
      const envelope = await invokeAttraction<any>("searchAttractions", {
        id: params.id,
        sortBy: params.sortBy ?? "trending",
        page: params.page ?? 1,
        startDate: params.startDate,
        endDate: params.endDate,
        currency_code: params.currency_code ?? "BRL",
        languagecode: params.languagecode ?? "pt-br",
      });
      return normalizeSearch(envelope);
    },
  });
}

export function useAttractionDetails(slug: string | null, enabled = true) {
  return useQuery({
    queryKey: ["booking-attractions", "details", slug],
    enabled: enabled && !!slug,
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const envelope = await invokeAttraction<any>("getAttractionDetails", {
        slug,
      });
      const d = envelope?.data ?? envelope;
      return (d ?? null) as AttractionDetails | null;
    },
  });
}

export function useAttractionReviews(id: string | null, enabled = true) {
  return useQuery({
    queryKey: ["booking-attractions", "reviews", id],
    enabled: enabled && !!id,
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const envelope = await invokeAttraction<any>("getAttractionReviews", {
        id,
      });
      const d = envelope?.data ?? envelope ?? {};
      const list: any[] = Array.isArray(d?.reviews)
        ? d.reviews
        : Array.isArray(d?.items)
          ? d.items
          : Array.isArray(d)
            ? d
            : [];
      return list as AttractionReview[];
    },
  });
}

export function useAttractionAvailabilityCalendar(
  id: string | null,
  enabled = true,
) {
  const safeId = typeof id === "string" && id.trim().length > 0 ? id : null;
  return useQuery({
    queryKey: ["booking-attractions", "calendar", safeId],
    enabled: enabled && !!safeId,
    staleTime: 30 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const envelope = await invokeAttraction<any>(
        "getAttractionAvailabilityCalendar",
        { id: safeId },
      );

      const d = envelope?.data ?? envelope ?? {};
      const days: any[] = Array.isArray(d?.days)
        ? d.days
        : Array.isArray(d?.calendar)
          ? d.calendar
          : Array.isArray(d)
            ? d
            : [];
      return days.map((x: any) => ({
        date: String(x?.date ?? ""),
        available: x?.available !== false,
        price: x?.price,
      }));
    },
  });
}

// -------- Availability por dia (horários + preços) --------
export interface AttractionTicketItem {
  id?: string;
  label?: string;
  price?: {
    chargeAmount?: number;
    publicAmount?: number;
    currency?: string;
  };
  constraint?: { label?: string; type?: string };
  ticketsAvailable?: number;
  minPerReservation?: number;
  maxPerReservation?: number;
  cancellationPolicy?: {
    hasFreeCancellation?: boolean;
    percentage?: number;
    period?: string;
  };
}

export interface AttractionTimeSlotOffer {
  id?: string;
  benefits?: Record<string, boolean | undefined>;
  languageOptions?: Array<{ label?: string; language?: string; type?: string }>;
  items?: AttractionTicketItem[];
  reservationRestrictions?: {
    adultRequiredForReservation?: boolean;
    minOfferItemsPerReservation?: number;
    maxOfferItemsPerReservation?: number;
  };
}

export interface AttractionAvailabilitySlot {
  fullDay?: boolean;
  start?: string;
  timeSlotId?: string;
  timeSlotOffers?: AttractionTimeSlotOffer[];
}

export function useAttractionAvailability(
  slug: string | null,
  date: string | null,
  enabled = true,
) {
  return useQuery({
    queryKey: ["booking-attractions", "availability", slug, date],
    enabled: enabled && !!slug && !!date,
    staleTime: 15 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const envelope = await invokeAttraction<any>(
        "getAttractionAvailability",
        { slug, date },
      );
      const d = envelope?.data ?? envelope ?? [];
      const list: any[] = Array.isArray(d) ? d : Array.isArray(d?.slots) ? d.slots : [];
      return list as AttractionAvailabilitySlot[];
    },
  });
}
