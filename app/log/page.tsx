"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { formatDistance } from "@/lib/units";
import { getMilestoneCopy, pickHeadlineBadge } from "@/lib/copy";
import { useActiveRoute } from "@/lib/useActiveRoute";
import LogSheet, { type LogSheetSubmission } from "@/components/activity/LogSheet";
import Toast from "@/components/ui/Toast";
import MilestoneOverlay from "@/components/ui/MilestoneOverlay";

// See app/dashboard/page.tsx for why this is needed.
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

export default function LogPage() {
  const router = useRouter();
  const { loading, profile, activeUserRoutes, userRoute, switchRoute, nameFor, route, logSwim } = useActiveRoute();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [overlay, setOverlay] = useState<OverlayState | null>(null);

  const units = profile?.units_preference ?? "km";

  function goToDashboard() {
    router.push("/dashboard");
  }

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

    const badges = result.newlyEarnedBadges ?? [];
    const checkpointsPassed = result.newlyPassedCheckpoints ?? [];

    if (result.routeCompleted) {
      setOverlay({ title: route?.name ?? "Route", subtitle: "Complete.", showRipple: true });
    } else if (badges.length > 0) {
      const headline = pickHeadlineBadge(badges)!;
      setOverlay({ title: headline.name, subtitle: getMilestoneCopy(headline, route?.name) });
    } else if (checkpointsPassed.length > 0) {
      setToast({ variant: "medium", message: `${checkpointsPassed[0].name} reached · +${result.xpEarned} XP` });
      setTimeout(goToDashboard, 2000);
    } else {
      setToast({
        variant: "small",
        message: `${formatDistance(data.distanceM, units)} added · +${result.xpEarned} XP`,
      });
      setTimeout(goToDashboard, 2000);
    }
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <span className="font-display text-[20px] font-semibold text-deep">Swirl</span>
      </main>
    );
  }

  if (!userRoute) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
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
    <main className="min-h-screen bg-surface px-6 pb-24 pt-10">
      <h1 className="mb-1 font-display text-[22px] font-semibold text-deep">Log a swim</h1>
      <p className="mb-4 text-[14px] text-slate">{route?.name ?? userRoute.custom_name ?? "Custom goal"}</p>

      {activeUserRoutes.length > 1 && (
        <div className="-mx-1 mb-6 flex gap-2 overflow-x-auto px-1 pb-1">
          {activeUserRoutes.map((ur) => (
            <button
              key={ur.id}
              onClick={() => switchRoute(ur.id)}
              className={clsx(
                "shrink-0 rounded-pill px-3 py-1.5 text-[12px] font-medium",
                ur.id === userRoute.id ? "bg-blue text-white" : "bg-white text-slate shadow-card"
              )}
            >
              {nameFor(ur)}
            </button>
          ))}
        </div>
      )}

      {error && <p className="mb-3 text-[14px] text-[#d92d20]">{error}</p>}
      <LogSheet unitsPreference={units} onSubmit={handleLogSwim} submitting={submitting} />

      {toast && (
        <Toast
          variant={toast.variant}
          message={toast.message}
          onDismiss={() => {
            setToast(null);
            goToDashboard();
          }}
        />
      )}
      {overlay && (
        <MilestoneOverlay
          title={overlay.title}
          subtitle={overlay.subtitle}
          showRipple={overlay.showRipple}
          onDismiss={() => {
            setOverlay(null);
            goToDashboard();
          }}
        />
      )}
    </main>
  );
}
