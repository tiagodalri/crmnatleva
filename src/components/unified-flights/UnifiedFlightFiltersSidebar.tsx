import { useMemo } from "react";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DEFAULT_UNIFIED_FILTERS,
  type UnifiedFlightFilters,
  type UnifiedFlightOffer,
} from "./unifiedFlightTypes";

interface Props {
  filters: UnifiedFlightFilters;
  onChange: (next: UnifiedFlightFilters) => void;
  allOffers: UnifiedFlightOffer[]; // pra popular opções (companhias, faixas)
}

export function UnifiedFlightFiltersSidebar({ filters, onChange, allOffers }: Props) {
  const airlineOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of allOffers) for (const a of o.airline_names) set.add(a);
    return Array.from(set).sort();
  }, [allOffers]);

  const priceRange = useMemo(() => {
    const prices = allOffers.map((o) => o.price).filter((x): x is number => typeof x === "number");
    if (!prices.length) return { min: 0, max: 0 };
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [allOffers]);

  function patch(p: Partial<UnifiedFlightFilters>) {
    onChange({ ...filters, ...p });
  }

  function toggleStop(v: 0 | 1 | 2) {
    const has = filters.stops.includes(v);
    const next = has ? filters.stops.filter((x) => x !== v) : [...filters.stops, v];
    patch({ stops: next.length === 0 ? [v] : next });
  }

  function toggleAirline(a: string) {
    const has = filters.airlines.includes(a);
    patch({ airlines: has ? filters.airlines.filter((x) => x !== a) : [...filters.airlines, a] });
  }

  function toggleSource(s: "google" | "booking") {
    const has = filters.sources.includes(s);
    const next = has ? filters.sources.filter((x) => x !== s) : [...filters.sources, s];
    patch({ sources: next.length === 0 ? [s] : next });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Filtros</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onChange(DEFAULT_UNIFIED_FILTERS)}
          className="h-7 gap-1 text-xs text-muted-foreground"
        >
          <RotateCcw className="h-3 w-3" /> Limpar
        </Button>
      </div>

      <ScrollArea className="h-[calc(100vh-14rem)] pr-3">
        <div className="space-y-5">
          {/* Fontes */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Fontes
            </Label>
            {(["google", "booking"] as const).map((s) => (
              <label key={s} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.sources.includes(s)}
                  onCheckedChange={() => toggleSource(s)}
                />
                <span className="text-sm">
                  {s === "google" ? "Google Flights" : "Booking.com"}
                </span>
              </label>
            ))}
          </div>

          <Separator />

          {/* Paradas */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Paradas
            </Label>
            {([
              [0, "Direto"],
              [1, "1 parada"],
              [2, "2 ou mais"],
            ] as const).map(([v, label]) => (
              <label key={v} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={filters.stops.includes(v as 0 | 1 | 2)}
                  onCheckedChange={() => toggleStop(v as 0 | 1 | 2)}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>

          <Separator />

          {/* Preço */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Faixa de preço
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Mínimo</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={filters.priceMin || ""}
                  placeholder={priceRange.min ? `R$ ${priceRange.min}` : "R$ 0"}
                  onChange={(e) => patch({ priceMin: Number(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Máximo</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={filters.priceMax || ""}
                  placeholder={priceRange.max ? `R$ ${priceRange.max}` : "sem limite"}
                  onChange={(e) => patch({ priceMax: Number(e.target.value) || 0 })}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Duração */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Duração máxima
            </Label>
            <div className="text-xs text-muted-foreground mb-1">
              {filters.durationMaxMin > 0
                ? `Até ${Math.floor(filters.durationMaxMin / 60)}h ${filters.durationMaxMin % 60}min`
                : "Sem limite"}
            </div>
            <Slider
              value={[filters.durationMaxMin]}
              min={0}
              max={2400}
              step={30}
              onValueChange={(v) => patch({ durationMaxMin: v[0] })}
            />
          </div>

          <Separator />

          {/* Horário de saída */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Horário de saída
            </Label>
            <div className="text-xs text-muted-foreground mb-1">
              {String(filters.depHourFrom).padStart(2, "0")}:00 · {String(filters.depHourTo).padStart(2, "0")}:00
            </div>
            <Slider
              value={[filters.depHourFrom, filters.depHourTo]}
              min={0}
              max={24}
              step={1}
              onValueChange={(v) => patch({ depHourFrom: v[0], depHourTo: v[1] })}
            />
          </div>

          {/* Horário de chegada */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Horário de chegada
            </Label>
            <div className="text-xs text-muted-foreground mb-1">
              {String(filters.arrHourFrom).padStart(2, "0")}:00 · {String(filters.arrHourTo).padStart(2, "0")}:00
            </div>
            <Slider
              value={[filters.arrHourFrom, filters.arrHourTo]}
              min={0}
              max={24}
              step={1}
              onValueChange={(v) => patch({ arrHourFrom: v[0], arrHourTo: v[1] })}
            />
          </div>

          <Separator />

          {/* Companhias */}
          {airlineOptions.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Companhias aéreas
              </Label>
              <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                {airlineOptions.map((a) => (
                  <label key={a} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={filters.airlines.includes(a)}
                      onCheckedChange={() => toggleAirline(a)}
                    />
                    <span className="text-sm truncate">{a}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
