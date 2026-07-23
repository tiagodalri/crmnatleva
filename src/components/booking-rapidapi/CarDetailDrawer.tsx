import {
  Loader2,
  X,
  Users,
  Briefcase,
  Cog,
  Snowflake,
  Fuel,
  Star,
  ShieldCheck,
  MapPin,
  Building2,
  Gauge,
  Plus,
  ClipboardList,
  ExternalLink,
  Clock,
  Phone,
  Mail,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  useCarVehicleDetails,
  useCarSupplierDetails,
  useCarBookingSummary,
  type CarVehicle,
} from "@/hooks/useBookingCars";
import {
  tCategory,
  tTransmission,
  tFuelPolicy,
  tBaggage,
  tMileage,
  tExtra,
  tChecklist,
  tBreakdown,
  tFee,
  tFreeCancellation,
  tGroupOrSimilar,
  tGeneric,
  CAR_IMAGE_PLACEHOLDER,
  hasMultipleDistinctPhotos,
} from "@/lib/carRentalI18n";

interface Props {
  vehicle: CarVehicle | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

// Booking devolve alguns textos com <b>...</b> inline. Neutralizamos sem HTML injection.
function stripInlineTags(s: unknown): string {
  if (typeof s !== "string") return "";
  return s.replace(/<\/?[a-z][^>]*>/gi, "").replace(/\s+/g, " ").trim();
}

function formatDisplayMoney(p: any): string {
  if (p == null) return "";
  if (typeof p === "string") return p;
  if (typeof p === "number") return String(p);
  if (typeof p !== "object") return "";
  // Common Booking shapes:
  // { display: "US$59" } | { displayValue: "US$59", rawValue: 59 }
  // { value, currency } | { amount, currency }
  // { price: <anything above> } | { primaryPrice: { price } }
  const disp = p.display ?? p.displayValue ?? p.text ?? p.label ?? p.displayPrice;
  if (typeof disp === "string") return disp;
  if (disp && typeof disp === "object") {
    const nested = formatDisplayMoney(disp);
    if (nested) return nested;
  }
  if (p.price && p.price !== p) {
    const nested = formatDisplayMoney(p.price);
    if (nested) return nested;
  }
  if (p.primaryPrice) {
    const nested = formatDisplayMoney(p.primaryPrice);
    if (nested) return nested;
  }
  const value = p.value ?? p.amount ?? p.rawValue;
  const currency = p.currency ?? "";
  if (typeof value === "number") {
    try {
      return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: currency || "USD",
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${currency} ${value.toFixed(2)}`;
    }
  }
  return "";
}

// Garante que qualquer valor que entre no JSX vire string segura
function safeText(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return formatDisplayMoney(v);
}

function specIconFor(icon?: string) {
  const key = (icon ?? "").toUpperCase();
  if (key.includes("AIRCON") || key.includes("AC")) return <Snowflake className="h-3.5 w-3.5" />;
  if (key.includes("TRANSMISSION")) return <Cog className="h-3.5 w-3.5" />;
  if (key.includes("BAG") || key.includes("SUITCASE")) return <Briefcase className="h-3.5 w-3.5" />;
  if (key.includes("FUEL")) return <Fuel className="h-3.5 w-3.5" />;
  if (key.includes("MILEAGE") || key.includes("DISTANCE")) return <Gauge className="h-3.5 w-3.5" />;
  if (key.includes("SEAT") || key.includes("PASSENGER")) return <Users className="h-3.5 w-3.5" />;
  return <Info className="h-3.5 w-3.5" />;
}

function translateSpecText(icon: unknown, text: string): string {
  const key = String(icon ?? "").toUpperCase();
  if (!text) return text;
  if (key.includes("TRANSMISSION")) return tTransmission(text);
  if (key.includes("FUEL")) return tFuelPolicy(text);
  if (key.includes("BAG") || key.includes("SUITCASE")) return tBaggage(text);
  if (key.includes("MILEAGE") || key.includes("DISTANCE")) return tMileage(text);
  return text;
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

  // Paths reais confirmados no cache do projeto
  const vehicleObj = vehData?.vehicle ?? {};
  const content = vehData?.content ?? {};
  const depots = vehData?.depots ?? {};
  const extras: any[] = Array.isArray(vehData?.extras) ? vehData.extras : [];
  const packages: any[] = Array.isArray(vehData?.packages) ? vehData.packages : [];
  const whatsIncludedItems: any[] = Array.isArray(vehData?.whatsIncluded?.items)
    ? vehData.whatsIncluded.items
    : [];
  const vehicleSpecs: any[] = Array.isArray(content?.carSpecification?.vehicleSpecs)
    ? content.carSpecification.vehicleSpecs
    : [];
  const pickupChecklist: any[] = Array.isArray(content?.pickupChecklist?.items)
    ? content.pickupChecklist.items
    : [];
  const fullTermsUrl = vehData?.links?.fullRentalTerms?.url as string | undefined;
  const fullTermsLabel = vehData?.links?.fullRentalTerms?.label as string | undefined;
  const otherFees: any[] = Array.isArray(vehicleObj?.fees?.otherFees)
    ? vehicleObj.fees.otherFees
    : [];
  const payableFees: any[] = Array.isArray(vehicleObj?.fees?.payableFees)
    ? vehicleObj.fees.payableFees
    : [];

  // Fotos · combina card + vehicle.imageUrl
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
    push(vehicleObj?.imageUrl);
    return arr.slice(0, 6);
  })();

  // Supplier · versão rica vem em supData.supplier
  const supplier = supData?.supplier ?? {};
  const supplierName: string | undefined =
    supplier?.name ?? content?.carCard?.supplier?.name ?? vehicle?.supplier?.name;
  const supplierLogo: string | undefined =
    supplier?.imageUrl ?? content?.carCard?.supplier?.imageUrl ?? vehicle?.supplier?.logo;
  const supplierRatingAvg: number | undefined =
    typeof supplier?.rating?.average === "number"
      ? supplier.rating.average
      : typeof content?.carCard?.supplier?.rating?.average === "number"
        ? content.carCard.supplier.rating.average
        : vehicle?.supplier?.rating;
  const supplierRatingTitle: string | undefined =
    supplier?.rating?.title ?? content?.carCard?.supplier?.rating?.title;
  const supplierRatingSubtitle: string | undefined =
    supplier?.rating?.subtitle ?? content?.carCard?.supplier?.rating?.subtitle;
  const supplierBreakdown: any[] = Array.isArray(supplier?.rating?.breakdown)
    ? supplier.rating.breakdown
    : [];
  const supplierAddress: string | undefined = supData?.location?.address;
  const supplierParagraphs: any[] = Array.isArray(supData?.furtherInfo?.body?.paragraphs)
    ? supData.furtherInfo.body.paragraphs
    : [];
  const pickUpInstructions: string | undefined = supData?.instructions?.pickUp;
  const openingPick = supData?.openingTimes?.pickUp;
  const openingDrop = supData?.openingTimes?.dropOff;

  // Resumo de preço · sumData.content.priceBreakdown
  const priceContent = sumData?.content ?? {};
  const pbTotal = priceContent?.priceBreakdown?.total;
  const pbSections: any[] = Array.isArray(priceContent?.priceBreakdown?.sections)
    ? priceContent.priceBreakdown.sections
    : [];
  const freeCancellationText: string | undefined = priceContent?.freeCancellation;
  const footerTotalTitle: string | undefined =
    priceContent?.footer?.title ?? formatDisplayMoney(pbTotal?.primaryPrice?.price);
  const footerTotalSubtitle: string | undefined =
    priceContent?.footer?.subtitle ?? pbTotal?.subtitle ?? "Total do aluguel";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-3 flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base font-semibold truncate pr-4">
            {safeText(vehicleObj?.makeAndModel) || safeText(vehicle?.name) || "Detalhes do veículo"}
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
            {(() => {
              const multi = hasMultipleDistinctPhotos(photos);
              if (photos.length === 0) {
                return (
                  <div className="rounded-lg overflow-hidden bg-muted aspect-[16/9] flex items-center justify-center">
                    <img
                      src={CAR_IMAGE_PLACEHOLDER}
                      alt=""
                      className="max-h-full max-w-full object-contain p-6 opacity-80"
                    />
                  </div>
                );
              }
              if (!multi) {
                const url = photos[0];
                return (
                  <div className="rounded-lg overflow-hidden bg-muted aspect-[16/9] flex items-center justify-center">
                    <img
                      src={url}
                      alt=""
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.src = CAR_IMAGE_PLACEHOLDER;
                      }}
                      className="max-h-full max-w-full object-contain p-4"
                    />
                  </div>
                );
              }
              return (
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
                      <img
                        src={url}
                        alt=""
                        loading="lazy"
                        onError={(e) => {
                          e.currentTarget.src = CAR_IMAGE_PLACEHOLDER;
                        }}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Grupo/classe + cancelamento */}
            <div className="flex flex-wrap gap-2">
              {(vehicleObj?.carClass || vehicle?.category) && (
                <Badge variant="outline">{tCategory(safeText(vehicleObj?.carClass) || safeText(vehicle?.category))}</Badge>
              )}
              {vehicleObj?.groupOrSimilar && (
                <Badge variant="outline">{tGroupOrSimilar(stripInlineTags(vehicleObj.groupOrSimilar))}</Badge>
              )}
              {typeof vehicleObj?.rentalDurationInDays === "number" && (
                <Badge variant="outline">
                  {vehicleObj.rentalDurationInDays} {vehicleObj.rentalDurationInDays === 1 ? "dia" : "dias"}
                </Badge>
              )}
              {(vehicleObj?.freeCancellation || vehicle?.freeCancellation) && (
                <Badge className="bg-emerald-600/90 text-white border-0 gap-1">
                  <ShieldCheck className="h-3 w-3" /> Cancelamento grátis
                </Badge>
              )}
            </div>

            {/* Especificações completas · content.carSpecification.vehicleSpecs */}
            {vehicleSpecs.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Especificações</h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {vehicleSpecs.map((s: any, i: number) => {
                    const raw = stripInlineTags(s?.text) || s?.accessibility || "";
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground"
                      >
                        <span className="text-champagne-logo">{specIconFor(s?.icon)}</span>
                        <span className="text-foreground">{translateSpecText(s?.icon, raw)}</span>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* O que está incluído · whatsIncluded.items */}
            {whatsIncludedItems.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">
                  {stripInlineTags(vehData?.whatsIncluded?.title) || "O que está incluído"}
                </h4>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {whatsIncludedItems.map((it: any, i: number) => (
                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                      <ShieldCheck className="h-3.5 w-3.5 mt-0.5 text-emerald-600 shrink-0" />
                      <span className="text-foreground">{stripInlineTags(it?.text)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Retirada e devolução · depots */}
            {(depots?.pickup || depots?.dropoff) && (
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Retirada e devolução</h4>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(["pickup", "dropoff"] as const).map((k) => {
                    const d = depots?.[k];
                    if (!d) return null;
                    const parts = [d.address, d.city, d.country].filter(Boolean).join(", ");
                    return (
                      <Card key={k} className="p-3 space-y-1">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                          {k === "pickup" ? "Retirada" : "Devolução"}
                        </div>
                        <div className="text-sm font-medium flex items-start gap-1.5">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-champagne-logo" />
                          <span>{safeText(d.name) || parts || "—"}</span>
                        </div>
                        {parts && <div className="text-xs text-muted-foreground pl-5">{parts}</div>}
                        {(d.iataCode || d.location_type) && (
                          <div className="text-[11px] text-muted-foreground pl-5">
                            {d.iataCode && <span>Aeroporto {d.iataCode}</span>}
                            {d.iataCode && d.location_type && <span> · </span>}
                            {d.location_type && <span>{String(d.location_type).replace(/_/g, " ").toLowerCase()}</span>}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Adicionais disponíveis · extras */}
            {extras.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Adicionais disponíveis (pagos no balcão)</h4>
                <div className="rounded-lg border border-border/60 divide-y">
                  {extras.map((ex: any, i: number) => {
                    const price =
                      formatDisplayMoney(ex?.price?.perRental?.display) ||
                      formatDisplayMoney(ex?.price?.perRental?.base);
                    return (
                      <div key={ex?.id ?? i} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium flex items-center gap-1.5">
                            <Plus className="h-3.5 w-3.5 text-champagne-logo shrink-0" />
                            {tExtra(safeText(ex?.name))}
                          </div>
                          {ex?.detail && (
                            <div className="text-xs text-muted-foreground pl-5">{tGeneric(stripInlineTags(ex.detail))}</div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          {price && <div className="font-semibold">{price}</div>}
                          {ex?.maxQuantityAvailable > 0 && (
                            <div className="text-[10px] text-muted-foreground">
                              até {ex.maxQuantityAvailable}x
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Proteções / Seguros · packages */}
            {packages.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Proteção adicional</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {packages.map((pkg: any, i: number) => {
                    const c = pkg?.content ?? {};
                    const price =
                      formatDisplayMoney(c?.price?.displayPrice) ||
                      formatDisplayMoney(c?.price) ||
                      safeText(c?.price?.label);
                    const annotation = c?.price?.priceAnnotation?.text;
                    return (
                      <Card key={pkg?.id ?? i} className="p-3 space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="text-sm font-semibold flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            Proteção adicional
                          </div>
                          {price && (
                            <div className="text-sm font-bold text-champagne-logo shrink-0">
                              {price}
                            </div>
                          )}
                        </div>
                        {c?.subtitle && (
                          <div className="text-xs text-muted-foreground">{tGeneric(stripInlineTags(c.subtitle))}</div>
                        )}
                        {c?.description && (
                          <div className="text-xs text-muted-foreground">{tGeneric(stripInlineTags(c.description))}</div>
                        )}
                        {Array.isArray(c?.included) && c.included.length > 0 && (
                          <ul className="text-xs text-muted-foreground space-y-0.5 pt-1">
                            {c.included.slice(0, 6).map((it: any, j: number) => (
                              <li key={j} className="flex gap-1.5">
                                <span className="text-emerald-600">·</span>
                                {tGeneric(stripInlineTags(typeof it === "string" ? it : it?.text))}
                              </li>
                            ))}
                          </ul>
                        )}
                        {annotation && (
                          <div className="text-[11px] text-muted-foreground pt-1">
                            {tGeneric(stripInlineTags(annotation))}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Taxas, depósito e cobranças no balcão · fees */}
            {(otherFees.length > 0 || payableFees.length > 0) && (
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Taxas e depósito</h4>
                <div className="rounded-lg border border-border/60 divide-y">
                  {[...otherFees, ...payableFees].map((f: any, i: number) => {
                    const price =
                      formatDisplayMoney(f?.displayPrice) ||
                      formatDisplayMoney(f?.price) ||
                      "";
                    const included = f?.includedInPrice === true;
                    const alwaysPayable = f?.alwaysPayable === true;
                    return (
                      <div key={i} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                        <div className="min-w-0">
                          <div className="font-medium">{tFee(safeText(f?.name))}</div>
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {included ? (
                              <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-600">
                                incluído no preço
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600">
                                pago no balcão
                              </Badge>
                            )}
                            {alwaysPayable && (
                              <Badge variant="outline" className="text-[10px]">obrigatório</Badge>
                            )}
                            {f?.unlimited && (
                              <Badge variant="outline" className="text-[10px]">ilimitado</Badge>
                            )}
                            {f?.perWhat && (
                              <span className="text-[10px] text-muted-foreground">por {stripInlineTags(f.perWhat)}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right shrink-0 font-semibold">{price}</div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Checklist de retirada · content.pickupChecklist */}
            {pickupChecklist.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1.5">
                  <ClipboardList className="h-4 w-4 text-champagne-logo" />
                  {stripInlineTags(content?.pickupChecklist?.title) || "Antes de retirar"}
                </h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {pickupChecklist.map((it: any, i: number) => (
                    <Card key={i} className="p-3 space-y-1">
                      <div className="text-sm font-medium">{tChecklist(stripInlineTags(it?.title))}</div>
                      {it?.subtitle && (
                        <div className="text-xs text-muted-foreground">{tChecklist(stripInlineTags(it.subtitle))}</div>
                      )}
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {/* Sobre a locadora · supData */}
            {(supplierName || supplierBreakdown.length > 0 || supplierAddress) && (
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Sobre a locadora</h4>
                <Card className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    {supplierLogo && (
                      <img
                        src={supplierLogo}
                        alt={supplierName ?? ""}
                        onError={(e) => { e.currentTarget.style.display = "none"; }}
                        className="h-10 w-auto object-contain"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        {safeText(supplierName) || "Locadora"}
                      </div>
                      {typeof supplierRatingAvg === "number" && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded bg-champagne-logo/15 text-champagne-logo font-bold px-1.5 py-0.5">
                            <Star className="h-3 w-3 fill-current" />
                            {supplierRatingAvg.toFixed(1)}
                          </span>
                          {supplierRatingTitle && <span className="text-foreground font-medium">{supplierRatingTitle}</span>}
                          {supplierRatingSubtitle && <span>· {supplierRatingSubtitle}</span>}
                        </div>
                      )}
                    </div>
                  </div>

                  {supplierBreakdown.length > 0 && (
                    <div className="grid gap-2 sm:grid-cols-2 pt-1">
                      {supplierBreakdown.map((b: any, i: number) => {
                        const score = typeof b?.score === "number" ? b.score : Number(b?.score) || 0;
                        return (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">{tBreakdown(safeText(b?.title))}</span>
                              <span className="font-semibold">
                                {score.toFixed(1)}
                                {b?.localisedRating && <span className="text-muted-foreground font-normal"> · {safeText(b.localisedRating)}</span>}
                              </span>
                            </div>
                            <Progress value={Math.max(0, Math.min(100, (score / 10) * 100))} className="h-1.5" />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {supplierAddress && (
                    <div className="text-xs text-muted-foreground flex items-start gap-1.5">
                      <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                      <span>{supplierAddress}</span>
                    </div>
                  )}

                  {(openingPick || openingDrop) && (
                    <div className="grid gap-2 sm:grid-cols-2 text-xs">
                      {[
                        { label: "Retirada", data: openingPick },
                        { label: "Devolução", data: openingDrop },
                      ]
                        .filter((x) => x.data)
                        .map((x, i) => (
                          <div key={i} className="flex items-start gap-1.5">
                            <Clock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-champagne-logo" />
                            <div>
                              <div className="font-medium text-foreground">
                                {x.label}
                                {x.data?.title && <span className="text-muted-foreground font-normal"> · {safeText(x.data.title)}</span>}
                              </div>
                              {x.data?.hours && <div className="text-muted-foreground">{stripInlineTags(x.data.hours)}</div>}
                              {x.data?.subtitle && <div className="text-muted-foreground">{stripInlineTags(x.data.subtitle)}</div>}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}

                  {pickUpInstructions && (
                    <div className="text-xs text-muted-foreground border-l-2 border-champagne-logo/50 pl-2">
                      <div className="font-semibold text-foreground pb-0.5">Instruções de retirada</div>
                      {stripInlineTags(pickUpInstructions)}
                    </div>
                  )}

                  {supplierParagraphs.length > 0 && (
                    <div className="text-[11px] text-muted-foreground space-y-0.5 pt-1 border-t">
                      {supplierParagraphs.map((p: any, i: number) => {
                        const t = stripInlineTags(p?.text);
                        if (!t) return null;
                        const hasPhone = /(\+?\d[\d\s().-]{6,})/.test(t);
                        const hasMail = /@/.test(t);
                        const Icon = hasMail ? Mail : hasPhone ? Phone : Info;
                        return (
                          <div key={i} className="flex items-start gap-1.5">
                            <Icon className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{t}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>
              </section>
            )}

            {/* Resumo de preço · sumData.content.priceBreakdown */}
            {(pbSections.length > 0 || pbTotal) && (
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Resumo do preço</h4>
                <div className="rounded-lg border border-border/60 overflow-hidden">
                  {pbSections.map((sec: any, si: number) => (
                    <div key={si} className="divide-y">
                      {Array.isArray(sec?.items) &&
                        sec.items.map((it: any, ii: number) => (
                          <div
                            key={ii}
                            className="flex items-start justify-between gap-3 px-3 py-2 text-sm"
                          >
                            <span className="text-muted-foreground">{stripInlineTags(it?.title)}</span>
                            <span className="font-medium shrink-0">
                              {formatDisplayMoney(it?.price)}
                            </span>
                          </div>
                        ))}
                      {sec?.subtotal && (
                        <div className="flex items-center justify-between gap-3 px-3 py-2 text-sm bg-muted/40">
                          <span className="font-medium">{stripInlineTags(sec.subtotal?.title) || "Subtotal"}</span>
                          <span className="font-semibold">
                            {formatDisplayMoney(sec.subtotal?.primaryPrice?.price) ||
                              safeText(sec.subtotal?.primaryPrice?.title)}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                  {pbTotal && (
                    <div className="flex items-center justify-between gap-3 px-3 py-3 text-sm bg-champagne-logo/10 border-t">
                      <div>
                        <div className="font-semibold">{stripInlineTags(pbTotal?.title) || "Total"}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {stripInlineTags(pbTotal?.subtitle) || "(incluindo impostos, taxas e adicionais)"}
                        </div>
                      </div>
                      <div className="text-lg font-bold text-champagne-logo">
                        {formatDisplayMoney(pbTotal?.primaryPrice?.price)}
                      </div>
                    </div>
                  )}
                </div>
                {freeCancellationText && (
                  <div className="text-xs text-emerald-600 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {stripInlineTags(freeCancellationText)}
                  </div>
                )}
              </section>
            )}

            {/* Termos completos */}
            {fullTermsUrl && (
              <div>
                <a
                  href={fullTermsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-champagne-logo hover:underline"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  {fullTermsLabel || "Ver termos completos do aluguel"}
                </a>
              </div>
            )}

            {/* Total sticky */}
            <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 mt-4 bg-background/95 backdrop-blur border-t px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {footerTotalSubtitle}
                </div>
                <div className="text-lg font-bold truncate">
                  {footerTotalTitle || formatDisplayMoney(vehicleObj?.price?.driveAway) || "Consultar"}
                </div>
              </div>
              <span className="text-xs text-muted-foreground text-right max-w-[55%]">
                Cotação Booking.com · confirme disponibilidade e taxas antes de reservar.
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
