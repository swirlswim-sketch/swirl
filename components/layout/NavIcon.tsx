interface NavIconProps {
  label: string;
  className?: string;
}

const commonProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Simple line icons for the app's five nav items. */
export function NavIcon({ label, className }: NavIconProps) {
  switch (label) {
    case "Dashboard":
      return (
        <svg {...commonProps} className={className} aria-hidden="true">
          <path d="M12 3 3 10v10h6v-6h6v6h6V10z" />
        </svg>
      );
    case "Routes":
      return (
        <svg {...commonProps} className={className} aria-hidden="true">
          <path d="M9 4 3 6.5v13.5L9 17l6 3 6-2.5V4L15 6.5 9 4Z" />
          <path d="M9 4v13" />
          <path d="M15 6.5v13.5" />
        </svg>
      );
    case "Record":
      return (
        <svg {...commonProps} className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v8M8 12h8" />
        </svg>
      );
    case "Leaderboard":
      return (
        <svg {...commonProps} className={className} aria-hidden="true">
          <path d="M6 20V10M12 20V4M18 20v-7" />
        </svg>
      );
    case "Profile":
      return (
        <svg {...commonProps} className={className} aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c1.2-4 4-6 7-6s5.8 2 7 6" />
        </svg>
      );
    default:
      return null;
  }
}
