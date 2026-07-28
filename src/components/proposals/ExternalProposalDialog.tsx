import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Globe, Loader2 } from "lucide-react";

interface ExternalProposal {
  id?: string;
  title?: string | null;
  client_name?: string | null;
  destinations?: string[] | null;
  cover_image_url?: string | null;
  external_url?: string | null;
  slug?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Preencher para editar uma proposta externa existente. */
  proposal?: ExternalProposal | null;
  onSaved?: () => void;
}

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function ExternalProposalDialog({ open, onOpenChange, proposal, onSaved }: Props) {
  const isEdit = !!proposal?.id;
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [destination, setDestination] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [externalUrl, setExternalUrl] = useState("");
  const [slug, setSlug] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle(proposal?.title || "");
    setClientName(proposal?.client_name || "");
    setDestination((proposal?.destinations || []).join(", "));
    setCoverImage(proposal?.cover_image_url || "");
    setExternalUrl(proposal?.external_url || "");
    setSlug(proposal?.slug || "");
    setSaving(false);
  }, [open, proposal]);

  const handleSave = async () => {
    const cleanTitle = title.trim();
    const cleanUrl = externalUrl.trim();
    const cleanSlug = slugify(slug || cleanTitle);

    if (!cleanTitle) return toast.error("Informe o título da proposta");
    if (!/^https?:\/\//i.test(cleanUrl)) return toast.error("Informe uma URL externa válida iniciando com https://");
    if (!cleanSlug) return toast.error("Informe um slug válido");

    setSaving(true);
    try {
      const payload: any = {
        title: cleanTitle,
        client_name: clientName.trim() || null,
        destinations: destination.trim() ? destination.split(",").map((d) => d.trim()).filter(Boolean) : null,
        cover_image_url: coverImage.trim() || null,
        external_url: cleanUrl,
        slug: cleanSlug,
      };

      if (isEdit) {
        const { error } = await supabase.from("proposals").update(payload).eq("id", proposal!.id!);
        if (error) throw error;
        toast.success("Proposta externa atualizada");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase.from("proposals").insert({
          ...payload,
          status: "sent",
          created_by: user?.id || null,
        });
        if (error) throw error;
        toast.success("Proposta externa criada");
      }

      onSaved?.();
      onOpenChange(false);
    } catch (err: any) {
      toast.error("Não foi possível salvar", { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            {isEdit ? "Editar proposta externa" : "Nova proposta externa"}
          </DialogTitle>
          <DialogDescription>
            A apresentação fica hospedada fora do sistema. O gate de identificação e o rastreamento continuam funcionando normalmente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="ext-title">Título</Label>
            <Input id="ext-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Alma Ibérica · Madri & Barcelona" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ext-client">Cliente ou campanha</Label>
            <Input id="ext-client" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Campanha Alma Ibérica" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ext-dest">Destino (subtítulo do gate)</Label>
            <Input id="ext-dest" value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="Madri & Barcelona" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ext-cover">Imagem de capa do gate (opcional)</Label>
            <Input id="ext-cover" value={coverImage} onChange={(e) => setCoverImage(e.target.value)} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ext-url">URL externa</Label>
            <Input id="ext-url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)} placeholder="https://natlevaiberica.lovable.app" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ext-slug">Slug público</Label>
            <Input id="ext-slug" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="almaiberica" />
            <p className="text-[11px] text-muted-foreground break-all">/proposta/{slugify(slug || title) || "..."}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {isEdit ? "Salvar" : "Criar proposta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
