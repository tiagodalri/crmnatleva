// =====================================================================
// /leads · rastreio completo de leads
// Agrega Prateleira (prateleira_product_viewers + events) + Propostas
// Personalizadas (proposal_viewers + proposal_clicks) por email,
// mostrando origem, produtos/propostas, tempo, cliques, geo etc.
// =====================================================================
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Users, Search, Clock, MousePointerClick, MessageCircle,
  Smartphone, MapPin, ExternalLink, PackageOpen, Phone, Mail,
  TrendingUp, Wifi, Activity, Target, Filter as FilterIcon,
  FileText, Trash2, Sparkles, X, DollarSign, Flame, Crown, Trophy,
  ArrowUp, ArrowDown, CalendarRange, AlertTriangle, Eye, CheckCircle2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const DEFAULT_MARGIN = 0.15; // 15% quando não há custo informado
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatTime, parseUA } from "@/lib/proposalAnalytics";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";

type Period = "today" | "yesterday" | "7d" | "30d" | "all" | "custom";
const PERIOD_LABEL: Record<Period, string> = {
  today: "Hoje", yesterday: "Ontem", "7d": "7 dias", "30d": "30 dias", all: "Tudo", custom: "Personalizado",
};

/** Returns [fromMs, toMs] for a period, or null when "all". Previous returns the immediately prior window. */
function periodRange(period: Period, customFrom?: Date, customTo?: Date): { from: number; to: number } | null {
  const now = Date.now();
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0,0,0,0); return x.getTime(); };
  const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23,59,59,999); return x.getTime(); };
  if (period === "all") return null;
  if (period === "today") return { from: startOfDay(new Date()), to: now };
  if (period === "yesterday") {
    const y = new Date(); y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y) };
  }
  if (period === "7d") return { from: now - 7 * 86400000, to: now };
  if (period === "30d") return { from: now - 30 * 86400000, to: now };
  if (period === "custom" && customFrom && customTo) return { from: startOfDay(customFrom), to: endOfDay(customTo) };
  return null;
}
function previousRange(period: Period, customFrom?: Date, customTo?: Date): { from: number; to: number } | null {
  const cur = periodRange(period, customFrom, customTo);
  if (!cur) return null;
  const span = cur.to - cur.from;
  return { from: cur.from - span - 1, to: cur.from - 1 };
}
function normPhone(p?: string | null): string {
  if (!p) return "";
  return String(p).replace(/\D+/g, "");
}

// ─── Prateleira ────────────────────────────────────────────────────────
type ViewerRow = {
  id: string;
  product_id: string;
  product_slug: string | null;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  device_type: string | null;
  user_agent: string | null;
  total_views: number;
  active_seconds: number;
  whatsapp_clicked: boolean;
  cta_clicked: boolean;
  utm_source: string | null;
  utm_campaign: string | null;
  first_viewed_at: string;
  last_active_at: string;
};

type EventRow = {
  id: string;
  viewer_id: string | null;
  product_id: string;
  email: string;
  event_type: string;
  section: string | null;
  target: string | null;
  created_at: string;
};

type ProductMini = {
  id: string;
  title: string | null;
  slug: string | null;
  cover_image_url: string | null;
  destination: string | null;
  price_from: number | null;
  price_promo: number | null;
  internal_cost: number | null;
};

// ─── Propostas Personalizadas ──────────────────────────────────────────
type ProposalViewerRow = {
  id: string;
  proposal_id: string;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  device_type: string | null;
  user_agent: string | null;
  total_views: number;
  active_seconds: number;
  total_time_seconds: number;
  cta_clicked: boolean;
  whatsapp_clicked: boolean;
  sections_viewed: string[] | null;
  first_viewed_at: string;
  last_active_at: string;
};

type ProposalMini = {
  id: string;
  title: string | null;
  slug: string | null;
  cover_image_url: string | null;
  destinations: string[] | null;
  client_name: string | null;
  total_value: number | null;
};

type ProposalClickRow = {
  id: string;
  proposal_id: string;
  viewer_id: string | null;
  section_name: string | null;
  target_tag: string | null;
  target_text: string | null;
  created_at: string;
};

// ─── Unificado ──────────────────────────────────────────────────────────
type LeadItem = {
  kind: "product" | "proposal";
  refId: string;            // product_id ou proposal_id
  viewerId: string;         // id da linha da viewer table (para delete)
  title: string;
  subtitle: string | null;  // destino / cliente
  cover: string | null;
  slug: string | null;
  views: number;
  activeSeconds: number;
  cta: boolean;
  whatsapp: boolean;
  firstAt: string;
  lastAt: string;
  value: number;            // valor unitário do pacote
  profit: number;           // lucro potencial estimado
};

type LeadAggregate = {
  key: string;
  email: string;
  name: string | null;
  phone: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;
  device: string | null;
  userAgent: string | null;
  utmSource: string | null;
  utmCampaign: string | null;
  productsViewed: number;
  proposalsViewed: number;
  totalViews: number;
  totalSeconds: number;
  ctaCount: number;
  whatsappCount: number;
  firstAt: string;
  lastAt: string;
  items: LeadItem[];
  /** ids para deletar */
  prateleiraViewerIds: string[];
  proposalViewerIds: string[];
  /** financeiro */
  totalValue: number;        // soma dos pacotes visualizados
  profitPotential: number;   // lucro potencial estimado
  topValue: number;          // maior pacote visto
};

type OriginFilter = "all" | "prateleira" | "proposal";

const isOnline = (iso: string) => Date.now() - new Date(iso).getTime() < 2 * 60 * 1000;

function originLabel(l: LeadAggregate): { label: string; tone: "prateleira" | "proposal" | "both" } {
  if (l.productsViewed > 0 && l.proposalsViewed > 0) return { label: "Ambos", tone: "both" };
  if (l.proposalsViewed > 0) return { label: "Proposta", tone: "proposal" };
  return { label: "Prateleira", tone: "prateleira" };
}

export default function Leads() {
  const [viewers, setViewers] = useState<ViewerRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [products, setProducts] = useState<Record<string, ProductMini>>({});
  const [proposalViewers, setProposalViewers] = useState<ProposalViewerRow[]>([]);
  const [proposals, setProposals] = useState<Record<string, ProposalMini>>({});
  const [proposalClicks, setProposalClicks] = useState<ProposalClickRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "hot" | "online" | "whatsapp">("all");
  const [origin, setOrigin] = useState<OriginFilter>("all");
  const [selected, setSelected] = useState<LeadAggregate | null>(null);
  const [toDelete, setToDelete] = useState<LeadAggregate | null>(null);
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [period, setPeriod] = useState<Period>("all");
  const [customFrom, setCustomFrom] = useState<Date | undefined>();
  const [customTo, setCustomTo] = useState<Date | undefined>();
  const [customOpen, setCustomOpen] = useState(false);
  /** key (email lowered or phone digits) -> { count, value } */
  const [conversions, setConversions] = useState<Record<string, { count: number; value: number }>>({});

  const fetchAll = async () => {
    setLoading(true);
    const [
      { data: vData },
      { data: eData },
      { data: pvData },
      { data: pcData },
    ] = await Promise.all([
      (supabase as any).from("prateleira_product_viewers").select("*").order("last_active_at", { ascending: false }).limit(2000),
      (supabase as any).from("prateleira_viewer_events").select("id, viewer_id, product_id, email, event_type, section, target, created_at").order("created_at", { ascending: false }).limit(5000),
      (supabase as any).from("proposal_viewers").select("*").order("last_active_at", { ascending: false }).limit(2000),
      (supabase as any).from("proposal_clicks").select("id, proposal_id, viewer_id, section_name, target_tag, target_text, created_at").order("created_at", { ascending: false }).limit(5000),
    ]);
    const vs = (vData || []) as ViewerRow[];
    const pvs = (pvData || []) as ProposalViewerRow[];
    setViewers(vs);
    setEvents((eData || []) as EventRow[]);
    setProposalViewers(pvs);
    setProposalClicks((pcData || []) as ProposalClickRow[]);

    // hidratar produtos
    const pIds = Array.from(new Set(vs.map((v) => v.product_id)));
    if (pIds.length) {
      const { data: pData } = await (supabase as any)
        .from("experience_products")
        .select("id, title, slug, cover_image_url, destination, price_from, price_promo, internal_cost")
        .in("id", pIds);
      const map: Record<string, ProductMini> = {};
      (pData || []).forEach((p: ProductMini) => { map[p.id] = p; });
      setProducts(map);
    }
    // hidratar propostas
    const prIds = Array.from(new Set(pvs.map((p) => p.proposal_id)));
    if (prIds.length) {
      const { data: prData } = await (supabase as any)
        .from("proposals")
        .select("id, title, slug, cover_image_url, destinations, client_name, total_value")
        .in("id", prIds);
      const map: Record<string, ProposalMini> = {};
      (prData || []).forEach((p: ProposalMini) => { map[p.id] = p; });
      setProposals(map);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leads = useMemo<LeadAggregate[]>(() => {
    const map = new Map<string, LeadAggregate>();

    const ensure = (key: string, seed: Partial<LeadAggregate>) => {
      let lead = map.get(key);
      if (!lead) {
        lead = {
          key,
          email: seed.email || "",
          name: seed.name ?? null,
          phone: seed.phone ?? null,
          city: seed.city ?? null,
          region: seed.region ?? null,
          country: seed.country ?? null,
          lat: seed.lat ?? null,
          lng: seed.lng ?? null,
          device: seed.device ?? null,
          userAgent: seed.userAgent ?? null,
          utmSource: seed.utmSource ?? null,
          utmCampaign: seed.utmCampaign ?? null,
          productsViewed: 0,
          proposalsViewed: 0,
          totalViews: 0,
          totalSeconds: 0,
          ctaCount: 0,
          whatsappCount: 0,
          firstAt: seed.firstAt || new Date().toISOString(),
          lastAt: seed.lastAt || new Date().toISOString(),
          items: [],
          prateleiraViewerIds: [],
          proposalViewerIds: [],
          totalValue: 0,
          profitPotential: 0,
          topValue: 0,
        };
        map.set(key, lead);
      } else {
        if (!lead.name && seed.name) lead.name = seed.name;
        if (!lead.phone && seed.phone) lead.phone = seed.phone;
        if (!lead.city && seed.city) lead.city = seed.city;
        if (!lead.country && seed.country) lead.country = seed.country;
        if (!lead.userAgent && seed.userAgent) lead.userAgent = seed.userAgent;
        if (!lead.device && seed.device) lead.device = seed.device;
        if (!lead.utmSource && seed.utmSource) lead.utmSource = seed.utmSource;
      }
      return lead;
    };

    // Prateleira
    for (const v of viewers) {
      const key = (v.email || "").toLowerCase().trim() || `anon-pr:${v.id}`;
      const lead = ensure(key, {
        email: v.email, name: v.name, phone: v.phone, city: v.city, region: v.region,
        country: v.country, device: v.device_type, userAgent: v.user_agent,
        utmSource: v.utm_source, utmCampaign: v.utm_campaign,
        firstAt: v.first_viewed_at, lastAt: v.last_active_at,
      });
      if (new Date(v.first_viewed_at) < new Date(lead.firstAt)) lead.firstAt = v.first_viewed_at;
      if (new Date(v.last_active_at) > new Date(lead.lastAt)) lead.lastAt = v.last_active_at;
      lead.productsViewed += 1;
      lead.totalViews += v.total_views || 1;
      lead.totalSeconds += v.active_seconds || 0;
      if (v.cta_clicked) lead.ctaCount += 1;
      if (v.whatsapp_clicked) lead.whatsappCount += 1;
      lead.prateleiraViewerIds.push(v.id);
      const p = products[v.product_id];
      const pPrice = Number(p?.price_promo || p?.price_from || 0);
      const pCost = Number(p?.internal_cost || 0);
      const pProfit = pPrice > 0 ? (pCost > 0 ? Math.max(pPrice - pCost, 0) : pPrice * DEFAULT_MARGIN) : 0;
      lead.totalValue += pPrice;
      lead.profitPotential += pProfit;
      if (pPrice > lead.topValue) lead.topValue = pPrice;
      lead.items.push({
        kind: "product",
        refId: v.product_id,
        viewerId: v.id,
        title: p?.title || "Produto",
        subtitle: p?.destination || null,
        cover: p?.cover_image_url || null,
        slug: p?.slug || null,
        views: v.total_views || 1,
        activeSeconds: v.active_seconds || 0,
        cta: v.cta_clicked,
        whatsapp: v.whatsapp_clicked,
        firstAt: v.first_viewed_at,
        lastAt: v.last_active_at,
        value: pPrice,
        profit: pProfit,
      });
    }

    // Propostas
    for (const v of proposalViewers) {
      const key = (v.email || "").toLowerCase().trim() || `anon-pp:${v.id}`;
      const lead = ensure(key, {
        email: v.email, name: v.name, phone: v.phone, city: v.city, region: v.region,
        country: v.country, device: v.device_type, userAgent: v.user_agent,
        firstAt: v.first_viewed_at, lastAt: v.last_active_at,
      });
      if (new Date(v.first_viewed_at) < new Date(lead.firstAt)) lead.firstAt = v.first_viewed_at;
      if (new Date(v.last_active_at) > new Date(lead.lastAt)) lead.lastAt = v.last_active_at;
      lead.proposalsViewed += 1;
      lead.totalViews += v.total_views || 1;
      const secs = v.active_seconds || v.total_time_seconds || 0;
      lead.totalSeconds += secs;
      if (v.cta_clicked) lead.ctaCount += 1;
      if (v.whatsapp_clicked) lead.whatsappCount += 1;
      lead.proposalViewerIds.push(v.id);
      const pr = proposals[v.proposal_id];
      const prValue = Number(pr?.total_value || 0);
      const prProfit = prValue > 0 ? prValue * DEFAULT_MARGIN : 0;
      lead.totalValue += prValue;
      lead.profitPotential += prProfit;
      if (prValue > lead.topValue) lead.topValue = prValue;
      lead.items.push({
        kind: "proposal",
        refId: v.proposal_id,
        viewerId: v.id,
        title: pr?.title || "Proposta personalizada",
        subtitle: pr?.client_name || (pr?.destinations || []).join(", ") || null,
        cover: pr?.cover_image_url || null,
        slug: pr?.slug || null,
        views: v.total_views || 1,
        activeSeconds: secs,
        cta: v.cta_clicked,
        whatsapp: v.whatsapp_clicked,
        firstAt: v.first_viewed_at,
        lastAt: v.last_active_at,
        value: prValue,
        profit: prProfit,
      });
    }

    return Array.from(map.values())
      .map((l) => ({ ...l, items: l.items.sort((a, b) => b.activeSeconds - a.activeSeconds) }))
      .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
  }, [viewers, products, proposalViewers, proposals]);

  // Period-filtered leads (main dataset all cards/lists react to)
  const range = useMemo(() => periodRange(period, customFrom, customTo), [period, customFrom, customTo]);
  const prevR = useMemo(() => previousRange(period, customFrom, customTo), [period, customFrom, customTo]);

  const inRange = (iso: string | undefined | null, r: { from: number; to: number } | null) => {
    if (!r) return true;
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= r.from && t <= r.to;
  };
  const leadInRange = (l: LeadAggregate, r: { from: number; to: number } | null) =>
    inRange(l.lastAt || l.firstAt, r);

  const periodLeads = useMemo(
    () => leads.filter((l) => leadInRange(l, range)),
    [leads, range]
  );
  const prevLeads = useMemo(
    () => (prevR ? leads.filter((l) => leadInRange(l, prevR)) : []),
    [leads, prevR]
  );

  // Fetch conversions (leads → clients → sales) for all loaded leads
  useEffect(() => {
    (async () => {
      const emails = Array.from(new Set(leads.map((l) => (l.email || "").toLowerCase().trim()).filter(Boolean)));
      const phones = Array.from(new Set(leads.map((l) => normPhone(l.phone)).filter((p) => p && p.length >= 8)));
      if (emails.length === 0 && phones.length === 0) { setConversions({}); return; }
      // Fetch clients by email OR phone
      const clientsQuery = (supabase as any).from("clients").select("id, email, phone");
      const orParts: string[] = [];
      if (emails.length) orParts.push(`email.in.(${emails.map(e => `"${e}"`).join(",")})`);
      if (phones.length) orParts.push(`phone.in.(${phones.map(p => `"${p}"`).join(",")})`);
      let clientRows: any[] = [];
      if (orParts.length) {
        const { data } = await clientsQuery.or(orParts.join(","));
        clientRows = data || [];
      }
      if (!clientRows.length) { setConversions({}); return; }
      const clientIds = clientRows.map((c) => c.id);
      const { data: salesRows } = await (supabase as any)
        .from("sales")
        .select("client_id, received_value, status, created_at")
        .in("client_id", clientIds);
      // Map client_id -> {count, value}
      const byClient: Record<string, { count: number; value: number }> = {};
      (salesRows || []).forEach((s: any) => {
        if ((s.status || "").toLowerCase() === "cancelado") return;
        const cur = byClient[s.client_id] || { count: 0, value: 0 };
        cur.count += 1;
        cur.value += Number(s.received_value || 0);
        byClient[s.client_id] = cur;
      });
      // Attribute to lead keys (email + phone)
      const out: Record<string, { count: number; value: number }> = {};
      for (const c of clientRows) {
        const stats = byClient[c.id];
        if (!stats) continue;
        const emailKey = (c.email || "").toLowerCase().trim();
        const phoneKey = normPhone(c.phone);
        if (emailKey) out[`e:${emailKey}`] = stats;
        if (phoneKey) out[`p:${phoneKey}`] = stats;
      }
      setConversions(out);
    })();
  }, [leads]);

  const leadConversion = (l: LeadAggregate) => {
    const e = (l.email || "").toLowerCase().trim();
    const p = normPhone(l.phone);
    return conversions[`e:${e}`] || conversions[`p:${p}`] || null;
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodLeads.filter((l) => {
      if (filter === "hot" && l.ctaCount === 0 && l.whatsappCount === 0) return false;
      if (filter === "online" && !isOnline(l.lastAt)) return false;
      if (filter === "whatsapp" && l.whatsappCount === 0) return false;
      if (origin === "prateleira" && l.productsViewed === 0) return false;
      if (origin === "proposal" && l.proposalsViewed === 0) return false;
      if (!q) return true;
      return (
        (l.name || "").toLowerCase().includes(q) ||
        (l.email || "").toLowerCase().includes(q) ||
        (l.phone || "").toLowerCase().includes(q) ||
        (l.city || "").toLowerCase().includes(q) ||
        l.items.some((p) => (p.title || "").toLowerCase().includes(q))
      );
    });
  }, [periodLeads, search, filter, origin]);

  // KPIs (react to period)
  const totalLeads = periodLeads.length;
  const onlineNow = periodLeads.filter((l) => isOnline(l.lastAt)).length;
  const hotLeads = periodLeads.filter((l) => l.ctaCount > 0 || l.whatsappCount > 0).length;
  const propostaLeads = periodLeads.filter((l) => l.proposalsViewed > 0).length;
  const pipelineValue = periodLeads.reduce((s, l) => s + l.totalValue, 0);
  const profitPotential = periodLeads.reduce((s, l) => s + l.profitPotential, 0);
  const avgTicket = totalLeads > 0 ? pipelineValue / totalLeads : 0;

  // Previous-period deltas (only when period !== "all")
  const prevTotal = prevLeads.length;
  const prevHot = prevLeads.filter((l) => l.ctaCount > 0 || l.whatsappCount > 0).length;
  const prevPipeline = prevLeads.reduce((s, l) => s + l.totalValue, 0);
  const pct = (curr: number, prev: number): number | null => {
    if (!prevR) return null;
    if (prev === 0 && curr === 0) return null;
    if (prev === 0) return null; // can't compute % from zero
    return Math.round(((curr - prev) / prev) * 100);
  };

  // Insight: converted leads (lead → cliente → venda)
  const convertedLeads = useMemo(() => periodLeads.filter((l) => leadConversion(l)), [periodLeads, conversions]);
  const conversionValue = convertedLeads.reduce((s, l) => s + (leadConversion(l)?.value || 0), 0);
  const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0;

  // Insight: quentes sem retorno
  const hotStale = useMemo(() => {
    const cutoff = Date.now() - 24 * 3600 * 1000;
    return periodLeads
      .filter((l) => (l.ctaCount > 0 || l.whatsappCount > 0)
        && !leadConversion(l)
        && new Date(l.lastAt).getTime() < cutoff)
      .sort((a, b) => b.profitPotential - a.profitPotential)
      .slice(0, 5);
  }, [periodLeads, conversions]);

  // Insight: origem prateleira vs proposta
  const prateleiraLeads = periodLeads.filter((l) => l.productsViewed > 0);
  const proposalLeads = periodLeads.filter((l) => l.proposalsViewed > 0);
  const prateleiraPipeline = prateleiraLeads.reduce((s, l) =>
    s + l.items.filter((i) => i.kind === "product").reduce((a, i) => a + i.value, 0), 0);
  const proposalPipeline = proposalLeads.reduce((s, l) =>
    s + l.items.filter((i) => i.kind === "proposal").reduce((a, i) => a + i.value, 0), 0);

  // Insight: top items no período
  const topItems = useMemo(() => {
    const counts = new Map<string, { title: string; kind: "product" | "proposal"; slug: string | null; views: number }>();
    for (const l of periodLeads) {
      for (const it of l.items) {
        const k = `${it.kind}:${it.refId}`;
        const prev = counts.get(k);
        if (prev) prev.views += it.views;
        else counts.set(k, { title: it.title, kind: it.kind, slug: it.slug, views: it.views });
      }
    }
    return Array.from(counts.values()).sort((a, b) => b.views - a.views).slice(0, 3);
  }, [periodLeads]);

  // Insight: top UTM sources (Prateleira)
  const topUtms = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of periodLeads) {
      if (l.productsViewed > 0 && l.utmSource) {
        m.set(l.utmSource, (m.get(l.utmSource) || 0) + 1);
      }
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 3);
  }, [periodLeads]);

  // Ranking: score = lucro + bônus de engajamento (CTA/WhatsApp/tempo)
  const ranked = useMemo(() => {
    const withScore = periodLeads.map((l) => {
      const engagement = l.ctaCount * 500 + l.whatsappCount * 800 + Math.min(l.totalSeconds, 600);
      const score = l.profitPotential + engagement;
      return { lead: l, score, engagement };
    });
    return withScore.sort((a, b) => b.score - a.score).slice(0, 5);
  }, [periodLeads]);

  const handleDelete = async () => {
    if (!toDelete) return;
    const lead = toDelete;
    try {
      const ops: Promise<any>[] = [];
      if (lead.prateleiraViewerIds.length) {
        ops.push((supabase as any).from("prateleira_product_viewers").delete().in("id", lead.prateleiraViewerIds));
        // events também (cleanup por email)
        if (lead.email) {
          ops.push((supabase as any).from("prateleira_viewer_events").delete().eq("email", lead.email));
        }
      }
      if (lead.proposalViewerIds.length) {
        ops.push((supabase as any).from("proposal_viewers").delete().in("id", lead.proposalViewerIds));
      }
      const results = await Promise.all(ops);
      const err = results.find((r) => r?.error)?.error;
      if (err) throw err;
      toast({ title: "Lead excluído", description: `${lead.name || lead.email || "Lead"} removido com sucesso.` });
      setToDelete(null);
      setSelected(null);
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e?.message || "Tente novamente.", variant: "destructive" });
    }
  };

  const handleBulkDelete = async () => {
    if (selectedKeys.size === 0) return;
    setBulkDeleting(true);
    try {
      const targets = leads.filter((l) => selectedKeys.has(l.key));
      const prateleiraIds = targets.flatMap((l) => l.prateleiraViewerIds);
      const proposalIds = targets.flatMap((l) => l.proposalViewerIds);
      const emails = Array.from(new Set(targets.map((l) => l.email).filter(Boolean)));
      const ops: Promise<any>[] = [];
      if (prateleiraIds.length) {
        ops.push((supabase as any).from("prateleira_product_viewers").delete().in("id", prateleiraIds));
      }
      if (emails.length) {
        ops.push((supabase as any).from("prateleira_viewer_events").delete().in("email", emails));
      }
      if (proposalIds.length) {
        ops.push((supabase as any).from("proposal_viewers").delete().in("id", proposalIds));
      }
      const results = await Promise.all(ops);
      const err = results.find((r) => r?.error)?.error;
      if (err) throw err;
      toast({ title: "Leads excluídos", description: `${targets.length} lead(s) removido(s) com sucesso.` });
      setSelectedKeys(new Set());
      setBulkConfirm(false);
      await fetchAll();
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setBulkDeleting(false);
    }
  };

  const toggleOne = (key: string, checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) next.add(key); else next.delete(key);
      return next;
    });
  };

  const toggleAllFiltered = (checked: boolean) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (checked) filtered.forEach((l) => next.add(l.key));
      else filtered.forEach((l) => next.delete(l.key));
      return next;
    });
  };

  const allFilteredSelected = filtered.length > 0 && filtered.every((l) => selectedKeys.has(l.key));
  const someFilteredSelected = filtered.some((l) => selectedKeys.has(l.key)) && !allFilteredSelected;

  return (
    <div className="container mx-auto px-4 py-6 space-y-5 max-w-[1400px]">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Users className="w-6 h-6 text-primary" /> Leads
        </h1>
        <p className="text-sm text-muted-foreground">
          Rastreio unificado · quem visitou Prateleira ou Propostas Personalizadas, com produtos vistos, tempo, cliques, dispositivo e localização.
        </p>
      </div>

      {/* Period filter pills */}
      <Card className="p-2.5 flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mr-1 flex items-center gap-1">
          <CalendarRange className="w-3 h-3" /> Período:
        </span>
        {(["today", "yesterday", "7d", "30d", "all"] as Period[]).map((p) => (
          <FilterChip key={p} active={period === p} onClick={() => setPeriod(p)}>
            {PERIOD_LABEL[p]}
          </FilterChip>
        ))}
        <Popover open={customOpen} onOpenChange={setCustomOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "h-8 px-3 rounded-lg text-[11px] font-medium transition-colors",
                period === "custom" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              {period === "custom" && customFrom && customTo
                ? `${format(customFrom, "dd/MM")} → ${format(customTo, "dd/MM")}`
                : "Personalizado"}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-auto p-3 space-y-2">
            <Calendar
              mode="range"
              locale={ptBR}
              selected={{ from: customFrom, to: customTo }}
              onSelect={(range: any) => {
                setCustomFrom(range?.from);
                setCustomTo(range?.to || range?.from);
              }}
              numberOfMonths={1}
              className="rounded-md border p-2 pointer-events-auto"
            />
            <div className="flex justify-end gap-2 pt-1 border-t">
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => {
                setCustomFrom(undefined); setCustomTo(undefined); setPeriod("all"); setCustomOpen(false);
              }}>Limpar</Button>
              <Button size="sm" className="h-7 text-xs" disabled={!customFrom || !customTo} onClick={() => {
                setPeriod("custom"); setCustomOpen(false);
              }}>Aplicar</Button>
            </div>
          </PopoverContent>
        </Popover>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        <Kpi icon={Users} label="Total de leads" value={totalLeads.toLocaleString("pt-BR")} delta={pct(totalLeads, prevTotal)} />
        <Kpi icon={Wifi} label="Online agora" value={onlineNow.toLocaleString("pt-BR")} tone={onlineNow > 0 ? "live" : undefined} />
        <Kpi icon={TrendingUp} label="Leads quentes" value={hotLeads.toLocaleString("pt-BR")} hint="clicaram CTA ou WhatsApp" tone={hotLeads > 0 ? "hot" : undefined} delta={pct(hotLeads, prevHot)} />
        <Kpi icon={FileText} label="Viram proposta" value={propostaLeads.toLocaleString("pt-BR")} hint="propostas personalizadas" />
        <Kpi icon={DollarSign} label="Pipeline" value={BRL(pipelineValue)} hint="valor total visualizado" tone="value" delta={pct(pipelineValue, prevPipeline)} />
        <Kpi icon={Flame} label="Lucro potencial" value={BRL(profitPotential)} hint="estimativa com margem real" tone="profit" />
        <Kpi icon={TrendingUp} label="Ticket médio" value={BRL(avgTicket)} hint="por lead" />
      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Conversão em venda */}
        <Card className="p-4 space-y-2 border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.05] to-transparent">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Conversão em venda
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Leads convertidos</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{convertedLeads.length}</p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Taxa</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {conversionRate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Vendido</p>
              <p className="text-lg font-bold text-foreground tabular-nums">{BRL(conversionValue)}</p>
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground pt-1">
            leads do período que viraram cliente com venda registrada
          </p>
        </Card>

        {/* Origem: Prateleira vs Proposta */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            Origem com melhor retorno
          </div>
          <div className="space-y-2 pt-1">
            <OriginBar label="Prateleira" tone="prateleira" leads={prateleiraLeads.length} pipeline={prateleiraPipeline} maxPipeline={Math.max(prateleiraPipeline, proposalPipeline, 1)} />
            <OriginBar label="Proposta" tone="proposal" leads={proposalLeads.length} pipeline={proposalPipeline} maxPipeline={Math.max(prateleiraPipeline, proposalPipeline, 1)} />
          </div>
          {topUtms.length > 0 && (
            <div className="pt-2 border-t border-border/30">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1">Top UTM (Prateleira)</p>
              <div className="flex flex-wrap gap-1">
                {topUtms.map(([src, count]) => (
                  <Badge key={src} className="text-[9.5px] border-0 bg-sky-500/12 text-sky-600 dark:text-sky-400">
                    {src} · {count}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Produtos/propostas em alta */}
        <Card className="p-4 space-y-2">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-foreground">
            <Eye className="w-3.5 h-3.5 text-violet-500" />
            Em alta no período
          </div>
          <div className="space-y-1.5 pt-1">
            {topItems.length === 0 ? (
              <p className="text-[10.5px] text-muted-foreground">Sem visualizações no período.</p>
            ) : topItems.map((it, i) => (
              <div key={i} className="flex items-center gap-2 py-1 border-b border-border/20 last:border-0">
                <span className="text-[10px] font-bold text-muted-foreground tabular-nums w-4">{i + 1}</span>
                {it.kind === "proposal"
                  ? <FileText className="w-3 h-3 text-violet-500 flex-shrink-0" />
                  : <PackageOpen className="w-3 h-3 text-sky-500 flex-shrink-0" />}
                <span className="text-[11px] text-foreground truncate flex-1" title={it.title}>{it.title}</span>
                <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{it.views}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quentes sem retorno */}
      {hotStale.length > 0 && (
        <Card className="p-4 space-y-2 border-amber-500/30 bg-amber-500/[0.04]">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Quentes sem retorno
              <Badge className="text-[9px] border-0 bg-amber-500/20 text-amber-700 dark:text-amber-400">
                {hotStale.length}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              engajaram há mais de 24h e ainda não compraram · toca no WhatsApp
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
            {hotStale.map((l) => (
              <div key={l.key} className="p-2.5 rounded-lg border border-amber-500/25 bg-card space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <p className="text-[11.5px] font-semibold text-foreground truncate">{l.name || l.email || "Sem nome"}</p>
                  {l.phone && (
                    <a
                      href={`https://wa.me/${normPhone(l.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-emerald-600 hover:text-emerald-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageCircle className="w-3 h-3" /> WhatsApp
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{l.items[0]?.title || "·"}</p>
                <div className="flex items-center justify-between text-[10px]">
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">{BRL(l.profitPotential)}</span>
                  <span className="text-muted-foreground">{formatDistanceToNow(new Date(l.lastAt), { locale: ptBR, addSuffix: true })}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(l)}
                  className="w-full text-[10px] text-primary hover:underline pt-0.5"
                >
                  ver detalhes →
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}



      {/* Top leads */}
      {ranked.length > 0 && (
        <Card className="p-4 space-y-3 border-amber-500/30 bg-gradient-to-br from-amber-500/[0.04] to-transparent">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-foreground">Melhores leads agora</h2>
              <Badge className="text-[9px] border-0 bg-amber-500/15 text-amber-600 dark:text-amber-400">
                top {ranked.length}
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              ranking por lucro potencial + engajamento
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-2">
            {ranked.map((r, idx) => {
              const l = r.lead;
              const o = originLabel(l);
              const top = l.items.find((it) => it.value === l.topValue) || l.items[0];
              return (
                <button
                  key={l.key}
                  type="button"
                  onClick={() => setSelected(l)}
                  className="text-left p-3 rounded-xl border border-border/40 bg-card hover:border-amber-500/40 hover:shadow-sm transition-all space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {idx === 0 ? (
                        <Crown className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                      ) : (
                        <span className="text-[10px] font-bold text-muted-foreground tabular-nums w-3.5 text-center">
                          {idx + 1}
                        </span>
                      )}
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {l.name || l.email || "Sem nome"}
                      </p>
                    </div>
                    <OriginBadge tone={o.tone} label={o.label} />
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {top?.title || "·"}
                  </p>
                  <div className="flex items-end justify-between gap-2 pt-1">
                    <div className="min-w-0">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Lucro potencial</p>
                      <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {BRL(l.profitPotential)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Pacote</p>
                      <p className="text-[11px] font-semibold text-foreground tabular-nums">
                        {l.totalValue > 0 ? BRL(l.totalValue) : "·"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 border-t border-border/30 text-[9.5px] text-muted-foreground">
                    {l.ctaCount > 0 && <span className="text-accent font-semibold">{l.ctaCount} CTA</span>}
                    {l.whatsappCount > 0 && <span className="text-emerald-600 font-semibold">{l.whatsappCount} WA</span>}
                    <span className="ml-auto">{formatTime(l.totalSeconds)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>
      )}


      {/* Filtros */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email, telefone, cidade ou produto..."
            className="pl-9 h-9"
          />
        </div>
        <div className="flex items-center gap-1 flex-wrap">
          <FilterChip active={filter === "all"} onClick={() => setFilter("all")}>Todos</FilterChip>
          <FilterChip active={filter === "hot"} onClick={() => setFilter("hot")}>Quentes</FilterChip>
          <FilterChip active={filter === "online"} onClick={() => setFilter("online")}>Online</FilterChip>
          <FilterChip active={filter === "whatsapp"} onClick={() => setFilter("whatsapp")}>Abriu WhatsApp</FilterChip>
        </div>
        <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
        <div className="flex items-center gap-1 flex-wrap">
          <FilterChip active={origin === "all"} onClick={() => setOrigin("all")}>Toda origem</FilterChip>
          <FilterChip active={origin === "prateleira"} onClick={() => setOrigin("prateleira")}>Prateleira</FilterChip>
          <FilterChip active={origin === "proposal"} onClick={() => setOrigin("proposal")}>Proposta</FilterChip>
        </div>
      </Card>

      {/* Barra de ações em massa */}
      {selectedKeys.size > 0 && (
        <Card className="p-2.5 flex items-center justify-between gap-2 bg-accent/5 border-accent/40">
          <div className="flex items-center gap-2 text-[12px] text-foreground">
            <Badge className="text-[10px] border-0 bg-accent/15 text-accent">
              {selectedKeys.size} selecionado{selectedKeys.size > 1 ? "s" : ""}
            </Badge>
            <button
              type="button"
              className="text-[10.5px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              onClick={() => setSelectedKeys(new Set())}
            >
              <X className="w-3 h-3" /> Limpar seleção
            </button>
          </div>
          <Button
            size="sm"
            variant="destructive"
            className="h-8 text-[11.5px]"
            onClick={() => setBulkConfirm(true)}
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Excluir selecionados
          </Button>
        </Card>
      )}

      {/* Tabela */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 border-b border-border/40">
              <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground">
                <th className="p-3 w-10">
                  <Checkbox
                    checked={allFilteredSelected ? true : someFilteredSelected ? "indeterminate" : false}
                    onCheckedChange={(c) => toggleAllFiltered(c === true)}
                    aria-label="Selecionar todos"
                  />
                </th>
                <th className="text-left p-3 font-medium">Lead</th>
                <th className="text-left p-3 font-medium">Contato</th>
                <th className="text-left p-3 font-medium">Origem</th>
                <th className="text-left p-3 font-medium">O que viu</th>
                <th className="text-left p-3 font-medium">Tempo total</th>
                <th className="text-left p-3 font-medium">Valor / Lucro</th>
                <th className="text-left p-3 font-medium">Ações</th>
                <th className="text-left p-3 font-medium">Última visita</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="p-8 text-center text-muted-foreground animate-pulse">Carregando leads...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={10} className="p-8 text-center text-muted-foreground">
                  {leads.length === 0 ? "Nenhum lead ainda. Compartilhe páginas da Prateleira ou envie propostas personalizadas para começar." : "Nenhum lead bate com os filtros."}
                </td></tr>
              ) : filtered.map((l) => {
                const online = isOnline(l.lastAt);
                const ua = parseUA(l.userAgent);
                const o = originLabel(l);
                const topItem = l.items[0];
                return (
                  <tr
                    key={l.key}
                    className="border-b border-border/30 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setSelected(l)}
                  >
                    <td className="p-3 align-top w-10" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedKeys.has(l.key)}
                        onCheckedChange={(c) => toggleOne(l.key, c === true)}
                        aria-label={`Selecionar ${l.name || l.email || "lead"}`}
                      />
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex items-start gap-2">
                        <div className={cn(
                          "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                          online ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30",
                        )} />
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{l.name || "Sem nome"}</p>
                          <p className="text-[10.5px] text-muted-foreground truncate">
                            {l.city ? `${l.city}${l.country ? `, ${l.country}` : ""}` : ua.os}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <p className="text-[11px] text-foreground truncate max-w-[200px]" title={l.email}>{l.email || "·"}</p>
                      {l.phone && <p className="text-[10.5px] text-muted-foreground">{l.phone}</p>}
                    </td>
                    <td className="p-3 align-top">
                      <OriginBadge tone={o.tone} label={o.label} />
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        {l.productsViewed > 0 && <span>{l.productsViewed} prat.</span>}
                        {l.proposalsViewed > 0 && <span>{l.proposalsViewed} prop.</span>}
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-1.5">
                        {topItem?.kind === "proposal" ? (
                          <FileText className="w-3.5 h-3.5 text-violet-500" />
                        ) : (
                          <PackageOpen className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                        <span className="font-semibold text-foreground tabular-nums">{l.items.length}</span>
                        <span className="text-[10px] text-muted-foreground">· {l.totalViews} views</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate max-w-[200px] mt-0.5" title={topItem?.title || ""}>
                        {topItem?.title || ""}
                      </p>
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-semibold text-foreground tabular-nums">{formatTime(l.totalSeconds)}</span>
                      </div>
                    </td>
                    <td className="p-3 align-top">
                      {l.totalValue > 0 ? (
                        <div className="space-y-0.5">
                          <p className="text-[12px] font-bold text-foreground tabular-nums leading-tight">{BRL(l.totalValue)}</p>
                          <p className="text-[10px] text-emerald-600 dark:text-emerald-400 tabular-nums leading-tight flex items-center gap-1">
                            <Flame className="w-2.5 h-2.5" /> {BRL(l.profitPotential)} lucro
                          </p>
                        </div>
                      ) : (
                        <span className="text-[10px] text-muted-foreground/60">sem valor</span>
                      )}
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-1 flex-wrap">
                        {l.ctaCount > 0 && (
                          <Badge className="text-[9px] border-0 bg-accent/15 text-accent">
                            <MousePointerClick className="w-2.5 h-2.5 mr-0.5" /> {l.ctaCount} CTA
                          </Badge>
                        )}
                        {l.whatsappCount > 0 && (
                          <Badge className="text-[9px] border-0 bg-emerald-500/15 text-emerald-600">
                            <MessageCircle className="w-2.5 h-2.5 mr-0.5" /> {l.whatsappCount}
                          </Badge>
                        )}
                        {l.ctaCount === 0 && l.whatsappCount === 0 && (
                          <span className="text-[10px] text-muted-foreground/60">sem ações</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3 align-top text-[10.5px] text-muted-foreground">
                      {formatDistanceToNow(new Date(l.lastAt), { locale: ptBR, addSuffix: true })}
                    </td>
                    <td className="p-3 align-top">
                      <div className="flex items-center gap-1 justify-end">
                        <Button variant="ghost" size="sm" className="h-7 text-[10.5px]">
                          Detalhes
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Excluir lead"
                          onClick={(e) => { e.stopPropagation(); setToDelete(l); }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Drawer/Dialog de detalhes */}
      <LeadDetail
        lead={selected}
        events={events}
        proposalClicks={proposalClicks}
        onClose={() => setSelected(null)}
        onDelete={(l) => setToDelete(l)}
      />

      {/* Confirm delete */}
      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este lead?</AlertDialogTitle>
            <AlertDialogDescription>
              Todo o rastreio de <strong>{toDelete?.name || toDelete?.email || "este lead"}</strong> será removido
              ({(toDelete?.prateleiraViewerIds.length || 0) + (toDelete?.proposalViewerIds.length || 0)} registro(s) de visualização).
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm bulk delete */}
      <AlertDialog open={bulkConfirm} onOpenChange={(o) => !o && !bulkDeleting && setBulkConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {selectedKeys.size} lead{selectedKeys.size > 1 ? "s" : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Todo o rastreio dos leads selecionados será removido permanentemente, incluindo visualizações, cliques e eventos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleBulkDelete(); }}
              disabled={bulkDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {bulkDeleting ? "Excluindo..." : `Excluir ${selectedKeys.size}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, hint, tone, delta }: {
  icon: any; label: string; value: string; hint?: string;
  tone?: "hot" | "live" | "value" | "profit"; delta?: number | null;
}) {
  return (
    <Card className={cn(
      "p-3 flex items-start gap-2.5 rounded-2xl border-border/40",
      tone === "hot" && "border-accent/40 bg-accent/5",
      tone === "live" && "border-emerald-500/40 bg-emerald-500/5",
      tone === "value" && "border-sky-500/30 bg-sky-500/5",
      tone === "profit" && "border-emerald-500/40 bg-emerald-500/5",
    )}>
      <div className={cn(
        "w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0",
        tone === "hot" ? "bg-accent/15 text-accent" :
        tone === "live" ? "bg-emerald-500/15 text-emerald-600" :
        tone === "value" ? "bg-sky-500/15 text-sky-600" :
        tone === "profit" ? "bg-emerald-500/15 text-emerald-600" :
        "bg-muted text-muted-foreground",
      )}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <p className="text-lg font-bold text-foreground leading-tight truncate">{value}</p>
          {typeof delta === "number" && (
            <span className={cn(
              "text-[9.5px] font-semibold px-1 py-0.5 rounded inline-flex items-center gap-0.5 tabular-nums",
              delta >= 0
                ? "bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"
                : "bg-destructive/12 text-destructive",
            )}>
              {delta >= 0 ? <ArrowUp className="w-2.5 h-2.5" /> : <ArrowDown className="w-2.5 h-2.5" />}
              {Math.abs(delta)}%
            </span>
          )}
        </div>
        <p className="text-[10.5px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
        {hint && <p className="text-[9px] text-muted-foreground/70 mt-0.5 leading-tight truncate">{hint}</p>}
      </div>
    </Card>
  );
}

function OriginBar({ label, tone, leads, pipeline, maxPipeline }: {
  label: string; tone: "prateleira" | "proposal"; leads: number; pipeline: number; maxPipeline: number;
}) {
  const pct = maxPipeline > 0 ? Math.max(2, (pipeline / maxPipeline) * 100) : 0;
  const barColor = tone === "proposal" ? "bg-violet-500" : "bg-sky-500";
  const textColor = tone === "proposal" ? "text-violet-600 dark:text-violet-400" : "text-sky-600 dark:text-sky-400";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className={cn("font-semibold", textColor)}>{label}</span>
        <span className="text-muted-foreground tabular-nums">
          {leads} lead{leads === 1 ? "" : "s"} · <span className="font-semibold text-foreground">{BRL(pipeline)}</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function FilterChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-8 px-3 rounded-lg text-[11px] font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "bg-muted/50 text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

function OriginBadge({ tone, label }: { tone: "prateleira" | "proposal" | "both"; label: string }) {
  const cls =
    tone === "proposal" ? "bg-violet-500/15 text-violet-600 dark:text-violet-400" :
    tone === "both" ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" :
    "bg-sky-500/15 text-sky-600 dark:text-sky-400";
  const Icon = tone === "proposal" ? FileText : tone === "both" ? Sparkles : PackageOpen;
  return (
    <Badge className={cn("text-[10px] border-0 gap-1", cls)}>
      <Icon className="w-2.5 h-2.5" /> {label}
    </Badge>
  );
}

function LeadDetail({ lead, events, proposalClicks, onClose, onDelete }: {
  lead: LeadAggregate | null;
  events: EventRow[];
  proposalClicks: ProposalClickRow[];
  onClose: () => void;
  onDelete: (l: LeadAggregate) => void;
}) {
  if (!lead) return null;

  const emailLc = (lead.email || "").toLowerCase();
  const prateleiraEvents = events.filter((e) => (e.email || "").toLowerCase() === emailLc);
  const proposalViewerIdSet = new Set(lead.proposalViewerIds);
  const propClicks = proposalClicks.filter((c) => c.viewer_id && proposalViewerIdSet.has(c.viewer_id));

  const prClicks = prateleiraEvents.filter((e) => e.event_type === "click");
  const sectionViews = prateleiraEvents.filter((e) => e.event_type === "section_view");
  const ua = parseUA(lead.userAgent);

  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              {lead.name || lead.email || "Lead"}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(lead)}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Excluir
            </Button>
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="flex-1 pr-3">
          <div className="space-y-4">
            <Card className="p-4 space-y-2">
              <div className="grid grid-cols-2 gap-3 text-[11.5px]">
                <Info icon={Mail} label="Email" value={lead.email || "·"} />
                <Info icon={Phone} label="Telefone" value={lead.phone || "·"} />
                <Info icon={MapPin} label="Localização" value={lead.city ? `${lead.city}${lead.country ? `, ${lead.country}` : ""}` : "·"} />
                <Info icon={Smartphone} label="Dispositivo" value={`${ua.os} · ${ua.browser}${lead.device ? ` (${lead.device})` : ""}`} />
                <Info icon={Activity} label="Primeira visita" value={format(new Date(lead.firstAt), "dd/MM/yyyy HH:mm", { locale: ptBR })} />
                <Info icon={Activity} label="Última visita" value={formatDistanceToNow(new Date(lead.lastAt), { locale: ptBR, addSuffix: true })} />
                {lead.utmSource && <Info icon={Target} label="UTM" value={`${lead.utmSource}${lead.utmCampaign ? ` · ${lead.utmCampaign}` : ""}`} />}
              </div>
            </Card>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <MiniKpi label="Prateleira" value={lead.productsViewed} />
              <MiniKpi label="Propostas" value={lead.proposalsViewed} />
              <MiniKpi label="Tempo ativo" value={formatTime(lead.totalSeconds)} />
              <MiniKpi label="Cliques CTA" value={lead.ctaCount} tone={lead.ctaCount > 0 ? "hot" : undefined} />
              <MiniKpi label="Pipeline" value={lead.totalValue > 0 ? BRL(lead.totalValue) : "·"} />
              <MiniKpi label="Lucro potencial" value={lead.profitPotential > 0 ? BRL(lead.profitPotential) : "·"} tone={lead.profitPotential > 0 ? "hot" : undefined} />
            </div>


            {/* Itens visualizados */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <PackageOpen className="w-3.5 h-3.5" /> Conteúdo visualizado
              </div>
              <div className="space-y-2">
                {lead.items.map((p) => (
                  <div key={`${p.kind}-${p.viewerId}`} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 hover:bg-muted/30">
                    {p.cover ? (
                      <img src={p.cover} alt="" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        {p.kind === "proposal"
                          ? <FileText className="w-4 h-4 text-violet-500" />
                          : <PackageOpen className="w-4 h-4 text-muted-foreground" />}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <OriginBadge
                          tone={p.kind === "proposal" ? "proposal" : "prateleira"}
                          label={p.kind === "proposal" ? "Proposta" : "Prateleira"}
                        />
                        <p className="text-[12px] font-semibold text-foreground truncate">{p.title}</p>
                      </div>
                      <p className="text-[10.5px] text-muted-foreground truncate">
                        {p.subtitle || "·"} · {p.views} {p.views === 1 ? "visualização" : "visualizações"} · {formatTime(p.activeSeconds)} ativo
                      </p>
                      <p className="text-[10px] text-muted-foreground/70">
                        Última vez {formatDistanceToNow(new Date(p.lastAt), { locale: ptBR, addSuffix: true })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      {p.value > 0 && (
                        <div className="text-right">
                          <p className="text-[11px] font-bold text-foreground tabular-nums leading-tight">{BRL(p.value)}</p>
                          {p.profit > 0 && (
                            <p className="text-[9.5px] text-emerald-600 dark:text-emerald-400 tabular-nums leading-tight">
                              ~{BRL(p.profit)} lucro
                            </p>
                          )}
                        </div>
                      )}
                      {(p.cta || p.whatsapp) && (
                        <div className="flex gap-1">
                          {p.cta && <Badge className="text-[9px] border-0 bg-accent/15 text-accent">CTA</Badge>}
                          {p.whatsapp && <Badge className="text-[9px] border-0 bg-emerald-500/15 text-emerald-600">WhatsApp</Badge>}
                        </div>
                      )}
                      {p.slug && (
                        <Link
                          to={p.kind === "proposal" ? `/p/${p.slug}` : `/produtos/${p.slug}/editar`}
                          target={p.kind === "proposal" ? "_blank" : undefined}
                          className="text-[10px] text-primary hover:underline flex items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          abrir {p.kind === "proposal" ? "proposta" : "produto"} <ExternalLink className="w-2.5 h-2.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Seções visitadas (prateleira) */}
            {sectionViews.length > 0 && (
              <Card className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <FilterIcon className="w-3.5 h-3.5" /> Seções visitadas
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(new Set(sectionViews.map((s) => s.section).filter(Boolean))).map((s) => (
                    <Badge key={s} variant="neutral" className="text-[10px] capitalize">
                      {(s || "").replace(/[-_]/g, " ")}
                    </Badge>
                  ))}
                </div>
              </Card>
            )}

            {/* Cliques prateleira */}
            {prClicks.length > 0 && (
              <Card className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Target className="w-3.5 h-3.5" /> Cliques na Prateleira ({prClicks.length})
                </div>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {prClicks.slice(0, 50).map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-[10.5px] py-1 px-2 rounded-md hover:bg-muted/30">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MousePointerClick className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground truncate">{c.target || "·"}</span>
                        {c.section && <span className="text-muted-foreground">· {c.section}</span>}
                      </div>
                      <span className="text-muted-foreground tabular-nums flex-shrink-0">
                        {format(new Date(c.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {/* Cliques propostas */}
            {propClicks.length > 0 && (
              <Card className="p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Target className="w-3.5 h-3.5 text-violet-500" /> Cliques nas Propostas ({propClicks.length})
                </div>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                  {propClicks.slice(0, 50).map((c) => (
                    <div key={c.id} className="flex items-center justify-between gap-2 text-[10.5px] py-1 px-2 rounded-md hover:bg-muted/30">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <MousePointerClick className="w-3 h-3 text-violet-500 flex-shrink-0" />
                        <span className="text-foreground truncate">{c.target_text || c.target_tag || "·"}</span>
                        {c.section_name && <span className="text-muted-foreground">· {c.section_name}</span>}
                      </div>
                      <span className="text-muted-foreground tabular-nums flex-shrink-0">
                        {format(new Date(c.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function Info({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-1.5">
      <Icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-[9.5px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-foreground truncate">{value}</p>
      </div>
    </div>
  );
}

function MiniKpi({ label, value, tone }: { label: string; value: string | number; tone?: "hot" }) {
  return (
    <Card className={cn(
      "p-2.5 rounded-xl text-center border-border/40",
      tone === "hot" && "border-accent/40 bg-accent/5",
    )}>
      <p className={cn("text-base font-bold leading-tight", tone === "hot" ? "text-accent" : "text-foreground")}>{value}</p>
      <p className="text-[10px] text-muted-foreground mt-0.5">{label}</p>
    </Card>
  );
}
