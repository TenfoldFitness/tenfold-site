// Supabase Edge Function: unsubscribe
// Name it exactly "unsubscribe". In its Settings, turn "Verify JWT" OFF:
// people click this link from an email, so there is no login to check.
//
// Link format: https://<project>.supabase.co/functions/v1/unsubscribe?token=<unsubscribe_token>
// Stops all follow-up emails to that address, then sends the person to a plain
// "you are unsubscribed" page on the website. The same answer is given for an
// unknown token, so the link cannot be used to find out who is on the list.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://tenfoldframework.com";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

serve(async (req) => {
  const url = new URL(req.url);
  const token = (url.searchParams.get("token") || "").trim();

  if (UUID.test(token)) {
    const { data: lead } = await supabaseAdmin
      .from("leads").select("email").eq("unsubscribe_token", token).maybeSingle();
    if (lead && lead.email) {
      // Every lead row for this address, so one click stops everything.
      await supabaseAdmin
        .from("leads")
        .update({ unsubscribed_at: new Date().toISOString() })
        .eq("email", lead.email)
        .is("unsubscribed_at", null);
    }
  }

  // Mail apps that support one-click unsubscribe send a POST and expect a plain 200.
  if (req.method === "POST") return new Response("Unsubscribed.", { status: 200 });

  return new Response(null, { status: 302, headers: { Location: SITE + "/unsubscribed.html" } });
});
