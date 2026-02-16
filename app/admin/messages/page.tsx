"use client";

import { useState, useEffect, useCallback } from "react";
import {
  MessageSquare,
  Send,
  Inbox,
  Search,
  Mail,
  MailOpen,
  Clock,
  Plus,
  X,
  Check,
  ChevronDown,
  RefreshCw,
  User,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getProfile,
  getEmployees,
  getInboxMessages,
  markMessageRead,
  createMessage,
} from "@/app/api/api";
import { toast } from "sonner";
import { format } from "date-fns";

interface MessageItem {
  id: string;
  title: string;
  body: string;
  type: string;
  sentAt: string;
  status: "UNREAD" | "READ";
  readAt: string | null;
  senderUserId: string;
}

interface Employee {
  id: string;
  userId: string;
  firstName: string;
  lastName?: string;
  workEmail?: string;
}

export default function AdminMessagesPage() {
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedMessage, setSelectedMessage] = useState<MessageItem | null>(null);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [search, setSearch] = useState("");

  // Compose state
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeForm, setComposeForm] = useState({ title: "", body: "" });
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [sending, setSending] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [profileRes, inboxRes] = await Promise.all([
        getProfile(),
        getInboxMessages(),
      ]);
      setUserProfile(profileRes.data);
      setMessages(Array.isArray(inboxRes.data) ? inboxRes.data : []);

      if (profileRes.data?.organizationId) {
        const empRes = await getEmployees(profileRes.data.organizationId);
        const empList = empRes.data?.employees || empRes.data || [];
        setEmployees(Array.isArray(empList) ? empList : []);
      }
    } catch (err) {
      console.error("Failed to load messages:", err);
      toast.error("Failed to load messages");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleMarkRead = async (msg: MessageItem) => {
    if (msg.status === "READ") return;
    try {
      await markMessageRead(msg.id);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, status: "READ", readAt: new Date().toISOString() } : m
        )
      );
    } catch {
      // silent
    }
  };

  const handleSelectMessage = (msg: MessageItem) => {
    setSelectedMessage(msg);
    handleMarkRead(msg);
  };

  const handleSendMessage = async () => {
    if (!userProfile?.organizationId) {
      toast.error("Organization not found");
      return;
    }
    if (!composeForm.title.trim() || !composeForm.body.trim()) {
      toast.error("Title and message are required");
      return;
    }
    if (selectedRecipients.length === 0) {
      toast.error("Select at least one recipient");
      return;
    }

    const recipientUserIds = employees
      .filter((emp) => selectedRecipients.includes(emp.id))
      .map((emp) => emp.userId)
      .filter(Boolean);

    if (recipientUserIds.length === 0) {
      toast.error("No valid recipients found");
      return;
    }

    setSending(true);
    try {
      await createMessage({
        organizationId: userProfile.organizationId,
        recipientUserIds,
        title: composeForm.title.trim(),
        body: composeForm.body.trim(),
        type: "admin",
      });
      toast.success("Message sent successfully");
      setComposeOpen(false);
      setComposeForm({ title: "", body: "" });
      setSelectedRecipients([]);
      setRecipientSearch("");
      fetchData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  const toggleRecipient = (empId: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(empId) ? prev.filter((id) => id !== empId) : [...prev, empId]
    );
  };

  const selectAllRecipients = () => {
    if (selectedRecipients.length === employees.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(employees.map((e) => e.id));
    }
  };

  const filteredMessages = messages.filter((msg) => {
    if (filter === "unread" && msg.status !== "UNREAD") return false;
    if (filter === "read" && msg.status !== "READ") return false;
    if (search.trim()) {
      const s = search.toLowerCase();
      return (
        msg.title.toLowerCase().includes(s) ||
        msg.body.toLowerCase().includes(s)
      );
    }
    return true;
  });

  const filteredEmployees = employees.filter((emp) => {
    if (!recipientSearch.trim()) return true;
    const s = recipientSearch.toLowerCase();
    const name = `${emp.firstName} ${emp.lastName || ""}`.toLowerCase();
    return name.includes(s) || (emp.workEmail || "").toLowerCase().includes(s);
  });

  const unreadCount = messages.filter((m) => m.status === "UNREAD").length;

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), "MMM d, yyyy h:mm a");
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
          <div className="lg:col-span-2">
            <Skeleton className="h-96 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <MessageSquare className="w-6 h-6" />
            Messages
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Send and receive messages across your organization
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => setComposeOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Compose Message
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("all")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-blue-50 dark:bg-blue-900/20">
              <Inbox className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{messages.length}</p>
              <p className="text-xs text-gray-500">Total Messages</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("unread")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-orange-50 dark:bg-orange-900/20">
              <Mail className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{unreadCount}</p>
              <p className="text-xs text-gray-500">Unread</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFilter("read")}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-full bg-green-50 dark:bg-green-900/20">
              <MailOpen className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{messages.length - unreadCount}</p>
              <p className="text-xs text-gray-500">Read</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Message List */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {filter === "all" ? "All Messages" : filter === "unread" ? "Unread" : "Read"}
                {filter !== "all" && (
                  <Button variant="ghost" size="sm" className="ml-2 h-6 px-2 text-xs" onClick={() => setFilter("all")}>
                    Clear
                  </Button>
                )}
              </CardTitle>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search messages..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[500px]">
              {filteredMessages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                  <Inbox className="w-12 h-12 mb-3" />
                  <p className="text-sm font-medium">No messages found</p>
                </div>
              ) : (
                filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => handleSelectMessage(msg)}
                    className={`px-4 py-3 border-b cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 ${
                      selectedMessage?.id === msg.id
                        ? "bg-blue-50 dark:bg-blue-900/20 border-l-2 border-l-blue-600"
                        : ""
                    } ${msg.status === "UNREAD" ? "bg-white dark:bg-gray-900" : "bg-gray-50/50 dark:bg-gray-800/50"}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {msg.status === "UNREAD" ? (
                          <Mail className="w-4 h-4 text-blue-600" />
                        ) : (
                          <MailOpen className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-sm truncate ${msg.status === "UNREAD" ? "font-semibold text-gray-900 dark:text-gray-100" : "text-gray-600 dark:text-gray-400"}`}>
                            {msg.title}
                          </p>
                          {msg.status === "UNREAD" && (
                            <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate mt-0.5">{msg.body}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-400">{formatDate(msg.sentAt)}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">
                            {msg.type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Detail */}
        <Card className="lg:col-span-2">
          {selectedMessage ? (
            <>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{selectedMessage.title}</CardTitle>
                    <div className="flex items-center gap-3 mt-2">
                      <Badge variant={selectedMessage.status === "UNREAD" ? "default" : "secondary"}>
                        {selectedMessage.status}
                      </Badge>
                      <Badge variant="outline">{selectedMessage.type}</Badge>
                      <span className="text-sm text-gray-500">
                        {formatDate(selectedMessage.sentAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {selectedMessage.body}
                  </p>
                </div>
                {selectedMessage.readAt && (
                  <p className="text-xs text-gray-400 mt-6 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Read at {formatDate(selectedMessage.readAt)}
                  </p>
                )}
              </CardContent>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-[500px] text-gray-400">
              <MessageSquare className="w-16 h-16 mb-4" />
              <p className="text-lg font-medium">Select a message to read</p>
              <p className="text-sm mt-1">Choose a message from the list or compose a new one</p>
              <Button className="mt-4" onClick={() => setComposeOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Compose Message
              </Button>
            </CardContent>
          )}
        </Card>
      </div>

      {/* Compose Dialog */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              Compose Message
            </DialogTitle>
            <DialogDescription>
              Send a message to one or more employees in your organization.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Recipients */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Recipients *</Label>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAllRecipients}>
                  {selectedRecipients.length === employees.length ? "Deselect All" : "Select All"}
                </Button>
              </div>

              {selectedRecipients.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 border rounded-md bg-gray-50 dark:bg-gray-800 max-h-24 overflow-y-auto">
                  {selectedRecipients.map((empId) => {
                    const emp = employees.find((e) => e.id === empId);
                    if (!emp) return null;
                    return (
                      <Badge key={empId} variant="secondary" className="gap-1 pr-1">
                        {`${emp.firstName} ${emp.lastName || ""}`.trim()}
                        <button
                          onClick={() => toggleRecipient(empId)}
                          className="ml-1 rounded-full hover:bg-gray-300 dark:hover:bg-gray-600 p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search employees..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-36 border rounded-md">
                {filteredEmployees.length === 0 ? (
                  <div className="flex items-center justify-center h-full py-8 text-gray-400 text-sm">
                    No employees found
                  </div>
                ) : (
                  filteredEmployees.map((emp) => (
                    <div
                      key={emp.id}
                      onClick={() => toggleRecipient(emp.id)}
                      className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                        selectedRecipients.includes(emp.id) ? "bg-blue-50 dark:bg-blue-900/20" : ""
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                        selectedRecipients.includes(emp.id)
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-300"
                      }`}>
                        {selectedRecipients.includes(emp.id) && <Check className="w-3 h-3" />}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-xs font-medium">
                          {emp.firstName?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            {`${emp.firstName} ${emp.lastName || ""}`.trim()}
                          </p>
                          {emp.workEmail && (
                            <p className="text-xs text-gray-500">{emp.workEmail}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </ScrollArea>
              <p className="text-xs text-gray-500">
                {selectedRecipients.length} recipient{selectedRecipients.length !== 1 ? "s" : ""} selected
              </p>
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="msg-title">Title *</Label>
              <Input
                id="msg-title"
                value={composeForm.title}
                onChange={(e) => setComposeForm({ ...composeForm, title: e.target.value })}
                placeholder="Enter message title"
              />
            </div>

            {/* Body */}
            <div className="space-y-2">
              <Label htmlFor="msg-body">Message *</Label>
              <Textarea
                id="msg-body"
                value={composeForm.body}
                onChange={(e) => setComposeForm({ ...composeForm, body: e.target.value })}
                placeholder="Write your message here..."
                className="min-h-[140px] resize-none"
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setComposeOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={
                sending ||
                !composeForm.title.trim() ||
                !composeForm.body.trim() ||
                selectedRecipients.length === 0
              }
            >
              {sending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Message
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
