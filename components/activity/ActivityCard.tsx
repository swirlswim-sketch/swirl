import { formatDistance } from "@/lib/units";
import type { ActivityLog, UnitsPreference } from "@/types/database";

interface ActivityCardProps {
  log: ActivityLog;
  units: UnitsPreference;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

export default function ActivityCard({ log, units }: ActivityCardProps) {
  return (
    <div className="flex items-center justify-between rounded-card bg-white px-4 py-3 shadow-card">
      <div>
        <p className="text-[14px] font-semibold text-deep">{formatDistance(log.distance_m, units)}</p>
        <p className="text-[12px] text-slate">
          {formatDate(log.logged_at)}
          {log.duration_seconds ? ` · ${formatDuration(log.duration_seconds)}` : ""}
          {" · "}
          <span className="capitalize">{log.activity_type}</span>
        </p>
      </div>
      {log.xp_earned != null && <span className="text-[13px] font-semibold text-gold">+{log.xp_earned} XP</span>}
    </div>
  );
}
