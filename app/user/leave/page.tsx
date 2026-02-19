"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  CalendarDays,
  Plus,
  ClipboardList,
  Filter,
  RefreshCw,
  FileText,
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
  getLeaveBalance,
  getLeaveRequests,
  getLeaveTypes,
  applyLeave,
} from "@/app/api/api";
import { format } from "date-fns";

// ------- Types -------
interface LeaveRequest {
  id: string;
  startDate?: string;
  endDate?: string;
  numberOfDays?: number;
  reason?: string;
  status?: string;
  leaveType?: string | { name?: string; id?: string };
  createdAt?: string;
}

interface LeaveBalance {
  leaveType?: { name?: string; id?: string };
  openingBalance?: number;
  closingBalance?: number;
  consumed?: number;
}

interface TableState {
  page: number;
  pageSize: number;
  search: string;
  sorting: any[];
}

const BALANCE_COLORS = [
  "#7c6cff",
  "#e87e8e",
  "#5cc8a8",
  "#e8b86c",
  "#6cb8e8",
  "#c87cff",
];

// ------- Status Badge -------
function StatusBadge({ status }: { status?: string }) {
  const normalized = status?.toUpperCase();
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

// ------- Loading Skeleton -------
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
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

// ------- Main Component -------
export default function UserLeavePage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const userId = profile?.userId ?? profile?.id ?? profile?.employee?.userId;

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [tableState, setTableState] = useState<TableState>({
    page: 0,
    pageSize: 10,
    search: "",
    sorting: [],
  });

  // Apply leave modal state
  const today = format(new Date(), "yyyy-MM-dd");
  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState<{ id: string; name: string }[]>(
    []
  );
  const [applyForm, setApplyForm] = useState({
    leaveTypeId: "",
    startDate: today,
    endDate: today,
    reason: "",
  });
  const [applySubmitting, setApplySubmitting] = useState(false);

  // Column definitions
  const columns = useMemo<ColumnDef<LeaveRequest>[]>(
    () => [
      {
        id: "Leave Type",
        accessorKey: "leaveType",
        header: "Leave Type",
        enableSorting: false,
        cell: ({ row }) => {
          const lt = row.original.leaveType;
          const name =
            typeof lt === "string" ? lt : lt?.name || "Leave";
          return <span className="font-medium">{name}</span>;
        },
      },
      {
        id: "Start Date",
        accessorKey: "startDate",
        header: "Start Date",
        enableSorting: false,
        cell: ({ row }) => {
          try {
            return row.original.startDate
              ? format(new Date(row.original.startDate), "dd MMM yyyy")
              : "-";
          } catch {
            return "-";
          }
        },
      },
      {
        id: "End Date",
        accessorKey: "endDate",
        header: "End Date",
        enableSorting: false,
        cell: ({ row }) => {
          try {
            return row.original.endDate
              ? format(new Date(row.original.endDate), "dd MMM yyyy")
              : "-";
          } catch {
            return "-";
          }
        },
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
          <span
            className="max-w-[200px] truncate block"
            title={row.original.reason}
          >
            {row.original.reason || "-"}
          </span>
        ),
      },
      {
        id: "Applied On",
        accessorKey: "createdAt",
        header: "Applied On",
        enableSorting: false,
        cell: ({ row }) => {
          try {
            return row.original.createdAt
              ? format(new Date(row.original.createdAt), "dd MMM yyyy")
              : "-";
          } catch {
            return "-";
          }
        },
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

// Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        const profileData = res.data;
        
        // Check if employee profile exists
        if (!profileData?.employee?.id) {
          setProfile(null);
          setLoading(false);
          return;
        }
        
        setProfile(profileData);
      } catch {
        toast.error("Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // Fetch leave balances
  const fetchBalances = useCallback(async () => {
    if (!userId) return;
    setBalancesLoading(true);
    try {
      const res = await getLeaveBalance(userId);
      const data = res.data;
      let parsed: LeaveBalance[] = [];
      if (Array.isArray(data)) {
        parsed = data.map((b: any) => ({
          leaveType: {
            name: b.leaveType?.name || b.leaveTypeName || "Leave",
            id: b.leaveType?.id,
          },
          openingBalance: b.allocated ?? b.openingBalance ?? 0,
          consumed: b.used ?? b.consumed ?? 0,
          closingBalance:
            b.remaining ??
            b.closingBalance ??
            (b.allocated ?? b.openingBalance ?? 0) -
              (b.used ?? b.consumed ?? 0),
        }));
      } else if (data?.balances) {
        parsed = data.balances;
      }
      setBalances(parsed);
    } catch {
      toast.error("Failed to load leave balances");
    } finally {
      setBalancesLoading(false);
    }
  }, [userId]);

  // Fetch leave requests
  const fetchLeaveRequests = useCallback(async () => {
    if (!userId) return;
    setRequestsLoading(true);
    try {
      const res = await getLeaveRequests(userId);
      const data = res.data?.data || res.data || [];
      setLeaveRequests(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load leave requests");
    } finally {
      setRequestsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (!profile) return;
    fetchBalances();
    fetchLeaveRequests();
  }, [profile, fetchBalances, fetchLeaveRequests]);

  // Fetch leave types for apply modal
  useEffect(() => {
    if (!profile?.organizationId) return;
    const fetchLeaveTypes = async () => {
      try {
        const res = await getLeaveTypes(profile.organizationId);
        const data = res.data || [];
        setLeaveTypes(Array.isArray(data) ? data : []);
      } catch {
        // non-critical
      }
    };
    fetchLeaveTypes();
  }, [profile?.organizationId]);

  // Reset to page 0 when status filter changes
  useEffect(() => {
    setTableState((prev) => ({ ...prev, page: 0 }));
  }, [statusFilter]);

  const handleApplySubmit = async () => {
    if (!userId) {
      toast.error("User not found. Please log in again.");
      return;
    }
    if (!applyForm.leaveTypeId) {
      toast.error("Please select a leave type.");
      return;
    }
    if (!applyForm.startDate || !applyForm.endDate) {
      toast.error("Please select start and end dates.");
      return;
    }
    if (new Date(applyForm.endDate) < new Date(applyForm.startDate)) {
      toast.error("End date must be on or after the start date.");
      return;
    }
    setApplySubmitting(true);
    try {
      await applyLeave(userId, {
        leaveTypeId: applyForm.leaveTypeId,
        startDate: applyForm.startDate,
        endDate: applyForm.endDate,
        reason: applyForm.reason.trim(),
      });
      toast.success("Leave request submitted successfully.");
      setApplyDialogOpen(false);
      setApplyForm({
        leaveTypeId: "",
        startDate: today,
        endDate: today,
        reason: "",
      });
      fetchLeaveRequests();
      fetchBalances();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to submit leave request."
      );
    } finally {
      setApplySubmitting(false);
    }
  };

  const handleRefresh = () => {
    fetchLeaveRequests();
    fetchBalances();
  };

  // Status filter
  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? leaveRequests
        : leaveRequests.filter(
            (r) => r.status?.toLowerCase() === statusFilter.toLowerCase()
          ),
    [leaveRequests, statusFilter]
  );

  // Client-side search
  const searched = useMemo(() => {
    const q = tableState.search.toLowerCase().trim();
    if (!q) return filtered;
    return filtered.filter((row) => {
      const typeName =
        typeof row.leaveType === "string"
          ? row.leaveType
          : row.leaveType?.name || "";
      try {
        return (
          typeName.toLowerCase().includes(q) ||
          (row.reason || "").toLowerCase().includes(q) ||
          (row.status || "").toLowerCase().includes(q) ||
          (row.startDate
            ? format(new Date(row.startDate), "dd MMM yyyy")
                .toLowerCase()
                .includes(q)
            : false) ||
          (row.endDate
            ? format(new Date(row.endDate), "dd MMM yyyy")
                .toLowerCase()
                .includes(q)
            : false) ||
          (row.createdAt
            ? format(new Date(row.createdAt), "dd MMM yyyy")
                .toLowerCase()
                .includes(q)
            : false)
        );
      } catch {
        return false;
      }
    });
  }, [filtered, tableState.search]);

  const pageCount = Math.max(
    1,
    Math.ceil(searched.length / tableState.pageSize)
  );
  const pageData = searched.slice(
    tableState.page * tableState.pageSize,
    (tableState.page + 1) * tableState.pageSize
  );

  if (loading) return <PageSkeleton />;

  // Show message when employee profile is not found
  if (!profile) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalendarDays className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold">My Leave</h1>
              <p className="text-xs text-muted-foreground">
                Track and manage your leave requests
              </p>
            </div>
          </div>
        </div>

        <Card className="p-8">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="h-16 w-16 rounded-full bg-amber-100 dark:bg-amber-900 flex items-center justify-center">
              <CalendarDays className="h-8 w-8 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-foreground">
                Employee Profile Not Found
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                You don&apos;t have an employee profile linked to your account. 
                Please contact your HR administrator to create your employee profile 
                so you can apply for leaves.
              </p>
            </div>
            <div className="pt-2">
              <p className="text-xs text-muted-foreground">
                If you believe this is an error, please contact support.
              </p>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CalendarDays className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">My Leave</h1>
            <p className="text-xs text-muted-foreground">
              Track and manage your leave requests
            </p>
          </div>
        </div>
        <Button onClick={() => setApplyDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Apply for Leave
        </Button>
      </div>

      {/* Leave Balance Cards */}
      {balancesLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : balances.length > 0 ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {balances.map((bal, index) => {
            const allocated = bal.openingBalance ?? 0;
            const used = bal.consumed ?? 0;
            const remaining = bal.closingBalance ?? allocated - used;
            const pct =
              allocated > 0
                ? Math.min(Math.round((used / allocated) * 100), 100)
                : 0;
            const color = BALANCE_COLORS[index % BALANCE_COLORS.length];
            const name = bal.leaveType?.name || `Leave ${index + 1}`;
            return (
              <Card
                key={name}
                className="p-5 hover:-translate-y-1 transition-transform duration-200"
              >
                <div className="flex items-start justify-between mb-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: `${color}20` }}
                  >
                    <CalendarDays className="w-5 h-5" style={{ color }} />
                  </div>
                  <span
                    className="text-2xl font-extrabold"
                    style={{ color }}
                  >
                    {remaining}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground truncate">
                  {name}
                </p>
                <p className="text-xs text-muted-foreground mb-2">
                  Used {used} / {allocated}
                </p>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-5">
          <p className="text-sm text-muted-foreground text-center py-4">
            No leave balance data available. Contact HR to initialize your leave
            balance.
          </p>
        </Card>
      )}

      {/* Leave History DataTable */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Leave History
            </CardTitle>
            <CardDescription>
              All your leave applications and their status
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
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

      {/* Apply Leave Modal */}
      <Dialog
        open={applyDialogOpen}
        onOpenChange={(open) => {
          setApplyDialogOpen(open);
          if (!open)
            setApplyForm({
              leaveTypeId: "",
              startDate: today,
              endDate: today,
              reason: "",
            });
        }}
      >
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <div className="flex flex-col items-center text-center gap-2 pb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle>Apply for Leave</DialogTitle>
              <DialogDescription>Submit a new leave request</DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Leave Type</Label>
              <Select
                value={applyForm.leaveTypeId}
                onValueChange={(v) =>
                  setApplyForm((prev) => ({ ...prev, leaveTypeId: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No leave types available
                    </SelectItem>
                  ) : (
                    leaveTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Input
                  type="date"
                  value={applyForm.startDate}
                  min={today}
                  onChange={(e) =>
                    setApplyForm((prev) => ({
                      ...prev,
                      startDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>End Date</Label>
                <Input
                  type="date"
                  value={applyForm.endDate}
                  min={applyForm.startDate || today}
                  onChange={(e) =>
                    setApplyForm((prev) => ({
                      ...prev,
                      endDate: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Reason{" "}
                <span className="text-muted-foreground text-xs">
                  (optional)
                </span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Enter reason for leave..."
                value={applyForm.reason}
                onChange={(e) =>
                  setApplyForm((prev) => ({ ...prev, reason: e.target.value }))
                }
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setApplyDialogOpen(false);
                setApplyForm({
                  leaveTypeId: "",
                  startDate: today,
                  endDate: today,
                  reason: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApplySubmit}
              disabled={applySubmitting}
              className="gap-2"
            >
              {applySubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Application
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
