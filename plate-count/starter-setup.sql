-- Plate Count starter accounts (Adrienne). Run once in Supabase -> SQL Editor (the Tenfold project).
-- Safe to re-run. Run setup.sql first if you have not already.
--
-- (Part 1 of 2. Part 2 is starter-account.sql, run after you create her user.)
-- BEFORE running part 2:
--   Supabase dashboard -> Authentication -> Users -> Add user -> Create new user.
--   Enter Adrienne's email, type her temporary password yourself, and tick "Auto Confirm User".
--   (The password is deliberately not stored in this file or in the app code.)

-- 1. Coach (admin) can read every client's food, training and profile rows, for the admin dashboard.
drop policy if exists "coach reads days"    on public.plate_days;
drop policy if exists "coach reads profile" on public.plate_profile;
create policy "coach reads days"    on public.plate_days    for select to authenticated using ((auth.jwt() ->> 'email') = 'tenfoldfunctional@gmail.com');
create policy "coach reads profile" on public.plate_profile for select to authenticated using ((auth.jwt() ->> 'email') = 'tenfoldfunctional@gmail.com');

-- 2. "Ask your coach" messages. Clients see and write only their own thread; the coach sees and answers all.
create table if not exists public.plate_messages (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users(id) on delete cascade,
  from_coach boolean not null default false,
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index if not exists plate_messages_user_idx on public.plate_messages (user_id, created_at);
alter table public.plate_messages enable row level security;
drop policy if exists "own messages read"    on public.plate_messages;
drop policy if exists "own messages write"   on public.plate_messages;
drop policy if exists "coach messages all"   on public.plate_messages;
create policy "own messages read"  on public.plate_messages for select to authenticated using (auth.uid() = user_id);
create policy "own messages write" on public.plate_messages for insert to authenticated with check (auth.uid() = user_id and from_coach = false);
create policy "coach messages all" on public.plate_messages for all    to authenticated
  using ((auth.jwt() ->> 'email') = 'tenfoldfunctional@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'tenfoldfunctional@gmail.com');

-- 3. Username sign-in. The app looks a username up here, then signs in with the matching email.
create table if not exists public.plate_usernames (
  username text primary key check (username = lower(username)),
  email    text not null
);
alter table public.plate_usernames enable row level security;   -- no policies: only the function below can read it
create or replace function public.plate_login_email(u text) returns text
language sql security definer set search_path = public as $$
  select email from public.plate_usernames where username = lower(trim(u)) limit 1;
$$;
revoke all on function public.plate_login_email(text) from public;
grant execute on function public.plate_login_email(text) to anon, authenticated;
