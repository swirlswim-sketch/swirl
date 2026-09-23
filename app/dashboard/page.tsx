"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { formatDistance } from "@/lib/units";
import { routePreviewImageUrl } from "@/lib/mapbox";
import { getMilestoneCopy, pickHeadlineBadge } from "@/lib/copy";
import { useActiveRoute } from "@/lib/useActiveRoute";
import Header from "@/components/layout/Header";
import Sheet from "@/components/ui/Sheet";
import LogSheet, { type LogSheetSubmission } from "@/components/activity/LogSheet";
import ProgressBar from "@/components/ui/ProgressBar";
import Toast from "@/components/ui/Toast";
import MilestoneOverlay from "@/components/ui/MilestoneOverlay";
import Button from "@/components/ui/Button";
import Avatar from "@/components/ui/Avatar";
import BadgeTile from "@/components/ui/Badge";
import type { Badge, Route, RouteCheckpoint, UnitsPreference, UserRoute } from "@/types/database";

// Always behind auth, never worth statically prerendering -- and without
// this, Next.js tries to prerender it at build time, which runs this
// client component's top-level createClient() call with no env vars
// available and crashes the build.
export const dynamic = "force-dynamic";

interface ToastState {
  variant: "small" | "medium";
  message: string;
}

interface OverlayState {
  title: string;
  subtitle: string;
  showRipple?: boolean;
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div>
      <p className="font-display text-[22px] font-bold text-deep">{value}</p>
      <p className="text-[11px] font-medium text-slate">{label}</p>
    </div>
  );
}

function ActiveRouteCard({
  userRoute,
  route,
  checkpoints,
  units,
  dropping,
  onLog,
  onDrop,
}: {
  userRoute: UserRoute;
  route: Route | null;
  checkpoints: RouteCheckpoint[];
  units: UnitsPreference;
  dropping: boolean;
  onLog: () => void;
  onDrop: () => void;
}) {
  const currentDistanceM = userRoute.current_distance_m;
  const totalDistanceM = route?.total_distance_m ?? userRoute.custom_distance_m ?? 0;
  const fraction = totalDistanceM > 0 ? Math.min(currentDistanceM / totalDistanceM, 1) : 0;
  const nextCheckpoint = checkpoints.find((cp) => cp.distance_from_start_m > currentDistanceM);
  const geojson = route?.geojson ?? userRoute.custom_geojson ?? null;
  const previewUrl = routePreviewImageUrl(geojson, 640, 240);
  const name = route?.name ?? userRoute.custom_name ?? "Custom goal";

  return (
    <div className="overflow-hidden rounded-card bg-white shadow-card">
      {previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={previewUrl} alt="" className="h-32 w-full bg-deep object-cover" />
      ) : (
        <div className="h-32 w-full" style={{ background: "linear-gradient(135deg, #0057FF, #14B8A6)" }} />
      )}

      <div className="flex flex-col gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-[17px] font-semibold leading-tight text-deep">{name}</h3>
          <button
            disabled={dropping}
            onClick={onDrop}
            className="shrink-0 text-[12px] font-medium text-slate underline-offset-2 hover:underline"
          >
            Drop
          </button>
        </div>

        <ProgressBar fraction={fraction} />

        <div className="flex items-center justify-between text-[14px] text-deep">
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
        ) : fraction >= 1 ? (
          <p className="text-[13px] text-slate">Route complete.</p>
        ) : null}

        <Button onClick={onLog} className="mt-1">
          Log a swim
        </Button>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { loading, profile, activeUserRoutes, nameFor, routeFor, checkpointsFor, dropRoute, logSwim } =
    useActiveRoute();
  const [droppingId, setDroppingId] = useState<string | null>(null);
  const [loggingRouteId, setLoggingRouteId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);
  const [allBadges, setAllBadges] = useState<Badge[]>([]);
  const [earnedBadgeIds, setEarnedBadgeIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!toast || toast.variant !== "small") return;
    const timer = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    if (loading || !profile) return;
    const supabase = createClient();
    Promise.all([
      supabase.from("badges").select("*"),
      supabase.from("user_badges").select("badge_id").eq("user_id", profile.id),
    ]).then(([{ data: badges }, { data: userBadges }]) => {
      setAllBadges(badges ?? []);
      setEarnedBadgeIds(new Set((userBadges ?? []).map((b) => b.badge_id)));
    });
  }, [loading, profile]);

  const units = profile?.units_preference ?? "km";
  const earnedCount = earnedBadgeIds.size;
  const hasHistory = earnedCount > 0 || (profile?.xp ?? 0) > 0;

  function openLogSheet(userRouteId: string) {
    setLoggingRouteId(userRouteId);
    setError(null);
    setSheetOpen(true);
  }

  async function handleLogSwim(data: LogSheetSubmission) {
    if (!loggingRouteId) return;
    const targetUserRoute = activeUserRoutes.find((ur) => ur.id === loggingRouteId);
    const targetRoute = targetUserRoute ? routeFor(targetUserRoute) : null;

    setSubmitting(true);
    setError(null);

    let result;
    try {
      result = await logSwim(data, loggingRouteId);
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Couldn't log that swim");
      return;
    }
    setSubmitting(false);
    setSheetOpen(false);

    const routeName = targetRoute?.name ?? targetUserRoute?.custom_name;
    const badges = result.newlyEarnedBadges ?? [];
    const checkpointsPassed = result.newlyPassedCheckpoints ?? [];

    if (result.routeCompleted) {
      setOverlay({ title: routeName ?? "Route", subtitle: "Complete.", showRipple: true });
    } else if (badges.length > 0) {
      const headline = pickHeadlineBadge(badges)!;
      setOverlay({ title: headline.name, subtitle: getMilestoneCopy(headline, routeName) });
    } else if (checkpointsPassed.length > 0) {
      setToast({ variant: "medium", message: `${checkpointsPassed[0].name} reached · +${result.xpEarned} XP` });
    } else {
      setToast({
        variant: "small",
        message: `${formatDistance(data.distanceM, units)} added · +${result.xpEarned} XP`,
      });
    }
  }

  async function handleDrop(userRoute: UserRoute) {
    if (!window.confirm(`Drop ${nameFor(userRoute)}? Your progress on it will be lost.`)) return;
    setDroppingId(userRoute.id);
    await dropRoute(userRoute.id);
    setDroppingId(null);
  }

  if (loading) {
    return (
      <main className="flex h-screen items-center justify-center bg-surface">
        <span className="font-display text-[20px] font-semibold text-deep">Swirl</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface pb-24">
      {profile && <Header profile={profile} light />}

      <section className="flex flex-col items-center gap-5 px-6 pb-8 pt-4 text-center">
        <Avatar displayName={profile?.display_name ?? null} avatarUrl={profile?.avatar_url ?? null} size={64} />

        <div>
          <p className="text-[14px] text-slate">
            {hasHistory ? `Welcome back, ${profile?.display_name ?? "swimmer"}` : `Hey ${profile?.display_name ?? "there"}`}
          </p>
          <h1 className="mt-1 font-display text-[24px] font-semibold text-deep">
            {"Pick somewhere. We'll help you get there."}
          </h1>
        </div>

        {hasHistory && profile && (
          <div className="flex gap-8">
            <Stat value={profile.xp.toLocaleString()} label="XP" />
            <Stat value={profile.streak_days} label="Day streak" />
            <Stat value={earnedCount} label="Badges" />
          </div>
        )}

        <Link href="/routes" className="rounded-pill bg-blue px-6 py-3 text-[15px] font-semibold text-white">
          Browse routes
        </Link>
      </section>

      {activeUserRoutes.length > 0 && (
        <section className="flex flex-col gap-4 px-6 pb-8">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-slate">
            Active {activeUserRoutes.length === 1 ? "route" : "routes"}
          </h2>
          {activeUserRoutes.map((ur) => (
            <ActiveRouteCard
              key={ur.id}
              userRoute={ur}
              route={routeFor(ur)}
              checkpoints={checkpointsFor(ur)}
              units={units}
              dropping={droppingId === ur.id}
              onLog={() => openLogSheet(ur.id)}
              onDrop={() => handleDrop(ur)}
            />
          ))}
        </section>
      )}

      {allBadges.length > 0 && (
        <section className="px-6">
          <p className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-slate">
            {hasHistory ? "Your badges" : "Badges waiting for you"}
          </p>
          <div className="grid grid-cols-4 gap-4">
            {allBadges.slice(0, 8).map((badge) => (
              <BadgeTile key={badge.id} name={badge.name} earned={earnedBadgeIds.has(badge.id)} />
            ))}
          </div>
        </section>
      )}

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
