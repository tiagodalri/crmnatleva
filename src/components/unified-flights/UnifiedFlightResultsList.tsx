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
    const SourceStep = ({ label, loading }: { label: string; loading: boolean }) => (
      <div className="flex items-center gap-3 rounded-md border border-border/60 bg-background/50 px-4 py-3">
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin text-champagne-logo" />
        ) : (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15">
            <Check className="h-3 w-3 text-emerald-600" />
          </span>
        )}
        <span className="text-sm font-medium">{label}</span>
        <span className="ml-auto text-[11px] text-muted-foreground">
          {loading ? "consultando…" : "pronto"}
        </span>
      </div>
    );
    return (
      <div className="animate-fade-in space-y-4 rounded-lg border border-dashed border-border/70 bg-muted/20 p-5">
        <div className="flex items-center gap-2">
          <Plane className="h-4 w-4 text-champagne-logo" />
          <p className="text-sm font-semibold">Buscando as melhores ofertas em paralelo</p>
        </div>
        <div className="space-y-2">
          <SourceStep label="Google Flights" loading={googleLoading} />
          <SourceStep label="Booking.com" loading={bookingLoading} />
        </div>
        <p className="text-[11px] text-muted-foreground">
          As duas fontes consultam sites reais em tempo real · normalmente 5-15s.
          Assim que cada uma responder, os voos aparecem aqui automaticamente.
        </p>
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
