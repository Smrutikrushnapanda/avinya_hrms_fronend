"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ThemeSwitcherUser } from "./theme-switcher-user";
import { usePlanAccess } from "@/components/plan-access-provider";
import { getEmployeeByUserId, getInboxMessages, getOrganization, getProfile, markMessageRead } from "@/app/api/api";
import { Bell, Search, X, UtensilsCrossed } from "lucide-react";
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

type SearchTarget = {
  label: string;
  href: string;
  keywords?: string[];
};

type ProfileLike = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  userName?: string;
  employee?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
  };
  roles?: Array<{ roleName?: string }>;
  avatar?: string;
  organizationId?: string;
};

function resolveDisplayName(data: ProfileLike, employeeData?: { firstName?: string; middleName?: string; lastName?: string } | null): string {
  const employeeRecordName = [employeeData?.firstName, employeeData?.middleName, employeeData?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (employeeRecordName) return employeeRecordName;

  const profileName = [data?.firstName, data?.middleName, data?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (profileName) return profileName;

  const employeeName = [data?.employee?.firstName, data?.employee?.middleName, data?.employee?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();
  if (employeeName) return employeeName;

  return data?.userName || "User";
}

function resolveDisplayRole(
  roles: Array<{ roleName?: string }> | undefined,
  isEmployeeRoute: boolean
): string {
  const normalizedRoles = Array.isArray(roles)
    ? roles.map((r) => String(r?.roleName || "").toUpperCase()).filter(Boolean)
    : [];

  if (isEmployeeRoute) return "Employee";
  if (
    normalizedRoles.includes("ADMIN") ||
    normalizedRoles.includes("SUPER_ADMIN") ||
    normalizedRoles.includes("ORG_ADMIN")
  ) {
    return "Admin";
  }
  if (normalizedRoles.includes("HR")) return "HR";
  return "Role";
}

export default function Topbar() {
  const router = useRouter();
  const pathname = usePathname();
  const isEmployee = pathname.startsWith("/user");
  const { isPathAllowed } = usePlanAccess();

  const [user, setUser] = useState({ name: "", role: "", avatar: "" });
  const [organizationName, setOrganizationName] = useState<string>("");
  const [organizationLogo, setOrganizationLogo] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchFocused, setSearchFocused] = useState<boolean>(false);
  const [currentDateTime, setCurrentDateTime] = useState<string>("");
  const [messages, setMessages] = useState<InboxMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(true);
  const [searchResults, setSearchResults] = useState<SearchTarget[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [isLunch, setIsLunch] = useState<boolean>(false);

  useEffect(() => {
    const update = () => {
      setCurrentDateTime(
        new Date().toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await getProfile();
        const data = (res.data || {}) as ProfileLike;
        let employeeNameData: { firstName?: string; middleName?: string; lastName?: string } | null = null;
        const resolvedUserId = (res.data?.id ?? res.data?.userId ?? "").toString();

        if (isEmployee && resolvedUserId) {
          try {
            const empRes = await getEmployeeByUserId(resolvedUserId);
            const emp = empRes.data || {};
            employeeNameData = {
              firstName: emp?.firstName,
              middleName: emp?.middleName,
              lastName: emp?.lastName,
            };
          } catch {
            employeeNameData = null;
          }
        }

        setUser({
          name: resolveDisplayName(data, employeeNameData),
          role: resolveDisplayRole(data?.roles, isEmployee),
          avatar: data?.avatar || "/avatar.jpg",
        });
        if (data?.organizationId) {
          const orgRes = await getOrganization(data.organizationId);
          setOrganizationName(orgRes.data?.name || "");
          setOrganizationLogo(orgRes.data?.logoUrl || "");
        }
      } catch { /* ignore */ }
    };
    fetchUser();
  }, [isEmployee]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) { setSearchResults([]); setSearchLoading(false); return; }
    const controller = new AbortController();
    setSearchLoading(true);
    const timeout = setTimeout(() => {
      axios
        .get("/api/search", { params: { q: query, role: isEmployee ? "EMPLOYEE" : "ADMIN" }, signal: controller.signal })
        .then((res) =>
          setSearchResults(
            (res.data?.results || []).filter((item: SearchTarget) =>
              isPathAllowed(item.href)
            )
          )
        )
        .catch((err) => { if (!axios.isCancel(err)) console.error("Search failed", err); })
        .finally(() => setSearchLoading(false));
    }, 180);
    return () => { clearTimeout(timeout); controller.abort(); };
  }, [searchQuery, isEmployee, isPathAllowed]);

  const normalizeMessage = (msg: any): InboxMessage => ({
    id: msg?.id,
    title: msg?.title || "Message",
    body: msg?.body || "",
    type: msg?.type,
    sentAt: msg?.sentAt || msg?.createdAt,
    status: msg?.status === "READ" ? "READ" : "UNREAD",
    readAt: msg?.readAt || null,
    senderUserId: msg?.senderUserId,
  });

  const deduplicateMessages = (msgs: InboxMessage[]): InboxMessage[] => {
    const seen = new Set<string>();
    return msgs.filter((m) => { if (seen.has(m.id)) return false; seen.add(m.id); return true; });
  };

  const formatMessageTime = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    const now = new Date();
    const yesterday = new Date(now); yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === now.toDateString()) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
    return date.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoadingMessages(true);
        const res = await getInboxMessages();
        const list = Array.isArray(res.data) ? res.data : [];
        setMessages(deduplicateMessages(list.map(normalizeMessage)));
      } catch { /* ignore */ } finally { setLoadingMessages(false); }
    };
    fetchMessages();
  }, []);

  useEffect(() => {
    if (!isEmployee) return;
    const handler = (e: Event) => setIsLunch(!!(e as CustomEvent).detail?.isLunch);
    window.addEventListener("wfhLunchUpdate", handler);
    return () => window.removeEventListener("wfhLunchUpdate", handler);
  }, [isEmployee]);

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
        return deduplicateMessages([{ ...normalizeMessage(incoming), status: "UNREAD" }, ...prev]);
      });
    });
    return () => { socket.disconnect(); };
  }, []);

  const unreadCount = useMemo(() => messages.filter((m) => m.status === "UNREAD").length, [messages]);
  const recentMessages = useMemo(() => messages.slice(0, 5), [messages]);

  const handleMarkRead = async (id: string) => {
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, status: "READ", readAt: new Date().toISOString() } : m));
    try { await markMessageRead(id); } catch { /* ignore */ }
  };

  const handleMarkAllRead = async () => {
    const unread = messages.filter((m) => m.status === "UNREAD");
    if (!unread.length) return;
    setMessages((prev) => prev.map((m) => m.status === "UNREAD" ? { ...m, status: "READ" } : m));
    try { await Promise.all(unread.map((m) => markMessageRead(m.id))); } catch { /* ignore */ }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      setSearchLoading(false);
      setSearchResults([]);
      toast.info("Type something to search");
      return;
    }
    const match = searchResults[0];
    if (match) { router.push(match.href); setSearchQuery(""); setSearchFocused(false); }
    else toast.error("No matching page found");
  };

  return (
    <header className="w-full h-14 bg-background-top border-b px-3 sm:px-4 flex items-center gap-2 sm:gap-3 text-muted-foreground">
      {/* Left: Org logo + name */}
      <div className="flex items-center gap-2 min-w-0 max-w-[45%] sm:max-w-none">
        {organizationLogo && (
          <img src={organizationLogo} alt={organizationName + " Logo"} className="h-8 w-auto object-contain" />
        )}
        <span className="font-semibold text-foreground text-sm md:text-base truncate">
          {organizationName || "Organization"}
        </span>
      </div>

      {/* Center: Date/Time + Lunch badge (employee only) */}
      <div className="hidden xl:flex flex-1 items-center justify-center gap-3 text-xs text-muted-foreground">
        <span>{currentDateTime || "Loading..."}</span>
        {isEmployee && isLunch && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 rounded-full text-[11px] font-medium border border-amber-200 dark:border-amber-700 animate-pulse">
            <UtensilsCrossed className="w-3 h-3" />
            Lunch Break
          </span>
        )}
      </div>

      {/* Right */}
      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        {/* Search */}
        <div className="relative hidden lg:block">
          <form onSubmit={handleSearch} className="flex items-center gap-2 bg-card border border-border rounded-xl px-3 py-2 shadow-sm w-56">
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
              <button type="button" onClick={() => setSearchQuery("")} className="text-muted-foreground hover:text-foreground">
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
                    onMouseDown={(e) => { e.preventDefault(); router.push(item.href); setSearchQuery(""); setSearchFocused(false); }}
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

        {/* Notification Bell */}
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
              <button className="text-xs text-primary hover:underline disabled:text-muted-foreground" onClick={handleMarkAllRead} disabled={unreadCount === 0}>
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
                      if (isEmployee) router.push(`/user/notifications?messageId=${message.id}`);
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{message.title}</p>
                      {message.status === "UNREAD" && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full">New</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{message.body}</p>
                    <span className="text-[10px] text-muted-foreground mt-1">{formatMessageTime(message.sentAt)}</span>
                  </DropdownMenuItem>
                ))
              )}
            </div>
            {isEmployee && (
              <div className="p-2 border-t">
                <button className="w-full text-center text-xs text-primary hover:underline p-2" onClick={() => router.push("/user/notifications")}>
                  View all notifications
                </button>
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-2 cursor-pointer border p-1 rounded-md">
              <Avatar>
                <AvatarImage src={user.avatar || "/avatar.jpg"} alt={user.name || "User"} />
                <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-sm font-medium text-foreground">{user.name || "User"}</div>
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
            {isEmployee ? (
              <DropdownMenuItem onSelect={() => router.push("/user/profile")}>
                My Profile
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onSelect={() => router.push("/admin/settings")}>
                Settings
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onSelect={() => { window.location.href = "/logout"; }}>
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
