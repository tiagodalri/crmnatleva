import { Sparkles, Check, X } from "lucide-react";

interface SpellSuggestionBarProps {
  suggestion: string;
  onAccept: () => void;
  onDismiss: () => void;
}

/**
 * Discreet, non-intrusive spell suggestion shown above the composer.
 * Click the whole bar (or press Tab in the textarea) to accept.
 */
export function SpellSuggestionBar({ suggestion, onAccept, onDismiss }: SpellSuggestionBarProps) {
  return (
    <div className="mb-1.5 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1.5 text-xs animate-in fade-in slide-in-from-bottom-1 duration-200">
      <Sparkles className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-0.5">
          Sugestão · pressione Tab para aceitar
        </div>
        <button
          type="button"
          onClick={onAccept}
          className="block w-full text-left text-foreground/90 leading-snug hover:text-foreground break-words"
          title="Aceitar sugestão"
        >
          {suggestion}
        </button>
      </div>
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
    </div>
  );
}
