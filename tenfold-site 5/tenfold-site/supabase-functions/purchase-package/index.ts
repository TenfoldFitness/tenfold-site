// Supabase Edge Function: purchase-package
// Deploy the same way as the others: name it exactly "purchase-package".
//
// Handles one-time 12-week package purchases (Tiers 3-6).
// Required secret (already added): SQUARE_ACCESS_TOKEN

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SQUARE_LOCATION_ID = "L5KMCJ2K8M3AX";
const SQUARE_ENV = "production";
const SQUARE_API_BASE = SQUARE_ENV === "production"
  ? "https://connect.squareup.com"
  : "https://connect.squareupsandbox.com";

const TIER_PRICES_CENTS = {
  3: 100000, // Virtual Intensive - $1,000
  4: 120000, // In-Person Starter - $1,200
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
      return new Response(JSON.stringify({ error: "Missing package purchase info." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
        idempotency_key: crypto.randomUUID(),
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

    // Record the payment
    await supabaseAdmin.from("payments").insert({
      client_email: clientEmail,
      amount_cents: amountCents,
      note: TIER_NAMES[tier],
      square_payment_id: result.payment?.id || null,
    });

    // Record the membership - 12 weeks from now
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 84); // 12 weeks

    await supabaseAdmin.from("memberships").insert({
      client_email: clientEmail,
      tier: tier,
      status: "active",
      started_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
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
