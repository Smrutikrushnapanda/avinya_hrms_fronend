"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  LogIn,
  LogOut,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Send,
  Trash2,
} from "lucide-react";
import { getTimeslip, deleteTimeslip } from "@/app/api/api";
import MobileTabHeader from "../../components/MobileTabHeader";
import { MobileCard, MobileBadge } from "../../components/MobileCard";
import { StaggerReveal, StaggerItem } from "../../components/animation-wrappers";
import { MobileSkeleton } from "../../components/MobileSkeleton";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

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

// ─── Helpers ────────────────────────────────────────────────────────────────

const badgeVariant = (s: string) => {
  if (s === "APPROVED") return "success" as const;
  if (s === "PENDING") return "warning" as const;
  if (s === "REJECTED") return "danger" as const;
  return "default" as const;
};

const missingTypeLabel: Record<string, string> = {
  IN: "Check-In Missing",
  OUT: "Check-Out Missing",
  BOTH: "Both Missing",
};

const missingTypeIcon: Record<string, typeof LogIn> = {
  IN: LogIn,
  OUT: LogOut,
  BOTH: Clock,
};

function formatTime(val?: string | null): string {
  if (!val) return "Not recorded";
  try {
    return new Date(val).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Not recorded";
  }
}

function formatDate(val?: string): string {
  if (!val) return "-";
  try {
    return new Date(val).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return "-";
  }
}

function formatFullDateTime(val?: string): string {
  if (!val) return "";
  try {
    const d = new Date(val);
    return (
      d.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      " at " +
      d.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    );
  } catch {
    return "";
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function MobileTimeslipDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [timeslip, setTimeslip] = useState<TimeslipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);

  const handleWithdraw = useCallback(async () => {
    if (!id || !timeslip) return;
    setWithdrawing(true);
    try {
      await deleteTimeslip(id);
      toast.success("Timeslip withdrawn successfully");
      router.push("/user/dashboard/mobile/timeslip");
    } catch {
      toast.error("Failed to withdraw timeslip");
    } finally {
      setWithdrawing(false);
    }
  }, [id, timeslip, router]);

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

  const missingType = timeslip?.missingType || timeslip?.missing_type || "IN";
  const MIcon = missingTypeIcon[missingType] || Clock;

  const timeline = useMemo(() => {
    if (!timeslip) return [];
    const events: {
      id: string;
      title: string;
      description: string;
      time: string;
      status: "completed" | "pending" | "rejected";
      isLast: boolean;
    }[] = [];

    const created =
      timeslip.createdAt || timeslip.created_at
        ? new Date(timeslip.createdAt || timeslip.created_at!)
        : null;

    events.push({
      id: "submitted",
      title: "Request Submitted",
      description: "Time correction request submitted for review",
      time: created ? formatFullDateTime(created.toISOString()) : "",
      status: "completed",
      isLast: false,
    });

    const approvals = timeslip.approvals || [];
    approvals.forEach((approval, index) => {
      const status =
        approval.action === "APPROVED"
          ? ("completed" as const)
          : approval.action === "REJECTED"
            ? ("rejected" as const)
            : ("pending" as const);
      const approverName = approval.approver
        ? `${approval.approver.firstName} ${approval.approver.lastName}`
        : "Approver";
      const stepNo = approval.step_no || index + 1;

      events.push({
        id: `approval_${approval.id}`,
        title: `Step ${stepNo} — ${approval.action.charAt(0) + approval.action.slice(1).toLowerCase()}`,
        description:
          status === "completed"
            ? `Approved by ${approverName}`
            : status === "rejected"
              ? `Rejected by ${approverName}`
              : `Assigned to ${approverName}`,
        time: approval.acted_at ? formatFullDateTime(approval.acted_at) : "",
        status,
        isLast: index === approvals.length - 1,
      });
    });

    const finalStatus =
      timeslip.status === "APPROVED"
        ? ("completed" as const)
        : timeslip.status === "REJECTED"
          ? ("rejected" as const)
          : ("pending" as const);

    events.push({
      id: "final_status",
      title: "Final Status",
      description:
        finalStatus === "completed"
          ? "Request fully approved"
          : finalStatus === "rejected"
            ? "Request rejected"
            : "Awaiting final approval",
      time:
        timeslip.updated_at || timeslip.updatedAt
          ? formatFullDateTime(timeslip.updated_at || timeslip.updatedAt)
          : "",
      status: finalStatus,
      isLast: true,
    });

    return events;
  }, [timeslip]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileTabHeader title="Timeslip Details" backHref="/user/dashboard/mobile/timeslip" showBell={false} />
        <MobileSkeleton />
      </div>
    );
  }

  if (error || !timeslip) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileTabHeader title="Timeslip Details" backHref="/user/dashboard/mobile/timeslip" showBell={false} />
        <div className="flex-1 flex items-center justify-center px-4">
          <MobileCard className="text-center max-w-sm w-full">
            <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-rose-500" />
            </div>
            <p className="text-sm font-semibold text-foreground mb-1">
              {error || "Timeslip not found"}
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              The timeslip you&apos;re looking for doesn&apos;t exist or has been removed.
            </p>
            <button
              onClick={() => router.push("/user/dashboard/mobile/timeslip")}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              Go Back
            </button>
          </MobileCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileTabHeader
        title="Timeslip Details"
        backHref="/user/dashboard/mobile/timeslip"
        showBell={false}
      />

      <div className="px-4 mt-4 pb-24 space-y-4">
        <StaggerReveal className="space-y-4" staggerDelay={0.06}>
          {/* ── Status Banner ── */}
          <StaggerItem>
            <MobileCard className="relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 to-primary/10" />
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <MIcon className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {missingTypeLabel[missingType] || "Time Correction"}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDate(timeslip.date)}
                    </p>
                  </div>
                </div>
                <MobileBadge variant={badgeVariant(timeslip.status)}>
                  {timeslip.status}
                </MobileBadge>
              </div>

              {/* ── Corrected Times ── */}
              <div className="flex gap-3">
                <div className="flex-1 bg-blue-50 dark:bg-blue-950/20 rounded-xl p-3.5 border border-blue-100 dark:border-blue-900/30">
                  <div className="flex items-center gap-1.5 mb-2">
                    <LogIn className="w-3.5 h-3.5 text-blue-500" />
                    <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                      Check-In
                    </span>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {formatTime(timeslip.correctedIn || timeslip.corrected_in)}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center">
                  <div className="w-px h-10 bg-border rounded" />
                </div>

                <div className="flex-1 bg-amber-50 dark:bg-amber-950/20 rounded-xl p-3.5 border border-amber-100 dark:border-amber-900/30">
                  <div className="flex items-center gap-1.5 mb-2">
                    <LogOut className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                      Check-Out
                    </span>
                  </div>
                  <p className="text-xl font-bold text-foreground">
                    {formatTime(timeslip.correctedOut || timeslip.corrected_out)}
                  </p>
                </div>
              </div>
            </MobileCard>
          </StaggerItem>

          {/* ── Reason ── */}
          {timeslip.reason && (
            <StaggerItem>
              <MobileCard>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center">
                    <FileText className="w-4 h-4 text-sky-600" />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">Reason</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed pl-10">
                  {timeslip.reason}
                </p>
              </MobileCard>
            </StaggerItem>
          )}

          {/* ── Approval Timeline ── */}
          <StaggerItem>
            <MobileCard>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Send className="w-4 h-4 text-primary" />
                </div>
                <h3 className="text-sm font-bold text-foreground">Approval Timeline</h3>
              </div>

              <div className="space-y-0">
                {timeline.map((event) => {
                  const isCompleted = event.status === "completed";
                  const isRejected = event.status === "rejected";
                  const isPending = event.status === "pending";

                  return (
                    <div key={event.id} className="flex gap-3">
                      {/* ── Icon + Connector ── */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                            isCompleted
                              ? "bg-emerald-500"
                              : isRejected
                                ? "bg-rose-500"
                                : "bg-amber-500"
                          }`}
                        >
                          {isCompleted && <CheckCircle2 className="w-4 h-4 text-white" />}
                          {isRejected && <XCircle className="w-4 h-4 text-white" />}
                          {isPending && <Clock className="w-4 h-4 text-white" />}
                        </div>
                        {!event.isLast && (
                          <div
                            className={`w-0.5 flex-1 min-h-[2rem] ${
                              isCompleted ? "bg-emerald-500" : "bg-border"
                            }`}
                          />
                        )}
                      </div>

                      {/* ── Content ── */}
                      <div className="flex-1 pb-5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {event.title}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {event.description}
                            </p>
                            {isRejected && event.id !== "submitted" && (
                              <p className="text-[11px] text-rose-500 mt-1 italic">
                                {event.description.includes("Rejected")
                                  ? "This step was rejected"
                                  : ""}
                              </p>
                            )}
                          </div>
                          {event.time && (
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap shrink-0 mt-0.5">
                              {event.time}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </MobileCard>
          </StaggerItem>

          {/* ── Metadata ── */}
          <StaggerItem>
            <MobileCard className="bg-muted/30">
              <div className="space-y-2">
                {(timeslip.createdAt || timeslip.created_at) && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Submitted</span>
                    <span className="text-xs font-medium text-foreground">
                      {formatFullDateTime(timeslip.createdAt || timeslip.created_at)}
                    </span>
                  </div>
                )}
                {(timeslip.updatedAt || timeslip.updated_at) && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-muted-foreground">Last Updated</span>
                    <span className="text-xs font-medium text-foreground">
                      {formatFullDateTime(timeslip.updatedAt || timeslip.updated_at)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Request ID</span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {String(timeslip.id).slice(0, 8)}...
                  </span>
                </div>
              </div>
            </MobileCard>
          </StaggerItem>

          {/* ── Withdraw Button ── */}
          {timeslip.status === "PENDING" && (
            <StaggerItem>
              <button
                onClick={handleWithdraw}
                disabled={withdrawing}
                className="w-full py-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30 text-rose-600 dark:text-rose-400 text-sm font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {withdrawing ? "Withdrawing..." : "Withdraw Request"}
              </button>
            </StaggerItem>
          )}
        </StaggerReveal>
      </div>
    </div>
  );
}
