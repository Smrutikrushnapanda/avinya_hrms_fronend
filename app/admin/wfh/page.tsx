"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Home,
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
  getAllWfhRequests,
  approveWfh,
  createWfhAssignment,
  getWfhAssignments,
  deleteWfhAssignment,
  getOrganization,
  updateOrganization,
  setWfhBalanceTemplates,
  getWfhBalanceTemplates,
  initializeWfhBalance,
} from "@/app/api/api";
import { format } from "date-fns";

// ------- Types -------
interface WfhRequest {
  id: string;
  userId: string;
  date?: string;
  startDate?: string;
  endDate: string;
  numberOfDays?: number;
  days?: number;
  reason: string;
  status: string;
  remarks?: string;
  createdAt: string;
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
  employmentType?: string;
}

interface WfhAssignment {
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
function StatusBadge({ status }: { status: string }) {
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
      return <Badge variant="outline">{status}</Badge>;
  }
}

// ------- Helper: get employee full name -------
function getFullName(
  user?: { firstName: string; lastName: string } | null
): string {
  if (!user) return "Unknown";
  return `${user.firstName || ""} ${user.lastName || ""}`.trim() || "Unknown";
}

const EMPLOYMENT_TYPE_OPTIONS = [
  { value: "FULL_TIME", label: "Full Time" },
  { value: "PART_TIME", label: "Part Time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERN", label: "Intern" },
  { value: "CONSULTANT", label: "Consultant" },
];

// ------- Main Component -------
export default function WfhManagementPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("requests");
  const [wfhApprovalMode, setWfhApprovalMode] = useState<"ADMIN" | "MANAGER">("MANAGER");
  const [savingApprovalMode, setSavingApprovalMode] = useState(false);

  // Requests tab state
  const [wfhRequests, setWfhRequests] = useState<WfhRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Reject dialog state
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<WfhRequest | null>(null);
  const [rejectRemarks, setRejectRemarks] = useState("");

  // Assignments tab state
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [assignments, setAssignments] = useState<WfhAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);

  // Add assignment dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newAssignment, setNewAssignment] = useState({
    userId: "",
    approverId: "",
    level: "1",
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);

  // Balance tab state
  const [selectedEmploymentType, setSelectedEmploymentType] = useState("");
  const [wfhBalanceInput, setWfhBalanceInput] = useState(0);
  const [wfhTemplates, setWfhTemplates] = useState<any[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [applyingBalance, setApplyingBalance] = useState(false);
  const [applyProgress, setApplyProgress] = useState({ done: 0, total: 0 });

  // ------- Fetch profile on mount -------
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        setProfile(res.data);
        if (res.data?.organizationId) {
          const orgRes = await getOrganization(res.data.organizationId);
          const mode = (orgRes.data?.wfhApprovalMode || "MANAGER").toUpperCase();
          setWfhApprovalMode(mode === "ADMIN" ? "ADMIN" : "MANAGER");
        }
      } catch (error: any) {
        console.error("Failed to fetch profile:", error);
        toast.error("Failed to fetch user profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ------- Fetch WFH requests -------
  const fetchWfhRequests = useCallback(async () => {
    if (!profile?.organizationId) return;
    setRequestsLoading(true);
    try {
      const res = await getAllWfhRequests(profile.organizationId);
      const data = res.data?.data || res.data || [];
      setWfhRequests(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to fetch WFH requests:", error);
      toast.error("Failed to load WFH requests");
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
      setEmployees(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to fetch employees:", error);
    }
  }, [profile?.organizationId]);

  // ------- Fetch assignments -------
  const fetchAssignments = useCallback(async () => {
    if (!profile?.organizationId || employees.length === 0) return;
    setAssignmentsLoading(true);
    try {
      const allAssignments: WfhAssignment[] = [];
      for (const emp of employees) {
        try {
          const res = await getWfhAssignments(emp.userId);
          const data = res.data?.data || res.data || [];
          const empAssignments = Array.isArray(data) ? data : [];
          allAssignments.push(...empAssignments);
        } catch {
          // Employee may have no assignments
        }
      }
      // Deduplicate by id
      const uniqueMap = new Map<string, WfhAssignment>();
      allAssignments.forEach((a) => {
        if (a.id) uniqueMap.set(a.id, a);
      });
      setAssignments(Array.from(uniqueMap.values()));
    } catch (error: any) {
      console.error("Failed to fetch assignments:", error);
      toast.error("Failed to load approval assignments");
    } finally {
      setAssignmentsLoading(false);
    }
  }, [profile?.organizationId, employees]);

  // ------- Fetch WFH balance templates -------
  const fetchWfhTemplates = useCallback(async () => {
    if (!profile?.organizationId) return;
    setTemplatesLoading(true);
    try {
      const res = await getWfhBalanceTemplates(profile.organizationId);
      const data = res.data?.data || res.data || [];
      setWfhTemplates(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to fetch WFH templates:", error);
      toast.error("Failed to load WFH balance templates");
    } finally {
      setTemplatesLoading(false);
    }
  }, [profile?.organizationId]);

  // ------- Load data on profile ready -------
  useEffect(() => {
    if (profile?.organizationId) {
      fetchWfhRequests();
      fetchEmployees();
    }
  }, [profile?.organizationId, fetchWfhRequests, fetchEmployees]);

  // ------- Load assignments when tab switches and employees are ready -------
  useEffect(() => {
    if (activeTab === "assignments" && employees.length > 0) {
      fetchAssignments();
    }
  }, [activeTab, employees, fetchAssignments]);

  useEffect(() => {
    if (activeTab === "balances") {
      fetchWfhTemplates();
    }
  }, [activeTab, fetchWfhTemplates]);

  useEffect(() => {
    if (!selectedEmploymentType) return;
    const existing = wfhTemplates.find(
      (t) => t.employmentType === selectedEmploymentType
    );
    if (existing?.openingBalance !== undefined) {
      setWfhBalanceInput(Number(existing.openingBalance) || 0);
    }
  }, [wfhTemplates, selectedEmploymentType]);

  const handleEmploymentTypeChange = (value: string) => {
    setSelectedEmploymentType(value);
    const existing = wfhTemplates.find((t) => t.employmentType === value);
    if (existing?.openingBalance !== undefined) {
      setWfhBalanceInput(Number(existing.openingBalance) || 0);
    } else {
      setWfhBalanceInput(0);
    }
  };

  const handleApplyWfhBalance = async () => {
    if (!profile?.organizationId) return;
    if (!selectedEmploymentType) {
      toast.error("Select an employment type");
      return;
    }
    setApplyingBalance(true);
    try {
      await setWfhBalanceTemplates({
        organizationId: profile.organizationId,
        employmentType: selectedEmploymentType,
        items: [{ openingBalance: wfhBalanceInput }],
      });

      const targetEmployees = employees.filter(
        (e) => e.employmentType === selectedEmploymentType
      );
      setApplyProgress({ done: 0, total: targetEmployees.length });
      for (const emp of targetEmployees) {
        try {
          await initializeWfhBalance({
            userId: emp.userId,
            openingBalance: wfhBalanceInput,
          });
        } catch (err) {
          console.error("Failed to apply WFH balance to", emp.userId, err);
        } finally {
          setApplyProgress((prev) => ({ ...prev, done: prev.done + 1 }));
        }
      }

      toast.success("WFH balance template saved");
      await fetchWfhTemplates();
    } catch (error: any) {
      console.error("Failed to apply WFH balance:", error);
      toast.error("Failed to save WFH balance");
    } finally {
      setApplyingBalance(false);
    }
  };

  // ------- Approve handler -------
  const handleApprove = async (request: WfhRequest) => {
    if (!profile?.userId) return;
    setActionLoading(request.id);
    try {
      await approveWfh(request.id, profile.userId, {
        approve: true,
        remarks: "Approved",
      });
      toast.success("WFH request approved successfully");
      await fetchWfhRequests();
    } catch (error: any) {
      console.error("Failed to approve WFH:", error);
      toast.error(
        error.response?.data?.message || "Failed to approve WFH request"
      );
    } finally {
      setActionLoading(null);
    }
  };

  // ------- Reject handler -------
  const openRejectDialog = (request: WfhRequest) => {
    setRejectTarget(request);
    setRejectRemarks("");
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectTarget || !profile?.userId) return;
    setActionLoading(rejectTarget.id);
    try {
      await approveWfh(rejectTarget.id, profile.userId, {
        approve: false,
        remarks: rejectRemarks || "Rejected",
      });
      toast.success("WFH request rejected");
      setRejectDialogOpen(false);
      setRejectTarget(null);
      setRejectRemarks("");
      await fetchWfhRequests();
    } catch (error: any) {
      console.error("Failed to reject WFH:", error);
      toast.error(
        error.response?.data?.message || "Failed to reject WFH request"
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleApprovalModeChange = async (mode: "ADMIN" | "MANAGER") => {
    if (!profile?.organizationId) return;
    setSavingApprovalMode(true);
    try {
      await updateOrganization(profile.organizationId, { wfhApprovalMode: mode });
      setWfhApprovalMode(mode);
      toast.success("WFH approval mode updated");
    } catch (error: any) {
      toast.error("Failed to update approval mode");
    } finally {
      setSavingApprovalMode(false);
    }
  };

  // ------- Create assignment handler -------
  const handleCreateAssignment = async () => {
    if (!profile?.organizationId) return;
    if (!newAssignment.userId || !newAssignment.approverId) {
      toast.error("Please select both employee and approver");
      return;
    }
    if (newAssignment.userId === newAssignment.approverId) {
      toast.error("Employee and approver cannot be the same person");
      return;
    }
    setCreateLoading(true);
    try {
      await createWfhAssignment({
        userId: newAssignment.userId,
        approverId: newAssignment.approverId,
        organizationId: profile.organizationId,
        level: parseInt(newAssignment.level),
      });
      toast.success("Approval assignment created successfully");
      setAddDialogOpen(false);
      setNewAssignment({ userId: "", approverId: "", level: "1" });
      await fetchAssignments();
    } catch (error: any) {
      console.error("Failed to create assignment:", error);
      toast.error(
        error.response?.data?.message || "Failed to create approval assignment"
      );
    } finally {
      setCreateLoading(false);
    }
  };

  // ------- Delete assignment handler -------
  const handleDeleteAssignment = async (id: string) => {
    setDeleteLoading(id);
    try {
      await deleteWfhAssignment(id);
      toast.success("Approval assignment deleted");
      setAssignments((prev) => prev.filter((a) => a.id !== id));
    } catch (error: any) {
      console.error("Failed to delete assignment:", error);
      toast.error(
        error.response?.data?.message || "Failed to delete approval assignment"
      );
    } finally {
      setDeleteLoading(null);
    }
  };

  // ------- Filtered requests -------
  const filteredRequests =
    statusFilter === "all"
      ? wfhRequests
      : wfhRequests.filter(
          (r) => r.status?.toUpperCase() === statusFilter.toUpperCase()
        );

  // ------- Counts -------
  const pendingCount = wfhRequests.filter(
    (r) => r.status?.toUpperCase() === "PENDING"
  ).length;
  const approvedCount = wfhRequests.filter(
    (r) => r.status?.toUpperCase() === "APPROVED"
  ).length;
  const rejectedCount = wfhRequests.filter(
    (r) => r.status?.toUpperCase() === "REJECTED"
  ).length;

  // ------- Employee lookup helpers for assignments -------
  const getEmployeeName = (userId: string): string => {
    const emp = employees.find((e) => e.userId === userId);
    if (emp) return `${emp.firstName} ${emp.lastName || ""}`.trim();
    return "Unknown";
  };

  // ------- Loading state -------
  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Home className="h-7 w-7 text-blue-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            WFH Management
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline" className="gap-1">
            <ClipboardList className="h-3 w-3" />
            {wfhRequests.length} Total Requests
          </Badge>
          {pendingCount > 0 && (
            <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
              {pendingCount} Pending
            </Badge>
          )}
        </div>
      </div>

      <Separator />

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="requests" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Requests
          </TabsTrigger>
          <TabsTrigger value="assignments" className="gap-2">
            <Users className="h-4 w-4" />
            Approval Assignments
          </TabsTrigger>
          <TabsTrigger value="balances" className="gap-2">
            <ClipboardList className="h-4 w-4" />
            Balances
          </TabsTrigger>
        </TabsList>

        {/* ========== Tab 1: Requests ========== */}
        <TabsContent value="requests" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">WFH Requests</CardTitle>
                  <CardDescription>
                    Review and manage work from home requests from employees
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchWfhRequests}
                  disabled={requestsLoading}
                >
                  {requestsLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Refresh"
                  )}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 mb-6">
                <div>
                  <p className="text-sm font-medium">Approval Flow</p>
                  <p className="text-xs text-muted-foreground">
                    Default approval when no custom assignment is set.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant={wfhApprovalMode === "ADMIN" ? "default" : "outline"}
                    onClick={() => handleApprovalModeChange("ADMIN")}
                    disabled={savingApprovalMode}
                  >
                    Admin Approves
                  </Button>
                  <Button
                    variant={wfhApprovalMode === "MANAGER" ? "default" : "outline"}
                    onClick={() => handleApprovalModeChange("MANAGER")}
                    disabled={savingApprovalMode}
                  >
                    Manager Approves
                  </Button>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-2 mb-6">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <div className="flex gap-1">
                  {[
                    { value: "all", label: "All", count: wfhRequests.length },
                    {
                      value: "PENDING",
                      label: "Pending",
                      count: pendingCount,
                    },
                    {
                      value: "APPROVED",
                      label: "Approved",
                      count: approvedCount,
                    },
                    {
                      value: "REJECTED",
                      label: "Rejected",
                      count: rejectedCount,
                    },
                  ].map((filter) => (
                    <Button
                      key={filter.value}
                      variant={
                        statusFilter === filter.value ? "default" : "ghost"
                      }
                      size="sm"
                      onClick={() => setStatusFilter(filter.value)}
                      className="gap-1.5"
                    >
                      {filter.label}
                      <span className="text-xs opacity-70">
                        ({filter.count})
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Requests Table */}
              {requestsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No WFH requests found</p>
                  <p className="text-sm mt-1">
                    {statusFilter !== "all"
                      ? `No ${statusFilter.toLowerCase()} requests at the moment`
                      : "WFH requests from employees will appear here"}
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Employee</TableHead>
                        <TableHead>Start Date</TableHead>
                        <TableHead>End Date</TableHead>
                        <TableHead className="text-center">Days</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRequests.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">
                            {getFullName(request.user)}
                          </TableCell>
                          <TableCell>
                            {request.startDate || request.date
                              ? format(
                                  new Date(request.startDate || request.date!),
                                  "MMM dd, yyyy"
                                )
                              : "-"}
                          </TableCell>
                          <TableCell>
                            {request.endDate
                              ? format(
                                  new Date(request.endDate),
                                  "MMM dd, yyyy"
                                )
                              : "-"}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary">
                              {request.numberOfDays || request.days || 1}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate">
                            {request.reason || "-"}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={request.status} />
                          </TableCell>
                          <TableCell className="text-right">
                            {request.status?.toUpperCase() === "PENDING" ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-300 hover:bg-green-50 hover:text-green-700"
                                  disabled={actionLoading === request.id}
                                  onClick={() => handleApprove(request)}
                                >
                                  {actionLoading === request.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <Check className="h-3.5 w-3.5 mr-1" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                                  disabled={actionLoading === request.id}
                                  onClick={() => openRejectDialog(request)}
                                >
                                  <X className="h-3.5 w-3.5 mr-1" />
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">
                                {request.remarks
                                  ? `Remarks: ${request.remarks}`
                                  : "--"}
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== Tab 2: Approval Assignments ========== */}
        <TabsContent value="assignments" className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    WFH Approval Assignments
                  </CardTitle>
                  <CardDescription>
                    Configure who approves WFH requests for each employee
                  </CardDescription>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setNewAssignment({
                      userId: "",
                      approverId: "",
                      level: "1",
                    });
                    setAddDialogOpen(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Assignment
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {assignmentsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : assignments.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">
                    No approval assignments configured
                  </p>
                  <p className="text-sm mt-1">
                    Add assignments to define who approves WFH requests
                  </p>
                  <Button
                    className="mt-4"
                    size="sm"
                    onClick={() => {
                      setNewAssignment({
                        userId: "",
                        approverId: "",
                        level: "1",
                      });
                      setAddDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Assignment
                  </Button>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-center">Level</TableHead>
                        <TableHead>Approver</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">
                            {assignment.user
                              ? getFullName(assignment.user)
                              : getEmployeeName(assignment.userId)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline">
                              {assignment.level === 1
                                ? "Level 1 - Manager"
                                : assignment.level === 2
                                ? "Level 2 - Admin"
                                : `Level ${assignment.level}`}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {assignment.approver
                              ? getFullName(assignment.approver)
                              : getEmployeeName(assignment.approverId)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                              disabled={deleteLoading === assignment.id}
                              onClick={() =>
                                handleDeleteAssignment(assignment.id)
                              }
                            >
                              {deleteLoading === assignment.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5 mr-1" />
                              )}
                              Delete
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== Tab 3: WFH Balances ========== */}
        <TabsContent value="balances" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">WFH Balances by Employment Type</CardTitle>
              <CardDescription>
                Set default WFH balance for each employment type and apply to employees.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Employment Type</Label>
                  <Select
                    value={selectedEmploymentType}
                    onValueChange={handleEmploymentTypeChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select employment type" />
                    </SelectTrigger>
                    <SelectContent>
                      {EMPLOYMENT_TYPE_OPTIONS.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Opening Balance</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={String(wfhBalanceInput ?? 0)}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                      setWfhBalanceInput(digitsOnly === "" ? 0 : Number(digitsOnly));
                    }}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-xs text-muted-foreground">
                  {applyingBalance
                    ? `Applying ${applyProgress.done}/${applyProgress.total}`
                    : "This will overwrite existing WFH opening balances."}
                </div>
                <Button
                  onClick={handleApplyWfhBalance}
                  disabled={applyingBalance || !selectedEmploymentType}
                >
                  {applyingBalance ? "Applying..." : "Apply to Employees"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Template Summary</CardTitle>
              <CardDescription>WFH balance templates by employment type.</CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employment Type</TableHead>
                      <TableHead>Opening Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {EMPLOYMENT_TYPE_OPTIONS.map((et) => {
                      const match = wfhTemplates.find(
                        (t) => t.employmentType === et.value
                      );
                      return (
                        <TableRow key={et.value}>
                          <TableCell className="font-medium">{et.label}</TableCell>
                          <TableCell>{match?.openingBalance ?? "-"}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ========== Reject Dialog ========== */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reject WFH Request</DialogTitle>
            <DialogDescription>
              Provide remarks for rejecting the WFH request from{" "}
              <span className="font-medium text-foreground">
                {getFullName(rejectTarget?.user)}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input
                id="remarks"
                placeholder="Enter reason for rejection..."
                value={rejectRemarks}
                onChange={(e) => setRejectRemarks(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectTarget(null);
                setRejectRemarks("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={actionLoading === rejectTarget?.id}
              onClick={handleReject}
            >
              {actionLoading === rejectTarget?.id ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Reject Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Add Assignment Dialog ========== */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Approval Assignment</DialogTitle>
            <DialogDescription>
              Assign an approver for an employee&apos;s WFH requests.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Employee Select */}
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={newAssignment.userId}
                onValueChange={(val) =>
                  setNewAssignment((prev) => ({ ...prev, userId: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.userId} value={emp.userId}>
                      {emp.firstName} {emp.lastName || ""}{" "}
                      {emp.employeeCode ? `(${emp.employeeCode})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Approver Select */}
            <div className="space-y-2">
              <Label>Approver</Label>
              <Select
                value={newAssignment.approverId}
                onValueChange={(val) =>
                  setNewAssignment((prev) => ({ ...prev, approverId: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select approver" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.userId} value={emp.userId}>
                      {emp.firstName} {emp.lastName || ""}{" "}
                      {emp.employeeCode ? `(${emp.employeeCode})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level Select */}
            <div className="space-y-2">
              <Label>Approval Level</Label>
              <Select
                value={newAssignment.level}
                onValueChange={(val) =>
                  setNewAssignment((prev) => ({ ...prev, level: val }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Level 1 - Manager</SelectItem>
                  <SelectItem value="2">Level 2 - Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={
                createLoading ||
                !newAssignment.userId ||
                !newAssignment.approverId
              }
              onClick={handleCreateAssignment}
            >
              {createLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
