-- Swirl initial schema
-- Run in the Supabase SQL editor, or via `supabase db push` with the CLI.

create extension if not exists "pgcrypto";

-- ============================================================
-- profiles
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  display_name text,
  avatar_url text,
  bio text,
  total_distance_m numeric not null default 0,
  xp integer not null default 0,
  streak_days integer not null default 0,
  last_activity_date date,
  is_premium boolean not null default false,
  units_preference text not null default 'km' check (units_preference in ('km', 'miles')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- badges
-- ============================================================
create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  image_url text,
  badge_type text not null check (badge_type in ('checkpoint', 'streak', 'distance', 'completion', 'special')),
  threshold_value numeric
);

-- ============================================================
-- routes
-- ============================================================
create table if not exists routes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  total_distance_m numeric not null,
  cover_image_url text,
  activity_type text not null default 'swim',
  difficulty text check (difficulty in ('shallow', 'open_water', 'deep')),
  geojson jsonb,
  tags text[],
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ============================================================
-- route_checkpoints
-- ============================================================
create table if not exists route_checkpoints (
  id uuid primary key default gen_random_uuid(),
  route_id uuid not null references routes on delete cascade,
  name text not null,
  description text,
  distance_from_start_m numeric not null,
  lat numeric,
  lng numeric,
  badge_id uuid references badges on delete set null,
  order_index integer not null,
  unique (route_id, order_index)
);

create index if not exists route_checkpoints_route_id_idx on route_checkpoints (route_id, order_index);

-- ============================================================
-- user_routes
-- ============================================================
create table if not exists user_routes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  route_id uuid references routes on delete cascade,
  custom_name text,
  custom_distance_m numeric,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  current_distance_m numeric not null default 0,
  is_active boolean not null default true,
  check (route_id is not null or custom_distance_m is not null)
);

create index if not exists user_routes_user_id_idx on user_routes (user_id);
create index if not exists user_routes_active_idx on user_routes (user_id, is_active);

-- ============================================================
-- activity_logs
-- ============================================================
create table if not exists activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  user_route_id uuid references user_routes on delete set null,
  distance_m numeric not null,
  duration_seconds integer,
  activity_type text not null default 'swim',
  logged_at timestamptz not null default now(),
  source text not null default 'manual',
  notes text,
  xp_earned integer
);

create index if not exists activity_logs_user_id_idx on activity_logs (user_id, logged_at desc);

-- ============================================================
-- user_badges
-- ============================================================
create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  badge_id uuid not null references badges on delete cascade,
  earned_at timestamptz not null default now(),
  activity_log_id uuid references activity_logs on delete set null,
  unique (user_id, badge_id)
);

create index if not exists user_badges_user_id_idx on user_badges (user_id);

-- ============================================================
-- Keep profiles.id in sync with auth.users
-- Covers OAuth signups (Google) that don't pass through the
-- app's manual "create profile" onboarding step for email/password.
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
