"use client";

import { ReactNode } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

export default function Modal({ open, onClose, children }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-deep/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-card bg-white p-6 shadow-card">{children}</div>
    </div>
  );
}
