import { supabase } from "@/integrations/supabase/client";
import { FAILURE_REASONS, classifySendOutcome } from "@/lib/zapiFailureClassifier";

// Força refresh + Authorization explícito para evitar 401 em sessões expirando.
export async function getFreshAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;
  const expiresAt = (session.expires_at ?? 0) * 1000;
  if (expiresAt - Date.now() < 60_000) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    return refreshed?.session?.access_token ?? session.access_token;
  }
  return session.access_token;
}

export async function invokeZapiProxy(action: string, payload?: any) {
  const token = await getFreshAccessToken();
  if (!token) throw new Error("Sessão expirada · faça login novamente");
  return supabase.functions.invoke("zapi-proxy", {
    body: { action, payload },
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function callZapiProxy(action: string, payload?: any) {
  const { data, error } = await invokeZapiProxy(action, payload);
  if (error) throw new Error(error.message || "Erro na chamada Z-API");
  return data;
}

// Wrapper local que mantém a assinatura usada nos sites de envio.
export async function sendViaZapi(
  action: string,
  payload: any
): Promise<{ ok: boolean; reason: string | null; detail?: string; data: any }> {
  try {
    const { data, error } = await invokeZapiProxy(action, payload);
    const outcome = classifySendOutcome(error, data);
    return { ...outcome, data };
  } catch (err: any) {
    return { ok: false, reason: FAILURE_REASONS.TEMPORARY, detail: err?.message || "exception", data: null };
  }
}
