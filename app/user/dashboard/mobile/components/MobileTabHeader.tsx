"use client";

import { ArrowLeft, Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import useUnreadMessages from "./useUnreadMessages";

export default function MobileTabHeader({
  title,
  backHref,
  subtitle,
  showBackLabel = false,
  backLabel = "Back",
  showBell = true,
  className = "bg-[#005F90]",
}: {
  title: string;
  backHref?: string;
  subtitle?: string;
  showBackLabel?: boolean;
  backLabel?: string;
  showBell?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const unreadCount = useUnreadMessages();

  return (
    <div className={`${className} text-white px-4 pt-5 pb-16 flex items-center justify-between`}>
      {backHref ? (
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(backHref)}
            className="text-white hover:text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/60"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </Button>
          {showBackLabel && (
            <button
              onClick={() => router.push(backHref)}
              className="text-sm font-semibold text-white/90"
            >
              {backLabel}
            </button>
          )}
          <div>
            <h2 className="text-lg font-semibold">{title}</h2>
            {subtitle && <p className="text-xs text-blue-100">{subtitle}</p>}
          </div>
        </div>
      ) : (
        <div className="flex items-center">
          <div className="bg-white/20 rounded-full px-4 py-2">
            <h2 className="text-xl font-bold">{title}</h2>
          </div>
        </div>
      )}
      {showBell && (
        <button
          className="relative rounded-md p-1 hover:bg-white/10 transition-colors"
          onClick={() => router.push("/user/dashboard/mobile/notifications")}
          aria-label="Notifications"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-2 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
