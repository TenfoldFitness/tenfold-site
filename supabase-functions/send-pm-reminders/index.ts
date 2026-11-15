// Supabase Edge Function: send-pm-reminders
// Name it exactly "send-pm-reminders". In its Settings, turn "Verify JWT" OFF: a scheduled job
// (pg_cron, every 5 minutes, see plate-count/reminders-setup.sql) calls it and proves who it is
// with a secret header instead.
//
// What it does: finds rows in plate_reminders that are due and not yet sent, and sends each one as a
// web push notification to that person's saved devices (plate_push_subs). Safety rules:
//   - skips (and marks done) a reminder if the cardio for that day is already logged
//   - skips (and marks done) a reminder more than 3 hours past due, so a late run never nags
//   - removes devices the push service says are gone (404 / 410)
//   - at most 50 per run
//
// Required secrets (Edge Functions > Secrets):
//   CRON_SECRET        a long random string; the same value goes in the cron job
//   VAPID_PUBLIC_KEY   the PUBLIC key from `npx web-push generate-vapid-keys` (same one pasted into app.js)
//   VAPID_PRIVATE_KEY  the PRIVATE key from the same command. Never put this in the repo.
//   VAPID_SUBJECT      mailto:tenfoldfunctional@gmail.com
//
// Test without sending: POST {"dry_run": true} with the x-cron-secret header.

import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL"),
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

const STALE_MS = 3 * 60 * 60 * 1000;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

serve(async (req) => {
  const secret = Deno.env.get("CRON_SECRET");
  if (!secret || req.headers.get("x-cron-secret") !== secret) return json({ error: "Not allowed." }, 401);

  let dry = false;
  try { dry = !!(await req.json()).dry_run; } catch (_) { /* no body */ }

  const pub = Deno.env.get("VAPID_PUBLIC_KEY"), priv = Deno.env.get("VAPID_PRIVATE_KEY");
  if (!pub || !priv) return json({ error: "VAPID keys are not set." }, 500);
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:tenfoldfunctional@gmail.com", pub, priv);

  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabaseAdmin
    .from("plate_reminders").select("*").is("sent_at", null).lte("due_at", nowIso).order("due_at").limit(50);
  if (error) return json({ error: error.message }, 500);

  const report = [];
  for (const r of due || []) {
    const key = { user_id: r.user_id, day: r.day };
    const late = Date.now() - new Date(r.due_at).getTime() > STALE_MS;

    // Already logged? Then there is nothing to remind.
    const { data: dayRow } = await supabaseAdmin
      .from("plate_days").select("data").eq("user_id", r.user_id).eq("day", r.day).maybeSingle();
    const c = dayRow && dayRow.data && dayRow.data.cardio;
    const logged = !!(c && (c.done || c.minutes));

    if (late || logged) {
      report.push({ day: r.day, action: logged ? "skipped: cardio already logged" : "skipped: too late" });
      if (!dry) await supabaseAdmin.from("plate_reminders").update({ sent_at: nowIso }).match(key);
      continue;
    }

    const { data: subs } = await supabaseAdmin.from("plate_push_subs").select("*").eq("user_id", r.user_id);
    if (dry) { report.push({ day: r.day, action: "would send", devices: (subs || []).length }); continue; }

    let sent = 0;
    for (const s of subs || []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({ title: r.title, body: r.body, url: "/plate-count/index.html?source=push" })
        );
        sent++;
      } catch (e) {
        if (e && (e.statusCode === 404 || e.statusCode === 410)) {
          await supabaseAdmin.from("plate_push_subs").delete().eq("endpoint", s.endpoint);
        }
      }
    }
    // Mark done even with no devices, so an old reminder never fires later when a device is added.
    await supabaseAdmin.from("plate_reminders").update({ sent_at: nowIso }).match(key);
    report.push({ day: r.day, action: "sent", devices: sent });
  }
  return json({ ok: true, dry_run: dry, due: (due || []).length, report });
});
