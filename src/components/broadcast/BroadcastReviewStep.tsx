import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  ChevronDown, Loader2, ShieldCheck, Send, Lock, CheckCircle2, Settings2, AlertTriangle,
} from "lucide-react";
import WhatsAppBubble from "./WhatsAppBubble";
import { formatPhone, type AudienceCandidate, type BroadcastMedia } from "./types";
import { cn } from "@/lib/utils";

interface Props {
  name: string;
  message: string;
  media: BroadcastMedia | null;
  recipients: AudienceCandidate[];
  testPhone: string;
  onTestPhoneChange: (v: string) => void;
  testSent: boolean;
  sendingTest: boolean;
  onSendTest: () => void;
  throttleMin: number;
  throttleMax: number;
  dailyLimit: number;
  onThrottleMinChange: (n: number) => void;
  onThrottleMaxChange: (n: number) => void;
  onDailyLimitChange: (n: number) => void;
  saving: boolean;
  onConfirm: () => void;
}

export default function BroadcastReviewStep({
  name, message, media, recipients, testPhone, onTestPhoneChange, testSent, sendingTest, onSendTest,
  throttleMin, throttleMax, dailyLimit, onThrottleMinChange, onThrottleMaxChange, onDailyLimitChange,
  saving, onConfirm,
}: Props) {
  const [confirmWord, setConfirmWord] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const total = recipients.length;
  const wordOk = confirmWord.trim().toUpperCase() === "CONFIRMAR";
  const canConfirm = testSent && wordOk && total > 0 && !saving;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <div className="space-y-5">
        <Card className="glass-card overflow-hidden">
          <div className="gold-line" />
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Conferência final
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Campanha</p>
                <p className="truncate font-medium" title={name}>{name || "(sem nome)"}</p>
              </div>
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Destinatários</p>
                <p className="font-display text-2xl font-bold text-primary">{total.toLocaleString("pt-BR")}</p>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">
                Amostra dos 10 primeiros
              </p>
              <div className="rounded-lg border border-border">
                <ul className="divide-y divide-border">
                  {recipients.slice(0, 10).map((r, i) => (
                    <li key={r.id} className="flex items-center gap-3 px-3 py-2 text-sm">
                      <span className="w-5 shrink-0 text-[11px] text-muted-foreground">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{r.name}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{formatPhone(r.phone)}</span>
                    </li>
                  ))}
                  {total === 0 && (
                    <li className="px-3 py-6 text-center text-sm text-muted-foreground">
                      Nenhum destinatário selecionado.
                    </li>
                  )}
                </ul>
              </div>
              {total > 10 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  + {(total - 10).toLocaleString("pt-BR")} outros destinatários
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Teste obrigatório */}
        <Card className={cn("glass-card", !testSent && "border-amber-500/40")}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display">
              <Send className="h-4 w-4 text-primary" />
              Teste obrigatório
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Envia a mensagem exata (com anexo) para o seu WhatsApp. A confirmação final fica
              bloqueada até este teste ser disparado.
            </p>
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[200px] flex-1 space-y-1.5">
                <Label htmlFor="bc-test-phone" className="text-xs uppercase tracking-wide text-muted-foreground">
                  Seu número
                </Label>
                <Input
                  id="bc-test-phone"
                  value={testPhone}
                  onChange={(e) => onTestPhoneChange(e.target.value)}
                  placeholder="5511999999999"
                  inputMode="tel"
                  className="min-h-[44px]"
                />
              </div>
              <Button
                onClick={onSendTest}
                disabled={sendingTest || !testPhone.replace(/\D/g, "")}
                className="min-h-[44px]"
              >
                {sendingTest ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Enviar teste para mim
              </Button>
            </div>
            {testSent ? (
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="mr-1 h-3 w-3" /> Teste enviado · confirmação liberada
              </Badge>
            ) : (
              <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400">
                <Lock className="mr-1 h-3 w-3" /> Aguardando o teste
              </Badge>
            )}
          </CardContent>
        </Card>

        {/* Avançado */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <Card className="glass-card">
            <CollapsibleTrigger asChild>
              <button
                type="button"
                className="flex w-full items-center justify-between px-6 py-4 text-left min-h-[44px]"
              >
                <span className="flex items-center gap-2 font-display text-sm font-semibold">
                  <Settings2 className="h-4 w-4 text-primary" />
                  Avançado · ritmo e limite diário
                </span>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", advancedOpen && "rotate-180")} />
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="grid gap-4 pt-0 sm:grid-cols-3">
                <NumField label="Intervalo mín. (s)" value={throttleMin} onChange={onThrottleMinChange} />
                <NumField label="Intervalo máx. (s)" value={throttleMax} onChange={onThrottleMaxChange} />
                <NumField label="Limite diário" value={dailyLimit} onChange={onDailyLimitChange} />
                <p className="text-[11px] text-muted-foreground sm:col-span-3">
                  Padrão recomendado: 15 a 30 segundos entre mensagens e 150 envios por dia · protege
                  a reputação do número. Envios ocorrem só entre 08:00 e 20:00.
                </p>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      <div className="space-y-5 lg:sticky lg:top-6 lg:self-start">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Mensagem final</CardTitle>
          </CardHeader>
          <CardContent>
            <WhatsAppBubble message={message} media={media} />
          </CardContent>
        </Card>

        <Card className={cn("glass-card overflow-hidden", canConfirm && "border-primary/40")}>
          <div className="gold-line" />
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display">
              <Lock className="h-4 w-4 text-primary" />
              Confirmação final
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Alert className="border-amber-500/40 bg-amber-500/5">
              <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              <AlertTitle className="text-sm">Nada é enviado ao confirmar</AlertTitle>
              <AlertDescription className="text-xs">
                A campanha é gravada como confirmada. O disparo só começa quando alguém clicar
                em "Iniciar disparo" no acompanhamento.
              </AlertDescription>
            </Alert>

            <div className="space-y-1.5">
              <Label htmlFor="bc-confirm" className="text-xs uppercase tracking-wide text-muted-foreground">
                Digite CONFIRMAR
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  id="bc-confirm"
                  value={confirmWord}
                  onChange={(e) => setConfirmWord(e.target.value)}
                  placeholder="CONFIRMAR"
                  disabled={!testSent}
                  className="min-h-[44px] font-mono uppercase tracking-widest"
                />
                <div className="shrink-0 text-right">
                  <p className="font-display text-xl font-bold leading-none text-primary">
                    {total.toLocaleString("pt-BR")}
                  </p>
                  <p className="text-[10px] text-muted-foreground">destinatários</p>
                </div>
              </div>
            </div>

            <Button onClick={onConfirm} disabled={!canConfirm} className="min-h-[48px] w-full text-base">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Gravar campanha confirmada
            </Button>
            {!testSent && (
              <p className="text-center text-[11px] text-muted-foreground">
                Envie o teste para liberar esta etapa.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input
        value={String(value)}
        onChange={(e) => {
          const raw = e.target.value.replace(/\D/g, "").slice(0, 5);
          onChange(Number(raw || 0));
        }}
        inputMode="numeric"
        className="min-h-[44px]"
      />
    </div>
  );
}
