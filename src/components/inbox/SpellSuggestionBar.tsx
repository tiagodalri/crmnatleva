import { Sparkles, Check, X } from "lucide-react";

interface SpellSuggestionBarProps {
  suggestion: string;
  onAccept: () => void;
  onDismiss: () => void;
  /**
   * "typing"      · legacy live suggestion (Tab para aceitar, X para descartar)
   * "sendConfirm" · shown when the user hits Send. Accept = envia corrigido, Dismiss = envia original.
   */
  variant?: "typing" | "sendConfirm";
}

export function SpellSuggestionBar({ suggestion, onAccept, onDismiss, variant = "typing" }: SpellSuggestionBarProps) {
  const isSend = variant === "sendConfirm";
  const header = isSend
    ? "Correção sugerida · revise antes de enviar"
    : "Sugestão · pressione Tab para aceitar";

  return (
    <div className="mb-1.5 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="flex items-start gap-2">
        <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
            {header}
          </div>
          <button
            type="button"
            onClick={onAccept}
            className="block w-full text-left text-foreground/90 leading-snug hover:text-foreground break-words"
            title="Aceitar sugestão"
          >
            {suggestion}
          </button>
          {isSend && (
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onAccept}
                className="inline-flex items-center gap-1 rounded-md bg-primary text-primary-foreground px-2.5 py-1 text-[11px] font-medium hover:opacity-90 transition"
              >
                <Check className="h-3 w-3" /> Corrigir e enviar
              </button>
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:bg-foreground/5 transition"
              >
                Enviar como está
              </button>
            </div>
          )}
        </div>
        {!isSend && (
          <>
            <button
              type="button"
              onClick={onAccept}
              className="h-6 w-6 shrink-0 rounded-md flex items-center justify-center hover:bg-primary/10 text-primary transition-colors"
              aria-label="Aceitar sugestão"
              title="Aceitar (Tab)"
            >
              <Check className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={onDismiss}
              className="h-6 w-6 shrink-0 rounded-md flex items-center justify-center hover:bg-foreground/5 text-muted-foreground transition-colors"
              aria-label="Descartar sugestão"
              title="Descartar (Esc)"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
