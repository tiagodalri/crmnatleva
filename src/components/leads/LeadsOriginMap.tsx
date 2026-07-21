import { useMemo, useState, useCallback, useRef } from "react";
import { GoogleMap, useLoadScript, MarkerF, InfoWindowF } from "@react-google-maps/api";
import { Loader2, MapPin, Flame, Users as UsersIcon, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface LeadMapPin {
  key: string;
  name: string;
  city?: string | null;
  country?: string | null;
  lat: number;
  lng: number;
  temperature: "hot" | "warm" | "cold";
  isClient: boolean;
  pipeline: number;
}

const containerStyle = { width: "100%", height: "100%" };

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

const LIBRARIES: ("places")[] = ["places"];

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function pinColor(p: LeadMapPin): string {
  if (p.isClient) return "#10b981"; // cliente = verde
  if (p.temperature === "hot") return "#ef4444"; // vermelho
  if (p.temperature === "warm") return "#f59e0b"; // âmbar
  return "#64748b"; // slate frio
}

interface Props {
  pins: LeadMapPin[];
  onPinClick?: (key: string) => void;
  className?: string;
}

export function LeadsOriginMap({ pins, onPinClick, className }: Props) {
  const apiKey = (import.meta as { env?: Record<string, string> }).env?.VITE_GOOGLE_MAPS_API_KEY;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey ?? "",
    libraries: LIBRARIES,
  });
  const [selected, setSelected] = useState<string | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);

  const bounds = useMemo(() => {
    if (pins.length < 2) return null;
    return pins.reduce(
      (acc, w) => ({
        min: { lat: Math.min(acc.min.lat, w.lat), lng: Math.min(acc.min.lng, w.lng) },
        max: { lat: Math.max(acc.max.lat, w.lat), lng: Math.max(acc.max.lng, w.lng) },
      }),
      { min: { lat: 90, lng: 180 }, max: { lat: -90, lng: -180 } },
    );
  }, [pins]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (bounds && pins.length >= 2) {
        const b = new google.maps.LatLngBounds(bounds.min, bounds.max);
        map.fitBounds(b, 60);
      } else if (pins.length === 1) {
        map.setCenter({ lat: pins[0].lat, lng: pins[0].lng });
        map.setZoom(6);
      }
    },
    [bounds, pins],
  );

  const pinById = useMemo(() => {
    const m = new Map<string, LeadMapPin>();
    pins.forEach((p) => m.set(p.key, p));
    return m;
  }, [pins]);

  if (!apiKey) {
    return (
      <div className={cn("flex items-center justify-center rounded-2xl bg-muted/40 text-xs text-muted-foreground", className)}>
        Configure VITE_GOOGLE_MAPS_API_KEY.
      </div>
    );
  }
  if (loadError) {
    return (
      <div className={cn("flex items-center justify-center rounded-2xl bg-destructive/10 text-xs text-destructive", className)}>
        Erro ao carregar Google Maps.
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className={cn("flex items-center justify-center rounded-2xl bg-muted/40", className)}>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (pins.length === 0) {
    return (
      <div className={cn("flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border/40 bg-muted/20 text-xs text-muted-foreground", className)}>
        <MapPin className="h-5 w-5" />
        Nenhum lead com localização no período.
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-2xl border border-border/40 relative", className)}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat: -14.235, lng: -51.9253 }}
        zoom={3}
        onLoad={onMapLoad}
        options={{
          styles: MAP_STYLES,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
        }}
      >
        {pins.map((p) => {
          const color = pinColor(p);
          const scale = p.isClient ? 9 : p.temperature === "hot" ? 9 : p.temperature === "warm" ? 7 : 5.5;
          const icon: google.maps.Symbol = {
            path: google.maps.SymbolPath.CIRCLE,
            scale,
            fillColor: color,
            fillOpacity: 0.9,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          };
          return (
            <MarkerF
              key={p.key}
              position={{ lat: p.lat, lng: p.lng }}
              title={p.name}
              icon={icon}
              onClick={() => {
                setSelected(p.key);
                onPinClick?.(p.key);
              }}
            />
          );
        })}
        {selected && pinById.get(selected) && (
          <InfoWindowF
            position={{ lat: pinById.get(selected)!.lat, lng: pinById.get(selected)!.lng }}
            onCloseClick={() => setSelected(null)}
          >
            <div className="px-1 py-0.5 text-slate-900 space-y-0.5" style={{ minWidth: 160 }}>
              <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                {pinById.get(selected)!.isClient ? (
                  <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                ) : pinById.get(selected)!.temperature === "hot" ? (
                  <Flame className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                )}
                {pinById.get(selected)!.name}
              </div>
              <div className="text-[11px] text-slate-600">
                {[pinById.get(selected)!.city, pinById.get(selected)!.country].filter(Boolean).join(", ") || "—"}
              </div>
              {pinById.get(selected)!.pipeline > 0 && (
                <div className="text-[11px] font-semibold text-slate-800">
                  {BRL(pinById.get(selected)!.pipeline)} em pipeline
                </div>
              )}
            </div>
          </InfoWindowF>
        )}
      </GoogleMap>

      {/* Legenda */}
      <div className="absolute bottom-2 left-2 flex flex-wrap gap-1.5 rounded-lg bg-background/90 backdrop-blur px-2 py-1.5 text-[10px] font-medium shadow border border-border/40">
        <LegendDot color="#10b981" label="Cliente" />
        <LegendDot color="#ef4444" label="Quente" />
        <LegendDot color="#f59e0b" label="Morno" />
        <LegendDot color="#64748b" label="Frio" />
      </div>
      <div className="absolute top-2 right-2 rounded-lg bg-background/90 backdrop-blur px-2 py-1 text-[10px] font-semibold shadow border border-border/40 flex items-center gap-1">
        <UsersIcon className="w-3 h-3" /> {pins.length} pino{pins.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1">
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: color }} />
      <span className="text-foreground">{label}</span>
    </span>
  );
}
