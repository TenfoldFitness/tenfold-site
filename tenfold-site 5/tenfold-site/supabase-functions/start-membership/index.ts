// Supabase Edge Function: start-membership
// Deploy the same way as the others: name it exactly "start-membership".
//
// Starts a Tier 1 or Tier 2 recurring membership WITHOUT using Square's
// paid Subscriptions feature. Instead, it saves the client's card on file
// (a free-plan Square feature) and charges it right now for the first
// month. A separate scheduled function (charge-monthly-memberships)
// checks daily and re-charges this same card each month automatically.
//
// Required secret (already added): SQUARE_ACCESS_TOKEN

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

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { sourceId, tier, clientEmail } = await req.json();
    const amountCents = TIER_PRICES_CENTS[tier];

    if (!sourceId || !amountCents || !clientEmail) {
      return new Response(JSON.stringify({ error: "Missing membership info." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Create (or reuse) a Square customer
    const customerResult = await squareFetch("/v2/customers", {
      idempotency_key: crypto.randomUUID(),
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
      idempotency_key: crypto.randomUUID(),
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
      idempotency_key: crypto.randomUUID(),
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

    await supabaseAdmin.from("payments").insert({
      client_email: clientEmail,
      amount_cents: amountCents,
      note: TIER_NAMES[tier],
      square_payment_id: paymentResult.json.payment?.id || null,
    });

    // 4. Record the membership with next month's billing date
    const nextBilling = new Date();
    nextBilling.setMonth(nextBilling.getMonth() + 1);

    await supabaseAdmin.from("memberships").insert({
      client_email: clientEmail,
      tier: tier,
      status: "active",
      square_customer_id: customerId,
      square_card_id: cardId,
      started_at: new Date().toISOString(),
      next_billing_date: nextBilling.toISOString(),
      expires_at: null,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
