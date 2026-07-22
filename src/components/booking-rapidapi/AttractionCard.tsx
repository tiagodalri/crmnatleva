import { Star, Clock, ShieldCheck, ImageOff } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  formatAttractionPrice,
  type AttractionProduct,
} from "./attractionTypes";

interface Props {
  product: AttractionProduct;
  onClick?: () => void;
  className?: string;
}

export function AttractionCard({ product, onClick, className }: Props) {
  const photo =
    product.primaryPhoto?.large ??
    product.primaryPhoto?.medium ??
    product.primaryPhoto?.small;

  const rating = product.reviewsStats?.combinedNumericStats?.average;
  const reviewsCount =
    product.reviewsStats?.allReviewsCount ??
    product.reviewsStats?.combinedNumericStats?.total;
  const price = formatAttractionPrice(product.representativePrice);
  const freeCancel = product.cancellationPolicy?.hasFreeCancellation;

  return (
    <Card
      onClick={onClick}
      className={cn(
        "group overflow-hidden cursor-pointer flex flex-col h-full",
        "border-border/60 hover:border-champagne-logo/60 hover:shadow-lg",
        "transition-all duration-300",
        className,
      )}
    >
      <div className="relative aspect-[4/3] bg-muted overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt={product.name ?? "Atração"}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <ImageOff className="h-8 w-8" />
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge className="bg-black/70 backdrop-blur text-white border-0 text-[10px] tracking-wider uppercase">
            Booking.com
          </Badge>
        </div>
        {freeCancel && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-emerald-600/90 text-white border-0 text-[10px] gap-1">
              <ShieldCheck className="h-3 w-3" />
              Cancelamento grátis
            </Badge>
          </div>
        )}
      </div>

      <div className="p-3 flex flex-col gap-2 flex-1">
        {product.taxonomySlug && (
          <span className="text-[10px] uppercase tracking-wider text-champagne-logo/90 font-medium truncate">
            {product.taxonomySlug.replace(/-/g, " ")}
          </span>
        )}
        <h3 className="text-sm font-semibold leading-snug line-clamp-2 min-h-[2.5rem]">
          {product.name ?? "Atração"}
        </h3>

        {(rating || reviewsCount) && (
          <div className="flex items-center gap-1.5 text-xs">
            {typeof rating === "number" && (
              <span className="inline-flex items-center gap-1 rounded bg-champagne-logo/15 text-champagne-logo px-1.5 py-0.5 font-semibold">
                <Star className="h-3 w-3 fill-current" />
                {rating.toFixed(1)}
              </span>
            )}
            {typeof reviewsCount === "number" && reviewsCount > 0 && (
              <span className="text-muted-foreground">
                {reviewsCount.toLocaleString("pt-BR")} avaliações
              </span>
            )}
          </div>
        )}

        {product.typicalDurationFormatted && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {product.typicalDurationFormatted}
          </div>
        )}

        <div className="mt-auto pt-2 flex items-end justify-between gap-2 border-t border-border/60">
          <div className="min-w-0">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              A partir de
            </div>
            <div className="text-base font-bold text-foreground truncate">
              {price || "Consultar"}
            </div>
          </div>
          <span className="text-[11px] text-champagne-logo font-medium whitespace-nowrap">
            Ver detalhes →
          </span>
        </div>
      </div>
    </Card>
  );
}
