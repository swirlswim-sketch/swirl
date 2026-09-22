"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { formatDistance } from "@/lib/units";
import { getMilestoneCopy, pickHeadlineBadge } from "@/lib/copy";
import Header from "@/components/layout/Header";
import MapboxRoute from "@/components/map/MapboxRoute";
import Sheet from "@/components/ui/Sheet";
import LogSheet, { type LogSheetSubmission } from "@/components/activity/LogSheet";
import ProgressBar from "@/components/ui/ProgressBar";
import Toast from "@/components/ui/Toast";
import MilestoneOverlay from "@/components/ui/MilestoneOverlay";
import type { Badge, Profile, Route, RouteCheckpoint, UserRoute } from "@/types/database";

interface ToastState {
  variant: "small" | "medium";
  message: string;
}

interface OverlayState {
  title: string;
  subtitle: string;
  showRipple?: boolean;
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRoute, setUserRoute] = useState<UserRoute | null>(null);
  const [route, setRoute] = useState<Route | null>(null);
  const [checkpoints, setCheckpoints] = useState<RouteCheckpoint[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);

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

  useEffect(() => {
    if (!toast || toast.variant !== "small") return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  const currentDistanceM = userRoute?.current_distance_m ?? 0;
  const totalDistanceM = route?.total_distance_m ?? userRoute?.custom_distance_m ?? 0;
  const fraction = totalDistanceM > 0 ? Math.min(currentDistanceM / totalDistanceM, 1) : 0;
  const nextCheckpoint = checkpoints.find((cp) => cp.distance_from_start_m > currentDistanceM);
  const units = profile?.units_preference ?? "km";

  async function handleLogSwim(data: LogSheetSubmission) {
    setSubmitting(true);
    setError(null);

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
    setSubmitting(false);

    if (!res.ok) {
      setError(result.error ?? "Couldn't log that swim");
      return;
    }

    setSheetOpen(false);
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

    const badges: Badge[] = result.newlyEarnedBadges ?? [];
    const checkpointsPassed: RouteCheckpoint[] = result.newlyPassedCheckpoints ?? [];

    if (result.routeCompleted) {
      setOverlay({ title: route?.name ?? "Route", subtitle: "Complete.", showRipple: true });
    } else if (badges.length > 0) {
      const headline = pickHeadlineBadge(badges)!;
      setOverlay({ title: headline.name, subtitle: getMilestoneCopy(headline, route?.name) });
    } else if (checkpointsPassed.length > 0) {
      setToast({ variant: "medium", message: `${checkpointsPassed[0].name} reached · +${result.xpEarned} XP` });
    } else {
      setToast({
        variant: "small",
        message: `${formatDistance(data.distanceM, units)} added · +${result.xpEarned} XP`,
      });
    }
  }

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center bg-surface">
        <span className="font-display text-[20px] font-semibold text-deep">Swirl</span>
      </main>
    );
  }

  if (!userRoute) {
    return (
      <main className="flex h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
        <h1 className="font-display text-[24px] font-semibold text-deep">
          {"Pick somewhere. We'll help you get there."}
        </h1>
        <Link href="/routes" className="rounded-pill bg-blue px-6 py-3 text-[15px] font-semibold text-white">
          Browse routes
        </Link>
      </main>
    );
  }

  return (
    <main className="relative h-screen overflow-hidden bg-deep">
      <div className="absolute inset-x-0 top-0" style={{ height: "65vh" }}>
        <MapboxRoute
          routes={route ? [{ id: route.id, geojson: route.geojson }] : []}
          selectedRouteId={route?.id ?? null}
          checkpoints={checkpoints}
          currentDistanceM={currentDistanceM}
          userPositionFraction={fraction}
          tight
          className="absolute inset-0"
        />
        {profile && <Header profile={profile} className="relative z-10" />}
      </div>

      <div
        className="absolute inset-x-0 bottom-0 flex flex-col gap-3 rounded-t-card bg-white p-6 shadow-card"
        style={{ top: "65vh" }}
      >
        <h2 className="font-display text-[22px] font-semibold text-deep">
          {route?.name ?? userRoute.custom_name ?? "Custom goal"}
        </h2>
        <ProgressBar fraction={fraction} />
        <div className="flex items-center justify-between text-[15px] text-deep">
          <span>
            {formatDistance(currentDistanceM, units)} of {formatDistance(totalDistanceM, units)}
          </span>
          <span className="text-[12px] font-medium text-slate">{Math.round(fraction * 100)}%</span>
        </div>
        {nextCheckpoint ? (
          <p className="text-[13px] text-slate">
            Next: {nextCheckpoint.name} ·{" "}
            {formatDistance(nextCheckpoint.distance_from_start_m - currentDistanceM, units)} to go
          </p>
        ) : (
          <p className="text-[13px] text-slate">Route complete.</p>
        )}
      </div>

      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-pill bg-blue text-[28px] text-white shadow-card"
        aria-label="Log a swim"
      >
        +
      </button>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)}>
        {error && <p className="mb-3 text-[14px] text-[#d92d20]">{error}</p>}
        <LogSheet unitsPreference={units} onSubmit={handleLogSwim} submitting={submitting} />
      </Sheet>

      {toast && <Toast variant={toast.variant} message={toast.message} onDismiss={() => setToast(null)} />}
      {overlay && (
        <MilestoneOverlay
          title={overlay.title}
          subtitle={overlay.subtitle}
          showRipple={overlay.showRipple}
          onDismiss={() => setOverlay(null)}
        />
      )}
    </main>
  );
}
