"use client";

import React, { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  WifiOff, 
  Wifi, 
  RefreshCw, 
  ArrowLeft, 
  Home, 
  AlertCircle, 
  ShieldAlert, 
  CheckCircle2,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface NetworkErrorViewProps {
  statusCode?: string | number;
  title?: string;
  description?: string;
  onRetry?: () => void | Promise<void>;
  showHomeButton?: boolean;
  showBackButton?: boolean;
}

export default function NetworkErrorView({
  statusCode = "404",
  title,
  description,
  onRetry,
  showHomeButton = true,
  showBackButton = true,
}: NetworkErrorViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState<boolean>(false);

  useEffect(() => {
    // Sync browser connectivity status on mount
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = () => {
        setIsOnline(true);
        setRetryMessage("Connection restored! You are back online.");
      };

      const handleOffline = () => {
        setIsOnline(false);
        setRetryMessage("Internet connection dropped.");
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const handleRetry = async () => {
    if (isRetrying) return;
    setIsRetrying(true);
    setRetryMessage(null);

    try {
      if (onRetry) {
        await onRetry();
      }

      // Check real network reachability with cache-busting ping
      if (typeof window !== "undefined") {
        if (!navigator.onLine) {
          setIsOnline(false);
          setRetryMessage("Still offline. Please check your Wi-Fi or data connection.");
          setIsRetrying(false);
          return;
        }

        try {
          const res = await fetch(`/favicon.ico?_ping=${Date.now()}`, {
            method: "HEAD",
            cache: "no-store",
          });

          if (res.ok || res.type === "opaque") {
            setIsOnline(true);
            setRetryMessage("Connected! Reloading page...");
            setTimeout(() => {
              startTransition(() => {
                router.refresh();
                window.location.reload();
              });
            }, 600);
            return;
          }
        } catch {
          // Fetch failed (network error or server unreachable)
          setIsOnline(false);
          setRetryMessage("Unable to reach the server. Please verify your connection.");
        }
      }
    } catch {
      setRetryMessage("Retry attempt failed. Please try again in a few moments.");
    } finally {
      setTimeout(() => {
        setIsRetrying(false);
      }, 750);
    }
  };

  const dynamicTitle =
    title ||
    (!isOnline
      ? "No Internet Connection"
      : statusCode === "404"
      ? "Page Not Found or Network Unavailable"
      : "Network Connection Issue");

  const dynamicDescription =
    description ||
    (!isOnline
      ? "You appear to be offline. We couldn't connect to Avinya HRMS servers. Please verify your Wi-Fi or cellular network."
      : statusCode === "404"
      ? "The requested page could not be located or failed to load due to a temporary network interruption. Try retrying or head back home."
      : "A network glitch prevented this request from completing. Click retry below to re-establish connection.");

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-background text-foreground overflow-hidden select-none">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary/10 dark:bg-primary/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[260px] h-[260px] bg-cyan-500/10 blur-[90px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-xl w-full mx-auto flex flex-col items-center text-center">
        {/* Animated Badge & Icon Visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="relative mb-6 flex items-center justify-center"
        >
          {/* Subtle pulse rings */}
          <div className="absolute inset-0 rounded-full scale-125 border border-primary/20 animate-ping opacity-30" />
          <div className="absolute inset-0 rounded-full scale-150 border border-muted-foreground/10" />

          {/* Icon Box */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl bg-card border border-border/70 shadow-2xl flex flex-col items-center justify-center p-4 backdrop-blur-xl">
            <div className="relative flex items-center justify-center">
              {!isOnline ? (
                <WifiOff className="w-12 h-12 text-rose-500 transition-all duration-300" />
              ) : (
                <Wifi className="w-12 h-12 text-primary transition-all duration-300" />
              )}
              {/* Alert pip */}
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    !isOnline ? "bg-rose-400" : "bg-emerald-400"
                  }`}
                />
                <span
                  className={`relative inline-flex rounded-full h-4 w-4 ${
                    !isOnline ? "bg-rose-500" : "bg-emerald-500"
                  }`}
                />
              </span>
            </div>

            {/* Large Status Badge inside */}
            <span className="mt-2 text-[11px] font-bold tracking-wider uppercase text-muted-foreground">
              {String(statusCode)}
            </span>
          </div>
        </motion.div>

        {/* Live Network Status Pill */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className="mb-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border backdrop-blur-md transition-colors shadow-xs"
        >
          {!isOnline ? (
            <span className="inline-flex items-center gap-1.5 text-rose-500 bg-rose-500/10 border border-rose-500/20 px-2.5 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse" />
              Offline Mode
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Network Connected
            </span>
          )}
          <span className="text-muted-foreground text-[11px]">Avinya System Gateway</span>
        </motion.div>

        {/* Title and Description */}
        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.35 }}
          className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-foreground"
        >
          {dynamicTitle}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
          className="mt-3 text-sm sm:text-base text-muted-foreground max-w-md mx-auto leading-relaxed"
        >
          {dynamicDescription}
        </motion.p>

        {/* Feedback / Alert message after clicking Retry */}
        <AnimatePresence>
          {retryMessage && (
            <motion.div
              initial={{ opacity: 0, y: -6, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -6, height: 0 }}
              className="mt-4 w-full max-w-sm"
            >
              <div
                className={`flex items-center justify-center gap-2 p-3 text-xs rounded-xl font-medium border ${
                  isOnline && !retryMessage.includes("Unable")
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                    : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
                }`}
              >
                {isOnline && !retryMessage.includes("Unable") ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0" />
                )}
                <span>{retryMessage}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions: Primary Retry Button & Navigation */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.35 }}
          className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto"
        >
          {/* Retry Button */}
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying}
            className="w-full sm:w-auto min-w-[170px] inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-accent-brand-from to-accent-brand-to hover:opacity-95 active:scale-[0.98] transition-all shadow-lg hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw
              className={`w-4 h-4 transition-transform ${
                isRetrying ? "animate-spin" : "group-hover:rotate-45"
              }`}
            />
            <span>{isRetrying ? "Reconnecting..." : "Retry Connection"}</span>
          </button>

          {/* Go Back Button */}
          {showBackButton && (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/");
                }
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border border-border bg-card/60 hover:bg-accent hover:text-accent-foreground active:scale-[0.98] transition-all backdrop-blur-md cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Go Back</span>
            </button>
          )}

          {/* Return to Dashboard / Home */}
          {showHomeButton && (
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-medium border border-border/80 bg-card/60 hover:bg-accent hover:text-accent-foreground active:scale-[0.98] transition-all backdrop-blur-md"
            >
              <Home className="w-4 h-4" />
              <span>Return Home</span>
            </Link>
          )}
        </motion.div>

        {/* Diagnostic Accordion Drawer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.3 }}
          className="mt-10 w-full max-w-md"
        >
          <button
            type="button"
            onClick={() => setShowDiagnostics((prev) => !prev)}
            className="mx-auto flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Connection Troubleshooting Tips</span>
            {showDiagnostics ? (
              <ChevronUp className="w-3.5 h-3.5" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5" />
            )}
          </button>

          <AnimatePresence>
            {showDiagnostics && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="mt-4 p-4 rounded-2xl bg-card/80 border border-border/60 text-left text-xs text-muted-foreground space-y-2.5 backdrop-blur-md shadow-xs">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>Verify your device is connected to active Wi-Fi or mobile data.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>If using a corporate network or VPN, confirm access to HRMS gateway.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
                    <span>Try toggling your device Airplane Mode on for 5 seconds and off.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>Cached data remains safely secured while offline.</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
