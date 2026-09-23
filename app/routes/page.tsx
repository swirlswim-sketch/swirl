"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/lib/supabase";
import { formatDistance } from "@/lib/units";
import { isPremium, requiresPremium } from "@/lib/premium";
import { routePreviewImageUrl, searchPlaces, haversineDistanceM, type GeocodeResult } from "@/lib/mapbox";
import { displayDistanceToMetres } from "@/lib/units";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import ProgressBar from "@/components/ui/ProgressBar";
import type { Profile, Route, UserRoute, UnitsPreference } from "@/types/database";

// See app/dashboard/page.tsx for why this is needed.
export const dynamic = "force-dynamic";

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

  // A route with zero distance logged isn't really "using up" the free
  // tier's one-active-route slot -- only gate switching once there's actual
  // progress that would be lost.
  const activeUserRoute = userRoutes.find((ur) => ur.is_active) ?? null;
  const hasActiveProgress = !!activeUserRoute && activeUserRoute.current_distance_m > 0;
  const units = profile?.units_preference ?? "km";

  async function handleStartRoute(route: Route) {
    if (!profile) return;
    setError(null);

    if (hasActiveProgress && requiresPremium("multiple_active_routes") && !isPremium(profile)) {
      setUpgradeReason("Finish or drop your current route to start a new one on the free plan.");
      return;
    }

    setStartingRouteId(route.id);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Free users are capped at one active route, so starting a new one
    // (past the zero-progress check above) replaces it. Premium users
    // aren't capped -- this should add alongside their existing routes,
    // never silently drop one.
    if (activeUserRoute && activeUserRoute.route_id !== route.id && !isPremium(profile)) {
      await supabase.from("user_routes").update({ is_active: false }).eq("id", activeUserRoute.id);
    }

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

  async function handleCreateCustomGoal(goal: { name: string; distanceM: number; geojson: GeoJSON.LineString | null }) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !profile) return;

    if (hasActiveProgress && requiresPremium("multiple_active_routes") && !isPremium(profile)) {
      setCustomGoalOpen(false);
      setUpgradeReason("Finish or drop your current route to start a new one on the free plan.");
      return;
    }

    if (activeUserRoute && !isPremium(profile)) {
      await supabase.from("user_routes").update({ is_active: false }).eq("id", activeUserRoute.id);
    }

    const { error: insertError } = await supabase.from("user_routes").insert({
      user_id: user.id,
      route_id: null,
      custom_name: goal.name,
      custom_distance_m: goal.distanceM,
      custom_geojson: goal.geojson,
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
        ) : filteredRoutes.length === 0 && search.trim().length > 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-card bg-white p-8 text-center">
            <p className="text-[15px] text-slate">No routes match &ldquo;{search}&rdquo;.</p>
            <p className="text-[13px] text-slate">
              Not in our list yet? Search for the real place instead and swim it as a custom goal.
            </p>
            <Button onClick={handleCustomGoalTap}>Search real places</Button>
          </div>
        ) : (
          filteredRoutes.map((route) => {
            const userRoute = userRouteFor(route.id);
            const fraction =
              userRoute && route.total_distance_m > 0
                ? Math.min(userRoute.current_distance_m / route.total_distance_m, 1)
                : 0;
            const previewUrl = routePreviewImageUrl(route.geojson);

            return (
              <div key={route.id} className="overflow-hidden rounded-card bg-white shadow-card">
                {previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewUrl} alt="" className="h-32 w-full bg-deep object-cover" />
                ) : (
                  <div className="h-32 w-full" style={{ background: "linear-gradient(135deg, #0057FF, #14B8A6)" }} />
                )}
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
        <CustomGoalForm
          units={units}
          initialStartQuery={search}
          onSubmit={handleCreateCustomGoal}
          onCancel={() => setCustomGoalOpen(false)}
        />
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

/** Debounced Mapbox place search for a single input -- shared by the start/end fields below. */
function usePlaceSearch(initialQuery = "") {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [selected, setSelected] = useState<GeocodeResult | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (selected && selected.placeName === query) return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      const found = await searchPlaces(query);
      setResults(found);
      setSearching(false);
    }, 300);
    return () => clearTimeout(handle);
  }, [query, selected]);

  function select(result: GeocodeResult) {
    setSelected(result);
    setQuery(result.placeName);
    setResults([]);
  }

  function change(value: string) {
    setQuery(value);
    if (selected) setSelected(null);
  }

  return { query, results, selected, searching, change, select };
}

function PlaceSearchField({
  label,
  placeholder,
  search,
}: {
  label: string;
  placeholder: string;
  search: ReturnType<typeof usePlaceSearch>;
}) {
  return (
    <label className="relative flex flex-col gap-1">
      <span className="text-[12px] font-medium text-slate">{label}</span>
      <input
        type="text"
        placeholder={placeholder}
        value={search.query}
        onChange={(e) => search.change(e.target.value)}
        className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep placeholder:text-slate focus:border-blue focus:outline-none"
      />
      {search.results.length > 0 && (
        <div className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-card bg-white shadow-card">
          {search.results.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => search.select(result)}
              className="block w-full px-4 py-2.5 text-left text-[14px] text-deep hover:bg-surface"
            >
              {result.placeName}
            </button>
          ))}
        </div>
      )}
    </label>
  );
}

function CustomGoalForm({
  units,
  initialStartQuery,
  onSubmit,
  onCancel,
}: {
  units: UnitsPreference;
  initialStartQuery?: string;
  onSubmit: (goal: { name: string; distanceM: number; geojson: GeoJSON.LineString | null }) => void;
  onCancel: () => void;
}) {
  const [mode, setMode] = useState<"search" | "manual">("search");

  const start = usePlaceSearch(initialStartQuery);
  const end = usePlaceSearch();
  const searchDistanceM =
    start.selected && end.selected ? haversineDistanceM(start.selected.center, end.selected.center) : null;

  const [manualName, setManualName] = useState("");
  const [manualDistance, setManualDistance] = useState("");
  const manualDistanceValue = parseFloat(manualDistance);
  const canSubmitManual =
    manualName.trim().length > 0 && Number.isFinite(manualDistanceValue) && manualDistanceValue > 0;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "search") {
      if (!start.selected || !end.selected || !searchDistanceM) return;
      onSubmit({
        name: `${start.selected.shortName} to ${end.selected.shortName}`,
        distanceM: searchDistanceM,
        geojson: { type: "LineString", coordinates: [start.selected.center, end.selected.center] },
      });
    } else {
      if (!canSubmitManual) return;
      onSubmit({
        name: manualName.trim(),
        distanceM: displayDistanceToMetres(manualDistanceValue, units),
        geojson: null,
      });
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <h3 className="font-display text-[20px] font-semibold text-deep">Custom goal</h3>

      <div className="flex rounded-pill bg-surface p-1">
        {(["search", "manual"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={clsx(
              "flex-1 rounded-pill py-2 text-[13px] font-medium",
              mode === m ? "bg-white text-deep shadow-card" : "text-slate"
            )}
          >
            {m === "search" ? "Search a route" : "Set a distance"}
          </button>
        ))}
      </div>

      {mode === "search" ? (
        <>
          <PlaceSearchField label="Start" placeholder="e.g. Loch Lomond" search={start} />
          <PlaceSearchField label="Finish" placeholder="e.g. Balloch" search={end} />
          {searchDistanceM != null && (
            <p className="text-[13px] text-slate">
              Straight-line distance: <span className="font-semibold text-deep">{formatDistance(searchDistanceM, units)}</span>
            </p>
          )}
        </>
      ) : (
        <>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-slate">Goal name</span>
            <input
              type="text"
              placeholder="e.g. Around the lake"
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep placeholder:text-slate focus:border-blue focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-slate">Distance ({units})</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              placeholder="10"
              value={manualDistance}
              onChange={(e) => setManualDistance(e.target.value)}
              className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep placeholder:text-slate focus:border-blue focus:outline-none"
            />
          </label>
        </>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="secondary" fullWidth onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          fullWidth
          disabled={mode === "search" ? !searchDistanceM : !canSubmitManual}
        >
          Create goal
        </Button>
      </div>
    </form>
  );
}
