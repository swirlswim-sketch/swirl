-- Row Level Security restricts which ROWS a user can touch, not which
-- COLUMNS -- so the "users can update their own profile" policy from
-- 0002 lets any authenticated user directly PATCH their own is_premium,
-- xp, total_distance_m, etc. via the REST API, bypassing all app logic
-- (the premium gate in particular). Postgres column-level privileges
-- close that gap alongside RLS.
--
-- id and is_premium are deliberately left out of the grant: they should
-- only ever change via a migration, a trigger, or a future service-role
-- process (e.g. a Stripe webhook), never directly from the client.

revoke update on profiles from authenticated;

grant update (
  display_name,
  avatar_url,
  bio,
  units_preference,
  total_distance_m,
  xp,
  streak_days,
  last_activity_date
) on profiles to authenticated;
