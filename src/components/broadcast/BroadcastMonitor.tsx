import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Pause, Play, Rocket, XCircle, Activity } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  CAMPAIGN_STATUS_META, RECIPIENT_STATUS_META, formatPhone,
  type CampaignRow, type RecipientRow,
} from "./types";
import { cn } from "@/lib/utils";

interface Props {
  campaignId: string;
  onBackToHistory?: () => void;
}

export default function BroadcastMonitor({ campaignId, onBackToHistory }: Props) {
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [recipients, setRecipients] = useState<RecipientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = async () => {
    const [{ data: camp }, { data: recs }] = await Promise.all([
      supabase.from("broadcast_campaigns").select("*").eq("id", campaignId).maybeSingle(),
      supabase
        .from("broadcast_recipients")
        .select("id, phone, contact_name, status, sent_at, error_message, order_index")
        .eq("campaign_id", campaignId)
        .order("order_index", { ascending: true })
        .limit(2000),
    ]);
    setCampaign((camp as any) || null);
    setRecipients(((recs as any) || []) as RecipientRow[]);
    setLoading(false);
  };

  useEffect(() => {
    setLoading(true);
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const counts = useMemo(() => {
    const c = { sent: 0, failed: 0, pending: 0, skipped: 0 };
    recipients.forEach((r) => {
      if (r.status === "sent") c.sent++;
      else if (r.status === "failed") c.failed++;
      else if (r.status.startsWith("skipped")) c.skipped++;
      else c.pending++;
    });
    return c;
  }, [recipients]);

  const total = recipients.length || campaign?.total_recipients || 0;
  const doneCount = counts.sent + counts.failed + counts.skipped;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const setStatus = async (status: string, extra: Record<string, unknown> = {}) => {
    setActing(true);
    const { error } = await supabase
      .from("broadcast_campaigns")
      .update({ status, ...extra } as any)
      .eq("id", campaignId);
    setActing(false);
    if (error) { toast.error(error.message); return; }
    await load();
  };

  if (loading && !campaign) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!campaign) {
    return <p className="py-12 text-center text-sm text-muted-foreground">Campanha não encontrada.</p>;
  }

  const st = CAMPAIGN_STATUS_META[campaign.status] || { label: campaign.status, cls: "" };
  const canStart = campaign.status === "confirmed" || campaign.status === "paused";
  const canPause = campaign.status === "sending";
  const canCancel = ["confirmed", "sending", "paused"].includes(campaign.status);

  return (
    <div className="space-y-5">
      <Card className="glass-card overflow-hidden">
        <div className="gold-line" />
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="font-display text-lg">{campaign.name}</CardTitle>
              <p className="mt-1 text-xs text-muted-foreground">
                {campaign.audience_type === "manual" ? "Seleção manual" : "Últimos contatos"} ·
                ritmo {campaign.throttle_min_seconds}–{campaign.throttle_max_seconds}s ·
                limite diário {campaign.daily_limit}
              </p>
            </div>
            <Badge className={cn("text-[11px]", st.cls)}>{st.label}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {campaign.paused_reason && campaign.status === "paused" && (
            <p className="rounded-lg border border-orange-500/30 bg-orange-500/5 px-3 py-2 text-xs text-orange-600 dark:text-orange-400">
              Pausada automaticamente · motivo: {campaign.paused_reason}
            </p>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5" /> Progresso
              </span>
              <span>{doneCount.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")} · {pct}%</span>
            </div>
            <Progress value={pct} className="h-3" />
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Enviadas" value={counts.sent} tone="good" />
            <Stat label="Falhas" value={counts.failed} tone="bad" />
            <Stat label="Pendentes" value={counts.pending} />
            <Stat label="Ignoradas" value={counts.skipped} tone="warn" />
          </div>

          <div className="flex flex-wrap gap-3">
            {canStart && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button className="min-h-[52px] flex-1 text-base sm:flex-none sm:px-8">
                    <Rocket className="mr-2 h-5 w-5" />
                    {campaign.status === "paused" ? "Retomar disparo" : "Iniciar disparo"}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Iniciar o disparo real agora?</AlertDialogTitle>
                    <AlertDialogDescription>
                      A partir daqui as mensagens começam a sair de verdade para{" "}
                      <strong>{counts.pending.toLocaleString("pt-BR")}</strong> contatos pendentes,
                      no ritmo de {campaign.throttle_min_seconds}–{campaign.throttle_max_seconds} segundos
                      entre cada envio, apenas entre 08:00 e 20:00. Você pode pausar a qualquer momento.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => setStatus("sending", {
                        started_at: campaign.started_at || new Date().toISOString(),
                        paused_reason: null,
                        consecutive_failures: 0,
                        next_eligible_send_at: null,
                      })}
                    >
                      Sim, iniciar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {canPause && (
              <Button
                variant="outline"
                onClick={() => setStatus("paused", { paused_reason: "pausa_manual" })}
                disabled={acting}
                className="min-h-[52px] flex-1 border-orange-500/40 text-base text-orange-600 hover:bg-orange-500/10 dark:text-orange-400 sm:flex-none sm:px-8"
              >
                <Pause className="mr-2 h-5 w-5" /> Pausar
              </Button>
            )}

            {canCancel && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="min-h-[52px] flex-1 border-destructive/40 text-base text-destructive hover:bg-destructive/10 sm:flex-none sm:px-8"
                  >
                    <XCircle className="mr-2 h-5 w-5" /> Cancelar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Cancelar a campanha?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Os envios param imediatamente e a campanha não pode ser retomada.
                      Mensagens já enviadas permanecem enviadas.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Voltar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => setStatus("cancelled", { paused_reason: "cancelado_manual" })}
                    >
                      Cancelar campanha
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {campaign.status === "sending" && (
              <span className="flex items-center gap-2 text-xs text-muted-foreground">
                <Play className="h-3.5 w-3.5 animate-pulse text-primary" /> atualizando em tempo real
              </span>
            )}
            {onBackToHistory && (
              <Button variant="ghost" onClick={onBackToHistory} className="min-h-[52px]">
                Ver histórico
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-display">Destinatários</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="max-h-[480px] overflow-auto rounded-lg border border-border">
            <Table>
              <TableHeader className="sticky top-0 bg-card">
                <TableRow>
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="w-[150px]">Telefone</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[130px]">Enviada em</TableHead>
                  <TableHead>Erro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recipients.map((r, i) => {
                  const meta = RECIPIENT_STATUS_META[r.status] || { label: r.status, cls: "" };
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-[11px] text-muted-foreground">{(r.order_index ?? i) + 1}</TableCell>
                      <TableCell className="max-w-[220px] truncate text-sm">{r.contact_name || "—"}</TableCell>
                      <TableCell className="whitespace-nowrap text-xs">{formatPhone(r.phone)}</TableCell>
                      <TableCell><Badge className={cn("text-[10px]", meta.cls)}>{meta.label}</Badge></TableCell>
                      <TableCell className="whitespace-nowrap text-[11px] text-muted-foreground">
                        {r.sent_at
                          ? new Date(r.sent_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate text-[11px] text-destructive" title={r.error_message || ""}>
                        {r.error_message || ""}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "bad" | "warn" }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn(
        "font-display text-2xl font-bold",
        tone === "good" ? "text-emerald-600 dark:text-emerald-400"
          : tone === "bad" ? "text-destructive"
          : tone === "warn" ? "text-amber-600 dark:text-amber-400"
          : "text-foreground"
      )}>
        {value.toLocaleString("pt-BR")}
      </p>
    </div>
  );
}
