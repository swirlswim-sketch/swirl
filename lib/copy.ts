import type { Badge } from "@/types/database";

/** Picks the most significant badge to headline when several are earned from one swim. */
export function pickHeadlineBadge(badges: Badge[]): Badge | null {
  if (badges.length === 0) return null;

  const priority = (b: Badge) => (b.badge_type === "special" ? 3 : b.badge_type === "distance" ? 2 : 1);

  return [...badges].sort((a, b) => {
    const diff = priority(b) - priority(a);
    return diff !== 0 ? diff : (b.threshold_value ?? 0) - (a.threshold_value ?? 0);
  })[0];
}

/** Spec'd tone-of-voice copy for specific milestones; falls back to the badge's own description. */
export function getMilestoneCopy(badge: Badge, routeName?: string | null): string {
  switch (badge.name) {
    case "First Stroke":
      return "You're in the water. That's everything.";
    case "10km":
      return routeName
        ? `Ten kilometres down. ${routeName} is starting to take you seriously.`
        : "Ten kilometres down. It's starting to take you seriously.";
    case "Three Days":
      return "Three days running. Or swimming, rather.";
    case "One Week":
      return "Seven days. You're a swimmer now.";
    default:
      return badge.description ?? "";
  }
}
