export type Difficulty = "shallow" | "open_water" | "deep";
export type BadgeType = "checkpoint" | "streak" | "distance" | "completion" | "special";
export type UnitsPreference = "km" | "miles";
export type ActivitySource = "manual" | "apple_health" | "strava" | "garmin";

export interface Profile {
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
}

export interface Route {
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
}

export interface RouteCheckpoint {
  id: string;
  route_id: string;
  name: string;
  description: string | null;
  distance_from_start_m: number;
  lat: number | null;
  lng: number | null;
  badge_id: string | null;
  order_index: number;
}

export interface UserRoute {
  id: string;
  user_id: string;
  route_id: string | null;
  custom_name: string | null;
  custom_distance_m: number | null;
  started_at: string;
  completed_at: string | null;
  current_distance_m: number;
  is_active: boolean;
}

export interface ActivityLog {
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
}

export interface Badge {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  badge_type: BadgeType;
  threshold_value: number | null;
}

export interface UserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
  activity_log_id: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Partial<Profile> & { id: string }; Update: Partial<Profile> };
      routes: { Row: Route; Insert: Partial<Route>; Update: Partial<Route> };
      route_checkpoints: { Row: RouteCheckpoint; Insert: Partial<RouteCheckpoint>; Update: Partial<RouteCheckpoint> };
      user_routes: { Row: UserRoute; Insert: Partial<UserRoute>; Update: Partial<UserRoute> };
      activity_logs: { Row: ActivityLog; Insert: Partial<ActivityLog>; Update: Partial<ActivityLog> };
      badges: { Row: Badge; Insert: Partial<Badge>; Update: Partial<Badge> };
      user_badges: { Row: UserBadge; Insert: Partial<UserBadge>; Update: Partial<UserBadge> };
    };
  };
}
