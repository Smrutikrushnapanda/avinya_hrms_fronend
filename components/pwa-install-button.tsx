"use client";

import { useState, useEffect } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";

function getPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

export default function PwaInstallButton({ className }: { className?: string }) {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const platform = getPlatform();

  useEffect(() => {
    // The live display-mode check is the only reliable signal for whether
    // the app is *currently* installed — unlike the "pwa_installed"
    // localStorage flag this used to also gate on, which gets set once
    // (on first install, or the "appinstalled" event firing) and never
    // cleared, so the button stayed hidden forever afterwards even after
    // the user uninstalled the PWA and reopened it in a regular browser tab.
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isStandalone) {
      setInstalled(true);
      return;
    }

    const beforeInstallHandler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    const installedHandler = () => {
      setInstalled(true);
    };

    window.addEventListener("beforeinstallprompt", beforeInstallHandler);
    window.addEventListener("appinstalled", installedHandler);

    const media = window.matchMedia("(display-mode: standalone)");
    const changeHandler = () => {
      if (media.matches) {
        setInstalled(true);
      }
    };
    media.addEventListener("change", changeHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", beforeInstallHandler);
      window.removeEventListener("appinstalled", installedHandler);
      media.removeEventListener("change", changeHandler);
    };
  }, []);

  if (installed) return null;

  const handleClick = async () => {
    if (platform === "ios") {
      toast("Install Avinya HRMS", {
        description: "Tap the Share button in Safari, then scroll to \"Add to Home Screen\".",
        duration: 5000,
      });
      return;
    }

    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setInstalled(true);
      }
      setDeferredPrompt(null);
    }
  };

  return (
    <button
      onClick={handleClick}
      className={className}
      aria-label="Install app"
    >
      <Download className="w-5 h-5" />
    </button>
  );
}
