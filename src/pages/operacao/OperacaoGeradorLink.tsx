import { useMemo, useState } from "react";
import { Link2, Copy, Check, MessageCircle, Smile, QrCode, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import LazyEmojiPicker from "@/components/LazyEmojiPicker";

// Número fixo da Natleva · WhatsApp oficial
const NATLEVA_PHONE = "5511966396692";
const NATLEVA_PHONE_DISPLAY = "+55 11 96639·6692";

function formatLength(n: number) {
  return n.toLocaleString("pt-BR");
}

export default function OperacaoGeradorLink() {
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  const link = useMemo(() => {
    const base = `https://wa.me/${NATLEVA_PHONE}`;
    const trimmed = message.trim();
    if (!trimmed) return base;
    return `${base}?text=${encodeURIComponent(trimmed)}`;
  }, [message]);

  const qrUrl = useMemo(
    () => `https://api.qrserver.com/v1/create-qr-code/?size=320x320&margin=12&data=${encodeURIComponent(link)}`,
    [link]
  );

  const handleEmojiSelect = (emoji: { native?: string }) => {
    if (emoji?.native) setMessage((prev) => prev + emoji.native);
  };

  const handleCopy = async () => {
    let ok = false;
    try {
      if (navigator.clipboard?.writeText && window.isSecureContext) {
        await navigator.clipboard.writeText(link);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) {
      // Fallback · funciona em iframes sem permissão de Clipboard API
      try {
        const ta = document.createElement("textarea");
        ta.value = link;
        ta.setAttribute("readonly", "");
        ta.style.position = "fixed";
        ta.style.top = "0";
        ta.style.left = "0";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        ta.setSelectionRange(0, link.length);
        ok = document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      toast({ title: "Link copiado", description: "Já pode colar onde quiser." });
      setTimeout(() => setCopied(false), 1800);
    } else {
      toast({
        title: "Não foi possível copiar",
        description: "Selecione o link manualmente e copie com Ctrl+C / Cmd+C.",
        variant: "destructive",
      });
    }
  };

  const handleOpen = () => window.open(link, "_blank", "noopener,noreferrer");

  const handleClear = () => setMessage("");

  return (
    <div className="container mx-auto max-w-5xl px-4 py-6 space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Link2 className="h-5 w-5 text-champagne-logo" />
          <h1 className="text-2xl font-semibold tracking-tight">Gerador de Link WhatsApp</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Crie um link que abre uma conversa no WhatsApp da Natleva com uma mensagem pronta.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Editor */}
        <Card>
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Mensagem pronta</CardTitle>
            <CardDescription>
              Número de destino fixo · <span className="font-medium text-foreground">{NATLEVA_PHONE_DISPLAY}</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={"Ex: Olá! Vi o anúncio da Natleva e quero saber mais sobre os pacotes para Patagônia ✈️"}
                rows={8}
                className="resize-y pr-12 text-sm leading-relaxed"
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-2 top-2 h-8 w-8 text-muted-foreground hover:text-foreground"
                    aria-label="Inserir emoji"
                  >
                    <Smile className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" side="bottom" className="w-auto p-0 border-none bg-transparent shadow-none">
                  <LazyEmojiPicker
                    onEmojiSelect={handleEmojiSelect}
                    theme="auto"
                    locale="pt"
                    previewPosition="none"
                    skinTonePosition="none"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
              <span>{formatLength(message.length)} caracteres</span>
              {message.length > 0 && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={handleClear}
                  className="h-7 gap-1 text-xs"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpar
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        <Card className="bg-muted/30">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Seu link
            </CardTitle>
            <CardDescription>Quem clicar abre o WhatsApp da Natleva com a mensagem já escrita.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-md border bg-background p-3 font-mono text-xs break-all leading-relaxed">
              {link}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button onClick={handleCopy} className="gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copiado" : "Copiar link"}
              </Button>
              <Button variant="secondary" onClick={handleOpen} className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Abrir teste
              </Button>
              <Button variant="outline" onClick={() => setQrOpen(true)} className="gap-2">
                <QrCode className="h-4 w-4" />
                QR Code
              </Button>
            </div>

            {message.trim() && (
              <div className="rounded-md border border-dashed p-3 space-y-2">
                <div className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <MessageCircle className="h-3.5 w-3.5" />
                  Pré-visualização da mensagem
                </div>
                <div className="whitespace-pre-wrap text-sm leading-relaxed">{message.trim()}</div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>QR Code do link</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="rounded-lg border bg-white p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="QR Code do link de WhatsApp" width={280} height={280} />
            </div>
            <p className="text-xs text-muted-foreground text-center">
              Aponte a câmera do celular para abrir a conversa com a mensagem pronta.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
