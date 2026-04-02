"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { usePlanAccess } from "@/components/plan-access-provider";
import { getProfile, getChatConversations, getPerformanceSettings, getWfhToday, getOrganization } from "@/app/api/api";
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
  Receipt,
  Video,
  UserRound,
  MessageSquarePlus,
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

interface MenuItemChild {
  name: string;
  icon: LucideIcon;
  href: string;
  animation: AnimationType;
}

interface MenuItem {
  name: string;
  icon: LucideIcon;
  href?: string;
  animation: AnimationType;
  children?: MenuItemChild[];
}

const applyBasicPlanMenuScope = (
  items: MenuItem[],
  role: string,
  isBasicPlan: boolean
): MenuItem[] => {
  if (!isBasicPlan) {
    return items;
  }

  const basicEmployeeAllowlist = new Set([
    "Dashboard",
    "Attendance",
    "Timesheet",
    "Leave",
    "WFH",
    "Time Slips",
    "Salary Slips",
    "Policy",
    "My Profile",
  ]);

  const basicAdminAllowlist = new Set([
    "Dashboard",
    "Employees",
    "Attendance",
    "Time Slips",
    "Leave & WFH",
    "Policy",
    "Settings",
  ]);

  if (role === "EMPLOYEE") {
    return items.filter((item) => basicEmployeeAllowlist.has(item.name));
  }

  if (role === "ADMIN" || role === "HR") {
    return items.filter((item) => basicAdminAllowlist.has(item.name));
  }

  return items;
};

const menuByRole: Record<string, MenuItem[]> = {
  ADMIN: [
    { name: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard", animation: "pulse" },
    { name: "Employees", icon: Users, href: "/admin/employees", animation: "wiggle" },
    { name: "Attendance", icon: Calendar, href: "/admin/attendance", animation: "flip" },
    { name: "Timesheet", icon: BookMarked, href: "/admin/timesheets", animation: "swing" },
    { name: "Time Slips", icon: Clock, href: "/admin/timeslips", animation: "float" },
    {
      name: "Leave & WFH",
      icon: CalendarDays,
      animation: "float",
      children: [
        { name: "Leave", icon: CalendarDays, href: "/admin/leave", animation: "float" },
        { name: "WFH", icon: Home, href: "/admin/wfh", animation: "wiggle" },
        { name: "WFH Monitor", icon: Monitor, href: "/admin/wfh-monitor", animation: "pulse" },
      ],
    },
    { name: "Meetings", icon: Video, href: "/admin/meetings", animation: "bounce" },
    { name: "Payroll", icon: BadgeDollarSign, href: "/admin/payroll", animation: "bounce" },
    { name: "Polls", icon: Vote, href: "/admin/polls", animation: "rubberBand" },
    { name: "Community Posts", icon: MessageSquarePlus, href: "/admin/posts", animation: "float" },
    { name: "Projects", icon: FolderKanban, href: "/admin/projects", animation: "float" },
    { name: "Performance", icon: TrendingUp, href: "/admin/performance", animation: "float" },
    { name: "Policy", icon: Shield, href: "/admin/policy", animation: "float" },
    { name: "Expenses", icon: Receipt, href: "/admin/expenses", animation: "float" },
    { name: "Settings", icon: Settings, href: "/admin/settings", animation: "spin" },
    { name: "Reports", icon: BookMarked, href: "/admin/reports", animation: "swing" },
    { name: "Log Report", icon: FileText, href: "/admin/logreport", animation: "float" },
  ],
  HR: [
    { name: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard", animation: "pulse" },
    { name: "Employees", icon: Users, href: "/admin/employees", animation: "wiggle" },
    { name: "Attendance", icon: Calendar, href: "/admin/attendance", animation: "flip" },
    { name: "Time Slips", icon: Clock, href: "/admin/timeslips", animation: "float" },
    { name: "Timesheet", icon: BookMarked, href: "/admin/timesheets", animation: "swing" },
    {
      name: "Leave & WFH",
      icon: CalendarDays,
      animation: "float",
      children: [
        { name: "Leave", icon: CalendarDays, href: "/admin/leave", animation: "float" },
        { name: "WFH", icon: Home, href: "/admin/wfh", animation: "wiggle" },
        { name: "WFH Monitor", icon: Monitor, href: "/admin/wfh-monitor", animation: "pulse" },
      ],
    },
    { name: "Meetings", icon: Video, href: "/admin/meetings", animation: "bounce" },
    { name: "Payroll", icon: BadgeDollarSign, href: "/admin/payroll", animation: "bounce" },
    { name: "Reports", icon: BookMarked, href: "/admin/reports", animation: "swing" },
    { name: "Polls", icon: Vote, href: "/admin/polls", animation: "rubberBand" },
    { name: "Community Posts", icon: MessageSquarePlus, href: "/admin/posts", animation: "float" },
    { name: "Performance", icon: TrendingUp, href: "/admin/performance", animation: "float" },
    { name: "Policy", icon: Shield, href: "/admin/policy", animation: "float" },
    { name: "Expenses", icon: Receipt, href: "/admin/expenses", animation: "float" },
    { name: "Settings", icon: Settings, href: "/admin/settings", animation: "spin" },
  ],
  EMPLOYEE: [
    { name: "Dashboard", icon: LayoutDashboard, href: "/user/dashboard", animation: "pulse" },
    { name: "Attendance", icon: Calendar, href: "/user/attendance", animation: "flip" },
    { name: "Timesheet", icon: BookMarked, href: "/user/timesheet", animation: "swing" },
    { name: "Leave", icon: CalendarDays, href: "/user/leave", animation: "float" },
    { name: "WFH", icon: Home, href: "/user/wfh", animation: "wiggle" },
    { name: "Time Slips", icon: Clock, href: "/user/timeslips", animation: "float" },
    { name: "Salary Slips", icon: BadgeDollarSign, href: "/user/payroll", animation: "bounce" },
    { name: "Expenses & Travels", icon: Receipt, href: "/user/expenses", animation: "float" },
    { name: "Messages", icon: Users, href: "/user/messages", animation: "wiggle" },
    { name: "Polls", icon: Vote, href: "/user/polls", animation: "rubberBand" },
    { name: "Policy", icon: Shield, href: "/user/policy", animation: "float" },
{ name: "My Meetings", icon: Video, href: "/user/meetings", animation: "bounce" },
    { name: "Posts", icon: LayoutDashboard, href: "/user/posts", animation: "pulse" },
    { name: "My Profile", icon: UserRound, href: "/user/profile", animation: "pulse" },
  ],
};

const getPrimaryRoleFromPathAndRoles = (pathname: string, roles: string[] = []): string => {
  const isAdminRoute = pathname.startsWith("/admin");
  if (!isAdminRoute) return "EMPLOYEE";

  if (roles.includes("SUPER_ADMIN") || roles.includes("ORG_ADMIN")) return "ADMIN";
  if (roles.includes("HR")) return "HR";
  return "ADMIN";
};

export default function Sidebar() {
  const pathname = usePathname();
  const { isPathAllowed, isBasicPlan } = usePlanAccess();
  const isEmployeeRoute = pathname?.startsWith("/user");
  const [isBasicMenuInferred, setIsBasicMenuInferred] = useState<boolean>(false);
  const effectiveBasicMenu = isBasicPlan || isBasicMenuInferred;
  const [mode, setMode] = useState<SidebarMode>("expanded");
  const initialRole = useMemo(() => getPrimaryRoleFromPathAndRoles(pathname || "/"), [pathname]);
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
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() =>
    filterMenuItemsByPlan(
      applyBasicPlanMenuScope([...(menuByRole[initialRole] || [])], initialRole, effectiveBasicMenu)
    )
  );
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const sidebarIconGradientClass =
    "bg-gradient-to-r from-[#184a8c] to-[#00b4db] bg-clip-text text-transparent";
  const isExpanded = mode === "expanded";

  useEffect(() => {
    const roleFromPath = getPrimaryRoleFromPathAndRoles(pathname || "/");
    setMenuItems(
      filterMenuItemsByPlan(
        applyBasicPlanMenuScope(
          [...(menuByRole[roleFromPath] || [])],
          roleFromPath,
          effectiveBasicMenu
        )
      )
    );
  }, [effectiveBasicMenu, filterMenuItemsByPlan, pathname]);

  useEffect(() => {
const fetchProfile = async () => {
      try {
        const res = await getProfile();
        const user: Profile = res.data;
        const normalizePlan = (value?: string | number | null): string =>
          String(value ?? "").trim().toUpperCase();
        const isBasicPlanHint = (value?: string | number | null): boolean => {
          const normalized = normalizePlan(value);
          return normalized === "1" || normalized === "BASIC";
        };
        const typeHints = [
          user.planType,
          user.pricingTypeId,
          user.organization?.planType,
          user.organization?.pricingTypeId,
          user.organization?.pricingType?.typeId,
        ];
        let inferredBasic = typeHints.some((hint) => isBasicPlanHint(hint));

        if (!inferredBasic && user.organizationId) {
          try {
            const orgRes = await getOrganization(user.organizationId);
            const org = orgRes.data || {};
            const orgTypeHints = [
              org?.planType,
              org?.pricingTypeId,
              org?.pricingType?.typeId,
            ];
            inferredBasic = orgTypeHints.some((hint) => isBasicPlanHint(hint));
          } catch {
            // ignore org fallback failures
          }
        }

        setIsBasicMenuInferred(inferredBasic);

        const roles: string[] = user.roles?.map((r: Role) => r.roleName) || [];
        const primaryRole = getPrimaryRoleFromPathAndRoles(pathname || "/", roles);
        let items: MenuItem[] = [...(menuByRole[primaryRole] || [])];
        setMenuItems(applyBasicPlanMenuScope(items, primaryRole, isBasicPlan || inferredBasic));

        // For employees: conditionally add Performance, WFH Monitor, Projects
        if (primaryRole === "EMPLOYEE") {
          // Performance — only if admin enabled it
          try {
            const perfRes = await getPerformanceSettings();
            if (perfRes.data?.isEnabled) {
              items = [
                ...items,
                { name: "Performance", icon: TrendingUp, href: "/user/performance", animation: "float" as const },
              ];
            }
          } catch {
            // ignore — don't block sidebar load
          }

          // WFH Monitor — only if today's WFH is approved
          try {
            const wfhRes = await getWfhToday();
            if (wfhRes.data?.hasApprovedWfh) {
              items = [
                ...items,
                { name: "WFH Monitor", icon: Monitor, href: "/user/wfh-monitor", animation: "pulse" as const },
              ];
            }
          } catch {
            // ignore — don't block sidebar load
          }

          if (!(isBasicPlan || inferredBasic)) {
            items = [
              ...items,
              { name: "My Projects", icon: FolderKanban, href: "/user/projects", animation: "float" as const },
            ];
          }
        }

        setMenuItems(
          filterMenuItemsByPlan(applyBasicPlanMenuScope(items, primaryRole, isBasicPlan || inferredBasic))
        );

      } catch {
        // Keep fallback menu rendered from path; avoid blocking interaction.
      }
    };

    fetchProfile();
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
              <span className="font-semibold text-sm bg-gradient-to-r from-[#184a8c] to-[#00b4db] bg-clip-text text-transparent truncate">
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
                        href={child.href}
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
