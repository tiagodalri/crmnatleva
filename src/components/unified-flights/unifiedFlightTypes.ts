// Tipos e normalizadores do buscador de aéreo unificado.
// Junta resultados de Google Flights (DataCrawler) + Booking.com (RapidAPI)
// num shape comum, preservando o objeto original em `raw` sem perda.

import { parseDcDateTime, formatBRL } from "@/components/google-flights/gflightsTypes";
import { moneyToNumber } from "@/components/booking-rapidapi/flightTypes";
import type { GFlightItinerary } from "@/components/google-flights/gflightsTypes";
import type { FlightOffer } from "@/components/booking-rapidapi/flightTypes";

export type FlightSource = "google" | "booking";

export interface UnifiedFlightOffer {
  id: string;
  source: FlightSource;
  price: number | null;               // numérico, na moeda `currency`
  currency: string;
  duration_min: number | null;
  stops: number;
  departure_time: Date | null;
  arrival_time: Date | null;
  departure_iata: string | null;
  arrival_iata: string | null;
  airline_names: string[];
  airline_logo: string | null;
  cabin: string | null;
  raw_google?: GFlightItinerary;
  raw_booking?: FlightOffer;
}

// -------- Filtros unificados (comuns às duas fontes) --------

export interface UnifiedFlightFilters {
  priceMin: number;     // 0 = sem limite mínimo
  priceMax: number;     // 0 = sem limite máximo
  stops: Array<0 | 1 | 2>; // 2 = 2+
  airlines: string[];   // vazio = todas
  depHourFrom: number;
  depHourTo: number;
  arrHourFrom: number;
  arrHourTo: number;
  durationMaxMin: number; // 0 = sem limite
  sources: FlightSource[]; // fontes ativas
  sortBy: "price_asc" | "duration_asc" | "departure_asc";
}

export const DEFAULT_UNIFIED_FILTERS: UnifiedFlightFilters = {
  priceMin: 0,
  priceMax: 0,
  stops: [0, 1, 2],
  airlines: [],
  depHourFrom: 0,
  depHourTo: 24,
  arrHourFrom: 0,
  arrHourTo: 24,
  durationMaxMin: 0,
  sources: ["google", "booking"],
  sortBy: "price_asc",
};

// -------- Normalizadores --------

function parseGoogleTime(s?: string): Date | null {
  if (!s) return null;
  const p = parseDcDateTime(s);
  if (p) return p.date;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function normalizeGoogleItinerary(it: GFlightItinerary, idx: number): UnifiedFlightOffer {
  const flights = it.flights ?? [];
  const first = flights[0];
  const last = flights[flights.length - 1];
  const airlines = Array.from(
    new Set(flights.map((f) => f.airline).filter((x): x is string => !!x)),
  );
  const stops =
    typeof it.stops === "number"
      ? it.stops
      : Math.max(0, flights.length - 1);
  return {
    id: `g-${it.booking_token || it.departure_token || idx}`,
    source: "google",
    price: typeof it.price === "number" ? it.price : null,
    currency: "BRL",
    duration_min: typeof it.total_duration === "number" ? it.total_duration : null,
    stops,
    departure_time: parseGoogleTime(first?.departure_airport?.time),
    arrival_time: parseGoogleTime(last?.arrival_airport?.time),
    departure_iata: first?.departure_airport?.id ?? null,
    arrival_iata: last?.arrival_airport?.id ?? null,
    airline_names: airlines,
    airline_logo: it.airline_logo ?? first?.airline_logo ?? null,
    cabin: first?.travel_class ?? null,
    raw_google: it,
  };
}

function parseBookingTime(s?: string): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function normalizeBookingOffer(o: FlightOffer, idx: number): UnifiedFlightOffer {
  const segments = o.segments ?? [];
  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];
  const priceNum = moneyToNumber(o.priceBreakdown?.total ?? null);
  const currency = o.priceBreakdown?.total?.currencyCode ?? "BRL";
  const totalSec = segments.reduce(
    (sum, s) => sum + (typeof s.totalTime === "number" ? s.totalTime : 0),
    0,
  );
  // Paradas = escalas dentro de todos os segmentos (para one-way = 1 segmento;
  // para round-trip continuamos somando escalas totais da jornada).
  const stops = segments.reduce(
    (sum, s) => sum + Math.max(0, (s.legs?.length ?? 1) - 1),
    0,
  );
  const airlineSet = new Set<string>();
  let logo: string | null = null;
  for (const seg of segments) {
    for (const leg of seg.legs ?? []) {
      for (const c of leg.carriersData ?? []) {
        if (c.name) airlineSet.add(c.name);
        if (!logo && c.logo) logo = c.logo;
      }
    }
  }
  return {
    id: `b-${o.token || idx}`,
    source: "booking",
    price: priceNum,
    currency,
    duration_min: totalSec > 0 ? Math.round(totalSec / 60) : null,
    stops,
    departure_time: parseBookingTime(firstSeg?.departureTime),
    arrival_time: parseBookingTime(lastSeg?.arrivalTime),
    departure_iata: firstSeg?.departureAirport?.code ?? null,
    arrival_iata: lastSeg?.arrivalAirport?.code ?? null,
    airline_names: Array.from(airlineSet),
    airline_logo: logo,
    cabin: o.brandedFareInfo?.cabinClass ?? firstSeg?.legs?.[0]?.cabinClass ?? null,
    raw_booking: o,
  };
}

// -------- Helpers de filtro/ordenação --------

export function applyUnifiedFilters(
  offers: UnifiedFlightOffer[],
  f: UnifiedFlightFilters,
): UnifiedFlightOffer[] {
  const out = offers.filter((o) => {
    if (!f.sources.includes(o.source)) return false;
    if (typeof o.price === "number") {
      if (f.priceMin > 0 && o.price < f.priceMin) return false;
      if (f.priceMax > 0 && o.price > f.priceMax) return false;
    }
    // Paradas
    const bucket = o.stops >= 2 ? 2 : (o.stops as 0 | 1);
    if (!f.stops.includes(bucket)) return false;
    // Companhias
    if (f.airlines.length > 0) {
      const hit = o.airline_names.some((a) => f.airlines.includes(a));
      if (!hit) return false;
    }
    // Horário de saída
    if (o.departure_time) {
      const h = o.departure_time.getHours();
      if (h < f.depHourFrom || h >= f.depHourTo) return false;
    }
    // Horário de chegada
    if (o.arrival_time) {
      const h = o.arrival_time.getHours();
      if (h < f.arrHourFrom || h >= f.arrHourTo) return false;
    }
    // Duração
    if (f.durationMaxMin > 0 && typeof o.duration_min === "number" && o.duration_min > f.durationMaxMin) {
      return false;
    }
    return true;
  });

  out.sort((a, b) => {
    switch (f.sortBy) {
      case "duration_asc":
        return (a.duration_min ?? Infinity) - (b.duration_min ?? Infinity);
      case "departure_asc":
        return (a.departure_time?.getTime() ?? Infinity) - (b.departure_time?.getTime() ?? Infinity);
      case "price_asc":
      default:
        return (a.price ?? Infinity) - (b.price ?? Infinity);
    }
  });
  return out;
}

export function computeHighlightIds(offers: UnifiedFlightOffer[]) {
  let cheapest: UnifiedFlightOffer | null = null;
  let fastest: UnifiedFlightOffer | null = null;
  for (const o of offers) {
    if (typeof o.price === "number") {
      if (!cheapest || (typeof cheapest.price === "number" && o.price < cheapest.price)) {
        cheapest = o;
      }
    }
    if (typeof o.duration_min === "number") {
      if (!fastest || (typeof fastest.duration_min === "number" && o.duration_min < fastest.duration_min)) {
        fastest = o;
      }
    }
  }
  // Melhor · heurística simples · preço normalizado + duração normalizada
  let best: UnifiedFlightOffer | null = null;
  const prices = offers.map((o) => o.price).filter((x): x is number => typeof x === "number");
  const durs = offers.map((o) => o.duration_min).filter((x): x is number => typeof x === "number");
  if (prices.length && durs.length) {
    const minP = Math.min(...prices);
    const maxP = Math.max(...prices);
    const minD = Math.min(...durs);
    const maxD = Math.max(...durs);
    let bestScore = Infinity;
    for (const o of offers) {
      if (typeof o.price !== "number" || typeof o.duration_min !== "number") continue;
      const np = maxP > minP ? (o.price - minP) / (maxP - minP) : 0;
      const nd = maxD > minD ? (o.duration_min - minD) / (maxD - minD) : 0;
      const score = np * 0.6 + nd * 0.4;
      if (score < bestScore) {
        bestScore = score;
        best = o;
      }
    }
  }
  return {
    bestId: best?.id ?? null,
    cheapestId: cheapest?.id ?? null,
    fastestId: fastest?.id ?? null,
  };
}

export function formatPrice(o: UnifiedFlightOffer): string {
  if (typeof o.price !== "number") return "—";
  if (o.currency === "BRL") return formatBRL(o.price);
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: o.currency,
      maximumFractionDigits: 0,
    }).format(o.price);
  } catch {
    return `${o.currency} ${Math.round(o.price)}`;
  }
}

export function formatDurationMin(min: number | null): string {
  if (!min || min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

export function formatHHMM(d: Date | null): string {
  if (!d) return "—";
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
}

export function dayOffset(from: Date | null, to: Date | null): number {
  if (!from || !to) return 0;
  const a = new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime();
  const b = new Date(to.getFullYear(), to.getMonth(), to.getDate()).getTime();
  return Math.round((b - a) / 86400000);
}
