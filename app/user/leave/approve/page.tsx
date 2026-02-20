"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, CalendarDays, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";
import { getProfile, getPendingLeaves, approveLeave } from "@/app/api/api";
import { format } from "date-fns";

interface PendingLeave {
  id: string;
  leaveType?: { name?: string } | string;
  leaveTypeName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  numberOfDays?: number;
  totalDays?: number;
  days?: number;
  duration?: number;
  user?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    employeeCode?: string;
  };
  employee?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    employeeCode?: string;
  };
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "dd MMM yyyy");
  } catch {
    return "-";
  }
}

export default function UserLeaveApprovePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isApprover, setIsApprover] = useState(false);
  const [approverUserId, setApproverUserId] = useState("");
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchPending = useCallback(async (userId: string) => {
    try {
      const res = await getPendingLeaves(userId);
      const data = res.data || [];
      setPendingLeaves(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load pending leave requests");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await getProfile();
        const profile = profileRes.data || {};
        const userId = profile.userId ?? profile.id ?? "";
        const approverFlag = Boolean(profile.isApprover);

        setIsApprover(approverFlag);
        setApproverUserId(userId);

        if (!approverFlag) {
          router.replace("/user/leave");
          return;
        }

        if (userId) {
          await fetchPending(userId);
        }
      } catch {
        toast.error("Failed to load approvals");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchPending, router]);

  const handleAction = async (leave: PendingLeave, approve: boolean) => {
    if (!approverUserId) return;
    setActionLoadingId(leave.id);
    try {
      await approveLeave(leave.id, approverUserId, {
        approve,
        remarks: approve ? "Approved" : "Rejected",
      });
      toast.success(approve ? "Leave approved" : "Leave rejected");
      await fetchPending(approverUserId);
    } catch {
      toast.error("Failed to update leave");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!isApprover) return null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Approve Leaves</h1>
            <p className="text-xs text-muted-foreground">
              Review and approve pending leave requests
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/user/leave")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            My Leave
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchPending(approverUserId)}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Pending Leave Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Pending Requests
          </CardTitle>
          <CardDescription>
            {pendingLeaves.length === 0
              ? "No pending leave requests"
              : `${pendingLeaves.length} request${pendingLeaves.length !== 1 ? "s" : ""} awaiting approval`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingLeaves.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                All caught up! No pending leave requests.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingLeaves.map((leave) => {
                const requester = leave.user || leave.employee;
                const requesterName = requester
                  ? [
                      requester.firstName,
                      requester.middleName,
                      requester.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : "Employee";
                const leaveTypeName =
                  typeof leave.leaveType === "string"
                    ? leave.leaveType
                    : leave.leaveType?.name || leave.leaveTypeName || "Leave";
                const totalDays =
                  leave.numberOfDays ??
                  leave.totalDays ??
                  leave.days ??
                  leave.duration ??
                  "-";
                const isActing = actionLoadingId === leave.id;

                return (
                  <div
                    key={leave.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-xl bg-muted/30"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {requesterName}
                        </span>
                        {requester?.employeeCode && (
                          <Badge variant="outline" className="text-xs">
                            {requester.employeeCode}
                          </Badge>
                        )}
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100 text-xs">
                          {leaveTypeName}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(leave.startDate)} –{" "}
                        {formatDate(leave.endDate)}
                        {totalDays !== "-" && (
                          <span className="ml-2 font-medium">
                            ({totalDays} day{Number(totalDays) !== 1 ? "s" : ""})
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        disabled={isActing}
                        onClick={() => handleAction(leave, false)}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5 bg-green-600 hover:bg-green-700"
                        disabled={isActing}
                        onClick={() => handleAction(leave, true)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Approve
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
