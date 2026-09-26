"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePlanAccess } from "@/components/plan-access-provider";
import { getProfile, getChatConversations, getMenuItems, getTimeslips, getAllWfhRequests, getAllExpenses, getAllOfficeTrips } from "@/app/api/api";
import {
  Users,
  LayoutDashboard,
  BookMarked,
  BadgeDollarSign,
  Settings,
  ListCollapse,
  Calendar,
  CalendarDays,
  Home,
  Vote,
  LucideIcon,
  ListMinus,
  FileText,
  ChevronDown,
  Clock,
  Shield,
  TrendingUp,
  Monitor,
  FolderKanban,
  Kanban,
  Receipt,
  Video,
  UserRound,
  MessageSquarePlus,
  Bell,
  Plane,
  ListTodo,
  Coins,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import AnimatedIcon from "@/components/animated-icon";

type SidebarMode = "expanded" | "collapsed";
type AnimationType =
  | "spin"
  | "bounce"
  | "pulse"
  | "wiggle"
  | "flip"
  | "swing"
  | "rubberBand"
  | "float";

interface Role {
  roleName: string;
}

interface Profile {
  roles: Role[];
  firstName?: string;
  middleName?: string;
  lastName?: string;
  avatar?: string;
  organizationId?: string;
  pricingTypeId?: number | string;
  planType?: string;
  planName?: string;
  organization?: {
    pricingTypeId?: number | string;
    planType?: string;
    planName?: string;
    pricingType?: {
      typeId?: number | string;
      typeName?: string;
    };
  };
}

interface MenuItem {
  name: string;
  icon: LucideIcon;
  href?: string;
  animation: AnimationType;
  children?: MenuItem[];
}

interface ApiMenuItem {
  id: string;
  label: string;
  iconName?: string;
  route?: string;
  sortOrder: number;
  children?: ApiMenuItem[];
}

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Users,
  Calendar,
  BookMarked,
  Clock,
  CalendarDays,
  Home,
  Monitor,
  Video,
  BadgeDollarSign,
  Vote,
  MessageSquarePlus,
  FolderKanban,
  Kanban,
  TrendingUp,
  Shield,
  Receipt,
  Settings,
  FileText,
  UserRound,
  Bell,
  Plane,
  ListTodo,
  Coins,
};

function mapApiItem(item: ApiMenuItem): MenuItem {
  return {
    name: item.label,
    icon: iconMap[item.iconName || ''] || LayoutDashboard,
    href: item.route || undefined,
    animation: DEFAULT_ANIMATION,
    children: item.children?.map(mapApiItem),
  };
}

const DEFAULT_ANIMATION: AnimationType = 'pulse';

function applyPlanScope(items: MenuItem[], isBasic: boolean, role: string): MenuItem[] {
  if (!isBasic) return items;

  const basicEmployeeAllowlist = new Set([
    "Dashboard", "Attendance", "Timesheet", "Leave", "WFH",
    "Time Slips", "Salary Slips", "Policy", "My Profile", "Assign Work",
  ]);

  const basicAdminAllowlist = new Set([
    "Dashboard", "Employees", "Attendance", "Time Slips",
    "Leave & WFH", "Policy", "Settings", "Assign Work",
  ]);

  const allowlist = role === "EMPLOYEE" ? basicEmployeeAllowlist : basicAdminAllowlist;
  if (!allowlist) return items;

  return items.flatMap((item) => {
    if (item.children?.length) {
      const allowedChildren = item.children.filter((c) => allowlist.has(c.name));
      return allowedChildren.length ? [{ ...item, children: allowedChildren }] : [];
    }
    return allowlist.has(item.name) ? [item] : [];
  });
}

const getPrimaryRoleFromPathAndRoles = (pathname: string, roles: string[] = []): string => {
  const isAdminRoute = pathname.startsWith("/admin");
  const isSuperadminRoute = pathname.startsWith("/superadmin");
  if (isSuperadminRoute) return "SUPERADMIN";
  if (!isAdminRoute) return "EMPLOYEE";

  if (roles.includes("SUPER_ADMIN") || roles.includes("ORG_ADMIN") || roles.includes("SUPERADMIN")) return "ADMIN";
  if (roles.includes("HR")) return "HR";
  return "ADMIN";
};

export default function Sidebar() {
  const pathname = usePathname();
  const { isPathAllowed, isBasicPlan } = usePlanAccess();
  const isEmployeeRoute = pathname?.startsWith("/user");
  const [mode, setMode] = useState<SidebarMode>("expanded");
  const filterMenuItemsByPlan = useMemo(
    () => (items: MenuItem[]): MenuItem[] =>
      items.flatMap((item) => {
      if (item.children?.length) {
        const allowedChildren = item.children.filter((child) =>
          isPathAllowed(child.href)
        );

        if (!allowedChildren.length) {
          return [];
        }

        return [{ ...item, children: allowedChildren }];
      }

      if (item.href && !isPathAllowed(item.href)) {
        return [];
      }

      return [item];
      }),
    [isPathAllowed]
  );
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [pendingTimeslips, setPendingTimeslips] = useState(0);
  const [pendingWfh, setPendingWfh] = useState(0);
  const [pendingExpenses, setPendingExpenses] = useState(0);
  const [pendingOfficeTrips, setPendingOfficeTrips] = useState(0);
  const sidebarIconGradientClass =
    "bg-gradient-to-r from-accent-brand-from to-accent-brand-to bg-clip-text text-transparent";
  const isExpanded = mode === "expanded";

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const profileRes = await getProfile();
        const user: Profile = profileRes.data;

        const roles: string[] = user.roles?.map((r: Role) => r.roleName) || [];
        const primaryRole = getPrimaryRoleFromPathAndRoles(pathname || "/", roles);

        const planTier = isBasicPlan ? 'BASIC' : 'PRO';
        const menuRes = await getMenuItems(primaryRole, planTier);
        const apiItems: ApiMenuItem[] = Array.isArray(menuRes.data) ? menuRes.data : [];
        let items: MenuItem[] = apiItems.map(mapApiItem);

        items = applyPlanScope(items, isBasicPlan, primaryRole);
        setMenuItems(filterMenuItemsByPlan(items));
      } catch {
        // Fallback: keep whatever was last rendered
      }
    };

    fetchMenu();
  }, [filterMenuItemsByPlan, isBasicPlan, isEmployeeRoute, pathname]);

  useEffect(() => {
    const activeGroups: Record<string, boolean> = {};
    menuItems.forEach((item) => {
      if (item.children?.some((child) => child.href === pathname)) {
        activeGroups[item.name] = true;
      }
    });
    if (Object.keys(activeGroups).length > 0) {
      setOpenGroups((prev) => ({ ...prev, ...activeGroups }));
    }
  }, [menuItems, pathname]);

  // Fetch initial chat unread count and listen for real-time updates
  useEffect(() => {
    const isEmployeeRoute = pathname?.startsWith("/user");
    if (!isEmployeeRoute) return;

    getChatConversations()
      .then((res) => {
        const convs = Array.isArray(res.data) ? res.data : [];
        const total = convs.reduce(
          (sum: number, c: { unreadCount?: number }) => sum + (c.unreadCount || 0),
          0
        );
        setChatUnreadCount(total);
      })
      .catch(() => {/* silent */});

    const handler = (e: Event) => {
      const count = (e as CustomEvent<{ count: number }>).detail?.count ?? 0;
      setChatUnreadCount(count);
    };
    window.addEventListener("chatUnreadUpdate", handler);
    return () => window.removeEventListener("chatUnreadUpdate", handler);
  }, [pathname]);

  // Fetch pending approval counts for admin sidebar badges
  useEffect(() => {
    const isAdminRoute = pathname?.startsWith("/admin");
    if (!isAdminRoute) return;

    const fetchPendingCounts = async () => {
      try {
        const profileRes = await getProfile();
        const userId = profileRes.data?.userId;
        const orgId = profileRes.data?.organizationId;
        if (!userId || !orgId) return;

        const [tsRes, wfhRes, expRes, tripRes] = await Promise.all([
          getTimeslips({ page: 1, limit: 1 }).catch(() => null),
          getAllWfhRequests(orgId).catch(() => null),
          getAllExpenses(orgId).catch(() => null),
          getAllOfficeTrips(orgId).catch(() => null),
        ]);

        let tsCount = 0;
        if (tsRes?.data) {
          const allTs = tsRes.data?.data || tsRes.data || [];
          tsCount = (Array.isArray(allTs) ? allTs : []).filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (t: any) => t.status === "PENDING"
          ).length;
        }

        let wfhCount = 0;
        if (wfhRes?.data) {
          const allWfh = Array.isArray(wfhRes.data) ? wfhRes.data : [];
          wfhCount = allWfh.filter(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (r: any) => r.status?.toUpperCase() === "PENDING"
          ).length;
        }

        let expCount = 0;
        if (expRes?.data) {
          const allExp = Array.isArray(expRes.data) ? expRes.data : [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          expCount = allExp.filter((e: any) => e.status === "PENDING").length;
        }

        let tripCount = 0;
        if (tripRes?.data) {
          const allTrips = Array.isArray(tripRes.data) ? tripRes.data : [];
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tripCount = allTrips.filter((t: any) => t.status === "PENDING").length;
        }

        setPendingTimeslips(tsCount);
        setPendingWfh(wfhCount);
        setPendingExpenses(expCount);
        setPendingOfficeTrips(tripCount);
      } catch {
        // silent
      }
    };

    fetchPendingCounts();
  }, [pathname]);

  // Helper to get pending count for a route (or sum of children for groups)
  const getPendingCount = (item: MenuItem): number => {
    if (item.href) {
      if (item.href === "/admin/timeslips") return pendingTimeslips;
      if (item.href === "/admin/wfh") return pendingWfh;
      if (item.href === "/admin/expenses") return pendingExpenses;
      if (item.href === "/admin/office-trips") return pendingOfficeTrips;
    }
    if (item.children?.length) {
      return item.children.reduce(
        (sum, child) => sum + getPendingCount(child),
        0
      );
    }
    return 0;
  };

  const renderBadge = (count: number) => {
    if (count <= 0) return null;
    const display = count > 99 ? "99+" : String(count);
    return (
      <span className="ml-auto min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
        {display}
      </span>
    );
  };

  const renderCollapsedBadge = (count: number) => {
    if (count <= 0) return null;
    const display = count > 99 ? "99+" : String(count);
    return (
      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
        {display}
      </span>
    );
  };

  const renderTooltipBadge = (count: number) => {
    if (count <= 0) return null;
    const display = count > 99 ? "99+" : String(count);
    return (
      <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
        {display}
      </span>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 ease-in-out flex flex-col relative"
        )}
        style={{ width: isExpanded ? "224px" : "56px" }}
      >
        <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-800">
          {isExpanded ? (
            <div className="flex items-center gap-2 min-w-0">
              <Image
                src="/App-logo.png"
                alt="Avinya HRMS logo"
                width={28}
                height={28}
                className="h-7 w-7 rounded-md object-contain shrink-0"
              />
              <span className="font-semibold text-sm bg-gradient-to-r from-accent-brand-from to-accent-brand-to bg-clip-text text-transparent truncate">
                Avinya HRMS
              </span>
            </div>
          ) : (
            <span />
          )}
          <button
            onClick={() => setMode(isExpanded ? "collapsed" : "expanded")}
            className="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors group/toggle"
          >
            {isExpanded ? (
              <ListCollapse className="h-4 w-4 transition-transform duration-200 group-hover/toggle:scale-125" />
            ) : (
              <ListMinus className="h-4 w-4 transition-transform duration-200 group-hover/toggle:scale-125" />
            )}
            <span className="sr-only">Toggle Sidebar</span>
          </button>
        </div>

        <div className="flex-1 flex flex-col items-start px-2 py-4 gap-1 overflow-y-auto scrollbar-hide">
          {menuItems.map((item) => {
            const isGroup = Boolean(item.children?.length);
            const isActive = !isGroup && item.href ? pathname === item.href : false;
            const isGroupActive = isGroup
              ? item.children?.some((child) => child.href === pathname)
              : false;
            const isOpen = isGroup ? openGroups[item.name] : false;

            return (
              <div key={item.name} className="w-full">
                <Tooltip>
                  <TooltipTrigger asChild>
                    {isGroup ? (
                      <button
                        type="button"
                        onClick={() =>
                          setOpenGroups((prev) => ({
                            ...prev,
                            [item.name]: !prev[item.name],
                          }))
                        }
                        className={cn(
                          "flex items-center gap-4 w-full p-2 rounded-lg transition-all duration-200 group relative",
                          !isExpanded && "justify-center",
                          isGroupActive
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                        )}
                      >
                        {/* Icon — with red badge in collapsed mode */}
                        <div className="relative flex-shrink-0">
                          <AnimatedIcon
                            icon={item.icon}
                            animation={item.animation}
                            isActive={isGroupActive}
                            className={sidebarIconGradientClass}
                            gradient
                          />
                          {!isExpanded && renderCollapsedBadge(getPendingCount(item))}
                        </div>
                        {isExpanded && (
                          <>
                            <span
                              className={cn(
                                "font-medium transition-colors duration-200",
                                isGroupActive
                                  ? "text-gray-900 dark:text-gray-100"
                                  : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                              )}
                            >
                              {item.name}
                            </span>
                            {renderBadge(getPendingCount(item))}
                            <ChevronDown
                              className={cn(
                                "ml-auto h-4 w-4 transition-transform duration-200",
                                isOpen && "rotate-180"
                              )}
                            />
                          </>
                        )}
                      </button>
                    ) : (
                      <Link
                        href={item.href || "#"}
                        className={cn(
                          "flex items-center gap-4 w-full p-2 rounded-lg transition-all duration-200 group relative",
                          !isExpanded && "justify-center",
                          isActive
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                        )}
                      >
                        {/* Icon — with red badge in collapsed mode */}
                        <div className="relative flex-shrink-0">
                          <AnimatedIcon
                            icon={item.icon}
                            animation={item.animation}
                            isActive={isActive}
                            className={sidebarIconGradientClass}
                            gradient
                          />
                          {!isExpanded && renderCollapsedBadge(
                            item.href === "/user/messages"
                              ? chatUnreadCount
                              : getPendingCount(item)
                          )}
                        </div>
                        {isExpanded && (
                          <>
                            <span
                              className={cn(
                                "font-medium transition-colors duration-200",
                                isActive
                                  ? "text-gray-900 dark:text-gray-100"
                                  : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                              )}
                            >
                              {item.name}
                            </span>
                            {renderBadge(
                              item.href === "/user/messages"
                                ? chatUnreadCount
                                : getPendingCount(item)
                            )}
                          </>
                        )}
                      </Link>
                    )}
                  </TooltipTrigger>
                  {!isExpanded && (
                    <TooltipContent side="right" sideOffset={8}>
                      <div className="flex items-center gap-2">
                        {(isActive || isGroupActive) && (
                          <div className="w-2 h-2 bg-gray-900 dark:bg-gray-100 rounded-full" />
                        )}
                        {item.name}
                        {renderTooltipBadge(getPendingCount(item))}
                      </div>
                    </TooltipContent>
                  )}
                </Tooltip>
                {isGroup &&
                  isExpanded &&
                  isOpen &&
                  item.children?.map((child) => {
                    const isChildActive = pathname === child.href;
                    return (
                      <Link
                        key={`${item.name}-${child.name}`}
                        href={child.href || "#"}
                        className={cn(
                          "flex items-center gap-4 w-full p-2 pl-10 rounded-lg transition-all duration-200 group relative",
                          isChildActive
                            ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                            : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                        )}
                      >
                        {/* Icon — with red badge in collapsed mode */}
                        <div className="relative flex-shrink-0">
                          <AnimatedIcon
                            icon={child.icon}
                            animation={child.animation}
                            isActive={isChildActive}
                            className={sidebarIconGradientClass}
                            gradient
                          />
                          {!isExpanded && renderCollapsedBadge(getPendingCount(child))}
                        </div>
                        {isExpanded && (
                          <>
                            <span
                              className={cn(
                                "font-medium transition-colors duration-200",
                                isChildActive
                                  ? "text-gray-900 dark:text-gray-100"
                                  : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                              )}
                            >
                              {child.name}
                            </span>
                            {renderBadge(getPendingCount(child))}
                          </>
                        )}
                      </Link>
                    );
                  })}
              </div>
            );
          })}
        </div>
      </aside>
    </TooltipProvider>
  );
}
