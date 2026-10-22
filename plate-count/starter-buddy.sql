-- Workout buddy (small toggle on the Train tab). Run once in Supabase -> SQL Editor. Safe to re-run.
-- Each person's app saves their last 14 days of workout names/days. Nothing else (no food, weight, notes or injuries).
-- The coach reads everyone's row; a starter client reads only the coach's row and their own.

create table if not exists public.plate_shared (
  user_id    uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  name       text not null default '',
  is_coach   boolean not null default false,
  items      jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.plate_shared enable row level security;

drop policy if exists "shared read"  on public.plate_shared;
drop policy if exists "shared write" on public.plate_shared;
drop policy if exists "shared edit"  on public.plate_shared;
drop policy if exists "shared del"   on public.plate_shared;

create policy "shared read" on public.plate_shared for select to authenticated using (
  auth.uid() = user_id
  or (auth.jwt() ->> 'email') = 'tenfoldfunctional@gmail.com'
  or (is_coach and (auth.jwt() -> 'app_metadata' ->> 'plate_track') = 'starter')
);
create policy "shared write" on public.plate_shared for insert to authenticated
  with check (auth.uid() = user_id and is_coach = ((auth.jwt() ->> 'email') = 'tenfoldfunctional@gmail.com'));
create policy "shared edit" on public.plate_shared for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id and is_coach = ((auth.jwt() ->> 'email') = 'tenfoldfunctional@gmail.com'));
create policy "shared del" on public.plate_shared for delete to authenticated using (auth.uid() = user_id);
