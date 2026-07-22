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
        query: trimmed,
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

function normalizeCarSearch(raw: any): {
  vehicles: CarVehicle[];
  searchKey?: string;
  totalCount?: number;
  cache_hit?: boolean;
} {
  const d = raw?.data ?? raw ?? {};
  const searchKey =
    d?.search_key ?? d?.searchKey ?? raw?.search_key ?? raw?.searchKey;
  const list: any[] = Array.isArray(d?.search_results)
    ? d.search_results
    : Array.isArray(d?.vehicles)
      ? d.vehicles
      : Array.isArray(d?.results)
        ? d.results
        : [];

  const vehicles = list.map((it: any): CarVehicle => {
    const v = it?.vehicle_info ?? it?.vehicle ?? it;
    const p = it?.pricing_info ?? it?.price ?? {};
    const s = it?.supplier_info ?? it?.supplier ?? {};
    const r = it?.rating_info ?? {};
    return {
      id: String(it?.vehicle_id ?? v?.id ?? crypto.randomUUID()),
      searchKey: it?.search_key ?? searchKey,
      name: v?.v_name ?? v?.name ?? v?.group,
      category: v?.group ?? v?.car_class ?? v?.category,
      transmission: v?.transmission,
      seats: n(v?.seats),
      bags: n(v?.suitcases?.big ?? v?.baggage ?? v?.bags),
      doors: n(v?.doors),
      airConditioning: Boolean(v?.airconditioning ?? v?.air_conditioning),
      image: v?.image_url ?? v?.image ?? v?.pictureUrl,
      supplier: {
        name: s?.name,
        logo: s?.logo_url ?? s?.logo,
        rating: n(r?.average ?? s?.rating),
        reviewsCount: n(r?.no_of_ratings ?? s?.reviewsCount),
      },
      pricePerDay: n(p?.price_per_day ?? p?.dailyPrice),
      totalPrice: n(p?.drive_away_price ?? p?.price ?? p?.total),
      currency: p?.currency ?? p?.base_currency ?? "BRL",
      freeCancellation: Boolean(
        it?.freebies?.free_cancellation ?? p?.free_cancellation,
      ),
      pickUpAddress: it?.route_info?.pickup?.address ?? it?.pickup?.address,
      distanceFromLocation:
        it?.route_info?.pickup?.distance ?? it?.pickup?.distance,
    };
  });

  return {
    vehicles,
    searchKey: searchKey ? String(searchKey) : undefined,
    totalCount: d?.count ?? d?.totalCount ?? vehicles.length,
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
