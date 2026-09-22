"use client";

import { ReactNode } from "react";
import clsx from "clsx";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Sheet({ open, onClose, children }: SheetProps) {
  return (
    <div className={clsx("fixed inset-0 z-40", !open && "pointer-events-none")} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={clsx(
          "absolute inset-0 bg-deep/40 transition-opacity duration-sheet ease-out",
          open ? "opacity-100" : "opacity-0"
        )}
      />
      <div
        className={clsx(
          "absolute inset-x-0 bottom-0 rounded-t-card bg-white p-6 shadow-card transition-transform duration-sheet ease-out",
          open ? "translate-y-0" : "translate-y-full"
        )}
      >
        {children}
      </div>
    </div>
  );
}
