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
  designation?: string;
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
        className={`relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all active:scale-95 shadow-sm border border-slate-100 bg-white text-slate-800`}
        onClick={() => router.push("/user/dashboard/mobile/notifications")}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
        )}
      </button>
    </div>
  );

  if (!hasCustomBranding) {
    return (
      <div className="bg-slate-50/50 dark:bg-slate-900/10 text-foreground px-5 pt-6 pb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3 cursor-pointer" onClick={onOpenSidebar}>
          <Avatar className="w-12 h-12 border border-slate-200 shadow-sm">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-xs text-slate-400 font-medium">{getGreeting()},</p>
            <h2 className="text-base font-extrabold text-slate-800 dark:text-slate-100 leading-tight mt-0.5">{user.name}</h2>
            <p className="text-xs text-slate-400 font-normal mt-0.5">{user.designation || user.role}</p>
          </div>
        </div>
        {notificationButton}
      </div>
    );
  }

  return (
    <div
      className="text-white px-5 pt-6 pb-16 flex items-center justify-between"
      style={{
        backgroundColor: headerColor || undefined,
        backgroundImage: headerMediaUrl ? `url(${headerMediaUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex items-center space-x-3 cursor-pointer" onClick={onOpenSidebar}>
        <Avatar className="w-12 h-12 border-2 border-white transition-transform active:scale-95 shadow-sm">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="bg-blue-50 text-blue-600 font-bold">{user.name?.[0] || "U"}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-base font-bold text-white leading-tight">{user.name}</h2>
          <p className="text-xs text-blue-100/90 mt-0.5">{user.designation || user.role}</p>
        </div>
      </div>
      {notificationButton}
    </div>
  );
}
