"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getProfile } from "@/app/api/api";
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
  Vote,
  LucideIcon,
  ListMinus,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type SidebarMode = "expanded" | "collapsed";

interface Role {
  roleName: string;
}

interface Profile {
  roles: Role[];
}

interface MenuItem {
  name: string;
  icon: LucideIcon;
  href: string;
}

const menuByRole: Record<string, MenuItem[]> = {
  ADMIN: [
    { name: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
    { name: "Employees", icon: Users, href: "/admin/employees" },
    { name: "Attendance", icon: Calendar, href: "/admin/attendance" },
    { name: "Payroll", icon: BadgeDollarSign, href: "/admin/payroll" },
    { name: "Reports", icon: BookMarked, href: "/admin/reports" },
    { name: "Polls", icon: Vote, href: "/admin/polls" },
  ],
  EMPLOYEE: [
    { name: "Dashboard", icon: LayoutDashboard, href: "/user/dashboard" },
    { name: "My Reports", icon: BookMarked, href: "/user/reports" },
    { name: "My Payroll", icon: BadgeDollarSign, href: "/user/payroll" },
    { name: "Polls", icon: Vote, href: "/user/polls" },
  ],
};

export default function Sidebar() {
  const pathname = usePathname();
  const [mode, setMode] = useState<SidebarMode>("expanded");
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);

  const isExpanded = mode === "expanded";

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        const user: Profile = res.data;

        const roles: string[] = user.roles?.map((r: Role) => r.roleName) || [];
        let items: MenuItem[] = [];

        roles.forEach((role) => {
          if (menuByRole[role]) {
            items = [...items, ...menuByRole[role]];
          }
        });

        const unique = Array.from(
          new Map(items.map((i) => [i.name, i])).values()
        );
        setMenuItems(unique);
      } catch (err: unknown) {
        toast.error("Failed to load profile");
      }
    };

    fetchProfile();
  }, []);

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 ease-in-out flex flex-col relative"
        )}
        style={{ width: isExpanded ? "224px" : "56px" }}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800">
          {isExpanded && (
            <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
              Avinya HRMS
            </span>
          )}
          {!isExpanded && (
            <Boxes className="w-6 h-6 text-gray-900 dark:text-gray-100" />
          )}
          <button
            onClick={() => setMode(isExpanded ? "collapsed" : "expanded")}
            className="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            {isExpanded ? (
              <ListCollapse className="h-4 w-4" />
            ) : (
              <ListMinus className="h-4 w-4" />
            )}
            <span className="sr-only">Toggle Sidebar</span>
          </button>
        </div>
        <div className="flex-1 flex flex-col items-start px-2 py-4 gap-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;

            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-4 w-full p-2 rounded-lg transition-all duration-200 group relative",
                      !isExpanded && "justify-center",
                      isActive
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                    )}
                  >
                    <item.icon
                      className={cn(
                        "w-5 h-5 transition-all duration-200",
                        isActive
                          ? "text-gray-900 dark:text-gray-100"
                          : "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                      )}
                    />
                    {isExpanded && (
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
                    )}
                  </Link>
                </TooltipTrigger>
                {!isExpanded && (
                  <TooltipContent side="right" sideOffset={8}>
                    <div className="flex items-center gap-2">
                      {isActive && (
                        <div className="w-2 h-2 bg-gray-900 dark:bg-gray-100 rounded-full" />
                      )}
                      {item.name}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>
      </aside>
    </TooltipProvider>
  );
}