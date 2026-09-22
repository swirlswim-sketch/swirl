"use client";

import { useEffect, useState } from "react";

interface ProgressBarProps {
  fraction: number; // 0-1
  className?: string;
}

export default function ProgressBar({ fraction, className }: ProgressBarProps) {
  const clamped = Math.min(Math.max(fraction, 0), 1);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const frame = requestAnimationFrame(() => setWidth(clamped * 100));
    return () => cancelAnimationFrame(frame);
  }, [clamped]);

  return (
    <div className={`h-2 w-full overflow-hidden rounded-pill bg-mist ${className ?? ""}`}>
      <div
        className="h-full rounded-pill bg-blue transition-[width] duration-progress ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
