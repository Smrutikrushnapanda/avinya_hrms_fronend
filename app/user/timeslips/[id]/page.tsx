"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  LogIn,
  LogOut,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { getTimeslip } from "@/app/api/api";

interface Approver {
  id: string;
  firstName: string;
  lastName: string;
  employeeCode?: string;
}

interface Approval {
  id: string;
  action: "PENDING" | "APPROVED" | "REJECTED";
  remarks?: string | null;
  acted_at?: string | null;
  step_no: number;
  approver: Approver;
}

interface TimeslipDetail {
  id: string;
  date: string;
  missingType?: string;
  missing_type?: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  correctedIn?: string | null;
  corrected_in?: string | null;
  correctedOut?: string | null;
  corrected_out?: string | null;
  reason?: string;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
  approvals?: Approval[];
}

interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  date: string;
  status: "completed" | "pending" | "rejected";
  description: string;
  icon: "send" | "check-circle" | "x-circle" | "clock";
  details?: string;
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; border: string; label: string }> = {
    PENDING: { bg: "bg-amber-100", text: "text-amber-800", border: "border-amber-300", label: "Pending" },
    APPROVED: { bg: "bg-green-100", text: "text-green-700", border: "border-green-300", label: "Approved" },
    REJECTED: { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", label: "Rejected" },
  };
  const cfg = configs[status] || { bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-300", label: status };
  return (
    <Badge className={`${cfg.bg} ${cfg.text} ${cfg.border} hover:${cfg.bg}`}>
      {cfg.label}
    </Badge>
  );
}

function MissingTypeBadge({ type }: { type: string }) {
  const labels: Record<string, string> = { IN: "Check-In", OUT: "Check-Out", BOTH: "Both" };
  return (
    <Badge variant="outline" className="font-normal">
      {labels[type] ?? type}
    </Badge>
  );
}

function TimelineIcon({ status }: { status: "completed" | "pending" | "rejected" }) {
  const colors = {
    completed: "bg-green-500",
    pending: "bg-amber-500",
    rejected: "bg-red-500",
  };
  const icons = {
    completed: <CheckCircle2 className="h-4 w-4 text-white" />,
    pending: <Clock className="h-4 w-4 text-white" />,
    rejected: <XCircle className="h-4 w-4 text-white" />,
  };
  return (
    <div className={`w-8 h-8 rounded-full ${colors[status]} flex items-center justify-center shadow-md`}>
      {icons[status]}
    </div>
  );
}

export default function TimeslipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [timeslip, setTimeslip] = useState<TimeslipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const fetchDetail = async () => {
      try {
        const res = await getTimeslip(id);
        setTimeslip(res.data);
      } catch {
        setError("Failed to load timeslip details");
      } finally {
        setLoading(false);
      }
    };
    fetchDetail();
  }, [id]);

  const timeline = useMemo((): TimelineEvent[] => {
    if (!timeslip) return [];
    const events: TimelineEvent[] = [];

    const created = new Date(timeslip.createdAt || timeslip.created_at || Date.now());
    events.push({
      id: "submitted",
      title: "Request Submitted",
      time: created.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      date: created.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }),
      status: "completed",
      description: `${timeslip.missingType || timeslip.missing_type || "N/A"} time correction request submitted`,
      icon: "send",
      details: timeslip.reason || "Time correction request submitted for review",
    });

    (timeslip.approvals || []).forEach((approval, index) => {
      const status = approval.action === "APPROVED" ? "completed" : approval.action === "REJECTED" ? "rejected" : "pending";
      const stepNo = approval.step_no || index + 1;
      const approverName = approval.approver ? `${approval.approver.firstName} ${approval.approver.lastName}` : "Approver";
      events.push({
        id: `approval_${approval.id}`,
        title: `Step ${stepNo} - ${approval.action}`,
        time: approval.acted_at ? new Date(approval.acted_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "",
        date: approval.acted_at ? new Date(approval.acted_at).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "",
        status,
        description: status === "completed" ? `Approved by ${approverName}` : status === "rejected" ? `Rejected by ${approverName}` : `Assigned to ${approverName} (Pending)`,
        icon: status === "completed" ? "check-circle" : status === "rejected" ? "x-circle" : "clock",
        details: status === "completed" ? `Approved by ${approverName}` : status === "rejected" ? approval.remarks || `Rejected by ${approverName}` : `Waiting for ${approverName} to review`,
      });
    });

    const finalStatus = timeslip.status === "APPROVED" ? "completed" : timeslip.status === "REJECTED" ? "rejected" : "pending";
    const finalDate = timeslip.updated_at ? new Date(timeslip.updated_at) : created;
    events.push({
      id: "final_status",
      title: "Final Status",
      time: finalDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
      date: finalDate.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }),
      status: finalStatus,
      description: finalStatus === "completed" ? "Time correction request fully approved" : finalStatus === "rejected" ? "Request rejected" : "Awaiting final approval",
      icon: finalStatus === "completed" ? "check-circle" : finalStatus === "rejected" ? "x-circle" : "clock",
      details: finalStatus === "completed" ? "The time correction has been fully approved and applied" : finalStatus === "rejected" ? timeslip.reason || "The request was not approved" : "Waiting for final processing",
    });

    return events;
  }, [timeslip]);

  const formatTime = (val?: string | null) => {
    if (!val) return "Not recorded";
    try {
      return new Date(val).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "Not recorded";
    }
  };

  const formatDate = (val?: string) => {
    if (!val) return "-";
    try {
      return new Date(val).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
    } catch {
      return "-";
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-8 w-48" />
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !timeslip) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-semibold">Timeslip Details</h1>
        </div>
        <Card className="p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <p className="text-sm text-muted-foreground">{error || "Timeslip not found"}</p>
            <Button variant="outline" onClick={() => router.back()}>Go Back</Button>
          </div>
        </Card>
      </div>
    );
  }

  const missingType = timeslip.missingType || timeslip.missing_type || "IN";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Timeslip Details</h1>
          <p className="text-xs text-muted-foreground">
            Correction request for {formatDate(timeslip.date)}
          </p>
        </div>
      </div>

      {/* Timeslip Card */}
      <Card className="overflow-hidden">
        <div className="relative">
          <div className="absolute top-0 right-0 bg-primary text-primary-foreground px-3 py-1.5 text-xs font-bold rounded-bl-lg">
            {formatDate(timeslip.date)}
          </div>
          <CardContent className="p-6 pt-8">
            <div className="flex items-center gap-2 mb-4">
              <MissingTypeBadge type={missingType} />
              <StatusBadge status={timeslip.status} />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LogIn className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Check-In</span>
                </div>
                <p className="text-2xl font-bold">{formatTime(timeslip.correctedIn || timeslip.corrected_in)}</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <LogOut className="h-4 w-4 text-orange-500" />
                  <span className="font-medium">Check-Out</span>
                </div>
                <p className="text-2xl font-bold">{formatTime(timeslip.correctedOut || timeslip.corrected_out)}</p>
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Reason Card */}
      <Card>
        <CardContent className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Reason</h3>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {timeslip.reason || "No reason provided"}
          </p>
        </CardContent>
      </Card>

      {/* Request Timeline */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold text-lg mb-5">Request Timeline</h3>
          <div className="space-y-0">
            {timeline.map((event, index) => (
              <div key={event.id} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <TimelineIcon status={event.status} />
                  {index < timeline.length - 1 && (
                    <div className={`w-0.5 flex-1 min-h-[2rem] ${
                      event.status === "completed" ? "bg-green-500" : "bg-border"
                    }`} />
                  )}
                </div>
                <div className="flex-1 pb-6">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-sm">{event.title}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {event.description}
                      </p>
                    </div>
                    {event.time && (
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {event.time} &middot; {event.date}
                      </span>
                    )}
                  </div>
                  {event.details && (
                    <p className="text-xs text-muted-foreground mt-1 italic">
                      {event.details}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
