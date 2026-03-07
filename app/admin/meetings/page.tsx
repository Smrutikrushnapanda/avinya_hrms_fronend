"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays,
  Plus,
  Trash2,
  Loader2,
  Users,
  Send,
  Video,
  Clock,
  X,
  Link,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  getProfile,
  getEmployees,
  createMeeting,
  getMeetingsByOrg,
  deleteMeeting,
  sendMeetingNotification,
} from "@/app/api/api";
import { format } from "date-fns";

// ------- Types -------
interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  notificationSent: boolean;
  meetingLink?: string | null;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
  participants?: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
}

interface Employee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
}

// ------- Loading Skeleton -------
function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-7" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ------- Main Component -------
export default function MeetingManagementPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Meetings state
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  
  // Employees for selecting participants
  const [employees, setEmployees] = useState<Employee[]>([]);
  
  // Create dialog state
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    description: "",
    scheduledDate: "",
    scheduledTime: "",
    durationMinutes: "30",
    participantIds: [] as string[],
  });
  const [creating, setCreating] = useState(false);
  
  // Delete/Notify state
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // ------- Fetch profile -------
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        setProfile(res.data);
      } catch (error: any) {
        console.error("Failed to fetch profile:", error);
        toast.error("Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ------- Fetch employees -------
  const fetchEmployees = useCallback(async () => {
    if (!profile?.organizationId) return;
    try {
      const res = await getEmployees(profile.organizationId);
      const data = res.data?.data || res.data || [];
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to fetch employees:", error);
    }
  }, [profile?.organizationId]);

  // ------- Fetch meetings -------
  const fetchMeetings = useCallback(async () => {
    if (!profile?.organizationId) return;
    setMeetingsLoading(true);
    try {
      const res = await getMeetingsByOrg(profile.organizationId);
      const data = res.data || [];
      setMeetings(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to fetch meetings:", error);
      toast.error("Failed to load meetings");
    } finally {
      setMeetingsLoading(false);
    }
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!profile) return;
    fetchEmployees();
    fetchMeetings();
  }, [profile, fetchEmployees, fetchMeetings]);

  // ------- Create meeting -------
  const handleCreateMeeting = async () => {
    if (!meetingForm.title.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }
    if (!meetingForm.scheduledDate || !meetingForm.scheduledTime) {
      toast.error("Please select date and time");
      return;
    }
    if (!profile?.organizationId || !profile?.userId) {
      toast.error("Profile not loaded");
      return;
    }

    setCreating(true);
    try {
      const scheduledAt = new Date(
        `${meetingForm.scheduledDate}T${meetingForm.scheduledTime}`
      ).toISOString();

      await createMeeting({
        title: meetingForm.title.trim(),
        description: meetingForm.description.trim() || undefined,
        scheduledAt,
        durationMinutes: parseInt(meetingForm.durationMinutes) || 30,
        participantIds: meetingForm.participantIds,
        organizationId: profile.organizationId,
        createdById: profile.userId,
      });

      toast.success("Meeting scheduled successfully");
      setCreateDialogOpen(false);
      setMeetingForm({
        title: "",
        description: "",
        scheduledDate: "",
        scheduledTime: "",
        durationMinutes: "30",
        participantIds: [],
      });
      fetchMeetings();
    } catch (error: any) {
      console.error("Create meeting failed:", error);
      toast.error(error?.response?.data?.message || "Failed to create meeting");
    } finally {
      setCreating(false);
    }
  };

  // ------- Delete meeting -------
  const handleDeleteMeeting = async (id: string) => {
    if (!confirm("Are you sure you want to delete this meeting?")) return;
    
    setActionLoading(id);
    try {
      await deleteMeeting(id);
      toast.success("Meeting deleted");
      fetchMeetings();
    } catch (error: any) {
      console.error("Delete meeting failed:", error);
      toast.error("Failed to delete meeting");
    } finally {
      setActionLoading(null);
    }
  };

  // ------- Send notification -------
  const handleSendNotification = async (id: string) => {
    setActionLoading(id);
    try {
      await sendMeetingNotification(id);
      toast.success("Notification sent to all participants");
      fetchMeetings();
    } catch (error: any) {
      console.error("Send notification failed:", error);
      toast.error("Failed to send notification");
    } finally {
      setActionLoading(null);
    }
  };

  // ------- Get status badge -------
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SCHEDULED":
        return <Badge className="bg-blue-100 text-blue-700">Scheduled</Badge>;
      case "IN_PROGRESS":
        return <Badge className="bg-green-100 text-green-700">In Progress</Badge>;
      case "COMPLETED":
        return <Badge className="bg-gray-100 text-gray-700">Completed</Badge>;
      case "CANCELLED":
        return <Badge className="bg-red-100 text-red-700">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  // ------- Format meeting time -------
  const formatMeetingTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return format(date, "MMM dd, yyyy 'at' hh:mm a");
    } catch {
      return dateStr;
    }
  };

  // ------- Toggle participant selection -------
  const toggleParticipant = (userId: string) => {
    setMeetingForm((prev) => ({
      ...prev,
      participantIds: prev.participantIds.includes(userId)
        ? prev.participantIds.filter((id) => id !== userId)
        : [...prev.participantIds, userId],
    }));
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Meeting Management</h1>
            <p className="text-xs text-muted-foreground">
              Schedule meetings and notify participants
            </p>
          </div>
        </div>
        <Button className="gap-2" onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          Schedule Meeting
        </Button>
      </div>

      {/* Meetings List */}
      {meetingsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <Card className="p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <CalendarDays className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                No Meetings Scheduled
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                Schedule a meeting to notify specific employees at the scheduled time.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {meetings.map((meeting) => (
            <Card key={meeting.id} className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-blue-500" />
                    <h3 className="font-semibold">{meeting.title}</h3>
                  </div>
                  {getStatusBadge(meeting.status)}
                </div>

                {meeting.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {meeting.description}
                  </p>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>{formatMeetingTime(meeting.scheduledAt)}</span>
                  <span className="text-xs">({meeting.durationMinutes} min)</span>
                </div>

                {meeting.participants && meeting.participants.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{meeting.participants.length} participants</span>
                  </div>
                )}

                {meeting.meetingLink && (
                  <a
                    href={meeting.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-xs text-blue-600 dark:text-blue-400 hover:underline w-fit"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Link className="h-3.5 w-3.5" />
                    Join Meeting
                  </a>
                )}

                <Separator />

                <div className="flex items-center justify-between">
                  {meeting.notificationSent ? (
                    <Badge variant="outline" className="text-xs">
                      Notification Sent
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                      Pending Notification
                    </Badge>
                  )}
                  
                  <div className="flex gap-1">
                    {!meeting.notificationSent && meeting.status === "SCHEDULED" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSendNotification(meeting.id)}
                        disabled={actionLoading === meeting.id}
                        className="h-8 gap-1"
                      >
                        {actionLoading === meeting.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Send className="h-3 w-3" />
                        )}
                        Notify
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteMeeting(meeting.id)}
                      disabled={actionLoading === meeting.id}
                      className="h-8 gap-1"
                    >
                      {actionLoading === meeting.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Meeting Dialog */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) {
            setMeetingForm({
              title: "",
              description: "",
              scheduledDate: "",
              scheduledTime: "",
              durationMinutes: "30",
              participantIds: [],
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>
              Create a meeting and select participants to notify.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Meeting Title *</Label>
              <Input
                placeholder="e.g. Team Standup"
                value={meetingForm.title}
                onChange={(e) =>
                  setMeetingForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                placeholder="Meeting agenda or notes"
                value={meetingForm.description}
                onChange={(e) =>
                  setMeetingForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Date *</Label>
                <Input
                  type="date"
                  value={meetingForm.scheduledDate}
                  onChange={(e) =>
                    setMeetingForm((prev) => ({ ...prev, scheduledDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Time *</Label>
                <Input
                  type="time"
                  value={meetingForm.scheduledTime}
                  onChange={(e) =>
                    setMeetingForm((prev) => ({ ...prev, scheduledTime: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Duration (minutes)</Label>
              <Select
                value={meetingForm.durationMinutes}
                onValueChange={(value) =>
                  setMeetingForm((prev) => ({ ...prev, durationMinutes: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">1 hour</SelectItem>
                  <SelectItem value="90">1.5 hours</SelectItem>
                  <SelectItem value="120">2 hours</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Select Participants</Label>
              <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
                {employees.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">
                    No employees found
                  </p>
                ) : (
                  employees.map((emp) => (
                    <div
                      key={emp.userId}
                      className="flex items-center gap-2 p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => toggleParticipant(emp.userId)}
                    >
                      <input
                        type="checkbox"
                        checked={meetingForm.participantIds.includes(emp.userId)}
                        onChange={() => {}}
                        className="h-4 w-4"
                      />
                      <span className="text-sm">
                        {emp.firstName} {emp.lastName}
                      </span>
                    </div>
                  ))
                )}
              </div>
              {meetingForm.participantIds.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  {meetingForm.participantIds.length} participant(s) selected
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateMeeting}
              disabled={creating}
              className="gap-2"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Schedule Meeting
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

