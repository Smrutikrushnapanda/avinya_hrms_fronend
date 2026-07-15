import { ChatMessage, ChatAttachment, Conversation, ConversationParticipant, Employee } from "@/types/chat";
import { apiBaseURL } from "@/app/api/api";

export const formatTime = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

export const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
};

export const formatChatTime = (dateString?: string) => {
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

export const normalizeSystemText = (text?: string) => (text || "").trim().toLowerCase();

export const getMeetingSystemLabel = (text?: string) => {
  const normalized = normalizeSystemText(text);
  if (normalized === "meeting started" || normalized === "you entered") return "You entered";
  if (normalized === "meeting ended" || normalized === "you left") return "You left";
  return null;
};

export const extractMeetingUrlFromText = (text?: string) => {
  if (!text) return null;
  const match = text.match(/Join meeting:\s*(https?:\/\/\S+)/i);
  if (!match?.[1]) return null;
  return match[1].trim();
};

export const resolveAttachmentUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) return url;
  return `${apiBaseURL}${url.startsWith("/") ? "" : "/"}${url}`;
};

export const toChatAttachment = (item: any): ChatAttachment => ({
  id: item?.id || "",
  url: item?.url || "",
  fileName: item?.fileName,
  mimeType: item?.mimeType,
  fileSize: item?.fileSize,
  type: item?.type === "image" ? "image" : "file",
});

export const toChatMessage = (item: any): ChatMessage => ({
  id: item?.id || "",
  conversationId: item?.conversationId || "",
  senderId: item?.senderId || "",
  text: item?.text || "",
  createdAt: item?.createdAt || new Date().toISOString(),
  readByAll: Boolean(item?.readByAll),
  pending: Boolean(item?.pending),
  failed: Boolean(item?.failed),
  clientMessageId: item?.clientMessageId || undefined,
  attachments: Array.isArray(item?.attachments)
    ? item.attachments.filter((a: any) => a?.id && a?.url).map(toChatAttachment)
    : [],
  sender: item?.sender || undefined,
});

export const toConversation = (input: any): Conversation | null => {
  if (!input || typeof input !== "object") return null;
  if (!input.id) return null;
  return {
    id: input.id,
    type: input.type === "GROUP" ? "GROUP" : "DIRECT",
    title: input.title || "",
    participants: Array.isArray(input.participants)
      ? input.participants
          .filter((p: any) => typeof p?.userId === "string")
          .map((p: any) => ({
            userId: p.userId,
            firstName: p.firstName || "",
            lastName: p.lastName || "",
          }))
      : [],
    lastMessage: input.lastMessage
      ? {
          id: input.lastMessage.id,
          text: input.lastMessage.text || "",
          senderId: input.lastMessage.senderId,
          createdAt: input.lastMessage.createdAt,
          attachments: Array.isArray(input.lastMessage.attachments)
            ? input.lastMessage.attachments.filter((a: any) => a?.id && a?.url).map(toChatAttachment)
            : [],
        }
      : null,
    unreadCount: Number(input.unreadCount || 0),
    updatedAt: input.updatedAt || input.lastMessage?.createdAt || new Date().toISOString(),
  };
};

export const normalizeEmployee = (input: any): Employee | null => {
  if (!input || typeof input !== "object") return null;
  if (!input.id || !input.userId) return null;
  return {
    id: input.id,
    userId: input.userId,
    firstName: input.firstName || "",
    lastName: input.lastName || "",
    workEmail: input.workEmail || "",
    photoUrl: input.photoUrl || "",
    designation: input.designation,
    designationName: input.designationName,
  };
};

export const sortMessages = (messages: ChatMessage[]) =>
  [...messages].sort(
    (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime(),
  );

export const getErrorMessage = (error: any, fallback: string) =>
  (error as any)?.response?.data?.message || fallback;
