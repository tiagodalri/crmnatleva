import { AlertCircle, Plane, Loader2, Check } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { UnifiedFlightCard } from "./UnifiedFlightCard";
import type { UnifiedFlightOffer } from "./unifiedFlightTypes";
import { computeHighlightIds } from "./unifiedFlightTypes";

interface Props {
  offers: UnifiedFlightOffer[];
  isLoading: boolean;
  isAllLoading: boolean;
  googleLoading: boolean;
  bookingLoading: boolean;
  googleError: Error | null;
  bookingError: Error | null;
  hasSearched: boolean;
  onSelect: (o: UnifiedFlightOffer) => void;
}

export function UnifiedFlightResultsList({
  offers,
  isLoading,
  isAllLoading,
  googleLoading,
  bookingLoading,
  googleError,
  bookingError,
  hasSearched,
  onSelect,
}: Props) {
  const { bestId, cheapestId, fastestId } = computeHighlightIds(offers);

  if (!hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
        <Plane className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">
          Informe origem, destino e datas acima para buscar voos.
        </p>
      </div>
    );
  }

  if (isAllLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const bothFailed = !!googleError && !!bookingError;
  if (bothFailed && offers.length === 0) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Não foi possível buscar voos</AlertTitle>
        <AlertDescription>
          Google Flights: {googleError?.message} · Booking.com: {bookingError?.message}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-3">
      {/* Avisos não-bloqueantes por fonte */}
      {googleError && !bookingError && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Não foi possível buscar no Google Flights agora. Mostrando resultados da Booking.com.
          </AlertDescription>
        </Alert>
      )}
      {bookingError && !googleError && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            Não foi possível buscar na Booking.com agora. Mostrando resultados do Google Flights.
          </AlertDescription>
        </Alert>
      )}

      {/* Indicador de "ainda carregando uma das fontes" */}
      {isLoading && !isAllLoading && offers.length > 0 && (
        <div className="text-xs text-muted-foreground italic px-1">
          {googleLoading && "Ainda buscando no Google Flights…"}
          {bookingLoading && "Ainda buscando na Booking.com…"}
        </div>
      )}

      {offers.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border py-16 text-center">
          <Plane className="h-12 w-12 text-muted-foreground/50" />
          <p className="text-sm font-medium">Nenhum voo encontrado</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Ajuste os filtros, datas ou tente aeroportos alternativos.
          </p>
        </div>
      ) : (
        offers.map((o) => (
          <UnifiedFlightCard
            key={o.id}
            offer={o}
            isBest={o.id === bestId}
            isCheapest={o.id === cheapestId}
            isFastest={o.id === fastestId}
            onSelect={onSelect}
          />
        ))
      )}
    </div>
  );
}
