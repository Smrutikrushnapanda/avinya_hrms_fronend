"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Mail, MailOpen, MessageSquare, RefreshCw, Search } from "lucide-react";
import { getInboxMessages, markMessageRead } from "@/app/api/api";
import { createMessageSocket } from "@/lib/socket";

type MessageItem = {
  id: string;
  title: string;
  body: string;
  type?: string;
  sentAt?: string;
  status?: "UNREAD" | "READ";
  readAt?: string | null;
  senderUserId?: string;
};

const normalizeMessage = (msg: any): MessageItem => ({
  id: msg?.id,
  title: msg?.title || "Message",
  body: msg?.body || "",
  type: msg?.type,
  sentAt: msg?.sentAt || msg?.createdAt,
  status: msg?.status || "UNREAD",
  readAt: msg?.readAt || null,
  senderUserId: msg?.senderUserId,
});

const dedupeMessages = (items: MessageItem[]) => {
  const seen = new Set<string>();
  const result: MessageItem[] = [];
  items.forEach((item) => {
    if (!item?.id || seen.has(item.id)) return;
    seen.add(item.id);
    result.push(item);
  });
  return result;
};

const formatDateTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function NotificationsPage() {
  const searchParams = useSearchParams();
  const initialMessageId = searchParams.get("messageId");

  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [search, setSearch] = useState("");

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await getInboxMessages();
      const list = Array.isArray(res.data) ? res.data : [];
      const mapped = dedupeMessages(list.map(normalizeMessage));
      setMessages(mapped);
      if (initialMessageId) {
        const found = mapped.find((m) => m.id === initialMessageId);
        if (found) setSelectedMessage(found);
      }
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setLoading(false);
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

  const filteredMessages = useMemo(() => {
    return messages.filter((msg) => {
      if (filter === "unread" && msg.status !== "UNREAD") return false;
      if (filter === "read" && msg.status !== "READ") return false;
      if (search.trim()) {
        const s = search.toLowerCase();
        return (
          msg.title.toLowerCase().includes(s) || msg.body.toLowerCase().includes(s)
        );
      }
      return true;
    });
  }, [messages, filter, search]);

  const handleSelectMessage = async (msg: MessageItem) => {
    const nextSelected =
      msg.status === "UNREAD" ? { ...msg, status: "READ" as const } : msg;
    setSelectedMessage(nextSelected);
    if (msg.status === "UNREAD") {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, status: "READ", readAt: new Date().toISOString() } : m
        )
      );
      try {
        await markMessageRead(msg.id);
      } catch {
        // ignore
      }
    }
  };

  const handleMarkAllRead = async () => {
    const unread = messages.filter((m) => m.status === "UNREAD");
    if (unread.length === 0) return;
    setMessages((prev) =>
      prev.map((m) => (m.status === "UNREAD" ? { ...m, status: "READ" } : m))
    );
    setSelectedMessage((prev) =>
      prev?.status === "UNREAD" ? { ...prev, status: "READ" } : prev
    );
    try {
      await Promise.all(unread.map((m) => markMessageRead(m.id)));
    } catch {
      // ignore
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6" />
          <div>
            <h1 className="text-2xl font-bold">Notifications</h1>
            <p className="text-sm text-muted-foreground">
              {unreadCount} unread of {messages.length}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchMessages}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            disabled={unreadCount === 0}
          >
            Mark all read
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inbox</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 mb-3">
              <Search className="w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search notifications..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button
                variant={filter === "unread" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("unread")}
              >
                Unread
              </Button>
              <Button
                variant={filter === "read" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("read")}
              >
                Read
              </Button>
            </div>
            <ScrollArea className="h-[480px] pr-2">
              {loading ? (
                <div className="text-sm text-muted-foreground">Loading notifications...</div>
              ) : filteredMessages.length === 0 ? (
                <div className="text-sm text-muted-foreground">No notifications found.</div>
              ) : (
                <div className="space-y-2">
                  {filteredMessages.map((msg) => (
                    <button
                      key={msg.id}
                      onClick={() => handleSelectMessage(msg)}
                      className={`w-full text-left border rounded-lg p-3 transition-colors ${
                        selectedMessage?.id === msg.id ? "border-primary" : "border-border"
                      } ${msg.status === "UNREAD" ? "bg-blue-50" : "bg-card"}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{msg.title}</p>
                            {msg.status === "UNREAD" && (
                              <Badge className="bg-blue-500 text-white text-[10px]">New</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {msg.body}
                          </p>
                        </div>
                        {msg.status === "UNREAD" ? (
                          <Mail className="w-4 h-4 text-blue-500" />
                        ) : (
                          <MailOpen className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        {formatDateTime(msg.sentAt)}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Notification Details</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedMessage ? (
              <div className="text-sm text-muted-foreground">
                Select a notification to read it.
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-semibold">{selectedMessage.title}</h2>
                  {selectedMessage.status === "UNREAD" && (
                    <Badge className="bg-blue-500 text-white text-xs">Unread</Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(selectedMessage.sentAt)}
                </p>
                <div className="border-t pt-3 text-sm whitespace-pre-wrap">
                  {selectedMessage.body}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
