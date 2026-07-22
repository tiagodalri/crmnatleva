import { useState } from "react";
import { Search, Loader2, Ticket, SlidersHorizontal, AlertCircle, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BetaBadge } from "@/components/booking-rapidapi/BetaBadge";
import { AttractionDestinationAutocomplete } from "@/components/booking-rapidapi/AttractionDestinationAutocomplete";
import { AttractionCard } from "@/components/booking-rapidapi/AttractionCard";
import { AttractionDetailDrawer } from "@/components/booking-rapidapi/AttractionDetailDrawer";
import { useSearchAttractions } from "@/hooks/useBookingAttractions";
import type {
  AttractionLocation,
  AttractionProduct,
} from "@/components/booking-rapidapi/attractionTypes";

const SORT_OPTIONS = [
  { value: "trending", label: "Em alta" },
  { value: "attr_book_score", label: "Mais reservados" },
  { value: "lowest_price", label: "Menor preço" },
  { value: "highest_rated", label: "Melhor avaliados" },
];

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="aspect-[4/3] bg-muted animate-pulse" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
            <div className="h-4 bg-muted rounded animate-pulse w-4/5" />
            <div className="h-3 bg-muted rounded animate-pulse w-1/2" />
            <div className="h-5 bg-muted rounded animate-pulse w-2/5 mt-3" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function AttractionsSearchPage() {
  const [destination, setDestination] = useState<AttractionLocation | null>(null);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [sortBy, setSortBy] = useState("trending");
  const [page, setPage] = useState(1);
  const [committed, setCommitted] = useState<{
    id: string;
    sortBy: string;
    page: number;
    startDate?: string;
    endDate?: string;
  } | null>(null);
  const [selected, setSelected] = useState<AttractionProduct | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { data, isFetching, error } = useSearchAttractions(
    committed
      ? {
          id: committed.id,
          sortBy: committed.sortBy,
          page: committed.page,
          startDate: committed.startDate,
          endDate: committed.endDate,
        }
      : null,
    !!committed,
  );

  const buildDates = () => ({
    startDate: dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined,
    endDate: dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined,
  });

  const handleSearch = () => {
    if (!destination) return;
    setPage(1);
    setCommitted({ id: destination.id, sortBy, page: 1, ...buildDates() });
  };

  const handleSort = (value: string) => {
    setSortBy(value);
    if (destination) {
      setPage(1);
      setCommitted({ id: destination.id, sortBy: value, page: 1, ...buildDates() });
    }
  };

  const products = data?.products ?? [];

  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "dd MMM", { locale: ptBR })} · ${format(dateRange.to, "dd MMM", { locale: ptBR })}`
      : format(dateRange.from, "dd MMM yyyy", { locale: ptBR })
    : "Datas (opcional)";

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4 sm:py-6 space-y-4">
      {/* Barra de busca */}
      <Card className="p-4 sm:p-5 border-border/60">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-champagne-logo/15 flex items-center justify-center">
            <Ticket className="h-4 w-4 text-champagne-logo" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              Ingressos e Passeios <BetaBadge />
            </h2>
            <p className="text-xs text-muted-foreground">
              Tours, ingressos e experiências pelo mundo · fonte Booking.com
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Destino ou atração</Label>
            <AttractionDestinationAutocomplete
              value={destination}
              onChange={setDestination}
            />
          </div>
          <div className="space-y-1.5 md:min-w-[260px]">
            <Label className="text-xs">Período</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "h-11 w-full justify-start text-left font-normal gap-2",
                    !dateRange?.from && "text-muted-foreground",
                  )}
                >
                  <CalendarIcon className="h-4 w-4" />
                  {dateLabel}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  locale={ptBR}
                  disabled={{ before: new Date() }}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
                {dateRange?.from && (
                  <div className="flex justify-end p-2 border-t">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setDateRange(undefined)}
                    >
                      Limpar
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleSearch}
              disabled={!destination || isFetching}
              className="w-full md:w-auto h-11 gap-2 bg-champagne-logo hover:bg-champagne-logo/90 text-white"
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar ingressos
            </Button>
          </div>
        </div>
      </Card>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Destino ou atração</Label>
            <AttractionDestinationAutocomplete
              value={destination}
              onChange={setDestination}
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleSearch}
              disabled={!destination || isFetching}
              className="w-full md:w-auto h-11 gap-2 bg-champagne-logo hover:bg-champagne-logo/90 text-white"
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar ingressos
            </Button>
          </div>
        </div>
      </Card>

      {/* Toolbar de resultados */}
      {committed && (
        <div className="flex flex-wrap items-center justify-between gap-3 px-1">
          <div className="text-sm text-muted-foreground">
            {isFetching ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Buscando atrações...
              </span>
            ) : products.length > 0 ? (
              <>
                <span className="font-medium text-foreground">
                  {(data?.totalCount ?? products.length).toLocaleString("pt-BR")}
                </span>{" "}
                atrações encontradas
                {destination?.cityName && ` em ${destination.cityName}`}
                {data?.cache_hit && (
                  <Badge variant="outline" className="ml-2 text-[10px]">
                    cache
                  </Badge>
                )}
              </>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
            <Select value={sortBy} onValueChange={handleSort}>
              <SelectTrigger className="h-9 w-[180px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Estado vazio inicial */}
      {!committed && (
        <Card className="p-10 text-center border-dashed bg-muted/20">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-champagne-logo/10 text-champagne-logo">
            <Ticket className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Busque ingressos e experiências</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Digite um destino ou nome de atração (ex: Orlando, Universal Studios,
            Torre Eiffel) e veja opções reais em tempo real.
          </p>
        </Card>
      )}

      {/* Erro */}
      {error && committed && (
        <Card className="p-6 border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-sm mb-1">
                Não foi possível buscar atrações
              </h4>
              <p className="text-xs text-muted-foreground">
                {(error as Error).message}
              </p>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSearch}
                className="mt-3"
              >
                Tentar novamente
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Skeleton */}
      {isFetching && !data && <SkeletonGrid />}

      {/* Vazio pós-busca */}
      {committed && !isFetching && !error && products.length === 0 && (
        <Card className="p-10 text-center border-dashed">
          <h3 className="text-base font-semibold mb-1">
            Nenhuma atração encontrada
          </h3>
          <p className="text-sm text-muted-foreground">
            Tente outro destino ou refine sua busca.
          </p>
        </Card>
      )}

      {/* Grid de resultados */}
      {products.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {products.map((p) => (
            <AttractionCard
              key={p.id}
              product={p}
              onClick={() => {
                setSelected(p);
                setDrawerOpen(true);
              }}
            />
          ))}
        </div>
      )}

      <AttractionDetailDrawer
        product={selected}
        open={drawerOpen}
        onOpenChange={(v) => {
          setDrawerOpen(v);
          if (!v) setSelected(null);
        }}
      />
    </div>
  );
}
