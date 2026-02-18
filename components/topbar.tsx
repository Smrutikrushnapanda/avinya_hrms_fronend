"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitcherUser } from "./theme-switcher-user";
import { getProfile, getOrganization } from "@/app/api/api";
import { Bell, Search, X } from "lucide-react";

export default function Topbar() {
  const router = useRouter();

  const [user, setUser] = useState({
    name: "",
    role: "",
    avatar: "",
  });
  const [organizationName, setOrganizationName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentDateTime, setCurrentDateTime] = useState<string>("");

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      };
      setCurrentDateTime(now.toLocaleDateString('en-US', options));
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getProfile();
        const data = response.data;
        console.log(data);
        
        setUser({
          name: [data?.firstName, data?.middleName, data?.lastName]
  .filter(Boolean)
  .join(" ") || "User",
          role: data?.roles[0].roleName || "Role",
          avatar: data?.avatar || "/avatar.jpg",
        });

        if (data?.organizationId) {
          const orgRes = await getOrganization(data.organizationId);
          setOrganizationName(orgRes.data?.name || "Company Name");
        }
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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Implement search functionality here
      console.log("Searching for:", searchQuery);
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  return (
    <header className="w-full h-14 bg-background-top border-b px-4 flex items-center text-muted-foreground">
      {/* Left: Org name */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-semibold text-foreground text-sm md:text-base truncate">
          {organizationName || "Organization"}
        </span>
      </div>

      {/* Center: Date/Time */}
      <div className="flex-1 text-center text-xs text-muted-foreground">
        {currentDateTime || "Loading..."}
      </div>

      {/* Right: Search Bar + Theme Switcher + Notification Bell + Avatar */}
      <div className="flex items-center gap-4">
        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-sm w-56">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
            placeholder="Search anything..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button type="button" onClick={clearSearch} className="text-muted-foreground hover:text-foreground">
              <X className="w-3 h-3" />
            </button>
          )}
        </form>

        <ThemeSwitcherUser />

        {/* Notification Bell with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative w-10 h-10 bg-card border border-border rounded-xl flex items-center justify-center shadow-sm hover:border-primary/40 transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-card" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between p-3 border-b">
              <p className="font-semibold text-sm">Notifications</p>
              <button className="text-xs text-primary hover:underline">Mark all as read</button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              <DropdownMenuItem className="flex flex-col items-start p-3 cursor-pointer">
                <p className="text-sm font-medium">New leave request</p>
                <p className="text-xs text-muted-foreground">John Doe requested leave for tomorrow</p>
                <span className="text-[10px] text-muted-foreground mt-1">2 minutes ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start p-3 cursor-pointer">
                <p className="text-sm font-medium">Attendance marked</p>
                <p className="text-xs text-muted-foreground">Your attendance has been recorded</p>
                <span className="text-[10px] text-muted-foreground mt-1">1 hour ago</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start p-3 cursor-pointer">
                <p className="text-sm font-medium">Payroll processed</p>
                <p className="text-xs text-muted-foreground">Your salary slip is now available</p>
                <span className="text-[10px] text-muted-foreground mt-1">Yesterday</span>
              </DropdownMenuItem>
            </div>
            <div className="p-2 border-t">
              <button className="w-full text-center text-xs text-primary hover:underline p-2">
                View all notifications
              </button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

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
