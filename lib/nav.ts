export interface NavItem {
  href: string;
  label: string;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/routes", label: "Routes" },
  { href: "/log", label: "Record" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/profile", label: "Profile" },
];

/** Paths that render without the app's nav chrome (auth flow, marketing landing, offline fallback). */
export function isChromeless(pathname: string): boolean {
  return pathname === "/" || pathname === "/offline" || pathname.startsWith("/auth");
}
