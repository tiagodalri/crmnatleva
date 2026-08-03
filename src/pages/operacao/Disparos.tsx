import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft, ArrowRight, Megaphone, ShieldAlert, Loader2, PencilLine, Users, ShieldCheck, Radio,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendViaZapi } from "@/pages/operacao/inbox/zapiClient";
import BroadcastComposeStep from "@/components/broadcast/BroadcastComposeStep";
import BroadcastAudienceStep, { type AudienceType } from "@/components/broadcast/BroadcastAudienceStep";
import BroadcastReviewStep from "@/components/broadcast/BroadcastReviewStep";
import BroadcastMonitor from "@/components/broadcast/BroadcastMonitor";
import BroadcastHistory from "@/components/broadcast/BroadcastHistory";
import type { AudienceCandidate, AudienceStats, BroadcastMedia } from "@/components/broadcast/types";
import { cn } from "@/lib/utils";

const STEPS = [
  { key: 1, label: "Compor", icon: PencilLine },
  { key: 2, label: "Audiência", icon: Users },
  { key: 3, label: "Revisar", icon: ShieldCheck },
];

const CANDIDATE_LIMIT = 1500;

export default function Disparos() {
  const { user, role, isLoading: authLoading } = useAuth();
  const allowed = role === "admin" || role === "gestor";
  const [searchParams, setSearchParams] = useSearchParams();

  const [tab, setTab] = useState<string>(searchParams.get("campanha") ? "acompanhar" : "novo");
  const [step, setStep] = useState(1);
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(searchParams.get("campanha"));
  const [historyKey, setHistoryKey] = useState(0);

  // Compor
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [media, setMedia] = useState<BroadcastMedia | null>(null);

  // Audiência
  const [audienceType, setAudienceType] = useState<AudienceType>("manual");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastN, setLastN] = useState(50);
  const [candidates, setCandidates] = useState<AudienceCandidate[]>([]);
  const [stats, setStats] = useState<AudienceStats | null>(null);
  const [loadingAudience, setLoadingAudience] = useState(false);

  // Revisar
  const [testPhone, setTestPhone] = useState("");
  const [testSent, setTestSent] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [throttleMin, setThrottleMin] = useState(15);
  const [throttleMax, setThrottleMax] = useState(30);
  const [dailyLimit, setDailyLimit] = useState(150);
  const [saving, setSaving] = useState(false);

  // ─── Carrega base elegível ───
  const loadAudience = useCallback(async () => {
    setLoadingAudience(true);
    try {
      const [{ data: convs }, { count: activeCount }, { data: optouts }] = await Promise.all([
        supabase
          .from("conversations")
          .select("id, phone, contact_name, display_name, tags, auto_tags, stage, funnel_stage, last_message_at, profile_picture_url")
          .eq("is_group", false)
          .eq("is_archived", false)
          .is("excluded_at", null)
          .not("phone", "is", null)
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .limit(CANDIDATE_LIMIT),
        supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("is_group", false)
          .eq("is_archived", false)
          .is("excluded_at", null)
          .not("phone", "is", null),
        supabase.from("whatsapp_optouts").select("phone"),
      ]);

      const optoutSet = new Set(
        ((optouts as any[]) || []).map((o) => String(o.phone || "").replace(/\D/g, ""))
      );

      const list: AudienceCandidate[] = ((convs as any[]) || [])
        .filter((c) => String(c.phone || "").replace(/\D/g, "").length >= 10)
        .map((c) => ({
          id: c.id,
          phone: String(c.phone),
          name: c.display_name || c.contact_name || String(c.phone),
          tags: [...(c.tags || []), ...(c.auto_tags || [])].filter(Boolean),
          stage: c.stage || c.funnel_stage || null,
          last_message_at: c.last_message_at,
          profile_picture_url: c.profile_picture_url,
          opted_out: optoutSet.has(String(c.phone || "").replace(/\D/g, "")),
        }));

      // Overlap real de opt-outs dentro da base ativa
      let overlap = 0;
      if (optoutSet.size > 0) {
        const { count } = await supabase
          .from("conversations")
          .select("id", { count: "exact", head: true })
          .eq("is_group", false)
          .eq("is_archived", false)
          .is("excluded_at", null)
          .in("phone", Array.from(optoutSet));
        overlap = count ?? 0;
      }

      const active = activeCount ?? list.length;
      setCandidates(list);
      setStats({ activeCount: active, optoutOverlap: overlap, eligibleCount: Math.max(0, active - overlap) });
    } catch (err: any) {
      toast.error(err?.message || "Falha ao carregar audiência");
    } finally {
      setLoadingAudience(false);
    }
  }, []);

  useEffect(() => {
    if (allowed && tab === "novo") loadAudience();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowed, tab]);

  // Telefone do usuário logado (para o teste obrigatório)
  useEffect(() => {
    if (!user?.id) return;
    (async () => {
      const { data } = await supabase.from("employees").select("phone").eq("user_id", user.id).maybeSingle();
      const digits = String((data as any)?.phone || "").replace(/\D/g, "");
      if (digits) setTestPhone(digits.startsWith("55") ? digits : `55${digits}`);
    })();
  }, [user?.id]);

  const recipients = useMemo(() => {
    if (audienceType === "manual") {
      const byId = new Map(candidates.map((c) => [c.id, c]));
      return selectedIds.map((id) => byId.get(id)).filter(Boolean) as AudienceCandidate[];
    }
    return candidates.slice(0, Math.max(0, lastN));
  }, [audienceType, candidates, selectedIds, lastN]);

  // ─── Teste obrigatório ───
  const handleSendTest = async () => {
    const digits = testPhone.replace(/\D/g, "");
    if (digits.length < 10) { toast.error("Informe um número válido"); return; }
    setSendingTest(true);
    try {
      let action = "send-text";
      let payload: Record<string, unknown> = { phone: digits, message };
      if (media) {
        const caption = message;
        if (media.type === "image") { action = "send-image"; payload = { phone: digits, image: media.url, caption }; }
        else if (media.type === "audio") { action = "send-audio"; payload = { phone: digits, audio: media.url }; }
        else {
          action = "send-document";
          payload = {
            phone: digits,
            document: media.url,
            extension: (media.filename.split(".").pop() || "pdf").toLowerCase(),
            fileName: media.filename,
          };
        }
      }
      const res = await sendViaZapi(action, payload);
      if (!res.ok) throw new Error(res.detail || "Falha no envio de teste");
      setTestSent(true);
      toast.success("Teste enviado para o seu WhatsApp");
    } catch (err: any) {
      toast.error(err?.message || "Não foi possível enviar o teste");
    } finally {
      setSendingTest(false);
    }
  };

  // ─── Grava campanha confirmada (SEM disparar) ───
  const handleConfirm = async () => {
    if (!testSent) { toast.error("Envie o teste antes de confirmar"); return; }
    if (recipients.length === 0) { toast.error("Nenhum destinatário"); return; }
    setSaving(true);
    try {
      const { data: camp, error } = await supabase
        .from("broadcast_campaigns")
        .insert({
          name: name.trim() || `Campanha ${new Date().toLocaleDateString("pt-BR")}`,
          message_text: message,
          caption: media ? message : null,
          media_url: media?.url ?? null,
          media_type: media?.mimetype ?? null,
          media_filename: media?.filename ?? null,
          media_mimetype: media?.mimetype ?? null,
          media_size_bytes: media?.size ?? null,
          audience_type: audienceType,
          audience_size: recipients.length,
          status: "confirmed",
          throttle_min_seconds: Math.max(1, throttleMin),
          throttle_max_seconds: Math.max(Math.max(1, throttleMin), throttleMax),
          daily_limit: Math.max(1, dailyLimit),
          total_recipients: recipients.length,
          created_by: user?.id ?? null,
          confirmed_by: user?.id ?? null,
          confirmed_at: new Date().toISOString(),
          test_sent_at: new Date().toISOString(),
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      const campaignId = (camp as any).id as string;
      const rows = recipients.map((r, i) => ({
        campaign_id: campaignId,
        conversation_id: r.id,
        phone: r.phone.replace(/\D/g, ""),
        contact_name: r.name,
        order_index: i,
        status: "pending",
      }));

      for (let i = 0; i < rows.length; i += 500) {
        const { error: recErr } = await supabase
          .from("broadcast_recipients")
          .insert(rows.slice(i, i + 500) as any);
        if (recErr) throw recErr;
      }

      toast.success("Campanha confirmada · nada foi enviado ainda");
      setActiveCampaignId(campaignId);
      setSearchParams({ campanha: campaignId });
      setTab("acompanhar");
      setHistoryKey((k) => k + 1);
      // Reinicia o wizard
      setStep(1); setName(""); setMessage(""); setMedia(null);
      setSelectedIds([]); setTestSent(false);
    } catch (err: any) {
      toast.error(err?.message || "Falha ao gravar campanha");
    } finally {
      setSaving(false);
    }
  };

  const openCampaign = (id: string) => {
    setActiveCampaignId(id);
    setSearchParams({ campanha: id });
    setTab("acompanhar");
  };

  if (authLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!allowed) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
        <ShieldAlert className="mb-3 h-12 w-12 text-muted-foreground" />
        <h1 className="mb-2 font-display text-xl font-bold">Acesso restrito</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          O disparo em massa é uma ação sensível · disponível apenas para administradores e gestores.
        </p>
      </div>
    );
  }

  const canAdvance = step === 1
    ? !!message.trim() || !!media
    : step === 2
      ? recipients.length > 0
      : true;

  return (
    <div className="container mx-auto max-w-[1400px] space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-xl border border-primary/30 bg-primary/10 p-2.5">
            <Megaphone className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold sm:text-3xl">Disparo em massa</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Envio lento e controlado no WhatsApp · com teste obrigatório, confirmação explícita e
              acompanhamento em tempo real.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1.5 border-primary/30 text-[11px]">
          <Radio className="h-3 w-3 text-primary" /> 08:00 às 20:00 · ritmo humano
        </Badge>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-3">
          <TabsTrigger value="novo">Nova campanha</TabsTrigger>
          <TabsTrigger value="acompanhar" disabled={!activeCampaignId}>Acompanhar</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="novo" className="space-y-6">
          {/* Stepper */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card/60 p-2">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const active = step === s.key;
              const done = step > s.key;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setStep(s.key)}
                    className={cn(
                      "flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
                      active ? "bg-primary/10 text-primary" : done ? "text-foreground" : "text-muted-foreground",
                      "hover:bg-muted/60"
                    )}
                  >
                    <span className={cn(
                      "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold",
                      active ? "bg-primary text-primary-foreground"
                        : done ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {s.key}
                    </span>
                    <Icon className="hidden h-4 w-4 sm:block" />
                    <span className="font-display font-medium">{s.label}</span>
                  </button>
                  {i < STEPS.length - 1 && <span className="hidden h-px w-6 bg-border sm:block" />}
                </div>
              );
            })}
          </div>

          {step === 1 && (
            <BroadcastComposeStep
              name={name} onNameChange={setName}
              message={message} onMessageChange={setMessage}
              media={media} onMediaChange={setMedia}
            />
          )}

          {step === 2 && (
            <BroadcastAudienceStep
              audienceType={audienceType} onAudienceTypeChange={setAudienceType}
              selectedIds={selectedIds} onSelectedIdsChange={setSelectedIds}
              lastN={lastN} onLastNChange={setLastN}
              candidates={candidates} stats={stats}
              loading={loadingAudience} recipients={recipients}
            />
          )}

          {step === 3 && (
            <BroadcastReviewStep
              name={name} message={message} media={media} recipients={recipients}
              testPhone={testPhone} onTestPhoneChange={setTestPhone}
              testSent={testSent} sendingTest={sendingTest} onSendTest={handleSendTest}
              throttleMin={throttleMin} throttleMax={throttleMax} dailyLimit={dailyLimit}
              onThrottleMinChange={setThrottleMin} onThrottleMaxChange={setThrottleMax}
              onDailyLimitChange={setDailyLimit}
              saving={saving} onConfirm={handleConfirm}
            />
          )}

          {/* Navegação */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => setStep((s) => Math.max(1, s - 1))}
              disabled={step === 1}
              className="min-h-[44px]"
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Button>
            {step < 3 && (
              <Button
                onClick={() => setStep((s) => Math.min(3, s + 1))}
                disabled={!canAdvance}
                className="min-h-[44px]"
              >
                Continuar <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="acompanhar">
          {activeCampaignId ? (
            <BroadcastMonitor campaignId={activeCampaignId} onBackToHistory={() => setTab("historico")} />
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">
              Nenhuma campanha selecionada · abra uma pelo histórico.
            </p>
          )}
        </TabsContent>

        <TabsContent value="historico">
          <BroadcastHistory onOpen={openCampaign} refreshKey={historyKey} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
