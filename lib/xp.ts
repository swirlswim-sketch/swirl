const XP_PER_METRE = 1 / 10;

const CHECKPOINT_BONUS_XP = 50;
const MILESTONE_BONUS_XP = 100;
const ROUTE_COMPLETION_BONUS_XP = 500;

/** Streak multiplier bonuses, checked longest streak first. */
const STREAK_MULTIPLIERS: { minDays: number; bonus: number }[] = [
  { minDays: 30, bonus: 0.5 },
  { minDays: 7, bonus: 0.25 },
  { minDays: 3, bonus: 0.1 },
];

export function getStreakMultiplier(streakDays: number): number {
  const tier = STREAK_MULTIPLIERS.find((t) => streakDays >= t.minDays);
  return 1 + (tier?.bonus ?? 0);
}

export interface XpCalculationInput {
  distanceM: number;
  /** Streak length (in days) *after* this activity is logged. */
  streakDays: number;
  checkpointsPassed?: number;
  milestonesHit?: number;
  routeCompleted?: boolean;
}

export interface XpCalculationResult {
  totalXp: number;
  baseXp: number;
  streakMultiplier: number;
  checkpointBonus: number;
  milestoneBonus: number;
  completionBonus: number;
}

export function calculateXp(input: XpCalculationInput): XpCalculationResult {
  const { distanceM, streakDays, checkpointsPassed = 0, milestonesHit = 0, routeCompleted = false } = input;

  const streakMultiplier = getStreakMultiplier(streakDays);
  const baseXp = Math.round(distanceM * XP_PER_METRE * streakMultiplier);
  const checkpointBonus = checkpointsPassed * CHECKPOINT_BONUS_XP;
  const milestoneBonus = milestonesHit * MILESTONE_BONUS_XP;
  const completionBonus = routeCompleted ? ROUTE_COMPLETION_BONUS_XP : 0;

  return {
    totalXp: baseXp + checkpointBonus + milestoneBonus + completionBonus,
    baseXp,
    streakMultiplier,
    checkpointBonus,
    milestoneBonus,
    completionBonus,
  };
}
