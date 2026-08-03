import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Search, Users, ShieldOff, ListOrdered, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { STAGES } from "@/components/inbox/types";
import { formatPhone, type AudienceCandidate, type AudienceStats } from "./types";
import { cn } from "@/lib/utils";

export type AudienceType = "manual" | "last_n";

interface Props {
  audienceType: AudienceType;
  onAudienceTypeChange: (t: AudienceType) => void;
  selectedIds: string[];
  onSelectedIdsChange: (ids: string[]) => void;
  lastN: number;
  onLastNChange: (n: number) => void;
  candidates: AudienceCandidate[];
  stats: AudienceStats | null;
  loading: boolean;
  recipients: AudienceCandidate[];
}

const QUICK_N = [10, 50, 100];

export default function BroadcastAudienceStep({
  audienceType, onAudienceTypeChange, selectedIds, onSelectedIdsChange,
  lastN, onLastNChange, candidates, stats, loading, recipients,
}: Props) {
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState<string>("all");

  const allTags = useMemo(() => {
    const set = new Set<string>();
    candidates.forEach((c) => c.tags.forEach((t) => t && set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [candidates]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, "");
    return candidates.filter((c) => {
      if (stageFilter !== "all" && (c.stage || "novo_lead") !== stageFilter) return false;
      if (tagFilter !== "all" && !c.tags.includes(tagFilter)) return false;
      if (!q) return true;
      if (c.name.toLowerCase().includes(q)) return true;
      return qDigits.length >= 3 && c.phone.replace(/\D/g, "").includes(qDigits);
    });
  }, [candidates, search, stageFilter, tagFilter]);

  const toggle = (id: string) => {
    onSelectedIdsChange(
      selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]
    );
  };

  const selectAllFiltered = () => {
    const ids = new Set(selectedIds);
    filtered.forEach((c) => ids.add(c.id));
    onSelectedIdsChange(Array.from(ids));
  };

  const [customN, setCustomN] = useState<string>("");
  useEffect(() => {
    if (!QUICK_N.includes(lastN)) setCustomN(String(lastN));
  }, [lastN]);

  return (
    <div className="space-y-5">
      {/* Transparência de elegibilidade */}
      <Card className="glass-card overflow-hidden">
        <div className="gold-line" />
        <CardContent className="grid gap-4 p-5 sm:grid-cols-3">
          <Metric
            icon={<Users className="h-4 w-4" />}
            label="Conversas ativas"
            value={stats ? stats.activeCount.toLocaleString("pt-BR") : "—"}
            hint="Sem grupos, arquivadas ou excluídas"
          />
          <Metric
            icon={<ShieldOff className="h-4 w-4" />}
            label="Pediram para não receber"
            value={stats ? stats.optoutOverlap.toLocaleString("pt-BR") : "—"}
            hint="Excluídos automaticamente"
            tone="warn"
          />
          <Metric
            icon={<CheckCheck className="h-4 w-4" />}
            label="Elegíveis"
            value={stats ? stats.eligibleCount.toLocaleString("pt-BR") : "—"}
            hint="Base disponível para disparo"
            tone="good"
          />
        </CardContent>
      </Card>

      {/* Alternância */}
      <div className="grid gap-3 sm:grid-cols-2">
        <ModeCard
          active={audienceType === "manual"}
          icon={<Users className="h-5 w-5" />}
          title="Selecionar manualmente"
          desc="Escolha conversa por conversa, com busca, tag e etapa do funil."
          onClick={() => onAudienceTypeChange("manual")}
        />
        <ModeCard
          active={audienceType === "last_n"}
          icon={<ListOrdered className="h-5 w-5" />}
          title="Últimos N contatos"
          desc="As conversas mais recentes, na mesma ordem do chat."
          onClick={() => onAudienceTypeChange("last_n")}
        />
      </div>

      {audienceType === "manual" ? (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Conversas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome ou telefone"
                  className="pl-9"
                  inputMode="search"
                />
              </div>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger className="w-full sm:w-[180px]"><SelectValue placeholder="Tag" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as tags</SelectItem>
                  {allTags.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="w-full sm:w-[190px]"><SelectValue placeholder="Etapa" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as etapas</SelectItem>
                  {STAGES.map((s) => <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{filtered.length.toLocaleString("pt-BR")} conversas listadas</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAllFiltered} className="min-h-[36px]">
                  Selecionar listadas
                </Button>
                <Button variant="ghost" size="sm" onClick={() => onSelectedIdsChange([])} className="min-h-[36px]">
                  Limpar
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[420px] rounded-lg border border-border">
              {loading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <p className="py-16 text-center text-sm text-muted-foreground">Nenhuma conversa encontrada.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((c) => {
                    const checked = selectedIds.includes(c.id);
                    return (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => toggle(c.id)}
                          disabled={c.opted_out}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-muted/50",
                            checked && "bg-primary/5",
                            c.opted_out && "cursor-not-allowed opacity-60 hover:bg-transparent"
                          )}
                        >
                          <Checkbox checked={checked && !c.opted_out} className="pointer-events-none" />
                          <Avatar className="h-9 w-9 shrink-0">
                            <AvatarImage src={c.profile_picture_url || undefined} alt="" />
                            <AvatarFallback className="text-[11px]">
                              {c.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{c.name}</p>
                            <p className="truncate text-[11px] text-muted-foreground">{formatPhone(c.phone)}</p>
                          </div>
                          {c.opted_out && (
                            <Badge
                              variant="outline"
                              className="shrink-0 gap-1 border-amber-500/40 text-[10px] text-amber-600 dark:text-amber-400"
                            >
                              <ShieldOff className="h-3 w-3" />
                              Não receber
                            </Badge>
                          )}
                          {!c.opted_out && c.tags.slice(0, 2).map((t) => (
                            <Badge key={t} variant="outline" className="hidden shrink-0 text-[10px] sm:inline-flex">{t}</Badge>
                          ))}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Quantidade de contatos recentes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {QUICK_N.map((n) => (
                <Button
                  key={n}
                  variant={lastN === n ? "default" : "outline"}
                  onClick={() => { onLastNChange(n); setCustomN(""); }}
                  className="min-h-[44px] min-w-[80px]"
                >
                  {n}
                </Button>
              ))}
              <div className="flex items-center gap-2">
                <Input
                  value={customN}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/\D/g, "").slice(0, 5);
                    setCustomN(raw);
                    const n = Number(raw);
                    if (n > 0) onLastNChange(n);
                  }}
                  placeholder="Outro valor"
                  inputMode="numeric"
                  className="w-[140px] min-h-[44px]"
                />
                <span className="text-xs text-muted-foreground">contatos</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Ordenação idêntica ao chat (última mensagem primeiro) · grupos, arquivadas, excluídas e opt-outs
              já foram removidos da base elegível.
            </p>

            <div className="rounded-lg border border-border">
              <div className="border-b border-border px-3 py-2 text-xs text-muted-foreground">
                Prévia dos primeiros contatos
              </div>
              <ul className="divide-y divide-border">
                {recipients.slice(0, 8).map((c) => (
                  <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={c.profile_picture_url || undefined} alt="" />
                      <AvatarFallback className="text-[10px]">{c.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate text-sm">{c.name}</span>
                    <span className="shrink-0 text-[11px] text-muted-foreground">{formatPhone(c.phone)}</span>
                  </li>
                ))}
                {recipients.length === 0 && (
                  <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhum contato elegível.</li>
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contagem final em destaque */}
      <div className="sticky bottom-2 z-10 rounded-xl border border-primary/30 bg-card/95 p-4 shadow-lg backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Destinatários selecionados</p>
            <p className="font-display text-3xl font-bold text-primary">
              {recipients.length.toLocaleString("pt-BR")}
            </p>
          </div>
          <p className="max-w-sm text-[11px] text-muted-foreground">
            Nenhuma mensagem sai desta tela. O disparo só começa com a ação explícita
            "Iniciar disparo" no acompanhamento.
          </p>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon, label, value, hint, tone,
}: { icon: React.ReactNode; label: string; value: string; hint: string; tone?: "good" | "warn" }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <div className={cn(
        "mb-1 flex items-center gap-2 text-xs",
        tone === "good" ? "text-emerald-600 dark:text-emerald-400"
          : tone === "warn" ? "text-amber-600 dark:text-amber-400"
          : "text-muted-foreground"
      )}>
        {icon}
        <span className="uppercase tracking-wide">{label}</span>
      </div>
      <p className="font-display text-2xl font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}

function ModeCard({
  active, icon, title, desc, onClick,
}: { active: boolean; icon: React.ReactNode; title: string; desc: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 text-left transition-all min-h-[44px]",
        active
          ? "border-primary bg-primary/5 shadow-md"
          : "border-border bg-card hover:border-primary/40 hover:bg-muted/40"
      )}
    >
      <div className={cn("mb-2 flex items-center gap-2", active ? "text-primary" : "text-muted-foreground")}>
        {icon}
        <span className="font-display text-sm font-semibold text-foreground">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}
