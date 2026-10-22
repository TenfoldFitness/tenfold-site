// Supabase Edge Function: notify-coach-message
// Deploy it the same way as the others: name it exactly "notify-coach-message" and leave "Verify JWT" ON.
//
// A Plate Count client sends a question from the app, then the app calls this function.
// It emails the question to the trainer (you). It never trusts text from the request: it signs in as the
// caller, reads that caller's own newest question from the database, and emails that.
//
// Required secret (already set): RESEND_API_KEY. SUPABASE_URL and SUPABASE_ANON_KEY are provided automatically.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TRAINER_EMAIL = "tenfoldfunctional@gmail.com";
const FROM_ADDRESS = "Plate Count <hello@tenfoldframework.com>";
const DASHBOARD_URL = "https://tenfoldframework.com/admin-dashboard.html";

const esc = (s: string) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    });
    const { data: u } = await sb.auth.getUser();
    if (!u?.user) return json({ error: "Not signed in." }, 401);

    // Newest question from this user (row-level security limits this to their own rows).
    const { data: msgs } = await sb.from("plate_messages").select("body,created_at")
      .eq("user_id", u.user.id).eq("from_coach", false).order("created_at", { ascending: false }).limit(1);
    const m = msgs?.[0];
    if (!m || Date.now() - Date.parse(m.created_at) > 2 * 60 * 1000) return json({ sent: false });

    const { data: prof } = await sb.from("plate_profile").select("data").eq("user_id", u.user.id).maybeSingle();
    const name = prof?.data?.name || u.user.email || "A client";

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: [TRAINER_EMAIL],
        subject: `New question from ${name} in Plate Count`,
        html: `<p><b>${esc(name)}</b> asked in Plate Count:</p>
               <blockquote style="margin:12px 0;padding:10px 14px;background:#f4f0e6;border-radius:8px;white-space:pre-wrap">${esc(m.body)}</blockquote>
               <p><a href="${DASHBOARD_URL}">Open your dashboard to reply</a> (Plate Count clients section).</p>`,
      }),
    });
    return json({ sent: res.ok });
  } catch (e) {
    return json({ error: "Could not send the notification." }, 500);
  }
});
