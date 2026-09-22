import type { Profile } from "@/types/database";

export type PremiumFeature = "friends_leaderboard" | "multiple_active_routes" | "custom_goals";

export function isPremium(profile: Profile): boolean {
  return profile.is_premium === true;
}

export function requiresPremium(feature: PremiumFeature): boolean {
  const premiumFeatures: PremiumFeature[] = ["friends_leaderboard", "multiple_active_routes", "custom_goals"];
  return premiumFeatures.includes(feature);
}
