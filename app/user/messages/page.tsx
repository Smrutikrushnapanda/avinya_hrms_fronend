"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDirectChat,
  createGroupChat,
  getChatConversations,
  getChatMessages,
  getEmployees,
  getProfile,
  sendChatMessage,
  apiBaseURL,
} from "@/app/api/api";
import { createMessageSocket } from "@/lib/socket";
import {
  Circle,
  ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Plus,
  Search,
  Send,
  Smile,
  ChevronDown,
  Users,
  X,
  Video,
  Clipboard,
} from "lucide-react";
import { toast } from "sonner";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";

type ConversationParticipant = {
  userId: string;
  firstName?: string;
  lastName?: string;
};

type ChatAttachment = {
  id: string;
  url: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  type: "image" | "file";
};

type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  createdAt: string;
  readByAll?: boolean;
  attachments?: ChatAttachment[];
  sender?: {
    id?: string;
    firstName?: string;
    lastName?: string;
  };
};

type Conversation = {
  id: string;
  type: "DIRECT" | "GROUP";
  title?: string;
  participants: ConversationParticipant[];
  lastMessage?: {
    id: string;
    text?: string;
    senderId: string;
    createdAt: string;
    attachments?: ChatAttachment[];
  } | null;
  unreadCount?: number;
  updatedAt: string;
};

type Employee = {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  workEmail?: string;
};

type PresencePayload = {
  userId?: string;
  status?: "online" | "offline";
};

type ChatSocketPayload = {
  conversationId?: string;
  message?: Partial<ChatMessage>;
};

type ApiErrorLike = {
  response?: {
    data?: {
      message?: string;
    };
  };
};

const formatTime = (value?: string) => {
  if (!value) return "";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDate = (value?: string) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const resolveAttachmentUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  return `${apiBaseURL}${url}`;
};

const getErrorMessage = (error: unknown, fallback: string) =>
  (error as ApiErrorLike)?.response?.data?.message || fallback;

const toConversation = (item: unknown): Conversation => {
  const data = (item || {}) as {
    id?: string;
    type?: string;
    title?: string;
    participants?: ConversationParticipant[];
    lastMessage?: {
      id: string;
      text?: string;
      senderId: string;
      createdAt: string;
      attachments?: ChatAttachment[];
    };
    unreadCount?: number | string;
    updatedAt?: string;
  };

  return {
    id: data.id || "",
    type: data.type === "GROUP" ? "GROUP" : "DIRECT",
    title: data.title || undefined,
    participants: Array.isArray(data.participants)
      ? data.participants.map((participant) => ({
          userId: participant?.userId || "",
          firstName: participant?.firstName || "",
          lastName: participant?.lastName || "",
        }))
      : [],
    lastMessage: data.lastMessage
      ? {
          id: data.lastMessage.id,
          text: data.lastMessage.text || "",
          senderId: data.lastMessage.senderId,
          createdAt: data.lastMessage.createdAt,
          attachments: data.lastMessage.attachments || [],
        }
      : null,
    unreadCount: Number(data.unreadCount || 0),
    updatedAt: data.updatedAt || new Date().toISOString(),
  };
};

const toChatMessage = (item: unknown): ChatMessage => {
  const data = (item || {}) as ChatMessage;
  return {
    id: data.id || "",
    conversationId: data.conversationId || "",
    senderId: data.senderId || "",
    text: data.text || "",
    createdAt: data.createdAt || new Date().toISOString(),
    readByAll: Boolean(data.readByAll),
    attachments: Array.isArray(data.attachments) ? data.attachments : [],
    sender: data.sender,
  };
};

export default function MessagesPage() {
  const [loading, setLoading] = useState(true);
  const [conversationLoading, setConversationLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [composerText, setComposerText] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<string>("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showEmojiMenu, setShowEmojiMenu] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [selfUserIds, setSelfUserIds] = useState<Set<string>>(new Set());
  const [selfUserId, setSelfUserId] = useState("");
  const [selfName, setSelfName] = useState("You");
  const [participantFilter, setParticipantFilter] = useState("");
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [meetingMinimized, setMeetingMinimized] = useState(false);
  const [meetingLoading, setMeetingLoading] = useState(false);
  const [meetingError, setMeetingError] = useState("");
  const jitsiContainerRef = useRef<HTMLDivElement | null>(null);
  const jitsiApiRef = useRef<any | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const previousConversationRef = useRef<string>("");
  const previousMessageCountRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const conversationIdsRef = useRef<Set<string>>(new Set());
  const selectedConversationRef = useRef<string>("");
  const selfUserIdsRef = useRef<Set<string>>(new Set());

  const selectedConversation = useMemo(
    () => conversations.find((conv) => conv.id === selectedConversationId) || null,
    [conversations, selectedConversationId]
  );

  const employeeUserMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach((employee) => {
      map.set(employee.userId, employee);
    });
    return map;
  }, [employees]);

  const getParticipantName = useCallback(
    (userId: string) => {
      const employee = employeeUserMap.get(userId);
      if (!employee) return "Unknown";
      const name = `${employee.firstName || ""} ${employee.lastName || ""}`.trim();
      return name || employee.workEmail || "Unknown";
    },
    [employeeUserMap]
  );

  const getConversationTitle = useCallback(
    (conversation: Conversation) => {
      if (conversation.type === "GROUP") return conversation.title || "Group Chat";
      const otherParticipant = conversation.participants.find(
        (participant) => !selfUserIds.has(participant.userId)
      );
      if (!otherParticipant) return "Direct Chat";
      const displayName =
        `${otherParticipant.firstName || ""} ${otherParticipant.lastName || ""}`.trim();
      return displayName || getParticipantName(otherParticipant.userId);
    },
    [getParticipantName, selfUserIds]
  );

  const filteredConversations = useMemo(() => {
    const term = search.trim().toLowerCase();
    const selfScopedConversations =
      selfUserIds.size > 0
        ? conversations.filter((conversation) =>
            conversation.participants.some((participant) =>
              selfUserIds.has(participant.userId)
            )
          )
        : conversations;

    if (!term) return selfScopedConversations;
    return selfScopedConversations.filter((conversation) => {
      const title = getConversationTitle(conversation).toLowerCase();
      const preview = conversation.lastMessage?.text?.toLowerCase() || "";
      return title.includes(term) || preview.includes(term);
    });
  }, [conversations, search, getConversationTitle, selfUserIds]);

  const selectableEmployees = useMemo(
    () => employees.filter((employee) => !selfUserIds.has(employee.userId)),
    [employees, selfUserIds]
  );

  const roomName = useMemo(
    () => (selectedConversationId ? `hrms-chat-${selectedConversationId}` : "hrms-chat"),
    [selectedConversationId],
  );

  const filteredEmployees = useMemo(() => {
    const term = participantFilter.trim().toLowerCase();
    if (!term) return selectableEmployees;
    return selectableEmployees.filter((employee) => {
      const name = `${employee.firstName || ""} ${employee.lastName || ""}`.toLowerCase();
      const email = (employee.workEmail || "").toLowerCase();
      return name.includes(term) || email.includes(term);
    });
  }, [selectableEmployees, participantFilter]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const container = messageContainerRef.current;
    if (!container) return;
    container.scrollTo({
      top: container.scrollHeight,
      behavior,
    });
    messagesEndRef.current?.scrollIntoView({ behavior, block: "end" });
    setShowScrollToBottom(false);
  }, []);

  const playIncomingMessageSound = useCallback(async () => {
    if (typeof window === "undefined") return;
    try {
      const AudioContextCtor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextCtor) return;

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextCtor();
      }

      const audioContext = audioContextRef.current;
      if (audioContext.state === "suspended") {
        await audioContext.resume();
      }

      const now = audioContext.currentTime;
      const gainNode = audioContext.createGain();
      gainNode.connect(audioContext.destination);
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(0.035, now + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      const firstTone = audioContext.createOscillator();
      firstTone.type = "sine";
      firstTone.frequency.setValueAtTime(740, now);
      firstTone.frequency.linearRampToValueAtTime(880, now + 0.08);
      firstTone.connect(gainNode);
      firstTone.start(now);
      firstTone.stop(now + 0.16);

      const secondTone = audioContext.createOscillator();
      secondTone.type = "sine";
      secondTone.frequency.setValueAtTime(988, now + 0.08);
      secondTone.connect(gainNode);
      secondTone.start(now + 0.08);
      secondTone.stop(now + 0.28);
    } catch {
      // Browser may block auto-play before user interaction.
    }
  }, []);

  const loadConversations = useCallback(async (keepCurrent = true) => {
    try {
      const response = await getChatConversations();
      const items = Array.isArray(response.data) ? response.data.map(toConversation) : [];
      items.sort(
        (a: Conversation, b: Conversation) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
      setConversations(items);
      setSelectedConversationId((prev) => {
        if (keepCurrent && prev && items.some((item: Conversation) => item.id === prev)) {
          return prev;
        }
        return items[0]?.id || "";
      });
    } catch (error) {
      console.error("Failed to load conversations:", error);
      toast.error("Failed to load conversations");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const unreadCount = conversations.reduce(
      (sum, conversation) => sum + (conversation.unreadCount || 0),
      0
    );
    window.dispatchEvent(
      new CustomEvent("chatUnreadUpdate", { detail: { count: unreadCount } })
    );
  }, [conversations]);

  useEffect(() => {
    conversationIdsRef.current = new Set(conversations.map((item) => item.id));
  }, [conversations]);

  useEffect(() => {
    selectedConversationRef.current = selectedConversationId;
  }, [selectedConversationId]);

  useEffect(() => {
    selfUserIdsRef.current = selfUserIds;
  }, [selfUserIds]);

  const loadMessages = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    setConversationLoading(true);
    try {
      const response = await getChatMessages(conversationId, { limit: 100 });
      const items = Array.isArray(response.data) ? response.data.map(toChatMessage) : [];
      setMessages(items);
      setConversations((prev) =>
        prev.map((conversation) =>
          conversation.id === conversationId
            ? { ...conversation, unreadCount: 0 }
            : conversation
        )
      );
    } catch (error) {
      console.error("Failed to load chat messages:", error);
      toast.error("Failed to load messages");
      setMessages([]);
    } finally {
      setConversationLoading(false);
    }
  }, []);

  const loadEmployeesAndProfile = useCallback(async () => {
    try {
      const profileRes = await getProfile();
      const profile = profileRes.data || {};
      const currentIds = new Set<string>();
      if (profile?.id) currentIds.add(profile.id);
      if (profile?.userId) currentIds.add(profile.userId);
      setSelfUserId(profile.userId || profile.id || "");
      const fullName = `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
      setSelfName(fullName || "You");
      setSelfUserIds(currentIds);

      if (!profile?.organizationId) return;
      const employeesRes = await getEmployees(profile.organizationId);
      const employeeList = Array.isArray(employeesRes.data?.employees)
        ? employeesRes.data.employees
        : Array.isArray(employeesRes.data)
          ? employeesRes.data
          : [];
      setEmployees(
        employeeList.map((employee: Employee) => ({
          id: employee.id,
          userId: employee.userId,
          firstName: employee.firstName || "",
          lastName: employee.lastName || "",
          workEmail: employee.workEmail || "",
        }))
      );
    } catch (error) {
      console.error("Failed to load employees/profile:", error);
      toast.error("Failed to load chat participants");
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      setLoading(true);
      await Promise.all([loadEmployeesAndProfile(), loadConversations(false)]);
      if (mounted) setLoading(false);
    };
    init();
    return () => {
      mounted = false;
    };
  }, [loadConversations, loadEmployeesAndProfile]);

  useEffect(() => {
    if (!selectedConversationId) {
      setMessages([]);
      return;
    }
    loadMessages(selectedConversationId);
  }, [selectedConversationId, loadMessages]);

  const syncMessagesForConversation = useCallback(async (conversationId: string) => {
    if (!conversationId) return;
    try {
      const response = await getChatMessages(conversationId, { limit: 100 });
      const items = Array.isArray(response.data) ? response.data.map(toChatMessage) : [];
      setMessages(items);
      requestAnimationFrame(() => scrollToBottom("smooth"));
    } catch {
      // silent fallback
    }
  }, [scrollToBottom]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("access_token");
    if (!token) return;

    const socket = createMessageSocket(token);

    socket.on("chat:presence", (payload: PresencePayload) => {
      const userId = payload?.userId;
      const status = payload?.status;
      if (!userId || !status) return;
      setOnlineUsers((prev) => {
        const next = new Set(prev);
        if (status === "online") next.add(userId);
        if (status === "offline") next.delete(userId);
        return next;
      });
    });

    socket.on("chat:message", (payload: ChatSocketPayload) => {
      const conversationId = payload?.conversationId;
      const incoming = payload?.message;
      if (!conversationId || !incoming?.id) return;
      const normalized = toChatMessage(incoming);
      if (!selfUserIdsRef.current.has(normalized.senderId)) {
        void playIncomingMessageSound();
      }

      const hadConversation = conversationIdsRef.current.has(conversationId);
      setConversations((prev) => {
        const target = prev.find((item) => item.id === conversationId);
        const fallbackConversation: Conversation | null = target
          ? {
              ...target,
              lastMessage: {
                id: normalized.id,
                text: normalized.text || "",
                senderId: normalized.senderId,
                createdAt: normalized.createdAt,
                attachments: normalized.attachments || [],
              },
              updatedAt: normalized.createdAt || new Date().toISOString(),
              unreadCount:
                selectedConversationRef.current === conversationId
                  ? 0
                  : (target.unreadCount || 0) + 1,
            }
          : null;

        const list = fallbackConversation
          ? [
              fallbackConversation,
              ...prev.filter((conversation) => conversation.id !== conversationId),
            ]
          : prev;

        return list;
      });
      if (!hadConversation) {
        void loadConversations(true);
      }

      if (selectedConversationRef.current === conversationId) {
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === normalized.id)) return prev;
          const next = [...prev, normalized].sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          requestAnimationFrame(() => scrollToBottom("smooth"));
          return next;
        });
        // Keep state aligned with server ordering and read flags
        void syncMessagesForConversation(conversationId);
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [
    loadConversations,
    playIncomingMessageSound,
    scrollToBottom,
    syncMessagesForConversation,
  ]);

  useEffect(() => {
    if (conversationLoading) return;

    const isConversationChanged =
      previousConversationRef.current !== selectedConversationId;
    const hasNewMessages = messages.length > previousMessageCountRef.current;

    if (isConversationChanged || hasNewMessages) {
      const behavior: ScrollBehavior =
        isConversationChanged || previousMessageCountRef.current === 0
          ? "auto"
          : "smooth";
      requestAnimationFrame(() => scrollToBottom(behavior));
    }

    previousConversationRef.current = selectedConversationId;
    previousMessageCountRef.current = messages.length;
  }, [conversationLoading, messages, scrollToBottom, selectedConversationId]);

  const onPickFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setSelectedFiles((prev) => [...prev, ...files].slice(0, 5));
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, idx) => idx !== index));
  };

  const sendMessage = async () => {
    if (!selectedConversationId || sending) return;
    if (!composerText.trim() && selectedFiles.length === 0) return;

    const formData = new FormData();
    if (composerText.trim()) formData.append("text", composerText.trim());
    selectedFiles.forEach((file) => formData.append("files", file));

    setSending(true);
    try {
      const response = await sendChatMessage(selectedConversationId, formData);
      const newMessage = toChatMessage(response.data);
      setMessages((prev) => {
        if (prev.some((message) => message.id === newMessage.id)) {
          return prev;
        }
        return [...prev, newMessage].sort(
          (a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
      });
      setConversations((prev) =>
        prev
          .map((conversation) =>
            conversation.id === selectedConversationId
              ? {
                  ...conversation,
                  lastMessage: {
                    id: newMessage.id,
                    text: newMessage.text || "",
                    senderId: newMessage.senderId,
                    createdAt: newMessage.createdAt,
                    attachments: newMessage.attachments || [],
                  },
                  updatedAt: newMessage.createdAt || new Date().toISOString(),
                }
              : conversation
          )
          .sort(
            (a, b) =>
              new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )
      );
      setComposerText("");
      setSelectedFiles([]);
      setShowEmojiMenu(false);
    } catch (error: unknown) {
      console.error("Failed to send chat message:", error);
      toast.error(getErrorMessage(error, "Failed to send message"));
    } finally {
      setSending(false);
    }
  };

  const openDirectChat = async (userId: string) => {
    try {
      const response = await createDirectChat(userId);
      const conversationId = response?.data?.id;
      await loadConversations(true);
      if (conversationId) {
        setSelectedConversationId(conversationId);
      }
      setShowNewChatModal(false);
      setParticipantFilter("");
    } catch (error: unknown) {
      console.error("Failed to create direct chat:", error);
      toast.error(getErrorMessage(error, "Failed to open direct chat"));
    }
  };

  const toggleGroupMember = (userId: string) => {
    setGroupMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const createGroup = async () => {
    if (!groupTitle.trim()) {
      toast.error("Group name is required");
      return;
    }
    if (groupMembers.length === 0) {
      toast.error("Select at least one member");
      return;
    }
    try {
      const response = await createGroupChat({
        title: groupTitle.trim(),
        userIds: groupMembers,
      });
      const conversationId = response?.data?.id;
      await loadConversations(true);
      if (conversationId) setSelectedConversationId(conversationId);
      setShowGroupModal(false);
      setGroupTitle("");
      setGroupMembers([]);
      setParticipantFilter("");
    } catch (error: unknown) {
      console.error("Failed to create group chat:", error);
      toast.error(getErrorMessage(error, "Failed to create group"));
    }
  };

  const jitsiDomain = process.env.NEXT_PUBLIC_JITSI_DOMAIN || "8x8.vc";
  const jitsiPrefix =
    process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX || "vpaas-magic-cookie-13baaedb78ca4524a95bc3d4f7748bf4";
  const jitsiJwt = process.env.NEXT_PUBLIC_JITSI_JWT;

  const meetingUrl = useMemo(() => {
    return `https://${jitsiDomain}/${jitsiPrefix}/${roomName || "hrms-meet"}`;
  }, [jitsiDomain, jitsiPrefix, roomName]);

  // ---- Meeting state helpers (persisted so button can show Join) ----
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
          expiresAt: now + 2 * 60 * 60 * 1000, // 2 hours
        });
      }
      localStorage.setItem(meetingStoreKey, JSON.stringify(filtered));
    } catch {
      // ignore
    }
  }, []);

  const renderTextWithLinks = (text: string, isMine: boolean) => {
    const urlRegex = /(https?:\/\/[^\s]+)/gi;
    return text.split(urlRegex).map((part, idx) => {
      if (urlRegex.test(part)) {
        return (
          <a
            key={`${part}-${idx}`}
            href={part}
            target="_blank"
            rel="noreferrer"
            className={`${isMine ? "text-white" : "text-[#0b7ebd]"} underline break-words`}
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
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

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
    if (!selectedConversationId || !selfUserId) {
      toast.error("Select a conversation first");
      return;
    }
    if (!jitsiPrefix) {
      const msg = "Set NEXT_PUBLIC_JITSI_ROOM_PREFIX to your JAAS tenant prefix.";
      setMeetingError(msg);
      toast.error(msg);
      return;
    }
    setMeetingLoading(true);
    setMeetingError("");
    try {
      // reuse active meeting if one exists
      const existing = getMeetingState(selectedConversationId);
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

      // drop the meeting link into the conversation so others can join (only first time)
      if (selectedConversationId && !existing?.linkPosted) {
        const formData = new FormData();
        formData.append("text", `Join meeting: ${meetingRoomUrl}`);
        try {
          await sendChatMessage(selectedConversationId, formData);
          const started = new FormData();
          started.append("text", "Meeting started");
          await sendChatMessage(selectedConversationId, started);
        } catch {
          // non-blocking; ignore send errors
        }
        setMeetingState({ conversationId: selectedConversationId, url: meetingRoomUrl, linkPosted: true });
      } else if (selectedConversationId && existing) {
        setMeetingState({ conversationId: selectedConversationId, url: meetingRoomUrl, linkPosted: true });
      }
    } catch (error) {
      const message = (error as Error).message || "Unable to start meeting";
      setMeetingError(message);
      toast.error(message);
      setMeetingOpen(false);
    } finally {
      setMeetingLoading(false);
    }
  };

  const closeMeeting = () => {
    jitsiApiRef.current?.dispose?.();
    jitsiApiRef.current = null;
    if (selectedConversationId && getMeetingState(selectedConversationId)) {
      try {
        const formData = new FormData();
        formData.append("text", "Meeting ended");
        void sendChatMessage(selectedConversationId, formData);
      } catch {
        // ignore
      }
      setMeetingState(null);
    }
    setMeetingOpen(false);
  };

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2 text-slate-700">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading chats...
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 bg-slate-100">
      <aside className="flex w-[360px] min-w-[320px] flex-col border-r border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <MessageSquare className="h-5 w-5 text-[#0077b6]" />
              Messages
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGroupModal(true)}
                className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <Users className="mr-1 inline h-3.5 w-3.5" />
                Group
              </button>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="rounded-md bg-[#0077b6] px-2 py-1 text-xs font-medium text-white hover:bg-[#005f91]"
              >
                <Plus className="mr-1 inline h-3.5 w-3.5" />
                New
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search chats"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {filteredConversations.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-500">
              No conversations yet
            </div>
          ) : (
            filteredConversations.map((conversation) => {
              const isActive = selectedConversationId === conversation.id;
              const title = getConversationTitle(conversation);
              const preview =
                conversation.lastMessage?.text ||
                (conversation.lastMessage?.attachments?.length
                  ? "Attachment"
                  : "No messages yet");
              const directUser = conversation.participants.find(
                (participant) => !selfUserIds.has(participant.userId)
              );
              const isOnline =
                conversation.type === "DIRECT" &&
                Boolean(directUser && onlineUsers.has(directUser.userId));

              return (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversationId(conversation.id)}
                  className={`mb-1 w-full rounded-lg border px-3 py-2 text-left transition ${
                    isActive
                      ? "border-[#0077b6] bg-[#e6f4fa]"
                      : "border-transparent hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {conversation.type === "GROUP" ? (
                          <Users className="h-4 w-4 text-slate-500" />
                        ) : (
                          <Circle
                            className={`h-3 w-3 ${
                              isOnline ? "fill-green-500 text-green-500" : "text-slate-300"
                            }`}
                          />
                        )}
                        <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-600">{preview}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-slate-500">
                        {formatTime(conversation.lastMessage?.createdAt || conversation.updatedAt)}
                      </p>
                      {(conversation.unreadCount || 0) > 0 ? (
                        <span className="mt-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#0077b6] px-1 text-[11px] font-semibold text-white">
                          {conversation.unreadCount}
                        </span>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <section className="relative flex min-w-0 flex-1 flex-col">
        {!selectedConversation ? (
          <div className="flex h-full flex-col items-center justify-center text-slate-500">
            <MessageSquare className="mb-3 h-12 w-12 text-slate-300" />
            <p className="text-sm">Select a conversation to start chatting</p>
          </div>
        ) : (
          <>
            <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900">
                  {getConversationTitle(selectedConversation)}
                </h2>
                <p className="text-xs text-slate-500">
                  {selectedConversation.type === "GROUP"
                    ? `${selectedConversation.participants.length} members`
                    : "Direct conversation"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={startMeeting}
                  disabled={meetingLoading}
                  className="flex items-center gap-1 rounded-md bg-[#0b7ebd] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#06659a] disabled:opacity-60"
                >
                  {meetingLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                  {meetingLoading ? "Preparing..." : getMeetingState(selectedConversationId || "") ? "Join Meeting" : "Start Meeting"}
                </button>
                <button
                  onClick={() => loadConversations(true)}
                  className="rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-100"
                >
                  Refresh
                </button>
              </div>
            </header>

            <div
              ref={messageContainerRef}
              className="min-h-0 flex-1 overflow-y-auto bg-[#efeae2] p-4"
              onScroll={(event) => {
                const target = event.currentTarget;
                const distanceFromBottom =
                  target.scrollHeight - target.scrollTop - target.clientHeight;
                setShowScrollToBottom(distanceFromBottom > 160);
              }}
            >
              {conversationLoading ? (
                <div className="flex h-full items-center justify-center text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading messages...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">
                  No messages yet. Send the first message.
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message, index) => {
                    const isMine = selfUserIds.has(message.senderId);
                    const showDateLabel =
                      index === 0 ||
                      formatDate(messages[index - 1]?.createdAt) !==
                        formatDate(message.createdAt);

                    return (
                      <div key={message.id}>
                        {showDateLabel ? (
                          <div className="my-4 text-center text-xs text-slate-500">
                            {formatDate(message.createdAt)}
                          </div>
                        ) : null}
                        <div className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                          <div
                            className={`relative max-w-[78%] rounded-2xl px-3 py-2 shadow-sm ${
                              isMine
                                ? "rounded-br-sm bg-[#0077b6] text-white"
                                : "rounded-bl-sm bg-white text-slate-900"
                            }`}
                          >
                            {!isMine ? (
                              <p className="mb-1 text-[11px] font-semibold text-slate-500">
                                {message.sender?.firstName || getParticipantName(message.senderId)}
                              </p>
                            ) : null}

                            {message.text ? (
                              (() => {
                                const links = extractLinks(message.text);
                                const hasLinks = links.length > 0;
                                return (
                                  <div className="whitespace-pre-wrap break-words text-sm leading-relaxed flex flex-col gap-1">
                                    <span className="flex-1">{renderTextWithLinks(message.text, isMine)}</span>
                                    {hasLinks ? (
                                      <button
                                        onClick={() => void copyText(links.join(" "))}
                                        className="w-fit text-[10px] text-slate-400 hover:text-slate-700 flex items-center gap-1"
                                        title="Copy link"
                                      >
                                        <Clipboard className="h-3 w-3" />
                                        Copy link
                                      </button>
                                    ) : null}
                                  </div>
                                );
                              })()
                            ) : null}

                            {message.attachments?.length ? (
                              <div className="mt-2 space-y-2">
                                {message.attachments.map((attachment) => {
                                  const isImage = attachment.type === "image";
                                  const url = resolveAttachmentUrl(attachment.url);
                                  return isImage ? (
                                    <a
                                      key={attachment.id}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="block overflow-hidden rounded-lg border border-slate-200 bg-slate-50"
                                    >
                                      <img
                                        src={url}
                                        alt={attachment.fileName || "Image"}
                                        className="max-h-60 w-full object-cover"
                                      />
                                    </a>
                                  ) : (
                                    <a
                                      key={attachment.id}
                                      href={url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                                        isMine
                                          ? "bg-white/20 text-white"
                                          : "bg-slate-100 text-slate-700"
                                      }`}
                                    >
                                      <Paperclip className="h-3.5 w-3.5" />
                                      <span className="truncate">{attachment.fileName || "File"}</span>
                                    </a>
                                  );
                                })}
                              </div>
                            ) : null}

                            <div
                              className={`mt-1 text-right text-[11px] ${
                                isMine ? "text-white/80" : "text-slate-500"
                              }`}
                            >
                              {formatTime(message.createdAt)}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            <footer className="border-t border-slate-200 bg-white px-4 py-3">
              {selectedFiles.length > 0 ? (
                <div className="mb-2 flex flex-wrap gap-2">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-700"
                    >
                      <span className="max-w-[180px] truncate">{file.name}</span>
                      <button onClick={() => removeFile(index)} className="text-slate-500 hover:text-slate-800">
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="relative">
                {showEmojiMenu ? (
                  <div className="absolute bottom-12 left-0 z-20 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
                    <EmojiPicker
                      lazyLoadEmojis
                      width={320}
                      height={380}
                      onEmojiClick={(emojiData: EmojiClickData) => {
                        setComposerText((prev) => `${prev}${emojiData.emoji}`);
                      }}
                    />
                  </div>
                ) : null}

                <div className="flex items-end gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <button
                    onClick={() => setShowEmojiMenu((prev) => !prev)}
                    className="mb-1 text-slate-500 hover:text-slate-800"
                  >
                    <Smile className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="mb-1 text-slate-500 hover:text-slate-800"
                  >
                    <Paperclip className="h-5 w-5" />
                  </button>

                  <button
                    onClick={() => imageInputRef.current?.click()}
                    className="mb-1 text-slate-500 hover:text-slate-800"
                  >
                    <ImageIcon className="h-5 w-5" />
                  </button>

                  <textarea
                    rows={1}
                    value={composerText}
                    onChange={(event) => setComposerText(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        sendMessage();
                      }
                    }}
                    placeholder="Type a message..."
                    className="max-h-32 min-h-[26px] flex-1 resize-y bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                  />

                  <button
                    onClick={sendMessage}
                    disabled={sending || (!composerText.trim() && selectedFiles.length === 0)}
                    className="rounded-md bg-[#0077b6] p-2 text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  onChange={onPickFiles}
                  className="hidden"
                />
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={onPickFiles}
                  className="hidden"
                />
              </div>
            </footer>
            {showScrollToBottom ? (
              <button
                onClick={() => scrollToBottom("smooth")}
                className="absolute bottom-24 right-6 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-[#0077b6] text-white shadow-lg hover:bg-[#005f91]"
                aria-label="Go to bottom"
                title="Go to latest message"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            ) : null}
          </>
        )}
      </section>

      {showNewChatModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-[#0077b6] to-[#0096c7] px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">New Chat</h3>
                  <p className="text-xs text-white/80">Choose a teammate to start messaging</p>
                </div>
                <button onClick={() => setShowNewChatModal(false)}>
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
            <div className="p-4">
              <input
                value={participantFilter}
                onChange={(event) => setParticipantFilter(event.target.value)}
                placeholder="Search employees"
                className="mb-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#0077b6]"
              />
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {filteredEmployees.map((employee) => (
                  <button
                    key={employee.id}
                    onClick={() => openDirectChat(employee.userId)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-left transition hover:border-[#0077b6] hover:bg-[#f2f9fd]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e6f4fa] text-sm font-semibold text-[#0077b6]">
                        {(employee.firstName?.[0] || "U").toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {`${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
                            "Unknown"}
                        </p>
                        <p className="truncate text-xs text-slate-500">{employee.workEmail}</p>
                      </div>
                    </div>
                  </button>
                ))}
                {filteredEmployees.length === 0 ? (
                  <p className="text-sm text-slate-500">No employees found</p>
                ) : null}
              </div>
            </div>
            <div className="border-t border-slate-100 px-4 py-3 text-right">
              <button
                onClick={() => setShowNewChatModal(false)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {meetingOpen && !meetingMinimized ? (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm">
          <div className="absolute inset-0 flex items-center justify-center px-4 py-8">
            <div className="flex w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Live Meeting</p>
                  <p className="text-[11px] text-slate-500">Room: {roomName}</p>
                  {meetingError ? <p className="text-[11px] text-rose-600">{meetingError}</p> : null}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMeetingMinimized(true)}
                    className="flex h-9 px-3 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 text-xs font-semibold"
                  >
                    Minimize
                  </button>
                  <button
                    onClick={closeMeeting}
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="relative h-[75vh] bg-slate-50">
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/60 via-black/20 to-transparent z-10" />
                <div
                  ref={jitsiContainerRef}
                  className="relative z-20 h-full w-full rounded-b-2xl overflow-hidden bg-black"
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {meetingOpen && meetingMinimized ? (
        <div className="pointer-events-auto fixed bottom-4 right-4 z-[70] w-80 h-48 rounded-xl shadow-2xl border border-slate-200 overflow-hidden bg-white">
          <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 bg-white">
            <p className="text-xs font-semibold text-slate-800 truncate">Live Meeting</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setMeetingMinimized(false)}
                className="h-7 px-2 rounded-full bg-slate-100 text-xs font-semibold text-slate-700 hover:bg-slate-200"
              >
                Restore
              </button>
              <button
                onClick={closeMeeting}
                className="h-7 w-7 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div className="relative h-[calc(100%-42px)] bg-black">
            <div ref={jitsiContainerRef} className="absolute inset-0 z-20 rounded-b-xl overflow-hidden bg-black" />
          </div>
        </div>
      ) : null}

      {showGroupModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="bg-gradient-to-r from-[#0077b6] to-[#0096c7] px-4 py-3 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Create Group</h3>
                  <p className="text-xs text-white/80">Name your group and pick members</p>
                </div>
                <button onClick={() => setShowGroupModal(false)}>
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Group Name
                </label>
                <span className="rounded-full bg-[#e6f4fa] px-2 py-0.5 text-xs font-medium text-[#0077b6]">
                  {groupMembers.length} selected
                </span>
              </div>

              <input
                value={groupTitle}
                onChange={(event) => setGroupTitle(event.target.value)}
                placeholder="Eg. Engineering Team"
                className="mb-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#0077b6]"
              />

              <input
                value={participantFilter}
                onChange={(event) => setParticipantFilter(event.target.value)}
                placeholder="Search members"
                className="mb-3 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-[#0077b6]"
              />

              <div className="max-h-64 space-y-2 overflow-y-auto">
                {filteredEmployees.map((employee) => {
                  const checked = groupMembers.includes(employee.userId);
                  return (
                    <label
                      key={employee.id}
                      className={`flex cursor-pointer items-center justify-between rounded-xl border px-3 py-2 transition ${
                        checked
                          ? "border-[#0077b6] bg-[#e6f4fa]"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#0077b6]">
                          {(employee.firstName?.[0] || "U").toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            {`${employee.firstName || ""} ${employee.lastName || ""}`.trim() ||
                              "Unknown"}
                          </p>
                          <p className="text-xs text-slate-500">{employee.workEmail}</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleGroupMember(employee.userId)}
                      />
                    </label>
                  );
                })}
              </div>
              <div className="mt-4 flex justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  onClick={() => setShowGroupModal(false)}
                  className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  onClick={createGroup}
                  className="rounded-lg bg-[#0077b6] px-3 py-2 text-sm text-white hover:bg-[#005f91]"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* Jitsi opens in a new tab; no embedded modal */}
    </div>
  );
}
