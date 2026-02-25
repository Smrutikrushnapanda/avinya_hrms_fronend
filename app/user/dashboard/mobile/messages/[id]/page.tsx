"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { File, ArrowLeft, ImageIcon, Loader2, Paperclip, Send, Smile, X, Video, Clipboard } from "lucide-react";
import { getChatMessages, getProfile, sendChatMessage } from "@/app/api/api";
import { createMessageSocket } from "@/lib/socket";

type ChatAttachment = {
  id: string;
  url: string;
  fileName?: string;
  type: "image" | "file";
};

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  createdAt: string;
  readByAll?: boolean;
  pending?: boolean;
  attachments?: ChatAttachment[];
};

type ProfileLike = {
  id?: string;
  userId?: string;
};

type RawChatAttachment = {
  id?: string;
  url?: string;
  fileName?: string;
  type?: string;
};

type RawChatMessage = {
  id?: string;
  conversationId?: string;
  senderId?: string;
  text?: string;
  createdAt?: string;
  readByAll?: boolean;
  pending?: boolean;
  attachments?: RawChatAttachment[];
};

type ChatSocketPayload = {
  conversationId?: string;
  message?: RawChatMessage;
};

type PresencePayload = {
  userId?: string;
  status?: "online" | "offline";
};

const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
};

const sortMessages = (messages: ChatMessage[]) =>
  [...messages].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
  );

const toChatMessage = (item: RawChatMessage): ChatMessage => ({
  id: item.id || "",
  conversationId: item.conversationId || "",
  senderId: item.senderId || "",
  text: item.text || "",
  createdAt: item.createdAt || new Date().toISOString(),
  readByAll: Boolean(item.readByAll),
  pending: Boolean(item.pending),
  attachments: Array.isArray(item.attachments)
    ? item.attachments
        .filter((attachment) => Boolean(attachment?.id) && Boolean(attachment?.url))
        .map((attachment) => ({
          id: attachment.id as string,
          url: attachment.url as string,
          fileName: attachment.fileName,
          type: attachment.type === "image" ? "image" : "file",
        }))
    : [],
});

const resolveAttachmentUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  const base =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_LOCAL_API_BASE_URL ||
    "https://avinya-hrms-backend-y6f5.onrender.com";
  return `${base}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function MobileChatPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();

  const conversationId = useMemo(
    () => (Array.isArray(params?.id) ? params.id[0] : params?.id || ""),
    [params?.id],
  );

  const title = searchParams.get("title") || "Chat";
  const avatar = searchParams.get("avatar") || "";
  const peerId = searchParams.get("peerId") || "";
  const chatType = searchParams.get("type") || "DIRECT";

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [composerText, setComposerText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [selfUserId, setSelfUserId] = useState("");
  const [selfName, setSelfName] = useState("");
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingMinimized, setMeetingMinimized] = useState(false);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingError, setMeetingError] = useState("");
  const jitsiContainerRef = useRef<HTMLDivElement | null>(null);
  const jitsiApiRef = useRef<any | null>(null);
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

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const loadMessages = useCallback(async () => {
    if (!conversationId) return;
    try {
      const response = await getChatMessages(conversationId, { limit: 200 });
      const list = Array.isArray(response.data) ? response.data : [];
      const normalized = list.map((item: unknown) => toChatMessage((item as RawChatMessage) || {}));
      setMessages(sortMessages(normalized));
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

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
    void loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const socket = createMessageSocket(token);

    socket.on("chat:message", (payload: ChatSocketPayload) => {
      if (payload.conversationId !== conversationId) return;
      const incoming = toChatMessage(payload.message || {});
      if (!incoming.id) return;

      setMessages((prev) => {
        const withoutPending = prev.filter(
          (item) =>
            !(
              item.pending &&
              item.senderId === incoming.senderId &&
              (item.text || "") === (incoming.text || "")
            ),
        );

        if (withoutPending.some((item) => item.id === incoming.id)) return withoutPending;
        return sortMessages([...withoutPending, incoming]);
      });
    });

    socket.on("chat:presence", (payload: PresencePayload) => {
      if (!payload.userId || payload.userId !== peerId) return;
      setIsOnline(payload.status === "online");
    });

    return () => {
      socket.disconnect();
      setIsOnline(false);
    };
  }, [conversationId, peerId]);

  const sendMessage = async () => {
    if (!conversationId || sending) return;
    if (!composerText.trim() && selectedFiles.length === 0) return;

    const tempId = `temp-${Date.now()}`;
    const now = new Date().toISOString();

    const optimistic: ChatMessage = {
      id: tempId,
      conversationId,
      senderId: selfUserId,
      text: composerText.trim() || "",
      createdAt: now,
      pending: true,
      attachments: [],
    };

    setMessages((prev) => sortMessages([...prev, optimistic]));

    const formData = new FormData();
    if (composerText.trim()) formData.append("text", composerText.trim());
    selectedFiles.forEach((file) => formData.append("files", file));

    setSending(true);
    try {
      const response = await sendChatMessage(conversationId, formData);
      const saved = toChatMessage((response.data || {}) as RawChatMessage);

      setMessages((prev) => {
        const withoutTemp = prev.filter((item) => item.id !== tempId);
        if (withoutTemp.some((item) => item.id === saved.id)) return withoutTemp;
        return sortMessages([...withoutTemp, saved]);
      });

      setComposerText("");
      setSelectedFiles([]);
      setShowEmojiMenu(false);
    } catch {
      setMessages((prev) => prev.filter((item) => item.id !== tempId));
    } finally {
      setSending(false);
    }
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

  const startMeeting = async () => {
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
      const meetingRoomUrl = existing?.url || meetingUrl;

      await loadJitsiScript();
      setMeetingOpen(true);
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

      // Share the meeting link in chat so members can tap to join.
      if (conversationId && !existing?.linkPosted) {
        const formData = new FormData();
        formData.append("text", `Join meeting: ${meetingRoomUrl}`);
        try {
          await sendChatMessage(conversationId, formData);
          const started = new FormData();
          started.append("text", "Meeting started");
          await sendChatMessage(conversationId, started);
        } catch {
          /* ignore send failures */
        }
        setMeetingState({ conversationId, url: meetingRoomUrl, linkPosted: true });
      } else if (conversationId && existing) {
        setMeetingState({ conversationId, url: meetingRoomUrl, linkPosted: true });
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
        ended.append("text", "Meeting ended");
        void sendChatMessage(conversationId, ended);
      } catch {
        // ignore
      }
      setMeetingState(null);
    }
    setMeetingOpen(false);
  };

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
    <div className="h-[100dvh] bg-white flex flex-col overflow-hidden">

      {/* ── STICKY HEADER (never scrolls) ── */}
      <div className="sticky top-0 z-20 shrink-0 bg-[#005F90] pt-[max(32px,env(safe-area-inset-top))] pb-2.5 px-4 flex items-center gap-2.5">
        <button
          onClick={() => router.push("/user/dashboard/mobile/messages")}
          className="p-1 rounded-md text-white hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="w-9 h-9 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">
          {avatar ? (
            <Image
              src={resolveAttachmentUrl(avatar)}
              alt={title}
              width={36}
              height={36}
              className="w-full h-full object-cover"
              unoptimized
            />
          ) : (
            <span className="font-bold text-slate-900">{title.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="ml-2.5 min-w-0">
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

        <button
          onClick={() => void startMeeting()}
          disabled={meetingLoading}
          className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20 disabled:opacity-60"
        >
          {meetingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
          <span>{meetingLoading ? "Preparing..." : "Start Meeting"}</span>
        </button>
      </div>

      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
            <Video className="w-5 h-5 text-[#005F90]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900">Meet inside this chat</p>
            <p className="text-[11px] text-slate-500">
              Launch a Jitsi call so everyone in this conversation can hop in with one tap.
            </p>
          </div>
          <button
            onClick={() => void startMeeting()}
            disabled={meetingLoading}
            className="h-9 px-3 rounded-full bg-[#005F90] text-white text-xs font-bold shadow-sm disabled:bg-slate-300"
          >
            {meetingLoading ? "Loading..." : "Join / Start"}
          </button>
        </div>
        {meetingError ? <p className="mt-2 text-xs text-rose-600">{meetingError}</p> : null}
      </div>

      {/* ── SCROLLABLE MESSAGE LIST (only this zone scrolls) ── */}
      <div ref={listRef} className="flex-1 min-h-0 overflow-y-auto px-4 pt-3 pb-4 bg-white">
        {loading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500">
            <MessageCircleIcon />
            <p className="text-sm mt-2">No messages yet</p>
            <p className="text-xs mt-1">Say hello to start the conversation.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {messages.map((message, index) => {
              const isMine = message.senderId === selfUserId;
              const showDate =
                index === 0 || formatDate(messages[index - 1]?.createdAt) !== formatDate(message.createdAt);

              return (
                <div key={message.id}>
                  {showDate ? (
                    <p className="text-center text-[11px] text-slate-400 my-2">{formatDate(message.createdAt)}</p>
                  ) : null}

                  <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[78%] px-2.5 py-2 rounded-xl ${
                        isMine
                          ? "bg-[#E0F2FE] rounded-tr-none"
                          : "bg-white border border-slate-200 rounded-tl-none"
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
                                  className="w-fit text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-1"
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
                              <a
                                key={attachment.id}
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
                            ) : (
                              <a
                                key={attachment.id}
                                href={resolveAttachmentUrl(attachment.url)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-1.5 bg-slate-100 rounded-md px-2 py-1"
                              >
                                <File className="w-3.5 h-3.5 text-slate-700" />
                                <span className="text-[11px] text-slate-700 truncate">
                                  {attachment.fileName || "File"}
                                </span>
                              </a>
                            ),
                          )}
                        </div>
                      ) : null}

                      <div className="mt-1 flex items-center justify-end gap-1.5">
                        <p className="text-[9px] text-slate-400">{formatTime(message.createdAt)}</p>
                        {isMine ? (
                          <span
                            className={`w-1.5 h-1.5 rounded-full border ${
                              message.readByAll
                                ? "bg-sky-500 border-sky-500"
                                : message.pending
                                  ? "bg-transparent border-slate-400"
                                  : "bg-slate-400 border-slate-400"
                            }`}
                          />
                        ) : null}
                        {message.pending ? <Loader2 className="w-3 h-3 animate-spin text-slate-400" /> : null}
                      </div>
                    </div>
                  </div>
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
      <div className="shrink-0 border-t border-slate-200 bg-white px-3 pt-2 pb-[max(8px,env(safe-area-inset-bottom))]">
        {selectedFiles.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
              >
                <span className="max-w-[120px] truncate">{file.name}</span>
                <button onClick={() => removeFile(index)}>
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {showEmojiMenu ? (
          <div className="mb-2 rounded-lg overflow-hidden border border-slate-200">
            <EmojiPicker
              lazyLoadEmojis
              width="100%"
              height={260}
              onEmojiClick={(emoji: EmojiClickData) => {
                setComposerText((prev) => `${prev}${emoji.emoji}`);
              }}
            />
          </div>
        ) : null}

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-8 h-8 flex items-center justify-center text-slate-700"
            aria-label="Attachment"
          >
            <Paperclip className="w-5 h-5" />
          </button>

          <button
            onClick={() => imageInputRef.current?.click()}
            className="w-8 h-8 flex items-center justify-center text-slate-700"
            aria-label="Photo"
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShowEmojiMenu((prev) => !prev)}
            className="w-8 h-8 flex items-center justify-center text-slate-700"
            aria-label="Emoji"
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            value={composerText}
            onChange={(event) => setComposerText(event.target.value)}
            onFocus={() => setShowEmojiMenu(false)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Type a message"
            className="flex-1 h-10 px-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none"
          />

          <button
            onClick={() => void sendMessage()}
            disabled={sending || (!composerText.trim() && selectedFiles.length === 0)}
            className="w-9 h-9 rounded-full bg-[#005F90] text-white flex items-center justify-center disabled:bg-slate-300"
            aria-label="Send"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>

        <input ref={fileInputRef} type="file" multiple onChange={pickFiles} className="hidden" />
        <input ref={imageInputRef} type="file" multiple accept="image/*" onChange={pickFiles} className="hidden" />
      </div>

      {meetingOpen && !meetingMinimized ? (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm px-3 py-6">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Live meeting</p>
                  <p className="text-[11px] text-slate-500 truncate">{roomName}</p>
                  {meetingError ? <p className="text-[11px] text-rose-600">{meetingError}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMeetingMinimized(true)}
                    className="h-8 px-3 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200"
                  >
                    Minimize
                  </button>
                  <button
                    onClick={closeMeeting}
                    className="w-8 h-8 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="relative h-[70vh] bg-slate-50">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 via-black/25 to-transparent z-10" />
                <div ref={jitsiContainerRef} className="relative z-20 h-full w-full rounded-b-2xl overflow-hidden bg-black" />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {meetingOpen && meetingMinimized ? (
        <div className="pointer-events-auto fixed bottom-3 right-3 z-[70] w-72 h-44 rounded-xl shadow-2xl border border-slate-200 overflow-hidden bg-white">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white">
            <p className="text-[11px] font-semibold text-slate-800 truncate">Live meeting</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setMeetingMinimized(false)}
                className="h-7 px-2 rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700 hover:bg-slate-200"
              >
                Restore
              </button>
              <button
                onClick={closeMeeting}
                className="h-7 w-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200"
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
      className="text-slate-300"
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
