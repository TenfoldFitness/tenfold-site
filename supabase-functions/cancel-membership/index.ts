// Supabase Edge Function: cancel-membership
// Deploy the same way as the others: name it exactly "cancel-membership". Leave "Verify JWT" ON.
//
// Lets a signed-in client cancel their own monthly plan (Foundation or Guided) from the portal,
// or undo that before the paid month runs out.
//
// How cancelling works, using only columns the memberships table already has:
//  - The client has already paid up to next_billing_date. So cancelling moves that date into
//    expires_at and clears next_billing_date.
//  - charge-monthly-memberships only charges rows where next_billing_date has arrived. A cleared
//    date is never matched, so no further charge is made. That function needs no change.
//  - The portal and Plate Count already end access when expires_at passes, so the client keeps
//    what they paid for and loses access on the day the next charge would have been.
//  - "resume" is the exact reverse: expires_at goes back into next_billing_date.
//
// Who is being cancelled comes from the signed-in session, never from the request body, so one
// client cannot cancel another's plan. No Square call is made and no secret other than the
// standard Supabase ones is needed.
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function reply(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // 1. Who is asking. A publishable key is not a user session; getUser fails for it.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    const email = userData?.user?.email;
    if (userError || !email) return reply({ error: "Please log in again." }, 401);

    const { action } = await req.json().catch(() => ({}));
    if (action !== "cancel" && action !== "resume") return reply({ error: "Unknown action." }, 400);

    // 2. Their monthly plans that are still switched on
    const { data: rows, error: lookupError } = await supabaseAdmin
      .from("memberships")
      .select("id, tier, next_billing_date, expires_at")
      .eq("client_email", email)
      .eq("status", "active")
      .in("tier", [1, 2])
      .order("started_at", { ascending: false });
    if (lookupError) {
      console.error("cancel-membership lookup failed:", lookupError);
      return reply({ error: "Could not look up your plan." }, 500);
    }

    const now = Date.now();
    const live = (rows || []).filter((r) => !r.expires_at || new Date(r.expires_at).getTime() > now);
    const billing = live.filter((r) => r.next_billing_date);                       // will be charged again
    const ending = live.filter((r) => !r.next_billing_date && r.expires_at);       // already cancelled, still paid up

    if (action === "cancel") {
      if (!billing.length) {
        if (ending.length) return reply({ success: true, state: "cancelled", accessUntil: ending[0].expires_at, tier: ending[0].tier });
        return reply({ error: "There is no monthly plan to cancel on this account." }, 404);
      }
      let accessUntil = null, tier = null;
      for (const row of billing) {
        // Never set an end date in the past: if a charge was due today, access simply ends now.
        const until = new Date(Math.max(new Date(row.next_billing_date).getTime(), now)).toISOString();
        const { data: changed, error } = await supabaseAdmin
          .from("memberships")
          .update({ expires_at: until, next_billing_date: null })
          .eq("id", row.id)
          .eq("status", "active")
          .select("id");
        if (error || !changed || !changed.length) {
          console.error("cancel-membership update failed:", email, row.id, error);
          return reply({ error: "Could not cancel. Nothing was changed." }, 500);
        }
        if (!accessUntil || until > accessUntil) { accessUntil = until; tier = row.tier; }
      }
      console.log("membership cancelled:", email, "access until", accessUntil);
      return reply({ success: true, state: "cancelled", accessUntil, tier });
    }

    // action === "resume"
    if (!ending.length) {
      if (billing.length) return reply({ success: true, state: "active", nextBillingDate: billing[0].next_billing_date, tier: billing[0].tier });
      return reply({ error: "There is no cancelled plan to keep on this account." }, 404);
    }
    const row = ending[0];
    const { data: changed, error } = await supabaseAdmin
      .from("memberships")
      .update({ next_billing_date: row.expires_at, expires_at: null })
      .eq("id", row.id)
      .eq("status", "active")
      .select("id");
    if (error || !changed || !changed.length) {
      console.error("cancel-membership resume failed:", email, row.id, error);
      return reply({ error: "Could not keep your plan. Nothing was changed." }, 500);
    }
    console.log("membership resumed:", email, "next charge", row.expires_at);
    return reply({ success: true, state: "active", nextBillingDate: row.expires_at, tier: row.tier });
  } catch (err) {
    console.error("cancel-membership error:", err);
    return reply({ error: "Something went wrong." }, 500);
  }
});
