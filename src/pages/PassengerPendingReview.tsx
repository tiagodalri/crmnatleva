import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { formatDateTimeBR } from "@/lib/dateFormat";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Check, X, GitMerge, Loader2, Inbox, ShieldAlert } from "lucide-react";

interface PendingSubmission {
  id: string;
  matched_passenger_id: string | null;
  matched_by: "cpf" | "passport" | "both";
  signup_link_id: string | null;
  submission_id: string | null;
  submitted_data: Record<string, any>;
  submitter_ip: string | null;
  status: "pending" | "approved" | "discarded" | "merged";
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

interface PassengerRow {
  id: string;
  full_name: string;
  cpf: string | null;
  birth_date: string | null;
  phone: string | null;
  email: string | null;
  rg: string | null;
  passport_number: string | null;
  passport_expiry: string | null;
  passport_photo_url: string | null;
  address_cep: string | null;
  address_street: string | null;
  address_number: string | null;
  address_complement: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_notes: string | null;
}

const EDITABLE_FIELDS: Array<{ key: keyof PassengerRow; label: string }> = [
  { key: "full_name", label: "Nome completo" },
  { key: "cpf", label: "CPF" },
  { key: "birth_date", label: "Nascimento" },
  { key: "phone", label: "Telefone" },
  { key: "email", label: "E-mail" },
  { key: "rg", label: "RG" },
  { key: "passport_number", label: "Passaporte" },
  { key: "passport_expiry", label: "Validade passaporte" },
  { key: "passport_photo_url", label: "Foto do passaporte" },
  { key: "address_cep", label: "CEP" },
  { key: "address_street", label: "Rua" },
  { key: "address_number", label: "Número" },
  { key: "address_complement", label: "Complemento" },
  { key: "address_neighborhood", label: "Bairro" },
  { key: "address_city", label: "Cidade" },
  { key: "address_state", label: "Estado" },
  { key: "address_notes", label: "Observações endereço" },
];

function normalize(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

export default function PassengerPendingReview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PendingSubmission[]>([]);
  const [passengers, setPassengers] = useState<Record<string, PassengerRow>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"pending" | "history">("pending");

  const load = useCallback(async () => {
    setLoading(true);
    const { data: subs, error } = await supabase
      .from("passenger_pending_submissions" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Erro ao carregar", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const list = (subs || []) as unknown as PendingSubmission[];
    setItems(list);
    const ids = Array.from(new Set(list.map((s) => s.matched_passenger_id).filter(Boolean))) as string[];
    if (ids.length) {
      const { data: pax } = await supabase.from("passengers").select("*").in("id", ids);
      const map: Record<string, PassengerRow> = {};
      (pax || []).forEach((p: any) => { map[p.id] = p; });
      setPassengers(map);
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const pending = useMemo(() => items.filter((i) => i.status === "pending"), [items]);
  const history = useMemo(() => items.filter((i) => i.status !== "pending"), [items]);
  const visible = tab === "pending" ? pending : history;

  const active = activeId ? items.find((i) => i.id === activeId) || null : null;
  const activePassenger = active?.matched_passenger_id ? passengers[active.matched_passenger_id] : null;

  const openDialog = (item: PendingSubmission) => {
    setActiveId(item.id);
    setNotes(item.review_notes || "");
    // pré-seleciona todos os campos que diferem
    if (item.status === "pending" && item.matched_passenger_id) {
      const p = passengers[item.matched_passenger_id];
      const diff = new Set<string>();
      EDITABLE_FIELDS.forEach(({ key }) => {
        const cur = p ? (p as any)[key] : null;
        const sub = item.submitted_data?.[key];
        if (sub && sub !== cur) diff.add(key as string);
      });
      setSelectedFields(diff);
    } else {
      setSelectedFields(new Set());
    }
  };

  const closeDialog = () => {
    setActiveId(null);
    setSelectedFields(new Set());
    setNotes("");
  };

  const finalize = async (status: "approved" | "discarded" | "merged", appliedFields?: string[]) => {
    if (!active) return;
    setSaving(true);
    try {
      // aplicar merge no passageiro
      if ((status === "approved" || status === "merged") && active.matched_passenger_id) {
        const patch: Record<string, any> = {};
        const fields = status === "approved"
          ? EDITABLE_FIELDS.map((f) => f.key as string).filter((k) => active.submitted_data?.[k] !== undefined && active.submitted_data?.[k] !== null && active.submitted_data?.[k] !== "")
          : (appliedFields || []);
        fields.forEach((k) => {
          const v = active.submitted_data?.[k];
          if (v !== undefined) patch[k] = v;
        });
        if (Object.keys(patch).length > 0) {
          const { error: upErr } = await supabase.from("passengers").update(patch).eq("id", active.matched_passenger_id);
          if (upErr) throw upErr;
        }
      }
      const { error } = await supabase
        .from("passenger_pending_submissions" as any)
        .update({
          status,
          reviewed_by: user?.id || null,
          reviewed_at: new Date().toISOString(),
          review_notes: notes || null,
          applied_fields: appliedFields ? appliedFields : null,
        })
        .eq("id", active.id);
      if (error) throw error;
      toast({ title: "Revisão registrada", description: status === "discarded" ? "Cadastro descartado." : status === "approved" ? "Passageiro atualizado com todos os dados enviados." : "Campos selecionados mesclados." });
      closeDialog();
      await load();
    } catch (e: any) {
      toast({ title: "Falha ao registrar", description: e?.message || "Tente novamente", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate("/passageiros")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Passageiros
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-serif text-foreground flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" /> Cadastros pendentes de revisão
          </h1>
          <p className="text-sm text-muted-foreground">
            Envios do link público que colidiram com passageiros já existentes. Revise antes de aplicar ao cadastro oficial.
          </p>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setTab("pending")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${tab === "pending" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Pendentes ({pending.length})
        </button>
        <button
          onClick={() => setTab("history")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${tab === "history" ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
        >
          Histórico ({history.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground p-8 justify-center">
          <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
        </div>
      ) : visible.length === 0 ? (
        <Card className="p-8 text-center">
          <Inbox className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            {tab === "pending" ? "Nenhum cadastro aguardando revisão." : "Nenhuma revisão registrada ainda."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {visible.map((item) => {
            const p = item.matched_passenger_id ? passengers[item.matched_passenger_id] : null;
            const submittedName = item.submitted_data?.full_name || "—";
            return (
              <Card key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-primary/40 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-foreground">{submittedName}</span>
                    <Badge variant="outline" className="text-xs">Colisão por {item.matched_by === "both" ? "CPF + passaporte" : item.matched_by === "cpf" ? "CPF" : "passaporte"}</Badge>
                    {item.status !== "pending" && (
                      <Badge variant={item.status === "discarded" ? "secondary" : "default"} className="text-xs capitalize">{item.status}</Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Enviado em {formatDateTimeBR(item.created_at)}
                    {p && <> · vinculado a <span className="text-foreground">{p.full_name}</span></>}
                  </div>
                </div>
                <Button size="sm" variant={item.status === "pending" ? "default" : "outline"} onClick={() => openDialog(item)}>
                  {item.status === "pending" ? "Revisar" : "Detalhes"}
                </Button>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!activeId} onOpenChange={(v) => !v && closeDialog()}>
        <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar cadastro enviado</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                Enviado em {formatDateTimeBR(active.created_at)} · IP {active.submitter_ip || "—"} · colisão por {active.matched_by}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground border-b border-border">
                      <th className="py-2 pr-2 w-10">Aplicar</th>
                      <th className="py-2 pr-3">Campo</th>
                      <th className="py-2 pr-3">Cadastro atual</th>
                      <th className="py-2 pr-3">Enviado pelo cliente</th>
                    </tr>
                  </thead>
                  <tbody>
                    {EDITABLE_FIELDS.map(({ key, label }) => {
                      const cur = activePassenger ? (activePassenger as any)[key] : null;
                      const sub = active.submitted_data?.[key];
                      const differs = sub && sub !== cur;
                      const filled = sub !== undefined && sub !== null && sub !== "";
                      const disabled = !filled || active.status !== "pending";
                      return (
                        <tr key={key as string} className={`border-b border-border/50 ${differs ? "bg-primary/5" : ""}`}>
                          <td className="py-2 pr-2">
                            <Checkbox
                              checked={selectedFields.has(key as string)}
                              disabled={disabled}
                              onCheckedChange={(v) => {
                                setSelectedFields((s) => {
                                  const n = new Set(s);
                                  if (v) n.add(key as string); else n.delete(key as string);
                                  return n;
                                });
                              }}
                            />
                          </td>
                          <td className="py-2 pr-3 text-muted-foreground">{label}</td>
                          <td className="py-2 pr-3 break-words max-w-[220px]">{normalize(cur)}</td>
                          <td className={`py-2 pr-3 break-words max-w-[220px] ${differs ? "font-medium text-foreground" : ""}`}>{normalize(sub)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Observações internas (opcional)</label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} disabled={active.status !== "pending"} />
              </div>
            </div>
          )}
          <DialogFooter className="flex-wrap gap-2">
            {active?.status === "pending" ? (
              <>
                <Button variant="outline" onClick={closeDialog} disabled={saving}>Cancelar</Button>
                <Button variant="secondary" onClick={() => finalize("discarded")} disabled={saving}>
                  <X className="w-4 h-4 mr-1" /> Descartar
                </Button>
                <Button variant="outline" onClick={() => finalize("merged", Array.from(selectedFields))} disabled={saving || selectedFields.size === 0}>
                  <GitMerge className="w-4 h-4 mr-1" /> Mesclar selecionados ({selectedFields.size})
                </Button>
                <Button onClick={() => finalize("approved")} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                  Aprovar tudo
                </Button>
              </>
            ) : (
              <Button onClick={closeDialog}>Fechar</Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
