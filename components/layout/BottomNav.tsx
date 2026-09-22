"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "@/lib/nav";
import { NavIcon } from "@/components/layout/NavIcon";

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-mist bg-white pb-[env(safe-area-inset-bottom)] md:hidden">
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className="flex flex-1 flex-col items-center gap-1 py-2.5"
          >
            <NavIcon label={item.label} className={clsx("h-6 w-6", active ? "text-blue" : "text-slate")} />
            <span className={clsx("text-[11px] font-medium", active ? "text-blue" : "text-slate")}>
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
