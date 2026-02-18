"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays,
  Plus,
  Loader2,
  ClipboardList,
  Filter,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
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
import {
  getProfile,
  getLeaveBalance,
  getLeaveTypes,
  getLeaveRequests,
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

interface LeaveType {
  id: string;
  name: string;
}

const BALANCE_COLORS = ["#7c6cff", "#e87e8e", "#5cc8a8", "#e8b86c", "#6cb8e8", "#c87cff"];

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

  const [balances, setBalances] = useState<LeaveBalance[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);

  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);

  const [applyDialogOpen, setApplyDialogOpen] = useState(false);
  const [applying, setApplying] = useState(false);
  const [form, setForm] = useState({
    leaveTypeId: "",
    startDate: "",
    endDate: "",
    reason: "",
  });

  // Fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        setProfile(res.data);
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
    if (!profile?.id) return;
    setBalancesLoading(true);
    try {
      const res = await getLeaveBalance(profile.id);
      const data = res.data;
      let parsed: LeaveBalance[] = [];
      if (Array.isArray(data)) {
        parsed = data.map((b: any) => ({
          leaveType: { name: b.leaveType?.name || b.leaveTypeName || "Leave", id: b.leaveType?.id },
          openingBalance: b.allocated ?? b.openingBalance ?? 0,
          consumed: b.used ?? b.consumed ?? 0,
          closingBalance: b.remaining ?? b.closingBalance ?? ((b.allocated ?? b.openingBalance ?? 0) - (b.used ?? b.consumed ?? 0)),
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
  }, [profile?.id]);

  // Fetch leave requests
  const fetchLeaveRequests = useCallback(async () => {
    if (!profile?.id) return;
    setRequestsLoading(true);
    try {
      const res = await getLeaveRequests(profile.id);
      const data = res.data?.data || res.data || [];
      setLeaveRequests(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load leave requests");
    } finally {
      setRequestsLoading(false);
    }
  }, [profile?.id]);

  // Fetch leave types for apply form
  const fetchLeaveTypes = useCallback(async () => {
    if (!profile?.organizationId) return;
    try {
      const res = await getLeaveTypes(profile.organizationId);
      const data = res.data || [];
      setLeaveTypes(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Failed to load leave types");
    }
  }, [profile?.organizationId]);

  useEffect(() => {
    if (!profile) return;
    fetchBalances();
    fetchLeaveRequests();
    fetchLeaveTypes();
  }, [profile, fetchBalances, fetchLeaveRequests, fetchLeaveTypes]);

  // Handle submit
  const handleApplyLeave = async () => {
    if (!form.leaveTypeId) { toast.error("Please select a leave type"); return; }
    if (!form.startDate) { toast.error("Please select a start date"); return; }
    if (!form.endDate) { toast.error("Please select an end date"); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error("End date cannot be before start date");
      return;
    }
    if (!form.reason.trim()) { toast.error("Please provide a reason"); return; }

    setApplying(true);
    try {
      await applyLeave(profile.id, {
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
      });
      toast.success("Leave application submitted successfully");
      setApplyDialogOpen(false);
      setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
      fetchLeaveRequests();
      fetchBalances();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to submit leave application");
    } finally {
      setApplying(false);
    }
  };

  const handleRefresh = () => {
    fetchLeaveRequests();
    fetchBalances();
  };

  const filteredRequests =
    statusFilter === "all"
      ? leaveRequests
      : leaveRequests.filter((r) => r.status?.toLowerCase() === statusFilter.toLowerCase());

  if (loading) return <PageSkeleton />;

  const today = format(new Date(), "yyyy-MM-dd");

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
            const remaining = bal.closingBalance ?? (allocated - used);
            const pct = allocated > 0 ? Math.min(Math.round((used / allocated) * 100), 100) : 0;
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
                  <span className="text-2xl font-extrabold" style={{ color }}>
                    {remaining}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground truncate">{name}</p>
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
            No leave balance data available. Contact HR to initialize your leave balance.
          </p>
        </Card>
      )}

      {/* Leave History Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Leave History
            </CardTitle>
            <CardDescription>All your leave applications and their status</CardDescription>
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
            <Button variant="outline" size="icon" onClick={handleRefresh} title="Refresh">
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
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Leave Type</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Days</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Applied On</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-10"
                    >
                      No leave requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRequests.map((req) => {
                    const typeName =
                      typeof req.leaveType === "string"
                        ? req.leaveType
                        : req.leaveType?.name || "Leave";
                    return (
                      <TableRow key={req.id}>
                        <TableCell className="font-medium">{typeName}</TableCell>
                        <TableCell>
                          {req.startDate
                            ? format(new Date(req.startDate), "dd MMM yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {req.endDate
                            ? format(new Date(req.endDate), "dd MMM yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>{req.numberOfDays ?? "-"}</TableCell>
                        <TableCell
                          className="max-w-[200px] truncate"
                          title={req.reason}
                        >
                          {req.reason || "-"}
                        </TableCell>
                        <TableCell>
                          {req.createdAt
                            ? format(new Date(req.createdAt), "dd MMM yyyy")
                            : "-"}
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={req.status} />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Apply for Leave Dialog */}
      <Dialog open={applyDialogOpen} onOpenChange={setApplyDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Apply for Leave</DialogTitle>
            <DialogDescription>
              Fill in the details below to submit your leave request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="leaveType">Leave Type</Label>
              <Select
                value={form.leaveTypeId}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, leaveTypeId: value }))
                }
              >
                <SelectTrigger id="leaveType">
                  <SelectValue placeholder="Select leave type" />
                </SelectTrigger>
                <SelectContent>
                  {leaveTypes.length === 0 ? (
                    <SelectItem value="_none" disabled>
                      No leave types available
                    </SelectItem>
                  ) : (
                    leaveTypes.map((lt) => (
                      <SelectItem key={lt.id} value={lt.id}>
                        {lt.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  min={today}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  min={form.startDate || today}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Textarea
                id="reason"
                placeholder="Briefly describe the reason for your leave..."
                value={form.reason}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, reason: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApplyDialogOpen(false);
                setForm({ leaveTypeId: "", startDate: "", endDate: "", reason: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleApplyLeave} disabled={applying}>
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
