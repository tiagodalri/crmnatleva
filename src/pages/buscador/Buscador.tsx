import { lazy, Suspense, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Plane, Hotel, Car, Package,
  Sparkles, Clock, Ticket,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { LoadingState } from "@/components/ui/loading-state";

// Páginas reais reaproveitadas dentro das abas
const BookingSearchPage = lazy(() => import("@/pages/booking-rapidapi/BookingSearchPage"));
const UnifiedFlightsSearchPage = lazy(() => import("@/pages/unified-flights/UnifiedFlightsSearchPage"));
const AttractionsSearchPage = lazy(() => import("@/pages/booking-rapidapi/AttractionsSearchPage"));
const CarsSearchPage = lazy(() => import("@/pages/booking-rapidapi/CarsSearchPage"));

// IMPORTANTE · usamos `secao` (não `tab`) pra não conflitar com o ?tab=
// interno do Google Flights (list/calendar/discover) e demais filhos.
type Secao = "aereo" | "hotel" | "ingressos" | "carros" | "pacotes";

const SECOES: { key: Secao; label: string; icon: typeof Plane; available: boolean }[] = [
  { key: "aereo", label: "Aéreo", icon: Plane, available: true },
  { key: "hotel", label: "Hotel", icon: Hotel, available: true },
  { key: "ingressos", label: "Ingressos e Passeios", icon: Ticket, available: true },
  { key: "carros", label: "Carros", icon: Car, available: true },
  { key: "pacotes", label: "Pacotes", icon: Package, available: false },
];

function ComingSoon({ title, description }: { title: string; description: string }) {
  return (
    <div className="container mx-auto max-w-7xl px-4 py-10">
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
    </div>
  );
}

function AereoTab() {
  return (
    <Suspense fallback={<div className="p-6"><LoadingState /></div>}>
      <UnifiedFlightsSearchPage />
    </Suspense>
  );
}

export default function Buscador() {
  const [params, setParams] = useSearchParams();
  const secao = (params.get("secao") as Secao) || "aereo";

  const ativa = useMemo(() => SECOES.find((t) => t.key === secao) ?? SECOES[0], [secao]);

  const handleSecao = (next: string) => {
    const p = new URLSearchParams(params);
    p.set("secao", next);
    // ao trocar de aba, limpa params específicos da aba anterior pra evitar lixo
    if (next !== "aereo") {
      p.delete("fonte");
      p.delete("tab"); // ?tab interno do Google Flights
    }
    setParams(p, { replace: true });
  };

  return (
    <div className="space-y-0">
      {/* Hero compacto · estilo decolar */}
      <header className="border-b bg-gradient-to-br from-champagne-logo/10 via-background to-background">
        <div className="container mx-auto max-w-7xl px-4 py-4 sm:py-5">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-4 w-4 text-champagne-logo" />
            <span className="text-xs uppercase tracking-widest text-champagne-logo font-medium">
              Central de Buscas
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">
            Buscador NatLeva
          </h1>
        </div>

        {/* Tabs estilo decolar · grudadas no fim do hero */}
        <div className="container mx-auto max-w-7xl px-4 pb-2">
          <Tabs value={secao} onValueChange={handleSecao}>
            <div className="overflow-x-auto -mx-1 px-1">
              <TabsList className="h-auto bg-muted/40 p-1 flex flex-nowrap gap-1 w-max min-w-full sm:w-auto sm:min-w-0">
                {SECOES.map((t) => {
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
          </Tabs>
        </div>
      </header>

      {/* Conteúdo · cada página embutida já traz seu próprio container/padding */}
      <main>
        {secao === "aereo" && <AereoTab />}
        {secao === "hotel" && (
          <Suspense fallback={<div className="p-6"><LoadingState /></div>}>
            <BookingSearchPage />
          </Suspense>
        )}
        {secao === "ingressos" && (
          <Suspense fallback={<div className="p-6"><LoadingState /></div>}>
            <AttractionsSearchPage />
          </Suspense>
        )}
        {secao === "aereo-hotel" && (
          <ComingSoon
            title="Aéreo + Hotel"
            description="Cotação combinada de voo e hospedagem na mesma busca, com economia automática. Estamos integrando."
          />
        )}
        {secao === "carros" && (
          <Suspense fallback={<div className="p-6"><LoadingState /></div>}>
            <CarsSearchPage />
          </Suspense>
        )}
        {secao === "pacotes" && (
          <ComingSoon
            title="Pacotes NatLeva"
            description="Pacotes prontos com aéreo, hotel e benefícios exclusivos da agência."
          />
        )}
      </main>
    </div>
  );
}
