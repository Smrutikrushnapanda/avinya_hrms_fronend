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
  PanelRight,
  Calendar,
} from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

type SidebarMode = "expanded" | "collapsed" | "hover";

const menuByRole: Record<string, { name: string; icon: any; href: string }[]> = {
  ADMIN: [
    { name: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
    { name: "Employees", icon: Users, href: "/admin/employees" },
    { name: "Attendance", icon: Calendar, href: "/admin/attendance" },
    { name: "Payroll", icon: BadgeDollarSign, href: "/admin/payroll" },
    { name: "Reports", icon: BookMarked, href: "/admin/reports" },
  ],
  EMPLOYEE: [
    { name: "Dashboard", icon: LayoutDashboard, href: "/user/dashboard" },
    { name: "My Reports", icon: BookMarked, href: "/user/reports" },
    { name: "My Payroll", icon: BadgeDollarSign, href: "/user/payroll" },
  ],
};

export default function Sidebar() {
  const pathname = usePathname();
  const [mode, setMode] = useState<SidebarMode>("collapsed");
  const [hovered, setHovered] = useState(false);
  const [menuItems, setMenuItems] = useState<
    { name: string; icon: any; href: string }[]
  >([]);

  const isExpanded = mode === "expanded" || (mode === "hover" && hovered);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        const user = res.data;

        const roles: string[] = user.roles?.map((r: any) => r.roleName) || [];
        let items: any[] = [];

        // ✅ merge menus of all roles
        roles.forEach((role) => {
          if (menuByRole[role]) {
            items = [...items, ...menuByRole[role]];
          }
        });

        // remove duplicates by name
        const unique = Array.from(new Map(items.map((i) => [i.name, i])).values());
        setMenuItems(unique);
      } catch (err: any) {
        toast.error("Failed to load profile");
      }
    };

    fetchProfile();
  }, []);

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "h-screen bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 transition-all duration-200 ease-in-out flex flex-col relative",
          isExpanded ? "w-56" : "w-14"
        )}
        onMouseEnter={() => mode === "hover" && setHovered(true)}
        onMouseLeave={() => mode === "hover" && setHovered(false)}
      >
        <div className="flex-1 flex flex-col items-start px-2 py-4 gap-1">
          {menuItems.map((item) => {
            const isActive = pathname === item.href;
            
            return (
              <Tooltip key={item.name}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 w-full p-3 rounded-lg transition-all duration-200 group relative",
                      !isExpanded && "justify-center",
                      // ✅ Active state with near-black colors
                      isActive
                        ? "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                    )}
                  >
                    
                    {/* Icon with near-black active color */}
                    <item.icon 
                      className={cn(
                        "w-5 h-5 transition-all duration-200",
                        isActive 
                          ? "text-gray-900 dark:text-gray-100" // Near-black active color
                          : "text-gray-500 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                      )} 
                    />
                    
                    {/* Text with near-black active color */}
                    {isExpanded && (
                      <span className={cn(
                        "font-medium transition-colors duration-200",
                        isActive 
                          ? "text-gray-900 dark:text-gray-100" // Near-black active color
                          : "text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100"
                      )}>
                        {item.name}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                {!isExpanded && (
                  <TooltipContent side="right" sideOffset={8}>
                    <div className="flex items-center gap-2">
                      {isActive && <div className="w-2 h-2 bg-gray-900 dark:bg-gray-100 rounded-full" />}
                      {item.name}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            );
          })}
        </div>

        {/* Sidebar Control Dropdown */}
        <div className="absolute bottom-4 left-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                <PanelRight className="h-4 w-4" />
                <span className="sr-only">Toggle Sidebar</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sidebar Control</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["expanded", "collapsed", "hover"] as SidebarMode[]).map((item) => (
                <DropdownMenuItem
                  key={item}
                  onClick={() => {
                    setMode(item);
                    setHovered(false);
                  }}
                  className={mode === item ? "text-primary" : ""}
                >
                  {mode === item && (
                    <div className="mr-2 w-2 h-2 rounded-full bg-primary" />
                  )}
                  {item.charAt(0).toUpperCase() + item.slice(1)}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
