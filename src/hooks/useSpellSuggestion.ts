import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Debounced, non-blocking spell/grammar suggestion for the message composer.
 * · Waits ~800ms of idle typing before calling `correct-message`.
 * · Never blocks send · consumer keeps writing/sending freely.
 * · Invalidates stale responses via monotonically increasing reqId.
 * · Skips very short text, slash commands, and text already sent.
 */
export function useSpellSuggestion(text: string, opts?: { minLength?: number; debounceMs?: number }) {
  const minLength = opts?.minLength ?? 8;
  const debounceMs = opts?.debounceMs ?? 800;

  const [suggestion, setSuggestion] = useState<string | null>(null);
  const reqIdRef = useRef(0);
  const lastRequestedRef = useRef<string>("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear stale suggestion whenever the text diverges from what it was based on.
  useEffect(() => {
    if (suggestion !== null && text !== lastRequestedRef.current) {
      setSuggestion(null);
    }
  }, [text, suggestion]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const trimmed = text.trim();
    if (!trimmed || trimmed.length < minLength) return;
    if (trimmed.startsWith("/")) return;
    // Skip URLs-only / mostly non-letter content
    if (!/[a-zA-ZáéíóúâêôãõçÁÉÍÓÚÂÊÔÃÕÇ]/.test(trimmed)) return;

    timerRef.current = setTimeout(async () => {
      const myReq = ++reqIdRef.current;
      const requestedText = text;
      lastRequestedRef.current = requestedText;
      try {
        const { data, error } = await supabase.functions.invoke("correct-message", {
          body: { text: requestedText },
        });
        if (error) return;
        // Discard if a newer request has been fired or the text has changed since.
        if (myReq !== reqIdRef.current) return;
        const corrected = (data as any)?.corrected;
        if (typeof corrected !== "string") return;
        if (!corrected.trim() || corrected.trim() === requestedText.trim()) {
          setSuggestion(null);
          return;
        }
        setSuggestion(corrected);
      } catch {
        // silent · never block composer
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, minLength, debounceMs]);

  const dismiss = useCallback(() => {
    reqIdRef.current++; // invalidate any pending response
    setSuggestion(null);
  }, []);

  return { suggestion, dismissSuggestion: dismiss };
}
