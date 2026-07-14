/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";
import { initializeApp, getApps } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: WorkerGlobalScope;
// Cast for the APIs `WorkerGlobalScope` doesn't carry (registration, clients,
// notification events) — this file runs as a real ServiceWorkerGlobalScope.
const swScope = self as unknown as ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

// --- Firebase Cloud Messaging: background/closed-tab chat notifications ---
// NEXT_PUBLIC_* vars are inlined at build time by Next.js's webpack pipeline,
// which also builds this file (via @serwist/next) — same as any client code.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

try {
  if (!firebaseConfig.apiKey) throw new Error("Firebase web config missing");
  const firebaseApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  const messaging = getMessaging(firebaseApp);

  onBackgroundMessage(messaging, (payload) => {
    const title = payload.notification?.title || payload.data?.senderName || "New message";
    const body = payload.notification?.body || "You have a new message";
    const conversationId = payload.data?.conversationId || "";

    void swScope.registration.showNotification(title, {
      body,
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
      tag: conversationId || undefined,
      data: payload.data || {},
    });
  });
} catch {
  // Firebase Messaging unsupported in this browser/context — background
  // push simply won't fire here; foreground (socket-driven) still works.
}

swScope.addEventListener("notificationclick", (event) => {
  const notificationEvent = event as NotificationEvent;
  notificationEvent.notification.close();

  const data = notificationEvent.notification.data as
    | { conversationId?: string; senderName?: string; type?: string }
    | undefined;
  if (data?.type !== "chat_message" || !data.conversationId) return;

  const conversationId = data.conversationId;
  const senderName = data.senderName || "";

  notificationEvent.waitUntil(
    (async () => {
      const clientList = await swScope.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const existing = clientList.find((c) => "focus" in c);
      if (existing) {
        await (existing as WindowClient).focus();
        existing.postMessage({
          type: "chat-notification-click",
          conversationId,
          senderName,
        });
        return;
      }

      const url = `/user/dashboard/mobile/messages/${conversationId}?title=${encodeURIComponent(senderName)}`;
      await swScope.clients.openWindow(url);
    })(),
  );
});
