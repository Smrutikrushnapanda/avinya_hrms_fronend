"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePlanAccess } from "@/components/plan-access-provider";
import { getProfile, getChatConversations, getMenuItems } from "@/app/api/api";
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
    "Time Slips", "Salary Slips", "Policy", "My Profile",
  ]);

  const basicAdminAllowlist = new Set([
    "Dashboard", "Employees", "Attendance", "Time Slips",
    "Leave & WFH", "Policy", "Settings",
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
                        <AnimatedIcon
                          icon={item.icon}
                          animation={item.animation}
                          isActive={isGroupActive}
                          className={sidebarIconGradientClass}
                          gradient
                        />
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
                        {/* Icon — with red dot badge in collapsed mode */}
                        <div className="relative flex-shrink-0">
                          <AnimatedIcon
                            icon={item.icon}
                            animation={item.animation}
                            isActive={isActive}
                            className={sidebarIconGradientClass}
                            gradient
                          />
                          {!isExpanded &&
                            item.href === "/user/messages" &&
                            chatUnreadCount > 0 && (
                              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-0.5">
                                {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                              </span>
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
                            {item.href === "/user/messages" &&
                              chatUnreadCount > 0 && (
                                <span className="ml-auto min-w-[20px] h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                                  {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                                </span>
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
                        {item.href === "/user/messages" && chatUnreadCount > 0 && (
                          <span className="bg-red-500 text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                            {chatUnreadCount > 99 ? "99+" : chatUnreadCount}
                          </span>
                        )}
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
                        <AnimatedIcon
                          icon={child.icon}
                          animation={child.animation}
                          isActive={isChildActive}
                          className={sidebarIconGradientClass}
                          gradient
                        />
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
