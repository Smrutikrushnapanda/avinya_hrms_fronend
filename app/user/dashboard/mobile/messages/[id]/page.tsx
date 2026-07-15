"use client";

import Image from "next/image";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import {
  File,
  ArrowLeft,
  ImageIcon,
  Loader2,
  Maximize2,
  Minimize2,
  Paperclip,
  Plus,
  Send,
  Smile,
  X,
  Video,
  Clipboard,
  Info,
  Users,
  Download,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getChatMessages, getProfile, sendChatMessage, markChatRead } from "@/app/api/api";
import { createMessageSocket } from "@/lib/socket";
import { ChatMessage, ProfileLike, ChatSocketPayload, PresencePayload } from "@/types/chat";
import {
  formatTime,
  formatDate,
  getMeetingSystemLabel,
  extractMeetingUrlFromText,
  resolveAttachmentUrl,
  toChatMessage,
  sortMessages,
} from "@/lib/chat-utils";
import {
  addOutboxEntry,
  generateClientMessageId,
  getBackoffMs,
  getPendingFiles,
  loadOutboxForConversation,
  MAX_SEND_ATTEMPTS,
  OutboxEntry,
  removeOutboxEntry,
  updateOutboxEntry,
} from "@/lib/chatOutbox";

const CHAT_PAGE_SIZE = 30;

export default function MobileChatPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const conversationId = useMemo(
    () => (Array.isArray(params?.id) ? params.id[0] : params?.id || ""),
    [params?.id],
  );

  const title = searchParams.get("title") || "Chat";
  const peerId = searchParams.get("peerId") || "";
  const chatType = searchParams.get("type") || "DIRECT";

  // Lets the app-wide ChatPushProvider know this conversation is the one
  // actually on screen, so it can suppress the toast/chime for it.
  useEffect(() => {
    if (!conversationId) return;
    window.dispatchEvent(
      new CustomEvent("chatActiveConversationChanged", { detail: { conversationId } })
    );
    return () => {
      window.dispatchEvent(
        new CustomEvent("chatActiveConversationChanged", { detail: { conversationId: "" } })
      );
    };
  }, [conversationId]);

  const [avatar, setAvatar] = useState("");
  useEffect(() => {
    if (typeof window !== "undefined" && conversationId) {
      setAvatar(sessionStorage.getItem(`chat_avatar_${conversationId}`) || "");
    }
  }, [conversationId]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [composerText, setComposerText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [selfUserId, setSelfUserId] = useState("");
  const [selfName, setSelfName] = useState("");
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingMinimized, setMeetingMinimized] = useState(false);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingError, setMeetingError] = useState("");
  const [activeMeetingUrl, setActiveMeetingUrl] = useState<string | null>(null);
  const [meetingMiniPosition, setMeetingMiniPosition] = useState<{ x: number; y: number } | null>(null);
  const [meetingMiniDragging, setMeetingMiniDragging] = useState(false);
  const [showChatDetails, setShowChatDetails] = useState(false);
  const jitsiContainerRef = useRef<HTMLDivElement | null>(null);
  const jitsiApiRef = useRef<any | null>(null);
  const meetingMiniDragOffsetRef = useRef({ x: 0, y: 0 });
  const socketRef = useRef<ReturnType<typeof createMessageSocket> | null>(null);
  const jitsiDomain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "8x8.vc";
  const jitsiPrefix =
    process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX || "vpaas-magic-cookie-13baaedb78ca4524a95bc3d4f7748bf4";
  const jitsiJwt = process.env.NEXT_PUBLIC_JITSI_JWT;

  const meetingStoreKey = "active_meetings";
  const getMeetingState = useCallback(
    (convId: string) => {
      if (typeof window === "undefined") return null;
      try {
        const raw = localStorage.getItem(meetingStoreKey);
        const parsed: Array<{ conversationId: string; url: string; expiresAt: number; linkPosted?: boolean }> =
          raw ? JSON.parse(raw) : [];
        const now = Date.now();
        const match = parsed.find((m) => m.conversationId === convId && m.expiresAt > now);
        const filtered = parsed.filter((m) => m.expiresAt > now);
        if (filtered.length !== parsed.length) localStorage.setItem(meetingStoreKey, JSON.stringify(filtered));
        return match || null;
      } catch {
        return null;
      }
    },
    [],
  );

  const setMeetingState = useCallback((state: { conversationId: string; url: string; linkPosted?: boolean } | null) => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(meetingStoreKey);
      const parsed: Array<{ conversationId: string; url: string; expiresAt: number; linkPosted?: boolean }> =
        raw ? JSON.parse(raw) : [];
      const now = Date.now();
      const filtered = parsed.filter((m) => m.expiresAt > now && m.conversationId !== (state?.conversationId || ""));
      if (state) {
        filtered.push({
          conversationId: state.conversationId,
          url: state.url,
          linkPosted: state.linkPosted ?? true,
          expiresAt: now + 2 * 60 * 60 * 1000,
        });
      }
      localStorage.setItem(meetingStoreKey, JSON.stringify(filtered));
    } catch {
      // ignore
    }
  }, []);

  const getRecentMeetingUrl = useCallback((list: ChatMessage[]) => {
    const now = Date.now();
    const withLinks = [...list]
      .filter((message) => Boolean(extractMeetingUrlFromText(message.text)))
      .sort(
        (a, b) =>
          new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
      );
    const recent = withLinks.find(
      (message) => now - new Date(message.createdAt || 0).getTime() <= 2 * 60 * 60 * 1000,
    );
    return extractMeetingUrlFromText(recent?.text || "");
  }, []);

  useEffect(() => {
    if (!conversationId) {
      setActiveMeetingUrl(null);
      return;
    }
    const stored = getMeetingState(conversationId);
    if (stored?.url) {
      setActiveMeetingUrl(stored.url);
      return;
    }
    const recent = getRecentMeetingUrl(messages);
    if (recent) {
      setMeetingState({ conversationId, url: recent, linkPosted: true });
      setActiveMeetingUrl(recent);
      return;
    }
    setActiveMeetingUrl(null);
  }, [conversationId, getMeetingState, getRecentMeetingUrl, messages, setMeetingState]);

  const renderTextWithLinks = (text?: string, isMine?: boolean) => {
    if (!text) return null;
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    return text.split(urlRegex).map((part, idx) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={`${part}-${idx}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className={`${isMine ? "text-white" : "text-[#005F90]"} underline break-words`}
          >
            {part}
          </a>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const extractLinks = (text?: string) => {
    if (!text) return [] as string[];
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    return text.match(urlRegex) || [];
  };

  const copyText = async (text?: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const downloadFile = async (url: string, fileName?: string) => {
    try {
      const resolvedUrl = resolveAttachmentUrl(url);
      const response = await fetch(resolvedUrl);
      const blob = await response.blob();
      const urlBlob = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = urlBlob;
      link.download = fileName || "download";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(urlBlob);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  // Guards the scroll-to-bottom effect below so it only fires for messages
  // appended at the end (new send/receive) — not when an older page gets
  // prepended from scrolling up, which the layout effect just below handles
  // by restoring the pre-prepend offset instead.
  const isPrependingRef = useRef(false);
  const prependScrollAnchorRef = useRef<{ scrollHeight: number; scrollTop: number } | null>(null);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return [];
    try {
      const [response] = await Promise.all([
        getChatMessages(conversationId, { limit: CHAT_PAGE_SIZE }),
        markChatRead(conversationId).catch(() => undefined),
      ]);
      const list = Array.isArray(response.data) ? response.data : [];
      const normalized = list.map((item: unknown) => toChatMessage((item as any) || {}));
      const sorted = sortMessages(normalized);
      setHasMoreMessages(list.length >= CHAT_PAGE_SIZE);
      setMessages(sorted);
      return sorted;
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Loads an older page of messages (before the oldest one currently held)
  // when the user scrolls to the top, instead of fetching up to 200 messages
  // up front — which got slower to open the longer a conversation ran.
  const loadOlderMessages = useCallback(async () => {
    if (!conversationId || loadingOlderMessages || !hasMoreMessages || messages.length === 0) return;
    const oldest = messages[0]?.createdAt;
    if (!oldest) return;
    setLoadingOlderMessages(true);
    try {
      const res = await getChatMessages(conversationId, { limit: CHAT_PAGE_SIZE, before: oldest });
      const list = Array.isArray(res.data) ? res.data : [];
      setHasMoreMessages(list.length >= CHAT_PAGE_SIZE);
      if (list.length > 0) {
        const fresh = list.map((item: unknown) => toChatMessage((item as any) || {}));
        const container = listRef.current;
        if (container) {
          prependScrollAnchorRef.current = {
            scrollHeight: container.scrollHeight,
            scrollTop: container.scrollTop,
          };
        }
        isPrependingRef.current = true;
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          return sortMessages([...fresh.filter((m) => !existingIds.has(m.id)), ...prev]);
        });
      }
    } catch (error) {
      console.error("Failed to load older messages:", error);
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [conversationId, loadingOlderMessages, hasMoreMessages, messages]);

  // Runs before the browser paints the newly-prepended messages, so the
  // user never sees the jump that would otherwise happen when content is
  // added above the current scroll position.
  useLayoutEffect(() => {
    const anchor = prependScrollAnchorRef.current;
    if (!anchor) return;
    const container = listRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight - anchor.scrollHeight + anchor.scrollTop;
    }
    prependScrollAnchorRef.current = null;
  }, [messages]);

  // Retry timers for queued sends, keyed by clientMessageId. `attemptSendRef`
  // breaks the circular reference between attemptSend (schedules a retry on
  // failure) and scheduleRetry (calls attemptSend when the timer fires).
  const retryTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map()
  );
  const attemptSendRef = useRef<
    ((entry: OutboxEntry) => Promise<void>) | undefined
  >(undefined);

  useEffect(() => {
    return () => {
      retryTimersRef.current.forEach((timer) => clearTimeout(timer));
      retryTimersRef.current.clear();
    };
  }, []);

  const scheduleRetry = useCallback((entry: OutboxEntry) => {
    const existingTimer = retryTimersRef.current.get(entry.clientMessageId);
    if (existingTimer) clearTimeout(existingTimer);
    const delay = Math.max(0, entry.nextRetryAt - Date.now());
    const timer = setTimeout(() => {
      retryTimersRef.current.delete(entry.clientMessageId);
      void attemptSendRef.current?.(entry);
    }, delay);
    retryTimersRef.current.set(entry.clientMessageId, timer);
  }, []);

  const attemptSend = useCallback(
    async (entry: OutboxEntry) => {
      const files = getPendingFiles(entry.clientMessageId);
      if (entry.attachments.length > 0 && files.length === 0) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === entry.clientMessageId
              ? { ...m, pending: false, failed: true }
              : m
          )
        );
        return;
      }
      try {
        const formData = new FormData();
        if (entry.text) formData.append("text", entry.text);
        formData.append("clientMessageId", entry.clientMessageId);
        files.forEach((file) => formData.append("files", file));
        const response = await sendChatMessage(entry.conversationId, formData);
        const saved = toChatMessage((response.data || {}) as any);
        removeOutboxEntry(entry.clientMessageId);
        const timer = retryTimersRef.current.get(entry.clientMessageId);
        if (timer) {
          clearTimeout(timer);
          retryTimersRef.current.delete(entry.clientMessageId);
        }
        if (entry.conversationId === conversationId) {
          setMessages((prev) => {
            const withoutPending = prev.filter(
              (item) => item.id !== entry.clientMessageId
            );
            if (withoutPending.some((item) => item.id === saved.id)) {
              return withoutPending;
            }
            return sortMessages([...withoutPending, saved]);
          });
        }
      } catch {
        const nextAttempt = entry.attempt + 1;
        const nextRetryAt = Date.now() + getBackoffMs(nextAttempt);
        const updatedEntry = { ...entry, attempt: nextAttempt, nextRetryAt };
        updateOutboxEntry(entry.clientMessageId, {
          attempt: nextAttempt,
          nextRetryAt,
        });
        if (entry.conversationId === conversationId) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === entry.clientMessageId
                ? { ...m, pending: false, failed: true }
                : m
            )
          );
        }
        if (nextAttempt < MAX_SEND_ATTEMPTS) {
          scheduleRetry(updatedEntry);
        }
      }
    },
    [conversationId, scheduleRetry]
  );

  useEffect(() => {
    attemptSendRef.current = attemptSend;
  }, [attemptSend]);

  const retryFailedMessage = useCallback(
    (clientMessageId: string) => {
      const entries = loadOutboxForConversation(conversationId);
      const entry = entries.find((e) => e.clientMessageId === clientMessageId);
      if (!entry) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === clientMessageId ? { ...m, pending: true, failed: false } : m
        )
      );
      void attemptSend(entry);
    },
    [conversationId, attemptSend]
  );

  const flushOutbox = useCallback(
    (fetchedMessages: ChatMessage[]) => {
      const entries = loadOutboxForConversation(conversationId);
      if (!entries.length) return;
      const knownClientIds = new Set(
        fetchedMessages
          .filter((m) => m.clientMessageId)
          .map((m) => m.clientMessageId)
      );
      const alreadyDelivered = entries.filter((e) =>
        knownClientIds.has(e.clientMessageId)
      );
      const toRestore = entries.filter(
        (e) => !knownClientIds.has(e.clientMessageId)
      );
      alreadyDelivered.forEach((e) => removeOutboxEntry(e.clientMessageId));
      if (!toRestore.length) return;
      setMessages((prev) => {
        const bubbles: ChatMessage[] = toRestore.map((e) => ({
          id: e.clientMessageId,
          conversationId,
          senderId: selfUserId,
          text: e.text || "",
          createdAt: e.createdAt,
          clientMessageId: e.clientMessageId,
          pending: e.attempt < MAX_SEND_ATTEMPTS,
          failed: e.attempt >= MAX_SEND_ATTEMPTS,
          attachments: [],
        }));
        return sortMessages([...prev, ...bubbles]);
      });
      toRestore.forEach((e) => {
        if (e.attempt < MAX_SEND_ATTEMPTS) scheduleRetry(e);
      });
    },
    [conversationId, selfUserId, scheduleRetry]
  );

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await getProfile();
        const profile = (profileRes.data || {}) as ProfileLike;
        setSelfUserId(profile.userId || profile.id || "");
        const firstName = (profile as { firstName?: string })?.firstName || "";
        const lastName = (profile as { lastName?: string })?.lastName || "";
        const fullName = `${firstName} ${lastName}`.trim();
        setSelfName(fullName || profile.userId || profile.id || "Employee");
      } catch {
        // ignore
      }
    };

    void init();
    void loadMessages().then((list) => flushOutbox(list || []));
  }, [loadMessages, flushOutbox]);

  useEffect(() => {
    if (isPrependingRef.current) {
      isPrependingRef.current = false;
      return;
    }
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const socket = createMessageSocket(token);
    socketRef.current = socket;

    socket.on("chat:message", (payload: ChatSocketPayload) => {
      if (payload.conversationId !== conversationId) return;
      const incoming = toChatMessage(payload.message || {});
      if (!incoming.id) return;

      setMessages((prev) => {
        // Drop both: an already-inserted copy with the same server id, and
        // the optimistic pending bubble — keyed by clientMessageId — being
        // replaced by the now-confirmed server message.
        const withoutPending = prev.filter(
          (item) =>
            item.id !== incoming.id &&
            (!incoming.clientMessageId || item.id !== incoming.clientMessageId)
        );
        return sortMessages([...withoutPending, incoming]);
      });
    });

    socket.on("chat:presence", (payload: PresencePayload) => {
      if (!payload.userId || payload.userId !== peerId) return;
      setIsOnline(payload.status === "online");
    });

    socket.on("chat:read", (payload) => {
      if (!payload?.conversationId || !payload?.userId || !payload?.readAt) return;
      if (payload.userId === selfUserId) return;
      if (payload.conversationId !== conversationId) return;
      setMessages((prev) =>
        prev.map((msg) => {
          if (
            msg.senderId === selfUserId &&
            new Date(msg.createdAt) <= new Date(payload.readAt)
          ) {
            return { ...msg, readByAll: true };
          }
          return msg;
        }),
      );
    });

    const handleVisibility = () => {
      if (document.hidden) {
        socket.disconnect();
      } else if (!socket.connected) {
        socket.connect();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      socket.disconnect();
      socketRef.current = null;
      setIsOnline(false);
    };
  }, [conversationId, peerId]);

  const sendMessage = () => {
    if (!conversationId) return;
    if (!composerText.trim() && selectedFiles.length === 0) return;

    const clientMessageId = generateClientMessageId();
    const now = new Date().toISOString();
    const text = composerText.trim() || null;
    const filesToSend = selectedFiles;

    const optimistic: ChatMessage = {
      id: clientMessageId,
      conversationId,
      senderId: selfUserId,
      text: text || "",
      createdAt: now,
      pending: true,
      clientMessageId,
      attachments: [],
    };
    setMessages((prev) => sortMessages([...prev, optimistic]));
    setComposerText("");
    setSelectedFiles([]);
    setShowEmojiMenu(false);

    const entry: OutboxEntry = {
      clientMessageId,
      conversationId,
      text,
      attachments: filesToSend.map((f) => ({
        name: f.name,
        mimeType: f.type,
        size: f.size,
      })),
      attempt: 0,
      nextRetryAt: Date.now(),
      createdAt: now,
    };
    addOutboxEntry(entry, filesToSend);
    void attemptSend(entry);
  };

  const pickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 5));
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const roomName = useMemo(
    () => (conversationId ? `hrms-chat-${conversationId}` : "hrms-chat"),
    [conversationId],
  );

  const meetingUrl = useMemo(
    () => `https://${jitsiDomain}/${jitsiPrefix}/${roomName || "hrms-meet"}`,
    [jitsiDomain, jitsiPrefix, roomName],
  );

  const loadJitsiScript = () =>
    new Promise<void>((resolve, reject) => {
      if (typeof window === "undefined") return reject(new Error("window unavailable"));
      if ((window as any).JitsiMeetExternalAPI) return resolve();
      if (!jitsiPrefix) return reject(new Error("Jitsi room prefix not configured"));
      const script = document.createElement("script");
      script.src = `https://${jitsiDomain}/${jitsiPrefix}/external_api.js`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Jitsi script"));
      document.body.appendChild(script);
    });

  const startMeeting = async (mode: "create" | "join") => {
    if (!roomName || !selfUserId) return;
    if (!jitsiPrefix) {
      const msg = "Set NEXT_PUBLIC_JITSI_ROOM_PREFIX to your JAAS tenant prefix.";
      setMeetingError(msg);
      return;
    }
    setMeetingLoading(true);
    setMeetingError("");
    try {
      const existing = getMeetingState(conversationId);
      const recentMeetingUrl = getRecentMeetingUrl(messages);
      const joinableMeetingUrl = existing?.url || activeMeetingUrl || recentMeetingUrl;
      const meetingRoomUrl =
        mode === "create" ? meetingUrl : joinableMeetingUrl || "";

      if (mode === "join" && !meetingRoomUrl) {
        setMeetingError("No active meeting in this chat yet.");
        setMeetingLoading(false);
        return;
      }

      await loadJitsiScript();
      setMeetingOpen(true);
      setMeetingMinimized(false);
      const createMeeting = () => {
        if (!jitsiContainerRef.current) {
          requestAnimationFrame(createMeeting);
          return;
        }
        jitsiApiRef.current = new (window as any).JitsiMeetExternalAPI(jitsiDomain, {
          roomName: meetingRoomUrl.replace(`https://${jitsiDomain}/`, ""),
          parentNode: jitsiContainerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName: selfName || "Guest" },
          jwt: jitsiJwt || undefined,
        });
      };
      requestAnimationFrame(createMeeting);

      if (conversationId) {
        if (mode === "create" && !existing?.linkPosted) {
          const formData = new FormData();
          formData.append("text", `Join meeting: ${meetingRoomUrl}`);
          try {
            await sendChatMessage(conversationId, formData);
            socketRef.current?.emit("chat:meeting-start", {
              conversationId,
              url: meetingRoomUrl,
              callerName: selfName || "Someone",
              callerAvatar: "",
            });
          } catch {
            /* ignore send failures */
          }
        }

        try {
          const entered = new FormData();
          entered.append("text", "You entered");
          await sendChatMessage(conversationId, entered);
        } catch {
          // ignore
        }

        setMeetingState({ conversationId, url: meetingRoomUrl, linkPosted: true });
        setActiveMeetingUrl(meetingRoomUrl);
      }
    } catch (error) {
      const message = (error as Error).message || "Unable to start meeting.";
      setMeetingError(message);
      setMeetingOpen(false);
    } finally {
      setMeetingLoading(false);
    }
  };

  const closeMeeting = () => {
    jitsiApiRef.current?.dispose?.();
    jitsiApiRef.current = null;
    if (conversationId && getMeetingState(conversationId)) {
      try {
        const ended = new FormData();
        ended.append("text", "You left");
        void sendChatMessage(conversationId, ended);
        socketRef.current?.emit("chat:meeting-end", { conversationId });
      } catch {
        // ignore
      }
      setMeetingState(null);
    }
    setMeetingMinimized(false);
    setMeetingMiniPosition(null);
    setActiveMeetingUrl(null);
    setMeetingOpen(false);
  };

  const clampMiniPosition = useCallback((nextX: number, nextY: number) => {
    if (typeof window === "undefined") return { x: nextX, y: nextY };
    const width = 288;
    const height = 196;
    const minX = 8;
    const minY = 8;
    const maxX = Math.max(minX, window.innerWidth - width - 8);
    const maxY = Math.max(minY, window.innerHeight - height - 8);
    return {
      x: Math.min(Math.max(nextX, minX), maxX),
      y: Math.min(Math.max(nextY, minY), maxY),
    };
  }, []);

  const beginMiniDrag = useCallback(
    (event: { clientX: number; clientY: number }) => {
      if (!meetingMiniPosition) return;
      meetingMiniDragOffsetRef.current = {
        x: event.clientX - meetingMiniPosition.x,
        y: event.clientY - meetingMiniPosition.y,
      };
      setMeetingMiniDragging(true);
    },
    [meetingMiniPosition],
  );

  useEffect(() => {
    if (!meetingMiniDragging) return;
    const onPointerMove = (event: PointerEvent) => {
      const next = clampMiniPosition(
        event.clientX - meetingMiniDragOffsetRef.current.x,
        event.clientY - meetingMiniDragOffsetRef.current.y,
      );
      setMeetingMiniPosition(next);
    };
    const onPointerUp = () => setMeetingMiniDragging(false);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [clampMiniPosition, meetingMiniDragging]);

  useEffect(() => {
    if (!meetingOpen || !meetingMinimized || meetingMiniPosition) return;
    if (typeof window === "undefined") return;
    const initial = clampMiniPosition(window.innerWidth - 304, window.innerHeight - 212);
    setMeetingMiniPosition(initial);
  }, [clampMiniPosition, meetingMiniPosition, meetingMinimized, meetingOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!meetingMiniPosition) return;
    const onResize = () => {
      setMeetingMiniPosition((prev) => {
        if (!prev) return prev;
        return clampMiniPosition(prev.x, prev.y);
      });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampMiniPosition, meetingMiniPosition]);

  useEffect(() => {
    if (typeof window === "undefined" || !window.visualViewport) return;
    const viewport = window.visualViewport;
    const onKeyboardChange = () => {
      if (viewport.height >= window.innerHeight * 0.95) {
        window.scrollTo(0, 0);
      }
    };
    viewport.addEventListener("resize", onKeyboardChange);
    return () => viewport.removeEventListener("resize", onKeyboardChange);
  }, []);

  const hasActiveMeeting = Boolean(activeMeetingUrl);

  return (
    /*
     * ✅ KEY LAYOUT FIXES:
     *
     * 1. `h-[100dvh]` — uses the *dynamic* viewport height unit.
     *    On mobile, when the software keyboard opens the browser shrinks
     *    the viewport, so `100dvh` shrinks with it. The whole flex column
     *    (header + messages + input) is always exactly the visible screen.
     *
     * 2. Header is `shrink-0` — it never compresses or scrolls.
     *
     * 3. Message list is `flex-1 min-h-0 overflow-y-auto` — takes remaining
     *    height and is the ONLY scrollable zone. `min-h-0` is critical to
     *    prevent the flex child from overflowing its parent.
     *    No `pb-28` needed because the input is now a real flex child below.
     *
     * 4. Input bar is `shrink-0` — pinned at the bottom of the flex column.
     *    When the keyboard opens, the viewport shrinks → the flex column
     *    shrinks → the input bar is pushed directly above the keyboard
     *    automatically. No JS or hacks required.
     */
    <div className="h-[100dvh] bg-background text-foreground flex flex-col overflow-hidden">

      {/* ── STICKY HEADER (never scrolls) ── */}
      <div
        className="sticky top-0 z-20 shrink-0 cursor-pointer bg-messages-primary-dark px-4 pb-3 pt-[max(32px,env(safe-area-inset-top))] flex items-center gap-2.5"
        onClick={() => setShowChatDetails(true)}
      >
        <button
          onClick={(event) => {
            event.stopPropagation();
            router.push("/user/dashboard/mobile/messages");
          }}
          className="p-1 rounded-md text-white hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="w-10 h-10 rounded-full bg-white/20 overflow-hidden flex items-center justify-center flex-shrink-0">
          {avatar ? (
            <Image
              src={resolveAttachmentUrl(avatar)}
              alt={title}
              width={40}
              height={40}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <span className="font-bold text-white text-base">{title.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="ml-2.5 min-w-0 flex-1">
          <p className="text-[15px] font-bold text-white truncate">{title}</p>
          <div className="flex items-center gap-1.5 mt-0.5">
            {chatType === "GROUP" ? (
              <p className="text-[11px] text-slate-300">Group chat</p>
            ) : (
              <>
                <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? "bg-green-500" : "bg-slate-300"}`} />
                <p className="text-[11px] text-slate-300">{isOnline ? "Online" : "Offline"}</p>
              </>
            )}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <Button
            onClick={(event) => {
              event.stopPropagation();
              void startMeeting("create");
            }}
            loading={meetingLoading}
            className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-60"
            title={meetingLoading ? "Preparing..." : "Create meeting"}
            aria-label="Create meeting"
            size="icon"
          >
            <Plus className="w-4 h-4" />
          </Button>
          <Button
            onClick={(event) => {
              event.stopPropagation();
              void startMeeting("join");
            }}
            disabled={!hasActiveMeeting}
            loading={meetingLoading}
            className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center text-white hover:bg-white/20 disabled:opacity-40"
            title={
              meetingLoading
                ? "Preparing..."
                : hasActiveMeeting
                  ? "Join meeting"
                  : "No meeting created yet"
            }
            aria-label="Join meeting"
            size="icon"
          >
            <Video className="w-4 h-4" />
          </Button>
          <button
            onClick={(event) => {
              event.stopPropagation();
              setShowChatDetails(true);
            }}
            className="h-9 w-9 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
            title="Chat details"
            aria-label="Chat details"
          >
            <Info className="w-4.5 h-4.5 text-white" />
          </button>
        </div>
      </div>

      {hasActiveMeeting ? (
      <div className="px-4 py-3 bg-card border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-background border border-border flex items-center justify-center shadow-sm">
            <Video className="w-5 h-5 text-[#005F90]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Meet inside this chat</p>
            <p className="text-[11px] text-muted-foreground">
              Launch a Jitsi call so everyone in this conversation can hop in with one tap.
            </p>
          </div>
          <button
            onClick={() => void startMeeting("join")}
            disabled={meetingLoading}
            className="h-9 px-3 rounded-full bg-messages-primary-dark text-white text-xs font-bold shadow-sm disabled:bg-muted"
          >
            {meetingLoading ? "Loading..." : "Join"}
          </button>
        </div>
        {meetingError ? <p className="mt-2 text-xs text-rose-600">{meetingError}</p> : null}
      </div>
      ) : null}

      {/* ── SCROLLABLE MESSAGE LIST (only this zone scrolls) ── */}
      <div
        ref={listRef}
        className="flex-1 min-h-0 overflow-y-auto px-4 pt-4 pb-3 bg-background space-y-2.5"
        onScroll={(event) => {
          if (event.currentTarget.scrollTop < 80) {
            void loadOlderMessages();
          }
        }}
      >
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
            <MessageCircleIcon />
            <p className="text-sm mt-2">No messages yet</p>
            <p className="text-xs mt-1">Say hello to start the conversation.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {loadingOlderMessages && (
              <div className="flex items-center justify-center py-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {messages.map((message, index) => {
              const isMine = message.senderId === selfUserId;
              const meetingSystemLabel = getMeetingSystemLabel(message.text);
              const showDate =
                index === 0 || formatDate(messages[index - 1]?.createdAt) !== formatDate(message.createdAt);

              return (
                <div key={message.id}>
                  {showDate && !meetingSystemLabel ? (
                    <p className="text-center text-[11px] text-muted-foreground my-2">{formatDate(message.createdAt)}</p>
                  ) : null}

                  {meetingSystemLabel ? (
                    <p className="my-2 text-center text-[11px] text-muted-foreground">
                      {meetingSystemLabel} • {formatDate(message.createdAt)}
                    </p>
                  ) : (
                  <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[80%] px-3 py-2 rounded-xl text-[13px] ${
                        isMine
                          ? "bg-messages-primary-dark text-white rounded-tr-none"
                          : "bg-card border border-border text-foreground rounded-tl-none"
                      }`}
                    >
                      {message.text ? (
                        (() => {
                          const links = extractLinks(message.text);
                          const hasLinks = links.length > 0;
                          return (
                            <div className="text-[13px] whitespace-pre-wrap break-words flex flex-col gap-1">
                              <span className="flex-1">{renderTextWithLinks(message.text, isMine)}</span>
                              {hasLinks ? (
                                <button
                                  onClick={() => void copyText(links.join(" "))}
                                  className={`w-fit text-[10px] flex items-center gap-1 ${
                                    isMine ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground"
                                  }`}
                                  aria-label="Copy link"
                                >
                                  <Clipboard className="w-3 h-3" />
                                  Copy link
                                </button>
                              ) : null}
                            </div>
                          );
                        })()
                      ) : null}

                      {Array.isArray(message.attachments) && message.attachments.length > 0 ? (
                        <div className="mt-1.5 space-y-1.5">
                          {message.attachments.map((attachment) =>
                            attachment.type === "image" ? (
                              <div key={attachment.id} className="relative group">
                                <a
                                  href={resolveAttachmentUrl(attachment.url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="block"
                                >
                                  <Image
                                    src={resolveAttachmentUrl(attachment.url)}
                                    alt={attachment.fileName || "Image"}
                                    width={220}
                                    height={160}
                                    unoptimized
                                    className="rounded-lg object-cover"
                                  />
                                </a>
                                <button
                                  onClick={() => downloadFile(attachment.url, attachment.fileName || "image")}
                                  className={`absolute top-2 right-2 p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                                    isMine ? "bg-black/40 hover:bg-black/60" : "bg-white/40 hover:bg-white/60"
                                  }`}
                                  title="Download image"
                                  aria-label="Download image"
                                >
                                  <Download className={`w-4 h-4 ${isMine ? "text-white" : "text-slate-700"}`} />
                                </button>
                              </div>
                            ) : (
                              <div key={attachment.id} className="flex items-center justify-between group">
                                <a
                                  href={resolveAttachmentUrl(attachment.url)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`flex items-center gap-1.5 rounded-md px-2 py-1 flex-1 ${
                                    isMine ? "bg-white/20" : "bg-muted"
                                  }`}
                                >
                                  <File className={`w-3.5 h-3.5 flex-shrink-0 ${isMine ? "text-white" : "text-muted-foreground"}`} />
                                  <span className={`text-[11px] truncate ${isMine ? "text-white" : "text-foreground/90"}`}>
                                    {attachment.fileName || "File"}
                                  </span>
                                </a>
                                <button
                                  onClick={() => downloadFile(attachment.url, attachment.fileName || "file")}
                                  className={`ml-2 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity ${
                                    isMine ? "hover:bg-white/20 text-white" : "hover:bg-muted text-muted-foreground"
                                  }`}
                                  title="Download file"
                                  aria-label="Download file"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ),
                          )}
                        </div>
                      ) : null}

                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        {message.failed ? (
                          <button
                            onClick={() =>
                              message.clientMessageId &&
                              retryFailedMessage(message.clientMessageId)
                            }
                            className="flex items-center gap-1 text-[9px] text-red-400 underline underline-offset-2"
                          >
                            <AlertCircle className="w-2.5 h-2.5" />
                            Tap to retry
                          </button>
                        ) : (
                          <>
                            <p className={`text-[9px] ${isMine ? "text-white/80" : "text-muted-foreground"}`}>
                              {formatTime(message.createdAt)}
                            </p>
                            {isMine ? (
                              <span
                                className={`w-1.5 h-1.5 rounded-full border ${
                                  message.readByAll
                                    ? "bg-sky-300 border-sky-300"
                                    : message.pending
                                      ? "bg-transparent border-white/70"
                                      : "bg-white/80 border-white/80"
                                }`}
                              />
                            ) : null}
                            {message.pending ? (
                              <Loader2
                                className={`w-3 h-3 animate-spin ${isMine ? "text-white/80" : "text-muted-foreground"}`}
                              />
                            ) : null}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── PINNED INPUT BAR (never scrolls, floats above keyboard) ── */}
      {/*
       * ✅ `shrink-0` makes this a fixed-height flex child.
       * When the mobile keyboard opens, `h-[100dvh]` shrinks → the flex
       * column shrinks → this bar naturally sits right above the keyboard.
       * `pb-[env(safe-area-inset-bottom)]` handles iPhone home-indicator notch.
       */}
      <div className="shrink-0 border-t border-border bg-card px-3 py-2.5 pb-[max(8px,env(safe-area-inset-bottom))]">
        {selectedFiles.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted px-2.5 py-1.5 text-xs text-foreground/90"
              >
                <span className="max-w-[100px] truncate">{file.name}</span>
                <button onClick={() => removeFile(index)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {showEmojiMenu ? (
          <div className="mb-2.5 rounded-lg overflow-hidden border border-border bg-muted/30">
            <EmojiPicker
              lazyLoadEmojis
              width="100%"
              height={240}
              onEmojiClick={(emoji: EmojiClickData) => {
                setComposerText((prev) => `${prev}${emoji.emoji}`);
              }}
            />
          </div>
        ) : null}

        <div className="flex items-center gap-2 bg-muted/50 rounded-full px-2 py-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Attachment"
          >
            <Paperclip className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Photo"
          >
            <ImageIcon className="w-4.5 h-4.5" />
          </button>

          <button
            onClick={() => setShowEmojiMenu((prev) => !prev)}
            className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Emoji"
          >
            <Smile className="w-4.5 h-4.5" />
          </button>

          <textarea
            value={composerText}
            onChange={(event) => setComposerText(event.target.value)}
            onFocus={() => setShowEmojiMenu(false)}
            onBlur={() => window.scrollTo(0, 0)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage();
              }
            }}
            rows={1}
            placeholder="Type a message..."
            className="flex-1 max-h-20 min-h-[36px] px-3 py-2 bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
          />

          <Button
            onClick={sendMessage}
            disabled={!composerText.trim() && selectedFiles.length === 0}
            className="w-9 h-9 rounded-full bg-messages-primary-dark text-white flex items-center justify-center disabled:bg-muted/60 disabled:text-muted-foreground transition-colors"
            aria-label="Send"
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <input ref={fileInputRef} type="file" multiple onChange={pickFiles} className="hidden" />
        <input ref={imageInputRef} type="file" multiple accept="image/*" onChange={pickFiles} className="hidden" />
      </div>

      {meetingOpen && !meetingMinimized ? (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm px-3 py-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full max-w-5xl bg-card rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                <div>
                  <p className="text-sm font-semibold text-foreground">Live meeting</p>
                  <p className="text-[11px] text-muted-foreground truncate">{roomName}</p>
                  {meetingError ? <p className="text-[11px] text-rose-600">{meetingError}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMeetingMinimized(true)}
                    className="h-8 w-8 rounded-full bg-muted text-muted-foreground text-xs font-semibold hover:bg-muted/80 flex items-center justify-center"
                    title="Minimize"
                    aria-label="Minimize meeting"
                  >
                    <Minimize2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={closeMeeting}
                    className="w-8 h-8 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80"
                    title="End meeting"
                    aria-label="End meeting"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="relative h-[70vh] bg-background">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 via-black/25 to-transparent z-10" />
                <div ref={jitsiContainerRef} className="relative z-20 h-full w-full rounded-b-2xl overflow-hidden bg-black" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {meetingOpen && meetingMinimized ? (
        <div
          className="pointer-events-auto fixed z-[70] w-72 h-44 rounded-xl shadow-2xl border border-border overflow-hidden bg-card"
          style={{
            left: meetingMiniPosition?.x ?? 12,
            top: meetingMiniPosition?.y ?? 12,
          }}
        >
          <div
            className={`flex items-center justify-between px-3 py-2 border-b border-border bg-card cursor-move ${meetingMiniDragging ? "select-none" : ""}`}
            onPointerDown={beginMiniDrag}
          >
            <p className="text-[11px] font-semibold text-foreground truncate">Live meeting</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMeetingMinimized(false)}
                className="h-7 w-7 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground hover:bg-muted/80 flex items-center justify-center"
                title="Expand to full screen"
                aria-label="Expand to full screen"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={closeMeeting}
                className="h-7 w-7 rounded-full bg-muted text-muted-foreground flex items-center justify-center hover:bg-muted/80"
                title="End meeting"
                aria-label="End meeting"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="relative h-[calc(100%-38px)] bg-black">
            <div ref={jitsiContainerRef} className="absolute inset-0 z-20 rounded-b-xl overflow-hidden bg-black" />
          </div>
        </div>
      ) : null}

      {/* Chat Details Panel - WhatsApp Style */}
      {showChatDetails && (
        <div className="fixed inset-0 z-[80] flex">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/30" 
            onClick={() => setShowChatDetails(false)}
          />
          {/* Slide-in Panel */}
          <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-card shadow-2xl flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-muted/60">
              <button 
                onClick={() => setShowChatDetails(false)}
                className="p-1 rounded-full hover:bg-muted"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
              <h3 className="text-base font-semibold text-foreground">Chat Details</h3>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Chat Info Section */}
              <div className="p-4 border-b border-border">
                <div className="flex flex-col items-center text-center">
                  <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mb-3 overflow-hidden">
                    {chatType === "GROUP" ? (
                      <Users className="h-10 w-10 text-[#005F90]" />
                    ) : avatar ? (
                      <Image
                        src={resolveAttachmentUrl(avatar)}
                        alt={title}
                        width={80}
                        height={80}
                        className="h-full w-full object-cover"
                        unoptimized
                      />
                    ) : (
                      <span className="text-2xl font-semibold text-[#005F90]">
                        {title[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <h4 className="text-lg font-semibold text-foreground">{title}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {chatType === "GROUP" ? "Group chat" : (isOnline ? "Online" : "Offline")}
                  </p>
                </div>
              </div>

              {/* Shared Media Section - Placeholder */}
              <div className="p-4">
                <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  Shared Media
                </h5>
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">No shared media yet</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageCircleIcon() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="text-muted-foreground/50"
    >
      <path
        d="M21 11.5C21 16.1944 16.9706 20 12 20C10.2986 20 8.70888 19.5545 7.35571 18.7816L3 20L4.34521 16.1469C3.48838 14.7795 3 13.1847 3 11.5C3 6.80558 7.02944 3 12 3C16.9706 3 21 6.80558 21 11.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
