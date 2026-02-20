"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getProfile, getChatConversations } from "@/app/api/api";
import { toast } from "sonner";
import {
  Boxes,
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
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const menuByRole: Record<string, MenuItem[]> = {
  ADMIN: [
    { name: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard", animation: "pulse" },
    { name: "Employees", icon: Users, href: "/admin/employees", animation: "wiggle" },
    { name: "Attendance", icon: Calendar, href: "/admin/attendance", animation: "flip" },
    { name: "Timesheet", icon: BookMarked, href: "/admin/timesheets", animation: "swing" },
    { name: "Time Slips", icon: Clock, href: "/admin/timeslips", animation: "float" },
    { name: "Clients & Projects", icon: ListMinus, href: "/admin/clients-projects", animation: "float" },
    {
      name: "Leave & WFH",
      icon: CalendarDays,
      animation: "float",
      children: [
        { name: "Leave", icon: CalendarDays, href: "/admin/leave", animation: "float" },
        { name: "WFH", icon: Home, href: "/admin/wfh", animation: "wiggle" },
      ],
    },
    { name: "Payroll", icon: BadgeDollarSign, href: "/admin/payroll", animation: "bounce" },
    { name: "Reports", icon: BookMarked, href: "/admin/reports", animation: "swing" },
    { name: "Polls", icon: Vote, href: "/admin/polls", animation: "rubberBand" },
    { name: "Settings", icon: Settings, href: "/admin/settings", animation: "spin" },
    { name: "Log Report", icon: FileText, href: "/admin/logreport", animation: "float" },
  ],
  EMPLOYEE: [
    { name: "Dashboard", icon: LayoutDashboard, href: "/user/dashboard", animation: "pulse" },
    { name: "Attendance", icon: Calendar, href: "/user/attendance", animation: "flip" },
    { name: "Timesheet", icon: BookMarked, href: "/user/timesheet", animation: "swing" },
    { name: "Leave", icon: CalendarDays, href: "/user/leave", animation: "float" },
    { name: "Time Slips", icon: Clock, href: "/user/timeslips", animation: "float" },
    { name: "Salary Slips", icon: BadgeDollarSign, href: "/user/payroll", animation: "bounce" },
    { name: "Messages", icon: Users, href: "/user/messages", animation: "wiggle" },
    { name: "Polls", icon: Vote, href: "/user/polls", animation: "rubberBand" },
  ],
};

export default function Sidebar() {
  const pathname = usePathname();
  const [mode, setMode] = useState<SidebarMode>("expanded");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [dashboardHref, setDashboardHref] = useState<string>("/");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [chatUnreadCount, setChatUnreadCount] = useState(0);
  const [user, setUser] = useState({
    name: "",
    role: "",
    avatar: "",
  });

  const isExpanded = mode === "expanded";

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        const user: Profile = res.data;

        setUser({
          name: [user?.firstName, user?.middleName, user?.lastName]
            .filter(Boolean)
            .join(" ") || "User",
          role: user?.roles?.[0]?.roleName || "Role",
          avatar: user?.avatar || "/avatar.jpg",
        });

        const roles: string[] = user.roles?.map((r: Role) => r.roleName) || [];
        
        // Determine which dashboard we're on
        const pathname = window.location.pathname;
        const isAdminRoute = pathname.startsWith('/admin');
        
        // Check stored role preference or determine from current route
        const storedRole = localStorage.getItem("user_role");
        
        let primaryRole = "";
        
        if (isAdminRoute) {
          // If on admin route, show admin menu
          primaryRole = "ADMIN";
        } else {
          // If on user route, show employee menu
          primaryRole = "EMPLOYEE";
        }
        
        // Get menu items based on primary role
        let items: MenuItem[] = [];
        if (menuByRole[primaryRole]) {
          items = [...menuByRole[primaryRole]];
        }
        
        setMenuItems(items);

        // Set dashboard href based on role
        if (primaryRole === "ADMIN") {
          setDashboardHref("/admin/dashboard");
        } else {
          setDashboardHref("/user/dashboard");
        }
      } catch (err: unknown) {
        toast.error("Failed to load profile");
      }
    };

    fetchProfile();
  }, []);

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
    const isEmployeeRoute = window.location.pathname.startsWith("/user");
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
  }, []);

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 ease-in-out flex flex-col relative"
        )}
        style={{ width: isExpanded ? "224px" : "56px" }}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          {isExpanded && (
            <Link href={dashboardHref} className="font-semibold text-lg text-gray-900 dark:text-gray-100 hover:opacity-80 transition-opacity">
              Avinya HRMS
            </Link>
          )}
          {!isExpanded && (
            <Boxes className="w-6 h-6 text-gray-900 dark:text-gray-100 transition-transform duration-200 hover:scale-125" />
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

        <div className="flex-1 flex flex-col items-start px-2 py-4 gap-1">
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
                          className={cn(
                            isGroupActive
                              ? "text-gray-900 dark:text-gray-100"
                              : "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                          )}
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
                            className={cn(
                              isActive
                                ? "text-gray-900 dark:text-gray-100"
                                : "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                            )}
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
                          className={cn(
                            isChildActive
                              ? "text-gray-900 dark:text-gray-100"
                              : "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                          )}
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
