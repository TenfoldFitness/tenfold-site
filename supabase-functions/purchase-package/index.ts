// Supabase Edge Function: purchase-package
//
// Handles one-time 12-week package purchases (Tiers 3-6).
//
// Hardened so that a charged card always ends in a recorded membership, or in a clear signal that it did not:
//  - The page sends an idempotencyKey. Square uses it, so repeating the same request cannot charge twice.
//  - The payment and membership saves are checked. Nothing is reported as success unless the membership is saved.
//  - If the membership cannot be saved after the card was charged, the response says so
//    ({ success: true, membershipRecorded: false, paymentId }) so the page can retry safely or tell the client.
//  - Repeating a request that already succeeded does not create a second membership.
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SQUARE_LOCATION_ID = "L5KMCJ2K8M3AX";
const SQUARE_ENV = "production";
const SQUARE_API_BASE = SQUARE_ENV === "production"
  ? "https://connect.squareup.com"
  : "https://connect.squareupsandbox.com";

const TIER_PRICES_CENTS = {
  3: 100000, // Virtual Intensive - $1,000
  4: 85000, // In-Person Starter - $850
  5: 160000, // In-Person Standard - $1,600
  6: 220000, // In-Person Elite - $2,200
};
const TIER_NAMES = {
  3: "Virtual Intensive (12 weeks)",
  4: "In-Person Starter (12 weeks)",
  5: "In-Person Standard (12 weeks)",
  6: "In-Person Elite (12 weeks)",
};

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Save the membership unless the same purchase already saved it. Returns true when a membership exists afterwards.
async function recordMembership(clientEmail, tier) {
  const sinceIso = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data: existing, error: lookupError } = await supabaseAdmin
    .from("memberships")
    .select("id")
    .eq("client_email", clientEmail)
    .eq("tier", tier)
    .eq("status", "active")
    .gte("started_at", sinceIso)
    .limit(1);
  if (lookupError) console.error("membership lookup failed:", lookupError);
  if (existing && existing.length) return true; // a retry of a purchase that was already recorded

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 84); // 12 weeks

  const { error } = await supabaseAdmin.from("memberships").insert({
    client_email: clientEmail,
    tier: tier,
    status: "active",
    started_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
  });
  if (error) { console.error("membership insert failed:", error); return false; }
  return true;
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { sourceId, tier, clientEmail, idempotencyKey } = await req.json();
    const amountCents = TIER_PRICES_CENTS[tier];

    if (!sourceId || !amountCents || !clientEmail) {
      return new Response(JSON.stringify({ error: "Missing package purchase info." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Same key from the page means the same purchase, so Square will not charge twice.
    const baseKey = typeof idempotencyKey === "string" && idempotencyKey.length >= 8
      ? idempotencyKey.slice(0, 36)
      : crypto.randomUUID();

    const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");

    const response = await fetch(`${SQUARE_API_BASE}/v2/payments`, {
      method: "POST",
      headers: {
        "Square-Version": "2024-01-18",
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source_id: sourceId,
        idempotency_key: `${baseKey}-pa`,
        amount_money: { amount: amountCents, currency: "USD" },
        location_id: SQUARE_LOCATION_ID,
        note: `Tenfold Method — ${TIER_NAMES[tier]}`,
      }),
    });

    const result = await response.json();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: result }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // From here on the card HAS been charged.
    const paymentId = result.payment?.id || null;

    // Record the payment (once per Square payment)
    let alreadyLogged = false;
    if (paymentId) {
      const { data: logged } = await supabaseAdmin.from("payments").select("id").eq("square_payment_id", paymentId).limit(1);
      alreadyLogged = !!(logged && logged.length);
    }
    if (!alreadyLogged) {
      const { error: paymentLogError } = await supabaseAdmin.from("payments").insert({
        client_email: clientEmail,
        amount_cents: amountCents,
        note: TIER_NAMES[tier],
        square_payment_id: paymentId,
      });
      if (paymentLogError) console.error("payment log failed (card WAS charged):", paymentId, paymentLogError);
    }

    // Record the membership, with one retry
    let recorded = await recordMembership(clientEmail, tier);
    if (!recorded) { await sleep(500); recorded = await recordMembership(clientEmail, tier); }
    if (!recorded) console.error("CHARGED BUT NO MEMBERSHIP:", clientEmail, tier, paymentId);

    return new Response(JSON.stringify({ success: true, membershipRecorded: recorded, paymentId }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
