import { Loader2, X, Users, Briefcase, Cog, Snowflake, Fuel, Star, ShieldCheck, MapPin, Building2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  useCarVehicleDetails,
  useCarSupplierDetails,
  useCarBookingSummary,
  type CarVehicle,
} from "@/hooks/useBookingCars";

interface Props {
  vehicle: CarVehicle | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

function formatMoney(v: number | undefined, currency = "BRL") {
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

function pickPriceText(obj: any): string | null {
  if (!obj) return null;
  const candidates = [
    obj?.pricing?.finalPriceDisplay,
    obj?.pricing?.finalPrice,
    obj?.price?.display,
    obj?.total?.display,
    obj?.driveAwayPrice?.display,
    obj?.summary?.total?.display,
  ];
  for (const c of candidates) if (typeof c === "string" && c.trim()) return c;
  return null;
}

export function CarDetailDrawer({ vehicle, open, onOpenChange }: Props) {
  const searchKey = vehicle?.searchKey ?? null;
  const vehicleId = vehicle?.id ?? null;
  const active = open && !!searchKey && !!vehicleId;

  const veh = useCarVehicleDetails(searchKey, vehicleId, active);
  const sup = useCarSupplierDetails(searchKey, vehicleId, active);
  const sum = useCarBookingSummary(searchKey, vehicleId, active);

  const isLoading = veh.isLoading || sup.isLoading || sum.isLoading;
  const anyError = veh.error || sup.error || sum.error;

  const vehData: any = veh.data ?? {};
  const supData: any = sup.data ?? {};
  const sumData: any = sum.data ?? {};

  // Fotos · combina detail + card
  const photos: string[] = (() => {
    const arr: string[] = [];
    const seen = new Set<string>();
    const push = (u?: any) => {
      if (typeof u === "string" && u && !seen.has(u)) {
        seen.add(u);
        arr.push(u);
      }
    };
    push(vehicle?.image);
    const pool = [
      vehData?.imageUrl,
      ...(Array.isArray(vehData?.images) ? vehData.images : []),
      ...(Array.isArray(vehData?.photos) ? vehData.photos : []),
      ...(Array.isArray(vehData?.gallery) ? vehData.gallery : []),
    ];
    for (const p of pool) {
      if (typeof p === "string") push(p);
      else push(p?.url ?? p?.large ?? p?.medium ?? p?.small);
    }
    return arr.slice(0, 6);
  })();

  // Breakdown de preço · defensivo
  const priceBreakdown: Array<{ label: string; value: string }> = (() => {
    const out: Array<{ label: string; value: string }> = [];
    const lines: any[] =
      (Array.isArray(sumData?.priceBreakdown) && sumData.priceBreakdown) ||
      (Array.isArray(sumData?.breakdown) && sumData.breakdown) ||
      (Array.isArray(sumData?.charges) && sumData.charges) ||
      (Array.isArray(sumData?.summary?.items) && sumData.summary.items) ||
      [];
    for (const l of lines) {
      const label = l?.label ?? l?.name ?? l?.title;
      const value = l?.value ?? l?.display ?? l?.amount?.display ?? l?.price?.display;
      if (label && value) out.push({ label: String(label), value: String(value) });
    }
    return out;
  })();

  const totalDisplay = pickPriceText(sumData) ?? pickPriceText(vehData);
  const currency = vehicle?.currency ?? "BRL";

  const supplierName =
    supData?.name ?? supData?.supplier?.name ?? vehicle?.supplier?.name;
  const supplierRating =
    supData?.rating?.score ??
    supData?.rating ??
    vehicle?.supplier?.rating;
  const supplierReviews =
    supData?.rating?.numberOfRatings ??
    supData?.reviewsCount ??
    vehicle?.supplier?.reviewsCount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-3 flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base font-semibold truncate pr-4">
            {vehicle?.name ?? "Detalhes do veículo"}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>

        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-champagne-logo" />
          </div>
        )}

        {anyError && !isLoading && (
          <div className="p-6 text-sm text-destructive">
            Não foi possível carregar todos os detalhes. {(anyError as Error).message}
          </div>
        )}

        {!isLoading && (
          <div className="p-4 sm:p-6 space-y-6">
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg overflow-hidden">
                {photos.map((url, i) => (
                  <div
                    key={url + i}
                    className={
                      i === 0
                        ? "col-span-2 sm:row-span-2 aspect-[4/3] sm:aspect-square bg-muted"
                        : "aspect-square bg-muted"
                    }
                  >
                    <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}

            {/* Specs */}
            <div className="flex flex-wrap gap-2">
              {vehicle?.category && <Badge variant="outline">{vehicle.category}</Badge>}
              {vehicle?.seats !== undefined && (
                <Badge variant="outline" className="gap-1">
                  <Users className="h-3 w-3" /> {vehicle.seats} passageiros
                </Badge>
              )}
              {vehicle?.bags !== undefined && (
                <Badge variant="outline" className="gap-1">
                  <Briefcase className="h-3 w-3" /> {vehicle.bags} malas
                </Badge>
              )}
              {vehicle?.transmission && (
                <Badge variant="outline" className="gap-1">
                  <Cog className="h-3 w-3" /> {vehicle.transmission}
                </Badge>
              )}
              {vehicle?.airConditioning && (
                <Badge variant="outline" className="gap-1">
                  <Snowflake className="h-3 w-3" /> A/C
                </Badge>
              )}
              {vehicle?.fuelType && (
                <Badge variant="outline" className="gap-1">
                  <Fuel className="h-3 w-3" /> {vehicle.fuelType}
                </Badge>
              )}
              {vehicle?.freeCancellation && (
                <Badge className="bg-emerald-600/90 text-white border-0 gap-1">
                  <ShieldCheck className="h-3 w-3" /> Cancelamento grátis
                </Badge>
              )}
            </div>

            {/* Locadora */}
            {(supplierName || supplierRating) && (
              <Card className="p-4 space-y-2">
                <div className="flex items-center gap-3">
                  {(vehicle?.supplier?.logo || supData?.logoUrl) && (
                    <img
                      src={vehicle?.supplier?.logo ?? supData?.logoUrl}
                      alt={supplierName ?? ""}
                      className="h-8 w-auto object-contain"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {supplierName ?? "Locadora"}
                    </div>
                    {typeof supplierRating === "number" && (
                      <div className="text-xs text-muted-foreground flex items-center gap-1">
                        <Star className="h-3 w-3 fill-current text-amber-500" />
                        {Number(supplierRating).toFixed(1)}
                        {supplierReviews && <span>· {Number(supplierReviews).toLocaleString("pt-BR")} avaliações</span>}
                      </div>
                    )}
                  </div>
                </div>
                {vehicle?.pickUpAddress && (
                  <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>{vehicle.pickUpAddress}</span>
                  </div>
                )}
                {Array.isArray(supData?.highlights) && supData.highlights.length > 0 && (
                  <ul className="grid gap-1 sm:grid-cols-2 pt-1">
                    {supData.highlights.slice(0, 6).map((h: any, i: number) => (
                      <li key={i} className="text-xs text-muted-foreground flex gap-2">
                        <span className="text-champagne-logo">·</span>
                        {typeof h === "string" ? h : h?.text ?? h?.label ?? ""}
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            )}

            {/* O que está incluso */}
            {Array.isArray(vehData?.includedItems ?? vehData?.included) && (vehData.includedItems ?? vehData.included).length > 0 && (
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">O que está incluso</h4>
                <ul className="grid gap-1 sm:grid-cols-2">
                  {(vehData.includedItems ?? vehData.included).map((it: any, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <span className="text-champagne-logo">·</span>
                      {typeof it === "string" ? it : it?.text ?? it?.label ?? ""}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Breakdown de preço */}
            {priceBreakdown.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Resumo do preço</h4>
                <div className="rounded-lg border border-border/60 divide-y">
                  {priceBreakdown.map((l, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-muted-foreground">{l.label}</span>
                      <span className="font-medium">{l.value}</span>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Total sticky */}
            <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 mt-4 bg-background/95 backdrop-blur border-t px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Total estimado
                </div>
                <div className="text-lg font-bold">
                  {totalDisplay ?? formatMoney(vehicle?.totalPrice, currency) ?? "Consultar"}
                </div>
              </div>
              <span className="text-xs text-muted-foreground text-right max-w-[60%]">
                Cotação Booking.com · confirme disponibilidade e taxas antes de reservar.
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
