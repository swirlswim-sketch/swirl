import type { Badge, RouteCheckpoint } from "@/types/database";

/**
 * Distance and streak badges use `threshold_value` as a simple crossing
 * point: a badge is newly earned when the user's stat moves from below the
 * threshold to at-or-above it. "First Stroke" is a distance badge with a
 * threshold of 0, earned on the user's very first logged activity.
 */
export function getNewlyEarnedDistanceBadges(
  badges: Badge[],
  previousTotalDistanceM: number,
  newTotalDistanceM: number,
  isFirstActivity: boolean
): Badge[] {
  return badges.filter((badge) => {
    if (badge.badge_type !== "distance") return false;
    const threshold = badge.threshold_value ?? 0;
    if (threshold === 0) return isFirstActivity;
    return previousTotalDistanceM < threshold && newTotalDistanceM >= threshold;
  });
}

export function getNewlyEarnedStreakBadges(
  badges: Badge[],
  previousStreakDays: number,
  newStreakDays: number
): Badge[] {
  return badges.filter((badge) => {
    if (badge.badge_type !== "streak") return false;
    const threshold = badge.threshold_value ?? 0;
    return previousStreakDays < threshold && newStreakDays >= threshold;
  });
}

/** Checkpoints crossed by this activity: distance moved from below to at-or-above their marker. */
export function getNewlyPassedCheckpoints(
  checkpoints: RouteCheckpoint[],
  previousDistanceM: number,
  newDistanceM: number
): RouteCheckpoint[] {
  return checkpoints
    .filter((cp) => previousDistanceM < cp.distance_from_start_m && newDistanceM >= cp.distance_from_start_m)
    .sort((a, b) => a.order_index - b.order_index);
}

/** Distance badges are also used as a static "collection" — including unearned ones with their requirement. */
export function describeBadgeRequirement(badge: Badge): string {
  const threshold = badge.threshold_value ?? 0;
  switch (badge.badge_type) {
    case "distance":
      return threshold === 0 ? "Log your first swim" : `${(threshold / 1000).toLocaleString()}km total distance`;
    case "streak":
      return `${threshold}-day streak`;
    case "checkpoint":
      return "Reach this checkpoint";
    case "completion":
    case "special":
      return "Complete the route";
    default:
      return "";
  }
}
