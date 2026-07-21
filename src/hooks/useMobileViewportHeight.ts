import { useEffect } from "react";

/**
 * Mantém a CSS var `--app-vh` sincronizada com a altura REAL do visual viewport
 * (considera o teclado virtual no iOS/Android) e trava o scroll do documento
 * para impedir que o iOS "empurre" a página quando o teclado aparece.
 *
 * Uso no CSS: `height: var(--app-vh, 100dvh)` ou classe `h-app-vh`.
 *
 * DESIGN (v2 · anti-jitter):
 *  · SÓ atualiza --app-vh em `visualViewport.resize` (evento discreto quando o
 *    teclado abre/fecha). Ignoramos `visualViewport.scroll` porque ele dispara
 *    a cada frame de animação e de pan do usuário, causando thrashing no
 *    ResizeObserver do chat (bug: "tela sobe sozinha ao focar o input").
 *  · NÃO reescrevemos `window.scrollTo(0,0)` em cada scroll: com o body em
 *    `position:fixed;top:0` o window já não pode rolar; qualquer write extra
 *    briga com o auto-scroll-into-view nativo do teclado.
 *  · NÃO usamos `focusin` para re-clampar: o browser faz o certo com
 *    `interactive-widget=resizes-content` (Android) e o lock do body basta pra
 *    iOS. Handlers extras aqui criam o loop "sobe · desce · sobe".
 *  · Debounce por rAF: mesmo que o vv.resize dispare em rajada, escrevemos
 *    --app-vh uma vez por frame, no máximo.
 */
export function useMobileViewportHeight(enabled: boolean) {
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;

    const root = document.documentElement;
    const body = document.body;

    // ── Lock document scroll: impede iOS de rolar a página quando o teclado
    //    abre. Necessário porque nem todo iOS respeita interactive-widget.
    const prev = {
      htmlOverflow: root.style.overflow,
      htmlHeight: root.style.height,
      htmlPosition: root.style.position,
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyWidth: body.style.width,
      bodyHeight: body.style.height,
      bodyTop: body.style.top,
      bodyOverscroll: (body.style as any).overscrollBehavior,
    };

    root.style.overflow = "hidden";
    root.style.height = "100%";
    root.style.position = "relative";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = "0";
    body.style.width = "100%";
    body.style.height = "100%";
    (body.style as any).overscrollBehavior = "none";

    let rafId: number | null = null;
    let lastAppliedH = 0;

    const applyHeight = () => {
      rafId = null;
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      // Snap para inteiro para evitar mudanças de sub-pixel (que fazem o
      // ResizeObserver do chat disparar sem motivo).
      const snapped = Math.round(h);
      if (snapped === lastAppliedH) return;
      lastAppliedH = snapped;
      root.style.setProperty("--app-vh", `${snapped}px`);
    };

    const scheduleApply = () => {
      if (rafId != null) return;
      rafId = requestAnimationFrame(applyHeight);
    };

    // Aplica uma vez no boot.
    applyHeight();

    const vv = window.visualViewport;
    if (vv) {
      // SÓ resize · NÃO scroll. O evento scroll do vv fica intocado.
      vv.addEventListener("resize", scheduleApply);
    } else {
      window.addEventListener("resize", scheduleApply);
    }

    return () => {
      if (rafId != null) cancelAnimationFrame(rafId);
      if (vv) vv.removeEventListener("resize", scheduleApply);
      else window.removeEventListener("resize", scheduleApply);
      root.style.overflow = prev.htmlOverflow;
      root.style.height = prev.htmlHeight;
      root.style.position = prev.htmlPosition;
      body.style.overflow = prev.bodyOverflow;
      body.style.position = prev.bodyPosition;
      body.style.top = prev.bodyTop;
      body.style.width = prev.bodyWidth;
      body.style.height = prev.bodyHeight;
      (body.style as any).overscrollBehavior = prev.bodyOverscroll;
      root.style.removeProperty("--app-vh");
    };
  }, [enabled]);
}
