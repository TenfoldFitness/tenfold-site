// Supabase Edge Function: book-consultation
// Deploy the same way as the others: name it exactly "book-consultation".
// This is called from the PUBLIC consultation booking page (no login
// required). It saves the lead's info, books a 15-minute consultation
// slot, and emails both the prospective client and the trainer.
//
// Required secrets (already set): RESEND_API_KEY

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
    const { name, email, phone, priority, appointmentTime } = await req.json();

    if (!name || !email || !phone || !priority || !appointmentTime) {
      return new Response(JSON.stringify({ error: "Missing required info." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: dbError } = await supabaseAdmin.from("appointments").insert({
      client_email: email,
      name: name,
      phone: phone,
      priority: priority,
      appointment_time: appointmentTime,
      type: "consultation",
      duration_minutes: 15,
      status: "upcoming",
      location: "Virtual",
    });

    if (dbError) {
      return new Response(JSON.stringify({ error: dbError.message }), {
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
      resendApiKey, email,
      `Your free consultation is confirmed — ${when}`,
      `<p>Hi ${name},</p>
       <p>Your free 15-minute consultation with Sarah is confirmed for <strong>${when}</strong>.</p>
       <p>Join here when it's time: <a href="${GOOGLE_MEET_LINK}">${GOOGLE_MEET_LINK}</a></p>
       <p>Looking forward to talking with you!<br/>Tenfold Method</p>`
    ));

    results.push(await sendEmail(
      resendApiKey, TRAINER_EMAIL,
      `New consultation request — ${when}`,
      `<p>New free consultation booked.</p>
       <p><strong>Name:</strong> ${name}</p>
       <p><strong>Email:</strong> ${email}</p>
       <p><strong>Phone:</strong> ${phone}</p>
       <p><strong>Top priority:</strong> ${priority}</p>
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
