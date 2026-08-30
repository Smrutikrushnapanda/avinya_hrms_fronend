"use client";

import { useEffect } from "react";

// Serwist only builds public/sw.js in production (see next.config.ts `disable`
// flag), and nothing was ever calling `serviceWorker.register(...)` — without
// an active service worker, Chrome never considers the app installable, so
// `beforeinstallprompt` never fires and the custom install button is a no-op.
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).then((reg) => {
      // Check for updates every time the app loads
      reg.update().catch(() => {});
    }).catch((err) => {
      console.error("Service worker registration failed:", err);
    });

    // Listen for a new service worker taking over and clear old caches
    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (refreshing) return;
      refreshing = true;
      // The new SW has claimed clients — reload to pick up fresh assets
      // (only if this isn't the very first install)
      if (window.location.hash !== "#first-install") {
        window.location.reload();
      }
    });
  }, []);

  return null;
}
