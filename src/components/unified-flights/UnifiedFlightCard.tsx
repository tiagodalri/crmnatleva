import { Plane, Award, DollarSign, Zap, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatPrice,
  formatDurationMin,
  formatHHMM,
  dayOffset,
  type UnifiedFlightOffer,
} from "./unifiedFlightTypes";

interface Props {
  offer: UnifiedFlightOffer;
  isBest?: boolean;
  isCheapest?: boolean;
  isFastest?: boolean;
  onSelect?: (o: UnifiedFlightOffer) => void;
}

const SOURCE_META: Record<UnifiedFlightOffer["source"], { label: string; classes: string }> = {
  google: {
    label: "Google Flights",
    classes: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  booking: {
    label: "Booking.com",
    classes: "border-blue-700/40 bg-blue-700/10 text-blue-800 dark:text-blue-300",
  },
};

export function UnifiedFlightCard({ offer, isBest, isCheapest, isFastest, onSelect }: Props) {
  const src = SOURCE_META[offer.source];
  const overnight = dayOffset(offer.departure_time, offer.arrival_time);

  return (
    <button
      type="button"
      onClick={() => onSelect?.(offer)}
      className={cn(
        "w-full text-left rounded-lg border bg-card p-4 hover:border-primary/40 hover:shadow-md transition-all",
        isBest ? "border-primary/40 ring-1 ring-primary/20" : "border-border",
      )}
    >
      {/* Topo · cia + selo de fonte + preço */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          {offer.airline_logo ? (
            <img
              src={offer.airline_logo}
              alt=""
              className="h-8 w-8 object-contain rounded bg-white p-0.5 border border-border/40 shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded bg-muted/40 grid place-items-center shrink-0">
              <Plane className="h-4 w-4 text-muted-foreground" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">
              {offer.airline_names.join(" + ") || "—"}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge variant="outline" className={cn("text-[10px] h-4 px-1.5", src.classes)}>
                {src.label}
              </Badge>
              {offer.cabin && (
                <span className="text-[10px] text-muted-foreground truncate">{offer.cabin}</span>
              )}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-primary leading-tight">
            {formatPrice(offer)}
          </div>
          <div className="text-[10px] text-muted-foreground">
            {offer.source === "google" ? "por adulto" : "total"}
          </div>
        </div>
      </div>

      {/* Destaques */}
      {(isBest || isCheapest || isFastest) && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {isBest && (
            <Badge className="gap-1 text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/15">
              <Award className="h-2.5 w-2.5" /> Melhor
            </Badge>
          )}
          {isCheapest && (
            <Badge variant="outline" className="gap-1 text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
              <DollarSign className="h-2.5 w-2.5" /> Mais barato
            </Badge>
          )}
          {isFastest && (
            <Badge variant="outline" className="gap-1 text-[10px] border-sky-500/40 text-sky-700 dark:text-sky-300">
              <Zap className="h-2.5 w-2.5" /> Mais rápido
            </Badge>
          )}
        </div>
      )}

      {/* Timeline */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-base font-bold font-mono leading-none">
            {formatHHMM(offer.departure_time)}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {offer.departure_iata ?? "—"}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center min-w-0">
          <div className="text-[10px] text-muted-foreground">
            {formatDurationMin(offer.duration_min)}
          </div>
          <div className="w-full h-px bg-border my-1" />
          <div className="text-[10px] text-muted-foreground text-center">
            {offer.stops === 0 ? (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">Direto</span>
            ) : (
              <span className="text-amber-700 dark:text-amber-400 font-medium">
                {offer.stops} {offer.stops === 1 ? "parada" : "paradas"}
              </span>
            )}
          </div>
        </div>
        <div className="text-left">
          <div className="text-base font-bold font-mono leading-none">
            {formatHHMM(offer.arrival_time)}
            {overnight > 0 && <sup className="text-[10px] text-rose-500 ml-0.5">+{overnight}</sup>}
          </div>
          <div className="text-[10px] text-muted-foreground mt-0.5">
            {offer.arrival_iata ?? "—"}
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border/40 flex items-center justify-end gap-1 text-[11px] text-primary font-medium">
        Ver detalhes <ArrowRight className="h-3 w-3" />
      </div>
    </button>
  );
}
