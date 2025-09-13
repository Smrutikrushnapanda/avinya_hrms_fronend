"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ThemeSwitcherUser } from "./theme-switcher-user";
import { getProfile } from "@/app/api/api";

export default function Topbar() {
  const router = useRouter();

  const [user, setUser] = useState({
    name: "",
    role: "",
    avatar: "",
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getProfile();
        const data = response.data;
        console.log(data);
        
        // Defensive check for properties
        setUser({
          name: [data?.firstName, data?.middleName, data?.lastName]
  .filter(Boolean) // removes undefined, null, empty strings
  .join(" ") || "User",
          role: data?.roles[0].roleName || "Role",
          avatar: data?.avatar || "/avatar.jpg",
        });
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUser();
  }, []);

  const handleMenuClick = (action: string) => {
    if (action === "logout") {
      router.push("/logout");
    }
  };

  return (
    <header className="w-full h-14 bg-background-top border-b px-4 flex items-center justify-between text-muted-foreground">
      {/* Left: Logo or mobile menu */}
      <div className="flex items-center gap-2">
        <Menu className="w-5 h-5 md:hidden" />
        <span className="font-semibold text-foreground">Panchsoft Technologies Pvt. Ltd.</span>
      </div>

      {/* Right: Notification + Avatar */}
      <div className="flex items-center gap-4">
        <ThemeSwitcherUser />
        <Button variant="outline" size="icon" aria-label="Notifications">
          <Bell className="w-5 h-5" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer border p-1 rounded-md">
              <Avatar>
                <AvatarImage src={user.avatar || "/avatar.jpg"} alt={user.name || "User"} />
                <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-sm font-medium text-foreground">
                {user.name || "User"}
              </div>
            </div>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center gap-3 p-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={user.avatar || "/avatar.jpg"} alt={user.name || "User"} />
                <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{user.name || "User"}</p>
                <p className="text-xs text-muted-foreground">{user.role || "Role"}</p>
              </div>
            </div>

            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleMenuClick("logout")}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
