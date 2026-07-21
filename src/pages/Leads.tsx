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
// Lucro só é contabilizado quando existe internal_cost > 0 na proposta/produto.
// Nada de margem-fantasma: sem custo informado, não estimamos nem inventamos número.
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { formatTime, parseUA } from "@/lib/proposalAnalytics";
import { Link } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { LeadsOriginMap, type LeadMapPin } from "@/components/leads/LeadsOriginMap";
import { LeadsConversionFunnel } from "@/components/leads/LeadsConversionFunnel";
import { CustomerSinceBadge } from "@/components/clients/CustomerSinceBadge";
import { WhatsAppAvatar } from "@/components/inbox/WhatsAppAvatar";
import { WhatsAppIcon } from "@/components/icons/WhatsAppIcon";

// Data relativa + data exata juntas ("há cerca de 1 mês · 15/06/2026")
function formatWhen(iso: string | Date | null | undefined): string {
  if (!iso) return "·";
  const d = iso instanceof Date ? iso : new Date(iso);
  if (isNaN(d.getTime())) return "·";
  return `${formatDistanceToNow(d, { locale: ptBR, addSuffix: true })} · ${format(d, "dd/MM/yyyy", { locale: ptBR })}`;
}

// Classificação de intensidade da conversa no WhatsApp
function whatsappIntensity(count: number | null | undefined): { label: string; tone: "cold" | "warm" | "hot" } {
  const n = count ?? 0;
  if (n >= 15) return { label: `${n} mensagens · conversamos bastante`, tone: "hot" };
  if (n >= 5) return { label: `${n} mensagens trocadas`, tone: "warm" };
  if (n > 0) return { label: `${n} ${n === 1 ? "mensagem" : "mensagens"} · contato inicial`, tone: "cold" };
  return { label: "contato aberto", tone: "cold" };
}

// Ordenação usada na tabela principal e nas modais de drill-down
type SortKey = "recent" | "oldest" | "valueDesc" | "valueAsc";
const SORT_LABEL: Record<SortKey, string> = {
  recent: "Mais recente",
  oldest: "Mais antigo",
  valueDesc: "Valor (maior→menor)",
  valueAsc: "Valor (menor→maior)",
};
function sortLeads<T extends { totalValue: number; lastAt: string }>(list: T[], key: SortKey): T[] {
  const arr = [...list];
  arr.sort((a, b) => {
    if (key === "valueDesc") return b.totalValue - a.totalValue;
    if (key === "valueAsc") return a.totalValue - b.totalValue;
    const av = new Date(a.lastAt).getTime();
    const bv = new Date(b.lastAt).getTime();
    return key === "oldest" ? av - bv : bv - av;
  });
  return arr;
}

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
  latitude: number | null;
  longitude: number | null;

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
  latitude: number | null;
  longitude: number | null;

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
  internal_cost: number | null;
  internal_profit: number | null;
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
  viewerIds: string[];      // ids das linhas da viewer table (podem ser várias sessões do MESMO ref)
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
  value: number;            // valor unitário do pacote (contado UMA vez por refId)
  profit: number;           // lucro real (só se internal_cost > 0); 0 quando desconhecido
  costUnknown: boolean;     // true quando value > 0 mas não há custo interno informado
};

type LeadEnrichment = {
  count: number;
  value: number;
  profit: number;
  firstSaleAt: string | null;
  lastSaleAt: string | null;
  customerSince: string | null;
  clientId: string | null;
  destinations: string[];
  paymentTop: string | null;
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
  productsViewed: number;      // nº de produtos únicos da Prateleira
  proposalsViewed: number;     // nº de propostas únicas
  totalViews: number;
  totalSeconds: number;
  ctaCount: number;
  whatsappCount: number;
  firstAt: string;
  lastAt: string;
  items: LeadItem[];           // JÁ deduplicados por (kind, refId)
  /** ids para deletar */
  prateleiraViewerIds: string[];
  proposalViewerIds: string[];
  /** financeiro (contando cada pacote UMA vez) */
  totalValue: number;          // soma dos pacotes visualizados (por refId único)
  profitPotential: number;     // lucro REAL — só considera itens com internal_cost > 0
  topValue: number;            // maior pacote visto
  /** transparência de dado incompleto */
  proposalsWithoutCost: number;
  productsWithoutCost: number;
};

type OriginFilter = "all" | "prateleira" | "proposal";

const isOnline = (iso: string) => Date.now() - new Date(iso).getTime() < 5 * 60 * 1000;

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
  const [conversions, setConversions] = useState<Record<string, LeadEnrichment>>({});
  const [waLinks, setWaLinks] = useState<Record<string, { conversationId: string; photo: string | null; lastMessageAt: string | null; messageCount: number }>>({});
  const [tableSort, setTableSort] = useState<SortKey>("recent");
  const [drillSort, setDrillSort] = useState<SortKey>("recent");
  // Drill-down: cada KPI/insight clicável abre esta modal com a lista real que compõe o número.
  const [drill, setDrill] = useState<{ title: string; hint?: string; leads: LeadAggregate[] } | null>(null);



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
        .select("id, title, slug, cover_image_url, destinations, client_name, total_value, internal_cost, internal_profit")
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
    // Cada lead carrega um sub-map de itens deduplicado por `${kind}:${refId}`
    // para nunca somar o mesmo pacote duas vezes quando existem múltiplas
    // sessões (linhas de viewer) apontando pra mesma proposta/produto.
    const itemsByLead = new Map<string, Map<string, LeadItem>>();

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
          proposalsWithoutCost: 0,
          productsWithoutCost: 0,
        };
        map.set(key, lead);
        itemsByLead.set(key, new Map<string, LeadItem>());
      } else {
        if (!lead.name && seed.name) lead.name = seed.name;
        if (!lead.phone && seed.phone) lead.phone = seed.phone;
        if (!lead.city && seed.city) lead.city = seed.city;
        if (!lead.country && seed.country) lead.country = seed.country;
        if (!lead.userAgent && seed.userAgent) lead.userAgent = seed.userAgent;
        if (!lead.device && seed.device) lead.device = seed.device;
        if (!lead.utmSource && seed.utmSource) lead.utmSource = seed.utmSource;
        if ((lead.lat == null || lead.lng == null) && seed.lat != null && seed.lng != null) {
          lead.lat = seed.lat; lead.lng = seed.lng;
        }
      }
      return lead;
    };

    /** Mescla um item no lead SEM duplicar valor por refId. */
    const upsertItem = (leadKey: string, refKey: string, base: LeadItem) => {
      const bag = itemsByLead.get(leadKey)!;
      const existing = bag.get(refKey);
      if (!existing) {
        bag.set(refKey, base);
        return;
      }
      existing.viewerIds.push(...base.viewerIds);
      existing.views += base.views;
      existing.activeSeconds += base.activeSeconds;
      existing.cta = existing.cta || base.cta;
      existing.whatsapp = existing.whatsapp || base.whatsapp;
      if (new Date(base.firstAt) < new Date(existing.firstAt)) existing.firstAt = base.firstAt;
      if (new Date(base.lastAt) > new Date(existing.lastAt)) existing.lastAt = base.lastAt;
      // value/profit/costUnknown mantidos da 1ª ocorrência — refId é o mesmo pacote
    };

    // ─── Prateleira ────────────────────────────────────────────────────
    for (const v of viewers) {
      const key = (v.email || "").toLowerCase().trim() || `anon-pr:${v.id}`;
      const lead = ensure(key, {
        email: v.email, name: v.name, phone: v.phone, city: v.city, region: v.region,
        country: v.country, lat: v.latitude, lng: v.longitude,
        device: v.device_type, userAgent: v.user_agent,
        utmSource: v.utm_source, utmCampaign: v.utm_campaign,
        firstAt: v.first_viewed_at, lastAt: v.last_active_at,
      });
      if (v.latitude != null && v.longitude != null && new Date(v.last_active_at) >= new Date(lead.lastAt)) {
        lead.lat = Number(v.latitude); lead.lng = Number(v.longitude);
      }

      if (new Date(v.first_viewed_at) < new Date(lead.firstAt)) lead.firstAt = v.first_viewed_at;
      if (new Date(v.last_active_at) > new Date(lead.lastAt)) lead.lastAt = v.last_active_at;
      lead.totalViews += v.total_views || 1;
      lead.totalSeconds += v.active_seconds || 0;
      if (v.cta_clicked) lead.ctaCount += 1;
      if (v.whatsapp_clicked) lead.whatsappCount += 1;
      lead.prateleiraViewerIds.push(v.id);

      const p = products[v.product_id];
      const pPrice = Number(p?.price_promo || p?.price_from || 0);
      const pCost = Number(p?.internal_cost || 0);
      const costUnknown = pPrice > 0 && !(pCost > 0);
      const pProfit = pPrice > 0 && pCost > 0 ? Math.max(pPrice - pCost, 0) : 0;

      upsertItem(key, `product:${v.product_id}`, {
        kind: "product",
        refId: v.product_id,
        viewerIds: [v.id],
        title: p?.title || "Produto",
        subtitle: p?.destination || null,
        cover: p?.cover_image_url || null,
        slug: p?.slug || null,
        views: v.total_views || 1,
        activeSeconds: v.active_seconds || 0,
        cta: !!v.cta_clicked,
        whatsapp: !!v.whatsapp_clicked,
        firstAt: v.first_viewed_at,
        lastAt: v.last_active_at,
        value: pPrice,
        profit: pProfit,
        costUnknown,
      });
    }

    // ─── Propostas Personalizadas ──────────────────────────────────────
    for (const v of proposalViewers) {
      const key = (v.email || "").toLowerCase().trim() || `anon-pp:${v.id}`;
      const lead = ensure(key, {
        email: v.email, name: v.name, phone: v.phone, city: v.city, region: v.region,
        country: v.country, lat: v.latitude, lng: v.longitude,
        device: v.device_type, userAgent: v.user_agent,
        firstAt: v.first_viewed_at, lastAt: v.last_active_at,
      });
      if (v.latitude != null && v.longitude != null && new Date(v.last_active_at) >= new Date(lead.lastAt)) {
        lead.lat = Number(v.latitude); lead.lng = Number(v.longitude);
      }

      if (new Date(v.first_viewed_at) < new Date(lead.firstAt)) lead.firstAt = v.first_viewed_at;
      if (new Date(v.last_active_at) > new Date(lead.lastAt)) lead.lastAt = v.last_active_at;
      lead.totalViews += v.total_views || 1;
      const secs = v.active_seconds || v.total_time_seconds || 0;
      lead.totalSeconds += secs;
      if (v.cta_clicked) lead.ctaCount += 1;
      if (v.whatsapp_clicked) lead.whatsappCount += 1;
      lead.proposalViewerIds.push(v.id);

      const pr = proposals[v.proposal_id];
      const prValue = Number(pr?.total_value || 0);
      const prCost = Number(pr?.internal_cost || 0);
      const prStoredProfit = pr?.internal_profit != null ? Number(pr.internal_profit) : null;
      const costUnknown = prValue > 0 && !(prCost > 0);
      const prProfit = prValue > 0 && prCost > 0
        ? (prStoredProfit != null && prStoredProfit >= 0 ? prStoredProfit : Math.max(prValue - prCost, 0))
        : 0;

      upsertItem(key, `proposal:${v.proposal_id}`, {
        kind: "proposal",
        refId: v.proposal_id,
        viewerIds: [v.id],
        title: pr?.title || "Proposta personalizada",
        subtitle: pr?.client_name || (pr?.destinations || []).join(", ") || null,
        cover: pr?.cover_image_url || null,
        slug: pr?.slug || null,
        views: v.total_views || 1,
        activeSeconds: secs,
        cta: !!v.cta_clicked,
        whatsapp: !!v.whatsapp_clicked,
        firstAt: v.first_viewed_at,
        lastAt: v.last_active_at,
        value: prValue,
        profit: prProfit,
        costUnknown,
      });
    }

    // Materializa itens deduplicados e computa totais UMA vez por pacote
    return Array.from(map.values())
      .map((l) => {
        const items = Array.from(itemsByLead.get(l.key)?.values() || [])
          .sort((a, b) => b.activeSeconds - a.activeSeconds);
        let totalValue = 0;
        let profitPotential = 0;
        let topValue = 0;
        let proposalsWithoutCost = 0;
        let productsWithoutCost = 0;
        let productsUnique = 0;
        let proposalsUnique = 0;
        for (const it of items) {
          totalValue += it.value;
          profitPotential += it.profit;
          if (it.value > topValue) topValue = it.value;
          if (it.kind === "proposal") {
            proposalsUnique += 1;
            if (it.costUnknown) proposalsWithoutCost += 1;
          } else {
            productsUnique += 1;
            if (it.costUnknown) productsWithoutCost += 1;
          }
        }
        return {
          ...l,
          items,
          totalValue,
          profitPotential,
          topValue,
          proposalsWithoutCost,
          productsWithoutCost,
          productsViewed: productsUnique,
          proposalsViewed: proposalsUnique,
        };
      })
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

  // Fetch conversions + client/sales enrichment (pré-agrega por client_id
  // ANTES de mapear pro lead pra nunca duplicar linhas por venda)
  useEffect(() => {
    (async () => {
      const emails = Array.from(new Set(leads.map((l) => (l.email || "").toLowerCase().trim()).filter(Boolean)));
      const phones = Array.from(new Set(leads.map((l) => normPhone(l.phone)).filter((p) => p && p.length >= 8)));
      if (emails.length === 0 && phones.length === 0) { setConversions({}); return; }
      const clientsQuery = (supabase as any).from("clients").select("id, email, phone, customer_since");
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
        .select("client_id, received_value, total_cost, profit, status, created_at, close_date, destination_city, payment_method")
        .in("client_id", clientIds);

      // Pré-agrega por client_id (nunca por linha)
      type Bucket = {
        count: number; value: number; profit: number;
        firstSaleAt: string | null; lastSaleAt: string | null;
        destinations: Set<string>; paymentCounts: Map<string, number>;
      };
      const byClient: Record<string, Bucket> = {};
      (salesRows || []).forEach((s: any) => {
        if ((s.status || "").toLowerCase() === "cancelado") return;
        const cur = byClient[s.client_id] || {
          count: 0, value: 0, profit: 0,
          firstSaleAt: null, lastSaleAt: null,
          destinations: new Set<string>(), paymentCounts: new Map<string, number>(),
        };
        cur.count += 1;
        cur.value += Number(s.received_value || 0);
        const p = s.profit != null ? Number(s.profit) : Math.max(Number(s.received_value || 0) - Number(s.total_cost || 0), 0);
        cur.profit += p;
        const when = s.close_date || s.created_at;
        if (when) {
          if (!cur.firstSaleAt || new Date(when) < new Date(cur.firstSaleAt)) cur.firstSaleAt = when;
          if (!cur.lastSaleAt || new Date(when) > new Date(cur.lastSaleAt)) cur.lastSaleAt = when;
        }
        if (s.destination_city) cur.destinations.add(String(s.destination_city));
        if (s.payment_method && s.payment_method !== "atualizar campo") {
          cur.paymentCounts.set(s.payment_method, (cur.paymentCounts.get(s.payment_method) || 0) + 1);
        }
        byClient[s.client_id] = cur;
      });

      const out: Record<string, LeadEnrichment> = {};
      for (const c of clientRows) {
        const stats = byClient[c.id];
        const paymentTop = stats
          ? Array.from(stats.paymentCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
          : null;
        const enrich: LeadEnrichment = {
          count: stats?.count ?? 0,
          value: stats?.value ?? 0,
          profit: stats?.profit ?? 0,
          firstSaleAt: stats?.firstSaleAt ?? null,
          lastSaleAt: stats?.lastSaleAt ?? null,
          customerSince: c.customer_since ?? null,
          clientId: c.id,
          destinations: stats ? Array.from(stats.destinations).slice(0, 8) : [],
          paymentTop,
        };
        // Só marca como "convertido" quem tem venda; mas mantém enrichment pra "cliente sem venda no período"
        // Ainda assim, só grava em `out` quem casar com email ou phone
        const emailKey = (c.email || "").toLowerCase().trim();
        const phoneKey = normPhone(c.phone);
        if (emailKey) out[`e:${emailKey}`] = enrich;
        if (phoneKey) out[`p:${phoneKey}`] = enrich;
      }
      setConversions(out);
      setConversions(out);
    })();
  }, [leads]);

  const leadConversion = (l: LeadAggregate) => {
    const e = (l.email || "").toLowerCase().trim();
    const p = normPhone(l.phone);
    return conversions[`e:${e}`] || conversions[`p:${p}`] || null;
  };

  // Cruzamento com WhatsApp: 1 registro por telefone (mais recente)
  useEffect(() => {
    (async () => {
      const phones = Array.from(new Set(leads.map((l) => normPhone(l.phone)).filter((p) => p && p.length >= 8)));
      if (!phones.length) { setWaLinks({}); return; }
      const phonesSet = new Set(phones);
      const { data: convData } = await (supabase as any)
        .from("conversations")
        .select("id, phone, profile_picture_url, last_message_at, is_group, interaction_count")
        .eq("is_group", false)
        .not("phone", "is", null)
        .order("last_message_at", { ascending: false })
        .limit(5000);
      const out: Record<string, { conversationId: string; photo: string | null; lastMessageAt: string | null; messageCount: number }> = {};
      for (const c of (convData || [])) {
        const p = normPhone(c.phone);
        if (!p || !phonesSet.has(p)) continue;
        const prev = out[p];
        if (!prev || (c.last_message_at && (!prev.lastMessageAt || new Date(c.last_message_at) > new Date(prev.lastMessageAt)))) {
          out[p] = {
            conversationId: c.id,
            photo: c.profile_picture_url || null,
            lastMessageAt: c.last_message_at || null,
            messageCount: Number(c.interaction_count ?? 0),
          };
        }
      }
      // Fallback fotos via zapi_contacts
      const missingPhoto = Object.entries(out).filter(([, v]) => !v.photo).map(([p]) => p);
      if (missingPhoto.length) {
        const { data: zc } = await (supabase as any)
          .from("zapi_contacts")
          .select("phone, profile_picture_url")
          .not("profile_picture_url", "is", null)
          .limit(5000);
        for (const z of (zc || [])) {
          const p = normPhone(z.phone);
          if (out[p] && !out[p].photo && z.profile_picture_url) out[p].photo = z.profile_picture_url;
        }
      }
      setWaLinks(out);
    })();
  }, [leads]);

  const leadWa = (l: LeadAggregate) => waLinks[normPhone(l.phone)] || null;


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

  // Insight: converted leads (lead → cliente → venda). "Converted" = tem venda real.
  const isConverted = (l: LeadAggregate) => (leadConversion(l)?.count ?? 0) > 0;
  const convertedLeads = useMemo(() => periodLeads.filter(isConverted), [periodLeads, conversions]);
  const conversionValue = convertedLeads.reduce((s, l) => s + (leadConversion(l)?.value || 0), 0);
  const conversionRate = totalLeads > 0 ? (convertedLeads.length / totalLeads) * 100 : 0;

  // Insight: quentes sem retorno
  // Teto de recência FIXO de 30 dias — independente do filtro global de período.
  // Regra do produto: não mostrar leads muito antigos aqui, mesmo com "Tudo" ligado.
  const hotStale = useMemo(() => {
    const now = Date.now();
    const staleCutoff = now - 24 * 3600 * 1000;       // já esfriou (>24h sem retorno)
    const recencyFloor = now - 30 * 24 * 3600 * 1000; // mas ainda dentro dos últimos 30d
    return periodLeads
      .filter((l) => {
        const t = new Date(l.lastAt).getTime();
        return (l.ctaCount > 0 || l.whatsappCount > 0)
          && !isConverted(l)
          && t < staleCutoff
          && t >= recencyFloor;
      })
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
    const counts = new Map<string, { title: string; kind: "product" | "proposal"; refId: string; slug: string | null; views: number }>();
    for (const l of periodLeads) {
      for (const it of l.items) {
        const k = `${it.kind}:${it.refId}`;
        const prev = counts.get(k);
        if (prev) prev.views += it.views;
        else counts.set(k, { title: it.title, kind: it.kind, refId: it.refId, slug: it.slug, views: it.views });
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

  // Mapa: 1 pino por pessoa com lat/lng
  const mapPins = useMemo(() => {
    return periodLeads
      .filter((l) => l.lat != null && l.lng != null
        && !isNaN(Number(l.lat)) && !isNaN(Number(l.lng))
        && Number(l.lat) !== 0 && Number(l.lng) !== 0)
      .map((l) => {
        const client = isConverted(l);
        const engaged = l.ctaCount > 0 || l.whatsappCount > 0;
        const temperature: "hot" | "warm" | "cold" =
          engaged ? "hot" : (l.totalSeconds > 30 || l.totalViews > 2) ? "warm" : "cold";
        return {
          key: l.key,
          name: l.name || l.email || "Lead anônimo",
          city: l.city,
          country: l.country,
          lat: Number(l.lat),
          lng: Number(l.lng),
          temperature,
          isClient: client,
          pipeline: l.totalValue,
        };
      });
  }, [periodLeads, conversions]);

  // Funil de conversão (usa o mesmo dataset periodLeads, sem duplicar por evento)
  const funnelStages = useMemo(() => {
    const engaged = periodLeads.filter((l) => l.ctaCount > 0 || l.whatsappCount > 0);
    const withProposal = periodLeads.filter((l) => l.proposalsViewed > 0);
    const converted = convertedLeads;
    const sumProposalPipeline = (arr: LeadAggregate[]) =>
      arr.reduce((s, l) => s + l.items.filter((i) => i.kind === "proposal").reduce((a, i) => a + i.value, 0), 0);
    return [
      { key: "view", label: "Visualizou", leads: periodLeads.length, value: pipelineValue },
      { key: "engage", label: "Engajou (CTA/WhatsApp)", leads: engaged.length, value: engaged.reduce((s, l) => s + l.totalValue, 0) },
      { key: "proposal", label: "Viu proposta personalizada", leads: withProposal.length, value: sumProposalPipeline(withProposal) },
      { key: "sale", label: "Fechou venda", leads: converted.length, value: conversionValue },
    ];
  }, [periodLeads, convertedLeads, pipelineValue, conversionValue]);

  // Ranking por canal (utm_source) — pipeline + venda real. Propostas sem utm caem em "Direto/Proposta".
  const utmRanking = useMemo(() => {
    const m = new Map<string, { leads: number; pipeline: number; soldValue: number; soldCount: number }>();
    for (const l of periodLeads) {
      const src = l.utmSource
        || (l.proposalsViewed > 0 && l.productsViewed === 0 ? "Direto/Proposta" : "Direto");
      const cur = m.get(src) || { leads: 0, pipeline: 0, soldValue: 0, soldCount: 0 };
      cur.leads += 1;
      cur.pipeline += l.totalValue;
      const conv = leadConversion(l);
      if (conv && conv.count > 0) {
        cur.soldValue += conv.value;
        cur.soldCount += conv.count;
      }
      m.set(src, cur);
    }
    return Array.from(m.entries())
      .map(([source, s]) => ({ source, ...s }))
      .sort((a, b) => b.soldValue - a.soldValue || b.leads - a.leads);
  }, [periodLeads, conversions]);

  // Insight: horário de pico de engajamento (0-23h) — usa items dos leads no período
  const peakHours = useMemo(() => {
    const buckets = new Array(24).fill(0);
    for (const l of periodLeads) {
      for (const it of l.items) {
        const h = new Date(it.lastAt).getHours();
        if (h >= 0 && h < 24) buckets[h] += Math.max(1, it.views || 1);
      }
    }
    const max = Math.max(...buckets, 1);
    const total = buckets.reduce((s, v) => s + v, 0);
    const peakIdx = buckets.indexOf(Math.max(...buckets));
    return { buckets, max, total, peakIdx };
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
        <Kpi icon={Users} label="Total de leads" value={totalLeads.toLocaleString("pt-BR")} delta={pct(totalLeads, prevTotal)}
          onClick={() => setDrill({ title: "Total de leads no período", hint: "Todos os leads únicos considerados no período selecionado.", leads: periodLeads })} />
        <Kpi icon={Wifi} label="Online agora" value={onlineNow.toLocaleString("pt-BR")} tone={onlineNow > 0 ? "live" : undefined}
          onClick={() => setDrill({ title: "Leads online agora", hint: "Ativos nos últimos 5 minutos · veja quem está e o que está olhando.", leads: periodLeads.filter((l) => isOnline(l.lastAt)).sort((a,b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime()) })} />

        <Kpi icon={TrendingUp} label="Leads quentes" value={hotLeads.toLocaleString("pt-BR")} hint="clicaram CTA ou WhatsApp" tone={hotLeads > 0 ? "hot" : undefined} delta={pct(hotLeads, prevHot)}
          onClick={() => setDrill({ title: "Leads quentes", hint: "Clicaram no CTA ou no WhatsApp.", leads: periodLeads.filter((l) => l.ctaCount > 0 || l.whatsappCount > 0) })} />
        <Kpi icon={FileText} label="Viram proposta" value={propostaLeads.toLocaleString("pt-BR")} hint="propostas personalizadas"
          onClick={() => setDrill({ title: "Leads que viram proposta personalizada", leads: periodLeads.filter((l) => l.proposalsViewed > 0) })} />
        <Kpi icon={DollarSign} label="Pipeline" value={BRL(pipelineValue)} hint="valor total visualizado" tone="value" delta={pct(pipelineValue, prevPipeline)}
          onClick={() => setDrill({ title: "Pipeline · valor visualizado", hint: "Leads com pacotes/propostas com valor > 0.", leads: [...periodLeads].filter((l) => l.totalValue > 0).sort((a, b) => b.totalValue - a.totalValue) })} />
        <Kpi icon={Flame} label="Lucro potencial" value={BRL(profitPotential)} hint="apenas com custo informado" tone="profit"
          onClick={() => setDrill({ title: "Lucro potencial", hint: "Só entra na conta lead com internal_cost preenchido na proposta/produto.", leads: [...periodLeads].filter((l) => l.profitPotential > 0).sort((a, b) => b.profitPotential - a.profitPotential) })} />
        <Kpi icon={TrendingUp} label="Ticket médio" value={BRL(avgTicket)} hint="por lead"
          onClick={() => setDrill({ title: "Base do ticket médio", hint: "Todos os leads considerados na média de pipeline.", leads: periodLeads })} />

      </div>

      {/* Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Conversão em venda */}
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setDrill({ title: "Leads que viraram venda", hint: "Leads do período com venda registrada em `sales`.", leads: convertedLeads })}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setDrill({ title: "Leads que viraram venda", leads: convertedLeads }); } }}
          className="p-4 space-y-2 border-emerald-500/25 bg-gradient-to-br from-emerald-500/[0.05] to-transparent cursor-pointer hover:border-emerald-500/50 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
        >
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
            <OriginBar label="Prateleira" tone="prateleira" leads={prateleiraLeads.length} pipeline={prateleiraPipeline} maxPipeline={Math.max(prateleiraPipeline, proposalPipeline, 1)}
              onClick={() => setDrill({ title: "Leads via Prateleira", hint: "Visualizaram algum produto da Prateleira no período.", leads: prateleiraLeads })} />
            <OriginBar label="Proposta" tone="proposal" leads={proposalLeads.length} pipeline={proposalPipeline} maxPipeline={Math.max(prateleiraPipeline, proposalPipeline, 1)}
              onClick={() => setDrill({ title: "Leads via Proposta personalizada", hint: "Abriram alguma proposta enviada no período.", leads: proposalLeads })} />
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
              <button
                type="button"
                key={i}
                onClick={() => setDrill({
                  title: `Quem viu · ${it.title}`,
                  hint: it.kind === "proposal" ? "Leads que abriram esta proposta." : "Leads que visualizaram este produto.",
                  leads: periodLeads.filter((l) => l.items.some((x) => x.kind === it.kind && x.refId === it.refId)),
                })}
                className="w-full flex items-center gap-2 py-1 border-b border-border/20 last:border-0 hover:bg-muted/40 rounded px-1 text-left transition"
              >
                <span className="text-[10px] font-bold text-muted-foreground tabular-nums w-4">{i + 1}</span>
                {it.kind === "proposal"
                  ? <FileText className="w-3 h-3 text-violet-500 flex-shrink-0" />
                  : <PackageOpen className="w-3 h-3 text-sky-500 flex-shrink-0" />}
                <span className="text-[11px] text-foreground truncate flex-1" title={it.title}>{it.title}</span>
                <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{it.views}</span>
              </button>
            ))}

          </div>
        </Card>
      </div>

      {/* Horário de pico */}
      {peakHours.total > 0 && (
        <Card className="p-4 space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
              <Clock className="w-4 h-4 text-primary" />
              Horário de pico de engajamento
              <Badge className="text-[9px] border-0 bg-primary/12 text-primary">
                pico às {String(peakHours.peakIdx).padStart(2, "0")}h
              </Badge>
            </div>
            <p className="text-[10px] text-muted-foreground">
              quando os leads mais visualizam e engajam · {peakHours.total} interações no período
            </p>
          </div>
          <div className="flex items-end gap-[2px] h-16">
            {peakHours.buckets.map((v, h) => {
              const pct = v / peakHours.max;
              const isPeak = h === peakHours.peakIdx && v > 0;
              return (
                <div key={h} className="flex-1 flex flex-col items-center justify-end gap-1 group">
                  <div
                    className={cn(
                      "w-full rounded-t transition-colors",
                      isPeak ? "bg-primary" : v > 0 ? "bg-primary/40" : "bg-muted/40",
                    )}
                    style={{ height: `${Math.max(pct * 100, v > 0 ? 6 : 2)}%` }}
                    title={`${String(h).padStart(2, "0")}h · ${v} interação${v === 1 ? "" : "ões"}`}
                  />
                  {h % 3 === 0 && (
                    <span className={cn("text-[8.5px] tabular-nums", isPeak ? "text-primary font-semibold" : "text-muted-foreground/70")}>
                      {String(h).padStart(2, "0")}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Mapa de origem dos leads */}

      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-[12px] font-semibold text-foreground">
            <MapPin className="w-4 h-4 text-primary" />
            Mapa de origem
            <Badge className="text-[9px] border-0 bg-primary/12 text-primary">
              {mapPins.length} localizados
            </Badge>
          </div>
          <p className="text-[10px] text-muted-foreground hidden sm:block">
            1 pino por pessoa · cor por temperatura · verde = cliente
          </p>
        </div>
        <LeadsOriginMap
          pins={mapPins}
          onPinClick={(k) => {
            const l = periodLeads.find((x) => x.key === k);
            if (l) setSelected(l);
          }}
          className="h-[380px] w-full"
        />
      </Card>

      {/* Funil de conversão + retorno por canal */}
      <LeadsConversionFunnel
        stages={funnelStages}
        utm={utmRanking}
        onStageClick={(s) => {
          const map: Record<string, LeadAggregate[]> = {
            view: periodLeads,
            engage: periodLeads.filter((l) => l.ctaCount > 0 || l.whatsappCount > 0),
            proposal: periodLeads.filter((l) => l.proposalsViewed > 0),
            sale: convertedLeads,
          };
          setDrill({ title: `Funil · ${s.label}`, hint: `${s.leads} leads nesta etapa.`, leads: map[s.key] || [] });
        }}
        onUtmClick={(u) => {
          setDrill({
            title: `Canal · ${u.source}`,
            hint: `${u.leads} leads · pipeline ${u.pipeline > 0 ? BRL(u.pipeline) : "sem valor"} · fechado ${u.soldValue > 0 ? BRL(u.soldValue) : "—"}.`,
            leads: periodLeads.filter((l) => {
              const src = l.utmSource
                || (l.proposalsViewed > 0 && l.productsViewed === 0 ? "Direto/Proposta" : "Direto");
              return src === u.source;
            }),
          });
        }}
      />



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
            {hotStale.map((l) => {
              const wa = leadWa(l);
              const isClient = (leadConversion(l)?.count ?? 0) > 0;
              return (
              <div key={l.key} className="p-2.5 rounded-lg border border-amber-500/25 bg-card space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <WhatsAppAvatar
                      src={wa?.photo || null}
                      name={l.name || l.email || "?"}
                      phone={normPhone(l.phone) || undefined}
                      size={22}
                      className="w-[22px] h-[22px] text-[9px] flex-shrink-0"
                    />
                    <p className="text-[11.5px] font-semibold text-foreground truncate">{l.name || l.email || "Sem nome"}</p>
                    {isClient && <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />}
                  </div>
                  {l.phone && (
                    <a
                      href={`https://wa.me/${normPhone(l.phone)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-shrink-0 inline-flex items-center gap-0.5 text-[9.5px] font-semibold text-emerald-600 hover:text-emerald-700"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <MessageCircle className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{l.items[0]?.title || "·"}</p>
                <div className="flex items-center justify-between text-[10px]">
                  {l.profitPotential > 0 ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">{BRL(l.profitPotential)} lucro</span>
                  ) : l.totalValue > 0 ? (
                    <span className="text-foreground font-semibold tabular-nums">{BRL(l.totalValue)}</span>
                  ) : (
                    <span className="text-muted-foreground/70">sem valor</span>
                  )}
                  <span className="text-muted-foreground truncate ml-2" title={format(new Date(l.lastAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}>{formatWhen(l.lastAt)}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelected(l)}
                  className="w-full text-[10px] text-primary hover:underline pt-0.5"
                >
                  ver detalhes →
                </button>
              </div>
              );
            })}

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
              const wa = leadWa(l);
              const isClient = (leadConversion(l)?.count ?? 0) > 0;
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
                      <WhatsAppAvatar
                        src={wa?.photo || null}
                        name={l.name || l.email || "?"}
                        phone={normPhone(l.phone) || undefined}
                        size={22}
                        className="w-[22px] h-[22px] text-[9px] flex-shrink-0"
                      />
                      <p className="text-[12px] font-semibold text-foreground truncate">
                        {l.name || l.email || "Sem nome"}
                      </p>
                      {isClient && <CheckCircle2 className="w-3 h-3 text-emerald-600 flex-shrink-0" />}
                    </div>
                    <OriginBadge tone={o.tone} label={o.label} />
                  </div>

                  <p className="text-[10px] text-muted-foreground truncate">
                    {top?.title || "·"}
                  </p>
                  <div className="flex items-end justify-between gap-2 pt-1">
                    <div className="min-w-0">
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Lucro potencial</p>
                      {l.profitPotential > 0 ? (
                        <p className="text-[13px] font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                          {BRL(l.profitPotential)}
                        </p>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/70 leading-tight">Custo não informado</p>
                      )}
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
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border/40 bg-muted/20">
          <p className="text-[11px] text-muted-foreground tabular-nums">
            {filtered.length} lead{filtered.length === 1 ? "" : "s"}
          </p>
          <SortMenu value={tableSort} onChange={setTableSort} />
        </div>
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
                <th className="text-left p-3 font-medium">
                  <SortHeader label="Valor / Lucro" activeAsc={tableSort === "valueAsc"} activeDesc={tableSort === "valueDesc"}
                    onClick={() => setTableSort(tableSort === "valueDesc" ? "valueAsc" : "valueDesc")} />
                </th>
                <th className="text-left p-3 font-medium">Ações</th>
                <th className="text-left p-3 font-medium">
                  <SortHeader label="Última visita" activeAsc={tableSort === "oldest"} activeDesc={tableSort === "recent"}
                    onClick={() => setTableSort(tableSort === "recent" ? "oldest" : "recent")} />
                </th>
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
              ) : sortLeads(filtered, tableSort).map((l) => {
                const online = isOnline(l.lastAt);
                const ua = parseUA(l.userAgent);
                const o = originLabel(l);
                const topItem = l.items[0];
                const wa = leadWa(l);
                const isClient = (leadConversion(l)?.count ?? 0) > 0;
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
                        <div className="relative flex-shrink-0">
                          <WhatsAppAvatar
                            src={wa?.photo || null}
                            name={l.name || l.email || "?"}
                            phone={normPhone(l.phone) || undefined}
                            size={36}
                            className="w-9 h-9 text-[11px]"
                          />
                          <span
                            className={cn(
                              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full ring-2 ring-background",
                              online ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/30",
                            )}
                            title={online ? "Online agora" : "Offline"}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-semibold text-foreground truncate">{l.name || "Sem nome"}</p>
                            {isClient && (
                              <Badge className="text-[9px] border-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 gap-0.5 h-4 px-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> Cliente
                              </Badge>
                            )}
                            {wa && (
                              <Badge className="text-[9px] border-0 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 gap-1 h-4 px-1" title={whatsappIntensity(wa.messageCount).label}>
                                <WhatsAppIcon className="w-2.5 h-2.5" />
                                {wa.messageCount > 0 ? `${wa.messageCount}` : "contato"}
                              </Badge>
                            )}
                          </div>
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
                          {l.profitPotential > 0 ? (
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 tabular-nums leading-tight flex items-center gap-1">
                              <Flame className="w-2.5 h-2.5" /> {BRL(l.profitPotential)} lucro
                            </p>
                          ) : (
                            <p className="text-[10px] text-muted-foreground/70 leading-tight">Custo não informado</p>
                          )}
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
                    <td className="p-3 align-top text-[10.5px] text-muted-foreground whitespace-nowrap">
                      {formatWhen(l.lastAt)}
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
        enrichment={selected ? leadConversion(selected) : null}
        waLink={selected ? leadWa(selected) : null}
        onClose={() => setSelected(null)}
        onDelete={(l) => setToDelete(l)}
      />

      {/* Drill-down: lista real por trás de qualquer indicador clicado */}
      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-sm">{drill?.title}</DialogTitle>
            {drill?.hint && (
              <p className="text-[11px] text-muted-foreground pt-1">{drill.hint}</p>
            )}
            <p className="text-[10.5px] text-muted-foreground pt-1 tabular-nums">
              {drill?.leads.length ?? 0} registro{(drill?.leads.length ?? 0) === 1 ? "" : "s"}
            </p>
          </DialogHeader>
          <ScrollArea className="flex-1 pr-3">
            {drill && drill.leads.length === 0 ? (
              <p className="text-[11px] text-muted-foreground py-6 text-center">Nenhum lead nesta lista.</p>
            ) : (
              <div className="space-y-1.5">
                {drill?.leads.map((l) => {
                  const wa = waLinks[l.key];
                  const conv = conversions[l.key];
                  const isClient = (conv?.count ?? 0) > 0;
                  const online = isOnline(l.lastAt);
                  const top = l.items[0];
                  const sourceLabel = top?.kind === "proposal" ? "Proposta" : top?.kind === "product" ? "Prateleira" : null;
                  return (
                    <button
                      key={l.key}
                      type="button"
                      onClick={() => { setSelected(l); setDrill(null); }}
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border/40 hover:bg-muted/40 text-left transition"
                    >
                      <div className="relative flex-shrink-0">
                        <WhatsAppAvatar
                          src={wa?.photo || null}
                          name={l.name || l.email || "?"}
                          phone={normPhone(l.phone) || undefined}
                          size={32}
                          className="w-8 h-8 text-[11px]"
                        />
                        {online && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" title="Online agora" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[12px] font-semibold text-foreground truncate">
                            {l.name || l.email || "Lead anônimo"}
                          </p>
                          {isClient && (
                            <Badge className="text-[9px] border-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 h-4 px-1">
                              Cliente
                            </Badge>
                          )}
                          {wa && (
                            <Badge className="text-[9px] border-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 h-4 px-1">
                              WA
                            </Badge>
                          )}
                          {sourceLabel && (
                            <Badge variant="outline" className="text-[9px] h-4 px-1 border-border/50 text-muted-foreground">
                              {sourceLabel}
                            </Badge>
                          )}
                        </div>
                        {top?.title && (
                          <p className="text-[10.5px] text-foreground/80 truncate">
                            {online ? "vendo: " : "último item: "}<span className="font-medium">{top.title}</span>
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground truncate">
                          {(l.email || "sem email")} · {formatDistanceToNow(new Date(l.lastAt), { locale: ptBR, addSuffix: true })}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-[11px] font-bold text-foreground tabular-nums">
                          {l.totalValue > 0 ? BRL(l.totalValue) : "·"}
                        </p>
                        <p className="text-[9.5px] text-muted-foreground tabular-nums">
                          {l.totalViews} view{l.totalViews === 1 ? "" : "s"}
                        </p>
                      </div>
                    </button>

                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>



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

function Kpi({ icon: Icon, label, value, hint, tone, delta, onClick }: {
  icon: any; label: string; value: string; hint?: string;
  tone?: "hot" | "live" | "value" | "profit"; delta?: number | null;
  onClick?: () => void;
}) {
  const clickable = typeof onClick === "function";
  return (
    <Card
      onClick={onClick}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick!(); } } : undefined}
      className={cn(
        "p-3 flex items-start gap-2.5 rounded-2xl border-border/40 transition",
        clickable && "cursor-pointer hover:border-primary/40 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
        tone === "hot" && "border-accent/40 bg-accent/5",
        tone === "live" && "border-emerald-500/40 bg-emerald-500/5",
        tone === "value" && "border-sky-500/30 bg-sky-500/5",
        tone === "profit" && "border-emerald-500/40 bg-emerald-500/5",
      )}
    >
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


function OriginBar({ label, tone, leads, pipeline, maxPipeline, onClick }: {
  label: string; tone: "prateleira" | "proposal"; leads: number; pipeline: number; maxPipeline: number;
  onClick?: () => void;
}) {
  const pct = maxPipeline > 0 ? Math.max(2, (pipeline / maxPipeline) * 100) : 0;
  const barColor = tone === "proposal" ? "bg-violet-500" : "bg-sky-500";
  const textColor = tone === "proposal" ? "text-violet-600 dark:text-violet-400" : "text-sky-600 dark:text-sky-400";
  const clickable = typeof onClick === "function";
  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick!(); } } : undefined}
      className={cn("space-y-1 rounded-md -mx-1 px-1 py-1", clickable && "cursor-pointer hover:bg-muted/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary/40")}
    >
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

function LeadDetail({ lead, events, proposalClicks, enrichment, waLink, onClose, onDelete }: {
  lead: LeadAggregate | null;
  events: EventRow[];
  proposalClicks: ProposalClickRow[];
  enrichment: LeadEnrichment | null;
  waLink: { conversationId: string; photo: string | null; lastMessageAt: string | null; messageCount: number } | null;
  onClose: () => void;
  onDelete: (l: LeadAggregate) => void;
}) {
  // Preview de conversa removido a pedido — mantemos apenas o botão de abrir no Inbox.


  if (!lead) return null;

  const emailLc = (lead.email || "").toLowerCase();
  const prateleiraEvents = events.filter((e) => (e.email || "").toLowerCase() === emailLc);
  const proposalViewerIdSet = new Set(lead.proposalViewerIds);
  const propClicks = proposalClicks.filter((c) => c.viewer_id && proposalViewerIdSet.has(c.viewer_id));

  const prClicks = prateleiraEvents.filter((e) => e.event_type === "click");
  const sectionViews = prateleiraEvents.filter((e) => e.event_type === "section_view");
  const ua = parseUA(lead.userAgent);
  const isClient = (enrichment?.count ?? 0) > 0;

  return (
    <Dialog open={!!lead} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-6">
            <span className="flex items-center gap-2 min-w-0">
              <WhatsAppAvatar
                src={waLink?.photo || null}
                name={lead.name || lead.email || "?"}
                phone={normPhone(lead.phone) || undefined}
                size={32}
                className="w-8 h-8 text-[11px] flex-shrink-0"
              />
              <span className="truncate">{lead.name || lead.email || "Lead"}</span>
              {isClient && (
                <Badge className="text-[9.5px] border-0 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 gap-0.5 h-5 px-1.5 flex-shrink-0">
                  <CheckCircle2 className="w-2.5 h-2.5" /> Cliente
                </Badge>
              )}
              {waLink && (
                <Badge className="text-[9.5px] border-0 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-0.5 h-5 px-1.5 flex-shrink-0" title="Já é contato no WhatsApp">
                  <MessageCircle className="w-2.5 h-2.5" /> WhatsApp
                </Badge>
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-[11px] text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex-shrink-0"
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

            {/* Atalho para abrir a conversa completa no Inbox */}
            {waLink && (
              <Card className="p-3 border-emerald-500/25 bg-emerald-500/[0.03]">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                    Conversa WhatsApp ativa
                    {waLink.lastMessageAt && (
                      <span className="text-[10px] font-normal text-muted-foreground">
                        última: {formatDistanceToNow(new Date(waLink.lastMessageAt), { locale: ptBR, addSuffix: true })}
                      </span>
                    )}
                  </div>
                  <Link
                    to={`/operacao/inbox?conversation=${waLink.conversationId}`}
                    className="text-[10.5px] text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Abrir conversa completa <ExternalLink className="w-2.5 h-2.5" />
                  </Link>
                </div>
              </Card>
            )}




            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
              <MiniKpi label="Prateleira" value={lead.productsViewed} />
              <MiniKpi label="Propostas" value={lead.proposalsViewed} />
              <MiniKpi label="Tempo ativo" value={formatTime(lead.totalSeconds)} />
              <MiniKpi label="Cliques CTA" value={lead.ctaCount} tone={lead.ctaCount > 0 ? "hot" : undefined} />
              <MiniKpi label="Pipeline" value={lead.totalValue > 0 ? BRL(lead.totalValue) : "·"} />
              <MiniKpi label="Lucro potencial" value={lead.profitPotential > 0 ? BRL(lead.profitPotential) : "·"} tone={lead.profitPotential > 0 ? "hot" : undefined} />
            </div>

            {/* Histórico como cliente */}
            {enrichment && (enrichment.customerSince || enrichment.count > 0) && (
              <Card className={cn(
                "p-4 space-y-3 border",
                enrichment.count > 0
                  ? "border-emerald-500/30 bg-emerald-500/[0.04]"
                  : "border-primary/20 bg-primary/[0.03]"
              )}>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                    <Users className="w-3.5 h-3.5 text-emerald-600" />
                    {enrichment.count > 0 ? "Já é seu cliente" : "Cadastrado no CRM · sem venda ainda"}
                  </div>
                  {enrichment.customerSince && (
                    <CustomerSinceBadge customerSince={enrichment.customerSince} />
                  )}
                </div>
                {enrichment.count > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                    <div className="rounded-lg bg-background/60 border border-border/40 px-2.5 py-1.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Vendas</p>
                      <p className="text-sm font-bold text-foreground tabular-nums">{enrichment.count}</p>
                    </div>
                    <div className="rounded-lg bg-background/60 border border-border/40 px-2.5 py-1.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Receita total</p>
                      <p className="text-sm font-bold text-emerald-600 tabular-nums">
                        {enrichment.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="rounded-lg bg-background/60 border border-border/40 px-2.5 py-1.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Lucro total</p>
                      <p className="text-sm font-bold text-primary tabular-nums">
                        {enrichment.profit.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    {enrichment.paymentTop && (
                      <div className="rounded-lg bg-background/60 border border-border/40 px-2.5 py-1.5">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Pagamento</p>
                        <p className="text-[11px] font-semibold text-foreground truncate">{enrichment.paymentTop}</p>
                      </div>
                    )}
                  </div>
                )}
                {enrichment.destinations.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Destinos anteriores:</span>
                    {enrichment.destinations.map((d) => (
                      <Badge key={d} variant="outline" className="text-[10px] py-0 px-1.5 h-5">{d}</Badge>
                    ))}
                  </div>
                )}
                {enrichment.count > 0 && enrichment.lastSaleAt && (
                  <p className="text-[10.5px] text-muted-foreground">
                    Última venda: {format(new Date(enrichment.lastSaleAt), "dd/MM/yyyy", { locale: ptBR })}
                    {enrichment.firstSaleAt && enrichment.firstSaleAt !== enrichment.lastSaleAt && (
                      <> · Primeira: {format(new Date(enrichment.firstSaleAt), "dd/MM/yyyy", { locale: ptBR })}</>
                    )}
                  </p>
                )}
              </Card>
            )}

            {/* Itens visualizados */}
            <Card className="p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                <PackageOpen className="w-3.5 h-3.5" /> Conteúdo visualizado
              </div>
              <div className="space-y-2">
                {lead.items.map((p) => (
                  <div key={`${p.kind}-${p.refId}`} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/40 hover:bg-muted/30">
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
