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
 * Shared by the dashboard and the /log page. A user can have several
 * concurrent active routes (Swirl Pro's "multiple active routes" feature),
 * so this fetches all of them and tracks which one is currently selected
 * for viewing/logging -- exposing a `switchRoute` to change that and a
 * `dropRoute` to abandon one. `logSwim` posts to /api/activities against
 * whichever route is selected (or an explicit id override) and folds the
 * result into local state, so both pages see the same optimistic update.
 */
export function useActiveRoute() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeUserRoutes, setActiveUserRoutes] = useState<UserRoute[]>([]);
  const [selectedUserRouteId, setSelectedUserRouteId] = useState<string | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [checkpoints, setCheckpoints] = useState<RouteCheckpoint[]>([]);
  const [routeNamesById, setRouteNamesById] = useState<Record<string, string>>({});

  const userRoute = activeUserRoutes.find((ur) => ur.id === selectedUserRouteId) ?? null;

  /** Display name for any active user_route, not just the selected one -- used by the route switcher. */
  function nameFor(ur: UserRoute): string {
    return (ur.route_id ? routeNamesById[ur.route_id] : ur.custom_name) ?? "Custom goal";
  }

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const [{ data: profileData }, { data: userRoutesData }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase
        .from("user_routes")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("started_at", { ascending: true }),
    ]);

    setProfile(profileData ?? null);
    const routes = userRoutesData ?? [];
    setActiveUserRoutes(routes);
    setSelectedUserRouteId((prev) => (prev && routes.some((r) => r.id === prev) ? prev : (routes[0]?.id ?? null)));

    const routeIds = Array.from(new Set(routes.map((ur) => ur.route_id).filter((id): id is string => !!id)));
    if (routeIds.length > 0) {
      const { data: namedRoutes } = await supabase.from("routes").select("id,name").in("id", routeIds);
      setRouteNamesById(Object.fromEntries((namedRoutes ?? []).map((r) => [r.id, r.name])));
    }

    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!userRoute?.route_id) {
      setRoute(null);
      setCheckpoints([]);
      return;
    }
    let cancelled = false;
    Promise.all([
      supabase.from("routes").select("*").eq("id", userRoute.route_id).single(),
      supabase.from("route_checkpoints").select("*").eq("route_id", userRoute.route_id).order("order_index"),
    ]).then(([{ data: routeData }, { data: checkpointData }]) => {
      if (cancelled) return;
      setRoute(routeData ?? null);
      setCheckpoints(checkpointData ?? []);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userRoute?.route_id]);

  function switchRoute(userRouteId: string) {
    setSelectedUserRouteId(userRouteId);
  }

  async function dropRoute(userRouteId: string) {
    await supabase.from("user_routes").update({ is_active: false }).eq("id", userRouteId);
    setActiveUserRoutes((prev) => {
      const next = prev.filter((ur) => ur.id !== userRouteId);
      setSelectedUserRouteId((current) => (current === userRouteId ? (next[0]?.id ?? null) : current));
      return next;
    });
  }

  async function logSwim(data: LogSheetSubmission, userRouteIdOverride?: string): Promise<LogSwimResult> {
    const targetId = userRouteIdOverride ?? selectedUserRouteId;
    const res = await fetch("/api/activities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        distance_m: data.distanceM,
        duration_seconds: data.durationSeconds,
        logged_at: data.loggedAt,
        notes: data.notes,
        user_route_id: targetId,
      }),
    });
    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.error ?? "Couldn't log that swim");
    }

    setActiveUserRoutes((prev) =>
      prev.map((ur) =>
        ur.id === targetId
          ? {
              ...ur,
              current_distance_m: result.newDistanceM,
              ...(result.routeCompleted ? { completed_at: new Date().toISOString(), is_active: false } : {}),
            }
          : ur
      )
    );
    if (result.routeCompleted && targetId) {
      setSelectedUserRouteId((current) =>
        current === targetId ? (activeUserRoutes.find((ur) => ur.id !== targetId)?.id ?? null) : current
      );
    }
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

  return {
    loading,
    profile,
    activeUserRoutes,
    userRoute,
    selectedUserRouteId,
    switchRoute,
    dropRoute,
    nameFor,
    route,
    checkpoints,
    logSwim,
  };
}
