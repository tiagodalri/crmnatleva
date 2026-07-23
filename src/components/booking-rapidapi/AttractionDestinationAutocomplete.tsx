import { useState, useEffect, useRef } from "react";
import { Search, Loader2, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useAttractionLocationSearch } from "@/hooks/useBookingAttractions";
import type { AttractionLocation } from "./attractionTypes";

interface Props {
  value: AttractionLocation | null;
  onChange: (loc: AttractionLocation | null) => void;
  placeholder?: string;
  className?: string;
}

export function AttractionDestinationAutocomplete({
  value,
  onChange,
  placeholder = "Ex: Orlando, Paris, Dubai…",
  className,
}: Props) {
  const [text, setText] = useState(value?.label ?? value?.cityName ?? "");
  const [debounced, setDebounced] = useState(text);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(text), 400);
    return () => clearTimeout(t);
  }, [text]);

  const { data: suggestions, isFetching } = useAttractionLocationSearch(
    debounced,
    debounced.length >= 2,
  );

  const pick = (loc: AttractionLocation) => {
    onChange(loc);
    setText(loc.label || loc.cityName || String(loc.id));
    setOpen(false);
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open && debounced.length >= 2} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setOpen(true);
                if (value) onChange(null);
              }}
              onFocus={() => setOpen(true)}
              placeholder={placeholder}
              className="pl-9 pr-9 h-11"
              autoComplete="off"
            />
            {isFetching && (
              <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </PopoverTrigger>
        <PopoverContent
          className="w-[var(--radix-popover-trigger-width)] p-0"
          align="start"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="max-h-80 overflow-y-auto py-1">
            {!suggestions?.length && !isFetching && debounced.length >= 2 && (
              <div className="px-3 py-4 text-sm text-muted-foreground text-center">
                Nenhum destino encontrado.
              </div>
            )}
            {suggestions?.map((s) => (
              <button
                key={`${s.id}-${s.productType ?? ""}`}
                type="button"
                onClick={() => pick(s)}
                className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-muted transition-colors"
              >
                <MapPin className="h-4 w-4 mt-0.5 text-champagne-logo shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">
                    {s.cityName || s.label}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {[s.country, s.productCount ? `${s.productCount} atrações` : null]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
