// Supabase Edge Function: start-membership
//
// Starts a Tier 1 or Tier 2 recurring membership WITHOUT using Square's
// paid Subscriptions feature. It saves the client's card on file and charges it right now for the first
// month. charge-monthly-memberships re-charges this same card each month.
//
// Hardened so that a charged card always ends in a recorded membership, or in a clear signal that it did not:
//  - The page sends an idempotencyKey. Every Square call derives its own key from it, so repeating the same
//    request cannot create a second customer, a second card, or a second charge.
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

const TIER_PRICES_CENTS = { 1: 2000, 2: 10000 }; // $20 and $100
const TIER_NAMES = { 1: "Tenfold Tier 1 - Foundation", 2: "Tenfold Tier 2 - Guided" };

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function squareFetch(path, body) {
  const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
  const res = await fetch(`${SQUARE_API_BASE}${path}`, {
    method: "POST",
    headers: {
      "Square-Version": "2024-01-18",
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return { ok: res.ok, json: await res.json() };
}

// Save the membership unless the same purchase already saved it. Returns true when a membership exists afterwards.
async function recordMembership(clientEmail, tier, customerId, cardId) {
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

  const nextBilling = new Date();
  nextBilling.setMonth(nextBilling.getMonth() + 1);

  const { error } = await supabaseAdmin.from("memberships").insert({
    client_email: clientEmail,
    tier: tier,
    status: "active",
    square_customer_id: customerId,
    square_card_id: cardId,
    started_at: new Date().toISOString(),
    next_billing_date: nextBilling.toISOString(),
    expires_at: null,
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
      return new Response(JSON.stringify({ error: "Missing membership info." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Same key from the page means the same purchase. Each Square call gets its own key derived from it.
    const baseKey = typeof idempotencyKey === "string" && idempotencyKey.length >= 8
      ? idempotencyKey.slice(0, 36)
      : crypto.randomUUID();

    // 1. Create (or reuse) a Square customer
    const customerResult = await squareFetch("/v2/customers", {
      idempotency_key: `${baseKey}-cu`,
      email_address: clientEmail,
    });
    if (!customerResult.ok) {
      return new Response(JSON.stringify({ error: customerResult.json }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const customerId = customerResult.json.customer.id;

    // 2. Save the card on file for future monthly charges
    const cardResult = await squareFetch("/v2/cards", {
      idempotency_key: `${baseKey}-ca`,
      source_id: sourceId,
      card: { customer_id: customerId },
    });
    if (!cardResult.ok) {
      return new Response(JSON.stringify({ error: cardResult.json }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const cardId = cardResult.json.card.id;

    // 3. Charge the card right now for month 1
    const paymentResult = await squareFetch("/v2/payments", {
      idempotency_key: `${baseKey}-pa`,
      source_id: cardId,
      customer_id: customerId,
      amount_money: { amount: amountCents, currency: "USD" },
      location_id: SQUARE_LOCATION_ID,
      note: TIER_NAMES[tier],
    });
    if (!paymentResult.ok) {
      return new Response(JSON.stringify({ error: paymentResult.json }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // From here on the card HAS been charged.
    const paymentId = paymentResult.json.payment?.id || null;

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

    // 4. Record the membership with next month's billing date, with one retry
    let recorded = await recordMembership(clientEmail, tier, customerId, cardId);
    if (!recorded) { await sleep(500); recorded = await recordMembership(clientEmail, tier, customerId, cardId); }
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
