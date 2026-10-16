-- Plate Count: per-client storage. Run once in Supabase → SQL Editor (Tenfold project).
-- Each client can only ever read or write their own rows.

create table if not exists public.plate_days (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day        date not null,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

create table if not exists public.plate_profile (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.plate_days    enable row level security;
alter table public.plate_profile enable row level security;

drop policy if exists "own days"    on public.plate_days;
drop policy if exists "own profile" on public.plate_profile;

create policy "own days"    on public.plate_days
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own profile" on public.plate_profile
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
