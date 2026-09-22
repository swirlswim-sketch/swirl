interface StreakBadgeProps {
  streakDays: number;
  className?: string;
}

export default function StreakBadge({ streakDays, className }: StreakBadgeProps) {
  if (streakDays <= 0) return null;

  return (
    <div
      className={`flex items-center gap-1 rounded-pill bg-gold/15 px-3 py-1 text-[12px] font-medium text-gold ${className ?? ""}`}
    >
      <span>🔥</span>
      <span>{streakDays}</span>
    </div>
  );
}
