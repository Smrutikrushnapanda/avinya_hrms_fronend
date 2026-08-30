"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Video,
  Clock,
  Users,
  Copy,
  Check,
  CalendarDays,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getProfile, getMeetingsForUser } from "@/app/api/api";
import { format, isPast, isToday, isTomorrow } from "date-fns";

import MobileTabHeader from "../components/MobileTabHeader";
import { MobileEmptyState } from "../components/MobileEmptyState";
import { MobileSkeleton } from "../components/MobileSkeleton";

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
  meetingLink?: string | null;
  createdBy?: { id: string; firstName: string; lastName: string };
  participants?: Participant[];
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "SCHEDULED":
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-xs">
          Scheduled
        </Badge>
      );
    case "IN_PROGRESS":
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
          In Progress
        </Badge>
      );
    case "COMPLETED":
      return (
        <Badge className="bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 text-xs">
          Completed
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 text-xs">
          Cancelled
        </Badge>
      );
    default:
      return <Badge className="text-xs">{status}</Badge>;
  }
}

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
  return (
    <span className="text-xs text-muted-foreground">
      {format(date, "MMM dd, yyyy")}
    </span>
  );
}

export default function MobileMeetingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  const fetchMeetings = useCallback(async () => {
    if (!userId) return;
    try {
      const res = await getMeetingsForUser(userId);
      const data = res.data?.data || res.data || [];
      setMeetings(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load meetings");
    }
  }, [userId]);

  useEffect(() => {
    const init = async () => {
      try {
        const res = await getProfile();
        setUserId(res.data?.userId || null);
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (userId) fetchMeetings();
  }, [userId, fetchMeetings]);

  const handleCopyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      setCopiedLink(link);
      toast.success("Meeting link copied!");
      setTimeout(() => setCopiedLink(null), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleJoinMeeting = (meeting: Meeting) => {
    if (meeting.meetingLink) {
      window.open(meeting.meetingLink, "_blank");
    } else {
      toast.error("No meeting link available");
    }
  };

  const now = new Date();
  const upcomingMeetings = meetings.filter(
    (m) => !isPast(new Date(m.scheduledAt)) && m.status !== "CANCELLED" && m.status !== "COMPLETED"
  );
  const pastMeetings = meetings.filter(
    (m) => isPast(new Date(m.scheduledAt)) || m.status === "COMPLETED" || m.status === "CANCELLED"
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileTabHeader title="My Meetings" />
        <MobileSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileTabHeader title="My Meetings" backHref="/user/dashboard/mobile" />

      <div className="px-4 mt-4 relative z-10 pb-24 space-y-6">
        {/* Upcoming Meetings */}
        <div>
          <h2 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4" />
            Upcoming ({upcomingMeetings.length})
          </h2>
          {upcomingMeetings.length === 0 ? (
            <MobileEmptyState
              icon={<CalendarDays size={24} />}
              title="No upcoming meetings"
              description="You have no scheduled meetings."
            />
          ) : (
            <div className="space-y-3">
              {upcomingMeetings.map((meeting) => (
                <Card key={meeting.id} className="overflow-hidden">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{meeting.title}</p>
                        {meeting.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {meeting.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(meeting.scheduledAt), "hh:mm a")}
                          </span>
                          <span>{meeting.durationMinutes} min</span>
                          <MeetingTimeLabel dateStr={meeting.scheduledAt} />
                        </div>
                        {meeting.participants && meeting.participants.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 text-xs text-muted-foreground">
                            <Users className="w-3 h-3" />
                            {meeting.participants.length} participant{meeting.participants.length !== 1 ? "s" : ""}
                          </div>
                        )}
                      </div>
                      <StatusBadge status={meeting.status} />
                    </div>
                    <div className="flex gap-2 mt-3">
                      {meeting.meetingLink && (
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={() => handleJoinMeeting(meeting)}
                        >
                          <Video className="w-3.5 h-3.5 mr-1" />
                          Join
                        </Button>
                      )}
                      {meeting.meetingLink && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => handleCopyLink(meeting.meetingLink!)}
                        >
                          {copiedLink === meeting.meetingLink ? (
                            <Check className="w-3.5 h-3.5" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Past Meetings */}
        {pastMeetings.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">
              Past ({pastMeetings.length})
            </h2>
            <div className="space-y-3">
              {pastMeetings.map((meeting) => (
                <Card key={meeting.id} className="opacity-70">
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm truncate">{meeting.title}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {format(new Date(meeting.scheduledAt), "MMM dd, hh:mm a")}
                          </span>
                          <span>{meeting.durationMinutes} min</span>
                        </div>
                      </div>
                      <StatusBadge status={meeting.status} />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
