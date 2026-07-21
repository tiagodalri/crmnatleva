import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, X, ZoomIn, ZoomOut, RotateCcw, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

const ProposalPreviewRenderer = lazy(() => import("./ProposalPreviewRenderer"));

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Aceita id (uuid) ou slug da proposta. */
  proposalKey: string | null;
}

/**
 * Modal admin-only para visualizar uma proposta EXATAMENTE como o cliente vê,
 * sem passar pelo gate de captura de lead e sem gravar tracking em
 * `proposal_viewers` / `proposal_clicks`. Reaproveita o mesmo renderer visual
 * usado em `/proposta/:slug` para garantir fidelidade 100%.
 */
export default function ProposalPreviewModal({ open, onOpenChange, proposalKey }: Props) {
  const [loading, setLoading] = useState(false);
  const [proposal, setProposal] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    if (!open || !proposalKey) return;
    let active = true;
    setLoading(true);
    setError(null);
    setProposal(null);
    setItems([]);
    setZoom(1);

    (async () => {
      try {
        const key = proposalKey.trim();
        let prop: any = null;
        if (UUID_RE.test(key)) {
          const { data } = await supabase.from("proposals").select("*").eq("id", key).maybeSingle();
          prop = data;
        }
        if (!prop) {
          const { data } = await supabase.from("proposals").select("*").eq("slug", key).maybeSingle();
          prop = data;
        }
        if (!active) return;
        if (!prop) {
          setError("Proposta não encontrada.");
          setLoading(false);
          return;
        }
        const { data: itemsData } = await supabase
          .from("proposal_items")
          .select("*")
          .eq("proposal_id", prop.id)
          .order("position");
        if (!active) return;
        setProposal(prop);
        setItems(itemsData || []);
        setLoading(false);
      } catch (err) {
        if (!active) return;
        setError("Erro ao carregar proposta.");
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [open, proposalKey]);

  const publicUrl = useMemo(() => {
    if (!proposal?.slug) return null;
    return `${window.location.origin}/proposta/${proposal.slug}`;
  }, [proposal]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "max-w-6xl w-[95vw] p-0 gap-0 overflow-hidden",
          "h-[92vh] flex flex-col",
        )}
      >
        {/* Toolbar (não faz parte da proposta — só do visualizador admin) */}
        <div className="flex items-center justify-between gap-2 px-3 py-2 border-b bg-background/95 backdrop-blur">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              Prévia admin
            </span>
            {proposal?.title && (
              <span className="text-xs font-semibold truncate">{proposal.title}</span>
            )}
            <span className="text-[10px] text-muted-foreground hidden sm:inline">
              · sem captura de lead · sem tracking
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))}
              title="Diminuir zoom"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </Button>
            <span className="text-[10.5px] tabular-nums text-muted-foreground w-10 text-center">
              {Math.round(zoom * 100)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.1).toFixed(2)))}
              title="Aumentar zoom"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom(1)}
              title="Restaurar zoom"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </Button>
            {publicUrl && (
              <a
                href={publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[10.5px] text-primary hover:underline px-1"
                title="Abrir link público em nova aba"
              >
                Link público <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => onOpenChange(false)}
              title="Fechar"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* Área rolável com a proposta renderizada */}
        <div className="flex-1 overflow-auto bg-muted/20">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && error && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              {error}
            </div>
          )}
          {!loading && !error && proposal && (
            <div
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top center",
                width: `${100 / zoom}%`,
              }}
            >
              <Suspense
                fallback={
                  <div className="flex items-center justify-center py-24">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                }
              >
                <ProposalPreviewRenderer
                  proposal={proposal}
                  items={items}
                  embedded
                  /* Sem tracking: o modal admin não deve contaminar métricas. */
                />
              </Suspense>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
