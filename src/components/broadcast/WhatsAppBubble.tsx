import { FileText, Headphones, Image as ImageIcon } from "lucide-react";
import type { BroadcastMedia } from "./types";

interface Props {
  message: string;
  media?: BroadcastMedia | null;
}

/**
 * Réplica visual de um balão de WhatsApp (mensagem enviada pela empresa),
 * usada como preview fiel do que o contato vai receber.
 */
export default function WhatsAppBubble({ message, media }: Props) {
  const hasContent = !!message.trim() || !!media;

  return (
    <div className="rounded-xl border border-border bg-[#0b141a] p-4">
      <div
        className="rounded-lg p-3 min-h-[220px] flex flex-col justify-end gap-2"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.07), transparent 45%), radial-gradient(circle at 80% 70%, hsl(var(--primary) / 0.05), transparent 40%)",
        }}
      >
        {!hasContent ? (
          <p className="text-xs text-muted-foreground text-center py-10">
            Escreva a mensagem para visualizar o balão
          </p>
        ) : (
          <div className="self-end max-w-[85%] rounded-2xl rounded-br-sm bg-[#005c4b] px-3 py-2 shadow-lg">
            {media?.type === "image" && (
              <img
                src={media.url}
                alt={media.filename}
                className="mb-2 w-full max-h-56 rounded-lg object-cover"
                loading="lazy"
              />
            )}

            {media?.type === "audio" && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
                <Headphones className="h-4 w-4 text-emerald-100 shrink-0" />
                <div className="h-1.5 flex-1 rounded-full bg-emerald-100/30">
                  <div className="h-full w-1/3 rounded-full bg-emerald-100/80" />
                </div>
                <span className="text-[10px] text-emerald-100/80">áudio</span>
              </div>
            )}

            {media?.type === "document" && (
              <div className="mb-2 flex items-center gap-2 rounded-lg bg-black/20 px-3 py-2">
                <FileText className="h-4 w-4 text-emerald-100 shrink-0" />
                <span className="text-[11px] text-emerald-100 break-all line-clamp-2">
                  {media.filename}
                </span>
              </div>
            )}

            <p className="whitespace-pre-wrap break-words text-[13px] leading-relaxed text-[#e9edef]">
              {message.trim() || (media ? "" : "")}
            </p>

            <div className="mt-1 flex items-center justify-end gap-1">
              <span className="text-[10px] text-[#e9edef]/60">
                {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </span>
              <svg viewBox="0 0 16 15" className="h-3 w-3 fill-sky-300">
                <path d="M10.91 3.316l-.478-.372a.365.365 0 00-.51.063l-4.61 5.788-1.83-1.84a.361.361 0 00-.51 0l-.42.42a.36.36 0 000 .512l2.61 2.61c.14.14.36.13.49-.02l5.28-6.63a.366.366 0 00-.02-.53z" />
                <path d="M15.01 3.316l-.478-.372a.365.365 0 00-.51.063l-4.61 5.788-.36-.36-.71.71 1.14 1.14c.14.14.36.13.49-.02l5.06-6.42a.366.366 0 00-.02-.53z" />
              </svg>

            </div>
          </div>
        )}
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ImageIcon className="h-3 w-3" />
        Prévia aproximada · a renderização final depende do aparelho do contato
      </p>
    </div>
  );
}
