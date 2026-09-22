"use client";

interface MilestoneOverlayProps {
  title: string;
  subtitle: string;
  showRipple?: boolean;
  onDismiss: () => void;
}

export default function MilestoneOverlay({ title, subtitle, showRipple, onDismiss }: MilestoneOverlayProps) {
  return (
    <div
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-deep/80 px-8 text-center"
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        {showRipple && <div className="animate-ripple absolute h-24 w-24 rounded-pill border-2 border-gold" />}
        <div className="animate-badge-in flex h-24 w-24 items-center justify-center rounded-pill bg-gold text-[40px] shadow-card">
          🏅
        </div>
      </div>
      <h2 className="font-display text-[36px] font-bold leading-tight text-white">{title}</h2>
      <p className="text-[15px] text-white/80">{subtitle}</p>
    </div>
  );
}
