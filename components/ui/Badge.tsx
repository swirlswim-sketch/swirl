"use client";

import clsx from "clsx";

interface BadgeProps {
  name: string;
  earned: boolean;
  onTap?: () => void;
}

export default function Badge({ name, earned, onTap }: BadgeProps) {
  return (
    <button onClick={onTap} className="flex flex-col items-center gap-2 text-center">
      <div
        className={clsx(
          "flex h-16 w-16 items-center justify-center rounded-pill text-[26px]",
          earned ? "bg-gold" : "bg-mist grayscale"
        )}
      >
        🏅
      </div>
      <span className={clsx("text-[12px] font-medium", earned ? "text-deep" : "text-slate")}>{name}</span>
    </button>
  );
}
