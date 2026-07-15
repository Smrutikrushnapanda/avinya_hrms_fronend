"use client";

import { useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast } from "sonner";
import { getToken, onMessage } from "firebase/messaging";
import { createMessageSocket } from "@/lib/socket";
import { getProfile, updateFcmToken } from "@/app/api/api";
import { getFirebaseMessaging, vapidKey } from "@/lib/firebase";
import { playIncomingMessageSound } from "@/lib/notificationSound";

type IncomingChatMessage = {
  id?: string;
  senderId?: string;
  text?: string;
  attachments?: unknown[];
  sender?: { firstName?: string; lastName?: string };
};

function buildChatUrl(pathname: string, conversationId: string, senderName: string) {
  return pathname.startsWith("/user/dashboard/mobile")
    ? `/user/dashboard/mobile/messages/${conversationId}?title=${encodeURIComponent(senderName)}`
    : `/user/messages?conversationId=${conversationId}`;
}

// Mounted app-wide (app/layout.tsx) so a new chat message notifies the user
// no matter which page they're on — not just while the chat page is open.
export default function ChatPushProvider() {
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  pathnameRef.current = pathname;
  const selfUserIdRef = useRef<string>("");
  // Which conversation the user is actually looking at right now, regardless
  // of whether the route encodes it in the URL (the desktop /user/messages
  // route doesn't) — set via the chatActiveConversationChanged event the
  // messages pages dispatch on selection. Comparing against pathname alone
  // used to make this suppression check a no-op on desktop.
  const activeConversationIdRef = useRef<string>("");

  useEffect(() => {
    const handler = (e: Event) => {
      activeConversationIdRef.current =
        (e as CustomEvent<{ conversationId: string }>).detail?.conversationId || "";
    };
    window.addEventListener("chatActiveConversationChanged", handler);
    return () => window.removeEventListener("chatActiveConversationChanged", handler);
  }, []);

  // Foreground: tab is open somewhere in the app — socket delivers instantly,
  // show a WhatsApp-style toast + chime. This is the "tab open" case.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;

    getProfile()
      .then((res) => {
        const profile = res.data || {};
        selfUserIdRef.current = profile.userId || profile.id || "";
      })
      .catch(() => {});

    const socket = createMessageSocket(accessToken);
    socket.on("chat:message", (payload: { conversationId?: string; message?: IncomingChatMessage }) => {
      const conversationId = payload?.conversationId;
      const msg = payload?.message;
      if (!conversationId || !msg?.id) return;
      if (msg.senderId && msg.senderId === selfUserIdRef.current) return;
      // Already looking at this conversation — the page itself shows it live.
      if (activeConversationIdRef.current === conversationId) return;

      const senderName = msg.sender?.firstName
        ? `${msg.sender.firstName} ${msg.sender.lastName || ""}`.trim()
        : "New message";
      const body = msg.text || (msg.attachments?.length ? "Sent an attachment" : "New message");

      void playIncomingMessageSound();
      toast(senderName, {
        description: body,
        action: {
          label: "Open",
          onClick: () => router.push(buildChatUrl(pathnameRef.current, conversationId, senderName)),
        },
      });
    });

    // Server-authoritative unread total, pushed to every socket this user
    // has open. Reuses the existing chatUnreadUpdate event the sidebar
    // already listens to — the only thing that changes is this now fires
    // app-wide instead of only while /user/messages happens to be mounted.
    socket.on("chat:unread-sync", (payload: { totalUnread?: number }) => {
      if (typeof payload?.totalUnread !== "number") return;
      window.dispatchEvent(
        new CustomEvent("chatUnreadUpdate", { detail: { count: payload.totalUnread } })
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [router]);

  // Background/closed-tab/installed-PWA: register for FCM web push and route
  // a notification tap (relayed from the service worker) to the conversation.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const accessToken = localStorage.getItem("access_token");
    if (!accessToken) return;
    if (!("serviceWorker" in navigator) || !("Notification" in window)) return;

    let messageUnsubscribe: (() => void) | undefined;

    (async () => {
      try {
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }
        if (Notification.permission !== "granted") return;
        if (!vapidKey) return;

        const messaging = await getFirebaseMessaging();
        if (!messaging) return;

        const registration = await navigator.serviceWorker.ready;
        const fcmToken = await getToken(messaging, {
          vapidKey,
          serviceWorkerRegistration: registration,
        });
        if (fcmToken) {
          await updateFcmToken(fcmToken).catch(() => {});
        }

        // Foreground push is already covered by the socket listener above —
        // registering this just prevents an unhandled-message warning.
        messageUnsubscribe = onMessage(messaging, () => {});
      } catch {
        // Firebase Messaging unsupported here, or permission denied.
      }
    })();

    const onServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type !== "chat-notification-click") return;
      const conversationId = event.data.conversationId as string | undefined;
      const senderName = (event.data.senderName as string | undefined) || "";
      if (!conversationId) return;
      router.push(buildChatUrl(pathnameRef.current, conversationId, senderName));
    };
    navigator.serviceWorker.addEventListener("message", onServiceWorkerMessage);

    return () => {
      messageUnsubscribe?.();
      navigator.serviceWorker.removeEventListener("message", onServiceWorkerMessage);
    };
  }, [router]);

  return null;
}
