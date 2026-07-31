import { forwardRef, useEffect, useRef, useState, type ChangeEvent, type FocusEvent } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

/**
 * BufferedInput / BufferedTextarea
 * ─────────────────────────────────────────────────────────────
 * Inputs de digitação desacoplados do re-render pesado do editor.
 *
 * Problema: no ProposalEditor cada tecla disparava setState no topo da
 * árvore (form/items) e o re-render completo (todos os itens, preview,
 * cards) levava centenas de ms. Em React, um input controlado cujo
 * `value` chega atrasado pode "engolir" caracteres · o usuário digitava
 * e a letra desaparecia.
 *
 * Solução: o valor exibido vem de um estado LOCAL (atualiza a cada tecla,
 * render mínimo) e o `onChange` do pai é chamado com debounce curto.
 * Nada é perdido: qualquer valor pendente é comitado no blur, no unmount
 * e quando a aba é escondida.
 */

const COMMIT_DELAY = 220;

function useBuffer<T extends HTMLInputElement | HTMLTextAreaElement>(
  value: string | number | undefined,
  onChange?: (e: ChangeEvent<T>) => void,
) {
  const external = value === undefined || value === null ? "" : String(value);
  const [local, setLocal] = useState(external);
  const focusedRef = useRef(false);
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const nodeRef = useRef<T | null>(null);

  // Sincroniza com o valor externo apenas quando não há digitação em curso.
  useEffect(() => {
    if (focusedRef.current || pendingRef.current !== null) return;
    setLocal(external);
  }, [external]);

  const commit = (next: string) => {
    pendingRef.current = null;
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const fn = onChangeRef.current;
    if (!fn) return;
    const node = nodeRef.current;
    fn({
      target: node ?? ({ value: next } as unknown as T),
      currentTarget: node ?? ({ value: next } as unknown as T),
    } as unknown as ChangeEvent<T>);
  };

  const flush = () => {
    if (pendingRef.current !== null) commit(pendingRef.current);
  };

  // Flush garantido em unmount e quando a aba sai de foco.
  useEffect(() => {
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", flush);
      flush();
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: ChangeEvent<T>) => {
    const next = e.target.value;
    setLocal(next);
    pendingRef.current = next;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => commit(next), COMMIT_DELAY);
  };

  const handleFocus = () => { focusedRef.current = true; };
  const handleBlur = () => {
    focusedRef.current = false;
    flush();
  };

  return { local, handleChange, handleFocus, handleBlur, nodeRef };
}

type InputProps = React.ComponentPropsWithoutRef<typeof Input>;

export const BufferedInput = forwardRef<HTMLInputElement, InputProps>(function BufferedInput(
  { value, onChange, onFocus, onBlur, ...rest },
  ref,
) {
  const { local, handleChange, handleFocus, handleBlur, nodeRef } = useBuffer<HTMLInputElement>(
    value as string | number | undefined,
    onChange,
  );

  return (
    <Input
      {...rest}
      ref={(node) => {
        nodeRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLInputElement | null>).current = node;
      }}
      value={local}
      onChange={handleChange}
      onFocus={(e: FocusEvent<HTMLInputElement>) => { handleFocus(); onFocus?.(e); }}
      onBlur={(e: FocusEvent<HTMLInputElement>) => { handleBlur(); onBlur?.(e); }}
    />
  );
});

type TextareaProps = React.ComponentPropsWithoutRef<typeof Textarea>;

export const BufferedTextarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function BufferedTextarea(
  { value, onChange, onFocus, onBlur, ...rest },
  ref,
) {
  const { local, handleChange, handleFocus, handleBlur, nodeRef } = useBuffer<HTMLTextAreaElement>(
    value as string | number | undefined,
    onChange,
  );

  return (
    <Textarea
      {...rest}
      ref={(node) => {
        nodeRef.current = node;
        if (typeof ref === "function") ref(node);
        else if (ref) (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }}
      value={local}
      onChange={handleChange}
      onFocus={(e: FocusEvent<HTMLTextAreaElement>) => { handleFocus(); onFocus?.(e); }}
      onBlur={(e: FocusEvent<HTMLTextAreaElement>) => { handleBlur(); onBlur?.(e); }}
    />
  );
});
