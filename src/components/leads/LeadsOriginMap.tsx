import { useMemo, useState, useCallback, useRef } from "react";
import { GoogleMap, useLoadScript, OverlayViewF, OverlayView } from "@react-google-maps/api";
import { Loader2, MapPin, Flame, Users as UsersIcon, Trophy, Eye } from "lucide-react";
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
  /** Foto (WhatsApp/gravatar). Se ausente, exibimos iniciais. */
  photo?: string | null;
  /** Lucro potencial. Se null/0 mostramos "Custo não informado". */
  profit?: number | null;
  /** Último título visualizado (proposta/produto). */
  viewing?: string | null;
  /** Última atividade ISO. */
  lastAt?: string | null;
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

function ringColor(p: LeadMapPin): string {
  if (p.isClient) return "#10b981"; // cliente
  if (p.temperature === "hot") return "#ef4444";
  if (p.temperature === "warm") return "#f59e0b";
  return "#64748b";
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function relTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `há ${days} d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `há ${months} mês${months > 1 ? "es" : ""}`;
  const y = Math.floor(months / 12);
  return `há ${y} ano${y > 1 ? "s" : ""}`;
}

function exactDate(iso?: string | null): string {
  if (!iso) return "";
  try {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR");
  } catch {
    return "";
  }
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
  const [hovered, setHovered] = useState<string | null>(null);
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

  const active = hovered || selected;
  const activePin = active ? pinById.get(active) : null;

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
          const color = ringColor(p);
          const size = p.isClient || p.temperature === "hot" ? 34 : p.temperature === "warm" ? 30 : 26;
          return (
            <OverlayViewF
              key={p.key}
              position={{ lat: p.lat, lng: p.lng }}
              mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
              getPixelPositionOffset={(w, h) => ({ x: -(w / 2), y: -(h / 2) })}
            >
              <div
                onMouseEnter={() => setHovered(p.key)}
                onMouseLeave={() => setHovered((cur) => (cur === p.key ? null : cur))}
                onClick={() => {
                  setSelected(p.key);
                  onPinClick?.(p.key);
                }}
                style={{
                  width: size,
                  height: size,
                  borderRadius: "9999px",
                  padding: 2,
                  background: color,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.28)",
                  cursor: "pointer",
                  transition: "transform 120ms ease",
                  transform: active === p.key ? "scale(1.15)" : "scale(1)",
                }}
                title={p.name}
              >
                <div
                  style={{
                    width: "100%",
                    height: "100%",
                    borderRadius: "9999px",
                    background: "#ffffff",
                    overflow: "hidden",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0f172a",
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "system-ui, -apple-system, sans-serif",
                  }}
                >
                  {p.photo ? (
                    <img
                      src={p.photo}
                      alt=""
                      width={size - 4}
                      height={size - 4}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      loading="lazy"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : (
                    <span>{initials(p.name)}</span>
                  )}
                </div>
              </div>
            </OverlayViewF>
          );
        })}

        {activePin && (
          <InfoWindowF
            position={{ lat: activePin.lat, lng: activePin.lng }}
            onCloseClick={() => setSelected(null)}
            options={{ pixelOffset: new google.maps.Size(0, -22), disableAutoPan: true }}
          >
            <div className="px-1 py-0.5 text-slate-900 space-y-1" style={{ minWidth: 200, maxWidth: 260 }}>
              <div className="flex items-center gap-1.5 text-[13px] font-semibold">
                {activePin.isClient ? (
                  <Trophy className="h-3.5 w-3.5 text-emerald-600" />
                ) : activePin.temperature === "hot" ? (
                  <Flame className="h-3.5 w-3.5 text-red-500" />
                ) : (
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                )}
                <span className="truncate">{activePin.name}</span>
              </div>
              {activePin.viewing && (
                <div className="text-[10.5px] text-slate-700">
                  <span className="text-slate-500">Vendo:</span> <span className="font-medium">{activePin.viewing}</span>
                </div>
              )}
              <div className="text-[10.5px] text-slate-600">
                {[activePin.city, activePin.country].filter(Boolean).join(", ") || "—"}
              </div>
              <div className="flex flex-wrap gap-x-2 gap-y-0.5 text-[10.5px] pt-0.5 border-t border-slate-200">
                {activePin.pipeline > 0 && (
                  <span className="font-semibold text-slate-800">{BRL(activePin.pipeline)}</span>
                )}
                {typeof activePin.profit === "number" && activePin.profit > 0 ? (
                  <span className="text-emerald-700 font-medium">~{BRL(activePin.profit)} lucro</span>
                ) : (
                  <span className="text-slate-500">Custo não informado</span>
                )}
              </div>
              {activePin.lastAt && (
                <div className="text-[10px] text-slate-500">
                  {relTime(activePin.lastAt)} · {exactDate(activePin.lastAt)}
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
