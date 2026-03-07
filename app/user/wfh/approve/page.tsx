"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, Home, ArrowLeft, RefreshCw } from "lucide-react";
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
import { getProfile, getPendingWfh, approveWfh } from "@/app/api/api";
import { format } from "date-fns";

interface Requester {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  employeeCode?: string;
}

interface PendingWfh {
  approvalId?: string;
  requestId: string;
  date?: string;
  endDate?: string;
  status?: string;
  numberOfDays?: number;
  reason?: string;
  requester?: Requester;
}

interface PendingWfhRow {
  id?: string;
  status?: string;
  wfhRequestId?: string;
  requestId?: string;
  user?: Requester;
  employee?: Requester;
  wfhRequest?: PendingWfhRow;
  request?: PendingWfhRow;
  date?: string;
  startDate?: string;
  endDate?: string;
  numberOfDays?: number;
  days?: number;
  duration?: number;
  reason?: string;
}

function getErrorMessage(error: unknown, fallback: string) {
  const maybeError = error as {
    response?: { data?: { message?: string } };
  };
  return maybeError?.response?.data?.message || fallback;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "dd MMM yyyy");
  } catch {
    return "-";
  }
}

function normalizePending(row: PendingWfhRow): PendingWfh | null {
  const request = row?.wfhRequest || row?.request || row;
  const requestId = request?.id || row?.wfhRequestId || row?.requestId;

  if (!requestId) return null;

  return {
    approvalId: row?.wfhRequest ? row.id : undefined,
    requestId,
    date: request?.date || request?.startDate,
    endDate: request?.endDate || request?.date || request?.startDate,
    status: request?.status || row?.status,
    numberOfDays:
      request?.numberOfDays ?? request?.days ?? request?.duration ?? 1,
    reason: request?.reason,
    requester: request?.user || request?.employee || row?.user || row?.employee,
  };
}

export default function UserWfhApprovePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [approverUserId, setApproverUserId] = useState("");
  const [pendingWfh, setPendingWfh] = useState<PendingWfh[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchPending = useCallback(async (userId: string) => {
    try {
      const res = await getPendingWfh(userId);
      const data = Array.isArray(res.data) ? res.data : [];
      const normalized = data
        .map((item) => normalizePending(item as PendingWfhRow))
        .filter((item): item is PendingWfh => Boolean(item));
      setPendingWfh(normalized);
    } catch {
      toast.error("Failed to load pending WFH requests");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await getProfile();
        const profile = profileRes.data || {};
        const userId = profile.userId ?? profile.id ?? "";

        setApproverUserId(userId);

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
  }, [fetchPending]);

  const handleAction = async (request: PendingWfh, approve: boolean) => {
    if (!approverUserId) return;

    setActionLoadingId(request.requestId);
    try {
      await approveWfh(request.requestId, approverUserId, {
        approve,
        remarks: approve ? "Approved" : "Rejected",
      });
      toast.success(approve ? "WFH approved" : "WFH rejected");
      await fetchPending(approverUserId);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to update WFH request"));
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Home className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Approve WFH</h1>
            <p className="text-xs text-muted-foreground">
              Review and approve pending WFH requests
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/user/wfh")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            My WFH
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

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5" />
            Pending Requests
          </CardTitle>
          <CardDescription>
            {pendingWfh.length === 0
              ? "No pending WFH requests"
              : `${pendingWfh.length} request${pendingWfh.length !== 1 ? "s" : ""} awaiting approval`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {pendingWfh.length === 0 ? (
            <div className="py-12 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                All caught up! No pending WFH requests.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingWfh.map((request) => {
                const requester = request.requester;
                const requesterName = requester
                  ? [
                      requester.firstName,
                      requester.middleName,
                      requester.lastName,
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : "Employee";
                const days = request.numberOfDays ?? "-";
                const isActing = actionLoadingId === request.requestId;

                return (
                  <div
                    key={request.requestId}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 border rounded-xl bg-muted/30"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm">{requesterName}</span>
                        {requester?.employeeCode && (
                          <Badge variant="outline" className="text-xs">
                            {requester.employeeCode}
                          </Badge>
                        )}
                        <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300 hover:bg-cyan-100 text-xs">
                          WFH
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        {formatDate(request.date)} - {formatDate(request.endDate)}
                        {days !== "-" && (
                          <span className="ml-2 font-medium">
                            ({days} day{Number(days) !== 1 ? "s" : ""})
                          </span>
                        )}
                      </p>

                      {request.reason ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          Reason: {request.reason}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                        disabled={isActing}
                        onClick={() => handleAction(request, false)}
                      >
                        <XCircle className="h-4 w-4" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        className="gap-1.5 bg-green-600 hover:bg-green-700"
                        disabled={isActing}
                        onClick={() => handleAction(request, true)}
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
