"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Clock,
  Plus,
  Loader2,
  ClipboardList,
  Filter,
  RefreshCw,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
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
  getEmployeeByUserId,
  getTimeslipsByEmployee,
  createTimeslip,
  deleteTimeslip,
} from "@/app/api/api";
import { format } from "date-fns";

// ------- Types -------
interface TimeslipRow {
  id: string;
  date: string;
  missingType: "IN" | "OUT" | "BOTH";
  correctedIn: string | null;
  correctedOut: string | null;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
}

interface FormState {
  date: string;
  missing_type: "IN" | "OUT" | "BOTH" | "";
  corrected_in_time: string;
  corrected_out_time: string;
  reason: string;
}

interface TableState {
  page: number;
  pageSize: number;
  search: string;
  sorting: any[];
}

// ------- Status Badge -------
function StatusBadge({ status }: { status: TimeslipRow["status"] }) {
  switch (status) {
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
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ------- Missing Type Badge -------
function MissingTypeBadge({ type }: { type: TimeslipRow["missingType"] }) {
  const labels: Record<TimeslipRow["missingType"], string> = {
    IN: "Check-In",
    OUT: "Check-Out",
    BOTH: "Both",
  };
  return (
    <Badge variant="outline" className="font-normal">
      {labels[type] ?? type}
    </Badge>
  );
}

// ------- Loading Skeleton -------
function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-8 w-40" />
        </div>
        <Skeleton className="h-10 w-44" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
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
export default function UserTimeslipsPage() {
  const [employeeId, setEmployeeId] = useState<string>("");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [profileLoading, setProfileLoading] = useState(true);

  const [timeslips, setTimeslips] = useState<TimeslipRow[]>([]);
  const [timeslipsLoading, setTimeslipsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [tableState, setTableState] = useState<TableState>({
    page: 0,
    pageSize: 10,
    search: "",
    sorting: [],
  });

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormState>({
    date: "",
    missing_type: "",
    corrected_in_time: "",
    corrected_out_time: "",
    reason: "",
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TimeslipRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Column definitions (useMemo so state setters stay stable)
  const columns = useMemo<ColumnDef<TimeslipRow>[]>(
    () => [
      {
        id: "Date",
        accessorKey: "date",
        header: "Date",
        enableSorting: false,
        cell: ({ row }) => {
          try {
            return format(new Date(row.original.date), "dd MMM yyyy");
          } catch {
            return "-";
          }
        },
      },
      {
        id: "Missing",
        accessorKey: "missingType",
        header: "Missing",
        enableSorting: false,
        cell: ({ row }) => <MissingTypeBadge type={row.original.missingType} />,
      },
      {
        id: "Corrected In",
        accessorKey: "correctedIn",
        header: "Corrected In",
        enableSorting: false,
        cell: ({ row }) => {
          try {
            return row.original.correctedIn
              ? format(new Date(row.original.correctedIn), "hh:mm a")
              : "-";
          } catch {
            return "-";
          }
        },
      },
      {
        id: "Corrected Out",
        accessorKey: "correctedOut",
        header: "Corrected Out",
        enableSorting: false,
        cell: ({ row }) => {
          try {
            return row.original.correctedOut
              ? format(new Date(row.original.correctedOut), "hh:mm a")
              : "-";
          } catch {
            return "-";
          }
        },
      },
      {
        id: "Reason",
        accessorKey: "reason",
        header: "Reason",
        enableSorting: false,
        cell: ({ row }) => (
          <span
            className="max-w-[200px] truncate block"
            title={row.original.reason ?? undefined}
          >
            {row.original.reason || "-"}
          </span>
        ),
      },
      {
        id: "Submitted On",
        accessorKey: "createdAt",
        header: "Submitted On",
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
      {
        id: "Action",
        header: "Action",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === "PENDING" ? (
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-red-600"
              title="Withdraw request"
              onClick={() => {
                setDeleteTarget(row.original);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null,
      },
    ],
    []
  );

  // Fetch profile → employee ID
  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await getProfile();
        const userId = profileRes.data?.id || profileRes.data?.userId;
        if (!userId) throw new Error("No user ID");
        setOrganizationId(profileRes.data?.organizationId ?? "");
        const empRes = await getEmployeeByUserId(userId);
        const empId = empRes.data?.id || empRes.data?.data?.id;
        if (!empId) throw new Error("No employee record found");
        setEmployeeId(empId);
      } catch {
        toast.error("Failed to load your employee profile");
      } finally {
        setProfileLoading(false);
      }
    };
    init();
  }, []);

  // Fetch timeslips with snake_case → camelCase normalization
  const fetchTimeslips = useCallback(async () => {
    if (!employeeId) return;
    setTimeslipsLoading(true);
    try {
      const res = await getTimeslipsByEmployee(employeeId, { page: 1, limit: 100 });
      const raw: any[] = res.data?.data || res.data || [];
      const normalized: TimeslipRow[] = Array.isArray(raw)
        ? raw.map((item: any) => ({
            id: item.id,
            date: item.date,
            missingType: item.missingType || item.missing_type,
            correctedIn: item.correctedIn ?? item.corrected_in ?? null,
            correctedOut: item.correctedOut ?? item.corrected_out ?? null,
            reason: item.reason ?? null,
            status: item.status,
            createdAt: item.createdAt || item.created_at || "",
          }))
        : [];
      setTimeslips(normalized);
    } catch {
      toast.error("Failed to load time slips");
    } finally {
      setTimeslipsLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    if (employeeId) fetchTimeslips();
  }, [employeeId, fetchTimeslips]);

  // Reset to page 0 when status filter changes
  useEffect(() => {
    setTableState((prev) => ({ ...prev, page: 0 }));
  }, [statusFilter]);

  // Stats
  const stats = {
    total: timeslips.length,
    pending: timeslips.filter((t) => t.status === "PENDING").length,
    approved: timeslips.filter((t) => t.status === "APPROVED").length,
    rejected: timeslips.filter((t) => t.status === "REJECTED").length,
  };

  // Status filter
  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? timeslips
        : timeslips.filter((t) => t.status === statusFilter.toUpperCase()),
    [timeslips, statusFilter]
  );

  // Client-side search
  const searched = useMemo(() => {
    const q = tableState.search.toLowerCase().trim();
    if (!q) return filtered;
    return filtered.filter((row) => {
      try {
        return (
          format(new Date(row.date), "dd MMM yyyy").toLowerCase().includes(q) ||
          row.missingType.toLowerCase().includes(q) ||
          (row.reason || "").toLowerCase().includes(q) ||
          row.status.toLowerCase().includes(q) ||
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

  const pageCount = Math.max(1, Math.ceil(searched.length / tableState.pageSize));
  const pageData = searched.slice(
    tableState.page * tableState.pageSize,
    (tableState.page + 1) * tableState.pageSize
  );

  // Submit new timeslip
  const handleSubmit = async () => {
    if (!form.date) {
      toast.error("Please select the date for the correction");
      return;
    }
    if (!form.missing_type) {
      toast.error("Please select what is missing");
      return;
    }
    if (
      (form.missing_type === "IN" || form.missing_type === "BOTH") &&
      !form.corrected_in_time
    ) {
      toast.error("Please enter the corrected check-in time");
      return;
    }
    if (
      (form.missing_type === "OUT" || form.missing_type === "BOTH") &&
      !form.corrected_out_time
    ) {
      toast.error("Please enter the corrected check-out time");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("Please provide a reason for the correction");
      return;
    }

    const toISO = (date: string, time: string) =>
      new Date(`${date}T${time}:00`).toISOString();

    setSubmitting(true);
    try {
      await createTimeslip({
        employeeId,
        organizationId,
        date: new Date(form.date).toISOString(),
        missingType: form.missing_type,
        correctedIn:
          form.missing_type === "IN" || form.missing_type === "BOTH"
            ? toISO(form.date, form.corrected_in_time)
            : undefined,
        correctedOut:
          form.missing_type === "OUT" || form.missing_type === "BOTH"
            ? toISO(form.date, form.corrected_out_time)
            : undefined,
        reason: form.reason.trim(),
      });
      toast.success("Correction request submitted successfully");
      setDialogOpen(false);
      setForm({
        date: "",
        missing_type: "",
        corrected_in_time: "",
        corrected_out_time: "",
        reason: "",
      });
      fetchTimeslips();
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to submit correction request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Delete / withdraw pending timeslip
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteTimeslip(deleteTarget.id);
      toast.success("Correction request withdrawn");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      fetchTimeslips();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to withdraw request");
    } finally {
      setDeleting(false);
    }
  };

  const today = format(new Date(), "yyyy-MM-dd");

  if (profileLoading) return <PageSkeleton />;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Clock className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">My Time Slips</h1>
            <p className="text-xs text-muted-foreground">
              Submit attendance correction requests for missing check-ins or
              check-outs
            </p>
          </div>
        </div>
        <Button onClick={() => setDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          New Correction Request
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 hover:-translate-y-1 transition-transform duration-200">
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
              <ClipboardList className="w-5 h-5 text-primary" />
            </div>
            <span className="text-2xl font-extrabold text-primary">
              {stats.total}
            </span>
          </div>
          <p className="text-sm font-semibold">Total Requests</p>
          <p className="text-xs text-muted-foreground">All submissions</p>
        </Card>

        <Card className="p-5 hover:-translate-y-1 transition-transform duration-200">
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100">
              <AlertCircle className="w-5 h-5 text-amber-600" />
            </div>
            <span className="text-2xl font-extrabold text-amber-600">
              {stats.pending}
            </span>
          </div>
          <p className="text-sm font-semibold">Pending</p>
          <p className="text-xs text-muted-foreground">Awaiting approval</p>
        </Card>

        <Card className="p-5 hover:-translate-y-1 transition-transform duration-200">
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-100">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <span className="text-2xl font-extrabold text-green-600">
              {stats.approved}
            </span>
          </div>
          <p className="text-sm font-semibold">Approved</p>
          <p className="text-xs text-muted-foreground">Corrections applied</p>
        </Card>

        <Card className="p-5 hover:-translate-y-1 transition-transform duration-200">
          <div className="flex items-start justify-between mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-red-100">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-2xl font-extrabold text-red-600">
              {stats.rejected}
            </span>
          </div>
          <p className="text-sm font-semibold">Rejected</p>
          <p className="text-xs text-muted-foreground">Not approved</p>
        </Card>
      </div>

      {/* Correction Requests DataTable */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Correction Requests
            </CardTitle>
            <CardDescription>
              All your submitted attendance correction requests
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={fetchTimeslips}
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {timeslipsLoading ? (
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

      {/* New Correction Request Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Correction Request</DialogTitle>
            <DialogDescription>
              Submit a request to correct a missing attendance punch.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="ts-date">Attendance Date</Label>
              <Input
                id="ts-date"
                type="date"
                max={today}
                value={form.date}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ts-type">What is Missing?</Label>
              <Select
                value={form.missing_type}
                onValueChange={(v) =>
                  setForm((prev) => ({
                    ...prev,
                    missing_type: v as FormState["missing_type"],
                    corrected_in_time: "",
                    corrected_out_time: "",
                  }))
                }
              >
                <SelectTrigger id="ts-type">
                  <SelectValue placeholder="Select what's missing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">Check-In (missing punch-in)</SelectItem>
                  <SelectItem value="OUT">
                    Check-Out (missing punch-out)
                  </SelectItem>
                  <SelectItem value="BOTH">
                    Both (missing both punches)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(form.missing_type === "IN" || form.missing_type === "BOTH") && (
              <div className="space-y-2">
                <Label htmlFor="ts-in-time">Corrected Check-In Time</Label>
                <Input
                  id="ts-in-time"
                  type="time"
                  value={form.corrected_in_time}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      corrected_in_time: e.target.value,
                    }))
                  }
                />
              </div>
            )}
            {(form.missing_type === "OUT" || form.missing_type === "BOTH") && (
              <div className="space-y-2">
                <Label htmlFor="ts-out-time">Corrected Check-Out Time</Label>
                <Input
                  id="ts-out-time"
                  type="time"
                  value={form.corrected_out_time}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      corrected_out_time: e.target.value,
                    }))
                  }
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="ts-reason">Reason</Label>
              <Textarea
                id="ts-reason"
                placeholder="Briefly explain why the punch was missed..."
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
                setDialogOpen(false);
                setForm({
                  date: "",
                  missing_type: "",
                  corrected_in_time: "",
                  corrected_out_time: "",
                  reason: "",
                });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting ? (
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

      {/* Withdraw Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Withdraw Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to withdraw this correction request? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setDeleteTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Withdrawing...
                </>
              ) : (
                "Withdraw"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
