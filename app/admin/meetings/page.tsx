"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays,
  Plus,
  Trash2,
  Send,
  Video,
  Link,
  Eye,
  Filter,
} from "lucide-react";
import { useOrganizationTimezone } from "@/hooks/useOrganizationTimezone";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { DataTablePagination } from "@/components/data-table-pagination";
import {
  getProfile,
  getEmployees,
  createMeeting,
  getMeetingsByOrg,
  deleteMeeting,
  sendMeetingNotification,
} from "@/app/api/api";
import { format } from "date-fns";
import { getFullName } from "@/lib/utils";

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
  const { toUtcISO: orgToUtcISO } = useOrganizationTimezone();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Meetings state
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [meetingsLoading, setMeetingsLoading] = useState(false);

  // Pagination & search state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Meeting detail dialog state
  const [meetingDetailOpen, setMeetingDetailOpen] = useState(false);
  const [meetingDetail, setMeetingDetail] = useState<Meeting | null>(null);
  
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

  // Reset to page 1 when filters/search change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, searchQuery, pageSize]);

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
      const scheduledAt = orgToUtcISO(meetingForm.scheduledDate, meetingForm.scheduledTime);

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

  // ------- Effective status: Active (upcoming) / Completed (date passed) / Cancelled -------
  const getEffectiveStatus = (meeting: Meeting): "ACTIVE" | "COMPLETED" | "CANCELLED" => {
    if (meeting.status === "CANCELLED") return "CANCELLED";
    if (meeting.status === "COMPLETED") return "COMPLETED";
    const end = new Date(meeting.scheduledAt).getTime() + meeting.durationMinutes * 60000;
    if (end <= Date.now()) return "COMPLETED";
    return "ACTIVE";
  };

  const getEffectiveStatusBadge = (meeting: Meeting) => {
    const eff = getEffectiveStatus(meeting);
    if (eff === "ACTIVE") {
      return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Active</Badge>;
    }
    if (eff === "COMPLETED") {
      return (
        <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
          Completed
        </Badge>
      );
    }
    return <Badge className="bg-red-100 text-red-700 border-red-300">Cancelled</Badge>;
  };

  // ------- Open meeting detail dialog -------
  const openMeetingDetailDialog = (meeting: Meeting) => {
    setMeetingDetail(meeting);
    setMeetingDetailOpen(true);
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

  // ------- Filtered, searched & sorted meetings (Active first, then Completed, then Cancelled) -------
  const rankOrder = { ACTIVE: 0, COMPLETED: 1, CANCELLED: 2 } as const;
  const filteredMeetings = meetings
    .filter((m) => {
      const eff = getEffectiveStatus(m);
      const matchesStatus = statusFilter === "all" || eff === statusFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        m.title.toLowerCase().includes(q) ||
        (m.description || "").toLowerCase().includes(q) ||
        (m.createdBy
          ? `${m.createdBy.firstName} ${m.createdBy.lastName}`.toLowerCase().includes(q)
          : false);
      return matchesStatus && matchesSearch;
    })
    .sort((a, b) => {
      const rankDiff =
        rankOrder[getEffectiveStatus(a)] - rankOrder[getEffectiveStatus(b)];
      if (rankDiff !== 0) return rankDiff;
      // Within same status: Active upcoming soonest first, others by date desc
      if (getEffectiveStatus(a) === "ACTIVE") {
        return (
          new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
        );
      }
      return new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime();
    });

  const totalPages = Math.max(1, Math.ceil(filteredMeetings.length / pageSize));
  const safePage = Math.min(page, totalPages);

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

      {/* Meetings Data Table */}
      <Card>
        <CardHeader>
          <CardTitle>Meetings</CardTitle>
          <CardDescription>
            Active meetings first, then completed, then cancelled
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Filter status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
              />
            </div>
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">Rows</span>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v))}
              >
                <SelectTrigger className="w-[80px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Separator />

          {meetingsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : filteredMeetings.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-lg font-medium">No meetings found</p>
              <p className="text-sm mt-1">
                {searchQuery || statusFilter !== "all"
                  ? "No meetings match your filters"
                  : "Schedule a meeting to notify specific employees at the scheduled time."}
              </p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Sl#</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Scheduled Date</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredMeetings
                      .slice((safePage - 1) * pageSize, safePage * pageSize)
                      .map((meeting, index) => {
                        const eff = getEffectiveStatus(meeting);
                        return (
                          <TableRow key={meeting.id}>
                            <TableCell className="font-medium">
                              {(safePage - 1) * pageSize + index + 1}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Video className="h-4 w-4 text-blue-500" />
                                <span
                                  className={
                                    eff === "COMPLETED"
                                      ? "line-through text-muted-foreground"
                                      : "font-medium"
                                  }
                                >
                                  {meeting.title}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>{formatMeetingTime(meeting.scheduledAt)}</TableCell>
                            <TableCell>{meeting.durationMinutes} min</TableCell>
                            <TableCell>{getEffectiveStatusBadge(meeting)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1"
                                  onClick={() => openMeetingDetailDialog(meeting)}
                                  title="View"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  View
                                </Button>
                                {!meeting.notificationSent &&
                                  meeting.status === "SCHEDULED" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSendNotification(meeting.id)}
                                      loading={actionLoading === meeting.id}
                                      className="gap-1"
                                    >
                                      <Send className="h-3.5 w-3.5" />
                                      Notify
                                    </Button>
                                  )}
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDeleteMeeting(meeting.id)}
                                  loading={actionLoading === meeting.id}
                                  className="gap-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>

                {/* Pagination Controls */}
                <DataTablePagination
                  page={safePage}
                  pageSize={pageSize}
                  total={filteredMeetings.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  itemLabel="meetings"
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
                        {getFullName(emp)}
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
              loading={creating}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Schedule Meeting
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Meeting Detail Dialog */}
      <Dialog open={meetingDetailOpen} onOpenChange={setMeetingDetailOpen}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Meeting Details</DialogTitle>
            <DialogDescription>
              Full details of this scheduled meeting
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">Title</Label>
                <p className="font-medium">{meetingDetail?.title}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Status</Label>
                <div className="mt-1">
                  {meetingDetail ? getEffectiveStatusBadge(meetingDetail) : null}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Scheduled Date</Label>
                <p className="font-medium">
                  {meetingDetail?.scheduledAt
                    ? formatMeetingTime(meetingDetail.scheduledAt)
                    : "-"}
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Duration</Label>
                <p className="font-medium">{meetingDetail?.durationMinutes} min</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Participants</Label>
                <p className="font-medium">
                  {meetingDetail?.participants?.length || 0} participant(s)
                </p>
              </div>
              <div>
                <Label className="text-muted-foreground">Notification</Label>
                <p className="font-medium">
                  {meetingDetail?.notificationSent ? "Sent" : "Not sent"}
                </p>
              </div>
            </div>
            <div>
              <Label className="text-muted-foreground">Description</Label>
              <p className="mt-1 rounded-md border p-3 text-sm">
                {meetingDetail?.description || "-"}
              </p>
            </div>
            {meetingDetail?.participants && meetingDetail.participants.length > 0 && (
              <div>
                <Label className="text-muted-foreground">Participants</Label>
                <div className="mt-1 flex flex-wrap gap-2 rounded-md border p-3">
                  {meetingDetail.participants.map((p) => (
                    <Badge key={p.id} variant="outline">
                      {p.firstName} {p.lastName}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {meetingDetail?.meetingLink && (
              <div>
                <Label className="text-muted-foreground">Meeting Link</Label>
                <a
                  href={meetingDetail.meetingLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                >
                  <Link className="h-3.5 w-3.5" />
                  Join Meeting
                </a>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMeetingDetailOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

