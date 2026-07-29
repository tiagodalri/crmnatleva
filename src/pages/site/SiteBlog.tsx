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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Newspaper, Plus, Search, Eye, EyeOff, Trash2, Wand2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type BlogPost = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  content_md: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[] | null;
  seo_title: string | null;
  seo_description: string | null;
  status: string;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

const EMPTY: Partial<BlogPost> = {
  slug: "",
  title: "",
  subtitle: "",
  excerpt: "",
  content_md: "",
  cover_image_url: "",
  category: "",
  tags: [],
  seo_title: "",
  seo_description: "",
  status: "draft",
};

export function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function SiteBlog() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Partial<BlogPost> | null>(null);
  const [tagsText, setTagsText] = useState("");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["site-blog-posts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as BlogPost[];
    },
  });

  const save = useMutation({
    mutationFn: async (post: Partial<BlogPost>) => {
      const payload = {
        slug: post.slug?.trim(),
        title: post.title?.trim(),
        subtitle: post.subtitle || null,
        excerpt: post.excerpt || null,
        content_md: post.content_md || null,
        cover_image_url: post.cover_image_url || null,
        category: post.category || null,
        tags: post.tags || [],
        seo_title: post.seo_title || null,
        seo_description: post.seo_description || null,
        status: post.status || "draft",
        published_at: post.published_at ?? null,
      };
      if (!payload.slug || !payload.title) throw new Error("Título e slug são obrigatórios");
      if (post.id) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", post.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-blog-posts"] });
      toast.success("Artigo salvo");
      setEditing(null);
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar"),
  });

  const togglePublish = useMutation({
    mutationFn: async (post: BlogPost) => {
      const publishing = post.status !== "published";
      const { error } = await supabase
        .from("blog_posts")
        .update({
          status: publishing ? "published" : "draft",
          published_at: publishing ? post.published_at || new Date().toISOString() : null,
        })
        .eq("id", post.id);
      if (error) throw error;
      return publishing;
    },
    onSuccess: (publishing) => {
      qc.invalidateQueries({ queryKey: ["site-blog-posts"] });
      toast.success(publishing ? "Artigo publicado" : "Artigo despublicado");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site-blog-posts"] });
      toast.success("Artigo removido");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao remover"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return posts;
    return posts.filter(
      (p) =>
        p.title?.toLowerCase().includes(q) ||
        p.slug?.toLowerCase().includes(q) ||
        p.category?.toLowerCase().includes(q)
    );
  }, [posts, search]);

  const openEditor = (post?: BlogPost) => {
    const base = post ? { ...post } : { ...EMPTY };
    setEditing(base);
    setTagsText((base.tags || []).join(", "));
  };

  const patch = (p: Partial<BlogPost>) => setEditing((prev) => ({ ...(prev || {}), ...p }));

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 grid place-items-center shrink-0">
            <Newspaper className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold font-display">Blog do site</h1>
            <p className="text-sm text-muted-foreground">Artigos publicados em natleva.com</p>
          </div>
        </div>
        <Button onClick={() => openEditor()} className="shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          Novo artigo
        </Button>
      </div>

      <Card className="p-4 space-y-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título, slug ou categoria"
            className="pl-9"
          />
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead className="w-[130px]">Categoria</TableHead>
                <TableHead className="w-[120px]">Status</TableHead>
                <TableHead className="w-[140px]">Publicado em</TableHead>
                <TableHead className="w-[150px] text-right">Ações</TableHead>
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
                    Nenhum artigo encontrado.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map((p) => (
                <TableRow key={p.id} className="cursor-pointer" onClick={() => openEditor(p)}>
                  <TableCell>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground font-mono">{p.slug}</div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.category || "·"}</TableCell>
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
                  <TableCell className="text-xs text-muted-foreground">
                    {p.published_at ? format(new Date(p.published_at), "dd MMM yyyy", { locale: ptBR }) : "·"}
                  </TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        title={p.status === "published" ? "Despublicar" : "Publicar"}
                        onClick={() => togglePublish.mutate(p)}
                      >
                        {p.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        title="Remover"
                        onClick={() => {
                          if (window.confirm("Remover este artigo definitivamente?")) remove.mutate(p.id);
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
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar artigo" : "Novo artigo"}</DialogTitle>
          </DialogHeader>

          {editing && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Título</Label>
                  <Input
                    value={editing.title || ""}
                    onChange={(e) => patch({ title: e.target.value })}
                    placeholder="Título do artigo"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Slug</Label>
                  <div className="flex gap-2">
                    <Input
                      value={editing.slug || ""}
                      onChange={(e) => patch({ slug: e.target.value })}
                      placeholder="slug-do-artigo"
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
                  <Label>Resumo</Label>
                  <Textarea
                    rows={3}
                    value={editing.excerpt || ""}
                    onChange={(e) => patch({ excerpt: e.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Capa (URL)</Label>
                  <Input
                    value={editing.cover_image_url || ""}
                    onChange={(e) => patch({ cover_image_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Categoria</Label>
                  <Input value={editing.category || ""} onChange={(e) => patch({ category: e.target.value })} />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Tags (separadas por vírgula)</Label>
                  <Input
                    value={tagsText}
                    onChange={(e) => {
                      setTagsText(e.target.value);
                      patch({
                        tags: e.target.value
                          .split(",")
                          .map((t) => t.trim())
                          .filter(Boolean),
                      });
                    }}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Conteúdo (markdown)</Label>
                <Tabs defaultValue="edit">
                  <TabsList>
                    <TabsTrigger value="edit">Editar</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  <TabsContent value="edit">
                    <Textarea
                      rows={16}
                      className="font-mono text-sm"
                      value={editing.content_md || ""}
                      onChange={(e) => patch({ content_md: e.target.value })}
                    />
                  </TabsContent>
                  <TabsContent value="preview">
                    <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg border border-border/60 p-4 min-h-[200px] overflow-x-auto">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{editing.content_md || ""}</ReactMarkdown>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>SEO title</Label>
                  <Input value={editing.seo_title || ""} onChange={(e) => patch({ seo_title: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>SEO description</Label>
                  <Input
                    value={editing.seo_description || ""}
                    onChange={(e) => patch({ seo_description: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 rounded-lg border border-border/60 p-3">
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
                  onClick={() =>
                    patch(
                      editing.status === "published"
                        ? { status: "draft", published_at: null }
                        : { status: "published", published_at: editing.published_at || new Date().toISOString() }
                    )
                  }
                >
                  {editing.status === "published" ? "Despublicar" : "Publicar"}
                </Button>
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
