"use client";

import { Bell, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ThemeSwitcherUser } from "./theme-switcher-user";

export default function Topbar() {
  const user = {
    name: "Alok Sahoo",
    role: "Admin",
    avatar: "/avatar.jpg", // fallback to initials if this fails
  };

  return (
    <header className="w-full h-14 bg-background-top border-b px-4 flex items-center justify-between text-muted-foreground">
      {/* Left: Logo or mobile menu */}
      <div className="flex items-center gap-2">
        <Menu className="w-5 h-5 md:hidden" />
        <span className="font-semibold text-foreground">Panchsoft Technologies Pvt. Ltd.</span>
      </div>

      {/* Center: Horizontal menu */}
      {/* <nav className="hidden md:flex items-center gap-6 text-sm text-foreground">
        <a href="#" className="hover:text-primary transition-colors">
          Dashboard
        </a>
        <a href="#" className="hover:text-primary transition-colors">
          Employees
        </a>
        <a href="#" className="hover:text-primary transition-colors">
          Leave
        </a>
        <a href="#" className="hover:text-primary transition-colors">
          Reports
        </a>
      </nav> */}

      {/* Right: Notification + Avatar */}
      <div className="flex items-center gap-4">
        <ThemeSwitcherUser/>
        <Button variant="outline" size="icon">
          <Bell className="w-5 h-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer border p-1 rounded-md">
              <Avatar>
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-sm font-medium text-foreground">
                {user.name}
              </div>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            {/* User avatar and info in dropdown */}
            <div className="flex items-center gap-3 p-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name[0]}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {user.name}
                </p>
                <p className="text-xs text-muted-foreground">{user.role}</p>
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem>Logout</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
