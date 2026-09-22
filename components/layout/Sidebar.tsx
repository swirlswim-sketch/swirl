"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { NAV_ITEMS } from "@/lib/nav";
import { NavIcon } from "@/components/layout/NavIcon";

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col gap-1 border-r border-mist bg-white px-4 py-6 md:flex">
      <Link href="/dashboard" className="mb-6 px-2 font-display text-[18px] font-semibold text-deep">
        Swirl
      </Link>

      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "flex items-center gap-3 rounded-card px-3 py-2.5 text-[14px] font-medium",
              active ? "bg-blue/10 text-blue" : "text-slate"
            )}
          >
            <NavIcon label={item.label} className="h-5 w-5" />
            {item.label}
          </Link>
        );
      })}
    </aside>
  );
}
