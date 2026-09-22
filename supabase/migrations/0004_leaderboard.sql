-- Support for Phase 6 (leaderboard): a minimal follow graph for the
-- Friends tab (the spec describes it as a premium feature but never
-- defines how "friends" are established -- no follow UI exists yet
-- either, so this is just the data model, ready for that later), and a
-- SECURITY DEFINER function for weekly totals.
--
-- activity_logs' RLS restricts SELECT to `auth.uid() = user_id`, which
-- is correct for the app generally but means a plain client-side query
-- can only ever aggregate the CALLING user's own logs -- never a
-- cross-user leaderboard. A SECURITY DEFINER function runs as its
-- owner (bypassing RLS) and is the standard way to expose one narrow,
-- purpose-built aggregate without opening up row-level access to
-- everyone's individual activity logs.

-- ============================================================
-- follows
-- ============================================================
create table if not exists follows (
  id uuid primary key default gen_random_uuid(),
  follower_id uuid not null references profiles on delete cascade,
  followed_id uuid not null references profiles on delete cascade,
  created_at timestamptz not null default now(),
  unique (follower_id, followed_id),
  check (follower_id != followed_id)
);

create index if not exists follows_follower_idx on follows (follower_id);

alter table follows enable row level security;

create policy "users can read their own follow edges"
  on follows for select
  to authenticated
  using (auth.uid() = follower_id or auth.uid() = followed_id);

create policy "users can create their own follow edges"
  on follows for insert
  to authenticated
  with check (auth.uid() = follower_id);

create policy "users can delete their own follow edges"
  on follows for delete
  to authenticated
  using (auth.uid() = follower_id);

-- ============================================================
-- weekly_distance_leaderboard: total distance per user, current
-- calendar week (server timezone), across ALL users -- no LIMIT or
-- per-user filtering here, so the client can reuse this for both the
-- global and friends weekly views.
-- ============================================================
create or replace function public.weekly_distance_leaderboard()
returns table (user_id uuid, weekly_distance_m numeric)
language sql
stable
security definer
set search_path = public
as $$
  select activity_logs.user_id, sum(activity_logs.distance_m) as weekly_distance_m
  from activity_logs
  where activity_logs.logged_at >= date_trunc('week', now())
  group by activity_logs.user_id;
$$;

grant execute on function public.weekly_distance_leaderboard() to authenticated;

-- ============================================================
-- Enable realtime updates on profiles (leaderboard live-updates).
-- ============================================================
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'profiles'
  ) then
    alter publication supabase_realtime add table profiles;
  end if;
end $$;
