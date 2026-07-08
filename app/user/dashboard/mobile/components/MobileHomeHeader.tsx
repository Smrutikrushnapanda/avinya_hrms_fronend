"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { usePlanAccess } from "@/components/plan-access-provider";
import useUnreadMessages from "./useUnreadMessages";
import PwaInstallButton from "@/components/pwa-install-button";
import { getOrganization } from "@/app/api/api";

type UserInfo = {
  name: string;
  role: string;
  avatar: string;
  organizationId?: string;
};

function isMediaActive(startDate?: string, endDate?: string) {
  if (!startDate && !endDate) return true;
  const today = new Date();
  const start = startDate ? new Date(`${startDate}T00:00:00`) : null;
  const end = endDate ? new Date(`${endDate}T23:59:59`) : null;
  if (start && Number.isNaN(start.getTime())) return false;
  if (end && Number.isNaN(end.getTime())) return false;
  if (start && today < start) return false;
  if (end && today > end) return false;
  return true;
}

function getGreeting() {
  const hours = new Date().getHours();
  if (hours >= 5 && hours < 12) return "Good Morning";
  if (hours >= 12 && hours < 17) return "Good Afternoon";
  if (hours >= 17 && hours < 20) return "Good Evening";
  return "Good Night";
}

export default function MobileHomeHeader({
  user,
  onOpenSidebar,
  onBrandingChange,
}: {
  user: UserInfo;
  onOpenSidebar: () => void;
  onBrandingChange?: (hasCustomBranding: boolean) => void;
}) {
  const router = useRouter();
  const { isBasicPlan } = usePlanAccess();
  const unreadCount = useUnreadMessages();
  const [headerColor, setHeaderColor] = useState<string | null>(null);
  const [headerMediaUrl, setHeaderMediaUrl] = useState<string | null>(null);
  const hasCustomBranding = Boolean(headerColor) || Boolean(headerMediaUrl);

  useEffect(() => {
    onBrandingChange?.(hasCustomBranding);
  }, [hasCustomBranding, onBrandingChange]);

  useEffect(() => {
    if (!user.organizationId) return;
    let active = true;
    getOrganization(user.organizationId)
      .then((res) => {
        if (!active) return;
        const org = res.data || {};
        const mediaActive =
          org.homeHeaderMediaUrl &&
          isMediaActive(org.homeHeaderMediaStartDate, org.homeHeaderMediaEndDate);
        setHeaderColor(org.homeHeaderBackgroundColor || null);
        setHeaderMediaUrl(mediaActive ? org.homeHeaderMediaUrl : null);
      })
      .catch(() => {
        if (!active) return;
        setHeaderColor(null);
        setHeaderMediaUrl(null);
      });
    return () => {
      active = false;
    };
  }, [user.organizationId]);

  const notificationButton = !isBasicPlan && (
    <div className="flex items-center gap-3">
      <PwaInstallButton
        className={`rounded-md p-1 transition-colors ${
          hasCustomBranding ? "text-white hover:bg-white/10" : "text-foreground hover:bg-muted"
        }`}
      />
      <button
        className={`relative flex h-10 w-10 items-center justify-center rounded-full border ${
          hasCustomBranding
            ? "border-white/30 bg-white/10 text-white"
            : "border-border bg-card text-foreground shadow-sm"
        }`}
        onClick={() => router.push("/user/dashboard/mobile/notifications")}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>
    </div>
  );

  if (!hasCustomBranding) {
    return (
      <div className="bg-background text-foreground px-4 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onOpenSidebar}>
          <Avatar className="w-12 h-12 border border-border">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs text-muted-foreground">{getGreeting()},</p>
            <h2 className="text-base font-bold leading-tight">{user.name}</h2>
            <p className="text-xs text-muted-foreground">{user.role}</p>
          </div>
        </div>
        {notificationButton}
      </div>
    );
  }

  return (
    <div
      className="text-white px-4 pt-5 pb-16 flex items-center justify-between"
      style={{
        backgroundColor: headerColor || undefined,
        backgroundImage: headerMediaUrl ? `url(${headerMediaUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex items-center space-x-2 cursor-pointer" onClick={onOpenSidebar}>
        <Avatar className="w-12 h-12 border-2 border-white transition-transform active:scale-95">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-l font-semibold">{user.name}</h2>
          <p className="text-sm opacity-90">{user.role}</p>
        </div>
      </div>
      {notificationButton}
    </div>
  );
}
