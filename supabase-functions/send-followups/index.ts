// Supabase Edge Function: send-followups
// Name it exactly "send-followups". In its Settings, turn "Verify JWT" OFF:
// a daily scheduled job calls it, and the job proves who it is with a secret
// header instead (see CRON_SECRET below).
//
// Sends EMAIL 2 ("How did Monday go?") to free-session leads, three days after they
// unlocked the session. Rules, all enforced here:
//   - only free-session leads (tier_interest = "free-session-legs")
//   - only people who already got Email 1 (so nobody who signed up before this
//     system existed is ever emailed)
//   - not unsubscribed, and Email 2 not already sent
//   - between 3 and 10 days old, so a missed day catches up but old leads never get it
//   - skipped if the address already has an active membership
//   - at most 50 per run
//
// Required secrets: RESEND_API_KEY (already set) and CRON_SECRET (a long random
// string you add under Edge Functions > Secrets).
//
// Test without sending anything: POST {"dry_run": true} with the x-cron-secret header.
// It lists who would be emailed and sends nothing.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = "https://tenfoldframework.com";
const FROM_ADDRESS = "Sarah at Tenfold <hello@tenfoldframework.com>";
const REPLY_TO = "tenfoldfunctional@gmail.com";

// Optional postal-address line for the email footer. Left empty on purpose (Sarah's decision).
// US email law (CAN-SPAM) expects a postal address in promotional email, so add one here if that changes.
const MAILING_ADDRESS = "";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

function unsubscribeUrl(token) {
  return `${Deno.env.get("SUPABASE_URL")}/functions/v1/unsubscribe?token=${token}`;
}

function buildEmail2(token) {
  const unsub = unsubscribeUrl(token);
  const subject = "How did Monday go?";
  const html = `<p>Hi,</p>
<p>A quick check-in on the free session. Was anything too hard, too easy or confusing? Reply and tell me. I read every reply.</p>
<p>If it fit and you want the rest, the full program is twelve weeks and seventy-two sessions, every lift written at three tiers, plus the recipe and macro tools and your own session log. It is $20 a month and you can cancel anytime: <a href="${SITE}/signup.html?tier=1">${SITE}/signup.html?tier=1</a></p>
<p>If you would rather talk it through first, here is a free 15-minute call: <a href="${SITE}/consultation.html">${SITE}/consultation.html</a></p>
<p>And if it was not for you, no hard feelings at all.</p>
<p>Sarah<br/>Tenfold Method</p>
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0 12px"/>
<p style="font-size:12px;color:#666;line-height:1.5">You asked for the free session at tenfoldframework.com. <a href="${unsub}">Unsubscribe</a><br/>Tenfold Method${MAILING_ADDRESS ? ", " + MAILING_ADDRESS : ""}</p>`;
  const text = `Hi,

A quick check-in on the free session. Was anything too hard, too easy or confusing? Reply and tell me. I read every reply.

If it fit and you want the rest, the full program is twelve weeks and seventy-two sessions, every lift written at three tiers, plus the recipe and macro tools and your own session log. It is $20 a month and you can cancel anytime: ${SITE}/signup.html?tier=1

If you would rather talk it through first, here is a free 15-minute call: ${SITE}/consultation.html

And if it was not for you, no hard feelings at all.

Sarah
Tenfold Method

You asked for the free session at tenfoldframework.com. Unsubscribe: ${unsub}
Tenfold Method${MAILING_ADDRESS ? ", " + MAILING_ADDRESS : ""}`;
  return { subject, html, text, unsub };
}

async function sendEmail(resendApiKey, to, email) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      reply_to: REPLY_TO,
      to: [to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      headers: {
        "List-Unsubscribe": `<${email.unsub}>`,
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
    }),
  });
  return { ok: res.ok, json: await res.json() };
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "Not allowed." }, 401);

  try {
    const body = await req.json().catch(() => ({}));
    const dryRun = body && body.dry_run === true;


    const day = 24 * 60 * 60 * 1000;
    const olderThan = new Date(Date.now() - 3 * day).toISOString();
    const newerThan = new Date(Date.now() - 10 * day).toISOString();

    const { data: leads, error } = await supabaseAdmin
      .from("leads")
      .select("id, email, unsubscribe_token")
      .eq("tier_interest", "free-session-legs")
      .is("unsubscribed_at", null)
      .is("followup_2_sent_at", null)
      .not("followup_1_sent_at", "is", null)
      .lte("created_at", olderThan)
      .gte("created_at", newerThan)
      .limit(50);

    if (error) return json({ error: error.message }, 400);

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const result = { dry_run: dryRun, considered: leads.length, sent: 0, skipped_members: 0, failed: 0, would_email: [] };

    for (const lead of leads) {
      const { data: member } = await supabaseAdmin
        .from("memberships").select("id").eq("client_email", lead.email).eq("status", "active").limit(1);

      if (member && member.length) {
        result.skipped_members++;
        if (!dryRun) {
          // Mark as handled so this address is not looked at again.
          await supabaseAdmin.from("leads").update({ followup_2_sent_at: new Date().toISOString() }).eq("id", lead.id);
        }
        continue;
      }

      if (dryRun) { result.would_email.push(lead.email); continue; }

      const sent = await sendEmail(resendApiKey, lead.email, buildEmail2(lead.unsubscribe_token));
      if (sent.ok) {
        await supabaseAdmin.from("leads").update({ followup_2_sent_at: new Date().toISOString() }).eq("id", lead.id);
        result.sent++;
      } else {
        result.failed++; // left unmarked, so tomorrow's run tries again
      }
    }

    return json(result);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});
