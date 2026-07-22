import { useMemo, useState } from "react";
import { format, addDays, parseISO, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Search, ArrowRightLeft, Plane, Calendar as CalIcon, SlidersHorizontal,
  Sparkles, Users as UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetTitle, SheetTrigger,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { GFlightAirportAutocomplete } from "@/components/google-flights/GFlightAirportAutocomplete";
import type { GAirport } from "@/components/google-flights/gflightsTypes";

import { UnifiedFlightResultsList } from "@/components/unified-flights/UnifiedFlightResultsList";
import { UnifiedFlightFiltersSidebar } from "@/components/unified-flights/UnifiedFlightFiltersSidebar";
import {
  DEFAULT_UNIFIED_FILTERS,
  applyUnifiedFilters,
  type UnifiedFlightFilters,
  type UnifiedFlightOffer,
} from "@/components/unified-flights/unifiedFlightTypes";
import { useUnifiedFlightSearch, type UnifiedSearchInput } from "@/hooks/useUnifiedFlightSearch";

import { GFlightDetailDrawer } from "@/components/google-flights/GFlightDetailDrawer";
import { FlightDetailDrawer } from "@/components/booking-rapidapi/FlightDetailDrawer";
import { GFlightPriceInsightBanner } from "@/components/google-flights/GFlightPriceInsightBanner";
import { GFlightPriceHistoryChart } from "@/components/google-flights/GFlightPriceHistoryChart";
import { GFlightCalendarHeatmap } from "@/components/google-flights/GFlightCalendarHeatmap";
import { GFlightPriceTrendChart } from "@/components/google-flights/GFlightPriceTrendChart";
import { useCalendarPicker, usePriceGraph, type SearchGFlightsInput } from "@/hooks/useGoogleFlights";
import { ChevronDown } from "lucide-react";

type Cabin = "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
const CABIN_LABELS: Record<Cabin, string> = {
  ECONOMY: "Econômica",
  PREMIUM_ECONOMY: "Premium Economy",
  BUSINESS: "Executiva",
  FIRST: "Primeira Classe",
};
type TripMode = "round" | "oneway";

export default function UnifiedFlightsSearchPage() {
  const [from, setFrom] = useState<GAirport | null>(null);
  const [to, setTo] = useState<GAirport | null>(null);
  const [outboundDate, setOutboundDate] = useState<Date | undefined>(addDays(new Date(), 30));
  const [returnDate, setReturnDate] = useState<Date | undefined>(addDays(new Date(), 37));
  const [adults, setAdults] = useState(1);
  const [cabin, setCabin] = useState<Cabin>("ECONOMY");
  const [tripMode, setTripMode] = useState<TripMode>("round");
  const [filters, setFilters] = useState<UnifiedFlightFilters>(DEFAULT_UNIFIED_FILTERS);
  const [snapshot, setSnapshot] = useState<UnifiedSearchInput | null>(null);
  const [selected, setSelected] = useState<UnifiedFlightOffer | null>(null);

  const search = useUnifiedFlightSearch(snapshot, !!snapshot);

  const filteredOffers = useMemo(
    () => applyUnifiedFilters(search.offers, filters),
    [search.offers, filters],
  );

  const canSearch = !!from && !!to && !!outboundDate && (tripMode === "oneway" || !!returnDate);

  function handleSwap() {
    const f = from;
    setFrom(to);
    setTo(f);
  }

  function handleSearch() {
    if (!from || !to || !outboundDate) return;
    if (tripMode === "round" && !returnDate) {
      toast.error("Selecione a data de volta ou troque para só ida");
      return;
    }
    setSnapshot({
      fromIata: from.id,
      toIata: to.id,
      outboundDate: format(outboundDate, "yyyy-MM-dd"),
      returnDate: tripMode === "round" && returnDate ? format(returnDate, "yyyy-MM-dd") : undefined,
      adults,
      cabin,
    });
    setSelected(null);
  }

  const detailSearchInput: SearchGFlightsInput | null = snapshot
    ? {
        departure_id: snapshot.fromIata,
        arrival_id: snapshot.toIata,
        outbound_date: snapshot.outboundDate,
        return_date: snapshot.returnDate,
        adults: snapshot.adults,
        travel_class: snapshot.cabin,
        currency: "BRL",
        trip_type: snapshot.returnDate ? "1" : "2",
      }
    : null;

  return (
    <div className="container mx-auto max-w-7xl space-y-5 p-4 md:p-6">
      {/* Cabeçalho */}
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Plane className="h-6 w-6 text-primary" />
            Busca de Voos
          </h1>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Sparkles className="h-3 w-3" /> Google Flights + Booking.com
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Uma busca só · resultados combinados das duas fontes, ordenados por preço.
        </p>
      </div>

      {/* Formulário de busca */}
      <Card className="p-4 md:p-5 space-y-4">
        {/* Ida/Volta · pax · cabine */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-full border border-border p-0.5">
            {(["round", "oneway"] as TripMode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTripMode(m)}
                className={cn(
                  "px-3 py-1 text-xs rounded-full transition",
                  tripMode === m
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "round" ? "Ida e volta" : "Só ida"}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <UsersIcon className="h-4 w-4 text-muted-foreground" />
            <Input
              type="number"
              min={1}
              max={9}
              value={adults}
              onChange={(e) => setAdults(Math.max(1, Math.min(9, Number(e.target.value) || 1)))}
              className="h-8 w-16"
            />
            <span className="text-xs text-muted-foreground">adulto(s)</span>
          </div>

          <Select value={cabin} onValueChange={(v) => setCabin(v as Cabin)}>
            <SelectTrigger className="h-8 w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CABIN_LABELS) as Cabin[]).map((c) => (
                <SelectItem key={c} value={c}>{CABIN_LABELS[c]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Origem · destino · datas · buscar */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto_1fr_auto_auto_auto]">
          <div className="space-y-1">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Origem
            </Label>
            <GFlightAirportAutocomplete
              value={from}
              onChange={setFrom}
              placeholder="De onde? (ex: GRU)"
              icon="plane"
            />
          </div>

          <div className="hidden lg:flex items-end pb-1">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={handleSwap}
              disabled={!from || !to}
              aria-label="Inverter origem e destino"
            >
              <ArrowRightLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Destino
            </Label>
            <GFlightAirportAutocomplete
              value={to}
              onChange={setTo}
              placeholder="Para onde? (ex: MIA)"
              icon="plane"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Ida
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full lg:w-[150px] justify-start font-normal h-10">
                  <CalIcon className="mr-2 h-4 w-4" />
                  {outboundDate ? format(outboundDate, "dd MMM", { locale: ptBR }) : "Selecione"}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={outboundDate}
                  onSelect={setOutboundDate}
                  locale={ptBR}
                  disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                />
              </PopoverContent>
            </Popover>
          </div>

          {tripMode === "round" && (
            <div className="space-y-1">
              <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Volta
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full lg:w-[150px] justify-start font-normal h-10">
                    <CalIcon className="mr-2 h-4 w-4" />
                    {returnDate ? format(returnDate, "dd MMM", { locale: ptBR }) : "Selecione"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={returnDate}
                    onSelect={setReturnDate}
                    locale={ptBR}
                    disabled={(d) => !!outboundDate && d < outboundDate}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground opacity-0">
              Buscar
            </Label>
            <Button
              onClick={handleSearch}
              disabled={!canSearch || search.isAllLoading}
              className="h-10 w-full lg:w-auto gap-2"
            >
              <Search className="h-4 w-4" />
              {search.isAllLoading ? "Buscando…" : "Buscar"}
            </Button>
          </div>
        </div>
      </Card>

      {/* Barra topo dos resultados */}
      {snapshot && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">
              {snapshot.fromIata} → {snapshot.toIata}
            </span>
            <span className="text-muted-foreground">·</span>
            <span className="text-muted-foreground">
              {filteredOffers.length} de {search.offers.length} resultados
            </span>
            {search.googleCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 border-sky-500/40 text-sky-700 dark:text-sky-300">
                Google · {search.googleCount}
              </Badge>
            )}
            {search.bookingCount > 0 && (
              <Badge variant="outline" className="text-[10px] gap-1 border-blue-700/40 text-blue-800 dark:text-blue-300">
                Booking · {search.bookingCount}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={filters.sortBy}
              onValueChange={(v) => setFilters({ ...filters, sortBy: v as UnifiedFlightFilters["sortBy"] })}
            >
              <SelectTrigger className="h-8 w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="price_asc">Menor preço</SelectItem>
                <SelectItem value="duration_asc">Menor duração</SelectItem>
                <SelectItem value="departure_asc">Saída mais cedo</SelectItem>
              </SelectContent>
            </Select>

            {/* Filtros mobile */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden gap-1">
                  <SlidersHorizontal className="h-4 w-4" /> Filtros
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetTitle className="mb-4">Filtros</SheetTitle>
                <UnifiedFlightFiltersSidebar
                  filters={filters}
                  onChange={setFilters}
                  allOffers={search.offers}
                />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      )}

      {/* Layout · sidebar + resultados */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[280px_1fr]">
        {snapshot && (
          <aside className="hidden lg:block">
            <Card className="p-4 sticky top-4">
              <UnifiedFlightFiltersSidebar
                filters={filters}
                onChange={setFilters}
                allOffers={search.offers}
              />
            </Card>
          </aside>
        )}

        <section className={snapshot ? "" : "lg:col-span-2"}>
          <UnifiedFlightResultsList
            offers={filteredOffers}
            isLoading={search.isLoading}
            isAllLoading={search.isAllLoading}
            googleLoading={search.googleLoading}
            bookingLoading={search.bookingLoading}
            googleError={search.googleError}
            bookingError={search.bookingError}
            hasSearched={!!snapshot}
            onSelect={setSelected}
          />
        </section>
      </div>

      {/* Drawers de detalhe · cada fonte usa o drawer nativo (info 100% preservada) */}
      {selected?.source === "google" && selected.raw_google && (
        <GFlightDetailDrawer
          itinerary={selected.raw_google}
          searchInput={detailSearchInput}
          onClose={() => setSelected(null)}
        />
      )}
      {selected?.source === "booking" && selected.raw_booking && (
        <FlightDetailDrawer
          offer={selected.raw_booking}
          open={true}
          onOpenChange={(o) => !o && setSelected(null)}
          adults={snapshot?.adults ?? 1}
        />
      )}
    </div>
  );
}
