"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";
import { isChromeless } from "@/lib/nav";

export default function AppChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isChromeless(pathname)) return <>{children}</>;

  // Bottom-nav clearance is each page's own concern (not applied here): the
  // dashboard owns exactly `h-screen` for its map/card split, and adding
  // padding around it here would push it taller than the viewport.
  return (
    <div className="md:flex md:min-h-screen">
      <Sidebar />
      <div className="md:flex-1">{children}</div>
      <BottomNav />
    </div>
  );
}
