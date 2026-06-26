import { lazy, Suspense, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Plane, Hotel, Building2, Map as MapIcon, Car, Package,
  PlaneTakeoff, Sparkles, Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoadingState } from "@/components/ui/loading-state";

// Páginas reais reaproveitadas dentro das abas
const BookingSearchPage = lazy(() => import("@/pages/booking-rapidapi/BookingSearchPage"));
const FlightsSearchPage = lazy(() => import("@/pages/booking-rapidapi/FlightsSearchPage"));
const GoogleFlightsSearchPage = lazy(() => import("@/pages/google-flights/GoogleFlightsSearchPage"));

type TabKey = "aereo" | "aereo-hotel" | "hotel" | "passeios" | "carros" | "pacotes";

const TABS: { key: TabKey; label: string; icon: typeof Plane; available: boolean }[] = [
  { key: "aereo", label: "Aéreo", icon: Plane, available: true },
  { key: "aereo-hotel", label: "Aéreo + Hotel", icon: PlaneTakeoff, available: false },
  { key: "hotel", label: "Hotel", icon: Hotel, available: true },
  { key: "passeios", label: "Passeios", icon: MapIcon, available: false },
  { key: "carros", label: "Carros", icon: Car, available: false },
  { key: "pacotes", label: "Pacotes", icon: Package, available: false },
];

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <Card className="p-10 text-center bg-muted/30 border-dashed">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-champagne-logo/10 text-champagne-logo">
        <Clock className="h-6 w-6" />
      </div>
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mx-auto">{description}</p>
      <Badge variant="outline" className="mt-4 gap-1">
        <Sparkles className="h-3 w-3" />
        Em breve
      </Badge>
    </Card>
  );
}

function AereoTabs() {
  const [params, setParams] = useSearchParams();
  const provider = (params.get("provider") as "google" | "rapid") || "google";

  const setProvider = (next: "google" | "rapid") => {
    const p = new URLSearchParams(params);
    p.set("provider", next);
    p.set("tab", "aereo");
    setParams(p, { replace: true });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wider text-muted-foreground mr-1">
          Fonte
        </span>
        <button
          type="button"
          onClick={() => setProvider("google")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
            provider === "google"
              ? "bg-champagne-logo/15 border-champagne-logo text-champagne-logo"
              : "bg-background border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Google Flights
        </button>
        <button
          type="button"
          onClick={() => setProvider("rapid")}
          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
            provider === "rapid"
              ? "bg-champagne-logo/15 border-champagne-logo text-champagne-logo"
              : "bg-background border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          Busca de Voos
        </button>
      </div>

      <Suspense fallback={<LoadingState />}>
        {provider === "google" ? <GoogleFlightsSearchPage /> : <FlightsSearchPage />}
      </Suspense>
    </div>
  );
}

export default function Buscador() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const tab = (params.get("tab") as TabKey) || "aereo";

  const activeTab = useMemo(
    () => TABS.find((t) => t.key === tab) ?? TABS[0],
    [tab]
  );

  const handleTab = (next: string) => {
    const p = new URLSearchParams(params);
    p.set("tab", next);
    setParams(p, { replace: true });
  };

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      {/* Hero · estilo decolar */}
      <header className="rounded-xl border bg-gradient-to-br from-champagne-logo/10 via-background to-background p-5 sm:p-6">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles className="h-4 w-4 text-champagne-logo" />
          <span className="text-xs uppercase tracking-widest text-champagne-logo font-medium">
            Central de Buscas
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
          Buscador NatLeva
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Cotação de voos, hotéis, pacotes, carros e passeios · tudo num só lugar.
        </p>
      </header>

      {/* Tabs estilo decolar */}
      <Tabs value={tab} onValueChange={handleTab} className="w-full">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="h-auto bg-muted/40 p-1 flex flex-nowrap gap-1 w-max min-w-full sm:w-auto sm:min-w-0">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger
                  key={t.key}
                  value={t.key}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 text-sm data-[state=active]:bg-background data-[state=active]:text-champagne-logo data-[state=active]:shadow-sm whitespace-nowrap"
                >
                  <Icon className="h-4 w-4" />
                  <span>{t.label}</span>
                  {!t.available && (
                    <Badge
                      variant="outline"
                      className="ml-1 text-[10px] px-1.5 py-0 h-4 border-muted-foreground/30 text-muted-foreground"
                    >
                      Em breve
                    </Badge>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        <TabsContent value="aereo" className="mt-5">
          <AereoTabs />
        </TabsContent>

        <TabsContent value="hotel" className="mt-5">
          <Suspense fallback={<LoadingState />}>
            <BookingSearchPage />
          </Suspense>
        </TabsContent>

        <TabsContent value="aereo-hotel" className="mt-5">
          <ComingSoon
            title="Aéreo + Hotel"
            description="Cotação combinada de voo e hospedagem na mesma busca, com economia automática. Estamos integrando."
          />
        </TabsContent>

        <TabsContent value="passeios" className="mt-5">
          <ComingSoon
            title="Passeios e Experiências"
            description="Tours, ingressos e atividades nos principais destinos · em desenvolvimento."
          />
        </TabsContent>

        <TabsContent value="carros" className="mt-5">
          <ComingSoon
            title="Aluguel de Carros"
            description="Cotação de locação por destino, datas e categoria de veículo."
          />
        </TabsContent>

        <TabsContent value="pacotes" className="mt-5">
          <ComingSoon
            title="Pacotes NatLeva"
            description="Pacotes prontos com aéreo, hotel e benefícios exclusivos da agência."
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
