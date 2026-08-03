import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { History, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CAMPAIGN_STATUS_META, type CampaignRow } from "./types";
import { cn } from "@/lib/utils";

interface Props {
  onOpen: (campaignId: string) => void;
  refreshKey?: number;
}

export default function BroadcastHistory({ onOpen, refreshKey }: Props) {
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [authors, setAuthors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("broadcast_campaigns")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (cancelled) return;
      const list = ((data as any) || []) as CampaignRow[];
      setRows(list);

      const ids = Array.from(new Set(list.map((r) => r.created_by).filter(Boolean))) as string[];
      if (ids.length) {
        const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        const map: Record<string, string> = {};
        (profs || []).forEach((p: any) => { map[p.id] = p.full_name; });
        if (!cancelled) setAuthors(map);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshKey]);

  return (
    <Card className="glass-card">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-display">
          <History className="h-4 w-4 text-primary" />
          Campanhas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            Nenhuma campanha criada até agora.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campanha</TableHead>
                  <TableHead className="w-[160px]">Criada por</TableHead>
                  <TableHead className="w-[130px]">Quando</TableHead>
                  <TableHead className="w-[110px]">Destinatários</TableHead>
                  <TableHead className="w-[150px]">Resultado</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const st = CAMPAIGN_STATUS_META[r.status] || { label: r.status, cls: "" };
                  return (
                    <TableRow key={r.id} className="cursor-pointer" onClick={() => onOpen(r.id)}>
                      <TableCell className="max-w-[260px] truncate text-sm font-medium" title={r.name}>
                        {r.name}
                      </TableCell>
                      <TableCell className="truncate text-xs text-muted-foreground">
                        {r.created_by ? authors[r.created_by] || "—" : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-[11px] text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </TableCell>
                      <TableCell className="text-sm">{(r.total_recipients ?? 0).toLocaleString("pt-BR")}</TableCell>
                      <TableCell className="text-xs">
                        <span className="text-emerald-600 dark:text-emerald-400">{r.total_sent ?? 0} enviadas</span>
                        {(r.total_failed ?? 0) > 0 && (
                          <span className="text-destructive"> · {r.total_failed} falhas</span>
                        )}
                      </TableCell>
                      <TableCell><Badge className={cn("text-[10px]", st.cls)}>{st.label}</Badge></TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" className="min-h-[36px]">
                          Abrir <ArrowRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
