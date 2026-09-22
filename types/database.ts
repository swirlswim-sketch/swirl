export type Difficulty = "shallow" | "open_water" | "deep";
export type BadgeType = "checkpoint" | "streak" | "distance" | "completion" | "special";
export type UnitsPreference = "km" | "miles";
export type ActivitySource = "manual" | "apple_health" | "strava" | "garmin";

// Row shapes are plain `type` object literals, not `interface`s: Supabase's
// generic client checks `Row extends Record<string, unknown>` when resolving
// table types from the Database generic, and TypeScript only recognizes that
// relation for object-literal types — an `interface` (even with identical
// members) fails the check and silently collapses every table to `never`.

export type Profile = {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  total_distance_m: number;
  xp: number;
  streak_days: number;
  last_activity_date: string | null;
  is_premium: boolean;
  units_preference: UnitsPreference;
  created_at: string;
};

export type Route = {
  id: string;
  name: string;
  description: string | null;
  total_distance_m: number;
  cover_image_url: string | null;
  activity_type: string;
  difficulty: Difficulty | null;
  geojson: GeoJSON.Geometry | null;
  tags: string[] | null;
  is_active: boolean;
  created_at: string;
};

export type RouteCheckpoint = {
  id: string;
  route_id: string;
  name: string;
  description: string | null;
  distance_from_start_m: number;
  lat: number | null;
  lng: number | null;
  badge_id: string | null;
  order_index: number;
};

export type UserRoute = {
  id: string;
  user_id: string;
  route_id: string | null;
  custom_name: string | null;
  custom_distance_m: number | null;
  started_at: string;
  completed_at: string | null;
  current_distance_m: number;
  is_active: boolean;
};

export type ActivityLog = {
  id: string;
  user_id: string;
  user_route_id: string | null;
  distance_m: number;
  duration_seconds: number | null;
  activity_type: string;
  logged_at: string;
  source: ActivitySource;
  notes: string | null;
  xp_earned: number | null;
};

export type Badge = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  badge_type: BadgeType;
  threshold_value: number | null;
};

export type UserBadge = {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  activity_log_id: string | null;
};

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: never[];
      };
      routes: {
        Row: Route;
        Insert: Partial<Route> & { name: string; total_distance_m: number };
        Update: Partial<Route>;
        Relationships: never[];
      };
      route_checkpoints: {
        Row: RouteCheckpoint;
        Insert: Partial<RouteCheckpoint> & {
          route_id: string;
          name: string;
          distance_from_start_m: number;
          order_index: number;
        };
        Update: Partial<RouteCheckpoint>;
        Relationships: never[];
      };
      user_routes: {
        Row: UserRoute;
        Insert: Partial<UserRoute> & { user_id: string };
        Update: Partial<UserRoute>;
        Relationships: never[];
      };
      activity_logs: {
        Row: ActivityLog;
        Insert: Partial<ActivityLog> & { user_id: string; distance_m: number };
        Update: Partial<ActivityLog>;
        Relationships: never[];
      };
      badges: {
        Row: Badge;
        Insert: Partial<Badge> & { name: string; badge_type: BadgeType };
        Update: Partial<Badge>;
        Relationships: never[];
      };
      user_badges: {
        Row: UserBadge;
        Insert: Partial<UserBadge> & { user_id: string; badge_id: string };
        Update: Partial<UserBadge>;
        Relationships: never[];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
  };
};
