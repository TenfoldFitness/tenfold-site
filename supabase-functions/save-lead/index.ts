// Supabase Edge Function: save-lead
// Deploy the same way as the others: name it exactly "save-lead".
//
// Called as soon as someone fills out the contact form on the
// consultation page, BEFORE they pick a time. This guarantees you get
// their info even if they never come back to finish scheduling.
//
// It is also called by the free-session page (sample-workout.html). For those
// leads only (tierInterest "free-session-legs") it sends EMAIL 1 straight away,
// with the session link and an unsubscribe link. Email 2 is sent three days later
// by the "send-followups" function.
//
// Required secret (already set): RESEND_API_KEY

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TRAINER_EMAIL = "tenfoldfunctional@gmail.com";
const SITE = "https://tenfoldframework.com";
// Sends from the verified tenfoldframework.com domain. Replies go to Sarah's inbox.
const FROM_ADDRESS = "Sarah at Tenfold <hello@tenfoldframework.com>";
const REPLY_TO = "tenfoldfunctional@gmail.com";

// Optional postal-address line for the email footer. Left empty on purpose (Sarah's decision).
// US email law (CAN-SPAM) expects a postal address in promotional email, so add one here if that changes.
const MAILING_ADDRESS = "";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

async function sendEmail(resendApiKey, to, subject, html, extra = {}) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM_ADDRESS, reply_to: REPLY_TO, to: [to], subject, html, ...extra }),
  });
  return { ok: res.ok, json: await res.json() };
}

function buildEmail1(token) {
  const unsub = `${Deno.env.get("SUPABASE_URL")}/functions/v1/unsubscribe?token=${token}`;
  const subject = "Your free Tenfold session (Monday: Legs)";
  const html = `<p>Hi,</p>
<p>Here is your free session, in case you want it handy: <a href="${SITE}/sample-workout.html">${SITE}/sample-workout.html</a></p>
<p>It is Monday of the real program, exactly as members run it. Run it this week and see whether the method fits you. You do not need to reply.</p>
<p>In a few days I will send one short note to ask how it went.</p>
<p>Sarah<br/>Tenfold Method</p>
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0 12px"/>
<p style="font-size:12px;color:#666;line-height:1.5">You asked for the free session at tenfoldframework.com. <a href="${unsub}">Unsubscribe</a><br/>Tenfold Method${MAILING_ADDRESS ? ", " + MAILING_ADDRESS : ""}</p>`;
  const text = `Hi,

Here is your free session, in case you want it handy: ${SITE}/sample-workout.html

It is Monday of the real program, exactly as members run it. Run it this week and see whether the method fits you. You do not need to reply.

In a few days I will send one short note to ask how it went.

Sarah
Tenfold Method

You asked for the free session at tenfoldframework.com. Unsubscribe: ${unsub}
Tenfold Method${MAILING_ADDRESS ? ", " + MAILING_ADDRESS : ""}`;
  return {
    subject, html,
    extra: {
      text,
      headers: { "List-Unsubscribe": `<${unsub}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    },
  };
}

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const { email, tierInterest } = body;

    // Email is the only genuinely required field. The consultation form sends
    // name, phone and priority; the free-session page (sample-workout.html)
    // sends an email alone on purpose, because every extra field costs leads.
    if (!email) {
      return new Response(JSON.stringify({ error: "An email address is required." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const name = body.name || "(free session, no name given)";
    const phone = body.phone || "";
    const priority = body.priority || "Not given";

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

    // EMAIL 1: free-session leads only. Best effort: it can never block the visitor
    // from getting the session, and it is skipped (safely) if the follow-up columns
    // have not been added yet.
    try {
      if (tierInterest === "free-session-legs" && data.unsubscribe_token) {
        const { data: others } = await supabaseAdmin
          .from("leads")
          .select("id, unsubscribed_at, followup_1_sent_at")
          .eq("email", email)
          .neq("id", data.id);
        const optedOut = (others || []).some((l) => l.unsubscribed_at);
        const alreadySent = (others || []).some((l) => l.followup_1_sent_at);
        if (!optedOut && !alreadySent) {
          const e1 = buildEmail1(data.unsubscribe_token);
          const sent = await sendEmail(resendApiKey, email, e1.subject, e1.html, e1.extra);
          if (sent.ok) {
            await supabaseAdmin.from("leads")
              .update({ followup_1_sent_at: new Date().toISOString() }).eq("id", data.id);
          }
        }
      }
    } catch (_e) { /* never block the visitor */ }

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
