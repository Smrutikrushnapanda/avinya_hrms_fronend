"use client";

import { useEffect, useMemo, useState } from "react";
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
import { getInboxMessages, getOrganization, getProfile, markMessageRead } from "@/app/api/api";
import { Bell, Search, X } from "lucide-react";
import { createMessageSocket } from "@/lib/socket";
import { toast } from "sonner";
import axios from "axios";

type InboxMessage = {
  id: string;
  title: string;
  body: string;
  type?: string;
  sentAt?: string;
  status?: "UNREAD" | "READ";
  readAt?: string | null;
  senderUserId?: string;
};

type UserRole = "ADMIN" | "EMPLOYEE";

type SearchTarget = {
  label: string;
  href: string;
  keywords?: string[];
};

export default function Topbar() {
  const router = useRouter();

  const [user, setUser] = useState({
    name: "",
    role: "",
    avatar: "",
  });
  const [primaryRole, setPrimaryRole] = useState<UserRole | null>(null);
  const [organizationName, setOrganizationName] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(true);
  const [searchResults, setSearchResults] = useState<SearchTarget[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);

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

        const roles: string[] = data?.roles?.map((r: { roleName: string }) => r.roleName) || [];
        const pathRole: UserRole = window.location.pathname.startsWith("/admin") ? "ADMIN" : "EMPLOYEE";
        const resolvedRole: UserRole =
          (roles.includes("ADMIN") && pathRole === "ADMIN") ? "ADMIN" :
          (roles.includes("EMPLOYEE") && pathRole === "EMPLOYEE") ? "EMPLOYEE" :
          (roles.includes("ADMIN") ? "ADMIN" : "EMPLOYEE");
        setPrimaryRole(resolvedRole);
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

  const handleSelect = (href: string) => {
    router.push(href);
    setSearchQuery("");
    setSearchFocused(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      toast.info("Type something to search");
      return;
    }

    if (!primaryRole) {
      toast.error("We couldn't detect your role to search pages.");
      return;
    }

    const match = searchResults[0];
    if (match) handleSelect(match.href);
    else toast.error("No matching page found");
  };

  const clearSearch = () => {
    setSearchQuery("");
  };

  useEffect(() => {
    if (!primaryRole) return;
    const query = searchQuery.trim();
    if (!query) {
      setSearchResults([]);
      return;
    }

    const controller = new AbortController();
    setSearchLoading(true);

    const timeout = setTimeout(() => {
      axios
        .get("/api/search", {
          params: { q: query, role: primaryRole },
          signal: controller.signal,
        })
        .then((res) => setSearchResults(res.data?.results || []))
        .catch((err) => {
          if (axios.isCancel(err)) return;
          console.error("Search failed", err);
        })
        .finally(() => setSearchLoading(false));
    }, 180); // debounce

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [primaryRole, searchQuery]);

  const normalizeMessage = (msg: any): InboxMessage => ({
    id: msg?.id,
    title: msg?.title || "Message",
    body: msg?.body || "",
    type: msg?.type,
    sentAt: msg?.sentAt || msg?.createdAt,
    status: msg?.status || "UNREAD",
    readAt: msg?.readAt || null,
    senderUserId: msg?.senderUserId,
  });

  const formatMessageTime = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    const now = new Date();
    const isToday =
      date.getFullYear() === now.getFullYear() &&
      date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      date.getFullYear() === yesterday.getFullYear() &&
      date.getMonth() === yesterday.getMonth() &&
      date.getDate() === yesterday.getDate();

    if (isToday) {
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    if (isYesterday) return "Yesterday";
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const fetchMessages = async () => {
    try {
      setLoadingMessages(true);
      const res = await getInboxMessages();
      const list = Array.isArray(res.data) ? res.data : [];
      setMessages(list.map(normalizeMessage));
    } catch (error) {
      console.error("Error fetching messages:", error);
    } finally {
      setLoadingMessages(false);
    }
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const socket = createMessageSocket(token);
    socket.on("message:new", (payload: any) => {
      const incoming = payload?.message;
      if (!incoming?.id) return;
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [{ ...normalizeMessage(incoming), status: "UNREAD" }, ...prev];
      });
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const unreadCount = useMemo(
    () => messages.filter((m) => m.status === "UNREAD").length,
    [messages]
  );

  const recentMessages = useMemo(() => messages.slice(0, 5), [messages]);

  const handleMarkRead = async (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, status: "READ", readAt: new Date().toISOString() } : m
      )
    );
    try {
      await markMessageRead(messageId);
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    const unread = messages.filter((m) => m.status === "UNREAD");
    if (unread.length === 0) return;
    setMessages((prev) =>
      prev.map((m) => (m.status === "UNREAD" ? { ...m, status: "READ" } : m))
    );
    try {
      await Promise.all(unread.map((m) => markMessageRead(m.id)));
    } catch {
      // ignore
    }
  };

  const handleViewNotification = (messageId?: string) => {
    if (messageId) {
      router.push(`/user/notifications?messageId=${messageId}`);
    } else {
      router.push("/user/notifications");
    }
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
        <div className="relative">
          <form
            onSubmit={handleSearch}
            className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-sm w-56"
          >
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              className="bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground w-full"
              placeholder="Search anything..."
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 120)}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button type="button" onClick={clearSearch} className="text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3" />
              </button>
            )}
          </form>

          {searchFocused && searchQuery.trim() && (
            <div className="absolute z-50 mt-1 w-64 sm:w-72 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              {searchLoading ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">Searching...</div>
              ) : searchResults.length === 0 ? (
                <div className="px-3 py-2 text-xs text-muted-foreground">No matching pages</div>
              ) : (
                searchResults.map((item) => (
                  <button
                    key={item.href}
                    className="w-full px-3 py-2 text-left hover:bg-accent hover:text-accent-foreground transition-colors flex flex-col"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(item.href);
                    }}
                  >
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground truncate">{item.href}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        <ThemeSwitcherUser />

        {/* Notification Bell with Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="relative w-10 h-10 bg-card border border-border rounded-xl flex items-center justify-center shadow-sm hover:border-primary/40 transition-colors">
              <Bell className="w-4 h-4 text-muted-foreground" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center border-2 border-card">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <div className="flex items-center justify-between p-3 border-b">
              <p className="font-semibold text-sm">Notifications</p>
              <button
                className="text-xs text-primary hover:underline disabled:text-muted-foreground"
                onClick={handleMarkAllRead}
                disabled={unreadCount === 0}
              >
                Mark all as read
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {loadingMessages ? (
                <div className="p-3 text-xs text-muted-foreground">Loading notifications...</div>
              ) : recentMessages.length === 0 ? (
                <div className="p-3 text-xs text-muted-foreground">No notifications yet.</div>
              ) : (
                recentMessages.map((message) => (
                  <DropdownMenuItem
                    key={message.id}
                    className="flex flex-col items-start p-3 cursor-pointer"
                    onClick={() => {
                      handleMarkRead(message.id);
                      handleViewNotification(message.id);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{message.title}</p>
                      {message.status === "UNREAD" && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{message.body}</p>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {formatMessageTime(message.sentAt)}
                    </span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            <div className="p-2 border-t">
              <button
                className="w-full text-center text-xs text-primary hover:underline p-2"
                onClick={() => handleViewNotification()}
              >
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
