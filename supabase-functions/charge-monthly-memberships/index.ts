// Supabase Edge Function: charge-monthly-memberships
// Deploy the same way as the others: name it exactly "charge-monthly-memberships".
//
// This one is NOT called by the website. Instead, it's triggered once a
// day by a Supabase Cron Job (set up separately in the Supabase dashboard
// under Integrations -> Cron). Each day, it finds any Tier 1/2 member
// whose next_billing_date has arrived, charges their saved card, and
// pushes their next_billing_date forward by one month.
//
// Required secret (already added): SQUARE_ACCESS_TOKEN

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SQUARE_LOCATION_ID = "L5KMCJ2K8M3AX";
const SQUARE_ENV = "production";
const SQUARE_API_BASE = SQUARE_ENV === "production"
  ? "https://connect.squareup.com"
  : "https://connect.squareupsandbox.com";

const TIER_PRICES_CENTS = { 1: 2000, 2: 10000 };
const TIER_NAMES = { 1: "Tenfold Tier 1 - Foundation (renewal)", 2: "Tenfold Tier 2 - Guided (renewal)" };

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

serve(async (req) => {
  try {
    const accessToken = Deno.env.get("SQUARE_ACCESS_TOKEN");
    const now = new Date();

    const { data: dueMemberships, error } = await supabaseAdmin
      .from("memberships")
      .select("*")
      .eq("status", "active")
      .in("tier", [1, 2])
      .lte("next_billing_date", now.toISOString());

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    const results = [];

    for (const membership of dueMemberships) {
      const amountCents = TIER_PRICES_CENTS[membership.tier];

      const paymentRes = await fetch(`${SQUARE_API_BASE}/v2/payments`, {
        method: "POST",
        headers: {
          "Square-Version": "2024-01-18",
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          idempotency_key: crypto.randomUUID(),
          source_id: membership.square_card_id,
          customer_id: membership.square_customer_id,
          amount_money: { amount: amountCents, currency: "USD" },
          location_id: SQUARE_LOCATION_ID,
          note: TIER_NAMES[membership.tier],
        }),
      });

      const paymentJson = await paymentRes.json();

      if (paymentRes.ok) {
        // Success: record payment, push billing date forward one month
        await supabaseAdmin.from("payments").insert({
          client_email: membership.client_email,
          amount_cents: amountCents,
          note: TIER_NAMES[membership.tier],
          square_payment_id: paymentJson.payment?.id || null,
        });

        const nextBilling = new Date(membership.next_billing_date);
        nextBilling.setMonth(nextBilling.getMonth() + 1);

        await supabaseAdmin.from("memberships")
          .update({ next_billing_date: nextBilling.toISOString() })
          .eq("id", membership.id);

        results.push({ client: membership.client_email, status: "charged" });
      } else {
        // Failed charge (e.g. card declined): mark as past_due so the
        // admin dashboard can flag it, rather than silently retrying forever.
        await supabaseAdmin.from("memberships")
          .update({ status: "past_due" })
          .eq("id", membership.id);

        results.push({ client: membership.client_email, status: "failed", error: paymentJson });
      }
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
