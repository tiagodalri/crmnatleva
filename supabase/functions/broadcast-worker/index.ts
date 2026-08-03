// ════════════════════════════════════════════════════════════════
// broadcast-worker · disparo lento de WhatsApp em massa
// ════════════════════════════════════════════════════════════════
// Executado pelo pg_cron a cada ~15s. Cada execução processa NO MÁXIMO
// 1 destinatário por campanha. O pacing real é controlado por
// broadcast_campaigns.next_eligible_send_at.
//
// Envio reutiliza a MESMA integração usada no LiveChat: edge function
// `zapi-proxy` (bypass server-to-server com service-role key).

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const WINDOW_START_HOUR = 8;
const WINDOW_END_HOUR = 20;
const MAX_CONSECUTIVE_FAILURES = 5;
const TZ = "America/Sao_Paulo";

/** Retorna { hour, dateKey } no fuso America/Sao_Paulo. */
function nowInSaoPaulo(): { hour: number; dateKey: string } {
  const now = new Date();
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(now).map((p) => [p.type, p.value]));
  return {
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    dateKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
}

/** Início e fim (UTC ISO) do dia atual no fuso America/Sao_Paulo. */
function saoPauloDayBoundsUtc(): { startIso: string; endIso: string } {
  const { dateKey } = nowInSaoPaulo();
  // GMT-3 fixo (Brasil não usa mais horário de verão)
  const startIso = new Date(`${dateKey}T00:00:00-03:00`).toISOString();
  const endIso = new Date(new Date(startIso).getTime() + 24 * 60 * 60 * 1000).toISOString();
  return { startIso, endIso };
}

function normalizePhone(raw: string): string {
  return String(raw || "").replace(/\D/g, "");
}

/** Chama zapi-proxy · mesma integração do LiveChat. */
async function sendViaZapiProxy(action: string, payload: Record<string, unknown>) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/zapi-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
      "x-internal-call": "broadcast-worker",
    },
    body: JSON.stringify({ action, payload }),
  });
  const data = await res.json().catch(() => ({}));
  const ok = res.ok && data?.error == null;
  return {
    ok,
    externalMessageId: data?.messageId || data?.zaapId || data?.id || null,
    error: ok ? null : String(data?.error || data?.message || `http_${res.status}`).slice(0, 500),
  };
}

/** Decide action + payload conforme mídia da campanha. */
function buildSend(campaign: any, phone: string) {
  const mediaUrl = campaign.media_url as string | null;
  const mediaType = String(campaign.media_type || "").toLowerCase();
  const caption = campaign.caption || campaign.message_text || "";

  if (mediaUrl) {
    if (mediaType.includes("image")) {
      return { action: "send-image", payload: { phone, image: mediaUrl, caption } };
    }
    if (mediaType.includes("video")) {
      return { action: "send-video", payload: { phone, video: mediaUrl, caption } };
    }
    if (mediaType.includes("audio")) {
      return { action: "send-audio", payload: { phone, audio: mediaUrl } };
    }
    const ext = (campaign.media_filename?.split(".").pop() || "pdf").toLowerCase();
    return {
      action: "send-document",
      payload: { phone, document: mediaUrl, extension: ext, fileName: campaign.media_filename || "documento" },
    };
  }
  return { action: "send-text", payload: { phone, message: campaign.message_text || "" } };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const sb = createClient(SUPABASE_URL, SERVICE_ROLE);
  const summary: any[] = [];

  const { hour } = nowInSaoPaulo();
  const insideWindow = hour >= WINDOW_START_HOUR && hour < WINDOW_END_HOUR;

  const { data: campaigns, error: campErr } = await sb
    .from("broadcast_campaigns")
    .select("*")
    .eq("status", "sending")
    .order("started_at", { ascending: true });

  if (campErr) {
    console.error("[broadcast-worker] campaign fetch error", campErr);
    return new Response(JSON.stringify({ error: campErr.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  for (const campaign of campaigns || []) {
    // (a) Janela permitida 08:00–20:00 America/Sao_Paulo
    if (!insideWindow) {
      summary.push({ campaign: campaign.id, skipped: "outside_window", hour });
      continue;
    }

    // (b) Throttle
    if (campaign.next_eligible_send_at && new Date(campaign.next_eligible_send_at) > new Date()) {
      summary.push({ campaign: campaign.id, skipped: "throttled" });
      continue;
    }

    // (c) Limite diário
    const { startIso, endIso } = saoPauloDayBoundsUtc();
    const { count: sentToday } = await sb
      .from("broadcast_recipients")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign.id)
      .gte("sent_at", startIso)
      .lt("sent_at", endIso);

    if ((sentToday ?? 0) >= campaign.daily_limit) {
      await sb.from("broadcast_campaigns").update({
        status: "paused",
        paused_reason: "daily_limit_reached",
      }).eq("id", campaign.id);
      summary.push({ campaign: campaign.id, paused: "daily_limit_reached", sentToday });
      continue;
    }

    // (d) Próximo destinatário pendente
    const { data: recipients } = await sb
      .from("broadcast_recipients")
      .select("*")
      .eq("campaign_id", campaign.id)
      .eq("status", "pending")
      .order("order_index", { ascending: true, nullsFirst: true })
      .order("created_at", { ascending: true })
      .limit(1);

    const recipient = recipients?.[0];
    if (!recipient) {
      await sb.from("broadcast_campaigns").update({
        status: "completed",
        completed_at: new Date().toISOString(),
      }).eq("id", campaign.id);
      summary.push({ campaign: campaign.id, completed: true });
      continue;
    }

    const phoneDigits = normalizePhone(recipient.phone);

    // (e) Revalida opt-out
    const { data: optouts } = await sb.from("whatsapp_optouts").select("phone");
    const optedOut = (optouts || []).some((o: any) => normalizePhone(o.phone) === phoneDigits);
    if (optedOut) {
      await sb.from("broadcast_recipients").update({
        status: "skipped_optout",
        error_message: "Telefone em whatsapp_optouts",
      }).eq("id", recipient.id);
      summary.push({ campaign: campaign.id, recipient: recipient.id, skipped: "optout" });
      continue;
    }

    // (f) Envia
    await sb.from("broadcast_recipients").update({ status: "sending" }).eq("id", recipient.id);
    const { action, payload } = buildSend(campaign, phoneDigits);
    const result = await sendViaZapiProxy(action, payload);

    // (i) Próximo horário elegível · aleatório dentro do throttle da campanha
    const minS = Math.max(1, campaign.throttle_min_seconds ?? 15);
    const maxS = Math.max(minS, campaign.throttle_max_seconds ?? 30);
    const delayS = minS + Math.floor(Math.random() * (maxS - minS + 1));
    const nextEligible = new Date(Date.now() + delayS * 1000).toISOString();

    if (result.ok) {
      // (g) Sucesso
      await sb.from("broadcast_recipients").update({
        status: "sent",
        sent_at: new Date().toISOString(),
        external_message_id: result.externalMessageId,
        error_message: null,
      }).eq("id", recipient.id);

      await sb.from("broadcast_campaigns").update({
        total_sent: (campaign.total_sent ?? 0) + 1,
        consecutive_failures: 0,
        next_eligible_send_at: nextEligible,
      }).eq("id", campaign.id);

      summary.push({ campaign: campaign.id, recipient: recipient.id, sent: true, nextEligible });
    } else {
      // (h) Falha
      const failures = (campaign.consecutive_failures ?? 0) + 1;
      await sb.from("broadcast_recipients").update({
        status: "failed",
        error_message: result.error,
      }).eq("id", recipient.id);

      const update: Record<string, unknown> = {
        total_failed: (campaign.total_failed ?? 0) + 1,
        consecutive_failures: failures,
        next_eligible_send_at: nextEligible,
      };
      if (failures >= MAX_CONSECUTIVE_FAILURES) {
        update.status = "paused";
        update.paused_reason = "falhas_consecutivas";
      }
      await sb.from("broadcast_campaigns").update(update).eq("id", campaign.id);

      summary.push({ campaign: campaign.id, recipient: recipient.id, failed: result.error, failures });
    }
  }

  return new Response(JSON.stringify({ ok: true, processed: summary.length, summary }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
