"use client";

import { ArrowLeft, Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { usePlanAccess } from "@/components/plan-access-provider";
import useUnreadMessages from "./useUnreadMessages";
import PwaInstallButton from "@/components/pwa-install-button";

const particles = [
  { s: 8, l: "10%", t: 10, d: "5.2s", k: "particle-1" },
  { s: 12, l: "28%", t: 42, d: "6.4s", k: "particle-2" },
  { s: 6, l: "46%", t: 14, d: "5.6s", k: "particle-3" },
  { s: 10, l: "64%", t: 28, d: "7.0s", k: "particle-4" },
  { s: 14, l: "82%", t: 8, d: "7.6s", k: "particle-5" },
  { s: 7, l: "20%", t: 72, d: "6.2s", k: "particle-6" },
  { s: 11, l: "58%", t: 70, d: "6.8s", k: "particle-1" },
  { s: 9, l: "74%", t: 76, d: "5.9s", k: "particle-4" },
];

const delays = ["0s", "0.6s", "1.2s", "0.3s", "0.9s", "1.5s", "0.4s", "1.1s"];

function AnimatedHeaderBg() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div className="absolute w-[200px] h-[200px] rounded-full bg-blue-400/15 dark:bg-blue-500/20 -top-[90px] -right-[30px]" />
      <div className="absolute w-[140px] h-[140px] rounded-full bg-blue-500/15 dark:bg-blue-400/20 -bottom-[50px] -left-[10px]" />
      {particles.map((p, i) => (
        <div
          key={i}
          className="absolute rounded-full bg-blue-400/50 dark:bg-white/35"
          style={{
            width: p.s,
            height: p.s,
            left: p.l,
            top: p.t,
            animation: `${p.k} ${p.d} ease-in-out infinite`,
            animationDelay: delays[i],
          }}
        />
      ))}
    </div>
  );
}

export default function MobileTabHeader({
  title,
  backHref,
  subtitle,
  showBackLabel = false,
  backLabel = "Back",
  showBell = true,
  compact = false,
  className = "",
}: {
  title: string;
  backHref?: string;
  subtitle?: string;
  showBackLabel?: boolean;
  backLabel?: string;
  showBell?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const { isBasicPlan } = usePlanAccess();
  const unreadCount = useUnreadMessages();
  const containerPaddingClass = compact ? "py-2.5" : "pt-3 pb-6";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className={`bg-card dark:bg-card border-b border-border text-foreground px-4 ${containerPaddingClass} flex items-center justify-between shadow-sm sticky top-0 z-30 relative overflow-hidden ${className}`}
    >
      <AnimatedHeaderBg />
      <div className="relative z-10 flex-1">
        {backHref ? (
          <div className="flex items-center space-x-2">
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(backHref)}
                className="text-foreground hover:bg-muted"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </motion.div>
            {showBackLabel && (
              <button
                onClick={() => router.push(backHref)}
                className="text-sm font-semibold text-foreground"
              >
                {backLabel}
              </button>
            )}
            <div>
              <h2 className="text-base font-extrabold tracking-tight">{title}</h2>
              {subtitle && <p className="text-[10px] text-muted-foreground font-medium">{subtitle}</p>}
            </div>
          </div>
        ) : (
          <div className="flex items-center">
            <h2 className="text-base font-extrabold tracking-tight text-foreground px-1 py-0.5">{title}</h2>
          </div>
        )}
      </div>
      {showBell && !isBasicPlan && (
        <div className="relative z-10 flex items-center gap-2">
          <PwaInstallButton className="rounded-md p-1 hover:bg-muted transition-colors text-foreground" />
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-sm transition-transform"
            onClick={() => router.push("/user/dashboard/mobile/notifications")}
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <motion.span
                key={unreadCount}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
                className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-blue-600"
              />
            )}
          </motion.button>
        </div>
      )}
    </motion.div>
  );
}
