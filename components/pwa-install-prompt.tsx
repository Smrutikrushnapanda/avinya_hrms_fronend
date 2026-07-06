"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Download, Smartphone } from "lucide-react";

const SESSION_DISMISS_KEY = "pwa_install_dismissed_ts";
const PWA_INSTALLED_KEY = "pwa_installed";
const COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours before showing again after dismiss

// ── Platform detection for install instructions
function getPlatform(): "ios" | "android" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return "ios";
  if (/Android/.test(ua)) return "android";
  return "other";
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [show, setShow] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const platform = getPlatform();

  // ── Check cooldown: return true if still in cooldown after dismiss
  const isInCooldown = useCallback(() => {
    const ts = localStorage.getItem(SESSION_DISMISS_KEY);
    if (!ts) return false;
    return Date.now() - Number(ts) < COOLDOWN_MS;
  }, []);

  // ── Check if already installed via display-mode
  const checkInstalled = useCallback(() => {
    const isInStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    if (isInStandalone) {
      setIsInstalled(true);
      localStorage.setItem(PWA_INSTALLED_KEY, "true");
    }
  }, []);

  useEffect(() => {
    checkInstalled();
    if (localStorage.getItem(PWA_INSTALLED_KEY)) {
      setIsInstalled(true);
    }

    // Listen for display-mode changes (user installs)
    const media = window.matchMedia("(display-mode: standalone)");
    const handler = () => checkInstalled();
    media.addEventListener("change", handler);

    // Listen for appinstalled event
    const installedHandler = () => {
      setIsInstalled(true);
      setShow(false);
      localStorage.setItem(PWA_INSTALLED_KEY, "true");
    };
    window.addEventListener("appinstalled", installedHandler);

    // Capture beforeinstallprompt (Chrome/Android)
    const beforeInstallHandler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isInCooldown() && !localStorage.getItem(PWA_INSTALLED_KEY)) {
        setShow(true);
      }
    };
    window.addEventListener("beforeinstallprompt", beforeInstallHandler);

    // Show after a delay (for iOS and non-Chrome browsers)
    const timer = setTimeout(() => {
      if (
        !isInCooldown() &&
        !localStorage.getItem(PWA_INSTALLED_KEY) &&
        !window.matchMedia("(display-mode: standalone)").matches &&
        !deferredPrompt
      ) {
        setShow(true);
      }
    }, 4000);

    return () => {
      media.removeEventListener("change", handler);
      window.removeEventListener("appinstalled", installedHandler);
      window.removeEventListener("beforeinstallprompt", beforeInstallHandler);
      clearTimeout(timer);
    };
  }, [checkInstalled, deferredPrompt, isInCooldown]);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") {
        setIsInstalled(true);
        setShow(false);
        localStorage.setItem(PWA_INSTALLED_KEY, "true");
      }
      setDeferredPrompt(null);
    } else {
      // Fallback for iOS: show instructions
      setShow(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShow(false);
    localStorage.setItem(SESSION_DISMISS_KEY, String(Date.now()));
  };

  if (isInstalled || !show || dismissed) return null;

  // ── iOS instructions (no programmatic install)
  if (platform === "ios" && !deferredPrompt) {
    return (
      <div className="fixed bottom-20 left-0 right-0 z-[100] px-4 animate-slide-up">
        <div className="bg-[#026D94] rounded-2xl shadow-2xl p-4 relative border border-[#026D94]/20">
          <button
            onClick={handleDismiss}
            className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-white dark:bg-gray-900 shadow-md flex items-center justify-center z-10"
          >
            <X className="w-3.5 h-3.5 text-gray-500" />
          </button>
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white">Install Avinya HRMS</p>
              <p className="text-xs text-white/80 mt-0.5 leading-relaxed">
                Tap the share button <span className="inline-block text-white">⬆️</span> then scroll to{" "}
                <strong className="text-white">&quot;Add to Home Screen&quot;</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Android / Desktop / Others (with install prompt)
  return (
    <div className="fixed bottom-20 left-0 right-0 z-[100] px-4 animate-slide-up">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-4 relative border border-gray-200 dark:border-gray-700">
        <button
          onClick={handleDismiss}
          className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 shadow-md flex items-center justify-center z-10"
        >
          <X className="w-3.5 h-3.5 text-gray-500" />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-[#026D94]/10 flex items-center justify-center shrink-0">
            <Download className="w-6 h-6 text-[#026D94]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              Install Avinya HRMS
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Get the best experience with our app — fast, offline-ready, and always accessible.
            </p>
          </div>
          <button
            onClick={handleInstall}
            className="shrink-0 bg-[#026D94] hover:bg-[#026D94]/90 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-[#026D94]/25"
          >
            Install
          </button>
        </div>
      </div>
    </div>
  );
}
