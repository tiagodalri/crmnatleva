// Hook que combina Google Flights + Booking.com numa busca só.
// Cada fonte é chamada por seu hook original (mantidos intactos) e
// consolidada em UnifiedFlightOffer[] por essa camada de agregação.
//
// Cada fonte roda de forma independente via react-query · são
// disparadas em paralelo automaticamente e o consumidor recebe as duas
// respostas simultaneamente. Se uma falhar, a outra segue funcionando
// (a UI usa `googleError`/`bookingError` pra sinalizar de forma não-bloqueante).

import { useMemo } from "react";
import { useSearchGFlights, type SearchGFlightsInput } from "@/hooks/useGoogleFlights";
import { useSearchFlights, type SearchFlightsInput } from "@/hooks/useBookingRapidApi";
import {
  normalizeGoogleItinerary,
  normalizeBookingOffer,
  type UnifiedFlightOffer,
} from "@/components/unified-flights/unifiedFlightTypes";
import type { GPriceInsight } from "@/components/google-flights/gflightsTypes";

export interface UnifiedSearchInput {
  fromIata: string;
  toIata: string;
  outboundDate: string; // YYYY-MM-DD
  returnDate?: string;
  adults: number;
  cabin: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
}

export interface UnifiedSearchResult {
  offers: UnifiedFlightOffer[];
  googleCount: number;
  bookingCount: number;
  isLoading: boolean;                // true se ALGUMA fonte está carregando
  isAllLoading: boolean;             // true se AS DUAS estão carregando
  googleLoading: boolean;
  bookingLoading: boolean;
  googleError: Error | null;
  bookingError: Error | null;
  hasAny: boolean;
  refetchGoogle: () => void;
  refetchBooking: () => void;
}

export function useUnifiedFlightSearch(
  input: UnifiedSearchInput | null,
  enabled: boolean = true,
): UnifiedSearchResult {
  const gInput: SearchGFlightsInput | null = input
    ? {
        departure_id: input.fromIata,
        arrival_id: input.toIata,
        outbound_date: input.outboundDate,
        return_date: input.returnDate,
        adults: input.adults,
        travel_class: input.cabin,
        currency: "BRL",
        trip_type: input.returnDate ? "1" : "2",
      }
    : null;

  const bInput: SearchFlightsInput | null = input
    ? {
        fromId: `${input.fromIata}.AIRPORT`,
        toId: `${input.toIata}.AIRPORT`,
        departDate: input.outboundDate,
        returnDate: input.returnDate,
        adults: input.adults,
        cabinClass: input.cabin,
        sort: "BEST",
        pageNo: 1,
        currency_code: "BRL",
      }
    : null;

  const google = useSearchGFlights(gInput, enabled);
  const booking = useSearchFlights(bInput, enabled);

  const offers = useMemo<UnifiedFlightOffer[]>(() => {
    const out: UnifiedFlightOffer[] = [];
    if (google.data) {
      const best = google.data.best_flights ?? [];
      const other = google.data.other_flights ?? [];
      let i = 0;
      for (const it of best) out.push(normalizeGoogleItinerary(it, i++));
      for (const it of other) out.push(normalizeGoogleItinerary(it, i++));
    }
    if (booking.data?.offers) {
      let i = 0;
      for (const of of booking.data.offers) out.push(normalizeBookingOffer(of, i++));
    }
    return out;
  }, [google.data, booking.data]);

  return {
    offers,
    googleCount: (google.data?.best_flights?.length ?? 0) + (google.data?.other_flights?.length ?? 0),
    bookingCount: booking.data?.offers?.length ?? 0,
    isLoading: google.isLoading || booking.isLoading,
    isAllLoading: google.isLoading && booking.isLoading,
    googleLoading: google.isLoading,
    bookingLoading: booking.isLoading,
    googleError: google.isError ? (google.error as Error) : null,
    bookingError: booking.isError ? (booking.error as Error) : null,
    hasAny: offers.length > 0,
    refetchGoogle: () => { void google.refetch(); },
    refetchBooking: () => { void booking.refetch(); },
  };
}
