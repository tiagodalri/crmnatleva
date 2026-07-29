import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { PackageOpen, Plus, Search, Eye, EyeOff, Trash2, Wand2, Info } from "lucide-react";
import { slugify } from "./SiteBlog";

type SitePackage = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  cover_image_url: string | null;
  price_from_text: string | null;
  proposal_slug: string | null;
  highlights: string[] | null;
  sort_order: number;
  status: string;
  created_at: string;
};

const EMPTY: Partial<SitePackage> = {
  slug: "",
  title: "",
  subtitle: "",
  cover_image_url: "",
  price_from_text: "",
  proposal_slug: "",
  highlights: [],
  sort_order: 0,
  status: "draft",
};

export default function SitePackages() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<SitePackage> | null>(null);
  const [highlightsText, setHighlightsText] = useState("");

  const { data: packages = [], isLoading } = useQuery({
    queryKey: ["site-packages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_packages")
        .select("*")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SitePackage[];
    },
  });

  const save = useMutation({
    mutationFn: async (pkg: Partial<SitePackage>) => {
      const payload = {
        slug: pkg.slug?.trim(),
        title: pkg.title?.trim(),
        subtitle: pkg.subtitle || null,
        cover_image_url: pkg.cover_image_url || null,
        price_from_text: pkg.price_from_text || null,
        proposal_slug: pkg.proposal_slug?.trim() || null,
        highlights: pkg.highlights || [],
        sort_order: Number(pkg.sort_order) || 0,
        status: pkg.status || "draft",
      };
      if (!payload.slug || !payload.title) throw new Error("Título e slug são obrigatórios");
      if (pkg.id) {
        const { error } = await supabase.from("site_packages").update(payload).eq("id", pkg.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("site_packages").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-packages"] });
      toast.success("Pacote salvo");
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });

  const toggleStatus = useMutation({
    mutationFn: async (pkg: SitePackage) => {
      const publishing = pkg.status !== "published";
      const { error } = await supabase
        .from("site_packages")
        .update({ status: publishing ? "published" : "draft" })
        .eq("id", pkg.id);
      if (error) throw error;
      return publishing;
    },
    onSuccess: (publishing) => {
      qc.invalidateQueries({ queryKey: ["site-packages"] });
      toast.success(publishing ? "Pacote publicado" : "Pacote despublicado");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("site_packages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-packages"] });
      toast.success("Pacote removido");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao remover"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return packages;
    return packages.filter((p) => p.title?.toLowerCase().includes(q) || p.slug?.toLowerCase().includes(q));
  }, [packages, search]);

  const openEditor = (pkg?: SitePackage) => {
    const base = pkg ? { ...pkg } : { ...EMPTY };
    setEditing(base);
    setHighlightsText((base.highlights || []).join("\n"));
  };

  const patch = (p: Partial<SitePackage>) => setEditing((prev) => ({ ...(prev || {}), ...p }));

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
            <PackageOpen className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display">Pacotes do site</h1>
            <p className="text-sm text-muted-foreground">Vitrine de pacotes exibida em natleva.com</p>
          </div>
        </div>
        <Button onClick={() => openEditor()} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Novo pacote
        </Button>
      </div>

      <div className="flex items-start gap-2 rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground">
        <Info className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          O campo <span className="font-mono">proposal_slug</span> liga o pacote ao link com gate de identificação em{" "}
          <span className="font-mono">/proposta/&lt;slug&gt;</span>. Deixe vazio para um pacote apenas informativo.
        </p>
      </div>

      <Card className="p-4 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título ou slug"
            className="pl-9"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[70px]">Ordem</TableHead>
                <TableHead>Pacote</TableHead>
                <TableHead className="w-[180px]">Proposta ligada</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[120px] text-right">Ações</TableHead>
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
                    Nenhum pacote cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => openEditor(p)}>
                  <TableCell className="font-mono text-xs">{p.sort_order}</TableCell>
                  <TableCell>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.slug}</div>
                  </TableCell>
                  <TableCell className="text-xs font-mono text-muted-foreground">
                    {p.proposal_slug ? `/proposta/${p.proposal_slug}` : "·"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        p.status === "published"
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      }
                    >
                      {p.status === "published" ? "Publicado" : "Rascunho"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button size="icon" variant="ghost" onClick={() => toggleStatus.mutate(p)}>
                        {p.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                          if (window.confirm("Remover este pacote?")) remove.mutate(p.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar pacote" : "Novo pacote"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Título</Label>
                <Input value={editing.title || ""} onChange={(e) => patch({ title: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Slug</Label>
                <div className="flex gap-2">
                  <Input
                    value={editing.slug || ""}
                    onChange={(e) => patch({ slug: e.target.value })}
                    className="font-mono text-sm"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0"
                    onClick={() => patch({ slug: slugify(editing.title || "") })}
                  >
                    <Wand2 className="h-4 w-4 mr-2" />
                    Sugerir
                  </Button>
                </div>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Subtítulo</Label>
                <Input value={editing.subtitle || ""} onChange={(e) => patch({ subtitle: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Capa (URL)</Label>
                <Input
                  value={editing.cover_image_url || ""}
                  onChange={(e) => patch({ cover_image_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Texto de preço</Label>
                <Input
                  value={editing.price_from_text || ""}
                  onChange={(e) => patch({ price_from_text: e.target.value })}
                  placeholder="A partir de R$ ..."
                />
              </div>
              <div className="space-y-1.5">
                <Label>Slug da proposta</Label>
                <Input
                  value={editing.proposal_slug || ""}
                  onChange={(e) => patch({ proposal_slug: e.target.value })}
                  className="font-mono text-sm"
                  placeholder="almaiberica"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Destaques (um por linha)</Label>
                <Textarea
                  rows={4}
                  value={highlightsText}
                  onChange={(e) => {
                    setHighlightsText(e.target.value);
                    patch({
                      highlights: e.target.value
                        .split("\n")
                        .map((h) => h.trim())
                        .filter(Boolean),
                    });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ordem</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={editing.sort_order ?? 0}
                  onChange={(e) => patch({ sort_order: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <div className="flex items-center gap-2 h-10">
                  <Badge
                    variant="outline"
                    className={
                      editing.status === "published"
                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                    }
                  >
                    {editing.status === "published" ? "Publicado" : "Rascunho"}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => patch({ status: editing.status === "published" ? "draft" : "published" })}
                  >
                    {editing.status === "published" ? "Despublicar" : "Publicar"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={() => editing && save.mutate(editing)} disabled={save.isPending}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
