-- Workout music sharing (Spotify). Run once in Supabase -> SQL Editor. Safe to re-run.
-- Each person's app saves what they are playing; the coach and the starter client can see each other's row.
-- Spotify login tokens are NOT stored here. They stay on each person's own device.

create table if not exists public.plate_listening (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  name       text not null default '',
  is_coach   boolean not null default false,
  track      text,
  artist     text,
  art        text,
  url        text,
  is_playing boolean not null default false,
  recent     jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.plate_listening enable row level security;

drop policy if exists "listening read"  on public.plate_listening;
drop policy if exists "listening write" on public.plate_listening;
drop policy if exists "listening edit"  on public.plate_listening;
drop policy if exists "listening del"   on public.plate_listening;

-- Read: your own row; the coach reads everyone's; starter clients also read the coach's row.
create policy "listening read" on public.plate_listening for select to authenticated using (
  auth.uid() = user_id
  or (auth.jwt() ->> 'email') = 'tenfoldfunctional@gmail.com'
  or (is_coach and (auth.jwt() -> 'app_metadata' ->> 'plate_track') = 'starter')
);
-- Write: only your own row, and is_coach can only be true for the coach's own email.
create policy "listening write" on public.plate_listening for insert to authenticated
  with check (auth.uid() = user_id and is_coach = ((auth.jwt() ->> 'email') = 'tenfoldfunctional@gmail.com'));
create policy "listening edit" on public.plate_listening for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and is_coach = ((auth.jwt() ->> 'email') = 'tenfoldfunctional@gmail.com'));
create policy "listening del" on public.plate_listening for delete to authenticated using (auth.uid() = user_id);
