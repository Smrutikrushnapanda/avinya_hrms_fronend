export type ConversationParticipant = {
  userId: string;
  firstName?: string;
  lastName?: string;
};

export type ChatAttachment = {
  id: string;
  url: string;
  fileName?: string;
  mimeType?: string;
  fileSize?: number;
  type: "image" | "file";
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  text?: string;
  createdAt: string;
  readByAll?: boolean;
  pending?: boolean;
  failed?: boolean;
  clientMessageId?: string;
  attachments?: ChatAttachment[];
  sender?: {
    id?: string;
    firstName?: string;
    lastName?: string;
  };
};

export type Conversation = {
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

export type Employee = {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  workEmail?: string;
  photoUrl?: string;
  designation?: { name?: string };
  designationName?: string;
};

export type PresencePayload = {
  userId?: string;
  status?: "online" | "offline";
};

export type ChatSocketPayload = {
  conversationId?: string;
  message?: Partial<ChatMessage>;
};

export type ProfileLike = {
  id?: string;
  userId?: string;
  organizationId?: string;
  firstName?: string;
  lastName?: string;
};
