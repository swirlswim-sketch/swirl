"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { createClient } from "@/lib/supabase";
import { formatDistance } from "@/lib/units";
import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import ActivityCard from "@/components/activity/ActivityCard";
import type { ActivityLog, Badge as BadgeType, Profile, UnitsPreference, UserBadge } from "@/types/database";

const LOGS_PAGE_SIZE = 10;

const CONNECTED_APPS = [
  { name: "Apple Health", icon: "🍎" },
  { name: "Strava", icon: "🚴" },
  { name: "Garmin", icon: "⌚" },
];

function getBadgeDetailText(badge: BadgeType, earned: boolean, profile: Profile, units: UnitsPreference): string {
  if (earned) return badge.description ?? "";

  const threshold = badge.threshold_value ?? 0;
  if (badge.badge_type === "distance") {
    if (threshold === 0) return "Log your first swim to unlock";
    const remaining = Math.max(0, threshold - profile.total_distance_m);
    return `${formatDistance(remaining, units)} to unlock`;
  }
  if (badge.badge_type === "streak") {
    const remaining = Math.max(0, threshold - profile.streak_days);
    return `${remaining} more day${remaining === 1 ? "" : "s"} to unlock`;
  }
  return "Complete the route to unlock";
}

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [allBadges, setAllBadges] = useState<BadgeType[]>([]);
  const [userBadges, setUserBadges] = useState<UserBadge[]>([]);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [logsPage, setLogsPage] = useState(0);
  const [hasMoreLogs, setHasMoreLogs] = useState(true);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedBadge, setSelectedBadge] = useState<{ badge: BadgeType; earned: boolean } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const loadInitial = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push("/auth/login");
      return;
    }

    const [{ data: profileData }, { data: badgesData }, { data: userBadgesData }, { data: logsData }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("badges").select("*"),
        supabase.from("user_badges").select("*").eq("user_id", user.id),
        supabase
          .from("activity_logs")
          .select("*")
          .eq("user_id", user.id)
          .order("logged_at", { ascending: false })
          .range(0, LOGS_PAGE_SIZE - 1),
      ]);

    setProfile(profileData ?? null);
    setAllBadges(badgesData ?? []);
    setUserBadges(userBadgesData ?? []);
    setLogs(logsData ?? []);
    setHasMoreLogs((logsData ?? []).length === LOGS_PAGE_SIZE);
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  async function loadMoreLogs() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    setLoadingLogs(true);
    const nextPage = logsPage + 1;
    const { data } = await supabase
      .from("activity_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .range(nextPage * LOGS_PAGE_SIZE, nextPage * LOGS_PAGE_SIZE + LOGS_PAGE_SIZE - 1);

    setLogs((prev) => [...prev, ...(data ?? [])]);
    setHasMoreLogs((data ?? []).length === LOGS_PAGE_SIZE);
    setLogsPage(nextPage);
    setLoadingLogs(false);
  }

  function openEdit() {
    if (!profile) return;
    setEditDisplayName(profile.display_name ?? "");
    setEditBio(profile.bio ?? "");
    setEditOpen(true);
  }

  async function saveProfile() {
    if (!profile) return;
    setSavingProfile(true);
    await supabase
      .from("profiles")
      .update({ display_name: editDisplayName.trim(), bio: editBio.trim() || null })
      .eq("id", profile.id);
    setProfile({ ...profile, display_name: editDisplayName.trim(), bio: editBio.trim() || null });
    setSavingProfile(false);
    setEditOpen(false);
  }

  async function setUnits(units: UnitsPreference) {
    if (!profile) return;
    setProfile({ ...profile, units_preference: units });
    await supabase.from("profiles").update({ units_preference: units }).eq("id", profile.id);
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  if (loading || !profile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-surface">
        <span className="font-display text-[20px] font-semibold text-deep">Swirl</span>
      </main>
    );
  }

  const units = profile.units_preference;
  const earnedBadgeIds = new Set(userBadges.map((ub) => ub.badge_id));

  return (
    <main className="min-h-screen bg-surface pb-24">
      <div className="flex flex-col items-center gap-2 px-6 pt-10 text-center">
        <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} size={88} />
        <h1 className="font-display text-[20px] font-semibold text-deep">{profile.display_name ?? "Swimmer"}</h1>
        <button onClick={openEdit} className="text-[13px] font-medium text-blue">
          Edit profile
        </button>
        {profile.bio && <p className="max-w-xs text-[14px] text-slate">{profile.bio}</p>}
      </div>

      <div className="mt-8 grid grid-cols-4 gap-2 px-4 text-center">
        <div>
          <p className="font-display text-[22px] font-bold text-deep">
            {formatDistance(profile.total_distance_m, units, 0)}
          </p>
          <p className="text-[11px] font-medium text-slate">Distance</p>
        </div>
        <div>
          <p className="font-display text-[22px] font-bold text-deep">{profile.xp.toLocaleString()}</p>
          <p className="text-[11px] font-medium text-slate">XP</p>
        </div>
        <div>
          <p className="text-[22px] font-bold text-deep">{userBadges.length}</p>
          <p className="text-[11px] font-medium text-slate">Badges</p>
        </div>
        <div>
          <p className="text-[22px] font-bold text-deep">🔥 {profile.streak_days}</p>
          <p className="text-[11px] font-medium text-slate">Streak</p>
        </div>
      </div>

      <section className="mt-10 px-4">
        <h2 className="mb-3 text-[16px] font-semibold text-deep">Badges</h2>
        <div className="grid grid-cols-4 gap-4">
          {allBadges.map((badge) => {
            const earned = earnedBadgeIds.has(badge.id);
            return (
              <Badge
                key={badge.id}
                name={badge.name}
                earned={earned}
                onTap={() => setSelectedBadge({ badge, earned })}
              />
            );
          })}
        </div>
      </section>

      <section className="mt-10 px-4">
        <h2 className="mb-3 text-[16px] font-semibold text-deep">Activity history</h2>
        <div className="flex flex-col gap-2">
          {logs.length === 0 && <p className="text-[14px] text-slate">No swims logged yet.</p>}
          {logs.map((log) => (
            <ActivityCard key={log.id} log={log} units={units} />
          ))}
        </div>
        {hasMoreLogs && (
          <Button variant="secondary" fullWidth loading={loadingLogs} onClick={loadMoreLogs} className="mt-3">
            Load more
          </Button>
        )}
      </section>

      <section className="mt-10 px-4">
        <h2 className="mb-3 text-[16px] font-semibold text-deep">Settings</h2>

        <div className="rounded-card bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <span className="text-[14px] text-deep">Units</span>
            <div className="flex rounded-pill bg-surface p-1">
              {(["km", "miles"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setUnits(option)}
                  className={clsx(
                    "rounded-pill px-3 py-1 text-[12px] font-medium",
                    units === option ? "bg-white text-deep shadow-card" : "text-slate"
                  )}
                >
                  {option === "km" ? "km" : "mi"}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-mist pt-4">
            {CONNECTED_APPS.map((app) => (
              <div key={app.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[18px]">{app.icon}</span>
                  <span className="text-[14px] text-deep">{app.name}</span>
                  <span className="rounded-pill bg-mist px-2 py-0.5 text-[10px] text-slate">Coming soon</span>
                </div>
                <button disabled className="rounded-pill bg-mist px-3 py-1 text-[12px] font-medium text-slate">
                  Connect
                </button>
              </div>
            ))}
          </div>

          <button onClick={handleSignOut} className="mt-4 w-full border-t border-mist pt-4 text-[14px] text-slate">
            Sign out
          </button>
        </div>
      </section>

      <Modal open={!!selectedBadge} onClose={() => setSelectedBadge(null)}>
        {selectedBadge && (
          <div className="flex flex-col items-center gap-2 text-center">
            <div
              className={clsx(
                "flex h-16 w-16 items-center justify-center rounded-pill text-[26px]",
                selectedBadge.earned ? "bg-gold" : "bg-mist grayscale"
              )}
            >
              🏅
            </div>
            <h3 className="font-display text-[18px] font-semibold text-deep">{selectedBadge.badge.name}</h3>
            <p className="text-[14px] text-slate">
              {getBadgeDetailText(selectedBadge.badge, selectedBadge.earned, profile, units)}
            </p>
          </div>
        )}
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)}>
        <div className="flex flex-col gap-4">
          <h3 className="font-display text-[18px] font-semibold text-deep">Edit profile</h3>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-slate">Display name</span>
            <input
              type="text"
              value={editDisplayName}
              onChange={(e) => setEditDisplayName(e.target.value)}
              className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep focus:border-blue focus:outline-none"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-medium text-slate">Bio</span>
            <input
              type="text"
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              placeholder="Optional"
              className="rounded-card border border-mist bg-white px-4 py-3 text-[16px] text-deep placeholder:text-slate focus:border-blue focus:outline-none"
            />
          </label>
          <Button fullWidth loading={savingProfile} onClick={saveProfile}>
            Save
          </Button>
        </div>
      </Modal>
    </main>
  );
}
