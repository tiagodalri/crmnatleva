import { useState } from "react";
import { Star, Clock, MapPin, ShieldCheck, Loader2, X, Calendar, Copy, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useAttractionDetails,
  useAttractionReviews,
  useAttractionAvailabilityCalendar,
  useAttractionAvailability,
} from "@/hooks/useBookingAttractions";
import {
  formatAttractionPrice,
  type AttractionProduct,
} from "./attractionTypes";

interface Props {
  product: AttractionProduct | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function AttractionDetailDrawer({ product, open, onOpenChange }: Props) {
  const slug = product?.slug ?? null;
  const productId = product?.id ?? null;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const { data: details, isLoading: loadingDetails, error: detailsError } =
    useAttractionDetails(slug, open && !!slug);
  const { data: reviews } = useAttractionReviews(productId, open && !!productId);
  const { data: calendar } = useAttractionAvailabilityCalendar(
    productId,
    open && !!productId,
  );
  const { data: slots, isLoading: loadingSlots } = useAttractionAvailability(
    slug,
    selectedDate,
    open && !!slug && !!selectedDate,
  );

  const merged = { ...(product ?? {}), ...(details ?? {}) } as any;

  const rating =
    merged?.reviewsStats?.combinedNumericStats?.average ??
    product?.reviewsStats?.combinedNumericStats?.average;
  const reviewsCount =
    merged?.reviewsStats?.allReviewsCount ??
    product?.reviewsStats?.allReviewsCount;
  const price = formatAttractionPrice(
    merged?.representativePrice ?? product?.representativePrice,
  );

  const photos: string[] = (() => {
    const arr: string[] = [];
    const primary =
      merged?.primaryPhoto?.large ??
      merged?.primaryPhoto?.medium ??
      merged?.primaryPhoto?.small;
    if (primary) arr.push(primary);
    const list = Array.isArray(merged?.photos) ? merged.photos : [];
    for (const p of list) {
      const u = p?.large ?? p?.medium ?? p?.small ?? p?.url;
      if (u && !arr.includes(u)) arr.push(u);
    }
    return arr.slice(0, 8);
  })();

  const availableDays = (calendar ?? []).filter((d) => d.available).slice(0, 14);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 gap-0">
        <DialogHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-6 py-3 flex-row items-center justify-between space-y-0">
          <DialogTitle className="text-base font-semibold truncate pr-4">
            {product?.name ?? "Detalhes da atração"}
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

        {loadingDetails && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-champagne-logo" />
          </div>
        )}

        {detailsError && !loadingDetails && (
          <div className="p-6 text-sm text-destructive">
            Não foi possível carregar os detalhes.{" "}
            {(detailsError as Error).message}
          </div>
        )}

        {!loadingDetails && (
          <div className="p-4 sm:p-6 space-y-6">
            {photos.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-lg overflow-hidden">
                {photos.map((url, i) => (
                  <div
                    key={url + i}
                    className={
                      i === 0
                        ? "col-span-2 sm:row-span-2 aspect-[4/3] sm:aspect-square bg-muted relative"
                        : "aspect-square bg-muted relative"
                    }
                  >
                    <img
                      src={url}
                      alt={product?.name ?? "Foto da atração"}
                      loading="lazy"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
                      }}
                    />
                  </div>
                ))}
              </div>
            )}


            <div className="flex flex-wrap items-center gap-2">
              {typeof rating === "number" && (
                <Badge className="bg-champagne-logo/15 text-champagne-logo border-0 gap-1">
                  <Star className="h-3 w-3 fill-current" />
                  {rating.toFixed(1)}
                </Badge>
              )}
              {typeof reviewsCount === "number" && reviewsCount > 0 && (
                <span className="text-xs text-muted-foreground">
                  {reviewsCount.toLocaleString("pt-BR")} avaliações
                </span>
              )}
              {merged?.typicalDurationFormatted && (
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {merged.typicalDurationFormatted}
                </Badge>
              )}
              {merged?.cancellationPolicy?.hasFreeCancellation && (
                <Badge className="bg-emerald-600/90 text-white border-0 gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Cancelamento grátis
                </Badge>
              )}
              {merged?.ufiDetails?.bCityName && (
                <Badge variant="outline" className="gap-1">
                  <MapPin className="h-3 w-3" />
                  {merged.ufiDetails.bCityName}
                </Badge>
              )}
            </div>

            {(merged?.description || merged?.shortDescription) && (
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Sobre a atração</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                  {merged.description ?? merged.shortDescription}
                </p>
              </section>
            )}

            {Array.isArray(merged?.whatsIncluded) &&
              merged.whatsIncluded.length > 0 && (
                <section className="space-y-2">
                  <h4 className="text-sm font-semibold">O que está incluso</h4>
                  <ul className="grid gap-1 sm:grid-cols-2">
                    {merged.whatsIncluded.map((item: string, i: number) => (
                      <li
                        key={i}
                        className="text-sm text-muted-foreground flex gap-2 items-start"
                      >
                        <span className="text-champagne-logo mt-0.5">·</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

            {availableDays.length > 0 && (
              <section className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-champagne-logo" />
                  Próximas datas disponíveis
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {availableDays.map((d) => {
                    const isSel = selectedDate === d.date;
                    return (
                      <button
                        type="button"
                        key={d.date}
                        onClick={() => setSelectedDate(isSel ? null : d.date)}
                        className={cn(
                          "text-xs rounded px-2 py-1 border transition",
                          isSel
                            ? "bg-champagne-logo text-white border-champagne-logo"
                            : "bg-muted/60 border-border/60 hover:border-champagne-logo hover:text-champagne-logo",
                        )}
                      >
                        {new Date(d.date + "T00:00:00").toLocaleDateString(
                          "pt-BR",
                          { day: "2-digit", month: "short" },
                        )}
                      </button>
                    );
                  })}
                </div>

                {selectedDate && (
                  <div className="space-y-2 pt-2 border-t border-border/60">
                    <div className="text-xs text-muted-foreground">
                      Horários e preços em{" "}
                      <span className="font-medium text-foreground">
                        {new Date(selectedDate + "T00:00:00").toLocaleDateString("pt-BR", {
                          day: "2-digit", month: "long", year: "numeric",
                        })}
                      </span>
                    </div>

                    {loadingSlots && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" /> Buscando horários…
                      </div>
                    )}

                    {!loadingSlots && (!slots || slots.length === 0) && (
                      <div className="text-xs text-muted-foreground">
                        Nenhum horário retornado para essa data.
                      </div>
                    )}

                    {!loadingSlots && slots && slots.length > 0 && (
                      <div className="space-y-3">
                        {slots.map((s, si) => {
                          const timeLabel = s.fullDay
                            ? "Dia inteiro"
                            : (s.start ?? "").slice(11, 16) || (s.start ?? "Horário");
                          return (
                            <div
                              key={(s.timeSlotId ?? "") + si}
                              className="border border-border/60 rounded-lg p-3 space-y-2"
                            >
                              <div className="flex items-center justify-between">
                                <div className="text-sm font-semibold flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5 text-champagne-logo" />
                                  {timeLabel}
                                </div>
                              </div>

                              {(s.timeSlotOffers ?? []).map((offer, oi) => {
                                const benefitLabels: string[] = [];
                                if (offer.benefits) {
                                  if (offer.benefits.skipTheLine) benefitLabels.push("Sem fila");
                                  if (offer.benefits.freeAudioGuide) benefitLabels.push("Áudio-guia grátis");
                                  if (offer.benefits.freeCancellation) benefitLabels.push("Cancelamento grátis");
                                  if (offer.benefits.mobileTicket) benefitLabels.push("Ingresso no celular");
                                }
                                const copyKey = `${s.timeSlotId ?? si}-${offer.id ?? oi}`;
                                const buildCopy = () => {
                                  const linhas: string[] = [];
                                  linhas.push(`${product?.name ?? "Atração"}`);
                                  linhas.push(`Data: ${new Date(selectedDate + "T00:00:00").toLocaleDateString("pt-BR")}`);
                                  linhas.push(`Horário: ${timeLabel}`);
                                  if (benefitLabels.length) linhas.push(`Inclui: ${benefitLabels.join(" · ")}`);
                                  for (const it of offer.items ?? []) {
                                    const val = it.price?.publicAmount ?? it.price?.chargeAmount;
                                    const cur = it.price?.currency ?? "BRL";
                                    const label = it.label ?? it.constraint?.label ?? "Ingresso";
                                    if (typeof val === "number") {
                                      const money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur }).format(val);
                                      linhas.push(`· ${label}: ${money}`);
                                    } else {
                                      linhas.push(`· ${label}`);
                                    }
                                  }
                                  if (offer.items?.[0]?.cancellationPolicy?.hasFreeCancellation) {
                                    linhas.push("Cancelamento grátis");
                                  }
                                  return linhas.join("\n");
                                };
                                const handleCopy = async () => {
                                  try {
                                    await navigator.clipboard.writeText(buildCopy());
                                    setCopiedKey(copyKey);
                                    toast.success("Copiado para a proposta");
                                    setTimeout(() => setCopiedKey((k) => (k === copyKey ? null : k)), 2000);
                                  } catch {
                                    toast.error("Não foi possível copiar");
                                  }
                                };

                                return (
                                  <div key={copyKey} className="space-y-2 pt-1">
                                    {benefitLabels.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {benefitLabels.map((b) => (
                                          <Badge key={b} variant="outline" className="text-[10px]">
                                            {b}
                                          </Badge>
                                        ))}
                                      </div>
                                    )}
                                    {(offer.items ?? []).length > 0 && (
                                      <ul className="text-sm space-y-1">
                                        {offer.items!.map((it, ii) => {
                                          const val = it.price?.publicAmount ?? it.price?.chargeAmount;
                                          const cur = it.price?.currency ?? "BRL";
                                          const money = typeof val === "number"
                                            ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: cur }).format(val)
                                            : "";
                                          return (
                                            <li key={ii} className="flex items-center justify-between gap-3">
                                              <span className="text-muted-foreground">
                                                {it.label ?? it.constraint?.label ?? "Ingresso"}
                                              </span>
                                              <span className="font-semibold">{money || "Consultar"}</span>
                                            </li>
                                          );
                                        })}
                                      </ul>
                                    )}
                                    <div className="flex justify-end">
                                      <Button size="sm" variant="outline" className="h-7 gap-1" onClick={handleCopy}>
                                        {copiedKey === copyKey ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                        Copiar para proposta
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}

            {Array.isArray(reviews) && reviews.length > 0 && (
              <section className="space-y-2">
                <h4 className="text-sm font-semibold">Avaliações recentes</h4>
                <div className="space-y-3">
                  {reviews.slice(0, 4).map((r, i) => (
                    <div
                      key={String(r.id ?? i)}
                      className="border border-border/60 rounded-lg p-3 space-y-1"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-medium">
                          {r.author?.name ?? "Viajante"}
                        </span>
                        {typeof r.numericRating === "number" && (
                          <Badge className="bg-champagne-logo/15 text-champagne-logo border-0 gap-1 text-[10px]">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            {r.numericRating.toFixed(1)}
                          </Badge>
                        )}
                      </div>
                      {r.content && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {r.content}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            <div className="sticky bottom-0 -mx-4 sm:-mx-6 -mb-4 sm:-mb-6 mt-4 bg-background/95 backdrop-blur border-t px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  A partir de
                </div>
                <div className="text-lg font-bold">{price || "Consultar"}</div>
              </div>
              <span className="text-xs text-muted-foreground text-right max-w-[60%]">
                Cotação Booking.com · consultar disponibilidade final antes de reservar.
              </span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
