"use client";

import { useEffect } from "react";

/**
 * next-pwa's "auto register" injection targets the Pages Router's
 * _app/_document; it's a no-op in the App Router, so the service worker
 * is otherwise never registered despite building correctly.
 */
export default function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Installability is a progressive enhancement; a failed registration shouldn't break the app.
      });
    }
  }, []);

  return null;
}
