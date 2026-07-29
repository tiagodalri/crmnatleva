import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/states/EmptyState";
import { LoadingState } from "@/components/states/LoadingState";
import {
  Activity, Users, Eye, Target, TrendingUp, Wifi, Globe, FileText,
  ArrowRight, MousePointerClick,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

type SessionRow = {
  id: string;
  first_seen_at: string;
  last_seen_at: string | null;
  device_type: string | null;
  referrer: string | null;
  utm: Record<string, unknown> | null;
  landing_path: string | null;
  lead_id: string | null;
};

type EventRow = {
  id: number;
  session_id: string | null;
  event_type: string;
  path: string | null;
  created_at: string;
};

type LeadRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  interest: string | null;
  source_path: string | null;
  utm: Record<string, unknown> | null;
  session_id: string | null;
  created_at: string;
};

const PERIODS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
] as const;

function utmSource(utm: Record<string, unknown> | null): string {
  const v = utm ? (utm as any).utm_source : null;
  const s = typeof v === "string" ? v.trim() : "";
  return s || "direto";
}

function referrerHost(ref: string | null): string | null {
  if (!ref) return null;
  try {
    return new URL(ref).hostname.replace(/^www\./, "");
  } catch {
    return ref.slice(0, 40);
  }
}

function dayKey(iso: string) {
  return iso.slice(0, 10);
}

export default function SiteOverview() {
  const [days, setDays] = useState<number>(7);

  const since = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }, [days]);

  const { data, isLoading } = useQuery({
    queryKey: ["site-overview", days],
    refetchInterval: 30_000,
    queryFn: async () => {
      const [s, e, l] = await Promise.all([
        supabase.from("site_sessions").select("*").gte("first_seen_at", since).order("first_seen_at", { ascending: false }).limit(5000),
        supabase.from("site_events").select("id,session_id,event_type,path,created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(20000),
        supabase.from("site_leads").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(2000),
      ]);
      if (s.error) throw s.error;
      if (e.error) throw e.error;
      if (l.error) throw l.error;
      return {
        sessions: (s.data || []) as SessionRow[],
        events: (e.data || []) as EventRow[],
        leads: (l.data || []) as LeadRow[],
      };
    },
  });

  const sessions = data?.sessions ?? [];
  const events = data?.events ?? [];
  const leads = data?.leads ?? [];

  const pageViews = useMemo(() => events.filter((e) => e.event_type === "page_view"), [events]);

  const onlineNow = useMemo(() => {
    const cutoff = Date.now() - 60_000;
    return sessions.filter((s) => s.last_seen_at && new Date(s.last_seen_at).getTime() >= cutoff).length;
  }, [sessions]);

  const conversion = sessions.length > 0 ? (leads.length / sessions.length) * 100 : 0;

  const series = useMemo(() => {
    const map = new Map<string, { day: string; sessoes: number; views: number }>();
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      map.set(key, { day: key, sessoes: 0, views: 0 });
    }
    sessions.forEach((s) => {
      const row = map.get(dayKey(s.first_seen_at));
      if (row) row.sessoes += 1;
    });
    pageViews.forEach((e) => {
      const row = map.get(dayKey(e.created_at));
      if (row) row.views += 1;
    });
    return Array.from(map.values());
  }, [sessions, pageViews, days]);

  const topPages = useMemo(() => {
    const counts = new Map<string, number>();
    pageViews.forEach((e) => {
      const p = e.path || "/";
      counts.set(p, (counts.get(p) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [pageViews]);

  const origins = useMemo(() => {
    const leadsBySession = new Set(leads.map((l) => l.session_id).filter(Boolean) as string[]);
    const map = new Map<string, { source: string; sessions: number; leads: number }>();
    sessions.forEach((s) => {
      const key = utmSource(s.utm);
      const row = map.get(key) || { source: key, sessions: 0, leads: 0 };
      row.sessions += 1;
      if (leadsBySession.has(s.id) || s.lead_id) row.leads += 1;
      map.set(key, row);
    });
    // leads sem sessão vinculada entram pela utm do próprio lead
    leads.forEach((l) => {
      if (l.session_id && sessions.some((s) => s.id === l.session_id)) return;
      const key = utmSource(l.utm);
      const row = map.get(key) || { source: key, sessions: 0, leads: 0 };
      row.leads += 1;
      map.set(key, row);
    });
    return Array.from(map.values()).sort((a, b) => b.sessions - a.sessions || b.leads - a.leads).slice(0, 8);
  }, [sessions, leads]);

  const referrers = useMemo(() => {
    const counts = new Map<string, number>();
    sessions.forEach((s) => {
      const host = referrerHost(s.referrer);
      if (!host) return;
      counts.set(host, (counts.get(host) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([host, count]) => ({ host, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [sessions]);

  const ctaSessions = useMemo(() => {
    const ids = new Set(
      events.filter((e) => e.event_type === "click_cta" && e.session_id).map((e) => e.session_id as string),
    );
    return ids.size;
  }, [events]);

  const latestLeads = leads.slice(0, 5);
  const hasData = sessions.length > 0 || events.length > 0 || leads.length > 0;

  const kpis = [
    { icon: Users, label: "Sessões", value: sessions.length.toLocaleString("pt-BR"), hint: `últimos ${days} dias` },
    { icon: Eye, label: "Page views", value: pageViews.length.toLocaleString("pt-BR"), hint: sessions.length > 0 ? `${(pageViews.length / sessions.length).toFixed(1)} por sessão` : undefined },
    { icon: Target, label: "Leads do site", value: leads.length.toLocaleString("pt-BR") },
    { icon: TrendingUp, label: "Conversão", value: `${conversion.toFixed(1)}%`, hint: "sessão para lead", tone: conversion >= 3 ? "hot" : undefined },
    { icon: Wifi, label: "Online agora", value: onlineNow.toLocaleString("pt-BR"), hint: "últimos 60 segundos", tone: onlineNow > 0 ? "hot" : undefined },
  ] as const;

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-full">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Globe className="w-5 h-5 text-accent" />
            Visão geral do site
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tráfego, origens e conversão do natleva.com · atualiza sozinho a cada 30 segundos
          </p>
        </div>
        <div className="flex gap-1.5">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={days === p.value ? "default" : "outline"}
              onClick={() => setDays(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <LoadingState message="Carregando dados do site" size="lg" />
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
            {kpis.map((k) => (
              <Card
                key={k.label}
                className={cn(
                  "p-3 flex items-start gap-2.5 rounded-2xl border-border/40",
                  (k as any).tone === "hot" && "border-accent/40 bg-accent/5",
                )}
              >
                <div
                  className={cn(
                    "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                    (k as any).tone === "hot" ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground",
                  )}
                >
                  <k.icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-foreground leading-tight truncate">{k.value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">{k.label}</p>
                  {(k as any).hint && (
                    <p className="text-[9px] text-muted-foreground/70 mt-0.5 leading-tight truncate">{(k as any).hint}</p>
                  )}
                </div>
              </Card>
            ))}
          </div>

          {!hasData ? (
            <Card className="glass-card">
              <EmptyState
                icon={Activity}
                title="O site ainda não recebeu visitas"
                description="Assim que o natleva.com começar a registrar sessões, os números aparecem aqui automaticamente."
              />
            </Card>
          ) : (
            <>
              <Card className="p-4 glass-card">
                <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3">
                  Sessões e page views por dia
                </h2>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradSess" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gradViews" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis
                        dataKey="day"
                        tickFormatter={(v: string) => format(parseISO(v), "dd/MM", { locale: ptBR })}
                        tick={{ fontSize: 10 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <Tooltip
                        contentStyle={{
                          background: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "0.75rem",
                          fontSize: 12,
                        }}
                        labelFormatter={(v) => format(parseISO(String(v)), "dd 'de' MMMM", { locale: ptBR })}
                      />
                      <Area type="monotone" dataKey="sessoes" name="Sessões" stroke="hsl(var(--accent))" fill="url(#gradSess)" strokeWidth={2} />
                      <Area type="monotone" dataKey="views" name="Page views" stroke="hsl(var(--primary))" fill="url(#gradViews)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Card className="p-4 glass-card">
                  <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                    Páginas mais vistas
                  </h2>
                  {topPages.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma página registrada até agora.</p>
                  ) : (
                    <div className="space-y-2">
                      {topPages.map((p) => {
                        const pct = (p.count / topPages[0].count) * 100;
                        return (
                          <div key={p.path} className="space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="truncate text-foreground">{p.path}</span>
                              <span className="text-muted-foreground flex-shrink-0">{p.count}</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-accent/70" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </Card>

                <Card className="p-4 glass-card">
                  <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    Origens
                  </h2>
                  {origins.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Ainda sem origens registradas.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {origins.map((o) => (
                        <div key={o.source} className="flex items-center justify-between gap-2 text-xs py-1 border-b border-border/40 last:border-0">
                          <span className="truncate text-foreground">{o.source}</span>
                          <span className="flex items-center gap-2 flex-shrink-0 text-muted-foreground">
                            <span>{o.sessions} sessões</span>
                            <Badge variant="neutral" className="text-[9px]">{o.leads} leads</Badge>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  <h3 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-4 mb-2">
                    Principais referrers
                  </h3>
                  {referrers.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum referrer externo até agora.</p>
                  ) : (
                    <div className="space-y-1">
                      {referrers.map((r) => (
                        <div key={r.host} className="flex items-center justify-between gap-2 text-xs">
                          <span className="truncate text-foreground">{r.host}</span>
                          <span className="text-muted-foreground flex-shrink-0">{r.count}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                <Card className="p-4 glass-card">
                  <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <MousePointerClick className="w-3.5 h-3.5 text-muted-foreground" />
                    Funil
                  </h2>
                  <div className="space-y-2.5">
                    {[
                      { label: "Sessões", value: sessions.length },
                      { label: "Clicaram em CTA", value: ctaSessions },
                      { label: "Viraram lead", value: leads.length },
                    ].map((step) => {
                      const base = sessions.length || 1;
                      const pct = Math.min(100, (step.value / base) * 100);
                      return (
                        <div key={step.label} className="space-y-1">
                          <div className="flex items-center justify-between gap-2 text-xs">
                            <span className="text-foreground">{step.label}</span>
                            <span className="text-muted-foreground">
                              {step.value} · {pct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>

                <Card className="p-4 glass-card">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h2 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-muted-foreground" />
                      Últimos leads
                    </h2>
                    <Link to="/site/leads" className="text-[10px] text-accent inline-flex items-center gap-1">
                      Ver todos <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  {latestLeads.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhum lead recebido neste período.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {latestLeads.map((l) => (
                        <Link
                          key={l.id}
                          to="/site/leads"
                          className="flex items-center justify-between gap-2 text-xs py-1.5 px-2 rounded-lg hover:bg-muted/60 transition-colors"
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-foreground font-medium">
                              {l.name || l.email || l.phone || "Lead sem nome"}
                            </span>
                            <span className="block truncate text-[10px] text-muted-foreground">
                              {utmSource(l.utm)} · {l.source_path || "/"}
                            </span>
                          </span>
                          <span className="text-[10px] text-muted-foreground flex-shrink-0">
                            {format(new Date(l.created_at), "dd/MM HH:mm", { locale: ptBR })}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </Card>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
