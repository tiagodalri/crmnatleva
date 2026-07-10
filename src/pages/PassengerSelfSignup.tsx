import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Loader2, CheckCircle2, AlertCircle, Plus, Check, Pencil, User,
  ShieldCheck, ArrowLeft, Send,
} from "lucide-react";
import logo from "@/assets/logo-natleva.png";
import { useToast } from "@/hooks/use-toast";
import PassengerFormCard, {
  emptyPassenger,
  validateDob,
  type PassengerFormState,
} from "@/components/passenger-signup/PassengerFormCard";
import { formatPhoneDisplay } from "@/lib/phone";
import { normalizePassengerName } from "@/lib/nameUtils";

type Step = "form" | "review";

type PaxEntry = { id: string; submission_id: string; data: PassengerFormState };

function makeId() {
  try {
    if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return (crypto as any).randomUUID();
  } catch {}
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function draftKey(slug: string | undefined) {
  return slug ? `natleva:passenger-signup-draft:${slug}` : "";
}

function loadDraft(slug: string | undefined): { entries: PaxEntry[]; saved: boolean[] } | null {
  const key = draftKey(slug);
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.entries) || parsed.entries.length === 0) return null;
    return parsed;
  } catch { return null; }
}

function saveDraft(slug: string | undefined, entries: PaxEntry[], saved: boolean[]) {
  const key = draftKey(slug);
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify({ entries, saved, ts: Date.now() }));
  } catch {}
}

function clearDraft(slug: string | undefined) {
  const key = draftKey(slug);
  if (!key || typeof window === "undefined") return;
  try { window.localStorage.removeItem(key); } catch {}
}

export default function PassengerSelfSignup() {
  const { slug } = useParams();
  const { toast } = useToast();
  const [linkState, setLinkState] = useState<"loading" | "valid" | "invalid">("loading");
  const [reason, setReason] = useState<string>("");
  const [entries, setEntries] = useState<PaxEntry[]>(() => {
    const restored = loadDraft(slug);
    if (restored) return restored.entries;
    return [{ id: makeId(), submission_id: makeId(), data: { ...emptyPassenger } }];
  });
  const [savedFlags, setSavedFlags] = useState<boolean[]>(() => {
    const restored = loadDraft(slug);
    if (restored) return restored.saved;
    return [false];
  });
  const [expandedIdx, setExpandedIdx] = useState<number | null>(0);
  const [step, setStep] = useState<Step>("form");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [doneCount, setDoneCount] = useState(0);
  const [blockedMsg, setBlockedMsg] = useState<string>("");

  const passengers = entries.map((e) => e.data);

  const fnUrl = useMemo(() => {
    const projectId = (import.meta as any).env.VITE_SUPABASE_PROJECT_ID;
    return `https://${projectId}.supabase.co/functions/v1/passenger-self-signup`;
  }, []);

  // Autosave: rascunho local a cada mudança (nunca perde dados por queda de rede/aba fechada)
  useEffect(() => {
    if (!slug) return;
    saveDraft(slug, entries, savedFlags);
  }, [slug, entries, savedFlags]);

  // Valida link
  useEffect(() => {
    if (!slug) return;
    const bust = Date.now();
    fetch(`${fnUrl}?slug=${encodeURIComponent(slug)}&_=${bust}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.valid) setLinkState("valid");
        else { setLinkState("invalid"); setReason(d.reason || ""); }
      })
      .catch(() => setLinkState("valid"));
  }, [slug, fnUrl]);


  const setPaxData = (idx: number, next: PassengerFormState) => {
    setEntries((arr) => arr.map((e, i) => (i === idx ? { ...e, data: next } : e)));
  };

  const updatePassenger = (idx: number, next: PassengerFormState) => {
    setPaxData(idx, next);
    // Editar invalida o "salvo"
    setSavedFlags((arr) => arr.map((s, i) => (i === idx ? false : s)));
  };

  const validatePassenger = (p: PassengerFormState, idx: number): string | null => {
    if (!p.full_name.trim() || p.full_name.trim().length < 3) {
      return `Passageiro ${idx + 1}: informe o nome completo`;
    }
    const phoneDigits = (p.phone || "").replace(/\D/g, "");
    if (!p.phone.startsWith("+") || phoneDigits.length < 8 || phoneDigits.length > 15) {
      return `Passageiro ${idx + 1}: telefone inválido`;
    }
    if (p.birth_date) {
      const err = validateDob(p.birth_date);
      if (err) return `Passageiro ${idx + 1}: ${err}`;
    }
    if (p.international_outside_sa && (!p.passport_number || !p.passport_expiry)) {
      return `Passageiro ${idx + 1}: passaporte e validade são obrigatórios para viagem internacional fora da América do Sul`;
    }
    return null;
  };

  const savePassenger = (idx: number) => {
    const current = entries[idx]?.data;
    if (!current) return false;
    const normalized = normalizePassengerName(current.full_name);
    if (normalized !== current.full_name) {
      setPaxData(idx, { ...current, full_name: normalized });
    }
    const err = validatePassenger({ ...current, full_name: normalized }, idx);
    if (err) {
      toast({ title: "Verifique os dados", description: err, variant: "destructive" });
      return false;
    }
    setSavedFlags((arr) => arr.map((s, i) => (i === idx ? true : s)));
    setExpandedIdx(null);
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    return true;
  };

  const addPassenger = () => {
    if (expandedIdx !== null && !savedFlags[expandedIdx]) {
      const ok = savePassenger(expandedIdx);
      if (!ok) return;
    }
    const nextIdx = entries.length;
    setEntries((arr) => [...arr, { id: makeId(), submission_id: makeId(), data: { ...emptyPassenger } }]);
    setSavedFlags((arr) => [...arr, false]);
    setExpandedIdx(nextIdx);
    requestAnimationFrame(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
    });
  };

  const removePassenger = (idx: number) => {
    if (entries.length <= 1) return;
    setEntries((arr) => arr.filter((_, i) => i !== idx));
    setSavedFlags((arr) => arr.filter((_, i) => i !== idx));
    setExpandedIdx(null);
  };

  const goReview = () => {
    if (expandedIdx !== null && !savedFlags[expandedIdx]) {
      const ok = savePassenger(expandedIdx);
      if (!ok) return;
    }
    for (let i = 0; i < passengers.length; i++) {
      if (!savedFlags[i]) {
        const err = validatePassenger(passengers[i], i);
        if (err) {
          toast({ title: "Verifique os dados", description: err, variant: "destructive" });
          setExpandedIdx(i);
          return;
        }
      }
    }
    setStep("review");
    requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  };

  const onConfirmSubmit = async () => {
    if (!slug) return;
    setBlockedMsg("");
    setSubmitting(true);
    let successCount = 0;
    const failures: string[] = [];
    try {
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i];
        try {
          const r = await fetch(fnUrl, {
            method: "POST",
            cache: "no-store",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              slug,
              payload: {
                ...entry.data,
                full_name: normalizePassengerName(entry.data.full_name),
                submission_id: entry.submission_id,
              },
            }),
          });
          const j = await r.json().catch(() => ({}));
          if (r.ok && !j.error) {
            successCount++;
          } else {
            failures.push(`Passageiro ${i + 1}: ${j.error || `erro ${r.status}`}`);
          }
        } catch (err: any) {
          failures.push(`Passageiro ${i + 1}: falha de conexão`);
        }
      }
      setDoneCount(successCount);
      if (failures.length === 0) {
        clearDraft(slug);
        setDone(true);
      } else if (successCount > 0) {
        setBlockedMsg(
          `${successCount} de ${entries.length} cadastros foram enviados. ` +
          `Ainda precisam ser reenviados: ${failures.join(" · ")}. ` +
          `Você pode ajustar os dados e clicar em enviar de novo · os que já foram não vão duplicar.`
        );
      } else {
        setBlockedMsg(
          `Não foi possível concluir o cadastro. ${failures.join(" · ")}. ` +
          `Verifique os dados e tente novamente · seus dados estão salvos aqui no navegador.`
        );
      }
    } finally {
      setSubmitting(false);
    }
  };


  if (linkState === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (linkState === "invalid") {
    const map: Record<string, string> = {
      not_found: "Este link de cadastro não existe.",
      inactive: "Este link de cadastro foi desativado.",
      expired: "Este link expirou.",
      limit_reached: "Este link já atingiu o limite de cadastros.",
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-8 sm:p-10 max-w-md w-full text-center space-y-4">
          <img src={logo} alt="NatLeva" className="h-10 mx-auto" />
          <h1 className="text-xl font-display">Link indisponível</h1>
          <p className="text-sm text-muted-foreground">{map[reason] || "Não foi possível abrir este formulário."}</p>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <Card className="p-8 sm:p-10 max-w-md w-full text-center space-y-5">
          <CheckCircle2 className="w-14 h-14 text-primary mx-auto" />
          <img src={logo} alt="NatLeva" className="h-8 mx-auto opacity-80" />
          <h1 className="text-2xl font-display">
            {doneCount > 1 ? `${doneCount} cadastros recebidos!` : "Cadastro recebido!"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {doneCount > 1
              ? "Recebemos os dados de todos os passageiros. Nossa equipe já está com tudo em mãos para cuidar da viagem de vocês."
              : "Obrigado por compartilhar seus dados com a gente. Nossa equipe já está com tudo em mãos para cuidar da sua viagem."}
          </p>
        </Card>
      </div>
    );
  }

  // ============ REVIEW STEP ============
  if (step === "review") {
    return (
      <div className="min-h-screen w-full bg-background flex flex-col items-center">
        <header className="w-full border-b border-border/30">
          <div className="w-full max-w-xl mx-auto px-5 sm:px-6 py-8 sm:py-10 text-center space-y-3">
            <img src={logo} alt="NatLeva" className="h-10 sm:h-12 mx-auto" />
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> Etapa final · revise e confirme
            </div>
            <h1 className="text-2xl sm:text-3xl font-display tracking-tight">Tudo certo com os dados?</h1>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Confere com calma cada passageiro. Depois de confirmar, os dados são enviados pra equipe.
            </p>
          </div>
        </header>

        <div className="w-full max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
          {passengers.map((p, idx) => (
            <Card key={entries[idx]?.id ?? idx} className="p-5 sm:p-6 space-y-3">

              <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <h3 className="font-display text-base">Passageiro {idx + 1}</h3>
              </div>
              <ReviewRow label="Nome completo" value={normalizePassengerName(p.full_name)} />
              <ReviewRow label="CPF" value={p.cpf} />
              <ReviewRow label="Data de nascimento" value={formatIsoBr(p.birth_date)} />
              <ReviewRow label="RG" value={p.rg} />
              <ReviewRow label="E-mail" value={p.email} />
              <ReviewRow label="Telefone" value={formatPhoneDisplay(p.phone)} />
              <ReviewRow label="Endereço" value={formatAddress(p)} />
              {p.international_outside_sa && (
                <>
                  <ReviewRow label="Passaporte" value={p.passport_number} />
                  <ReviewRow label="Validade do passaporte" value={formatIsoBr(p.passport_expiry)} />
                </>
              )}
            </Card>
          ))}

          {blockedMsg && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
              <p className="text-sm text-destructive">{blockedMsg}</p>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              size="lg"
              onClick={() => setStep("form")}
              disabled={submitting}
              className="sm:flex-1"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar e editar
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={onConfirmSubmit}
              disabled={submitting}
              className="sm:flex-1"
            >
              {submitting
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando…</>
                : <><Send className="w-4 h-4 mr-2" /> Confirmar e enviar</>}
            </Button>
          </div>

          <p className="text-center text-xs text-muted-foreground pb-6">
            Os dados são tratados com sigilo e usados apenas para organizar a viagem.
          </p>
        </div>
      </div>
    );
  }

  // ============ FORM STEP ============
  const allSaved = savedFlags.every(Boolean) && expandedIdx === null;

  return (
    <div className="min-h-screen w-full bg-background flex flex-col items-center">
      <header className="w-full border-b border-border/30">
        <div className="w-full max-w-xl mx-auto px-5 sm:px-6 py-8 sm:py-10 text-center space-y-3">
          <img src={logo} alt="NatLeva" className="h-10 sm:h-12 mx-auto" />
          <h1 className="text-2xl sm:text-3xl font-display tracking-tight">Cadastro de passageiros</h1>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Preenche os dados de cada passageiro com calma. A gente salva cada um antes de seguir pro próximo.
          </p>
        </div>
      </header>

      <div
        className="w-full max-w-xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5 [&_input]:h-11"
        onKeyDown={(e) => {
          // Impede submit acidental por Enter em qualquer input
          if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
            e.preventDefault();
          }
        }}
      >
        {passengers.map((p, idx) => {
          const saved = savedFlags[idx];
          const expanded = expandedIdx === idx;
          const stableKey = entries[idx]?.id ?? String(idx);

          if (!expanded) {
            return (
              <Card key={stableKey} className="p-4 sm:p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={
                        "h-9 w-9 rounded-full flex items-center justify-center shrink-0 " +
                        (saved ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground")
                      }
                    >
                      {saved ? <Check className="w-5 h-5" /> : <User className="w-5 h-5" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-display truncate">
                        Passageiro {idx + 1}
                        {p.full_name ? ` · ${normalizePassengerName(p.full_name)}` : ""}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {saved
                          ? (p.phone ? formatPhoneDisplay(p.phone) : "Dados salvos")
                          : "Aguardando preenchimento"}
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      // Salva o aberto antes de trocar
                      if (expandedIdx !== null && expandedIdx !== idx && !savedFlags[expandedIdx]) {
                        const ok = savePassenger(expandedIdx);
                        if (!ok) return;
                      }
                      setExpandedIdx(idx);
                    }}
                  >
                    <Pencil className="w-3.5 h-3.5 mr-1.5" />
                    {saved ? "Editar" : "Preencher"}
                  </Button>
                </div>
              </Card>
            );
          }

          return (
            <PassengerFormCard
              key={stableKey}
              index={idx}
              value={p}
              onChange={(next) => updatePassenger(idx, next)}
              onRemove={passengers.length > 1 ? () => removePassenger(idx) : undefined}
              canRemove={passengers.length > 1}
            />
          );

        })}

        {expandedIdx !== null && (
          <Button
            type="button"
            size="lg"
            onClick={() => savePassenger(expandedIdx)}
            className="w-full"
          >
            <Check className="w-4 h-4 mr-2" />
            Salvar passageiro {expandedIdx + 1}
          </Button>
        )}

        {expandedIdx === null && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={addPassenger}
            className="w-full border-dashed"
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar outro passageiro
          </Button>
        )}

        {blockedMsg && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
            <p className="text-sm text-destructive">{blockedMsg}</p>
          </div>
        )}

        <Button
          type="button"
          size="lg"
          onClick={goReview}
          disabled={!allSaved}
          className="w-full"
        >
          Revisar e enviar {passengers.length > 1 ? `(${passengers.length} passageiros)` : ""}
        </Button>

        {!allSaved && (
          <p className="text-center text-xs text-muted-foreground">
            Salva cada passageiro pra liberar o envio.
          </p>
        )}

        <p className="text-center text-xs text-muted-foreground pb-6">
          Os dados são tratados com sigilo e usados apenas para organizar a viagem.
        </p>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string | null }) {
  const v = (value || "").trim();
  return (
    <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 text-sm">
      <span className="text-muted-foreground sm:w-40 shrink-0">{label}</span>
      <span className={"font-medium break-words " + (v ? "" : "text-muted-foreground/60 italic")}>
        {v || "não informado"}
      </span>
    </div>
  );
}

function formatIsoBr(iso?: string) {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function formatAddress(p: PassengerFormState) {
  const parts = [
    [p.address_street, p.address_number].filter(Boolean).join(", "),
    p.address_complement,
    p.address_neighborhood,
    [p.address_city, p.address_state].filter(Boolean).join(" · "),
    p.address_cep,
  ].filter((x) => x && String(x).trim());
  return parts.join(" · ");
}
