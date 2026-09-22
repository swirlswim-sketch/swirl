"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDistance } from "@/lib/units";
import { getMilestoneCopy, pickHeadlineBadge } from "@/lib/copy";
import { useActiveRoute } from "@/lib/useActiveRoute";
import Header from "@/components/layout/Header";
import MapboxRoute from "@/components/map/MapboxRoute";
import Sheet from "@/components/ui/Sheet";
import LogSheet, { type LogSheetSubmission } from "@/components/activity/LogSheet";
import ProgressBar from "@/components/ui/ProgressBar";
import Toast from "@/components/ui/Toast";
import MilestoneOverlay from "@/components/ui/MilestoneOverlay";
import Button from "@/components/ui/Button";

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
  const { loading, profile, userRoute, route, checkpoints, logSwim } = useActiveRoute();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);

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

    let result;
    try {
      result = await logSwim(data);
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : "Couldn't log that swim");
      return;
    }
    setSubmitting(false);
    setSheetOpen(false);

    const badges = result.newlyEarnedBadges ?? [];
    const checkpointsPassed = result.newlyPassedCheckpoints ?? [];

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
    <main className="relative h-screen overflow-hidden bg-deep md:flex">
      <div className="absolute inset-x-0 top-0 h-[65vh] md:static md:h-screen md:w-[70%]">
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

      <div className="absolute inset-x-0 bottom-0 top-[65vh] flex flex-col gap-3 overflow-y-auto rounded-t-card bg-white p-6 pb-20 shadow-card md:static md:h-screen md:w-[30%] md:rounded-none md:pb-6 md:shadow-none">
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

        <Button className="mt-2 hidden md:flex" onClick={() => setSheetOpen(true)}>
          Log a swim
        </Button>
      </div>

      <button
        onClick={() => setSheetOpen(true)}
        className="fixed bottom-20 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-pill bg-blue text-[28px] text-white shadow-card md:hidden"
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
