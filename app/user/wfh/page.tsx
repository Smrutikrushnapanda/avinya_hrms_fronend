"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Home,
  Plus,
  ClipboardList,
  Filter,
  RefreshCw,
  Send,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  getProfile,
  getWfhBalance,
  getWfhRequests,
  getPendingWfh,
  applyWfh,
} from "@/app/api/api";
import { format } from "date-fns";

interface WfhRequest {
  id: string;
  date?: string;
  endDate?: string;
  numberOfDays?: number;
  reason?: string;
  status?: string;
  createdAt?: string;
}

interface WfhBalance {
  openingBalance: number;
  consumed: number;
  closingBalance: number;
}

interface TableState {
  page: number;
  pageSize: number;
  search: string;
  sorting: unknown[];
}

interface ProfileData {
  id?: string;
  userId?: string;
  organizationId?: string;
  isApprover?: boolean;
  employee?: {
    id?: string;
    userId?: string;
  } | null;
}

interface WfhResponseRow {
  id?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  numberOfDays?: number;
  days?: number;
  duration?: number;
  reason?: string;
  status?: string;
  createdAt?: string;
  wfhRequestId?: string;
  requestId?: string;
  wfhRequest?: WfhResponseRow;
  request?: WfhResponseRow;
}

function getErrorMessage(error: unknown, fallback: string) {
  const maybeError = error as {
    response?: { data?: { message?: string } };
  };
  return maybeError?.response?.data?.message || fallback;
}

function StatusBadge({ status }: { status?: string }) {
  const normalized = (status || "").toUpperCase();
  switch (normalized) {
    case "PENDING":
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
          Pending
        </Badge>
      );
    case "APPROVED":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100">
          Approved
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-100">
          Rejected
        </Badge>
      );
    case "CANCELLED":
      return (
        <Badge className="bg-gray-100 text-gray-600 border-gray-300 hover:bg-gray-100">
          Cancelled
        </Badge>
      );
    default:
      return <Badge variant="outline">{status || "Unknown"}</Badge>;
  }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  try {
    return format(new Date(dateStr), "dd MMM yyyy");
  } catch {
    return "-";
  }
}

function normalizeRequest(row: WfhResponseRow): WfhRequest | null {
  const request = row?.wfhRequest || row?.request || row;
  const requestId = request?.id || row?.wfhRequestId || row?.requestId;

  if (!requestId) return null;

  return {
    id: requestId,
    date: request?.date || request?.startDate,
    endDate: request?.endDate || request?.date || request?.startDate,
    numberOfDays:
      request?.numberOfDays ?? request?.days ?? request?.duration ?? 1,
    reason: request?.reason || "",
    status: request?.status || row?.status,
    createdAt: request?.createdAt || row?.createdAt,
  };
}

function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-8 w-36" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UserWfhPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [canApprove, setCanApprove] = useState(false);

  const userId = profile?.userId ?? profile?.id ?? profile?.employee?.userId;

  const [balance, setBalance] = useState<WfhBalance>({
    openingBalance: 0,
    consumed: 0,
    closingBalance: 0,
  });
  const [balanceLoading, setBalanceLoading] = useState(false);

  const [wfhRequests, setWfhRequests] = useState<WfhRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [tableState, setTableState] = useState<TableState>({
    page: 0,
    pageSize: 10,
    search: "",
    sorting: [],
  });

  const today = format(new Date(), "yyyy-MM-dd");
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applyForm, setApplyForm] = useState({
    date: today,
    endDate: today,
    reason: "",
  });
  const [applySubmitting, setApplySubmitting] = useState(false);

  const columns = useMemo<ColumnDef<WfhRequest>[]>(
    () => [
      {
        id: "Date",
        accessorKey: "date",
        header: "Date",
        enableSorting: false,
        cell: ({ row }) => (
          <span>
            {formatDate(row.original.date)} - {formatDate(row.original.endDate)}
          </span>
        ),
      },
      {
        id: "Days",
        accessorKey: "numberOfDays",
        header: "Days",
        enableSorting: false,
        cell: ({ row }) => row.original.numberOfDays ?? "-",
      },
      {
        id: "Reason",
        accessorKey: "reason",
        header: "Reason",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="max-w-[220px] truncate block" title={row.original.reason}>
            {row.original.reason || "-"}
          </span>
        ),
      },
      {
        id: "Applied On",
        accessorKey: "createdAt",
        header: "Applied On",
        enableSorting: false,
        cell: ({ row }) => formatDate(row.original.createdAt),
      },
      {
        id: "Status",
        accessorKey: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
    ],
    []
  );

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        const profileData = (res.data || null) as ProfileData | null;

        if (!profileData?.employee?.id) {
          setProfile(null);
          setLoading(false);
          return;
        }

        setProfile(profileData);

        const approverUserId =
          profileData?.userId || profileData?.id || profileData?.employee?.userId;
        let allowApprove = Boolean(profileData?.isApprover);

        if (approverUserId) {
          try {
            const pendingRes = await getPendingWfh(approverUserId);
            if (Array.isArray(pendingRes.data) && pendingRes.data.length > 0) {
              allowApprove = true;
            }
          } catch {
            // no-op
          }
        }

        setCanApprove(allowApprove);
      } catch {
        toast.error("Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const fetchBalance = useCallback(async () => {
    if (!userId) return;
    setBalanceLoading(true);
    try {
      const res = await getWfhBalance(userId);
      const raw = (res.data || {}) as {
        openingBalance?: number;
        allocated?: number;
        consumed?: number;
        used?: number;
        closingBalance?: number;
        remaining?: number;
      };
      const opening = Number(raw.openingBalance ?? raw.allocated ?? 0);
      const consumed = Number(raw.consumed ?? raw.used ?? 0);
      const closing = Number(
        raw.closingBalance ?? raw.remaining ?? Math.max(0, opening - consumed)
      );

      setBalance({
        openingBalance: opening,
        consumed,
        closingBalance: closing,
      });
    } catch {
      toast.error("Failed to load WFH balance");
    } finally {
      setBalanceLoading(false);
    }
  }, [userId]);

  const fetchWfhRequests = useCallback(async () => {
    if (!userId) return;
    setRequestsLoading(true);
    try {
      const res = await getWfhRequests(userId);
      const data = res.data?.data || res.data || [];
      const normalized = Array.isArray(data)
        ? data
            .map((item) => normalizeRequest(item as WfhResponseRow))
            .filter((item): item is WfhRequest => Boolean(item))
        : [];
      setWfhRequests(normalized);
    } catch {
      toast.error("Failed to load WFH requests");
    } finally {
      setRequestsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!profile) return;
    fetchBalance();
    fetchWfhRequests();
  }, [profile, fetchBalance, fetchWfhRequests]);

  useEffect(() => {
    setTableState((prev) => ({ ...prev, page: 0 }));
  }, [statusFilter]);

  const handleApplySubmit = async () => {
    if (!userId) {
      toast.error("User not found. Please log in again.");
      return;
    }

    if (!applyForm.date || !applyForm.endDate) {
      toast.error("Please select start and end dates.");
      return;
    }

    if (new Date(applyForm.endDate) < new Date(applyForm.date)) {
      toast.error("End date must be on or after the start date.");
      return;
    }

    setApplySubmitting(true);
    try {
      await applyWfh(userId, {
        date: applyForm.date,
        endDate: applyForm.endDate,
        reason: applyForm.reason.trim(),
      });

      toast.success("WFH request submitted successfully.");
      setApplyDialogOpen(false);
      setApplyForm({
        date: today,
        endDate: today,
        reason: "",
      });
      fetchWfhRequests();
      fetchBalance();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to submit WFH request."));
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleRefresh = () => {
    fetchWfhRequests();
    fetchBalance();
  };

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? wfhRequests
        : wfhRequests.filter(
            (r) => (r.status || "").toLowerCase() === statusFilter.toLowerCase()
          ),
    [wfhRequests, statusFilter]
  );

  const searched = useMemo(() => {
    const q = tableState.search.toLowerCase().trim();
    if (!q) return filtered;

    return filtered.filter((row) => {
      const dateText = `${formatDate(row.date)} ${formatDate(row.endDate)}`.toLowerCase();
      return (
        dateText.includes(q) ||
        (row.reason || "").toLowerCase().includes(q) ||
        (row.status || "").toLowerCase().includes(q) ||
        String(row.numberOfDays ?? "").includes(q) ||
        formatDate(row.createdAt).toLowerCase().includes(q)
      );
    });
  }, [filtered, tableState.search]);

  const pageCount = Math.max(1, Math.ceil(searched.length / tableState.pageSize));
  const pageData = searched.slice(
    tableState.page * tableState.pageSize,
    (tableState.page + 1) * tableState.pageSize
  );

  if (loading) return <PageSkeleton />;

  if (!profile) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Home className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">My WFH</h1>
            <p className="text-xs text-muted-foreground">
              Track and manage your WFH requests
            </p>
          </div>
        </div>

        <Card className="p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <Home className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Employee Profile Not Found
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                You don&apos;t have an employee profile linked to your account.
                Please contact HR to enable WFH requests.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Home className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">My WFH</h1>
            <p className="text-xs text-muted-foreground">
              Track and manage your WFH requests
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {canApprove && (
            <Button
              variant="outline"
              onClick={() => router.push("/user/wfh/approve")}
              className="gap-2"
            >
              <ClipboardList className="h-4 w-4" />
              Approve WFH
            </Button>
          )}
          <Button onClick={() => setApplyDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Apply WFH
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 p-0 md:grid-cols-3 gap-4">
        {[{
          label: "Opening",
          value: balance.openingBalance,
          tone: "text-blue-700",
          bg: "bg-blue-50",
        }, {
          label: "Used",
          value: balance.consumed,
          tone: "text-amber-700",
          bg: "bg-amber-50",
        }, {
          label: "Remaining",
          value: balance.closingBalance,
          tone: "text-green-700",
          bg: "bg-green-50",
        }].map((item) => (
          <Card key={item.label} className="overflow-hidden">
            <CardContent className={`p-5 ${item.bg}`}>
              {balanceLoading ? (
                <Skeleton className="h-10 w-24" />
              ) : (
                <>
                  <p className="text-xs text-muted-foreground uppercase tracking-wide">
                    {item.label}
                  </p>
                  <p className={`text-3xl font-semibold mt-1 ${item.tone}`}>
                    {item.value}
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              WFH Requests
            </CardTitle>
            <CardDescription>
              All your WFH applications and their status
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {requestsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={pageData}
              pageCount={pageCount}
              state={tableState}
              setState={setTableState}
            />
          )}
        </CardContent>
      </Card>

      <Dialog
        open={applyDialogOpen}
        onOpenChange={(open) => {
          setApplyDialogOpen(open);
          if (!open) {
            setApplyForm({
              date: today,
              endDate: today,
              reason: "",
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex flex-col items-center text-center gap-2 pb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Home className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle>Apply for WFH</DialogTitle>
              <DialogDescription>Submit a new work-from-home request</DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={applyForm.date}
                  min={today}
                  onChange={(e) =>
                    setApplyForm((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={applyForm.endDate}
                  min={applyForm.date || today}
                  onChange={(e) =>
                    setApplyForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Reason (optional)</Label>
              <Textarea
                rows={4}
                value={applyForm.reason}
                onChange={(e) =>
                  setApplyForm((prev) => ({ ...prev, reason: e.target.value }))
                }
                placeholder="Enter reason for WFH..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setApplyDialogOpen(false)}
              disabled={applySubmitting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleApplySubmit}
              disabled={applySubmitting}
              className="gap-2"
            >
              {applySubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
