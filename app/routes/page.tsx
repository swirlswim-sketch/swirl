"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/lib/supabase";
import { formatDistance } from "@/lib/units";
import { isPremium, requiresPremium } from "@/lib/premium";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ProgressBar from "@/components/ui/ProgressBar";
import type { Profile, Route, UserRoute } from "@/types/database";

const ACTIVITY_FILTERS = [
  { value: "all", label: "All" },
  { value: "swim", label: "Swim" },
  { value: "cycle", label: "Cycle" },
  { value: "run", label: "Run" },
  { value: "walk", label: "Walk" },
] as const;

const DIFFICULTY_LABEL: Record<string, string> = {
  shallow: "Shallow",
  open_water: "Open water",
  deep: "Deep",
};

type ActivityFilter = (typeof ACTIVITY_FILTERS)[number]["value"];

export default function RoutesPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [userRoutes, setUserRoutes] = useState<UserRoute[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [search, setSearch] = useState("");
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
  const [startingRouteId, setStartingRouteId] = useState<string | null>(null);
  const [upgradeReason, setUpgradeReason] = useState<string | null>(null);
  const [customGoalOpen, setCustomGoalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const [{ data: routeData }, { data: userRouteData }, { data: profileData }] = await Promise.all([
      supabase.from("routes").select("*").eq("is_active", true).order("id"),
      supabase.from("user_routes").select("*").eq("user_id", user.id),
      supabase.from("profiles").select("*").eq("id", user.id).single(),
    ]);

    setRoutes(routeData ?? []);
    setUserRoutes(userRouteData ?? []);
    setProfile(profileData ?? null);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function userRouteFor(routeId: string): UserRoute | null {
    const forRoute = userRoutes.filter((ur) => ur.route_id === routeId);
    return forRoute.find((ur) => ur.is_active) ?? forRoute.find((ur) => ur.completed_at) ?? null;
  }

  const hasActiveRoute = userRoutes.some((ur) => ur.is_active);
  const units = profile?.units_preference ?? "km";

  async function handleStartRoute(route: Route) {
    if (!profile) return;
    setError(null);

    if (hasActiveRoute && requiresPremium("multiple_active_routes") && !isPremium(profile)) {
      setUpgradeReason("Finish or drop your current route to start a new one on the free plan.");
      return;
    }

    setStartingRouteId(route.id);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: insertError } = await supabase.from("user_routes").insert({
      user_id: user.id,
      route_id: route.id,
      current_distance_m: 0,
      is_active: true,
    });

    setStartingRouteId(null);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    router.push("/dashboard");
  }

  function handleCustomGoalTap() {
    if (!profile) return;
    if (requiresPremium("custom_goals") && !isPremium(profile)) {
      setUpgradeReason("Custom goals are a Swirl Pro feature.");
      return;
    }
    setCustomGoalOpen(true);
  }

  async function handleCreateCustomGoal(name: string, distanceKm: number) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !profile) return;

    if (hasActiveRoute && requiresPremium("multiple_active_routes") && !isPremium(profile)) {
      setCustomGoalOpen(false);
      setUpgradeReason("Finish or drop your current route to start a new one on the free plan.");
      return;
    }

    const { error: insertError } = await supabase.from("user_routes").insert({
      user_id: user.id,
      route_id: null,
      custom_name: name,
      custom_distance_m: distanceKm * 1000,
      current_distance_m: 0,
      is_active: true,
    });

    if (insertError) {
      setError(insertError.message);
      return;
    }
    setCustomGoalOpen(false);
    router.push("/dashboard");
  }

  const filteredRoutes = routes.filter((route) => {
    const matchesSearch = route.name.toLowerCase().includes(search.toLowerCase());
    const matchesActivity = activityFilter === "all" || route.activity_type === activityFilter;
    return matchesSearch && matchesActivity;
  });

  const showComingSoonEmptyState = activityFilter !== "all" && activityFilter !== "swim";

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <span className="font-display text-[20px] font-semibold text-deep">Swirl</span>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface pb-24">
      <div className="sticky top-0 z-10 bg-surface px-4 pb-3 pt-6">
        <input
          type="text"
          placeholder="Search routes"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep placeholder:text-slate focus:border-blue focus:outline-none"
        />

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {ACTIVITY_FILTERS.map((filter) => {
            const comingSoon = filter.value !== "all" && filter.value !== "swim";
            return (
              <button
                key={filter.value}
                onClick={() => setActivityFilter(filter.value)}
                className={clsx(
                  "flex shrink-0 items-center gap-1.5 rounded-pill px-4 py-2 text-[13px] font-medium",
                  activityFilter === filter.value ? "bg-blue text-white" : "bg-white text-slate",
                  comingSoon && activityFilter !== filter.value && "text-mist"
                )}
              >
                {filter.label}
                {comingSoon && (
                  <span className="rounded-pill bg-mist px-2 py-0.5 text-[10px] text-slate">Coming soon</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-4 px-4">
        <button
          onClick={handleCustomGoalTap}
          className="rounded-card border-2 border-dashed border-mist bg-white p-5 text-left"
        >
          <p className="font-display text-[16px] font-semibold text-deep">Custom goal</p>
          <p className="mt-1 text-[13px] text-slate">Set your own distance and route name.</p>
        </button>

        {error && <p className="text-[14px] text-[#d92d20]">{error}</p>}

        {showComingSoonEmptyState ? (
          <div className="flex flex-col items-center gap-2 rounded-card bg-white p-8 text-center">
            <p className="text-[15px] text-slate">
              {ACTIVITY_FILTERS.find((f) => f.value === activityFilter)?.label} routes are coming soon.
            </p>
          </div>
        ) : (
          filteredRoutes.map((route) => {
            const userRoute = userRouteFor(route.id);
            const fraction =
              userRoute && route.total_distance_m > 0
                ? Math.min(userRoute.current_distance_m / route.total_distance_m, 1)
                : 0;

            return (
              <div key={route.id} className="overflow-hidden rounded-card bg-white shadow-card">
                <div className="h-32 w-full" style={{ background: "linear-gradient(135deg, #0057FF, #14B8A6)" }} />
                <div className="flex flex-col gap-2 p-5">
                  <h3 className="font-display text-[16px] font-semibold text-deep">{route.name}</h3>
                  <div className="flex items-center gap-2 text-[12px] font-medium text-slate">
                    <span>{formatDistance(route.total_distance_m, units)}</span>
                    {route.difficulty && (
                      <span className="rounded-pill bg-surface px-2 py-1">{DIFFICULTY_LABEL[route.difficulty]}</span>
                    )}
                    <span className="rounded-pill bg-surface px-2 py-1 capitalize">{route.activity_type}</span>
                  </div>
                  {route.description && <p className="text-[13px] text-slate">{route.description}</p>}

                  {userRoute?.is_active ? (
                    <div className="mt-2 flex flex-col gap-2">
                      <ProgressBar fraction={fraction} />
                      <Button variant="secondary" fullWidth onClick={() => router.push("/dashboard")}>
                        Continue
                      </Button>
                    </div>
                  ) : userRoute?.completed_at ? (
                    <div className="mt-2 flex items-center gap-2 rounded-pill bg-success/10 px-3 py-2 text-[13px] font-medium text-success">
                      <span>✓</span>
                      <span>Completed</span>
                    </div>
                  ) : (
                    <Button fullWidth loading={startingRouteId === route.id} onClick={() => handleStartRoute(route)}>
                      Start route
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <Modal open={customGoalOpen} onClose={() => setCustomGoalOpen(false)}>
        <CustomGoalForm onSubmit={handleCreateCustomGoal} onCancel={() => setCustomGoalOpen(false)} />
      </Modal>

      <Modal open={!!upgradeReason} onClose={() => setUpgradeReason(null)}>
        <div className="flex flex-col items-center gap-3 text-center">
          <h3 className="font-display text-[20px] font-semibold text-deep">Unlock with Swirl Pro</h3>
          <p className="text-[14px] text-slate">{upgradeReason}</p>
          <Button fullWidth onClick={() => setUpgradeReason(null)}>
            Got it
          </Button>
        </div>
      </Modal>
    </main>
  );
}

function CustomGoalForm({
  onSubmit,
  onCancel,
}: {
  onSubmit: (name: string, distanceKm: number) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [distance, setDistance] = useState("");

  const distanceValue = parseFloat(distance);
  const canSubmit = name.trim().length > 0 && Number.isFinite(distanceValue) && distanceValue > 0;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (canSubmit) onSubmit(name.trim(), distanceValue);
      }}
      className="flex flex-col gap-4"
    >
      <h3 className="font-display text-[20px] font-semibold text-deep">Custom goal</h3>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-slate">Goal name</span>
        <input
          type="text"
          placeholder="e.g. Around the lake"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep placeholder:text-slate focus:border-blue focus:outline-none"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[12px] font-medium text-slate">Distance (km)</span>
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.1"
          placeholder="10"
          value={distance}
          onChange={(e) => setDistance(e.target.value)}
          className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep placeholder:text-slate focus:border-blue focus:outline-none"
        />
      </label>
      <div className="flex gap-3">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" fullWidth disabled={!canSubmit}>
          Create goal
        </Button>
      </div>
    </form>
  );
}
