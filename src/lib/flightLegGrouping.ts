import { assignDirections, classifyItinerary, type FlightSegmentInput, type ItineraryType } from "@/lib/itineraryClassifier";
import { calcLayoverMinutes } from "@/lib/flightTiming";

export interface FlightLegLike {
  origin_iata?: string | null;
  destination_iata?: string | null;
  departure_date?: string | null;
  departure_time?: string | null;
  arrival_date?: string | null;
  arrival_time?: string | null;
  duration_minutes?: number | null;
  direction?: string | null;
  is_leg_start?: boolean | null;
  [key: string]: any;
}

export interface FlightLegGroup<T extends FlightLegLike> {
  label: string;
  direction: string;
  segments: T[];
}

const MAX_CONNECTION_MINUTES = 24 * 60;

function isPlausibleConnection<T extends FlightLegLike>(prev: T, next: T): boolean {
  // Mesmo aeroporto de conexão é obrigatório.
  const prevDest = (prev?.destination_iata || "").toUpperCase();
  const nextOrigin = (next?.origin_iata || "").toUpperCase();
  if (!prevDest || prevDest !== nextOrigin) return false;

  const layover = calcLayoverMinutes(prev, next);
  if (layover !== null) {
    // Só é conexão se o layover for realista (não negativo e ≤ 24h).
    return layover >= 0 && layover <= MAX_CONNECTION_MINUTES;
  }

  // Sem dados suficientes para calcular layover: só considera conexão
  // se ao menos a data de partida for a mesma (fallback conservador).
  const prevDate = (prev?.departure_date || "").slice(0, 10);
  const nextDate = (next?.departure_date || "").slice(0, 10);
  return Boolean(prevDate) && prevDate === nextDate;
}

function isForcedRoundTripSplit<T extends FlightLegLike>(segments: T[]): boolean {
  if (segments.length !== 4) return false;

  const [first, second, third, fourth] = segments;
  const shapeMatches = Boolean(
    first?.origin_iata &&
    second?.destination_iata &&
    third?.origin_iata &&
    fourth?.destination_iata &&
    first.origin_iata.toUpperCase() === fourth.destination_iata.toUpperCase() &&
    second.destination_iata.toUpperCase() === third.origin_iata.toUpperCase(),
  );
  if (!shapeMatches) return false;

  // CRÍTICO: só força round-trip com conexão se as duas "conexões" (ida
  // e volta) forem realmente conexões — layover curto e mesmo aeroporto.
  // Caso contrário, são voos independentes (ex.: GRU→AEP, AEP→MDZ com 8
  // dias entre eles) e devem ser tratados como pernas separadas.
  return isPlausibleConnection(first, second) && isPlausibleConnection(third, fourth);
}

export function buildFlightLegGroups<T extends FlightLegLike>(inputSegments: T[]): {
  legs: FlightLegGroup<T>[];
  itineraryType: ItineraryType;
} {
  const hasExplicitLegStarts = inputSegments.some((seg, index) => index > 0 && seg.is_leg_start === true);

  const fallbackLegs = inputSegments.reduce<FlightLegGroup<T>[]>((acc, seg, index) => {
    const rawDirection = String(seg.direction || (index === 0 ? "ida" : "trecho")).toLowerCase();
    const direction = hasExplicitLegStarts && index > 0 && rawDirection !== "volta" ? "trecho" : rawDirection;
    const label = direction === "volta" ? "Volta" : direction === "ida" && acc.length === 0 ? "Ida" : `Trecho ${acc.length + 1}`;
    const last = acc[acc.length - 1];

    if (last && last.direction === direction && seg.is_leg_start !== true) {
      last.segments.push(seg);
      return acc;
    }

    acc.push({ label, direction, segments: [seg] });
    return acc;
  }, []);

  if (inputSegments.length === 0) {
    return { legs: fallbackLegs, itineraryType: "ONE_WAY" };
  }

  if (!hasExplicitLegStarts && isForcedRoundTripSplit(inputSegments)) {
    return {
      legs: [
        { label: "Ida", direction: "ida", segments: inputSegments.slice(0, 2) },
        { label: "Volta", direction: "volta", segments: inputSegments.slice(2, 4) },
      ],
      itineraryType: "ROUND_TRIP",
    };
  }

  const explicitDirectionSegments = inputSegments.filter((seg) => {
    const direction = String(seg.direction || "").toLowerCase();
    return direction === "ida" || direction === "volta";
  });

  if (!hasExplicitLegStarts && explicitDirectionSegments.length === inputSegments.length && explicitDirectionSegments.length > 0) {
    const legs = inputSegments.reduce<FlightLegGroup<T>[]>((acc, seg) => {
      const direction = String(seg.direction || "").toLowerCase();
      const label = direction === "volta" ? "Volta" : "Ida";
      const last = acc[acc.length - 1];

      if (last && last.direction === direction) {
        last.segments.push(seg);
        return acc;
      }

      acc.push({ label, direction, segments: [seg] });
      return acc;
    }, []);

    return {
      legs,
      itineraryType: legs.some((leg) => leg.direction === "volta") ? "ROUND_TRIP" : "ONE_WAY",
    };
  }

  const normalizedSegments: FlightSegmentInput[] = inputSegments
    .filter((seg): seg is T & { origin_iata: string; destination_iata: string } => Boolean(seg.origin_iata && seg.destination_iata))
    .map((seg, index) => ({
      ...seg,
      origin_iata: String(seg.origin_iata).toUpperCase(),
      destination_iata: String(seg.destination_iata).toUpperCase(),
      departure_date: seg.departure_date || null,
      departure_time: seg.departure_time || null,
      arrival_date: seg.arrival_date || null,
      arrival_time: seg.arrival_time || null,
      duration_minutes: Number.isFinite(seg.duration_minutes) ? Number(seg.duration_minutes) : null,
      segment_order: Number.isFinite(seg.segment_order) ? Number(seg.segment_order) : index,
    }));

  const classification = classifyItinerary(normalizedSegments);

  const directedSegments = (hasExplicitLegStarts
    ? normalizedSegments
    : assignDirections(normalizedSegments, classification)) as T[];
  const usedIndices = new Set<number>();

  const resolvedLegs = classification.legs
    .map((leg, legIndex) => {
      const segments = leg.segments
        .map((legSeg) => {
          const matchedIndex = directedSegments.findIndex((seg, index) => (
            !usedIndices.has(index) &&
            seg.origin_iata === legSeg.origin_iata &&
            seg.destination_iata === legSeg.destination_iata &&
            seg.departure_date === legSeg.departure_date &&
            (seg.departure_time || "") === (legSeg.departure_time || "")
          ));

          if (matchedIndex === -1) return null;
          usedIndices.add(matchedIndex);
          return directedSegments[matchedIndex];
        })
        .filter(Boolean) as T[];

      if (segments.length === 0) return null;

      const rawDirection = String(segments[0]?.direction || "").toLowerCase();
      const direction = hasExplicitLegStarts
        ? (rawDirection === "volta" ? "volta" : legIndex === 0 ? "ida" : "trecho")
        : String(
            (classification.type === "ROUND_TRIP" || classification.type === "OPEN_JAW")
              ? (legIndex === 0 ? "ida" : "volta")
              : (segments[0]?.direction || (classification.type === "ONE_WAY" ? "ida" : "trecho")),
          ).toLowerCase();

      const label = direction === "volta"
        ? "Volta"
        : direction === "ida"
          ? "Ida"
          : classification.type === "ONE_WAY"
            ? "Ida"
            : `Trecho ${legIndex + 1}`;

      return { label, direction, segments };
    })
    .filter(Boolean) as FlightLegGroup<T>[];

  return {
    legs: resolvedLegs.length > 0 ? resolvedLegs : fallbackLegs,
    itineraryType: classification.type,
  };
}