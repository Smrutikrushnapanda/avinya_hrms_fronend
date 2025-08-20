"use client";

import {
  Boxes,
  Users,
  LayoutDashboard,
  BookMarked,
  BadgeDollarSign,
  Settings,
  PanelRight,
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

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useState } from "react";

const menu = [
  { name: "Dashboard", icon: LayoutDashboard, href: "/user/dashboard" },
  { name: "Employees", icon: Users, href: "/user/employees" },
  { name: "Departments", icon: Boxes, href: "/user/departments" },
  { name: "Reports", icon: BookMarked, href: "/user/reports" },
  { name: "Payroll", icon: BadgeDollarSign, href: "/user/payroll" },
];


type SidebarMode = "expanded" | "collapsed" | "hover";

export default function Sidebar() {
  const [mode, setMode] = useState<SidebarMode>("collapsed");
  const [hovered, setHovered] = useState(false);

  const isExpanded = mode === "expanded" || (mode === "hover" && hovered);

  return (
    <TooltipProvider delayDuration={100}>
      <aside
        className={cn(
          "h-screen bg-white border-r transition-all duration-200 ease-in-out flex flex-col relative",
          isExpanded ? "w-56" : "w-14"
        )}
        onMouseEnter={() => mode === "hover" && setHovered(true)}
        onMouseLeave={() => mode === "hover" && setHovered(false)}
      >
        <div className="flex-1 flex flex-col items-start px-2 py-4 gap-2">
          {menu.map((item) => (
            <Tooltip key={item.name}>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 w-full p-2 rounded-md text-muted-foreground hover:bg-muted transition-colors",
                    !isExpanded && "justify-center"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {isExpanded && <span>{item.name}</span>}
                </Link>
              </TooltipTrigger>
              {!isExpanded && (
                <TooltipContent side="right" sideOffset={8}>
                  {item.name}
                </TooltipContent>
              )}
            </Tooltip>
          ))}
        </div>

        {/* Dropdown Menu */}
        <div className="absolute bottom-4 left-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-md text-muted-foreground hover:bg-accent">
  <PanelRight className="h-4 w-4" />
  <span className="sr-only">Toggle Sidebar</span>
</button>

            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Sidebar Control</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {(["expanded", "collapsed", "hover"] as SidebarMode[]).map(
                (item) => (
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
                    {!mode.startsWith(item) && <div className="mr-4" />}{" "}
                    {/* spacing */}
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </DropdownMenuItem>
                )
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
