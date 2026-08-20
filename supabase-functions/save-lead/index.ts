// Supabase Edge Function: save-lead
// Deploy the same way as the others: name it exactly "save-lead".
//
// Called as soon as someone fills out the contact form on the
// consultation page, BEFORE they pick a time. This guarantees you get
// their info even if they never come back to finish scheduling.
//
// Required secret (already set): RESEND_API_KEY

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TRAINER_EMAIL = "tenfoldfunctional@gmail.com";
const FROM_ADDRESS = "Tenfold Method <onboarding@resend.dev>";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

async function sendEmail(resendApiKey, to, subject, html) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, to: [to], subject, html }),
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
    const { name, email, phone, priority, tierInterest } = await req.json();

    if (!name || !email || !phone || !priority) {
      return new Response(JSON.stringify({ error: "Missing required info." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabaseAdmin.from("leads").insert({
      name, email, phone, priority,
      tier_interest: tierInterest || null,
      status: "new",
    }).select().single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    await sendEmail(
      resendApiKey, TRAINER_EMAIL,
      `New lead: ${name}`,
      `<p>Someone just started the consultation booking process.</p>
       <p><strong>Name:</strong> ${name}</p>
       <p><strong>Email:</strong> ${email}</p>
       <p><strong>Phone:</strong> ${phone}</p>
       <p><strong>Top priority:</strong> ${priority}</p>
       ${tierInterest ? `<p><strong>Interested in:</strong> Tier ${tierInterest}</p>` : ""}
       <p>They haven't picked a time yet — if they don't finish scheduling, follow up directly using the info above.</p>`
    );

    return new Response(JSON.stringify({ success: true, leadId: data.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
