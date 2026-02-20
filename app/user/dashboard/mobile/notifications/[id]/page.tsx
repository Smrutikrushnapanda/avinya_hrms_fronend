"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getInboxMessages, markMessageRead } from "@/app/api/api";
import MobileTabHeader from "../../components/MobileTabHeader";
// import MobileTabHeader from "../../components/MobileTabHeader";

type MessageItem = {
  id: string;
  title: string;
  body: string;
  sentAt?: string;
  status?: "UNREAD" | "READ";
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

export default function MobileNotificationDetailPage() {
  const params = useParams();
  const router = useRouter();

  const messageId = Array.isArray(params?.id) ? params?.id[0] : params?.id;
  const [message, setMessage] = useState<MessageItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMessage = async () => {
      try {
        setLoading(true);
        const res = await getInboxMessages();
        const list = Array.isArray(res.data) ? res.data : [];
        const found = list.find((m: any) => m.id === messageId);
        if (found) {
          setMessage(found);
          if (found.status === "UNREAD") {
            try {
              await markMessageRead(found.id);
            } catch {
              // ignore
            }
          }
        }
      } catch (error) {
        console.error("Failed to load notification:", error);
      } finally {
        setLoading(false);
      }
    };

    if (messageId) fetchMessage();
  }, [messageId]);

  const initials = "HR";
  const subtitle = "Admin message";

  return (
    <div className="min-h-screen bg-white">
      <MobileTabHeader
        title="Notification Detail"
        backHref="/user/dashboard/mobile/notifications"
        // showBackLabel
        showBell={false}
      />
      <div className="-mt-13 px-5 pb-24">
        <div className="bg-white rounded-2xl p-5 shadow-md border border-gray-100">
          {loading ? (
            <p className="text-sm text-gray-500">Loading notification...</p>
          ) : !message ? (
            <p className="text-sm text-gray-500">Notification not found.</p>
          ) : (
            <div className="pt-2">
              {/* Header Row: Avatar, Title/Subtitle, Time */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-[#0077B6] text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-semibold text-gray-900 truncate">
                    {message.title}
                  </p>
                  <p className="text-sm text-gray-600">{subtitle}</p>
                </div>
                <p className="text-xs text-gray-400 flex-shrink-0">
                  {formatDateTime(message.sentAt)}
                </p>
              </div>

              {/* Message Body */}
              <div className="pt-4 border-t border-gray-100">
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-6">
                  {message.body}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
