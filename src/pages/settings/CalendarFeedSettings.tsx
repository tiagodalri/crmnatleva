import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CalendarDays, Copy, Loader2, Plus, Smartphone, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface FeedToken {
  id: string;
  token: string;
  label: string | null;
  created_at: string;
  last_accessed_at: string | null;
}

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/calendar-feed`;

function feedUrls(token: string) {
  const https = `${FUNCTIONS_URL}?token=${token}`;
  return { https, webcal: https.replace(/^https?:\/\//, "webcal://") };
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function formatDateTime(value: string | null): string {
  if (!value) return "nunca";
  return new Date(value).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function CalendarFeedSettings() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const isAdmin = role === "admin";
  const [tokens, setTokens] = useState<FeedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [label, setLabel] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from("calendar_feed_tokens")
      .select("id, token, label, created_at, last_accessed_at")
      .is("revoked_at", null)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erro ao carregar links", description: error.message, variant: "destructive" });
    } else {
      setTokens((data ?? []) as FeedToken[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) load();
    else setLoading(false);
  }, [isAdmin, load]);

  const createToken = async () => {
    setCreating(true);
    const { error } = await (supabase as any).from("calendar_feed_tokens").insert({
      token: randomToken(),
      label: label.trim() || "iPhone",
      created_by: user?.id ?? null,
    });
    setCreating(false);
    if (error) {
      toast({ title: "Erro ao gerar link", description: error.message, variant: "destructive" });
      return;
    }
    setLabel("");
    toast({ title: "Link gerado", description: "Abra o link no iPhone para assinar o calendário." });
    load();
  };

  const revokeToken = async (t: FeedToken) => {
    if (!window.confirm(`Cancelar o link "${t.label || "iPhone"}"? O calendário desse aparelho para de atualizar.`)) return;
    const { error } = await (supabase as any)
      .from("calendar_feed_tokens")
      .update({ revoked_at: new Date().toISOString() })
      .eq("id", t.id);
    if (error) {
      toast({ title: "Erro ao cancelar link", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Link cancelado" });
    load();
  };

  const copyLink = async (t: FeedToken) => {
    try {
      await navigator.clipboard.writeText(feedUrls(t.token).webcal);
      toast({ title: "Link copiado" });
    } catch {
      toast({ title: "Não foi possível copiar", variant: "destructive" });
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-4 md:p-6">
        <Card className="p-6 text-sm text-muted-foreground">Apenas administradores podem acessar esta página.</Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-5 animate-fade-in max-w-3xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-serif text-foreground">Calendário no celular</h1>
          <p className="text-sm text-muted-foreground">
            Voos, embarques, retornos e hotéis dos clientes no calendário do iPhone, atualizando sozinho.
          </p>
        </div>
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex items-center gap-2 font-medium text-foreground">
          <Smartphone className="w-4 h-4 text-primary" /> Como usar no iPhone
        </div>
        <ol className="list-decimal pl-5 space-y-1 text-sm text-muted-foreground">
          <li>Gere um link abaixo (um para cada pessoa ou aparelho).</li>
          <li>No iPhone, toque em <b>Adicionar ao iPhone</b> (ou copie o link e abra no Safari).</li>
          <li>Confirme em <b>Assinar</b> e depois em <b>Adicionar</b>.</li>
          <li>
            Se não abrir: Ajustes → Apps → Calendário → Contas → Adicionar Conta → Outra → Adicionar Calendário
            Assinado, e cole o link.
          </li>
        </ol>
        <p className="text-xs text-muted-foreground">
          O calendário mostra todas as vendas não canceladas. Qualquer pessoa com o link vê os dados — não compartilhe fora da equipe.
        </p>
      </Card>

      <Card className="p-5 space-y-3">
        <Label htmlFor="feed-label" className="text-sm">Novo link</Label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id="feed-label"
            placeholder="Ex.: iPhone do Tiago"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <Button onClick={createToken} disabled={creating} className="shrink-0">
            {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
            Gerar link
          </Button>
        </div>
      </Card>

      <div className="space-y-3">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando…
          </div>
        ) : tokens.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">Nenhum link ativo.</Card>
        ) : (
          tokens.map((t) => {
            const urls = feedUrls(t.token);
            return (
              <Card key={t.id} className="p-4 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 font-medium text-foreground">
                      <CalendarDays className="w-4 h-4 text-primary shrink-0" />
                      <span className="truncate">{t.label || "iPhone"}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Criado em {formatDateTime(t.created_at)} · Última atualização no aparelho: {formatDateTime(t.last_accessed_at)}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="text-destructive shrink-0" onClick={() => revokeToken(t)}>
                    <Trash2 className="w-4 h-4 mr-1" /> Cancelar
                  </Button>
                </div>
                <p className="text-xs font-mono break-all bg-muted/50 rounded-md p-2 text-muted-foreground">{urls.webcal}</p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button asChild size="sm">
                    <a href={urls.webcal}>
                      <Smartphone className="w-4 h-4 mr-2" /> Adicionar ao iPhone
                    </a>
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copyLink(t)}>
                    <Copy className="w-4 h-4 mr-2" /> Copiar link
                  </Button>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
