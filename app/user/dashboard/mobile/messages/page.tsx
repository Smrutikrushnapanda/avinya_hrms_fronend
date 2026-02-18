"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, ArrowLeft, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { getProfile, getInboxMessages } from "@/app/api/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface Message {
  id: string;
  title: string;
  body: string;
  senderName: string;
  createdAt: string;
  isRead: boolean;
}

export default function MobileMessagesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const messagesRes = await getInboxMessages();
        const data = messagesRes.data;
        
        if (Array.isArray(data)) {
          setMessages(data.slice(0, 10)); // Show last 10 messages
        } else if (data?.results) {
          setMessages(data.results.slice(0, 10));
        }
      } catch (error) {
        console.error("Error fetching messages:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#0077b6] text-white px-4 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/user/dashboard/mobile")}>
            <ArrowLeft className="w-5 h-5 text-white" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Messages</h2>
          </div>
        </div>
        <Bell className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Inbox</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No messages yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {messages.map((message) => (
                  <div 
                    key={message.id} 
                    className={`border rounded-lg p-3 cursor-pointer hover:bg-gray-50 ${
                      !message.isRead ? "bg-blue-50 border-blue-200" : ""
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{message.title}</p>
                          {!message.isRead && (
                            <Badge className="bg-blue-500 text-white text-xs">New</Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 line-clamp-1">{message.body}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {message.senderName} • {formatDate(message.createdAt)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

