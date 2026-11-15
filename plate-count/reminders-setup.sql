-- Plate Count: PM session phone reminders. Run once in Supabase -> SQL Editor.
-- IMPORTANT: confirm the dashboard project ID is aeoqczhdhzlggivkgaob (the Tenfold project) before running.
-- Each person can only read or write their own rows. The scheduled function uses the service role.

create table if not exists public.plate_push_subs (
  endpoint   text primary key,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  p256dh     text not null,
  auth       text not null,
  ua         text,
  created_at timestamptz not null default now()
);

create table if not exists public.plate_reminders (
  user_id  uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day      date not null,
  due_at   timestamptz not null,
  title    text not null default 'Time for your PM session',
  body     text not null default '',
  sent_at  timestamptz,
  primary key (user_id, day)
);

create index if not exists plate_reminders_due on public.plate_reminders (due_at) where sent_at is null;

alter table public.plate_push_subs enable row level security;
alter table public.plate_reminders enable row level security;

drop policy if exists "own subs"      on public.plate_push_subs;
drop policy if exists "own reminders" on public.plate_reminders;

create policy "own subs"      on public.plate_push_subs
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own reminders" on public.plate_reminders
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Schedule: every 5 minutes, call the send-pm-reminders function. Run this part AFTER the function is deployed
-- and CRON_SECRET is set. Replace PASTE_YOUR_CRON_SECRET with the same value you saved as the CRON_SECRET secret.
-- (Turn on the pg_cron and pg_net extensions first: Database -> Extensions.)
--
-- select cron.schedule(
--   'plate-pm-reminders',
--   '*/5 * * * *',
--   $$ select net.http_post(
--        url     := 'https://aeoqczhdhzlggivkgaob.supabase.co/functions/v1/send-pm-reminders',
--        headers := jsonb_build_object('Content-Type','application/json','x-cron-secret','PASTE_YOUR_CRON_SECRET'),
--        body    := '{}'::jsonb
--      ) $$
-- );
