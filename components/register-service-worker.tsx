"use client";

import { useEffect } from "react";

// Serwist only builds public/sw.js in production (see next.config.ts `disable`
// flag), and nothing was ever calling `serviceWorker.register(...)` — without
// an active service worker, Chrome never considers the app installable, so
// `beforeinstallprompt` never fires and the custom install button is a no-op.
export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      let active = true;
      const isAppWorker = (worker: ServiceWorker | null) => worker &&
        ["/sw.js", "/firebase-messaging-sw.js"].includes(new URL(worker.scriptURL).pathname);
      void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
        await Promise.all(registrations.filter((registration) =>
          isAppWorker(registration.active) || isAppWorker(registration.waiting) || isAppWorker(registration.installing),
        ).map((registration) => registration.unregister()));
        if (active && isAppWorker(navigator.serviceWorker.controller)) window.location.reload();
      }).catch((error) => console.error("Failed to remove development service worker:", error));
      return () => { active = false; };
    }

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
