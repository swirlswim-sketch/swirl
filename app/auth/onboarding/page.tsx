"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/lib/supabase";
import { formatDistance } from "@/lib/units";
import Button from "@/components/ui/Button";
import MapboxRoute from "@/components/map/MapboxRoute";
import type { Badge, Route, RouteCheckpoint } from "@/types/database";

const PENDING_ROUTE_KEY = "swirl_pending_route_id";

const DIFFICULTY_LABEL: Record<string, string> = {
  shallow: "Shallow",
  open_water: "Open water",
  deep: "Deep",
};

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<Step>(1);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [checkpoints, setCheckpoints] = useState<RouteCheckpoint[]>([]);
  const [completionBadge, setCompletionBadge] = useState<Badge | null>(null);
  const [isAuthed, setIsAuthed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setIsAuthed(!!data.user));
    supabase
      .from("routes")
      .select("*")
      .eq("is_active", true)
      .order("id")
      .then(({ data }) => setRoutes(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!selectedRouteId) {
      setCheckpoints([]);
      setCompletionBadge(null);
      return;
    }
    supabase
      .from("route_checkpoints")
      .select("*")
      .eq("route_id", selectedRouteId)
      .order("order_index")
      .then(({ data }) => {
        const points = data ?? [];
        setCheckpoints(points);
        const completion = points[points.length - 1];
        if (completion?.badge_id) {
          supabase
            .from("badges")
            .select("*")
            .eq("id", completion.badge_id)
            .single()
            .then(({ data }) => setCompletionBadge(data ?? null));
        } else {
          setCompletionBadge(null);
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRouteId]);

  async function createUserRoute(userId: string) {
    if (!selectedRouteId) return;
    await supabase.from("user_routes").insert({
      user_id: userId,
      route_id: selectedRouteId,
      current_distance_m: 0,
      is_active: true,
    });
  }

  async function handleStartSwimming() {
    setError(null);

    if (isAuthed) {
      setSubmitting(true);
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        await createUserRoute(data.user.id);
      }
      setSubmitting(false);
      router.push("/dashboard");
      router.refresh();
      return;
    }

    setStep(3);
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password });

    if (signUpError) {
      setError(signUpError.message);
      setSubmitting(false);
      return;
    }

    if (!data.session || !data.user) {
      // Email confirmation required: stash the route choice so login can finish setup.
      if (selectedRouteId) localStorage.setItem(PENDING_ROUTE_KEY, selectedRouteId);
      setNeedsConfirmation(true);
      setSubmitting(false);
      return;
    }

    if (displayName.trim()) {
      await supabase.from("profiles").update({ display_name: displayName.trim() }).eq("id", data.user.id);
    }
    await createUserRoute(data.user.id);

    setSubmitting(false);
    router.push("/dashboard");
    router.refresh();
  }

  if (needsConfirmation) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-6 text-center">
        <h1 className="font-display text-2xl font-semibold text-deep">Swirl</h1>
        <p className="max-w-sm text-[15px] text-slate">
          Check your email to confirm your account. Once you sign in, {selectedRoute?.name ?? "your route"} will
          be waiting for you.
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-deep">
      <MapboxRoute
        routes={routes}
        selectedRouteId={selectedRouteId}
        checkpoints={step === 2 ? checkpoints : []}
        tight={step === 2}
        className="absolute inset-0"
      />
      <div className="pointer-events-none absolute inset-0 bg-deep/20" />

      {step === 1 && (
        <div className="absolute inset-0 flex flex-col justify-between">
          <div className="bg-gradient-to-b from-deep/80 to-transparent px-6 pb-16 pt-16 text-center">
            <h1 className="font-display text-3xl font-bold text-white">Pick somewhere to swim to</h1>
          </div>

          <div className="flex flex-col gap-4 bg-gradient-to-t from-deep/90 via-deep/60 to-transparent px-6 pb-8 pt-16">
            <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2">
              {routes.map((route) => (
                <button
                  key={route.id}
                  onClick={() => setSelectedRouteId(route.id)}
                  className={clsx(
                    "w-56 shrink-0 snap-start rounded-card bg-white p-4 text-left shadow-card transition-transform",
                    selectedRouteId === route.id && "ring-2 ring-blue"
                  )}
                >
                  <p className="font-display text-[16px] font-semibold text-deep">{route.name}</p>
                  <p className="mt-1 text-[14px] text-slate">{formatDistance(route.total_distance_m, "km")}</p>
                  {route.difficulty && (
                    <span className="mt-2 inline-block rounded-pill bg-surface px-3 py-1 text-[12px] font-medium text-slate">
                      {DIFFICULTY_LABEL[route.difficulty]}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <Button fullWidth disabled={!selectedRouteId} onClick={() => setStep(2)}>
              Choose this route
            </Button>
          </div>
        </div>
      )}

      {step === 2 && selectedRoute && (
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="flex flex-col gap-3 rounded-t-card bg-white px-6 pb-8 pt-6 shadow-card">
            <h2 className="font-display text-[22px] font-semibold text-deep">{selectedRoute.name}</h2>
            <p className="text-[15px] text-slate">{formatDistance(selectedRoute.total_distance_m, "km")}</p>

            {checkpoints[1] && (
              <p className="text-[15px] text-deep">
                First stop: {checkpoints[1].name} ·{" "}
                {formatDistance(checkpoints[1].distance_from_start_m, "km")} in
              </p>
            )}

            <div className="mt-2 flex items-center gap-3 rounded-card bg-surface p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-pill bg-gold text-white">🏅</div>
              <div>
                <p className="text-[14px] font-semibold text-deep">
                  {completionBadge?.name ?? "Route complete"}
                </p>
                <p className="text-[12px] text-slate">
                  {completionBadge?.description ?? "Earned when you finish the route"}
                </p>
              </div>
            </div>

            {error && <p className="text-[14px] text-[#d92d20]">{error}</p>}

            <Button fullWidth loading={submitting} onClick={handleStartSwimming}>
              Start swimming
            </Button>
          </div>
        </div>
      )}

      {step === 3 && selectedRoute && (
        <div className="absolute inset-0 flex items-end justify-center bg-deep/40">
          <div className="w-full rounded-t-card bg-white px-6 pb-8 pt-6 shadow-card">
            <h2 className="mb-1 font-display text-[20px] font-semibold text-deep">Create your account</h2>
            <p className="mb-6 text-[14px] text-slate">Swimming to {selectedRoute.name}</p>

            <form onSubmit={handleCreateAccount} className="flex flex-col gap-4">
              <input
                type="text"
                required
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep placeholder:text-slate focus:border-blue focus:outline-none"
              />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep placeholder:text-slate focus:border-blue focus:outline-none"
              />
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep placeholder:text-slate focus:border-blue focus:outline-none"
              />

              {error && <p className="text-[14px] text-[#d92d20]">{error}</p>}

              <Button type="submit" fullWidth loading={submitting}>
                Let&apos;s go
              </Button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
