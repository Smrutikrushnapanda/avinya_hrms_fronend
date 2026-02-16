"use client";

import { useEffect, useState } from "react";
import { Check, X, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getEmployees, getProfile, getTimeslips, getTimeslipsByApprover, approveTimeslip, batchUpdateTimeslipStatuses } from "@/app/api/api";

interface TimeslipApproval {
  id: string;
  action: "PENDING" | "APPROVED" | "REJECTED";
  remarks: string | null;
  acted_at: string | null;
  total_steps?: number;
  current_step?: boolean;
}

interface TimeslipRow {
  id: string;
  date: string;
  missing_type: "IN" | "OUT" | "BOTH";
  corrected_in: string | null;
  corrected_out: string | null;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  created_at: string;
  employee: {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    workEmail?: string;
    department?: { name?: string };
    designation?: { name?: string };
  };
  approval: TimeslipApproval | null;
}

export default function TimeslipsApprovalPage() {
  const [approverEmployeeId, setApproverEmployeeId] = useState<string>("");
  const [adminOverride, setAdminOverride] = useState(false);
  const [timeslips, setTimeslips] = useState<TimeslipRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionTarget, setActionTarget] = useState<TimeslipRow | null>(null);
  const [actionType, setActionType] = useState<"APPROVED" | "REJECTED">("APPROVED");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const profile = await getProfile();
        const orgId = profile.data?.organizationId || "";
        const userId = profile.data?.userId || "";
        if (!orgId || !userId) return;
        const empRes = await getEmployees(orgId);
        const list = empRes.data || empRes.data?.data || [];
        const emp = list.find((e: any) => e.userId === userId);
        if (!emp?.id) {
          setAdminOverride(true);
          return;
        }
        setApproverEmployeeId(emp.id);
      } catch {
        toast.error("Failed to load approver profile");
      }
    };
    init();
  }, []);

  const fetchTimeslips = async () => {
    if (!approverEmployeeId && !adminOverride) return;
    setLoading(true);
    try {
      if (adminOverride) {
        const res = await getTimeslips();
        const all = (res.data || []) as TimeslipRow[];
        const filtered = statusFilter
          ? all.filter((t) => t.status === statusFilter)
          : all;
        const total = filtered.length;
        const start = (page - 1) * limit;
        const data = filtered.slice(start, start + limit);
        setTimeslips(data);
        setTotalPages(Math.max(1, Math.ceil(total / limit)));
      } else {
        const res = await getTimeslipsByApprover(approverEmployeeId, {
          status: statusFilter,
          page,
          limit,
        });
        const data = res.data?.data || [];
        const pagination = res.data?.pagination || {};
        setTimeslips(data);
        setTotalPages(pagination.totalPages || 1);
      }
    } catch {
      toast.error("Failed to load timeslips");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (approverEmployeeId || adminOverride) fetchTimeslips();
  }, [approverEmployeeId, adminOverride, statusFilter, page]);

  const openActionDialog = (row: TimeslipRow, type: "APPROVED" | "REJECTED") => {
    setActionTarget(row);
    setActionType(type);
    setRemarks("");
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!actionTarget) return;
    try {
      if (adminOverride) {
        await batchUpdateTimeslipStatuses({
          timeslipIds: [actionTarget.id],
          status: actionType,
        });
      } else {
        await approveTimeslip(actionTarget.id, {
          approverId: approverEmployeeId,
          action: actionType,
          remarks: remarks || undefined,
        });
      }
      toast.success(`Timeslip ${actionType.toLowerCase()}`);
      setActionDialogOpen(false);
      fetchTimeslips();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to update timeslip");
    }
  };

  const statusBadge = (status: TimeslipRow["status"]) => {
    const map = {
      PENDING: "bg-yellow-100 text-yellow-800",
      APPROVED: "bg-green-100 text-green-800",
      REJECTED: "bg-red-100 text-red-800",
    } as const;
    return <Badge className={map[status]}>{status}</Badge>;
  };

  const canAct = (row: TimeslipRow) =>
    row.status === "PENDING" && (row.approval?.current_step ?? true);

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Timeslip Approvals
          </CardTitle>
          <div className="flex items-center gap-3">
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v as any);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="p-3 text-left">Date</th>
                  <th className="p-3 text-left">Employee</th>
                  <th className="p-3 text-left">Missing</th>
                  <th className="p-3 text-left">Corrected In</th>
                  <th className="p-3 text-left">Corrected Out</th>
                  <th className="p-3 text-left">Status</th>
                  <th className="p-3 text-left">Reason</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {timeslips.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="p-3">
                      {new Date(row.date).toLocaleDateString()}
                    </td>
                    <td className="p-3">
                      {row.employee.firstName} {row.employee.lastName}
                    </td>
                    <td className="p-3">{row.missing_type}</td>
                    <td className="p-3">
                      {row.corrected_in
                        ? new Date(row.corrected_in).toLocaleTimeString()
                        : "-"}
                    </td>
                    <td className="p-3">
                      {row.corrected_out
                        ? new Date(row.corrected_out).toLocaleTimeString()
                        : "-"}
                    </td>
                    <td className="p-3">{statusBadge(row.status)}</td>
                    <td className="p-3 max-w-[240px] truncate">
                      {row.reason || "-"}
                    </td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog(row, "APPROVED")}
                          disabled={!canAct(row)}
                        >
                          <Check className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openActionDialog(row, "REJECTED")}
                          disabled={!canAct(row)}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {timeslips.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-muted-foreground">
                      {loading ? "Loading..." : "No timeslips found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "APPROVED" ? "Approve Timeslip" : "Reject Timeslip"}
            </DialogTitle>
            <DialogDescription>
              Add optional remarks for the employee.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Remarks (optional)"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAction}>
              {actionType === "APPROVED" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
