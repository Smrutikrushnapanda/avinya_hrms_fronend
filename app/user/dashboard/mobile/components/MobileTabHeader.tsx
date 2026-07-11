"use client";

import { ArrowLeft, Bell } from "lucide-react";
import { useRouter } from "next/navigation";
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
    <div className={`bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100 px-4 ${containerPaddingClass} flex items-center justify-between shadow-sm ${className}`}>
      {backHref ? (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(backHref)}
            className="text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          {showBackLabel && (
            <button
              onClick={() => router.push(backHref)}
              className="text-sm font-semibold text-slate-800 dark:text-slate-100"
            >
              {backLabel}
            </button>
          )}
          <div>
            <h2 className="text-base font-extrabold tracking-tight">{title}</h2>
            {subtitle && <p className="text-[10px] text-slate-400 font-medium">{subtitle}</p>}
          </div>
        </div>
      ) : (
        <div className="flex items-center">
          <h2 className="text-base font-extrabold tracking-tight text-slate-800 dark:text-slate-100 px-1 py-0.5">{title}</h2>
        </div>
      )}
      {showBell && !isBasicPlan && (
        <div className="flex items-center gap-2">
          <PwaInstallButton className="rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-800 dark:text-slate-100" />
          <button
            className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 shadow-sm active:scale-95 transition-transform"
            onClick={() => router.push("/user/dashboard/mobile/notifications")}
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-2.5 right-2.5 w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            )}
          </button>
        </div>
      )}
    </div>
  );
}
