"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Circle, Edit2, MessageCircle, Search, Users, X } from "lucide-react";
import { getChatConversations, getEmployees, getProfile } from "@/app/api/api";
import { createMessageSocket } from "@/lib/socket";

type ConversationParticipant = {
  userId: string;
  firstName?: string;
  lastName?: string;
};

type Conversation = {
  id: string;
  type: "DIRECT" | "GROUP";
  title?: string;
  participants: ConversationParticipant[];
  lastMessage?: {
    text?: string;
    createdAt?: string;
    senderId?: string;
    attachments?: Array<{ id: string }>;
  } | null;
  unreadCount?: number;
  updatedAt?: string;
};

type Employee = {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  workEmail?: string;
  photoUrl?: string;
};

type ProfileLike = {
  id?: string;
  userId?: string;
  organizationId?: string;
};

type PresencePayload = {
  userId?: string;
  status?: "online" | "offline";
};

type ChatMessagePayload = {
  senderId?: string;
  text?: string;
  createdAt?: string;
  attachments?: Array<{ id: string }>;
};

type ChatSocketPayload = {
  conversationId?: string;
  message?: ChatMessagePayload;
};

const normalizeConversation = (input: unknown): Conversation | null => {
  if (!input || typeof input !== "object") return null;
  const obj = input as {
    id?: string;
    type?: string;
    title?: string;
    participants?: Array<{ userId?: string; firstName?: string; lastName?: string }>;
    lastMessage?: {
      text?: string;
      createdAt?: string;
      senderId?: string;
      attachments?: Array<{ id: string }>;
    } | null;
    unreadCount?: number;
    updatedAt?: string;
  };

  if (!obj.id) return null;

  return {
    id: obj.id,
    type: obj.type === "GROUP" ? "GROUP" : "DIRECT",
    title: obj.title || "",
    participants: Array.isArray(obj.participants)
      ? obj.participants
          .filter((item) => typeof item?.userId === "string")
          .map((item) => ({
            userId: item.userId as string,
            firstName: item.firstName || "",
            lastName: item.lastName || "",
          }))
      : [],
    lastMessage: obj.lastMessage
      ? {
          text: obj.lastMessage.text || "",
          createdAt: obj.lastMessage.createdAt,
          senderId: obj.lastMessage.senderId,
          attachments: Array.isArray(obj.lastMessage.attachments)
            ? obj.lastMessage.attachments
            : [],
        }
      : null,
    unreadCount: Number(obj.unreadCount || 0),
    updatedAt: obj.updatedAt || obj.lastMessage?.createdAt || new Date().toISOString(),
  };
};

const normalizeEmployee = (input: unknown): Employee | null => {
  if (!input || typeof input !== "object") return null;
  const obj = input as {
    id?: string;
    userId?: string;
    firstName?: string;
    lastName?: string;
    workEmail?: string;
    photoUrl?: string;
  };

  if (!obj.id || !obj.userId) return null;

  return {
    id: obj.id,
    userId: obj.userId,
    firstName: obj.firstName || "",
    lastName: obj.lastName || "",
    workEmail: obj.workEmail || "",
    photoUrl: obj.photoUrl || "",
  };
};

const formatChatTime = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const resolveUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;

  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_LOCAL_API_BASE_URL ||
    "https://avinya-hrms-backend.onrender.com";

  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function MessageList() {
  const router = useRouter();

  const [search, setSearch] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selfUserId, setSelfUserId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [liveMeetings, setLiveMeetings] = useState<Set<string>>(new Set());

  const refreshLiveMeetings = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const key = "active_meetings";
      const raw = localStorage.getItem(key);
      const parsed: Array<{ conversationId: string; expiresAt: number }> = raw ? JSON.parse(raw) : [];
      const now = Date.now();
      const filtered = parsed.filter((item) => item.expiresAt > now);
      if (filtered.length !== parsed.length) localStorage.setItem(key, JSON.stringify(filtered));
      setLiveMeetings(new Set(filtered.map((item) => item.conversationId)));
    } catch {
      setLiveMeetings(new Set());
    }
  }, []);

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getChatConversations();
      const raw = Array.isArray(response.data) ? response.data : [];
      const normalized = raw
        .map((item: unknown) => normalizeConversation(item))
        .filter((item): item is Conversation => Boolean(item));

      setConversations(
        normalized.sort(
          (a, b) =>
            new Date(b.updatedAt || b.lastMessage?.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.lastMessage?.createdAt || 0).getTime(),
        ),
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadProfile = useCallback(async () => {
    const profileRes = await getProfile();
    const profile = (profileRes.data || {}) as ProfileLike;
    setSelfUserId(profile.userId || profile.id || "");
    setOrganizationId(profile.organizationId || "");
  }, []);

  const loadEmployees = useCallback(async (orgId: string, me: string) => {
    if (!orgId) return;
    const response = await getEmployees(orgId);
    const raw: unknown[] = Array.isArray(response.data?.data)
      ? response.data.data
      : Array.isArray(response.data)
        ? response.data
        : [];

    const normalized = raw
      .map((item: unknown) => normalizeEmployee(item))
      .filter((item: Employee | null): item is Employee => Boolean(item))
      .filter((item) => item.userId !== me);

    setEmployees(normalized);
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadProfile();
      await loadConversations();
      refreshLiveMeetings();
    };
    void init();
  }, [loadConversations, loadProfile, refreshLiveMeetings]);

  useEffect(() => {
    if (!organizationId) return;
    void loadEmployees(organizationId, selfUserId);
  }, [loadEmployees, organizationId, selfUserId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    refreshLiveMeetings();
    const interval = window.setInterval(() => refreshLiveMeetings(), 30000);
    return () => window.clearInterval(interval);
  }, [refreshLiveMeetings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadConversations();
    } finally {
      setRefreshing(false);
    }
  }, [loadConversations]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const socket = createMessageSocket(token);

    socket.on("chat:presence", (payload: PresencePayload) => {
      if (!payload?.userId) return;
      const userId = payload.userId;
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (payload.status === "online") next.add(userId);
        if (payload.status === "offline") next.delete(userId);
        return next;
      });
    });

    socket.on("chat:message", (payload: ChatSocketPayload) => {
      if (!payload?.conversationId) return;
      setConversations((prev) => {
        const idx = prev.findIndex((item) => item.id === payload.conversationId);
        if (idx === -1) {
          void loadConversations();
          return prev;
        }

        const updated = [...prev];
        const target = updated[idx];
        const isOwnMessage = payload?.message?.senderId === selfUserId;

        updated[idx] = {
          ...target,
          lastMessage: {
            text: payload?.message?.text || "",
            createdAt: payload?.message?.createdAt,
            senderId: payload?.message?.senderId,
            attachments: payload?.message?.attachments || [],
          },
          updatedAt: payload?.message?.createdAt || new Date().toISOString(),
          unreadCount: isOwnMessage ? 0 : (target.unreadCount || 0) + 1,
        };

        return [updated[idx], ...updated.filter((_, i) => i !== idx)].sort(
          (a, b) =>
            new Date(b.updatedAt || b.lastMessage?.createdAt || 0).getTime() -
            new Date(a.updatedAt || a.lastMessage?.createdAt || 0).getTime(),
        );
      });
    });

    return () => {
      socket.disconnect();
      setOnlineUsers(new Set());
    };
  }, [loadConversations, selfUserId]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((employee) => map.set(employee.userId, employee));
    return map;
  }, [employees]);

  const getDisplayParticipant = useCallback(
    (conversation: Conversation) => {
      if (conversation.type === "GROUP") return null;
      const other = conversation.participants.find((participant) => participant.userId !== selfUserId);
      return other || conversation.participants[0];
    },
    [selfUserId],
  );

  const getConversationTitle = useCallback(
    (conversation: Conversation) => {
      if (conversation.type === "GROUP") return conversation.title || "Group Chat";
      const participant = getDisplayParticipant(conversation);
      const name = `${participant?.firstName || ""} ${participant?.lastName || ""}`.trim();
      return name || "Direct Chat";
    },
    [getDisplayParticipant],
  );

  const filtered = useMemo(() => {
    return conversations.filter((conversation) => {
      const name = getConversationTitle(conversation);
      const lastText = conversation.lastMessage?.text || "";
      if (!search.trim()) return true;
      const query = search.toLowerCase();
      return name.toLowerCase().includes(query) || lastText.toLowerCase().includes(query);
    });
  }, [conversations, getConversationTitle, search]);

  const summary = useMemo(() => {
    const unread = conversations.reduce((sum, item) => sum + (item.unreadCount || 0), 0);
    return {
      total: conversations.length,
      unread,
      online: onlineUsers.size,
    };
  }, [conversations, onlineUsers]);

  return (
    <div className="h-[100dvh] bg-[#f8fbff] flex flex-col overflow-hidden pb-16">
      <div className="sticky top-0 z-20 shrink-0 bg-[#f8fbff]">
        <div className="bg-[#005F90] pt-[max(32px,env(safe-area-inset-top))] pb-3 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => router.push("/user/dashboard/mobile")}
              className="p-1 rounded-md text-white hover:bg-white/10 hover:text-white transition-colors"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-[22px] font-bold text-white">Chats</h1>
          </div>
          <button onClick={() => router.push("/user/dashboard/mobile/messages/new")} className="text-white">
            <Edit2 className="w-5 h-5" />
          </button>
        </div>

        <div className="mx-4 -mt-3 bg-white border border-slate-200 rounded-xl px-3 py-2.5 flex items-center gap-2">
          <Search className="w-4.5 h-4.5 text-slate-500" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search"
            className="flex-1 text-[13px] text-slate-900 placeholder:text-slate-400 outline-none"
          />
          {search ? (
            <button onClick={() => setSearch("")}>
              <X className="w-4.5 h-4.5 text-slate-500" />
            </button>
          ) : null}
        </div>

        <div className="flex gap-2.5 px-4 pt-3 pb-1">
          <SummaryPill label="All" value={summary.total} />
          <SummaryPill label="Unread" value={summary.unread} />
          <SummaryPill label="Online" value={summary.online} online />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pt-2 pb-4">
        {loading ? (
          <div className="px-4 py-12 text-center text-sm text-slate-500">Loading chats...</div>
        ) : filtered.length === 0 ? (
          <div className="px-4 py-14 flex flex-col items-center">
            <MessageCircle className="w-10 h-10 text-slate-300" />
            <p className="mt-2 text-sm text-slate-400">No conversations yet</p>
            <button
              className="mt-3 h-8 px-4 rounded-2xl bg-[#005F90] text-white text-xs font-bold"
              onClick={() => router.push("/user/dashboard/mobile/messages/new")}
            >
              Start a chat
            </button>
          </div>
        ) : (
          <>
            {refreshing ? (
              <p className="px-4 pb-2 text-xs text-slate-500">Refreshing...</p>
            ) : null}
            <button onClick={onRefresh} className="px-4 pb-2 text-xs font-semibold text-[#005F90]">
              Refresh
            </button>
            {filtered.map((item) => {
              const participant = getDisplayParticipant(item);
              const name = getConversationTitle(item);
              const employee = participant?.userId ? employeeMap.get(participant.userId) : null;
              const avatar = employee?.photoUrl || "";
              const lastMessage = item.lastMessage?.text
                ? item.lastMessage.text
                : item.lastMessage?.attachments?.length
                  ? "Attachment"
                  : "Say hi";
              const time = formatChatTime(item.lastMessage?.createdAt || item.updatedAt);
              const isOnline =
                item.type === "DIRECT" && participant?.userId ? onlineUsers.has(participant.userId) : false;
              const hasLiveMeeting = item.type === "GROUP" && liveMeetings.has(item.id);

              const params = new URLSearchParams({
                title: name,
                avatar: item.type === "GROUP" ? "" : avatar,
                peerId: item.type === "GROUP" ? "" : participant?.userId || "",
                type: item.type,
              });

              return (
                <button
                  key={item.id}
                  className={`w-full px-4 py-3 border-b border-slate-100 flex items-center text-left ${
                    (item.unreadCount || 0) > 0 ? "bg-slate-50" : "bg-transparent"
                  }`}
                  onClick={() => router.push(`/user/dashboard/mobile/messages/${item.id}?${params.toString()}`)}
                >
                  <div className="relative mr-3">
                    <div className="w-[46px] h-[46px] rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
                      {item.type === "GROUP" ? (
                        <Users className="w-5 h-5 text-slate-600" />
                      ) : avatar ? (
                        <Image
                          src={resolveUrl(avatar)}
                          alt={name}
                          width={46}
                          height={46}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      ) : (
                        <span className="text-slate-900 font-bold">{name.charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    {isOnline ? (
                      <span className="absolute right-0 bottom-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
                    ) : null}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className={`text-sm truncate ${(item.unreadCount || 0) > 0 ? "font-bold text-[#0B1F3A]" : "font-bold text-slate-900"}`}>
                        {name}
                      </p>
                      <p className={`text-[10px] ${(item.unreadCount || 0) > 0 ? "text-slate-600 font-semibold" : "text-slate-400"}`}>
                        {time}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <p className={`text-xs truncate ${(item.unreadCount || 0) > 0 ? "text-slate-700 font-semibold" : "text-slate-500"}`}>
                        {lastMessage}
                      </p>
                      {(item.unreadCount || 0) > 0 ? (
                        <span className="min-w-5 h-5 px-1 rounded-full bg-green-500 text-white text-[11px] font-bold flex items-center justify-center">
                          {item.unreadCount}
                        </span>
                      ) : hasLiveMeeting ? (
                        <span className="flex items-center gap-1 rounded-full bg-rose-100 text-rose-700 text-[10px] font-semibold px-2 py-0.5 animate-pulse">
                          <span className="w-2 h-2 rounded-full bg-rose-600" />
                          Live meeting
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}

function SummaryPill({ label, value, online = false }: { label: string; value: number; online?: boolean }) {
  return (
    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl px-2.5 py-1.5">
      {online ? <Circle className="w-1.5 h-1.5 fill-green-500 text-green-500" /> : null}
      <span className="text-[11px] text-slate-500 font-semibold">{label}</span>
      <span className="text-xs text-slate-900 font-bold">{value}</span>
    </div>
  );
}
