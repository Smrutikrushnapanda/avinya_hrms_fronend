"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Bell,
  Briefcase,
  FileText,
  Heart,
  MessageCircle,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { createMessageSocket } from "@/lib/socket";
import { getInboxMessages, markMessageRead } from "@/app/api/api";
import MobileTabHeader from "../components/MobileTabHeader";

type NotificationItem = {
  id: string;
  initials: string;
  title: string;
  subtitle: string;
  message: string;
  time: string;
  sentAtMs: number;
  isNew: boolean;
  category: "work" | "admin" | "social";
  priority: "high" | "medium" | "low";
};

const mapServerMessage = (msg: any): NotificationItem => {
  const sentAt = msg?.sentAt ? new Date(msg.sentAt) : new Date(msg?.createdAt || Date.now());
  return {
    id: msg?.id,
    initials: "HR",
    title: msg?.title || "Notification",
    subtitle: msg?.type ? `${msg.type} message` : "Admin message",
    message: msg?.body || "",
    time: formatTime(sentAt),
    sentAtMs: sentAt.getTime(),
    isNew: msg?.status === "UNREAD",
    category: "admin",
    priority: "medium",
  };
};

const dedupeNotifications = (items: NotificationItem[]) => {
  const seen = new Set<string>();
  const result: NotificationItem[] = [];
  items.forEach((item) => {
    if (!item?.id || seen.has(item.id)) return;
    seen.add(item.id);
    result.push(item);
  });
  return result;
};

const formatTime = (date: Date) => {
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

const getPriorityColor = (priority: NotificationItem["priority"]) => {
  switch (priority) {
    case "high":
      return "#F44336";
    case "medium":
      return "#FF9800";
    case "low":
      return "#4CAF50";
    default:
      return "#0077B6";
  }
};

const CategoryIcon = ({ category }: { category: NotificationItem["category"] }) => {
  switch (category) {
    case "work":
      return <Briefcase className="w-3 h-3 text-gray-500" />;
    case "admin":
      return <FileText className="w-3 h-3 text-gray-500" />;
    case "social":
      return <Heart className="w-3 h-3 text-gray-500" />;
    default:
      return <MessageCircle className="w-3 h-3 text-gray-500" />;
  }
};

export default function NotificationList({
  title,
  backHref,
  detailHrefBase,
}: {
  title: string;
  backHref: string;
  detailHrefBase: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [refreshing, setRefreshing] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const filters = ["All", "Unread", "Today"];

  const fetchNotifications = async () => {
    try {
      const response = await getInboxMessages();
      const data = Array.isArray(response.data) ? response.data : [];
      const mapped = dedupeNotifications(data.map(mapServerMessage));
      setNotifications(mapped);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const socket = createMessageSocket(token);
    socket.on("message:new", (payload: any) => {
      const incoming = payload?.message;
      if (!incoming?.id) return;
      setNotifications((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        return [mapServerMessage({ ...incoming, status: "UNREAD" }), ...prev];
      });
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  const filteredData = useMemo(() => {
    let filtered = notifications;
    const today = new Date();

    switch (selectedFilter) {
      case "Unread":
        filtered = notifications.filter((item) => item.isNew);
        break;
      case "Today":
        filtered = notifications.filter((item) => {
          const d = new Date(item.sentAtMs);
          return (
            d.getFullYear() === today.getFullYear() &&
            d.getMonth() === today.getMonth() &&
            d.getDate() === today.getDate()
          );
        });
        break;
      default:
        filtered = notifications;
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter((item) =>
        item.title.toLowerCase().includes(searchLower) ||
        item.subtitle.toLowerCase().includes(searchLower) ||
        item.message.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [notifications, search, selectedFilter]);

  const filterCounts = useMemo(() => {
    const today = new Date();
    const isToday = (ms: number) => {
      const d = new Date(ms);
      return (
        d.getFullYear() === today.getFullYear() &&
        d.getMonth() === today.getMonth() &&
        d.getDate() === today.getDate()
      );
    };
    return {
      All: notifications.length,
      Unread: notifications.filter((n) => n.isNew).length,
      Today: notifications.filter((n) => isToday(n.sentAtMs)).length,
    };
  }, [notifications]);

  const handleRead = async (id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isNew: false } : item))
    );
    try {
      await markMessageRead(id);
    } catch {
      // ignore
    }
  };

  const handleNotificationPress = (item: NotificationItem) => {
    handleRead(item.id);
    router.push(`${detailHrefBase}/${item.id}`);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications().finally(() => setRefreshing(false));
  };

  const unreadCount = notifications.filter((n) => n.isNew).length;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      {/* <div className="bg-[#005F90] text-white px-5 pt-10 pb-28 relative">
        <div className="flex items-center">
          <button
            onClick={() => router.push(backHref)}
            className="w-9 h-9 rounded-full bg-white/95 text-[#0b4f73] flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="ml-3">
            <div className="px-3 py-1 rounded-full bg-black/20 border border-white/30">
              <span className="text-lg font-semibold tracking-wide">{title}</span>
            </div>
          </div>
          <div className="ml-auto">
            <div className="relative w-10 h-10 rounded-full bg-white/95 flex items-center justify-center">
              <Bell className="w-5 h-5 text-[#1e7ba8]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-[10px] text-white flex items-center justify-center">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
          </div>
        </div>
      </div> */}
      <MobileTabHeader
        title="Notification"
        backHref="/user/dashboard/mobile"
        showBell={false}
      />
      {/* Search + Filters Card */}
      <div className="-mt-15 px-5 relative z-10">
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-gray-100">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-3">
              <Search className="w-4 h-4 text-gray-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search messages..."
                className="w-full bg-transparent outline-none text-sm text-gray-700 placeholder:text-gray-400"
              />
            </div>
            <button className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5 text-[#005F90]" />
            </button>
          </div>

          <div className="flex justify-between bg-gray-100 rounded-2xl p-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setSelectedFilter(filter)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm ${
                  selectedFilter === filter ? "bg-[#005F90] text-white" : "text-gray-600"
                }`}
              >
                <span className="text-sm">{filter}</span>
                <span
                  className={`min-w-5 h-5 px-1 rounded-full text-[10px] font-bold flex items-center justify-center ${
                    selectedFilter === filter
                      ? "bg-white/20 text-white"
                      : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {filterCounts[filter as keyof typeof filterCounts]}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Messages Section */}
      <div className="px-5 mt-6 pb-24">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm font-semibold">
            {search
              ? `Search Results (${filteredData.length})`
              : `${selectedFilter} Messages (${filteredData.length})`}
          </p>
          <div className="px-3 py-1 rounded-full bg-gray-100 text-xs font-semibold text-gray-700">
            {unreadCount} unread
          </div>
        </div>

        <div className="space-y-3">
          {filteredData.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-6">
              No notifications found.
            </div>
          ) : (
            filteredData.map((item, index) => (
              <button
                key={item.id}
                onClick={() => handleNotificationPress(item)}
                className={`w-full text-left rounded-2xl border p-4 shadow-sm ${
                  item.isNew ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200"
                } ${index === filteredData.length - 1 ? "mb-2" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className="relative">
                    <div className="w-11 h-11 rounded-full bg-[#0077B6] text-white flex items-center justify-center text-sm font-bold">
                      {item.initials}
                    </div>
                    {item.isNew && (
                      <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#0077B6] border-2 border-white" />
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-semibold ${item.isNew ? "text-[#0b4f73]" : "text-gray-800"}`}>
                            {item.title}
                          </p>
                          <div className="flex items-center gap-1">
                            <CategoryIcon category={item.category} />
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getPriorityColor(item.priority) }}
                            />
                          </div>
                        </div>
                        <p className={`text-xs ${item.isNew ? "text-gray-700" : "text-gray-500"}`}>
                          {item.subtitle}
                        </p>
                      </div>
                      <span className={`text-[11px] ${item.isNew ? "text-[#0b4f73]" : "text-gray-500"}`}>
                        {formatTime(new Date(item.sentAtMs))}
                      </span>
                    </div>
                    <p className={`text-xs mt-1 line-clamp-2 ${item.isNew ? "text-gray-700" : "text-gray-500"}`}>
                      {item.message}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        <div className="mt-6">
          <button
            onClick={handleRefresh}
            className="w-full text-center text-sm text-[#005F90] underline"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>
    </div>
  );
}
