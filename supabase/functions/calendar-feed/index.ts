// Feed iCal público com as viagens dos clientes (voos, embarque/retorno, hotel).
// Assinado no app Calendário do iPhone (webcal://). O token na URL é o segredo.

import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCalendar, type FeedClient, type FeedSale, type FeedSegment } from "./ics.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const APP_URL = "https://adm.natleva.com";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
};

const SALE_COLUMNS =
  "id, display_id, name, client_id, status, departure_date, return_date, origin_iata, destination_iata, locators, hotel_name, hotel_city, hotel_address, hotel_checkin_date, hotel_checkout_date, hotel_reservation_code, updated_at";

const SEGMENT_COLUMNS =
  "id, sale_id, direction, segment_order, airline, flight_number, origin_iata, destination_iata, departure_date, departure_time, arrival_time, duration_minutes, flight_class, terminal";

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const token = url.searchParams.get("token")?.trim();
  if (!token || !/^[A-Za-z0-9_-]{16,128}$/.test(token)) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  const { data: feed } = await supabase
    .from("calendar_feed_tokens")
    .select("id, revoked_at")
    .eq("token", token)
    .maybeSingle();

  if (!feed || feed.revoked_at) {
    return new Response("Unauthorized", { status: 401, headers: corsHeaders });
  }

  supabase
    .from("calendar_feed_tokens")
    .update({ last_accessed_at: new Date().toISOString() })
    .eq("id", feed.id)
    .then(() => {}, () => {});

  try {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    // Vendas com ida, volta ou hotel a partir de 30 dias atrás
    const { data: salesByDate, error: salesErr } = await supabase
      .from("sales")
      .select(SALE_COLUMNS)
      .is("deleted_at", null)
      .neq("status", "Cancelado")
      .or(`departure_date.gte.${cutoff},return_date.gte.${cutoff},hotel_checkout_date.gte.${cutoff}`)
      .limit(5000);
    if (salesErr) throw salesErr;

    // Trechos de voo a partir de 30 dias atrás (inclui vendas sem data de ida/volta preenchida)
    const { data: recentSegments, error: segErr } = await supabase
      .from("flight_segments")
      .select(SEGMENT_COLUMNS)
      .gte("departure_date", cutoff)
      .limit(5000);
    if (segErr) throw segErr;

    const salesMap = new Map<string, FeedSale>();
    for (const s of (salesByDate ?? []) as FeedSale[]) salesMap.set(s.id, s);

    const missingIds = [...new Set((recentSegments ?? []).map((s) => s.sale_id as string))]
      .filter((id) => !salesMap.has(id));
    for (const ids of chunk(missingIds, 100)) {
      const { data, error } = await supabase
        .from("sales")
        .select(SALE_COLUMNS)
        .in("id", ids)
        .is("deleted_at", null)
        .neq("status", "Cancelado");
      if (error) throw error;
      for (const s of (data ?? []) as FeedSale[]) salesMap.set(s.id, s);
    }

    const sales = [...salesMap.values()];
    const saleIds = sales.map((s) => s.id);

    // Todos os trechos dessas vendas (para montar a rota de ida/volta)
    const segments: FeedSegment[] = [];
    const clients: Record<string, FeedClient> = {};
    const passengers: Record<string, string[]> = {};

    for (const ids of chunk(saleIds, 100)) {
      const [segRes, paxRes] = await Promise.all([
        supabase.from("flight_segments").select(SEGMENT_COLUMNS).in("sale_id", ids),
        supabase.from("sale_passengers").select("sale_id, passengers(full_name)").in("sale_id", ids),
      ]);
      if (segRes.error) throw segRes.error;
      if (paxRes.error) throw paxRes.error;
      segments.push(...((segRes.data ?? []) as FeedSegment[]));
      for (const row of (paxRes.data ?? []) as unknown as { sale_id: string; passengers: { full_name: string } | null }[]) {
        const name = row.passengers?.full_name?.trim();
        if (!name) continue;
        (passengers[row.sale_id] ??= []).push(name);
      }
    }

    const clientIds = [...new Set(sales.map((s) => s.client_id).filter(Boolean) as string[])];
    for (const ids of chunk(clientIds, 100)) {
      const { data, error } = await supabase.from("clients").select("id, display_name, phone").in("id", ids);
      if (error) throw error;
      for (const c of data ?? []) clients[c.id as string] = { display_name: c.display_name, phone: c.phone };
    }

    const body = buildCalendar({
      calName: "NatLeva – Viagens",
      appUrl: APP_URL,
      sales,
      segments,
      clients,
      passengers,
    });

    const headers = {
      ...corsHeaders,
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="natleva-viagens.ics"',
      "Cache-Control": "no-cache",
    };
    if (req.method === "HEAD") return new Response(null, { status: 200, headers });
    return new Response(body, { status: 200, headers });
  } catch (err) {
    console.error("[calendar-feed] erro:", err);
    return new Response("Server error", { status: 500, headers: corsHeaders });
  }
});
