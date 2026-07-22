// Hooks para Car Rental V2 (Booking.com via RapidAPI · BETA)
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FUNCTION_NAME = "booking-rapidapi";

async function invokeCar<T = unknown>(
  action: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke(FUNCTION_NAME, {
    body: { action, ...params },
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

export interface CarLocation {
  id: string;
  name: string;
  type?: string;
  city?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  label: string;
}

function normalizeCarLocations(raw: any): CarLocation[] {
  if (!raw) return [];
  const d = raw.data ?? raw;
  const pool: any[] = Array.isArray(d)
    ? d
    : Array.isArray(d?.locations)
      ? d.locations
      : Array.isArray(d?.results)
        ? d.results
        : [];

  return pool
    .map((it: any): CarLocation | null => {
      const lat = it?.coordinates?.latitude ?? it?.latitude;
      const lng = it?.coordinates?.longitude ?? it?.longitude;
      const name = it?.name ?? it?.city ?? it?.label;
      if (!name || lat === undefined || lng === undefined) return null;
      const country = it?.country ?? it?.countryName;
      const city = it?.city ?? it?.cityName;
      return {
        id: String(it?.coordinates?.latitude ?? lat) + "_" + String(lng),
        name,
        type: it?.type,
        city,
        country,
        latitude: Number(lat),
        longitude: Number(lng),
        label: [name, city, country].filter(Boolean).join(", "),
      };
    })
    .filter((v): v is CarLocation => v !== null);
}

export function useCarLocationSearch(query: string, enabled = true) {
  const trimmed = query.trim();
  return useQuery({
    queryKey: ["booking-cars", "location", trimmed],
    enabled: enabled && trimmed.length >= 2,
    staleTime: 60 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      const envelope = await invokeCar<any>("carsSearchDestination", {
        term: trimmed,
      });
      return normalizeCarLocations(envelope);
    },
  });
}

export interface CarSearchParams {
  pickUp: CarLocation;
  dropOff: CarLocation;
  pickUpDate: string; // YYYY-MM-DD
  pickUpTime: string; // HH:MM
  dropOffDate: string;
  dropOffTime: string;
  driverAge?: number;
  currency?: string;
}

export interface CarSupplier {
  name?: string;
  logo?: string;
  rating?: number;
  reviewsCount?: number;
}

export interface CarVehicle {
  id: string;
  searchKey?: string;
  name?: string;
  category?: string;
  transmission?: string;
  fuelType?: string;
  seatCategory?: string;
  seats?: number;
  bags?: number;
  doors?: number;
  airConditioning?: boolean;
  image?: string;
  supplier?: CarSupplier;
  pricePerDay?: number;
  totalPrice?: number;
  currency?: string;
  freeCancellation?: boolean;
  pickUpAddress?: string;
  distanceFromLocation?: string;
}

function n(v: any): number | undefined {
  const x = Number(v);
  return Number.isFinite(x) ? x : undefined;
}

function parsePriceString(s?: string): { value?: number; currency?: string } {
  if (!s || typeof s !== "string") return {};
  // Ex: "$73", "R$ 1.234,50", "€1,234.50"
  const symbolMap: Record<string, string> = {
    $: "USD",
    "R$": "BRL",
    "€": "EUR",
    "£": "GBP",
  };
  let currency: string | undefined;
  for (const [sym, code] of Object.entries(symbolMap)) {
    if (s.includes(sym)) {
      currency = code;
      break;
    }
  }
  const cleaned = s.replace(/[^0-9.,]/g, "");
  if (!cleaned) return { currency };
  // If both . and , present, assume the last one is decimal separator
  let num: number;
  if (cleaned.includes(",") && cleaned.includes(".")) {
    const lastDot = cleaned.lastIndexOf(".");
    const lastComma = cleaned.lastIndexOf(",");
    if (lastComma > lastDot) {
      num = Number(cleaned.replace(/\./g, "").replace(",", "."));
    } else {
      num = Number(cleaned.replace(/,/g, ""));
    }
  } else if (cleaned.includes(",")) {
    // 1,234 → treat as thousands if 3 digits after; else decimal
    const parts = cleaned.split(",");
    num = parts[parts.length - 1].length === 3
      ? Number(cleaned.replace(/,/g, ""))
      : Number(cleaned.replace(",", "."));
  } else {
    num = Number(cleaned);
  }
  return { value: Number.isFinite(num) ? num : undefined, currency };
}

function normalizeCarSearch(raw: any): {
  vehicles: CarVehicle[];
  searchKey?: string;
  totalCount?: number;
  cache_hit?: boolean;
} {
  const d = raw?.data ?? raw ?? {};
  const searchKey =
    d?.search_key ?? d?.searchKey ?? raw?.search_key ?? raw?.searchKey;

  // Booking-com15 V2 novo shape: content.items[type=CAR_CARD]
  const contentItems: any[] = Array.isArray(d?.content?.items) ? d.content.items : [];
  const carCards = contentItems.filter((i) => i?.type === "CAR_CARD");

  // Legacy shapes (fallback defensivo)
  const legacyList: any[] = Array.isArray(d?.search_results)
    ? d.search_results
    : Array.isArray(d?.vehicles)
      ? d.vehicles
      : Array.isArray(d?.results)
        ? d.results
        : [];

  const list = carCards.length > 0 ? carCards : legacyList;

  const vehicles = list.map((it: any): CarVehicle => {
    // Novo shape (CAR_CARD): dados sob it.content
    const c = it?.content ?? it;
    const isNew = it?.type === "CAR_CARD";
    const v = c?.vehicle_info ?? c?.vehicle ?? c;
    const p = c?.pricing_info ?? c?.pricing ?? c?.price ?? {};
    const s = c?.supplier_info ?? c?.supplier ?? {};
    const r = c?.rating_info ?? s?.rating ?? {};

    // Vehicle id
    const vehicleId =
      c?.metadata?.vehicleId ?? it?.vehicle_id ?? v?.id ?? crypto.randomUUID();

    // Specs (ex: "5 seats | 4 doors")
    let seats: number | undefined;
    let doors: number | undefined;
    if (typeof c?.specs === "string") {
      const seatMatch = c.specs.match(/(\d+)\s*seat/i);
      const doorMatch = c.specs.match(/(\d+)\s*door/i);
      if (seatMatch) seats = Number(seatMatch[1]);
      if (doorMatch) doors = Number(doorMatch[1]);
    }
    if (seats === undefined) seats = n(v?.seats);
    if (doors === undefined) doors = n(v?.doors);

    // Transmission via vehicleSpecs icon
    let transmission: string | undefined;
    let fuelType: string | undefined;
    let seatCategory: string | undefined;
    if (Array.isArray(c?.vehicleSpecs)) {
      for (const x of c.vehicleSpecs) {
        const icon = String(x?.icon ?? "");
        const text = x?.text ?? x?.accessibility;
        if (!text) continue;
        if (icon.startsWith("TRANSMISSION_") && !transmission) transmission = text;
        else if ((icon.startsWith("FUEL_") || icon.includes("FUEL")) && !fuelType) fuelType = text;
        else if ((icon.startsWith("PASSENGERS_") || icon.startsWith("SEAT")) && !seatCategory) seatCategory = text;
      }
    }
    if (!transmission) transmission = v?.transmission;
    if (!fuelType) fuelType = v?.fuel_type ?? v?.fuelType;

    // Free cancellation via badges
    let freeCancellation = false;
    if (Array.isArray(c?.badges)) {
      freeCancellation = c.badges.some((b: any) =>
        String(b?.id ?? "").includes("free-cancellation") ||
        /free\s*cancellation/i.test(String(b?.text ?? "")),
      );
    }
    if (!freeCancellation) {
      freeCancellation = Boolean(
        it?.freebies?.free_cancellation ?? p?.free_cancellation,
      );
    }

    // Pricing
    const priceStr =
      c?.pricing?.finalPriceDisplay ?? c?.pricing?.finalPrice ?? undefined;
    const parsedPrice = parsePriceString(priceStr);
    const totalPrice = parsedPrice.value ?? n(p?.drive_away_price ?? p?.price ?? p?.total);
    const currency =
      parsedPrice.currency ?? p?.currency ?? p?.base_currency ?? "BRL";

    return {
      id: String(vehicleId),
      searchKey: it?.search_key ?? searchKey,
      name: isNew ? c?.title : (v?.v_name ?? v?.name ?? v?.group),
      category: isNew ? c?.subtitle : (v?.group ?? v?.car_class ?? v?.category),
      transmission,
      fuelType,
      seatCategory,
      seats,
      bags: n(v?.suitcases?.big ?? v?.baggage ?? v?.bags),
      doors,
      airConditioning: Boolean(v?.airconditioning ?? v?.air_conditioning),
      image: isNew
        ? c?.imageUrl
        : (v?.image_url ?? v?.image ?? v?.pictureUrl),
      supplier: {
        name: s?.name,
        logo: s?.logoUrl ?? s?.logo_url ?? s?.logo,
        rating: n(r?.score ?? r?.average ?? s?.rating),
        reviewsCount: (() => {
          const txt = r?.reviewCountText;
          if (typeof txt === "string") {
            const m = txt.match(/(\d[\d.,]*)/);
            if (m) return Number(m[1].replace(/[.,]/g, ""));
          }
          return n(r?.no_of_ratings ?? s?.reviewsCount);
        })(),
      },
      pricePerDay: n(p?.price_per_day ?? p?.dailyPrice),
      totalPrice,
      currency,
      freeCancellation,
      pickUpAddress:
        c?.location?.pickup?.location ??
        it?.route_info?.pickup?.address ??
        it?.pickup?.address,
      distanceFromLocation:
        c?.location?.pickup?.detail ??
        it?.route_info?.pickup?.distance ??
        it?.pickup?.distance,
    };
  });

  // Total: prefere "1047 results" do RESULTS_COUNT
  let totalCount: number | undefined = d?.count ?? d?.totalCount;
  if (!totalCount || totalCount === 0) {
    const rc = contentItems.find((i) => i?.type === "RESULTS_COUNT");
    const label = rc?.content?.label;
    if (typeof label === "string") {
      const m = label.match(/(\d[\d.,]*)/);
      if (m) totalCount = Number(m[1].replace(/[.,]/g, ""));
    }
  }
  if (!totalCount) totalCount = vehicles.length;

  return {
    vehicles,
    searchKey: searchKey ? String(searchKey) : undefined,
    totalCount,
    cache_hit: raw?.__cache === true,
  };
}

export function useSearchCarRentals(
  params: CarSearchParams | null,
  enabled = true,
) {
  return useQuery({
    queryKey: [
      "booking-cars",
      "search",
      params
        ? {
            pu: params.pickUp.id,
            do: params.dropOff.id,
            pud: params.pickUpDate,
            put: params.pickUpTime,
            dod: params.dropOffDate,
            dot: params.dropOffTime,
            age: params.driverAge,
          }
        : null,
    ],
    enabled:
      enabled &&
      !!params?.pickUp?.latitude &&
      !!params?.dropOff?.latitude &&
      !!params?.pickUpDate &&
      !!params?.dropOffDate,
    staleTime: 20 * 60 * 1000,
    retry: false,
    queryFn: async () => {
      if (!params) throw new Error("Params inválidos");
      const envelope = await invokeCar<any>("searchCarRentals", {
        pick_up_latitude: params.pickUp.latitude,
        pick_up_longitude: params.pickUp.longitude,
        drop_off_latitude: params.dropOff.latitude,
        drop_off_longitude: params.dropOff.longitude,
        pick_up_date: params.pickUpDate,
        pick_up_time: params.pickUpTime,
        drop_off_date: params.dropOffDate,
        drop_off_time: params.dropOffTime,
        driver_age: params.driverAge ?? 30,
        currency_code: params.currency ?? "BRL",
      });
      return normalizeCarSearch(envelope);
    },
  });
}
