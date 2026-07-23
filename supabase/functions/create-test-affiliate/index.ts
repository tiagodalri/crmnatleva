import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const email = "teste@teste.com";
    const password = "teste123";

    let userId: string | null = null;
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: "Afiliado Teste" },
    });
    if (createErr) {
      // maybe already exists — find it
      const { data: list } = await supabase.auth.admin.listUsers();
      const found = list?.users?.find((u) => u.email === email);
      if (!found) throw createErr;
      userId = found.id;
      await supabase.auth.admin.updateUserById(found.id, { password, email_confirm: true });
    } else {
      userId = created.user!.id;
    }

    const { data: existing } = await supabase.from("affiliates").select("id").eq("user_id", userId).maybeSingle();
    if (!existing) {
      const refCode = "TESTE" + Math.floor(Math.random() * 9000 + 1000);
      const { error: affErr } = await supabase.from("affiliates").insert({
        user_id: userId,
        full_name: "Afiliado Teste",
        email,
        status: "approved",
        approved_at: new Date().toISOString(),
        commission_percent: 10,
        total_earned: 0,
        ref_code: refCode,
      });
      if (affErr) throw affErr;
    } else {
      await supabase.from("affiliates").update({ status: "approved", approved_at: new Date().toISOString() }).eq("id", existing.id);
    }

    return new Response(JSON.stringify({ ok: true, email, password, userId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
