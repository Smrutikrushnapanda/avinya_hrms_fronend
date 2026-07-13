"use client";

import { ArrowLeft, Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { usePlanAccess } from "@/components/plan-access-provider";
import useUnreadMessages from "./useUnreadMessages";
import PwaInstallButton from "@/components/pwa-install-button";

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
  const containerPaddingClass = compact ? "py-3" : "pt-4 pb-10";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 20 }}
      className={`bg-card dark:bg-card border-b border-border text-foreground px-4 ${containerPaddingClass} flex items-center justify-between shadow-sm ${className}`}
    >
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
      {showBell && !isBasicPlan && (
        <div className="flex items-center gap-2">
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
