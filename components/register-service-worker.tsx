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

    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.error("Service worker registration failed:", err);
    });
  }, []);

  return null;
}
