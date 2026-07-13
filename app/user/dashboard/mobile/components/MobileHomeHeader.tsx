"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

  useEffect(() => { onBrandingChange?.(hasCustomBranding); }, [hasCustomBranding, onBrandingChange]);

  useEffect(() => {
    if (!user.organizationId) return;
    let active = true;
    getOrganization(user.organizationId)
      .then((res) => {
        if (!active) return;
        const org = res.data || {};
        const mediaActive = org.homeHeaderMediaUrl && isMediaActive(org.homeHeaderMediaStartDate, org.homeHeaderMediaEndDate);
        setHeaderColor(org.homeHeaderBackgroundColor || null);
        setHeaderMediaUrl(mediaActive ? org.homeHeaderMediaUrl : null);
      })
      .catch(() => { if (active) { setHeaderColor(null); setHeaderMediaUrl(null); } });
    return () => { active = false; };
  }, [user.organizationId]);

  const notificationButton = !isBasicPlan && (
    <div className="flex items-center gap-3">
      <PwaInstallButton className="rounded-md p-1 transition-colors text-foreground hover:bg-muted" />
      <motion.button
        whileTap={{ scale: 0.9 }}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card text-foreground"
        onClick={() => router.push("/user/dashboard/mobile/notifications")}
        aria-label="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 min-w-[10px] h-[10px] rounded-full bg-destructive flex items-center justify-center">
            <span className="text-[7px] font-bold text-white leading-none px-[2px]">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </motion.button>
    </div>
  );

  if (!hasCustomBranding) {
    return (
      <div className="bg-background text-foreground px-5 pt-5 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={onOpenSidebar}>
          <Avatar className="w-12 h-12 border border-border shrink-0">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="bg-primary/10 text-primary font-bold">
              {user.name?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground font-medium">{getGreeting()},</p>
            <h2 className="text-base font-bold text-foreground truncate mt-0.5">{user.name}</h2>
            <p className="text-xs text-muted-foreground font-normal mt-0.5 truncate">{user.designation || user.role}</p>
          </div>
        </div>
        {notificationButton}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-white px-5 pt-6 pb-12 flex items-center justify-between"
      style={{
        backgroundColor: headerColor || undefined,
        backgroundImage: headerMediaUrl ? `url(${headerMediaUrl})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={onOpenSidebar}>
        <Avatar className="w-12 h-12 border-2 border-white/50 shrink-0">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback className="bg-white/20 text-white font-bold">{user.name?.[0] || "U"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="inline-flex items-center rounded-full bg-black/20 border border-white/20 px-3 py-1">
            <h2 className="text-base font-bold text-white truncate">{user.name}</h2>
          </div>
          <p className="text-xs text-white/80 mt-1 truncate">{user.designation || user.role}</p>
        </div>
      </div>
      {notificationButton}
    </motion.div>
  );
}
