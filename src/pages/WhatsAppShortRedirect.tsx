import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";
import { DEFAULT_AGENCY_WHATSAPP } from "@/lib/natleva/whatsapp";

/**
 * Página pública de redirecionamento dos links curtos gerados
 * na tela Operação > Gerador de Link WhatsApp.
 *
 * Fluxo:
 *   1. Lê :shortCode
 *   2. Busca full_wa_url na tabela whatsapp_short_links (leitura anon)
 *   3. Registra clique fire-and-forget em whatsapp_short_link_clicks
 *   4. window.location.replace() pro WhatsApp
 */
export default function WhatsAppShortRedirect() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!shortCode) {
      setNotFound(true);
      return;
    }

    (async () => {
      const { data, error } = await supabase
        .from("whatsapp_short_links")
        .select("id, full_wa_url, is_active")
        .eq("short_code", shortCode)
        .maybeSingle();

      if (cancelled) return;

      if (error || !data || !data.is_active || !data.full_wa_url) {
        setNotFound(true);
        return;
      }

      // Fire-and-forget: não bloqueia o redirect
      void supabase.from("whatsapp_short_link_clicks").insert({
        short_link_id: data.id,
        user_agent: navigator.userAgent.slice(0, 500),
        referrer: (document.referrer || "").slice(0, 500) || null,
      });

      window.location.replace(data.full_wa_url);
    })();

    return () => {
      cancelled = true;
    };
  }, [shortCode]);

  if (notFound) {
    const fallback = `https://wa.me/${DEFAULT_AGENCY_WHATSAPP}`;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <AlertTriangle className="w-10 h-10 text-muted-foreground mx-auto" />
          <h1 className="text-xl font-semibold">Link inválido ou expirado</h1>
          <p className="text-sm text-muted-foreground">
            Esse link curto não está mais ativo. Você pode falar direto com a gente pelo WhatsApp.
          </p>
          <a
            href={fallback}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Abrir WhatsApp da Natleva
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Redirecionando pro WhatsApp...</p>
      </div>
    </div>
  );
}
