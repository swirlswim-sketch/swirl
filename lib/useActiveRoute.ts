"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import type { LogSheetSubmission } from "@/components/activity/LogSheet";
import type { Profile, Route, RouteCheckpoint, UserRoute } from "@/types/database";

export interface LogSwimResult {
  xpEarned: number;
  newDistanceM: number;
  routeTotalM: number;
  routeCompleted: boolean;
  newStreakDays: number;
  newlyPassedCheckpoints: RouteCheckpoint[];
  newlyEarnedBadges: import("@/types/database").Badge[];
}

/**
 * Shared by the dashboard and the /log page: fetches the signed-in user's
 * profile and active route (with its checkpoints), and exposes a `logSwim`
 * mutation that posts to /api/activities and folds the result into local
 * state, so both pages see the same optimistic update after a swim.
 */
export function useActiveRoute() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRoute, setUserRoute] = useState<UserRoute | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [checkpoints, setCheckpoints] = useState<RouteCheckpoint[]>([]);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const [{ data: profileData }, { data: userRouteData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("user_routes").select("*").eq("user_id", user.id).eq("is_active", true).limit(1).maybeSingle(),
    ]);

    setProfile(profileData ?? null);
    setUserRoute(userRouteData ?? null);

    if (userRouteData?.route_id) {
      const [{ data: routeData }, { data: checkpointData }] = await Promise.all([
        supabase.from("routes").select("*").eq("id", userRouteData.route_id).single(),
        supabase.from("route_checkpoints").select("*").eq("route_id", userRouteData.route_id).order("order_index"),
      ]);
      setRoute(routeData ?? null);
      setCheckpoints(checkpointData ?? []);
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function logSwim(data: LogSheetSubmission): Promise<LogSwimResult> {
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distance_m: data.distanceM,
        duration_seconds: data.durationSeconds,
        logged_at: data.loggedAt,
        notes: data.notes,
      }),
    });
    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error ?? "Couldn't log that swim");
    }

    setUserRoute((prev) =>
      prev
        ? {
            ...prev,
            current_distance_m: result.newDistanceM,
            ...(result.routeCompleted ? { completed_at: new Date().toISOString(), is_active: false } : {}),
          }
        : prev
    );
    setProfile((prev) =>
      prev
        ? {
            ...prev,
            total_distance_m: prev.total_distance_m + data.distanceM,
            xp: prev.xp + result.xpEarned,
            streak_days: result.newStreakDays,
            last_activity_date: data.loggedAt,
          }
        : prev
    );

    return result as LogSwimResult;
  }

  return { loading, profile, userRoute, route, checkpoints, logSwim };
}
