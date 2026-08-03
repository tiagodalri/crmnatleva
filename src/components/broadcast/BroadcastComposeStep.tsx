import { useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Paperclip, Trash2, MessageSquareText, Tag } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import WhatsAppBubble from "./WhatsAppBubble";
import type { BroadcastMedia, MediaKind } from "./types";

interface Props {
  name: string;
  onNameChange: (v: string) => void;
  message: string;
  onMessageChange: (v: string) => void;
  media: BroadcastMedia | null;
  onMediaChange: (m: BroadcastMedia | null) => void;
}

const MAX_MB = 15;

function kindFromMime(mime: string): MediaKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("audio/")) return "audio";
  return "document";
}

export default function BroadcastComposeStep({
  name, onNameChange, message, onMessageChange, media, onMediaChange,
}: Props) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      toast.error(`Arquivo acima de ${MAX_MB}MB`);
      return;
    }
    setUploading(true);
    try {
      const safeName = file.name.replace(/[^\w.\-]/g, "_");
      const path = `broadcasts/${Date.now()}_${safeName}`;
      const { error } = await supabase.storage
        .from("media")
        .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      onMediaChange({
        url: data.publicUrl,
        type: kindFromMime(file.type || ""),
        filename: file.name,
        mimetype: file.type || "application/octet-stream",
        size: file.size,
      });
      toast.success("Anexo pronto");
    } catch (err: any) {
      toast.error(err?.message || "Falha no upload");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-5">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display">
              <Tag className="h-4 w-4 text-primary" />
              Identificação da campanha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Label htmlFor="bc-name" className="text-xs uppercase tracking-wide text-muted-foreground">
              Nome interno
            </Label>
            <Input
              id="bc-name"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="Ex: Convite Alma Ibérica · agosto"
              maxLength={120}
            />
            <p className="text-[11px] text-muted-foreground">
              Só a equipe vê este nome. Serve para achar a campanha no histórico.
            </p>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-display">
              <MessageSquareText className="h-4 w-4 text-primary" />
              Mensagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Textarea
                value={message}
                onChange={(e) => onMessageChange(e.target.value)}
                placeholder="Escreva como você falaria no WhatsApp · tom humano, direto e elegante."
                rows={8}
                maxLength={3000}
                className="resize-y text-sm leading-relaxed"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Quebras de linha são preservadas no envio.</span>
                <span>{message.length}/3000</span>
              </div>
            </div>

            <div className="rounded-lg border border-dashed border-border p-4">
              {media ? (
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="shrink-0 capitalize">{media.type}</Badge>
                  <span className="min-w-0 flex-1 truncate text-xs" title={media.filename}>
                    {media.filename}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">
                    {(media.size / 1024 / 1024).toFixed(2)} MB
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => onMediaChange(null)} aria-label="Remover anexo">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Anexo opcional</p>
                    <p className="text-[11px] text-muted-foreground">
                      1 arquivo · imagem, áudio ou documento · até {MAX_MB}MB
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => inputRef.current?.click()}
                    disabled={uploading}
                    className="min-h-[44px]"
                  >
                    {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Paperclip className="mr-2 h-4 w-4" />}
                    {uploading ? "Enviando" : "Escolher arquivo"}
                  </Button>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept="image/*,audio/*,.pdf,.doc,.docx,.xls,.xlsx"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card className="glass-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-display">Como o contato vai ver</CardTitle>
          </CardHeader>
          <CardContent>
            <WhatsAppBubble message={message} media={media} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
