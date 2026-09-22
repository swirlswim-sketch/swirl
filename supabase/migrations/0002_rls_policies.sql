-- Row Level Security policies for Swirl

alter table profiles enable row level security;
alter table badges enable row level security;
alter table routes enable row level security;
alter table route_checkpoints enable row level security;
alter table user_routes enable row level security;
alter table activity_logs enable row level security;
alter table user_badges enable row level security;

-- ============================================================
-- profiles
-- Read: any authenticated user can read any profile (required for
-- the leaderboard, which ranks all users by total distance).
-- Write: only your own row.
-- ============================================================
create policy "profiles are readable by authenticated users"
  on profiles for select
  to authenticated
  using (true);

create policy "users can insert their own profile"
  on profiles for insert
  to authenticated
  with check (auth.uid() = id);

create policy "users can update their own profile"
  on profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "users can delete their own profile"
  on profiles for delete
  to authenticated
  using (auth.uid() = id);

-- ============================================================
-- badges: publicly readable, no client writes
-- ============================================================
create policy "badges are publicly readable"
  on badges for select
  to anon, authenticated
  using (true);

-- ============================================================
-- routes: publicly readable, no client writes
-- ============================================================
create policy "routes are publicly readable"
  on routes for select
  to anon, authenticated
  using (true);

-- ============================================================
-- route_checkpoints: publicly readable, no client writes
-- ============================================================
create policy "route checkpoints are publicly readable"
  on route_checkpoints for select
  to anon, authenticated
  using (true);

-- ============================================================
-- user_routes: only your own rows
-- ============================================================
create policy "users can read their own user_routes"
  on user_routes for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert their own user_routes"
  on user_routes for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own user_routes"
  on user_routes for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own user_routes"
  on user_routes for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- activity_logs: only your own rows
-- ============================================================
create policy "users can read their own activity_logs"
  on activity_logs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert their own activity_logs"
  on activity_logs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "users can update their own activity_logs"
  on activity_logs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "users can delete their own activity_logs"
  on activity_logs for delete
  to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- user_badges: only your own rows
-- ============================================================
create policy "users can read their own user_badges"
  on user_badges for select
  to authenticated
  using (auth.uid() = user_id);

create policy "users can insert their own user_badges"
  on user_badges for insert
  to authenticated
  with check (auth.uid() = user_id);
