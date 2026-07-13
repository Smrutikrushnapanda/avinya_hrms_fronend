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
  Building2,
  Pencil,
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
import { Switch } from "@/components/ui/switch";
import {
  getProfile,
  getEmployees,
  getAllWfhRequests,
  approveWfh,
  createWfhAssignment,
  getWfhAssignments,
  getWfhAssignmentsByOrg,
  deleteWfhAssignment,
  getOrganization,
  updateOrganization,
  setWfhBalanceTemplates,
  getWfhBalanceTemplates,
  initializeWfhBalance,
  setEmployeeWfhLimit,
  getWorkArrangementsByOrg,
  setEmployeeWorkArrangement,
  deleteEmployeeWorkArrangement,
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

type ArrangementType = "OFFICE" | "HYBRID" | "PERMANENT_REMOTE";

interface WorkArrangement {
  id: string;
  arrangementType: ArrangementType;
  mandatoryOfficeDaysPerMonth: number | null;
  autoApproveWfh: boolean;
  isActive: boolean;
  user?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

const ARRANGEMENT_TYPE_LABELS: Record<ArrangementType, string> = {
  OFFICE: "Office",
  HYBRID: "Hybrid",
  PERMANENT_REMOTE: "Permanent Remote",
};

function ArrangementTypeBadge({ type }: { type: ArrangementType }) {
  switch (type) {
    case "PERMANENT_REMOTE":
      return (
        <Badge className="bg-purple-100 text-purple-700 border-purple-300 hover:bg-purple-100">
          Permanent Remote
        </Badge>
      );
    case "HYBRID":
      return (
        <Badge className="bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-100">
          Hybrid
        </Badge>
      );
    default:
      return <Badge variant="outline">Office</Badge>;
  }
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
  const [wfhCarryForwardEnabled, setWfhCarryForwardEnabled] = useState(false);
  const [savingWfhCarryForward, setSavingWfhCarryForward] = useState(false);

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
  const [monthlyWfhLimitInput, setMonthlyWfhLimitInput] = useState(0);
  const [applyingMonthlyWfhLimit, setApplyingMonthlyWfhLimit] = useState(false);

  // Work Arrangements tab state
  const [workArrangements, setWorkArrangements] = useState<WorkArrangement[]>([]);
  const [workArrangementsLoading, setWorkArrangementsLoading] = useState(false);
  const [arrangementDialogOpen, setArrangementDialogOpen] = useState(false);
  const [arrangementTarget, setArrangementTarget] = useState<Employee | null>(null);
  const [arrangementForm, setArrangementForm] = useState<{
    arrangementType: ArrangementType;
    mandatoryOfficeDaysPerMonth: string;
    autoApproveWfh: boolean;
  }>({
    arrangementType: "HYBRID",
    mandatoryOfficeDaysPerMonth: "",
    autoApproveWfh: true,
  });
  const [savingArrangement, setSavingArrangement] = useState(false);

  // Org-wide Hybrid/Reminder defaults
  const [orgDefaults, setOrgDefaults] = useState({
    hybridDefaultMandatoryOfficeDays: 15,
    wfhMonitorReminderEnabled: true,
    wfhMonitorReminderIntervalMinutes: 30,
    wfhMonitorReminderEmailCutoffMinutes: 120,
  });
  const [savingOrgDefaults, setSavingOrgDefaults] = useState(false);

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
          setWfhCarryForwardEnabled(Boolean(orgRes.data?.wfhCarryForwardEnabled));
          setOrgDefaults({
            hybridDefaultMandatoryOfficeDays:
              Number(orgRes.data?.hybridDefaultMandatoryOfficeDays) || 15,
            wfhMonitorReminderEnabled:
              orgRes.data?.wfhMonitorReminderEnabled ?? true,
            wfhMonitorReminderIntervalMinutes:
              Number(orgRes.data?.wfhMonitorReminderIntervalMinutes) || 30,
            wfhMonitorReminderEmailCutoffMinutes:
              Number(orgRes.data?.wfhMonitorReminderEmailCutoffMinutes) || 120,
          });
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
    if (!profile?.organizationId) return;
    setAssignmentsLoading(true);
    try {
      // Use the new organization-level endpoint instead of looping through each employee
      const res = await getWfhAssignmentsByOrg(profile.organizationId);
      const data = res.data?.data || res.data || [];
      setAssignments(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to fetch assignments:", error);
      toast.error("Failed to load approval assignments");
    } finally {
      setAssignmentsLoading(false);
    }
  }, [profile?.organizationId]);

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

  // ------- Fetch work arrangements -------
  const fetchWorkArrangements = useCallback(async () => {
    if (!profile?.organizationId) return;
    setWorkArrangementsLoading(true);
    try {
      const res = await getWorkArrangementsByOrg(profile.organizationId);
      const data = res.data?.data || res.data || [];
      setWorkArrangements(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error("Failed to fetch work arrangements:", error);
      toast.error("Failed to load work arrangements");
    } finally {
      setWorkArrangementsLoading(false);
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
    if (activeTab === "work-arrangements") {
      fetchWorkArrangements();
    }
  }, [activeTab, fetchWorkArrangements]);

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

  const handleApplyMonthlyWfhLimit = async () => {
    if (!selectedEmploymentType) {
      toast.error("Select an employment type");
      return;
    }
    if (monthlyWfhLimitInput < 0) {
      toast.error("Monthly WFH limit cannot be negative");
      return;
    }

    const targetEmployees = employees.filter(
      (e) => e.employmentType === selectedEmploymentType,
    );
    if (!targetEmployees.length) {
      toast.error("No employees found for selected employment type");
      return;
    }

    setApplyingMonthlyWfhLimit(true);
    let successCount = 0;
    try {
      for (const emp of targetEmployees) {
        try {
          await setEmployeeWfhLimit({
            userId: emp.userId,
            maxDaysPerMonth: Number(monthlyWfhLimitInput),
            isEnabled: true,
          });
          successCount += 1;
        } catch (error) {
          console.error("Failed to set monthly WFH limit for", emp.userId, error);
        }
      }

      if (successCount === 0) {
        toast.error("Failed to apply monthly WFH limit");
      } else if (successCount < targetEmployees.length) {
        toast.success(
          `Applied monthly WFH limit to ${successCount}/${targetEmployees.length} employees`,
        );
      } else {
        toast.success("Monthly WFH limit applied successfully");
      }
    } finally {
      setApplyingMonthlyWfhLimit(false);
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

  const handleWfhCarryForwardToggle = async (checked: boolean) => {
    if (!profile?.organizationId) return;
    const previous = wfhCarryForwardEnabled;
    setWfhCarryForwardEnabled(checked);
    setSavingWfhCarryForward(true);
    try {
      await updateOrganization(profile.organizationId, {
        wfhCarryForwardEnabled: checked,
      });
      toast.success(
        checked ? "WFH carry forward enabled" : "WFH carry forward disabled",
      );
    } catch (error: any) {
      setWfhCarryForwardEnabled(previous);
      toast.error("Failed to update WFH carry forward setting");
    } finally {
      setSavingWfhCarryForward(false);
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

  const handleSaveOrgDefaults = async () => {
    if (!profile?.organizationId) return;
    setSavingOrgDefaults(true);
    try {
      await updateOrganization(profile.organizationId, {
        hybridDefaultMandatoryOfficeDays:
          orgDefaults.hybridDefaultMandatoryOfficeDays,
        wfhMonitorReminderEnabled: orgDefaults.wfhMonitorReminderEnabled,
        wfhMonitorReminderIntervalMinutes:
          orgDefaults.wfhMonitorReminderIntervalMinutes,
        wfhMonitorReminderEmailCutoffMinutes:
          orgDefaults.wfhMonitorReminderEmailCutoffMinutes,
      });
      toast.success("Organization defaults saved");
    } catch (error: any) {
      console.error("Failed to save org defaults:", error);
      toast.error("Failed to save organization defaults");
    } finally {
      setSavingOrgDefaults(false);
    }
  };

  // ------- Work Arrangement handlers -------
  const getArrangementForEmployee = (userId: string) =>
    workArrangements.find((a) => a.user?.id === userId);

  const openArrangementDialog = (employee: Employee) => {
    const existing = getArrangementForEmployee(employee.userId);
    setArrangementTarget(employee);
    setArrangementForm({
      arrangementType: existing?.arrangementType || "HYBRID",
      mandatoryOfficeDaysPerMonth:
        existing?.mandatoryOfficeDaysPerMonth != null
          ? String(existing.mandatoryOfficeDaysPerMonth)
          : "",
      autoApproveWfh: existing?.autoApproveWfh ?? true,
    });
    setArrangementDialogOpen(true);
  };

  const handleSaveArrangement = async () => {
    if (!arrangementTarget) return;
    setSavingArrangement(true);
    try {
      await setEmployeeWorkArrangement({
        userId: arrangementTarget.userId,
        arrangementType: arrangementForm.arrangementType,
        mandatoryOfficeDaysPerMonth:
          arrangementForm.arrangementType === "HYBRID" &&
          arrangementForm.mandatoryOfficeDaysPerMonth !== ""
            ? Number(arrangementForm.mandatoryOfficeDaysPerMonth)
            : undefined,
        autoApproveWfh: arrangementForm.autoApproveWfh,
      });
      toast.success("Work arrangement saved");
      setArrangementDialogOpen(false);
      setArrangementTarget(null);
      await fetchWorkArrangements();
    } catch (error: any) {
      console.error("Failed to save work arrangement:", error);
      toast.error(
        error.response?.data?.message || "Failed to save work arrangement"
      );
    } finally {
      setSavingArrangement(false);
    }
  };

  const handleResetArrangement = async (userId: string) => {
    setSavingArrangement(true);
    try {
      await deleteEmployeeWorkArrangement(userId);
      toast.success("Reverted to Office arrangement");
      await fetchWorkArrangements();
    } catch (error: any) {
      console.error("Failed to reset work arrangement:", error);
      toast.error("Failed to reset work arrangement");
    } finally {
      setSavingArrangement(false);
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

  // ------- Employee lookup: always prefer the employees table (HR profile,
  // kept accurate via the Employees admin form) over the raw `users` login
  // identity, which is often left at its account-creation default. -------
  const getEmployeeName = (
    userId?: string,
    fallbackUser?: { firstName: string; lastName: string } | null
  ): string => {
    const emp = userId ? employees.find((e) => e.userId === userId) : undefined;
    if (emp) {
      const name = `${emp.firstName} ${emp.lastName || ""}`.trim();
      if (name) return name;
    }
    if (fallbackUser) {
      const name = `${fallbackUser.firstName || ""} ${fallbackUser.lastName || ""}`.trim();
      if (name) return name;
    }
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
          <TabsTrigger value="work-arrangements" className="gap-2">
            <Building2 className="h-4 w-4" />
            Work Arrangements
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
                  loading={requestsLoading}
                >
                  Refresh
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
                    loading={savingApprovalMode}
                  >
                    Admin Approves
                  </Button>
                  <Button
                    variant={wfhApprovalMode === "MANAGER" ? "default" : "outline"}
                    onClick={() => handleApprovalModeChange("MANAGER")}
                    loading={savingApprovalMode}
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
                        <TableHead>Sl#</TableHead>
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
                      {filteredRequests.map((request, index) => (
                        <TableRow key={request.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {getEmployeeName(request.userId, request.user)}
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
                                  loading={actionLoading === request.id}
                                  onClick={() => handleApprove(request)}
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" />
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
                        <TableHead>Sl#</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead className="text-center">Level</TableHead>
                        <TableHead>Approver</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {assignments.map((assignment, index) => (
                        <TableRow key={assignment.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {getEmployeeName(assignment.userId, assignment.user)}
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
                            {getEmployeeName(assignment.approverId, assignment.approver)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                              loading={deleteLoading === assignment.id}
                              onClick={() =>
                                handleDeleteAssignment(assignment.id)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5 mr-1" />
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
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Carry Forward Unused WFH</p>
                  <p className="text-xs text-muted-foreground">
                    Unused WFH balance will be added in next session year.
                  </p>
                </div>
                <Switch
                  checked={wfhCarryForwardEnabled}
                  onCheckedChange={handleWfhCarryForwardToggle}
                  disabled={savingWfhCarryForward}
                />
              </div>
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
                  loading={applyingBalance}
                  disabled={!selectedEmploymentType}
                >
                  Apply to Employees
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-lg">Monthly WFH Limit</CardTitle>
              <CardDescription>
                Set per-employee monthly WFH days for the selected employment type.
                By default, employees can only use what admin configures.
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
                  <Label>WFH Days Per Month</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={String(monthlyWfhLimitInput)}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                      setMonthlyWfhLimitInput(
                        digitsOnly === "" ? 0 : Number(digitsOnly),
                      );
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={handleApplyMonthlyWfhLimit}
                  loading={applyingMonthlyWfhLimit}
                  disabled={!selectedEmploymentType}
                >
                  Apply Monthly Limit
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
                      <TableHead>Sl#</TableHead>
                      <TableHead>Employment Type</TableHead>
                      <TableHead>Opening Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {EMPLOYMENT_TYPE_OPTIONS.map((et, index) => {
                      const match = wfhTemplates.find(
                        (t) => t.employmentType === et.value
                      );
                      return (
                        <TableRow key={et.value}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
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

        {/* ========== Tab 4: Work Arrangements ========== */}
        <TabsContent value="work-arrangements" className="mt-6 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Organization Defaults</CardTitle>
              <CardDescription>
                Default settings applied unless overridden per employee.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Default Mandatory Office Days / Month (Hybrid)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={String(orgDefaults.hybridDefaultMandatoryOfficeDays)}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                      setOrgDefaults((prev) => ({
                        ...prev,
                        hybridDefaultMandatoryOfficeDays:
                          digitsOnly === "" ? 0 : Number(digitsOnly),
                      }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Monitor Reminder Interval (Minutes)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={String(orgDefaults.wfhMonitorReminderIntervalMinutes)}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                      setOrgDefaults((prev) => ({
                        ...prev,
                        wfhMonitorReminderIntervalMinutes:
                          digitsOnly === "" ? 0 : Number(digitsOnly),
                      }));
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email Fallback Cutoff (Minutes after shift start)</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={String(orgDefaults.wfhMonitorReminderEmailCutoffMinutes)}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                      setOrgDefaults((prev) => ({
                        ...prev,
                        wfhMonitorReminderEmailCutoffMinutes:
                          digitsOnly === "" ? 0 : Number(digitsOnly),
                      }));
                    }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">WFH Monitor Reminders</p>
                  <p className="text-xs text-muted-foreground">
                    Nudge employees with approved WFH to start their monitoring
                    session (in-app + desktop banner + email fallback).
                  </p>
                </div>
                <Switch
                  checked={orgDefaults.wfhMonitorReminderEnabled}
                  onCheckedChange={(checked) =>
                    setOrgDefaults((prev) => ({
                      ...prev,
                      wfhMonitorReminderEnabled: checked,
                    }))
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleSaveOrgDefaults} loading={savingOrgDefaults}>
                  Save Defaults
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Employee Work Arrangements</CardTitle>
                  <CardDescription>
                    Classify each employee as Office, Hybrid (mandatory office days per
                    month, employee picks the actual days), or Permanent Remote.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchWorkArrangements}
                  loading={workArrangementsLoading}
                >
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {workArrangementsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : employees.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No employees found</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Sl#</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Arrangement</TableHead>
                        <TableHead className="text-center">
                          Mandatory Office Days / Month
                        </TableHead>
                        <TableHead className="text-center">Auto-Approve WFH</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees.map((employee, index) => {
                        const arrangement = getArrangementForEmployee(employee.userId);
                        return (
                          <TableRow key={employee.userId}>
                            <TableCell className="font-medium">{index + 1}</TableCell>
                            <TableCell className="font-medium">
                              {employee.firstName} {employee.lastName || ""}
                            </TableCell>
                            <TableCell>
                              <ArrangementTypeBadge
                                type={arrangement?.arrangementType || "OFFICE"}
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              {arrangement?.arrangementType === "HYBRID"
                                ? arrangement.mandatoryOfficeDaysPerMonth ??
                                  "Org default"
                                : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              {arrangement && arrangement.arrangementType !== "OFFICE"
                                ? arrangement.autoApproveWfh
                                  ? "Yes"
                                  : "No"
                                : "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => openArrangementDialog(employee)}
                                >
                                  <Pencil className="h-3.5 w-3.5 mr-1" />
                                  Edit
                                </Button>
                                {arrangement && arrangement.arrangementType !== "OFFICE" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
                                    disabled={savingArrangement}
                                    onClick={() =>
                                      handleResetArrangement(employee.userId)
                                    }
                                  >
                                    Reset to Office
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
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
                {getEmployeeName(rejectTarget?.userId, rejectTarget?.user)}
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
              loading={actionLoading === rejectTarget?.id}
              onClick={handleReject}
            >
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
              loading={createLoading}
              disabled={
                !newAssignment.userId ||
                !newAssignment.approverId
              }
              onClick={handleCreateAssignment}
            >
              Create Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========== Work Arrangement Dialog ========== */}
      <Dialog open={arrangementDialogOpen} onOpenChange={setArrangementDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Work Arrangement</DialogTitle>
            <DialogDescription>
              Set the work arrangement for{" "}
              <span className="font-medium text-foreground">
                {arrangementTarget?.firstName} {arrangementTarget?.lastName || ""}
              </span>
              .
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Arrangement Type</Label>
              <Select
                value={arrangementForm.arrangementType}
                onValueChange={(val) =>
                  setArrangementForm((prev) => ({
                    ...prev,
                    arrangementType: val as ArrangementType,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(ARRANGEMENT_TYPE_LABELS) as ArrangementType[]).map(
                    (type) => (
                      <SelectItem key={type} value={type}>
                        {ARRANGEMENT_TYPE_LABELS[type]}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
            </div>

            {arrangementForm.arrangementType === "HYBRID" && (
              <div className="space-y-2">
                <Label>Mandatory Office Days / Month</Label>
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder={`Org default (${orgDefaults.hybridDefaultMandatoryOfficeDays})`}
                  value={arrangementForm.mandatoryOfficeDaysPerMonth}
                  onChange={(e) => {
                    const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                    setArrangementForm((prev) => ({
                      ...prev,
                      mandatoryOfficeDaysPerMonth: digitsOnly,
                    }));
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to inherit the organization&apos;s default. The
                  employee&apos;s allowed WFH days each month = working days in that
                  month minus this number, and they can freely pick which days.
                </p>
              </div>
            )}

            {arrangementForm.arrangementType !== "OFFICE" && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="text-sm font-medium">Auto-Approve WFH Requests</p>
                  <p className="text-xs text-muted-foreground">
                    Approve instantly when within quota, skipping the manager
                    approval chain.
                  </p>
                </div>
                <Switch
                  checked={arrangementForm.autoApproveWfh}
                  onCheckedChange={(checked) =>
                    setArrangementForm((prev) => ({
                      ...prev,
                      autoApproveWfh: checked,
                    }))
                  }
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setArrangementDialogOpen(false);
                setArrangementTarget(null);
              }}
            >
              Cancel
            </Button>
            <Button loading={savingArrangement} onClick={handleSaveArrangement}>
              Save Arrangement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
