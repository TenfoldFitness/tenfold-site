// Supabase Edge Function: process-payment
// Deploy this in your Supabase project under Edge Functions.
// It receives a one-time payment token from Square's Web Payments SDK
// (created in the browser) and uses it to actually charge the card.
//
// Required secret (set in Supabase, NOT in this file):
//   SQUARE_ACCESS_TOKEN  — from the Square Developer Dashboard
//
// This keeps the real access token off the website entirely — it only
// ever lives inside Supabase's secure secret storage.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SQUARE_LOCATION_ID = "L5KMCJ2K8M3AX";
const SQUARE_ENV = "production"; // switched live on client's request
const SQUARE_API_BASE = SQUARE_ENV === "production"
  ? "https://connect.squareup.com"
  : "https://connect.squareupsandbox.com";

// Supabase auto-provides these to every Edge Function — no setup needed.
const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

serve(async (req) => {
  // Allow the website to call this function from the browser
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { sourceId, amountCents, note, clientEmail } = await req.json();

    if (!sourceId || !amountCents) {
      return new Response(JSON.stringify({ error: "Missing payment info." }), {
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
        amount_money: {
          amount: amountCents, // e.g. 7500 = $75.00
          currency: "USD",
        },
        location_id: SQUARE_LOCATION_ID,
        note: note || "Tenfold Method session payment",
      }),
    });

    const result = await response.json();

    if (!response.ok) {
      return new Response(JSON.stringify({ error: result }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record the payment so Sarah's admin dashboard can show it.
    if (clientEmail) {
      await supabaseAdmin.from("payments").insert({
        client_email: clientEmail,
        amount_cents: amountCents,
        note: note || "Tenfold Method session payment",
        square_payment_id: result.payment?.id || null,
      });
    }

    return new Response(JSON.stringify({ success: true, payment: result.payment }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
