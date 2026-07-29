import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Target, Search, UserPlus, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type SiteLead = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  interest: string | null;
  source_path: string | null;
  utm: Record<string, unknown> | null;
  session_id: string | null;
  created_at: string;
};

function utmSummary(utm: Record<string, unknown> | null) {
  if (!utm) return "";
  const parts = ["utm_source", "utm_medium", "utm_campaign"]
    .map((k) => (utm as any)[k])
    .filter(Boolean);
  return parts.join(" · ");
}

export default function SiteLeads() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<SiteLead | null>(null);

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["site-leads"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data || []) as SiteLead[];
    },
  });

  const convert = useMutation({
    mutationFn: async (lead: SiteLead) => {
      const phone = (lead.phone || "").replace(/\D/g, "");
      if (phone) {
        const { data: existing } = await supabase
          .from("clients")
          .select("id")
          .eq("phone", phone)
          .maybeSingle();
        if (existing?.id) return { id: existing.id, existed: true };
      }
      const { data, error } = await supabase
        .from("clients")
        .insert({
          display_name: lead.name?.trim() || lead.email || "Lead do site",
          phone: phone || null,
          email: lead.email || null,
          tags: ["Site"],
          observations: [lead.interest ? `Interesse: ${lead.interest}` : "", lead.message || ""]
            .filter(Boolean)
            .join("\n"),
        })
        .select("id")
        .single();
      if (error) throw error;
      return { id: data.id as string, existed: false };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["site-leads"] });
      toast.success(res.existed ? "Cliente já existia · abrindo cadastro" : "Cliente criado a partir do lead");
      navigate(`/clients/${res.id}`);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao converter lead"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return leads;
    return leads.filter((l) =>
      [l.name, l.email, l.phone, l.interest, l.message, l.source_path]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [leads, search]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
          <Target className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold font-display">Leads do site</h1>
          <p className="text-sm text-muted-foreground">Contatos captados em natleva.com</p>
        </div>
      </div>

      <Card className="p-4 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email, telefone ou interesse"
            className="pl-9"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead className="w-[150px]">Interesse</TableHead>
                <TableHead className="w-[200px]">Origem</TableHead>
                <TableHead className="w-[130px]">Data</TableHead>
                <TableHead className="w-[170px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhum lead recebido ainda.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((l) => (
                <TableRow key={l.id} className="cursor-pointer" onClick={() => setDetail(l)}>
                  <TableCell>
                    <div className="font-medium">{l.name || "Sem nome"}</div>
                    <div className="text-xs text-muted-foreground break-all">{l.email || "·"}</div>
                    <div className="text-xs text-muted-foreground">{l.phone || "·"}</div>
                  </TableCell>
                  <TableCell className="text-sm">{l.interest || "·"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    <div className="font-mono break-all">{l.source_path || "·"}</div>
                    {utmSummary(l.utm) && <div className="mt-0.5">{utmSummary(l.utm)}</div>}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(l.created_at), "dd MMM yyyy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <Button size="sm" variant="outline" onClick={() => convert.mutate(l)} disabled={convert.isPending}>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Converter
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.name || "Lead do site"}</DialogTitle>
          </DialogHeader>
          {detail && (
            <div className="space-y-3 text-sm">
              <div className="flex flex-wrap gap-2">
                {detail.interest && <Badge variant="outline">{detail.interest}</Badge>}
                {detail.source_path && (
                  <Badge variant="outline" className="font-mono text-[10px]">
                    {detail.source_path}
                  </Badge>
                )}
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="break-all">{detail.email || "·"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">WhatsApp</p>
                <p>{detail.phone || "·"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Mensagem</p>
                <p className="whitespace-pre-wrap break-words">{detail.message || "·"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">UTM</p>
                <pre className="text-xs bg-muted/40 rounded-lg p-2 overflow-x-auto">
                  {JSON.stringify(detail.utm || {}, null, 2)}
                </pre>
              </div>
            </div>
          )}
          <DialogFooter>
            {detail?.phone && (
              <Button
                variant="outline"
                onClick={() =>
                  window.open(`https://wa.me/${(detail.phone || "").replace(/\D/g, "")}`, "_blank", "noopener")
                }
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                WhatsApp
              </Button>
            )}
            <Button onClick={() => detail && convert.mutate(detail)} disabled={convert.isPending}>
              <UserPlus className="h-4 w-4 mr-2" />
              Converter em cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
