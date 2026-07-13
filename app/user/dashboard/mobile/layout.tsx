"use client";
import { ReactNode, useState, useEffect, useMemo } from "react";
import { useRouter, usePathname } from "next/navigation";
import { usePlanAccess } from "@/components/plan-access-provider";
import { getMenuItems } from "@/app/api/api";
import PwaInstallPrompt from "@/components/pwa-install-prompt";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  CalendarDays,
  Umbrella,
  Clock,
  LayoutGrid,
  Monitor,
  X,
  FileText,
  DollarSign,
  MessageSquare,
  BarChart2,
  Settings,
  Bell,
  Users,
  Newspaper,
} from "lucide-react";

const defaultTabs = [
  { name: "Home", href: "/user/dashboard/mobile", icon: Home },
  { name: "Attendance", href: "/user/dashboard/mobile/attendance", icon: CalendarDays },
  { name: "Services", href: null, icon: LayoutGrid },
  { name: "Leave", href: "/user/dashboard/mobile/leave", icon: Umbrella },
  { name: "Time Slip", href: "/user/dashboard/mobile/timeslip", icon: Clock },
];

const basicTabs = [
  { name: "Home", href: "/user/dashboard/mobile", icon: Home },
  { name: "Attendance", href: "/user/dashboard/mobile/attendance", icon: CalendarDays },
  { name: "Leave", href: "/user/dashboard/mobile/leave", icon: Umbrella },
  { name: "WFH", href: "/user/dashboard/mobile/wfh", icon: Monitor },
  { name: "Time Slip", href: "/user/dashboard/mobile/timeslip", icon: Clock },
];

const serviceItems = [
  { name: "Profile", href: "/user/dashboard/mobile/profile", icon: Users },
  { name: "Timesheet", href: "/user/dashboard/mobile/timesheet", icon: FileText },
  { name: "WFH", href: "/user/dashboard/mobile/wfh", icon: Monitor },
  { name: "Payroll", href: "/user/dashboard/mobile/payroll", icon: DollarSign },
  { name: "Messages", href: "/user/dashboard/mobile/messages", icon: MessageSquare },
  { name: "Polls", href: "/user/dashboard/mobile/polls", icon: BarChart2 },
  { name: "Posts", href: "/user/dashboard/mobile/posts", icon: Newspaper },
  { name: "Settings", href: "/user/dashboard/mobile/settings", icon: Settings },
  { name: "Notifications", href: "/user/dashboard/mobile/notifications", icon: Bell },
];

const SERVICE_ITEM_DESKTOP_ROUTE: Record<string, string> = {
  Profile: "/user/profile",
  Timesheet: "/user/timesheet",
  WFH: "/user/wfh",
  Payroll: "/user/payroll",
  Messages: "/user/messages",
  Polls: "/user/polls",
  Posts: "/user/posts",
  Notifications: "/user/notifications",
};

export default function MobileLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isBasicPlan, planType } = usePlanAccess();
  const [sheetOpen, setSheetOpen] = useState(false);
  const tabs = isBasicPlan ? basicTabs : defaultTabs;
  const hasServicesCenter = !isBasicPlan;

  const [allowedDesktopRoutes, setAllowedDesktopRoutes] = useState<Set<string> | null>(null);

  useEffect(() => {
    if (!hasServicesCenter) return;
    let cancelled = false;
    const flattenRoutes = (items: any[]): string[] =>
      items.flatMap((item) => [
        ...(item.route ? [item.route] : []),
        ...(item.children ? flattenRoutes(item.children) : []),
      ]);
    getMenuItems("EMPLOYEE", planType || undefined)
      .then((res) => { if (!cancelled) setAllowedDesktopRoutes(new Set(flattenRoutes(res.data || []))); })
      .catch(() => { if (!cancelled) setAllowedDesktopRoutes(null); });
    return () => { cancelled = true; };
  }, [hasServicesCenter, planType]);

  const visibleServiceItems = useMemo(() => {
    if (!allowedDesktopRoutes) return serviceItems;
    return serviceItems.filter((item) => {
      const desktopRoute = SERVICE_ITEM_DESKTOP_ROUTE[item.name];
      return !desktopRoute || allowedDesktopRoutes.has(desktopRoute);
    });
  }, [allowedDesktopRoutes]);

  const getActiveTab = () => {
    if (pathname === "/user/dashboard/mobile") return 0;
    if (pathname.includes("/attendance")) return 1;
    if (isBasicPlan) {
      if (pathname.includes("/leave")) return 2;
      if (pathname.includes("/wfh")) return 3;
      if (pathname.includes("/timeslip")) return 4;
    } else {
      if (
        pathname.includes("/services") || pathname.includes("/timesheet") ||
        pathname.includes("/payroll") || pathname.includes("/messages") ||
        pathname.includes("/polls") || pathname.includes("/posts") ||
        pathname.includes("/settings") || pathname.includes("/notifications") ||
        pathname.includes("/profile") || pathname.includes("/wfh")
      ) return 2;
      if (pathname.includes("/leave")) return 3;
      if (pathname.includes("/timeslip")) return 4;
    }
    return 0;
  };

  const activeTab = getActiveTab();

  useEffect(() => { setSheetOpen(false); }, [pathname]);

  return (
    <div className="employee-mobile-shell min-h-screen bg-background text-foreground flex flex-col">
      {children}
      <PwaInstallPrompt />

      <AnimatePresence>
        {hasServicesCenter && sheetOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/45 dark:bg-black/70 z-40"
            onClick={() => setSheetOpen(false)}
          />
        )}
      </AnimatePresence>

      {hasServicesCenter && (
        <motion.div
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          onDragEnd={(_, info) => { if (info.offset.y > 80) setSheetOpen(false); }}
          initial={false}
          animate={sheetOpen ? "open" : "closed"}
          variants={{
            open: { y: 0 },
            closed: { y: "100%" },
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed left-0 w-full bg-card border-t border-border z-50 rounded-t-2xl shadow-2xl"
          style={{ bottom: "64px" }}
        >
          <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>

          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-base font-semibold text-foreground">Services</span>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setSheetOpen(false)}
              className="w-7 h-7 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </motion.button>
          </div>

          <motion.div
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } },
            }}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-3 gap-4 px-5 pb-8 pt-2"
          >
            {visibleServiceItems.map((item) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.name}
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 150, damping: 18 } },
                  }}
                  whileTap={{ scale: 0.93 }}
                  onClick={() => { setSheetOpen(false); router.push(item.href); }}
                  className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-muted/70 hover:bg-primary/10 active:bg-primary/15 transition-colors"
                >
                  <div className="w-12 h-12 rounded-full bg-background shadow-sm flex items-center justify-center border border-border">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-[11px] font-medium text-muted-foreground">{item.name}</span>
                </motion.button>
              );
            })}
          </motion.div>
        </motion.div>
      )}

      <div
        className="fixed bottom-0 left-0 w-full bg-card/80 backdrop-blur-md border-t border-border shadow-lg z-50"
        style={{ height: "64px" }}
      >
        <div className="flex items-end h-full relative">
          {tabs.map((tab, index) => {
            const isCenter = hasServicesCenter && index === 2;
            const isActive = activeTab === index;
            const Icon = tab.icon;

            if (isCenter) {
              return (
                <div key={tab.name} className="flex-1 flex flex-col items-center justify-end pb-2 relative">
                  <motion.button
                    whileTap={{ scale: 0.9 }}
                    animate={sheetOpen ? { rotate: 45 } : { rotate: 0 }}
                    onClick={() => setSheetOpen((prev) => !prev)}
                    className="absolute left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center shadow-lg bg-primary"
                    style={{
                      bottom: "22px",
                      boxShadow: "0 4px 16px color-mix(in srgb, var(--primary) 40%, transparent)",
                    }}
                  >
                    <motion.div
                      animate={{ rotate: sheetOpen ? 45 : 0 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
                    >
                      <LayoutGrid className="w-6 h-6 text-primary-foreground" />
                    </motion.div>
                  </motion.button>
                  <span className={`text-[10px] ${isActive || sheetOpen ? "text-primary font-semibold" : "text-muted-foreground font-medium"}`}>
                    {tab.name}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={tab.name}
                onClick={() => tab.href && router.push(tab.href)}
                className={`flex-1 flex flex-col items-center pt-1 pb-3 relative ${isActive ? "text-primary" : "text-muted-foreground"}`}
              >
                {isActive && (
                  <motion.span
                    layoutId="navActiveIndicator"
                    className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-primary rounded-b-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}
                <motion.div
                  animate={isActive ? { scale: 1.1 } : { scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 15 }}
                >
                  <Icon className="w-5 h-5" />
                </motion.div>
                <span className={`text-[10px] mt-1 ${isActive ? "font-semibold" : "font-medium"}`}>
                  {tab.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ height: "64px" }} />
    </div>
  );
}
