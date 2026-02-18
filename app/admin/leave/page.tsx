"use client";

import { useEffect, useState, useCallback } from "react";
import {
  CalendarDays,
  Check,
  X,
  Trash2,
  Plus,
  Loader2,
  Users,
  ClipboardList,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  getEmployees,
  getLeaveTypes,
  getAllLeaveRequests,
  approveLeave,
  createApprovalAssignment,
  getApprovalAssignments,
  getApprovalAssignmentsByOrg,
  deleteApprovalAssignment,
  initializeLeaveBalance,
  setLeaveBalanceTemplates,
  getLeaveBalanceTemplates,
} from "@/app/api/api";
import { format } from "date-fns";

// ------- Types -------
interface LeaveRequest {
  id: string;
  userId: string;
  startDate?: string;
  endDate?: string;
  fromDate?: string;
  toDate?: string;
  days?: number;
  totalDays?: number;
  duration?: number;
  reason?: string;
  leaveType?: string | { name?: string };
  status?: string;
  remarks?: string;
  createdAt?: string;
  user?: {
    firstName: string;
    lastName: string;
  };
}

interface Employee {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  workEmail?: string;
  employeeCode?: string;
  employmentType?: string | null;
}

interface ApprovalAssignment {
  id: string;
  userId: string;
  approverId: string;
  organizationId: string;
  level: number;
  user?: {
    firstName: string;
    lastName: string;
  };
  approver?: {
    firstName: string;
    lastName: string;
  };
}

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERN", label: "Intern" },
  { value: "CONSULTANT", label: "Consultant" },
];

// ------- Loading Skeleton -------
function PageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-3">
        <Skeleton className="h-7 w-7" />
        <Skeleton className="h-8 w-48" />
      </div>
      <Skeleton className="h-10 w-64" />
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

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
    default:
      return <Badge variant="outline">{status || "Unknown"}</Badge>;
  }
}

// ------- Helper: get employee full name -------
function getFullName(
  user?: { firstName: string; lastName: string } | null
): string {
  if (!user) return "Unknown";
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown";
}

// ------- Main Component -------
export default function LeaveManagementPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("requests");

  // Requests tab state
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<LeaveRequest | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");

  // Assignments tab state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<ApprovalAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  // Balances tab state
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [employmentTypes, setEmploymentTypes] = useState<string[]>([]);
  const [selectedEmploymentType, setSelectedEmploymentType] = useState<string>("");
  const [balanceInputs, setBalanceInputs] = useState<Record<string, number>>({});
  const [applyingBalances, setApplyingBalances] = useState(false);
  const [applyProgress, setApplyProgress] = useState({ done: 0, total: 0 });
  const [loadingTemplates, setLoadingTemplates] = useState(false);
  const [allTemplatesLoading, setAllTemplatesLoading] = useState(false);
  const [allTemplates, setAllTemplates] = useState<any[]>([]);

  // Add assignment dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    userId: "",
    approverId: "",
    level: "1",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // ------- Fetch profile on mount -------
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        setProfile(res.data);
      } catch (error: any) {
        console.error("Failed to fetch profile:", error);
        toast.error("Failed to fetch user profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ------- Fetch leave requests -------
  const fetchLeaveRequests = useCallback(async () => {
    if (!profile?.organizationId) return;
    setRequestsLoading(true);
    try {
      const res = await getAllLeaveRequests(profile.organizationId);
      const data = res.data?.data || res.data || [];
      setLeaveRequests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to fetch leave requests:", error);
      toast.error("Failed to load leave requests");
    } finally {
      setRequestsLoading(false);
    }
  }, [profile?.organizationId]);

  // ------- Fetch employees -------
  const fetchEmployees = useCallback(async () => {
    if (!profile?.organizationId) return;
    try {
      const res = await getEmployees(profile.organizationId);
      const data = res.data?.data || res.data || [];
      const list = Array.isArray(data) ? data : [];
      setEmployees(list);
      const types = Array.from(
        new Set(
          list
            .map((e: Employee) => e.employmentType)
            .filter((t): t is string => typeof t === "string" && t.trim().length > 0)
        )
      );
      if (types.length > 1) {
        setEmploymentTypes(types);
      } else {
        setEmploymentTypes(EMPLOYMENT_TYPE_OPTIONS.map((t) => t.value));
      }
    } catch (error: any) {
      console.error("Failed to fetch employees:", error);
      toast.error("Failed to load employees");
    }
  }, [profile?.organizationId]);

  const fetchLeaveTypes = useCallback(async () => {
    if (!profile?.organizationId) return;
    try {
      const res = await getLeaveTypes(profile.organizationId);
      const data = res.data || [];
      const list = Array.isArray(data) ? data : [];
      setLeaveTypes(list);
      const initialBalances: Record<string, number> = {};
      list.forEach((lt: any) => {
        initialBalances[lt.id] = 0;
      });
      setBalanceInputs((prev) => ({ ...initialBalances, ...prev }));
    } catch (error: any) {
      console.error("Failed to fetch leave types:", error);
      toast.error("Failed to load leave types");
    }
  }, [profile?.organizationId]);

  // ------- Fetch approval assignments -------
  const fetchAssignments = useCallback(async () => {
    if (!profile?.organizationId) return;
    setAssignmentsLoading(true);
    try {
      const res = await getApprovalAssignmentsByOrg(profile.organizationId);
      const data = res.data?.data || res.data || [];
      setAssignments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to fetch approval assignments:", error);
      toast.error("Failed to load approval assignments");
    } finally {
      setAssignmentsLoading(false);
    }
  }, [profile?.userId]);

  useEffect(() => {
    if (!profile) return;
    fetchLeaveRequests();
    fetchEmployees();
    fetchAssignments();
    fetchLeaveTypes();
  }, [profile, fetchLeaveRequests, fetchEmployees, fetchAssignments, fetchLeaveTypes]);

  useEffect(() => {
    const loadTemplates = async () => {
      if (!profile?.organizationId || !selectedEmploymentType) return;
      setLoadingTemplates(true);
      try {
        const res = await getLeaveBalanceTemplates(
          profile.organizationId,
          selectedEmploymentType
        );
        const data = res.data || [];
        const next: Record<string, number> = {};
        leaveTypes.forEach((lt) => {
          next[lt.id] = 0;
        });
        data.forEach((t: any) => {
          if (t.leaveType?.id) {
            next[t.leaveType.id] = t.openingBalance ?? 0;
          }
        });
        setBalanceInputs(next);
      } catch (error) {
        toast.error("Failed to load templates");
      } finally {
        setLoadingTemplates(false);
      }
    };
    loadTemplates();
  }, [profile?.organizationId, selectedEmploymentType, leaveTypes]);

  useEffect(() => {
    const loadAllTemplates = async () => {
      if (!profile?.organizationId) return;
      setAllTemplatesLoading(true);
      try {
        const res = await getLeaveBalanceTemplates(profile.organizationId);
        const data = res.data || [];
        setAllTemplates(Array.isArray(data) ? data : []);
      } catch (error) {
        toast.error("Failed to load template table");
      } finally {
        setAllTemplatesLoading(false);
      }
    };
    loadAllTemplates();
  }, [profile?.organizationId]);

  // ------- Approve / Reject -------
  const handleApprove = async (req: LeaveRequest) => {
    if (!profile?.userId) return;
    setActionLoading(req.id);
    try {
      await approveLeave(req.id, profile.userId, { approve: true, remarks: "Approved" });
      toast.success("Leave request approved");
      fetchLeaveRequests();
    } catch (error: any) {
      console.error("Approve leave failed:", error);
      toast.error("Failed to approve request");
    } finally {
      setActionLoading(null);
    }
  };

  const openRejectDialog = (req: LeaveRequest) => {
    setRejectTarget(req);
    setRejectRemarks("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectTarget || !profile?.userId) return;
    setActionLoading(rejectTarget.id);
    try {
      await approveLeave(rejectTarget.id, profile.userId, {
        approve: false,
        remarks: rejectRemarks || "Rejected",
      });
      toast.success("Leave request rejected");
      setRejectDialogOpen(false);
      setRejectTarget(null);
      fetchLeaveRequests();
    } catch (error: any) {
      console.error("Reject leave failed:", error);
      toast.error("Failed to reject request");
    } finally {
      setActionLoading(null);
    }
  };

  // ------- Create assignment -------
  const handleCreateAssignment = async () => {
    if (!profile?.organizationId) return;
    if (!newAssignment.userId || !newAssignment.approverId) {
      toast.error("Select user and approver");
      return;
    }
    setCreateLoading(true);
    try {
      await createApprovalAssignment({
        userId: newAssignment.userId,
        approverId: newAssignment.approverId,
        organizationId: profile.organizationId,
        level: Number(newAssignment.level || "1"),
      });
      toast.success("Assignment created");
      setAddDialogOpen(false);
      setNewAssignment({ userId: "", approverId: "", level: "1" });
      fetchAssignments();
    } catch (error: any) {
      console.error("Create assignment failed:", error);
      toast.error("Failed to create assignment");
    } finally {
      setCreateLoading(false);
    }
  };

  const handleDeleteAssignment = async (id: string) => {
    setDeleteLoading(id);
    try {
      await deleteApprovalAssignment(id);
      toast.success("Assignment deleted");
      fetchAssignments();
    } catch (error: any) {
      console.error("Delete assignment failed:", error);
      toast.error("Failed to delete assignment");
    } finally {
      setDeleteLoading(null);
    }
  };

  const handleApplyBalances = async () => {
    if (!selectedEmploymentType) {
      toast.error("Select an employment type");
      return;
    }
    if (!leaveTypes.length) {
      toast.error("No leave types available");
      return;
    }
    const targetEmployees = employees.filter(
      (e) => e.employmentType === selectedEmploymentType
    );

    setApplyingBalances(true);
    try {
      await setLeaveBalanceTemplates({
        organizationId: profile.organizationId,
        employmentType: selectedEmploymentType,
        items: leaveTypes.map((lt) => ({
          leaveTypeId: lt.id,
          openingBalance: Number(balanceInputs[lt.id] ?? 0),
        })),
      });

      if (targetEmployees.length) {
        setApplyProgress({ done: 0, total: targetEmployees.length * leaveTypes.length });
        let done = 0;
        for (const emp of targetEmployees) {
          for (const lt of leaveTypes) {
            const openingBalance = Number(balanceInputs[lt.id] ?? 0);
            await initializeLeaveBalance({
              userId: emp.userId,
              leaveTypeId: lt.id,
              openingBalance,
            });
            done += 1;
            setApplyProgress({ done, total: targetEmployees.length * leaveTypes.length });
          }
        }
        toast.success("Leave balances applied to existing employees");
      } else {
        toast.success("Template saved. It will apply to new employees.");
      }
    } catch (error: any) {
      console.error("Apply balances failed:", error);
      toast.error("Failed to apply leave balances");
    } finally {
      setApplyingBalances(false);
    }
  };

  const filteredRequests =
    statusFilter === "all"
      ? leaveRequests
      : leaveRequests.filter(
          (r) => r.status?.toLowerCase() === statusFilter.toLowerCase()
        );

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <CalendarDays className="h-7 w-7 text-primary" />
        <h1 className="text-2xl font-semibold">Leave Management</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="assignments" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Approvers
          </TabsTrigger>
          <TabsTrigger value="balances" className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            Balances
          </TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leave Requests</CardTitle>
              <CardDescription>Review and approve leave requests</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Filter status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

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
                      <TableHead>Employee</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead>Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRequests.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No leave requests found
                        </TableCell>
                      </TableRow>
                    )}
                    {filteredRequests.map((req) => {
                      const start = req.startDate || req.fromDate;
                      const end = req.endDate || req.toDate;
                      const days = req.totalDays ?? req.days ?? req.duration ?? "-";
                      const type =
                        typeof req.leaveType === "string"
                          ? req.leaveType
                          : req.leaveType?.name || "Leave";
                      return (
                        <TableRow key={req.id}>
                          <TableCell>{getFullName(req.user)}</TableCell>
                          <TableCell>{type}</TableCell>
                          <TableCell>
                            {start ? format(new Date(start), "dd MMM yyyy") : "-"}{" "}
                            {end ? `- ${format(new Date(end), "dd MMM yyyy")}` : ""}
                          </TableCell>
                          <TableCell>{days}</TableCell>
                          <TableCell>
                            <StatusBadge status={req.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            {req.status?.toUpperCase() === "PENDING" ? (
                              <div className="flex justify-end gap-2">
                                <Button
                                  size="sm"
                                  className="gap-1"
                                  onClick={() => handleApprove(req)}
                                  disabled={actionLoading === req.id}
                                >
                                  {actionLoading === req.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Check className="h-4 w-4" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  className="gap-1"
                                  onClick={() => openRejectDialog(req)}
                                  disabled={actionLoading === req.id}
                                >
                                  <X className="h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                No actions
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Approval Assignments</CardTitle>
                <CardDescription>Manage leave approval flow</CardDescription>
              </div>
              <Button
                className="gap-2"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
                Add Assignment
              </Button>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Approver</TableHead>
                      <TableHead>Level</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignments.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          No assignments found
                        </TableCell>
                      </TableRow>
                    )}
                    {assignments.map((as) => (
                      <TableRow key={as.id}>
                        <TableCell>{getFullName(as.user)}</TableCell>
                        <TableCell>{getFullName(as.approver)}</TableCell>
                        <TableCell>{as.level}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1"
                            onClick={() => handleDeleteAssignment(as.id)}
                            disabled={deleteLoading === as.id}
                          >
                            {deleteLoading === as.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            Delete
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Leave Balances by Employment Type</CardTitle>
              <CardDescription>
                Set default opening balances and apply to employees by employment type.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select
                    value={selectedEmploymentType}
                    onValueChange={setSelectedEmploymentType}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {employmentTypes.map((type) => {
                        const label =
                          EMPLOYMENT_TYPE_OPTIONS.find((t) => t.value === type)?.label ||
                          type;
                        return (
                        <SelectItem key={type} value={type}>
                          {label}
                        </SelectItem>
                      )})}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              {leaveTypes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No leave types found.</p>
              ) : (
                <div className="space-y-3">
                  {leaveTypes.map((lt) => (
                    <div key={lt.id} className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium">{lt.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Opening balance to apply
                        </p>
                      </div>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={String(balanceInputs[lt.id] ?? 0)}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                          setBalanceInputs((prev) => ({
                            ...prev,
                            [lt.id]: digitsOnly === "" ? 0 : Number(digitsOnly),
                          }));
                        }}
                        className="w-28"
                        disabled={loadingTemplates}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {applyingBalances
                    ? `Applying ${applyProgress.done}/${applyProgress.total}`
                    : "This will overwrite existing opening balances."}
                </div>
                <Button
                  onClick={handleApplyBalances}
                  disabled={applyingBalances || !selectedEmploymentType || loadingTemplates}
                >
                  {applyingBalances ? "Applying..." : "Apply to Employees"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Template Summary</CardTitle>
              <CardDescription>
                Leave balance templates by employment type.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allTemplatesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employment Type</TableHead>
                      {leaveTypes.map((lt) => (
                        <TableHead key={lt.id}>{lt.name}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {EMPLOYMENT_TYPE_OPTIONS.map((et) => {
                      const rowTemplates = allTemplates.filter(
                        (t) => t.employmentType === et.value
                      );
                      const hasAny = rowTemplates.length > 0;
                      if (!hasAny) {
                        return (
                          <TableRow key={et.value}>
                            <TableCell className="font-medium">{et.label}</TableCell>
                            {leaveTypes.map((lt) => (
                              <TableCell key={`${et.value}-${lt.id}`}>-</TableCell>
                            ))}
                          </TableRow>
                        );
                      }
                      return (
                        <TableRow key={et.value}>
                          <TableCell className="font-medium">{et.label}</TableCell>
                          {leaveTypes.map((lt) => {
                            const match = rowTemplates.find(
                              (t) => t.leaveType?.id === lt.id
                            );
                            return (
                              <TableCell key={`${et.value}-${lt.id}`}>
                                {match?.openingBalance ?? "-"}
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      );
                    })}
                    {leaveTypes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center text-muted-foreground">
                          No leave types found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Leave Request</DialogTitle>
            <DialogDescription>
              Add a remark for rejecting this request (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Input
              id="remarks"
              value={rejectRemarks}
              onChange={(e) => setRejectRemarks(e.target.value)}
              placeholder="Reason for rejection"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading === rejectTarget?.id}
            >
              {actionLoading === rejectTarget?.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Approval Assignment</DialogTitle>
            <DialogDescription>
              Assign an approver for leave requests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={newAssignment.userId}
                onValueChange={(value) =>
                  setNewAssignment((prev) => ({ ...prev, userId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.userId} value={emp.userId}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Approver</Label>
              <Select
                value={newAssignment.approverId}
                onValueChange={(value) =>
                  setNewAssignment((prev) => ({ ...prev, approverId: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select approver" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.userId} value={emp.userId}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Approval Level</Label>
              <Select
                value={newAssignment.level}
                onValueChange={(value) =>
                  setNewAssignment((prev) => ({ ...prev, level: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1</SelectItem>
                  <SelectItem value="2">Level 2</SelectItem>
                  <SelectItem value="3">Level 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateAssignment} disabled={createLoading}>
              {createLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
