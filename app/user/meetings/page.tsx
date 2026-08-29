"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Calendar1,
  CalendarDays,
  Clock,
  Users,
  Video,
  CheckCircle2,
  MessageSquareX,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
  Plus,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import {
  getProfile,
  getEmployees,
  createMeeting,
  getMeetingsForUser,
} from "@/app/api/api";
import { format, isPast, isToday, isTomorrow } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
}

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
    id: string;
    firstName: string;
    lastName: string;
  };
  participants?: Participant[];
}

interface Employee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email?: string;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-7" />
        <Skeleton className="h-8 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "SCHEDULED":
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          Scheduled
        </Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          In Progress
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
          Completed
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <MessageSquareX className="w-3 h-3 mr-1" />
          Cancelled
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}

// ─── Time label ────────────────────────────────────────────────────────────────

function MeetingTimeLabel({ dateStr }: { dateStr: string }) {
  const date = new Date(dateStr);
  if (isToday(date))
    return (
      <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">
        Today
      </span>
    );
  if (isTomorrow(date))
    return (
      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
        Tomorrow
      </span>
    );
  if (isPast(date))
    return (
      <span className="text-xs text-muted-foreground">
        {format(date, "MMM dd, yyyy")}
      </span>
    );
  return (
    <span className="text-xs text-muted-foreground">
      {format(date, "MMM dd, yyyy")}
    </span>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function MyMeetingsPage() {
  const [pageLoading, setPageLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  // ─── Schedule meeting state ──────────────────────────────────────────────
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [meetingForm, setMeetingForm] = useState({
    title: "",
    description: "",
    scheduledDate: "",
    scheduledTime: "",
    durationMinutes: "30",
    participantIds: [] as string[],
  });

  // ─── Copy link to clipboard ─────────────────────────────────────────────────
  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(link);
      toast.success("Meeting link copied to clipboard!");
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // ─── Fetch profile to get userId + organizationId ────────────────────────
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        setUserId(res.data?.userId || null);
        setOrganizationId(res.data?.organizationId || null);
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setPageLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ─── Fetch org employees for participant selection ──────────────────────
  const fetchEmployees = useCallback(async () => {
    if (!organizationId) return;
    try {
      const res = await getEmployees(organizationId);
      const data = res.data?.data || res.data || [];
      setEmployees(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load employees");
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) fetchEmployees();
  }, [organizationId, fetchEmployees]);

  // ─── Create meeting ──────────────────────────────────────────────────────
  const handleCreateMeeting = async () => {
    if (!meetingForm.title.trim()) {
      toast.error("Please enter a meeting title");
      return;
    }
    if (!meetingForm.scheduledDate || !meetingForm.scheduledTime) {
      toast.error("Please select date and time");
      return;
    }
    if (!organizationId || !userId) {
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
        organizationId,
        createdById: userId,
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
      toast.error(error?.response?.data?.message || "Failed to create meeting");
    } finally {
      setCreating(false);
    }
  };

  // ─── Toggle participant selection ───────────────────────────────────────
  const toggleParticipant = (empId: string) => {
    setMeetingForm((prev) => ({
      ...prev,
      participantIds: prev.participantIds.includes(empId)
        ? prev.participantIds.filter((id) => id !== empId)
        : [...prev.participantIds, empId],
    }));
  };

  // ─── Reset create form ───────────────────────────────────────────────────
  const resetMeetingForm = () =>
    setMeetingForm({
      title: "",
      description: "",
      scheduledDate: "",
      scheduledTime: "",
      durationMinutes: "30",
      participantIds: [],
    });

  // ─── Fetch meetings for this user ─────────────────────────────────────────
  const fetchMeetings = useCallback(async () => {
    if (!userId) return;
    setMeetingsLoading(true);
    try {
      const res = await getMeetingsForUser(userId);
      const data = res.data || [];
      setMeetings(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load meetings");
    } finally {
      setMeetingsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) fetchMeetings();
  }, [userId, fetchMeetings]);

  // ─── Split into upcoming and past ─────────────────────────────────────────
  const now = new Date();
  const upcomingMeetings = meetings.filter(
    (m) => new Date(m.scheduledAt) >= now && m.status !== "CANCELLED"
  );
  const pastMeetings = meetings.filter(
    (m) => new Date(m.scheduledAt) < now || m.status === "CANCELLED"
  );

  if (pageLoading) return <PageSkeleton />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Calendar1 className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">My Meetings</h1>
            <p className="text-xs text-muted-foreground">
              View and schedule meetings with your team
            </p>
          </div>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="gap-2"
          data-testid="schedule-meeting-open"
        >
          <Plus className="h-4 w-4" />
          Schedule Meeting
        </Button>
      </div>

      {meetingsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <Card className="p-10">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <CalendarDays className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">No Meetings Yet</h2>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                You have no meetings scheduled. You will appear here once an
                admin adds you as a participant.
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-8">
          {/* Upcoming */}
          {upcomingMeetings.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Upcoming ({upcomingMeetings.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {upcomingMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onClick={() => setSelectedMeeting(meeting)}
                    copiedLink={copiedLink}
                    onCopyLink={handleCopyLink}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Past */}
          {pastMeetings.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Past & Cancelled ({pastMeetings.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pastMeetings.map((meeting) => (
                  <MeetingCard
                    key={meeting.id}
                    meeting={meeting}
                    onClick={() => setSelectedMeeting(meeting)}
                    copiedLink={copiedLink}
                    onCopyLink={handleCopyLink}
                    muted
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog
        open={!!selectedMeeting}
        onOpenChange={(open) => !open && setSelectedMeeting(null)}
      >
        {selectedMeeting && (
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Video className="h-5 w-5 text-blue-500" />
                {selectedMeeting.title}
              </DialogTitle>
              <DialogDescription>Meeting details</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-1">
              <div className="flex items-center justify-between">
                <StatusBadge status={selectedMeeting.status} />
                {selectedMeeting.notificationSent && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    Notification sent
                  </span>
                )}
              </div>

              {selectedMeeting.description && (
                <p className="text-sm text-muted-foreground">
                  {selectedMeeting.description}
                </p>
              )}

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  <span>
                    {format(
                      new Date(selectedMeeting.scheduledAt),
                      "EEEE, MMMM dd, yyyy"
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    {format(new Date(selectedMeeting.scheduledAt), "hh:mm a")} &mdash;{" "}
                    {selectedMeeting.durationMinutes} minutes
                  </span>
                </div>
                {selectedMeeting.createdBy && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Users className="h-4 w-4" />
                    <span>
                      Organized by{" "}
                      <span className="text-foreground font-medium">
                        {selectedMeeting.createdBy.firstName}{" "}
                        {selectedMeeting.createdBy.lastName}
                      </span>
                    </span>
                  </div>
                )}
              </div>

              {selectedMeeting.meetingLink && (
                <>
                  <Separator />
                  <div className="flex flex-col gap-2">
                    <a
                      href={selectedMeeting.meetingLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      Join Meeting
                    </a>
                    <button
                      onClick={() => handleCopyLink(selectedMeeting.meetingLink!)}
                      className="flex items-center justify-center gap-2 w-full rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium py-2 transition-colors"
                    >
                      {copiedLink === selectedMeeting.meetingLink ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          Copy Link
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}

              {selectedMeeting.participants &&
                selectedMeeting.participants.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Participants ({selectedMeeting.participants.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedMeeting.participants.map((p) => (
                          <span
                            key={p.id}
                            className="text-xs bg-muted rounded-full px-3 py-1"
                          >
                            {p.firstName} {p.lastName}
                          </span>
                        ))}
                      </div>
                    </div>
                  </>
                )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Create Meeting Dialog */}
      <Dialog
        open={createDialogOpen}
        onOpenChange={(open) => {
          setCreateDialogOpen(open);
          if (!open) resetMeetingForm();
        }}
      >
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Schedule Meeting</DialogTitle>
            <DialogDescription>
              Create a meeting and invite your colleagues to join.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Meeting Title *</Label>
              <Input
                placeholder="e.g. Project sync"
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
              <Label>Duration</Label>
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
              <Label>Invite Colleagues</Label>
              <div className="border rounded-md max-h-48 overflow-y-auto p-2 space-y-1">
                {employees.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-2">
                    No employees found in your organization
                  </p>
                ) : (
                  employees
                    .filter((emp) => emp.userId !== userId)
                    .map((emp) => (
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
                  {meetingForm.participantIds.length} colleague(s) invited
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateMeeting}
              loading={creating}
              className="gap-2"
            >
              {creating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              Schedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Meeting Card ─────────────────────────────────────────────────────────────

function MeetingCard({
  meeting,
  onClick,
  copiedLink,
  onCopyLink,
  muted = false,
}: {
  meeting: Meeting;
  onClick: () => void;
  copiedLink: string | null;
  onCopyLink: (link: string) => void;
  muted?: boolean;
}) {
  const date = new Date(meeting.scheduledAt);

  return (
    <Card
      className={`p-4 cursor-pointer hover:shadow-md transition-shadow ${muted ? "opacity-70" : ""}`}
      onClick={onClick}
    >
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Video className="h-4 w-4 text-blue-500 shrink-0" />
            <h3 className="font-semibold truncate">{meeting.title}</h3>
          </div>
          <StatusBadge status={meeting.status} />
        </div>

        {meeting.description && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {meeting.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            <span>{format(date, "hh:mm a")}</span>
          </div>
          <span className="text-xs">·</span>
          <MeetingTimeLabel dateStr={meeting.scheduledAt} />
          <span className="text-xs">·</span>
          <span className="text-xs">{meeting.durationMinutes} min</span>
        </div>

        {meeting.participants && meeting.participants.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            <span>{meeting.participants.length} participants</span>
          </div>
        )}

        {meeting.meetingLink && (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <a
              href={meeting.meetingLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline w-fit"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Join Meeting
            </a>
            <button
              onClick={() => onCopyLink(meeting.meetingLink!)}
              className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
              title="Copy link"
            >
              {copiedLink === meeting.meetingLink ? (
                <Check className="h-3.5 w-3.5 text-green-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
          </div>
        )}
      </div>
    </Card>
  );
}
