/**
 * Persistent offline outbox for chat sends (web).
 *
 * Mirrors the mobile app's outbox: a send is recorded here before the
 * network call starts, keyed by a client-generated id the backend also
 * stores (`clientMessageId`), so a retry after a dropped response reuses
 * the same id and the server recognizes it instead of creating a
 * duplicate message.
 *
 * File blobs can't be persisted to localStorage and don't survive a page
 * reload, so they're kept in an in-memory map for the current session only.
 * An entry that still needs attachments after a reload has no blob to
 * resend — `getPendingFiles` returns an empty array for it, and the caller
 * surfaces that as a failed send rather than silently retrying with
 * nothing attached.
 */

export interface OutboxAttachmentMeta {
  name: string;
  mimeType: string;
  size: number;
}

export interface OutboxEntry {
  clientMessageId: string;
  conversationId: string;
  text: string | null;
  attachments: OutboxAttachmentMeta[];
  attempt: number;
  nextRetryAt: number;
  createdAt: string;
}

const OUTBOX_KEY = "chat_outbox_v1";
export const MAX_SEND_ATTEMPTS = 8;
const BASE_BACKOFF_MS = 3000;
const MAX_BACKOFF_MS = 60000;

const pendingFiles = new Map<string, File[]>();

export const generateClientMessageId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

export const getBackoffMs = (attempt: number) =>
  Math.min(BASE_BACKOFF_MS * 2 ** Math.max(0, attempt - 1), MAX_BACKOFF_MS);

function readOutbox(): OutboxEntry[] {
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeOutbox(entries: OutboxEntry[]) {
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(entries));
  } catch {
    // storage full/unavailable — the in-memory pending bubble still shows,
    // it just won't survive a reload
  }
}

export function loadOutboxForConversation(conversationId: string) {
  return readOutbox().filter((e) => e.conversationId === conversationId);
}

export function addOutboxEntry(entry: OutboxEntry, files: File[]) {
  if (files.length) pendingFiles.set(entry.clientMessageId, files);
  const all = readOutbox();
  writeOutbox([
    ...all.filter((e) => e.clientMessageId !== entry.clientMessageId),
    entry,
  ]);
}

export function removeOutboxEntry(clientMessageId: string) {
  pendingFiles.delete(clientMessageId);
  const all = readOutbox();
  writeOutbox(all.filter((e) => e.clientMessageId !== clientMessageId));
}

export function updateOutboxEntry(
  clientMessageId: string,
  patch: Partial<OutboxEntry>
) {
  const all = readOutbox();
  writeOutbox(
    all.map((e) =>
      e.clientMessageId === clientMessageId ? { ...e, ...patch } : e
    )
  );
}

export function getPendingFiles(clientMessageId: string): File[] {
  return pendingFiles.get(clientMessageId) || [];
}
