import Avatar from "@/components/ui/Avatar";
import StreakBadge from "@/components/activity/StreakBadge";
import type { Profile } from "@/types/database";

interface HeaderProps {
  profile: Profile;
  className?: string;
}

export default function Header({ profile, className }: HeaderProps) {
  return (
    <header className={`flex items-center justify-between px-4 py-3 ${className ?? ""}`}>
      <span className="font-display text-[18px] font-semibold text-white drop-shadow">Swirl</span>
      <div className="flex items-center gap-2">
        <StreakBadge streakDays={profile.streak_days} />
        <div className="rounded-pill bg-white/90 px-3 py-1 text-[12px] font-semibold text-deep">
          {profile.xp.toLocaleString()} XP
        </div>
        <Avatar displayName={profile.display_name} avatarUrl={profile.avatar_url} size={32} />
      </div>
    </header>
  );
}
