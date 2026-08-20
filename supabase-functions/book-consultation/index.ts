// Supabase Edge Function: book-consultation
// Deploy the same way as the others: name it exactly "book-consultation".
//
// Called after save-lead, once the person picks an actual time. This
// finalizes their lead record with the chosen time and books the real
// 15-minute appointment, then emails both sides.
//
// Required secret (already set): RESEND_API_KEY

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_MEET_LINK = "https://meet.google.com/vje-qgzr-urq";
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
    const { leadId, appointmentTime } = await req.json();

    if (!leadId || !appointmentTime) {
      return new Response(JSON.stringify({ error: "Missing required info." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: lead, error: fetchError } = await supabaseAdmin
      .from("leads")
      .select("*")
      .eq("id", leadId)
      .single();

    if (fetchError || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updateError } = await supabaseAdmin
      .from("leads")
      .update({ status: "scheduled", appointment_time: appointmentTime })
      .eq("id", leadId);

    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: apptError } = await supabaseAdmin.from("appointments").insert({
      client_email: lead.email,
      name: lead.name,
      phone: lead.phone,
      priority: lead.priority,
      appointment_time: appointmentTime,
      type: "consultation",
      duration_minutes: 15,
      status: "upcoming",
      location: "Virtual",
    });

    if (apptError) {
      return new Response(JSON.stringify({ error: apptError.message }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const when = new Date(appointmentTime).toLocaleString("en-US", {
      weekday: "long", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const results = [];

    results.push(await sendEmail(
      resendApiKey, lead.email,
      `Your free consultation is confirmed — ${when}`,
      `<p>Hi ${lead.name},</p>
       <p>Your free 15-minute consultation with Sarah is confirmed for <strong>${when}</strong>.</p>
       <p>Join here when it's time: <a href="${GOOGLE_MEET_LINK}">${GOOGLE_MEET_LINK}</a></p>
       <p>Looking forward to talking with you!<br/>Tenfold Method</p>`
    ));

    results.push(await sendEmail(
      resendApiKey, TRAINER_EMAIL,
      `Consultation scheduled — ${when}`,
      `<p>A lead just finished scheduling their consultation.</p>
       <p><strong>Name:</strong> ${lead.name}</p>
       <p><strong>Email:</strong> ${lead.email}</p>
       <p><strong>Phone:</strong> ${lead.phone}</p>
       <p><strong>Top priority:</strong> ${lead.priority}</p>
       ${lead.tier_interest ? `<p><strong>Interested in:</strong> Tier ${lead.tier_interest}</p>` : ""}
       <p><strong>When:</strong> ${when}</p>`
    ));

    const anyFailed = results.some(r => !r.ok);
    if (anyFailed) {
      return new Response(JSON.stringify({ error: results.filter(r => !r.ok).map(r => r.json) }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
