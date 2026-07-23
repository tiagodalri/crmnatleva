import { useState, useMemo, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import {
  Search,
  Loader2,
  Car as CarIcon,
  CalendarIcon,
  Users,
  Snowflake,
  Cog,
  Briefcase,
  AlertCircle,
  Check,
  MapPin,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { BetaBadge } from "@/components/booking-rapidapi/BetaBadge";
import { CarLocationAutocomplete } from "@/components/booking-rapidapi/CarLocationAutocomplete";
import { CarDetailDrawer } from "@/components/booking-rapidapi/CarDetailDrawer";
import {
  useSearchCarRentals,
  prefetchCarDetailBundle,
  type CarLocation,
  type CarVehicle,
} from "@/hooks/useBookingCars";
import {
  tCategory,
  tTransmission,
  tBaggage,
  CAR_IMAGE_PLACEHOLDER,
} from "@/lib/carRentalI18n";

const TIME_OPTIONS = Array.from({ length: 24 }, (_, h) => {
  const hh = String(h).padStart(2, "0");
  return [`${hh}:00`, `${hh}:30`];
}).flat();

const SORT_OPTIONS = [
  { value: "price_asc", label: "Menor preço" },
  { value: "price_desc", label: "Maior preço" },
  { value: "rating", label: "Melhor avaliação" },
] as const;

function formatBRL(v: number | undefined, currency = "BRL") {
  if (typeof v !== "number" || !Number.isFinite(v)) return "";
  try {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(v);
  } catch {
    return `${currency} ${v.toFixed(0)}`;
  }
}

function VehicleCard({ vehicle, onClick }: { vehicle: CarVehicle; onClick?: () => void }) {
  return (
    <Card
      onClick={onClick}
      className="overflow-hidden hover:shadow-md transition-shadow flex flex-col cursor-pointer"
    >
      <div className="aspect-[16/10] bg-muted flex items-center justify-center overflow-hidden">
        <img
          src={vehicle.image || CAR_IMAGE_PLACEHOLDER}
          alt={vehicle.name ?? "Veículo"}
          loading="lazy"
          onError={(e) => {
            const img = e.currentTarget;
            if (img.src !== CAR_IMAGE_PLACEHOLDER) img.src = CAR_IMAGE_PLACEHOLDER;
          }}
          className="max-h-full max-w-full object-contain p-4"
        />
      </div>
      <div className="p-3 flex-1 flex flex-col gap-2">
        <div>
          {vehicle.category && (
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              {tCategory(vehicle.category)}
            </div>
          )}
          <div className="text-sm font-semibold leading-tight line-clamp-2">
            {vehicle.name ?? "Veículo"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
          {vehicle.seats !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> {vehicle.seats}
            </span>
          )}
          {vehicle.bags !== undefined && (
            <span className="inline-flex items-center gap-1">
              <Briefcase className="h-3 w-3" /> {vehicle.bags}
            </span>
          )}
          {vehicle.transmission && (
            <span className="inline-flex items-center gap-1">
              <Cog className="h-3 w-3" /> {tTransmission(vehicle.transmission)}
            </span>
          )}
          {vehicle.airConditioning && (
            <span className="inline-flex items-center gap-1">
              <Snowflake className="h-3 w-3" /> A/C
            </span>
          )}
        </div>

        {vehicle.freeCancellation && (
          <Badge
            variant="outline"
            className="w-fit text-[10px] gap-1 border-emerald-500/40 text-emerald-600"
          >
            <Check className="h-3 w-3" /> Cancelamento grátis
          </Badge>
        )}

        {vehicle.pickUpAddress && (
          <div className="text-[11px] text-muted-foreground flex items-start gap-1 min-w-0">
            <MapPin className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="line-clamp-2 break-words">{vehicle.pickUpAddress}</span>
          </div>
        )}

        <div className="mt-auto pt-2 flex items-end justify-between gap-2 border-t">
          <div className="text-xs text-muted-foreground min-w-0 flex items-center gap-1.5">
            {vehicle.supplier?.logo ? (
              <img
                src={vehicle.supplier.logo}
                alt={vehicle.supplier?.name ?? ""}
                loading="lazy"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
                className="h-4 w-auto object-contain shrink-0"
              />
            ) : null}
            <span className="truncate">
              {vehicle.supplier?.name}
              {vehicle.supplier?.rating !== undefined && (
                <span className="ml-1">· {vehicle.supplier.rating.toFixed(1)}</span>
              )}
            </span>
          </div>
          <div className="text-right">
            {vehicle.pricePerDay !== undefined && (
              <div className="text-[10px] text-muted-foreground">
                {formatBRL(vehicle.pricePerDay, vehicle.currency)} / dia
              </div>
            )}
            <div className="text-base font-bold text-champagne-logo">
              {formatBRL(vehicle.totalPrice, vehicle.currency)}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="aspect-[16/10] bg-muted animate-pulse" />
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

export default function CarsSearchPage() {
  const [pickUp, setPickUp] = useState<CarLocation | null>(null);
  const [dropOff, setDropOff] = useState<CarLocation | null>(null);
  const [sameLocation, setSameLocation] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [pickUpTime, setPickUpTime] = useState("10:00");
  const [dropOffTime, setDropOffTime] = useState("10:00");
  const [driverAge, setDriverAge] = useState<number>(30);
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]["value"]>(
    "price_asc",
  );
  const [freeCancellationOnly, setFreeCancellationOnly] = useState(false);
  const [transmissionFilter, setTransmissionFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [fuelFilter, setFuelFilter] = useState<string>("all");
  const [seatFilter, setSeatFilter] = useState<string>("all");
  const [selectedVehicle, setSelectedVehicle] = useState<CarVehicle | null>(null);

  const effectiveDropOff = sameLocation ? pickUp : dropOff;

  const [committed, setCommitted] = useState<null | {
    pickUp: CarLocation;
    dropOff: CarLocation;
    pickUpDate: string;
    dropOffDate: string;
    pickUpTime: string;
    dropOffTime: string;
    driverAge: number;
  }>(null);

  const { data, isFetching, error } = useSearchCarRentals(
    committed
      ? {
          pickUp: committed.pickUp,
          dropOff: committed.dropOff,
          pickUpDate: committed.pickUpDate,
          dropOffDate: committed.dropOffDate,
          pickUpTime: committed.pickUpTime,
          dropOffTime: committed.dropOffTime,
          driverAge: committed.driverAge,
        }
      : null,
    !!committed,
  );

  const canSearch =
    !!pickUp &&
    !!effectiveDropOff &&
    !!dateRange?.from &&
    !!dateRange?.to &&
    driverAge >= 18;

  const handleSearch = () => {
    if (!pickUp || !effectiveDropOff || !dateRange?.from || !dateRange?.to)
      return;
    setCommitted({
      pickUp,
      dropOff: effectiveDropOff,
      pickUpDate: format(dateRange.from, "yyyy-MM-dd"),
      dropOffDate: format(dateRange.to, "yyyy-MM-dd"),
      pickUpTime,
      dropOffTime,
      driverAge,
    });
  };

  const vehicles = data?.vehicles ?? [];

  // Opções dinâmicas dos filtros (só o que veio nos resultados)
  const transmissionOptions = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.transmission).filter(Boolean) as string[])),
    [vehicles],
  );
  const categoryOptions = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.category).filter(Boolean) as string[])),
    [vehicles],
  );
  const fuelOptions = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.fuelType).filter(Boolean) as string[])),
    [vehicles],
  );
  const seatOptions = useMemo(
    () => Array.from(new Set(vehicles.map((v) => v.seatCategory).filter(Boolean) as string[])),
    [vehicles],
  );

  const filteredSorted = useMemo(() => {
    let list = [...vehicles];
    if (freeCancellationOnly) list = list.filter((v) => v.freeCancellation);
    if (transmissionFilter !== "all")
      list = list.filter((v) => (v.transmission ?? "").toLowerCase() === transmissionFilter.toLowerCase());
    if (categoryFilter !== "all")
      list = list.filter((v) => (v.category ?? "") === categoryFilter);
    if (fuelFilter !== "all")
      list = list.filter((v) => (v.fuelType ?? "") === fuelFilter);
    if (seatFilter !== "all")
      list = list.filter((v) => (v.seatCategory ?? "") === seatFilter);
    list.sort((a, b) => {
      if (sortBy === "price_asc")
        return (a.totalPrice ?? Infinity) - (b.totalPrice ?? Infinity);
      if (sortBy === "price_desc")
        return (b.totalPrice ?? -Infinity) - (a.totalPrice ?? -Infinity);
      if (sortBy === "rating")
        return (b.supplier?.rating ?? 0) - (a.supplier?.rating ?? 0);
      return 0;
    });
    return list;
  }, [vehicles, freeCancellationOnly, transmissionFilter, categoryFilter, fuelFilter, seatFilter, sortBy]);

  // Prefetch preditivo · dispara em background os 3 endpoints de detalhe
  // pros 3 primeiros veículos, pra que abrir o drawer seja instantâneo.
  const qc = useQueryClient();
  const prefetchedRef = useRef<Set<string>>(new Set());
  const searchKey = data?.searchKey;
  useEffect(() => {
    if (!searchKey) return;
    const top = filteredSorted.slice(0, 3);
    for (const v of top) {
      const cacheKey = `${searchKey}::${v.id}`;
      if (prefetchedRef.current.has(cacheKey)) continue;
      prefetchedRef.current.add(cacheKey);
      prefetchCarDetailBundle(qc, searchKey, v.id);
    }
  }, [searchKey, filteredSorted, qc]);


  const dateLabel = dateRange?.from
    ? dateRange.to
      ? `${format(dateRange.from, "dd MMM", { locale: ptBR })} · ${format(dateRange.to, "dd MMM", { locale: ptBR })}`
      : format(dateRange.from, "dd MMM yyyy", { locale: ptBR })
    : "Retirada · Devolução";

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4 sm:py-6 space-y-4">
      {/* Barra de busca */}
      <Card className="p-4 sm:p-5 border-border/60">
        <div className="flex items-center gap-2 mb-3">
          <div className="h-8 w-8 rounded-lg bg-champagne-logo/15 flex items-center justify-center">
            <CarIcon className="h-4 w-4 text-champagne-logo" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-semibold flex items-center gap-2">
              Aluguel de Carros <BetaBadge />
            </h2>
            <p className="text-xs text-muted-foreground">
              Compare veículos e locadoras no mundo todo · fonte Booking.com
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <Checkbox
            id="same-loc"
            checked={sameLocation}
            onCheckedChange={(v) => setSameLocation(v === true)}
          />
          <Label htmlFor="same-loc" className="text-xs cursor-pointer">
            Devolver no mesmo local
          </Label>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-6 gap-3">
          <div className={cn("space-y-1.5", sameLocation ? "lg:col-span-3" : "lg:col-span-2")}>
            <Label className="text-xs">Retirada</Label>
            <CarLocationAutocomplete value={pickUp} onChange={setPickUp} />
          </div>
          {!sameLocation && (
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-xs">Devolução</Label>
              <CarLocationAutocomplete value={dropOff} onChange={setDropOff} />
            </div>
          )}
          <div className={cn("space-y-1.5", sameLocation ? "lg:col-span-2" : "lg:col-span-2")}>
            <Label className="text-xs">Datas</Label>
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
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-1.5 lg:col-span-1">
            <Label className="text-xs">Hora retirada</Label>
            <Select value={pickUpTime} onValueChange={setPickUpTime}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={`pu-${t}`} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Hora devolução</Label>
            <Select value={dropOffTime} onValueChange={setDropOffTime}>
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {TIME_OPTIONS.map((t) => (
                  <SelectItem key={`do-${t}`} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Idade do motorista</Label>
            <Input
              type="number"
              min={18}
              max={99}
              value={driverAge}
              onChange={(e) => setDriverAge(Number(e.target.value) || 30)}
              className="h-11"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={handleSearch}
              disabled={!canSearch || isFetching}
              className="w-full h-11 gap-2 bg-champagne-logo hover:bg-champagne-logo/90 text-white"
            >
              {isFetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
              Buscar carros
            </Button>
          </div>
        </div>
      </Card>

      {/* Layout com sidebar de filtros */}
      {committed && (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
          <aside className="space-y-3">
            <Card className="p-3 space-y-3">
              <div>
                <Label className="text-xs font-semibold mb-2 block">
                  Ordenar
                </Label>
                <Select
                  value={sortBy}
                  onValueChange={(v) => setSortBy(v as typeof sortBy)}
                >
                  <SelectTrigger className="h-9 text-xs">
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

              <div>
                <Label className="text-xs font-semibold mb-2 block">
                  Transmissão
                </Label>
                <Select
                  value={transmissionFilter}
                  onValueChange={setTransmissionFilter}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">Todas</SelectItem>
                    {transmissionOptions.length > 0
                      ? transmissionOptions.map((o) => (
                          <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                        ))
                      : (
                        <>
                          <SelectItem value="automatic" className="text-xs">Automática</SelectItem>
                          <SelectItem value="manual" className="text-xs">Manual</SelectItem>
                        </>
                      )}
                  </SelectContent>
                </Select>
              </div>

              {categoryOptions.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold mb-2 block">Categoria</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todas</SelectItem>
                      {categoryOptions.map((o) => (
                        <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {fuelOptions.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold mb-2 block">Combustível</Label>
                  <Select value={fuelFilter} onValueChange={setFuelFilter}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos</SelectItem>
                      {fuelOptions.map((o) => (
                        <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {seatOptions.length > 0 && (
                <div>
                  <Label className="text-xs font-semibold mb-2 block">Assentos</Label>
                  <Select value={seatFilter} onValueChange={setSeatFilter}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs">Todos</SelectItem>
                      {seatOptions.map((o) => (
                        <SelectItem key={o} value={o} className="text-xs">{o}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Checkbox
                  id="free-cancel"
                  checked={freeCancellationOnly}
                  onCheckedChange={(v) => setFreeCancellationOnly(v === true)}
                />
                <Label htmlFor="free-cancel" className="text-xs cursor-pointer">
                  Cancelamento grátis
                </Label>
              </div>
            </Card>
          </aside>

          <div className="space-y-4 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3 px-1">
              <div className="text-sm text-muted-foreground">
                {isFetching ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Buscando veículos…
                  </span>
                ) : (
                  <>
                    <span className="font-medium text-foreground">
                      {filteredSorted.length.toLocaleString("pt-BR")}
                    </span>{" "}
                    veículos encontrados
                    {data?.cache_hit && (
                      <Badge variant="outline" className="ml-2 text-[10px]">
                        cache
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>

            {error && (
              <Card className="p-6 border-destructive/40 bg-destructive/5">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm mb-1">
                      Não foi possível buscar veículos
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

            {isFetching && !data && <SkeletonGrid />}

            {!isFetching && !error && filteredSorted.length === 0 && (
              <Card className="p-10 text-center border-dashed">
                <h3 className="text-base font-semibold mb-1">
                  Nenhum veículo encontrado
                </h3>
                <p className="text-sm text-muted-foreground">
                  Ajuste datas, local ou remova filtros.
                </p>
              </Card>
            )}

            {filteredSorted.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredSorted.map((v) => (
                  <VehicleCard key={v.id} vehicle={v} onClick={() => setSelectedVehicle(v)} />
                ))}
              </div>
            )}

            <CarDetailDrawer
              vehicle={selectedVehicle}
              open={!!selectedVehicle}
              onOpenChange={(o) => { if (!o) setSelectedVehicle(null); }}
            />
          </div>
        </div>
      )}

      {!committed && (
        <Card className="p-10 text-center border-dashed bg-muted/20">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-champagne-logo/10 text-champagne-logo">
            <CarIcon className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Alugue um carro no mundo todo</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Escolha local de retirada, datas e horários. Comparamos as principais locadoras via Booking.com em tempo real.
          </p>
        </Card>
      )}
    </div>
  );
}
