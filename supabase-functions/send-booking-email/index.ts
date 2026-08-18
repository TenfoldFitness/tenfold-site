// Supabase Edge Function: send-booking-email
// Deploy the same way as the others: name it exactly "send-booking-email".
// This REPLACES the previous version — it now handles both new bookings
// and cancellations, and emails both the client AND the trainer (you).
//
// Required secret (already set): RESEND_API_KEY

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";

const GOOGLE_MEET_LINK = "https://meet.google.com/vje-qgzr-urq";
const TRAINER_EMAIL = "tenfoldfunctional@gmail.com";

// While the domain isn't verified with Resend yet, this default sender
// works for testing. Once Tenfold Method's real domain is live, this can
// be swapped to something like "Tenfold Method <bookings@tenfoldmethod.com>".
const FROM_ADDRESS = "Tenfold Method <onboarding@resend.dev>";

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
    // type is "booked" or "cancelled"
    const { clientEmail, appointmentTime, notes, type, location } = await req.json();

    if (!clientEmail || !appointmentTime) {
      return new Response(JSON.stringify({ error: "Missing booking info." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const sessionLocation = location === "In-person" ? "In-person" : "Virtual";
    const emailType = type === "cancelled" ? "cancelled" : "booked";
    const when = new Date(appointmentTime).toLocaleString("en-US", {
      weekday: "long", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit",
    });

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const results = [];

    if (emailType === "booked") {
      const locationLine = sessionLocation === "Virtual"
        ? `<p>Join here when it's time: <a href="${GOOGLE_MEET_LINK}">${GOOGLE_MEET_LINK}</a></p>`
        : `<p>This session is in-person. See you then!</p>`;

      results.push(await sendEmail(
        resendApiKey, clientEmail,
        `Your session is booked — ${when}`,
        `<p>Hi,</p>
         <p>Your ${sessionLocation.toLowerCase()} session with Sarah is confirmed for <strong>${when}</strong>.</p>
         ${locationLine}
         ${notes ? `<p>Notes you shared: ${notes}</p>` : ""}
         <p>See you then!<br/>Tenfold Method</p>`
      ));
      results.push(await sendEmail(
        resendApiKey, TRAINER_EMAIL,
        `New booking — ${when}`,
        `<p>New session booked.</p>
         <p><strong>Client:</strong> ${clientEmail}</p>
         <p><strong>When:</strong> ${when}</p>
         <p><strong>Location:</strong> ${sessionLocation}</p>
         ${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ""}`
      ));
    } else {
      results.push(await sendEmail(
        resendApiKey, clientEmail,
        `Your session on ${when} has been cancelled`,
        `<p>Hi,</p>
         <p>This is a confirmation that your session on <strong>${when}</strong> has been cancelled.</p>
         <p>Whenever you're ready, you can book a new time from your dashboard.</p>
         <p>Tenfold Method</p>`
      ));
      results.push(await sendEmail(
        resendApiKey, TRAINER_EMAIL,
        `Cancelled — ${when}`,
        `<p>A session was cancelled.</p>
         <p><strong>Client:</strong> ${clientEmail}</p>
         <p><strong>Was scheduled for:</strong> ${when}</p>`
      ));
    }

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
