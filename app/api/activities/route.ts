import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { calculateXp } from "@/lib/xp";
import {
  getNewlyEarnedDistanceBadges,
  getNewlyEarnedStreakBadges,
  getNewlyPassedCheckpoints,
} from "@/lib/badges";
import type { Badge, RouteCheckpoint } from "@/types/database";

// Implemented in Phase 5: paginated activity history for the current user.
export async function GET() {
  return NextResponse.json({ error: "Not implemented yet" }, { status: 501 });
}

/** "Yesterday, today, or a gap" streak logic, keyed off the activity's own date (not "now"). */
function computeStreak(lastActivityDate: string | null, loggedDate: string, currentStreak: number): number {
  if (!lastActivityDate) return 1;
  if (lastActivityDate === loggedDate) return currentStreak;

  const last = new Date(`${lastActivityDate}T00:00:00Z`).getTime();
  const logged = new Date(`${loggedDate}T00:00:00Z`).getTime();
  const diffDays = Math.round((logged - last) / 86_400_000);

  return diffDays === 1 ? currentStreak + 1 : 1;
}

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const distanceM: number = Number(body.distance_m);
  const durationSeconds: number | null = body.duration_seconds ? Number(body.duration_seconds) : null;
  const activityType: string = body.activity_type ?? "swim";
  const notes: string | null = body.notes ?? null;
  const loggedDate: string = body.logged_at ?? new Date().toISOString().slice(0, 10);
  const userRouteId: string | undefined = body.user_route_id;

  if (!Number.isFinite(distanceM) || distanceM <= 0) {
    return NextResponse.json({ error: "distance_m must be a positive number" }, { status: 400 });
  }

  // A user can have several concurrent active routes (Swirl Pro), so which
  // one to log against must be explicit -- falling back to "whichever the
  // query happens to return first" would silently log against the wrong
  // route. The old single-active-route behavior (no id passed) is kept as a
  // fallback for any caller that hasn't been updated to pass one.
  const userRouteQuery = supabase.from("user_routes").select("*").eq("user_id", user.id).eq("is_active", true);
  const [{ data: profile }, { data: userRoute }, { data: allBadges }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    userRouteId ? userRouteQuery.eq("id", userRouteId).maybeSingle() : userRouteQuery.limit(1).maybeSingle(),
    supabase.from("badges").select("*"),
  ]);

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }
  if (!userRoute) {
    return NextResponse.json({ error: "No active route" }, { status: 400 });
  }

  const badges: Badge[] = allBadges ?? [];
  const isFirstActivity = profile.total_distance_m === 0;

  let checkpoints: RouteCheckpoint[] = [];
  let routeTotalM = userRoute.custom_distance_m ?? 0;
  if (userRoute.route_id) {
    const [{ data: route }, { data: routeCheckpoints }] = await Promise.all([
      supabase.from("routes").select("total_distance_m").eq("id", userRoute.route_id).single(),
      supabase.from("route_checkpoints").select("*").eq("route_id", userRoute.route_id).order("order_index"),
    ]);
    routeTotalM = route?.total_distance_m ?? 0;
    checkpoints = routeCheckpoints ?? [];
  }

  const previousDistanceM = userRoute.current_distance_m;
  const newDistanceM = previousDistanceM + distanceM;
  const wasAlreadyComplete = userRoute.completed_at != null;
  const routeCompleted = !wasAlreadyComplete && routeTotalM > 0 && newDistanceM >= routeTotalM;

  const newStreakDays = computeStreak(profile.last_activity_date, loggedDate, profile.streak_days);

  const newlyPassedCheckpoints = getNewlyPassedCheckpoints(checkpoints, previousDistanceM, newDistanceM);
  const previousTotalDistanceM = profile.total_distance_m;
  const newTotalDistanceM = previousTotalDistanceM + distanceM;

  const newlyEarnedDistanceBadges = getNewlyEarnedDistanceBadges(
    badges,
    previousTotalDistanceM,
    newTotalDistanceM,
    isFirstActivity
  );
  const newlyEarnedStreakBadges = getNewlyEarnedStreakBadges(badges, profile.streak_days, newStreakDays);
  const checkpointBadges = badges.filter((b) => newlyPassedCheckpoints.some((cp) => cp.badge_id === b.id));

  const { totalXp } = calculateXp({
    distanceM,
    streakDays: newStreakDays,
    checkpointsPassed: newlyPassedCheckpoints.length,
    milestonesHit: newlyEarnedDistanceBadges.length,
    routeCompleted,
  });

  const { data: activityLog, error: insertError } = await supabase
    .from("activity_logs")
    .insert({
      user_id: user.id,
      user_route_id: userRoute.id,
      distance_m: distanceM,
      duration_seconds: durationSeconds,
      activity_type: activityType,
      logged_at: new Date().toISOString().slice(0, 10) === loggedDate
        ? new Date().toISOString()
        : `${loggedDate}T12:00:00.000Z`,
      source: "manual",
      notes,
      xp_earned: totalXp,
    })
    .select()
    .single();

  if (insertError || !activityLog) {
    return NextResponse.json({ error: insertError?.message ?? "Failed to log activity" }, { status: 500 });
  }

  await supabase
    .from("user_routes")
    .update({
      current_distance_m: newDistanceM,
      ...(routeCompleted ? { completed_at: new Date().toISOString(), is_active: false } : {}),
    })
    .eq("id", userRoute.id);

  await supabase
    .from("profiles")
    .update({
      total_distance_m: newTotalDistanceM,
      xp: profile.xp + totalXp,
      streak_days: newStreakDays,
      last_activity_date: loggedDate,
    })
    .eq("id", user.id);

  const allNewBadges = [...newlyEarnedDistanceBadges, ...newlyEarnedStreakBadges, ...checkpointBadges];
  if (allNewBadges.length > 0) {
    await supabase
      .from("user_badges")
      .upsert(
        allNewBadges.map((badge) => ({ user_id: user.id, badge_id: badge.id, activity_log_id: activityLog.id })),
        { onConflict: "user_id,badge_id", ignoreDuplicates: true }
      );
  }

  return NextResponse.json({
    activityLog,
    xpEarned: totalXp,
    previousDistanceM,
    newDistanceM,
    routeTotalM,
    routeCompleted,
    newStreakDays,
    newlyPassedCheckpoints,
    newlyEarnedBadges: [...newlyEarnedDistanceBadges, ...newlyEarnedStreakBadges, ...checkpointBadges],
  });
}
