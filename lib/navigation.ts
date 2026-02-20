import {
  LayoutDashboard,
  Users,
  Calendar,
  BadgeDollarSign,
  BookMarked,
  Settings,
  Bell,
  UserCog,
} from "lucide-react";

export interface NavItem {
  name: string;
  icon: any;
  href: string;
  description?: string;
  badge?: string;
}

export const adminNavigation: NavItem[] = [
  {
    name: "Dashboard",
    icon: LayoutDashboard,
    href: "/admin/dashboard",
    description: "Overview and key metrics",
  },
  {
    name: "Employees",
    icon: Users,
    href: "/admin/employees",
    description: "Manage employee data",
  },
  {
    name: "Attendance",
    icon: Calendar,
    href: "/admin/attendance",
    description: "Track attendance records",
  },
  {
    name: "Timesheets",
    icon: BookMarked,
    href: "/admin/timesheets",
    description: "Review employee timesheets",
  },
  {
    name: "Clients & Projects",
    icon: BookMarked,
    href: "/admin/clients-projects",
    description: "Manage clients and projects",
  },
  {
    name: "Payroll",
    icon: BadgeDollarSign,
    href: "/admin/payroll",
    description: "Salary and compensation",
  },
  {
    name: "Reports",
    icon: BookMarked,
    href: "/admin/reports",
    description: "Analytics and reports",
  },
];

export const secondaryNavigation: NavItem[] = [
  {
    name: "Settings",
    icon: Settings,
    href: "/admin/settings",
    description: "System configuration",
  },
  {
    name: "Notifications",
    icon: Bell,
    href: "/admin/notifications",
    description: "Alerts and messages",
    badge: "3",
  },
  {
    name: "Profile",
    icon: UserCog,
    href: "/admin/profile",
    description: "User profile settings",
  },
];
