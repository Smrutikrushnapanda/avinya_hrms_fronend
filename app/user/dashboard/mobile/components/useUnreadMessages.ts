"use client";

import { useEffect, useRef, useState } from "react";
import { getInboxMessages } from "@/app/api/api";
import { createMessageSocket } from "@/lib/socket";

type MessageItem = {
  id: string;
  status?: "UNREAD" | "READ";
};

export default function useUnreadMessages() {
  const [unreadCount, setUnreadCount] = useState(0);
  const idsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let isMounted = true;
    const fetchMessages = async () => {
      try {
        const res = await getInboxMessages();
        const list = Array.isArray(res.data) ? res.data : [];
        const ids = new Set<string>();
        let unread = 0;
        list.forEach((m: MessageItem) => {
          if (m?.id) ids.add(m.id);
          if (m?.status === "UNREAD") unread += 1;
        });
        idsRef.current = ids;
        if (isMounted) setUnreadCount(unread);
      } catch (error) {
        console.error("Failed to load unread count:", error);
      }
    };

    fetchMessages();
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;
    const socket = createMessageSocket(token);
    socket.on("message:new", (payload: any) => {
      const incoming = payload?.message;
      if (!incoming?.id) return;
      if (idsRef.current.has(incoming.id)) return;
      idsRef.current.add(incoming.id);
      setUnreadCount((prev) => prev + 1);
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  return unreadCount;
}
