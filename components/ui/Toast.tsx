"use client";

import clsx from "clsx";

interface ToastProps {
  variant: "small" | "medium";
  message: string;
  onDismiss: () => void;
}

export default function Toast({ variant, message, onDismiss }: ToastProps) {
  return (
    <button
      onClick={onDismiss}
      className={clsx(
        "animate-toast-in fixed inset-x-4 top-6 z-50 flex items-center gap-3 rounded-card bg-white text-left shadow-card",
        variant === "medium" ? "px-4 py-4" : "px-4 py-3"
      )}
    >
      {variant === "medium" && (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-gold text-[16px]">
          🏁
        </div>
      )}
      <p className={clsx("text-deep", variant === "medium" ? "text-[15px] font-medium" : "text-[14px] font-medium")}>
        {message}
      </p>
    </button>
  );
}
