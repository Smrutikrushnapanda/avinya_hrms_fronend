"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Clock, ArrowLeft, RefreshCw } from "lucide-react";
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
import { getProfile, getTimeslipsByApprover, approveTimeslip } from "@/app/api/api";
import { format } from "date-fns";

interface TimeslipApprovalRow {
  id: string;
  date: string;
  missing_type: "IN" | "OUT" | "BOTH";
  corrected_in: string | null;
  corrected_out: string | null;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  employee?: {
    id?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    employeeCode?: string;
  };
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "dd MMM yyyy");
  } catch {
    return "-";
  }
}

function formatTime(timeStr?: string | null) {
  if (!timeStr) return "-";
  try {
    return format(new Date(timeStr), "hh:mm a");
  } catch {
    return "-";
  }
}

const MISSING_TYPE_LABELS: Record<string, string> = {
  IN: "Check-In",
  OUT: "Check-Out",
  BOTH: "Both",
};

export default function UserTimeslipApprovePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isApprover, setIsApprover] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [timeslips, setTimeslips] = useState<TimeslipApprovalRow[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchApprovals = useCallback(async (approverEmpId: string) => {
    try {
      const res = await getTimeslipsByApprover(approverEmpId, {
        status: "PENDING",
        page: 1,
        limit: 50,
      });
      const data = res.data?.data || res.data || [];
      setTimeslips(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load pending time slip requests");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await getProfile();
        const profile = profileRes.data || {};
        const approverFlag = Boolean(profile.isApprover);
        const empId = profile.employee?.id ?? "";

        setIsApprover(approverFlag);
        setEmployeeId(empId);

        if (!approverFlag) {
          router.replace("/user/timeslips");
          return;
        }

        if (empId) {
          await fetchApprovals(empId);
        } else {
          toast.error("Approver profile not linked to an employee record");
        }
      } catch {
        toast.error("Failed to load approvals");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [fetchApprovals, router]);

  const handleAction = async (
    row: TimeslipApprovalRow,
    action: "APPROVED" | "REJECTED"
  ) => {
    if (!employeeId) return;
    setActionLoadingId(row.id);
    try {
      await approveTimeslip(row.id, {
        approverId: employeeId,
        action,
        remarks: action === "APPROVED" ? "Approved" : "Rejected",
      });
      toast.success(
        action === "APPROVED" ? "Time slip approved" : "Time slip rejected"
      );
      await fetchApprovals(employeeId);
    } catch {
      toast.error("Failed to update time slip");
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
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
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
          <Clock className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Approve Time Slips</h1>
            <p className="text-xs text-muted-foreground">
              Review and approve pending attendance correction requests
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/user/timeslips")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            My Time Slips
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => fetchApprovals(employeeId)}
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Pending Timeslip Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Pending Requests
          </CardTitle>
          <CardDescription>
            {timeslips.length === 0
              ? "No pending time slip requests"
              : `${timeslips.length} request${timeslips.length !== 1 ? "s" : ""} awaiting approval`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {timeslips.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                All caught up! No pending time slip requests.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {timeslips.map((row) => {
                const employeeName = row.employee
                  ? [
                      row.employee.firstName,
                      row.employee.middleName,
                      row.employee.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : "Employee";
                const isActing = actionLoadingId === row.id;

                return (
                  <div
                    key={row.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-xl bg-muted/30"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">
                          {employeeName}
                        </span>
                        {row.employee?.employeeCode && (
                          <Badge variant="outline" className="text-xs">
                            {row.employee.employeeCode}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {MISSING_TYPE_LABELS[row.missing_type] ?? row.missing_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Date: {formatDate(row.date)}
                        {row.corrected_in && (
                          <span className="ml-3">
                            In: {formatTime(row.corrected_in)}
                          </span>
                        )}
                        {row.corrected_out && (
                          <span className="ml-3">
                            Out: {formatTime(row.corrected_out)}
                          </span>
                        )}
                      </p>
                      {row.reason && (
                        <p className="text-xs text-muted-foreground italic">
                          &quot;{row.reason}&quot;
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        disabled={isActing}
                        onClick={() => handleAction(row, "REJECTED")}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5 bg-green-600 hover:bg-green-700"
                        disabled={isActing}
                        onClick={() => handleAction(row, "APPROVED")}
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
