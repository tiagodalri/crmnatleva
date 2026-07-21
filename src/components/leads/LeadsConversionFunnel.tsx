import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Eye, MousePointerClick, FileText, Trophy, TrendingUp, ArrowRight } from "lucide-react";

const BRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export interface FunnelStage {
  key: string;
  label: string;
  leads: number;
  value: number;
}

export interface UtmRow {
  source: string;
  leads: number;
  pipeline: number;
  soldValue: number;
  soldCount: number;
}

interface Props {
  stages: FunnelStage[];
  utm: UtmRow[];
  onStageClick?: (stage: FunnelStage) => void;
  onUtmClick?: (utm: UtmRow) => void;
}


const STAGE_ICON: Record<string, typeof Eye> = {
  view: Eye,
  engage: MousePointerClick,
  proposal: FileText,
  sale: Trophy,
};

const STAGE_COLOR = [
  { bar: "bg-sky-500", pill: "text-sky-600 dark:text-sky-400", ring: "border-sky-500/30 bg-sky-500/[0.04]" },
  { bar: "bg-amber-500", pill: "text-amber-600 dark:text-amber-400", ring: "border-amber-500/30 bg-amber-500/[0.04]" },
  { bar: "bg-violet-500", pill: "text-violet-600 dark:text-violet-400", ring: "border-violet-500/30 bg-violet-500/[0.04]" },
  { bar: "bg-emerald-500", pill: "text-emerald-600 dark:text-emerald-400", ring: "border-emerald-500/30 bg-emerald-500/[0.04]" },
];

export function LeadsConversionFunnel({ stages, utm, onStageClick, onUtmClick }: Props) {
  const topLeads = stages[0]?.leads || 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
      {/* Funil */}
      <Card className="p-4 space-y-3 lg:col-span-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
          <TrendingUp className="w-3.5 h-3.5 text-primary" />
          Funil de conversão
        </div>
        <div className="space-y-2">
          {stages.map((s, i) => {
            const Icon = STAGE_ICON[s.key] || Eye;
            const c = STAGE_COLOR[i] || STAGE_COLOR[0];
            const pct = topLeads > 0 ? Math.max(4, (s.leads / topLeads) * 100) : 0;
            const prev = i > 0 ? stages[i - 1] : null;
            const conv = prev && prev.leads > 0 ? (s.leads / prev.leads) * 100 : null;
            const clickable = typeof onStageClick === "function";
            return (
              <div
                key={s.key}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? () => onStageClick!(s) : undefined}
                onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onStageClick!(s); } } : undefined}
                className={cn("rounded-xl border p-2.5 transition", c.ring, clickable && "cursor-pointer hover:brightness-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40")}
              >

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-background border border-border/40")}>
                      <Icon className={cn("w-3.5 h-3.5", c.pill)} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-foreground leading-tight truncate">{s.label}</p>
                      <p className="text-[10px] text-muted-foreground leading-tight">
                        {s.value > 0 ? BRL(s.value) : "sem pipeline"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {conv !== null && (
                      <span className={cn("text-[9.5px] font-semibold px-1.5 py-0.5 rounded", c.pill, "bg-background border border-border/40")}>
                        <ArrowRight className="w-2.5 h-2.5 inline mr-0.5" />
                        {conv.toFixed(0)}%
                      </span>
                    )}
                    <span className="text-base font-bold text-foreground tabular-nums leading-none">
                      {s.leads}
                    </span>
                  </div>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-muted/60 overflow-hidden">
                  <div className={cn("h-full rounded-full transition-all", c.bar)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* UTM ranking */}
      <Card className="p-4 space-y-2 lg:col-span-2">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          Retorno real por canal
        </div>
        {utm.length === 0 ? (
          <p className="text-[10.5px] text-muted-foreground pt-1">
            Sem canais no período.
          </p>
        ) : (
          <div className="space-y-1.5 pt-1">
            <div className="grid grid-cols-12 gap-1 text-[9px] uppercase tracking-wider text-muted-foreground pb-1 border-b border-border/30">
              <span className="col-span-5">Canal</span>
              <span className="col-span-2 text-right">Leads</span>
              <span className="col-span-2 text-right">Pipeline</span>
              <span className="col-span-3 text-right">Fechado</span>
            </div>
            {utm.slice(0, 8).map((u) => {
              const clickable = typeof onUtmClick === "function";
              return (
                <div
                  key={u.source}
                  role={clickable ? "button" : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? () => onUtmClick!(u) : undefined}
                  onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onUtmClick!(u); } } : undefined}
                  className={cn("grid grid-cols-12 gap-1 text-[10.5px] items-center py-1 border-b border-border/20 last:border-0 rounded", clickable && "cursor-pointer hover:bg-muted/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40")}
                >
                  <span className="col-span-5 font-medium text-foreground truncate" title={u.source}>{u.source}</span>
                  <span className="col-span-2 text-right tabular-nums text-foreground">{u.leads}</span>
                  <span className="col-span-2 text-right tabular-nums text-muted-foreground">{u.pipeline > 0 ? BRL(u.pipeline) : "—"}</span>
                  <span className={cn("col-span-3 text-right tabular-nums font-semibold", u.soldValue > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50")}>
                    {u.soldValue > 0 ? BRL(u.soldValue) : "—"}
                    {u.soldCount > 0 && <span className="ml-1 text-[8.5px] text-muted-foreground">·{u.soldCount}v</span>}
                  </span>
                </div>
              );
            })}

          </div>
        )}
        <p className="text-[9.5px] text-muted-foreground/80 pt-1">
          "Fechado" = venda real registrada para leads desse canal (não cancelada).
        </p>
      </Card>
    </div>
  );
}
