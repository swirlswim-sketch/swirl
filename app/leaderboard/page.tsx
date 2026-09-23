"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/lib/supabase";
import { formatDistance } from "@/lib/units";
import { isPremium, requiresPremium } from "@/lib/premium";
import Avatar from "@/components/ui/Avatar";
import type { Profile, UnitsPreference } from "@/types/database";

// See app/dashboard/page.tsx for why this is needed.
export const dynamic = "force-dynamic";

type Tab = "global" | "friends";
type Period = "all" | "week";

interface LeaderboardRow {
  id: string;
  displayName: string | null;
  avatarUrl: string | null;
  xp: number;
  distanceM: number;
}

function buildLeaderboard(rows: LeaderboardRow[], currentUserId: string) {
  const sorted = [...rows].sort((a, b) => b.distanceM - a.distanceM);
  const rank = sorted.findIndex((r) => r.id === currentUserId) + 1;
  const top50 = sorted.slice(0, 50);
  const currentInTop50 = top50.some((r) => r.id === currentUserId);
  const currentRow = sorted.find((r) => r.id === currentUserId) ?? null;
  return { top50, currentRow, rank, currentInTop50 };
}

export default function LeaderboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [weeklyTotals, setWeeklyTotals] = useState<Map<string, number>>(new Map());
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<Tab>("global");
  const [period, setPeriod] = useState<Period>("all");

  const loadData = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }
    setCurrentUserId(user.id);

    const [{ data: profileData }, { data: allProfiles }, { data: weekly }, { data: follows }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("profiles").select("*"),
      supabase.rpc("weekly_distance_leaderboard"),
      supabase.from("follows").select("followed_id").eq("follower_id", user.id),
    ]);

    setProfile(profileData ?? null);
    setProfiles(allProfiles ?? []);
    setWeeklyTotals(new Map((weekly ?? []).map((w) => [w.user_id, w.weekly_distance_m])));
    setFollowedIds(new Set((follows ?? []).map((f) => f.followed_id)));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    // Postgres Changes authorizes delivery using the row-level security
    // policy evaluated as the CONNECTING role. @supabase/ssr's browser
    // client restores the session from cookies, but the realtime socket
    // doesn't automatically inherit that JWT -- without this, the socket
    // authenticates as `anon`, which our profiles SELECT policy (scoped to
    // `authenticated`) silently denies, so postgres_changes never delivers
    // despite the channel itself reporting SUBSCRIBED.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled || !session) return;

      supabase.realtime.setAuth(session.access_token);

      channel = supabase
        .channel("leaderboard-updates")
        .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
          loadData();
        })
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !profile || !currentUserId) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <span className="font-display text-[20px] font-semibold text-deep">Swirl</span>
      </main>
    );
  }

  const units: UnitsPreference = profile.units_preference;
  const userIsPremium = isPremium(profile);

  const allRows: LeaderboardRow[] = profiles.map((p) => ({
    id: p.id,
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
    xp: p.xp,
    distanceM: period === "all" ? p.total_distance_m : weeklyTotals.get(p.id) ?? 0,
  }));

  const rowsForTab =
    tab === "global"
      ? period === "week"
        ? allRows.filter((r) => r.distanceM > 0 || r.id === currentUserId)
        : allRows
      : allRows.filter((r) => r.id === currentUserId || followedIds.has(r.id));

  const showFriendsGate = tab === "friends" && requiresPremium("friends_leaderboard") && !userIsPremium;

  // Behind the gate we show a blurred sample rather than the user's (likely
  // empty, since there's no "follow" UI yet) real friends list -- a blurred
  // wall of zeros wouldn't sell the upgrade. Padded out with repeats so
  // there's enough vertical run for rows to peek out above/below the
  // centered prompt card, not just get fully covered by it.
  const sampleRows: LeaderboardRow[] = [];
  if (showFriendsGate && allRows.length > 0) {
    while (sampleRows.length < 8) {
      sampleRows.push(...allRows.map((r, i) => ({ ...r, id: `${r.id}-sample-${sampleRows.length + i}` })));
    }
  }

  const { top50, currentRow, rank, currentInTop50 } = buildLeaderboard(
    showFriendsGate ? sampleRows : rowsForTab,
    currentUserId
  );

  return (
    <main className="min-h-screen bg-surface pb-24">
      <div className="px-4 pt-6">
        <div className="flex rounded-pill bg-white p-1 shadow-card">
          {(["global", "friends"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                "flex-1 rounded-pill py-2 text-[14px] font-semibold capitalize",
                tab === t ? "bg-blue text-white" : "text-slate"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="mt-3 flex gap-2">
          {(["all", "week"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={clsx(
                "rounded-pill px-4 py-1.5 text-[13px] font-medium",
                period === p ? "bg-deep text-white" : "bg-white text-slate"
              )}
            >
              {p === "all" ? "All time" : "This week"}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-4 px-4">
        <div className={clsx("flex flex-col gap-2", showFriendsGate && "pointer-events-none blur-sm")}>
          {top50.length === 0 && (
            <p className="py-8 text-center text-[14px] text-slate">
              {tab === "friends" ? "Follow friends to see them here." : "No distance logged yet."}
            </p>
          )}
          {top50.map((row, index) => (
            <LeaderboardRowView
              key={row.id}
              rank={index + 1}
              row={row}
              units={units}
              isCurrentUser={row.id === currentUserId}
            />
          ))}
          {!currentInTop50 && currentRow && (
            <>
              <p className="py-1 text-center text-[12px] text-slate">···</p>
              <LeaderboardRowView rank={rank} row={currentRow} units={units} isCurrentUser />
            </>
          )}
        </div>

        {showFriendsGate && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex w-60 flex-col items-center gap-3 rounded-card bg-white p-6 text-center shadow-card">
              <h3 className="font-display text-[18px] font-semibold text-deep">Unlock with Swirl Pro</h3>
              <p className="text-[13px] text-slate">See how you stack up against the people you follow.</p>
              <button className="rounded-pill bg-blue px-6 py-2.5 text-[14px] font-semibold text-white">
                Unlock with Swirl Pro
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function LeaderboardRowView({
  rank,
  row,
  units,
  isCurrentUser,
}: {
  rank: number;
  row: LeaderboardRow;
  units: UnitsPreference;
  isCurrentUser: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-3 rounded-card px-3 py-3",
        isCurrentUser ? "bg-blue/10" : "bg-white shadow-card"
      )}
    >
      <span className="w-7 shrink-0 text-center font-display text-[16px] font-semibold text-deep">{rank}</span>
      <Avatar displayName={row.displayName} avatarUrl={row.avatarUrl} size={36} />
      <span className="flex-1 truncate text-[14px] font-medium text-deep">{row.displayName ?? "Swimmer"}</span>
      <div className="text-right">
        <p className="text-[13px] font-semibold text-deep">{formatDistance(row.distanceM, units)}</p>
        <p className="text-[11px] text-slate">{row.xp.toLocaleString()} XP</p>
      </div>
    </div>
  );
}
