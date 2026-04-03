"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ElementType } from "react";
import { useRouter } from "next/navigation";
import {
  assignClientProjectEmployees,
  assignProjectEmployees,
  createProjectTask,
  createProjectIssue,
  deleteProjectTask,
  getClientProject,
  getClientProjectEmployees,
  getClientProjectTimesheetsSummary,
  getAllOrgEmployees,
  getProfile,
  getProject,
  getProjectEmployees,
  getProjectIssues,
  getProjectTasks,
  getProjectTimesheets,
  getTimesheets,
  removeClientProjectEmployee,
  removeProjectEmployee,
  updateTaskStatus,
  updateClientProjectCompletion,
  updateProject,
  updateProjectIssue,
  updateProjectMemberRole,
  uploadFile,
} from "@/app/api/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
} from "recharts";
import {
  ArrowLeft,
  AlertTriangle,
  Calendar,
  Clock,
  FolderKanban,
  Plus,
  Save,
  Upload,
  Users,
  X,
  Circle,
  Clock3,
  CheckCircle2,
  ListTodo,
  ClipboardList,
} from "lucide-react";

type ProjectStatus = "planning" | "active" | "on_hold" | "completed";
type ProjectPriority = "low" | "medium" | "high" | "critical";
type IssueStatus = "pending" | "resolved";
type MemberRole = "member" | "tester" | "lead";
type ProjectSource = "standalone" | "client";
type ClientTaskStatus = "pending" | "in_progress" | "issue" | "completed" | "cancelled";
type ClientTaskPriority = "low" | "medium" | "high" | "urgent";

type ProjectShape = {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  completionPercent: number;
  estimatedEndDate: string | null;
  daysRemaining: number | null;
  isOverdue: boolean;
  members: Array<{ userId: string; role: string }>;
  createdBy: { id: string; firstName: string; lastName: string } | null;
  projectCost?: number;
  hourlyRate?: number;
};

type ProjectEmployee = {
  userId: string;
  role: string;
  assignedAt: string;
  employeeId: string | null;
  employeeCode?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  workEmail: string;
  designation?: string | null;
  managerName: string | null;
};

type TeamMember = {
  employeeId: string;
  employeeCode?: string | null;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  workEmail: string;
  designationId?: string | null;
  designation: string | null;
};

type ProjectIssue = {
  id: string;
  projectId: string;
  pageName: string;
  issueTitle: string;
  description: string | null;
  imageUrl: string | null;
  status: IssueStatus;
  assigneeUserId: string | null;
  createdByUserId: string;
  resolvedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

type ProjectTimesheet = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  workingMinutes: number;
  projectName: string | null;
  workDescription: string | null;
  employeeRemark: string | null;
  managerRemark: string | null;
  employee: {
    id: string;
    employeeCode?: string | null;
    firstName: string;
    middleName?: string | null;
    lastName: string;
  } | null;
};

type ClientProjectApi = {
  id: string;
  projectName?: string | null;
  projectCode?: string | null;
  description?: string | null;
  status?: string | null;
  completionPercent?: number | null;
  endDate?: string | null;
  startDate?: string | null;
  projectCost?: number | null;
  hourlyRate?: number | null;
  members?: Array<{ userId?: string | null; role?: string | null }>;
};

type ClientProjectTask = {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  status: ClientTaskStatus;
  priority: ClientTaskPriority;
  assignedToUserId: string | null;
  assignedToUser?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  assignedByUserId: string;
  assignedByUser?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  } | null;
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
};

const clientTaskStatusConfig: Record<
  ClientTaskStatus,
  { label: string; color: string; bgColor: string; icon: ElementType }
> = {
  pending: { label: "Pending", color: "text-slate-600", bgColor: "bg-slate-100", icon: Circle },
  in_progress: { label: "Working", color: "text-blue-600", bgColor: "bg-blue-100", icon: Clock3 },
  issue: { label: "Issue", color: "text-amber-700", bgColor: "bg-amber-100", icon: AlertTriangle },
  completed: {
    label: "Completed",
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: CheckCircle2,
  },
  cancelled: { label: "Cancelled", color: "text-red-600", bgColor: "bg-red-100", icon: X },
};

const clientTaskPriorityOptions: Array<{ value: ClientTaskPriority; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

function fullName(data: { firstName?: string; lastName?: string; email?: string }) {
  const name = [data.firstName, data.lastName].filter(Boolean).join(" ").trim();
  return name || data.email || "Unknown";
}

function shortId(id?: string | null) {
  if (!id) return "Unknown";
  return `${id.slice(0, 8)}...`;
}

function normalizeText(value?: string | null) {
  return String(value || "").trim().toLowerCase();
}

function formatDisplayDate(dateStr?: string | null) {
  if (!dateStr) return "--";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatDisplayTime(isoStr?: string | null) {
  if (!isoStr) return "--";
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatMinutes(minutes?: number) {
  const safeMinutes = Number(minutes || 0);
  if (!safeMinutes || safeMinutes < 0) return "--";
  const h = Math.floor(safeMinutes / 60);
  const m = safeMinutes % 60;
  return `${h}h ${m}m`;
}

function formatUserName(user?: { firstName?: string; lastName?: string; email?: string } | null) {
  if (!user) return "--";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return name || user.email || "--";
}

function mapClientProjectToWorkspace(cp: ClientProjectApi): ProjectShape {
  const statusMap: Record<string, ProjectStatus> = {
    ACTIVE: "active",
    INACTIVE: "on_hold",
    COMPLETED: "completed",
  };

  const today = new Date().toISOString().split("T")[0];
  const estimatedEndDate = cp.endDate ?? null;
  const isOverdue = Boolean(
    estimatedEndDate &&
      estimatedEndDate < today &&
      normalizeText(cp.status || "") !== "completed",
  );
  const daysRemaining = estimatedEndDate
    ? Math.ceil(
        (new Date(estimatedEndDate).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  return {
    id: cp.id,
    name: cp.projectName || cp.projectCode || "Untitled Project",
    description: cp.description || "",
    status: statusMap[(cp.status || "").toUpperCase()] || "planning",
    priority: "medium",
    completionPercent: Number(cp.completionPercent || 0),
    estimatedEndDate,
    daysRemaining,
    isOverdue,
    members: Array.isArray(cp.members)
      ? cp.members.map((member) => ({
          userId: String(member.userId || ""),
          role: String(member.role || "member"),
        }))
      : [],
    createdBy: null,
    projectCost: cp.projectCost ?? undefined,
    hourlyRate: cp.hourlyRate ?? undefined,
  };
}

export default function ProjectWorkspace({
  projectId,
  mode,
  source = "standalone",
}: {
  projectId: string;
  mode: "user" | "admin";
  source?: ProjectSource;
}) {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<ProjectShape | null>(null);
  const [projectSource, setProjectSource] = useState<ProjectSource>(source);
  const [projectEmployees, setProjectEmployees] = useState<ProjectEmployee[]>([]);
  const [projectTimesheets, setProjectTimesheets] = useState<ProjectTimesheet[]>([]);
  const [timesheetsLoading, setTimesheetsLoading] = useState(false);
  const [timesheetsError, setTimesheetsError] = useState<string | null>(null);
  const [timesheetDateRange, setTimesheetDateRange] = useState<{ fromDate: string; toDate: string }>({
    fromDate: "",
    toDate: "",
  });
  const [clientTasks, setClientTasks] = useState<ClientProjectTask[]>([]);
  const [pnlSummary, setPnlSummary] = useState<{
    projectCost: number;
    hourlyRate: number;
    totalHours: number;
    employeeCount: number;
    actualCost: number;
    profitLoss: number;
    isProfit: boolean;
  } | null>(null);
  const [clientTasksLoading, setClientTasksLoading] = useState(false);
  const [clientTaskSaving, setClientTaskSaving] = useState(false);
  const [showClientTaskComposer, setShowClientTaskComposer] = useState(false);
  const [clientTaskForm, setClientTaskForm] = useState({
    title: "",
    description: "",
    assignedToUserId: "",
    dueDate: "",
    priority: "medium" as ClientTaskPriority,
  });
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [orgEmployees, setOrgEmployees] = useState<TeamMember[]>([]);
  const [profileUserId, setProfileUserId] = useState<string>("");
  const [profileRoles, setProfileRoles] = useState<string[]>([]);
  const [organizationId, setOrganizationId] = useState<string>("");

  const [progressValue, setProgressValue] = useState<number>(0);
  const [savingProgress, setSavingProgress] = useState(false);

  const [assigning, setAssigning] = useState(false);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
  const [showQaPanel, setShowQaPanel] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<Record<string, MemberRole>>({});
  const [employeeSearch, setEmployeeSearch] = useState("");

  const [issueDraft, setIssueDraft] = useState({
    pageName: "",
    issueTitle: "",
    description: "",
    imageUrl: "",
    status: "pending" as IssueStatus,
    assigneeUserId: "",
  });
  const [savingIssue, setSavingIssue] = useState(false);
  const [uploadingIssueImage, setUploadingIssueImage] = useState(false);
  const assignWorkSectionRef = useRef<HTMLDivElement | null>(null);

  const hasManagerRole = useMemo(
    () => profileRoles.some((role) => role.toUpperCase() === "MANAGER"),
    [profileRoles],
  );

  const memberNameByUserId = useMemo(() => {
    const map = new Map<string, string>();
    projectEmployees.forEach((m) => {
      map.set(m.userId, fullName(m));
    });
    return map;
  }, [projectEmployees]);

  const isClientProject = projectSource === "client";
  const isReadOnlyAdminView = mode === "admin";
  const isCurrentUserProjectManager = useMemo(() => {
    if (!profileUserId) return false;

    if (isClientProject) {
      return projectEmployees.some(
        (member) =>
          member.userId === profileUserId &&
          String(member.role || "").toLowerCase() === "manager",
      );
    }

    if (project?.createdBy?.id && project.createdBy.id === profileUserId) {
      return true;
    }

    return projectEmployees.some(
      (member) =>
        member.userId === profileUserId &&
        ["manager", "lead"].includes(String(member.role || "").toLowerCase()),
    );
  }, [isClientProject, profileUserId, project?.createdBy?.id, projectEmployees]);

  const canManageTeam = !isReadOnlyAdminView && (hasManagerRole || isCurrentUserProjectManager);
  const canEditProgress = canManageTeam;
  const canCreateIssue = canManageTeam && !isClientProject;

  const availableEmployees = useMemo(() => {
    const assigned = new Set(projectEmployees.map((m) => m.userId));
    const q = employeeSearch.trim().toLowerCase();
    return orgEmployees
      .filter((e) => !assigned.has(e.userId))
      .filter((e) => {
        if (!q) return true;
        return (
          `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
          (e.email || "").toLowerCase().includes(q) ||
          (e.workEmail || "").toLowerCase().includes(q) ||
          (e.employeeCode || "").toLowerCase().includes(q)
        );
      });
  }, [orgEmployees, projectEmployees, employeeSearch]);

  const availableQaEmployees = useMemo(() => {
    const q = employeeSearch.trim().toLowerCase();
    return projectEmployees
      .filter((e) => {
        if (!q) return true;
        return (
          `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
          (e.email || "").toLowerCase().includes(q) ||
          (e.workEmail || "").toLowerCase().includes(q) ||
          (e.employeeCode || "").toLowerCase().includes(q)
        );
      });
  }, [projectEmployees, employeeSearch]);

  const timesheetEmployeeCount = useMemo(() => {
    const unique = new Set(
      projectTimesheets.map((row) => {
        const employee = row.employee;
        if (employee?.id) return employee.id;
        return `${employee?.firstName || ""}-${employee?.lastName || ""}`;
      }),
    );
    return unique.size;
  }, [projectTimesheets]);

  const profitLossSnapshot = useMemo(() => {
    const loggedHours = projectTimesheets.reduce(
      (acc, row) => acc + Math.max(0, Number(row.workingMinutes || 0)) / 60,
      0,
    );
    const effectiveHours =
      loggedHours > 0 ? loggedHours : Math.max(1, Number(project?.completionPercent || 0) / 8);

    // Use project-specific rates if available, otherwise use defaults
    const billRatePerHour = project?.hourlyRate ? project.hourlyRate * 1.5 : 85;
    const costRatePerHour = project?.hourlyRate || 52;
    const revenue = Math.round(effectiveHours * billRatePerHour);
    const cost = Math.round(effectiveHours * costRatePerHour);
    const net = revenue - cost;

    return { loggedHours, revenue, cost, net, billRatePerHour, costRatePerHour };
  }, [project?.completionPercent, project?.hourlyRate, projectTimesheets]);

  const profitLossChartData = useMemo(
    () => [
      { name: "Revenue", amount: profitLossSnapshot.revenue, color: "#16a34a" },
      { name: "Cost", amount: profitLossSnapshot.cost, color: "#f59e0b" },
      {
        name: profitLossSnapshot.net >= 0 ? "Profit" : "Loss",
        amount: Math.abs(profitLossSnapshot.net),
        color: profitLossSnapshot.net >= 0 ? "#2563eb" : "#dc2626",
      },
    ],
    [profitLossSnapshot.cost, profitLossSnapshot.net, profitLossSnapshot.revenue, profitLossSnapshot.billRatePerHour, profitLossSnapshot.costRatePerHour],
  );

  const loadProjectTimesheetBoard = useCallback(
    async (resolvedSource: ProjectSource, projectName: string, orgId: string, fromDate?: string, toDate?: string) => {
      if (!projectName || !orgId) {
        setProjectTimesheets([]);
        setTimesheetsError(null);
        return;
      }

      setTimesheetsLoading(true);
      setTimesheetsError(null);
      try {
        if (resolvedSource === "standalone") {
          const res = await getProjectTimesheets(projectId, { page: 1, limit: 300 });
          const rows = Array.isArray(res.data?.results) ? (res.data.results as ProjectTimesheet[]) : [];
          setProjectTimesheets(rows);
          return;
        }

        // Use provided dates or default to last 30 days
        const startDate = fromDate || timesheetDateRange.fromDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const endDate = toDate || timesheetDateRange.toDate || new Date().toISOString().split("T")[0];
        
        const res = await getTimesheets({
          organizationId: orgId,
          fromDate: startDate,
          toDate: endDate,
          page: 1,
          limit: 500,
        });
        const rows = Array.isArray(res.data?.results) ? (res.data.results as ProjectTimesheet[]) : [];
        const filtered = rows.filter(
          (row) => normalizeText(row.projectName) === normalizeText(projectName),
        );
        setProjectTimesheets(filtered);
      } catch {
        setProjectTimesheets([]);
        setTimesheetsError("Failed to load project timesheet entries");
      } finally {
        setTimesheetsLoading(false);
      }
    },
    [projectId, timesheetDateRange.fromDate, timesheetDateRange.toDate],
  );

  const loadClientTaskBoard = useCallback(async (clientProjectId: string) => {
    setClientTasksLoading(true);
    try {
      const res = await getProjectTasks(clientProjectId);
      setClientTasks(Array.isArray(res.data) ? (res.data as ClientProjectTask[]) : []);
    } catch {
      setClientTasks([]);
      toast.error("Failed to load project tasks");
    } finally {
      setClientTasksLoading(false);
    }
  }, []);

  const loadWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      const profileRes = await getProfile();
      const profile = profileRes.data || {};
      const normalizedRoles: string[] = Array.isArray(profile?.roles)
        ? profile.roles
            .map((r: { roleName?: string }) => String(r?.roleName || "").toUpperCase())
            .filter(Boolean)
        : [];

      const currentUserId = profile.userId || profile.id || "";
      const orgId = profile.organizationId || "";

      setProfileUserId(currentUserId);
      setOrganizationId(orgId);
      setProfileRoles(normalizedRoles);

      const loadStandaloneWorkspace = async () => {
        const [projectRes, membersRes, issuesRes] = await Promise.all([
          getProject(projectId),
          getProjectEmployees(projectId),
          getProjectIssues(projectId),
        ]);

        return {
          source: "standalone" as const,
          project: projectRes.data as ProjectShape,
          members: Array.isArray(membersRes.data) ? membersRes.data : [],
          issues: Array.isArray(issuesRes.data) ? issuesRes.data : [],
        };
      };

      const loadClientWorkspace = async () => {
        const [projectRes, membersRes] = await Promise.all([
          getClientProject(projectId),
          getClientProjectEmployees(projectId),
        ]);
        const clientProject = projectRes.data as ClientProjectApi;
        return {
          source: "client" as const,
          project: mapClientProjectToWorkspace(clientProject),
          members: Array.isArray(membersRes.data) ? membersRes.data : [],
          issues: [] as ProjectIssue[],
        };
      };

      let workspaceData:
        | {
            source: ProjectSource;
            project: ProjectShape;
            members: ProjectEmployee[];
            issues: ProjectIssue[];
          }
        | undefined;

      if (source === "client") {
        workspaceData = await loadClientWorkspace();
      } else {
        try {
          workspaceData = await loadStandaloneWorkspace();
        } catch {
          workspaceData = await loadClientWorkspace();
        }
      }

      setProjectSource(workspaceData.source);
      setProject(workspaceData.project);
      setShowClientTaskComposer(false);
      setProgressValue(Number(workspaceData.project?.completionPercent || 0));
      setProjectEmployees(workspaceData.members);
      setIssues(workspaceData.issues);
      await loadProjectTimesheetBoard(
        workspaceData.source,
        workspaceData.project.name,
        orgId,
      );
      if (workspaceData.source === "client") {
        await loadClientTaskBoard(workspaceData.project.id);
        // Fetch P&L summary for client projects
        try {
          const pnlRes = await getClientProjectTimesheetsSummary(workspaceData.project.id);
          if (pnlRes.data) {
            setPnlSummary({
              projectCost: pnlRes.data.projectCost || 0,
              hourlyRate: pnlRes.data.hourlyRate || 0,
              totalHours: pnlRes.data.totalHours || 0,
              employeeCount: pnlRes.data.employeeCount || 0,
              actualCost: pnlRes.data.actualCost || 0,
              profitLoss: pnlRes.data.profitLoss || 0,
              isProfit: pnlRes.data.isProfit ?? true,
            });
          }
        } catch { /* ignore - P&L is optional */ }
      } else {
        setClientTasks([]);
      }
    } catch (error: unknown) {
      const message =
        typeof error === "object" &&
        error !== null &&
        "response" in error &&
        typeof (error as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Failed to load project workspace";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [loadClientTaskBoard, loadProjectTimesheetBoard, projectId, source]);

  useEffect(() => {
    void loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!showAssignPanel || !organizationId) return;
    const loadOrgEmployees = async () => {
      try {
        const res = await getAllOrgEmployees({ limit: 500 });
        setOrgEmployees(Array.isArray(res.data) ? res.data : []);
      } catch {
        toast.error("Failed to load organization employees");
      }
    };
    void loadOrgEmployees();
  }, [showAssignPanel, organizationId]);

  const handleSaveProgress = async () => {
    if (!project) return;
    try {
      setSavingProgress(true);
      const nextProgress = Math.max(0, Math.min(100, progressValue));
      if (isClientProject) {
        await updateClientProjectCompletion(project.id, nextProgress);
      } else {
        await updateProject(project.id, { completionPercent: nextProgress });
      }
      toast.success("Project progress updated");
      setProject((prev) => (prev ? { ...prev, completionPercent: nextProgress } : prev));
    } catch {
      toast.error("Failed to update progress");
    } finally {
      setSavingProgress(false);
    }
  };

  const handleAssignMembers = async () => {
    if (!project || selectedIds.length === 0) return;
    try {
      setAssigning(true);
      if (isClientProject) {
        await assignClientProjectEmployees(project.id, selectedIds);
      } else {
        const assignments = selectedIds.map((userId) => ({
          userId,
          role: selectedRoles[userId] || "member",
        }));
        await assignProjectEmployees(project.id, assignments);
      }
      toast.success("Members assigned");
      setSelectedIds([]);
      setSelectedRoles({});
      setEmployeeSearch("");
      setShowAssignPanel(false);
      const membersRes = isClientProject
        ? await getClientProjectEmployees(project.id)
        : await getProjectEmployees(project.id);
      setProjectEmployees(Array.isArray(membersRes.data) ? membersRes.data : []);
    } catch {
      toast.error("Failed to assign members");
    } finally {
      setAssigning(false);
    }
  };

  const handleAssignQa = async () => {
    if (!project || selectedIds.length === 0) return;
    if (isClientProject) {
      toast.error("QA/Tester assignment is supported only for internal projects");
      return;
    }
    try {
      setAssigning(true);
      const assignments = selectedIds.map((userId) => ({
        userId,
        role: "tester",
      }));
      await assignProjectEmployees(project.id, assignments);
      toast.success("QA/Tester assigned");
      setSelectedIds([]);
      setEmployeeSearch("");
      setShowQaPanel(false);
      const membersRes = await getProjectEmployees(project.id);
      setProjectEmployees(Array.isArray(membersRes.data) ? membersRes.data : []);
    } catch {
      toast.error("Failed to assign QA/Tester");
    } finally {
      setAssigning(false);
    }
  };

  const handleMemberRoleChange = async (userId: string, role: MemberRole) => {
    if (!project) return;
    if (isClientProject) {
      toast.error("Role updates are supported only for internal projects");
      return;
    }
    try {
      await updateProjectMemberRole(project.id, userId, role);
      setProjectEmployees((prev) =>
        prev.map((m) => (m.userId === userId ? { ...m, role } : m)),
      );
      toast.success("Member role updated");
    } catch {
      toast.error("Failed to update member role");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!project) return;
    if (userId === profileUserId) {
      toast.error("You cannot remove yourself from this project");
      return;
    }
    try {
      if (isClientProject) {
        await removeClientProjectEmployee(project.id, userId);
      } else {
        await removeProjectEmployee(project.id, userId);
      }
      setProjectEmployees((prev) => prev.filter((m) => m.userId !== userId));
      toast.success("Member removed");
    } catch {
      toast.error("Failed to remove member");
    }
  };

  const handleCreateClientTask = async () => {
    if (!project || !isClientProject) return;
    if (!clientTaskForm.title.trim()) {
      toast.error("Task title is required");
      return;
    }
    try {
      setClientTaskSaving(true);
      await createProjectTask(project.id, {
        title: clientTaskForm.title.trim(),
        description: clientTaskForm.description.trim() || undefined,
        assignedToUserId: clientTaskForm.assignedToUserId || undefined,
        dueDate: clientTaskForm.dueDate || undefined,
        priority: clientTaskForm.priority,
      });
      toast.success("Task created");
      setClientTaskForm({
        title: "",
        description: "",
        assignedToUserId: "",
        dueDate: "",
        priority: "medium",
      });
      await loadClientTaskBoard(project.id);
    } catch {
      toast.error("Failed to create task");
    } finally {
      setClientTaskSaving(false);
    }
  };

  const handleClientTaskStatusChange = async (
    taskId: string,
    status: ClientTaskStatus,
  ) => {
    if (!project || !isClientProject) return;
    const previous = clientTasks;
    setClientTasks((prev) => prev.map((task) => (task.id === taskId ? { ...task, status } : task)));
    try {
      await updateTaskStatus(project.id, taskId, status);
    } catch {
      setClientTasks(previous);
      toast.error("Failed to update task status");
    }
  };

  const handleDeleteClientTask = async (taskId: string) => {
    if (!project || !isClientProject) return;
    try {
      await deleteProjectTask(project.id, taskId);
      setClientTasks((prev) => prev.filter((task) => task.id !== taskId));
      toast.success("Task removed");
    } catch {
      toast.error("Failed to delete task");
    }
  };

  const handleIssueImageUpload = async (file: File) => {
    try {
      setUploadingIssueImage(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadFile(formData, { path: "projects/issues", public: true });
      const url = res?.data?.url || res?.data?.secureUrl || "";
      if (!url) {
        toast.error("Image upload did not return a URL");
        return;
      }
      setIssueDraft((prev) => ({ ...prev, imageUrl: url }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingIssueImage(false);
    }
  };

  const handleCreateIssue = async () => {
    if (!project) return;
    if (!issueDraft.pageName.trim() || !issueDraft.issueTitle.trim()) {
      toast.error("Page name and issue title are required");
      return;
    }
    try {
      setSavingIssue(true);
      await createProjectIssue(project.id, {
        pageName: issueDraft.pageName.trim(),
        issueTitle: issueDraft.issueTitle.trim(),
        description: issueDraft.description.trim() || undefined,
        imageUrl: issueDraft.imageUrl.trim() || undefined,
        status: issueDraft.status,
        assigneeUserId: issueDraft.assigneeUserId || undefined,
      });
      const issuesRes = await getProjectIssues(project.id);
      setIssues(Array.isArray(issuesRes.data) ? issuesRes.data : []);
      setIssueDraft({
        pageName: "",
        issueTitle: "",
        description: "",
        imageUrl: "",
        status: "pending",
        assigneeUserId: "",
      });
      toast.success("Issue added");
    } catch {
      toast.error("Failed to add issue");
    } finally {
      setSavingIssue(false);
    }
  };

  const handleIssueStatusChange = async (issueId: string, status: IssueStatus) => {
    if (!project) return;
    const previous = issues;
    setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, status } : i)));
    try {
      await updateProjectIssue(project.id, issueId, { status });
    } catch {
      setIssues(previous);
      toast.error("Failed to update issue status");
    }
  };

  const handleIssueFieldSave = async (
    issueId: string,
    patch: Partial<
      Pick<ProjectIssue, "pageName" | "issueTitle" | "description" | "imageUrl" | "assigneeUserId">
    >,
  ) => {
    if (!project) return;
    try {
      await updateProjectIssue(project.id, issueId, patch);
      setIssues((prev) => prev.map((i) => (i.id === issueId ? { ...i, ...patch } : i)));
      toast.success("Issue updated");
    } catch {
      toast.error("Failed to update issue");
    }
  };

  const handleAssignWorkClick = () => {
    if (isClientProject && canManageTeam) {
      setShowClientTaskComposer(true);
    }
    assignWorkSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading project workspace...</div>
    );
  }

  if (!project) {
    return <div className="p-6 text-sm text-red-500">Project not found.</div>;
  }

  return (
    <div className="mx-auto max-w-[1440px] p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(mode === "admin" ? "/admin/projects" : "/user/projects")}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <FolderKanban className="w-6 h-6" />
              {project.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Dedicated project workspace with team management, timesheet board, and assigned work table.
            </p>
          </div>
        </div>
        {canManageTeam ? (
          <Button size="sm" onClick={handleAssignWorkClick}>
            <ListTodo className="w-4 h-4 mr-1" />
            Assign Work
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="capitalize">
              {projectSource}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {project.status.replace("_", " ")}
            </Badge>
            <Badge variant="outline" className="capitalize">
              {project.priority}
            </Badge>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-4 space-y-2 lg:col-span-2">
          <h3 className="font-semibold">Project Overview</h3>
          <p className="text-sm text-muted-foreground">
            {project.description || "No description provided."}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Users className="w-3.5 h-3.5" />
              {projectEmployees.length} members
            </span>
            {project.estimatedEndDate && (
              <span className="inline-flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {project.estimatedEndDate}
              </span>
            )}
            {project.daysRemaining !== null && (
              <span className={`inline-flex items-center gap-1 ${project.isOverdue ? "text-red-500" : ""}`}>
                <Clock className="w-3.5 h-3.5" />
                {project.isOverdue
                  ? `${Math.abs(project.daysRemaining)}d overdue`
                  : `${project.daysRemaining}d remaining`}
              </span>
            )}
          </div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold">Progress</h3>
          <Input
            type="number"
            min={0}
            max={100}
            value={progressValue}
            onChange={(e) => setProgressValue(Number(e.target.value || 0))}
            disabled={!canEditProgress}
          />
          <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all"
              style={{ width: `${Math.max(0, Math.min(100, progressValue))}%` }}
            />
          </div>
          {canEditProgress ? (
            <Button size="sm" onClick={handleSaveProgress} disabled={savingProgress}>
              {savingProgress ? "Saving..." : "Save Progress"}
            </Button>
          ) : (
            <p className="text-xs text-muted-foreground">
              Only the assigned project manager can update progress.
            </p>
          )}
        </div>
      </div>

      {isReadOnlyAdminView ? (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-semibold">Profit / Loss Snapshot</h2>
              <p className="text-xs text-muted-foreground">
                {pnlSummary
                  ? `Based on project cost (₹${pnlSummary.projectCost.toLocaleString()}) and hourly rate (₹${pnlSummary.hourlyRate}/hr)`
                  : "Estimated from project timesheet hours using default internal billing rates."}
              </p>
            </div>
            <Badge variant="outline">
              {pnlSummary ? `${pnlSummary.totalHours.toFixed(1)}h logged` : `${profitLossSnapshot.loggedHours.toFixed(1)}h logged`}
            </Badge>
          </div>

          {pnlSummary ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Employees</p>
                  <p className="text-lg font-semibold">{pnlSummary.employeeCount}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Total Hours</p>
                  <p className="text-lg font-semibold">{pnlSummary.totalHours.toFixed(1)}h</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Project Cost</p>
                  <p className="text-lg font-semibold text-green-600">₹{pnlSummary.projectCost.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Actual Cost</p>
                  <p className="text-lg font-semibold text-amber-600">₹{pnlSummary.actualCost.toLocaleString()}</p>
                </div>
              </div>
              <div className="rounded-lg border border-border p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  {pnlSummary.isProfit ? "Profit" : "Loss"}
                </p>
                <p className={`text-2xl font-bold ${pnlSummary.isProfit ? "text-green-600" : "text-red-600"}`}>
                  {pnlSummary.isProfit ? "+" : "-"}₹{pnlSummary.profitLoss.toLocaleString()}
                </p>
              </div>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Project Cost", amount: pnlSummary.projectCost, color: "#16a34a" },
                      { name: "Actual Cost", amount: pnlSummary.actualCost, color: "#f59e0b" },
                      { name: pnlSummary.isProfit ? "Profit" : "Loss", amount: pnlSummary.profitLoss, color: pnlSummary.isProfit ? "#2563eb" : "#dc2626" },
                    ]}
                    margin={{ top: 10, right: 16, left: -16, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      formatter={(value) => [`₹${Number(value || 0).toLocaleString()}`, "Amount"]}
                    />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {[
                        { name: "Project Cost", amount: pnlSummary.projectCost, color: "#16a34a" },
                        { name: "Actual Cost", amount: pnlSummary.actualCost, color: "#f59e0b" },
                        { name: pnlSummary.isProfit ? "Profit" : "Loss", amount: pnlSummary.profitLoss, color: pnlSummary.isProfit ? "#2563eb" : "#dc2626" },
                      ].map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Estimated Revenue</p>
                  <p className="text-lg font-semibold text-green-600">₹{profitLossSnapshot.revenue.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Estimated Cost</p>
                  <p className="text-lg font-semibold text-amber-600">₹{profitLossSnapshot.cost.toLocaleString()}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">
                    {profitLossSnapshot.net >= 0 ? "Estimated Profit" : "Estimated Loss"}
                  </p>
                  <p className={`text-lg font-semibold ${profitLossSnapshot.net >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    ₹{Math.abs(profitLossSnapshot.net).toLocaleString()}
                  </p>
                </div>
              </div>

              {project?.projectCost && (
                <div className="rounded-lg border border-border p-3 mt-3">
                  <p className="text-xs text-muted-foreground">Project Budget</p>
                  <p className="text-lg font-semibold text-green-600">₹{Number(project.projectCost).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Hourly Rate: ₹{project.hourlyRate || profitLossSnapshot.costRatePerHour}/hr
                  </p>
                </div>
              )}

              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={profitLossChartData} margin={{ top: 10, right: 16, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: 12,
                      }}
                      formatter={(value) => [`${Number(value || 0).toLocaleString()}`, "Amount"]}
                    />
                    <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                      {profitLossChartData.map((item) => (
                        <Cell key={item.name} fill={item.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      ) : null}

      {/* Project Timesheet Entries - Only visible to Admin/Manager */}
      {isReadOnlyAdminView ? (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-semibold">Project Timesheet Entries</h2>
            <p className="text-xs text-muted-foreground">
              {isClientProject
                ? "View timesheet entries for this project. Filter by date range to see historical data."
                : "Employees who submitted timesheet entries for this project."}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{projectTimesheets.length} entries</Badge>
            <Badge variant="outline">{timesheetEmployeeCount} employees</Badge>
          </div>
        </div>

        {/* Date Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">From:</span>
            <Input
              type="date"
              className="h-8 w-36 text-xs"
              value={timesheetDateRange.fromDate}
              onChange={(e) => setTimesheetDateRange((prev) => ({ ...prev, fromDate: e.target.value }))}
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">To:</span>
            <Input
              type="date"
              className="h-8 w-36 text-xs"
              value={timesheetDateRange.toDate}
              onChange={(e) => setTimesheetDateRange((prev) => ({ ...prev, toDate: e.target.value }))}
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-8"
            onClick={() => {
              loadProjectTimesheetBoard(
                projectSource,
                project?.name || "",
                organizationId,
                timesheetDateRange.fromDate,
                timesheetDateRange.toDate,
              );
            }}
          >
            Filter
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8"
            onClick={() => {
              setTimesheetDateRange({ fromDate: "", toDate: "" });
              loadProjectTimesheetBoard(projectSource, project?.name || "", organizationId, "", "");
            }}
          >
            Clear
          </Button>
        </div>

        {timesheetsLoading ? (
          <div className="h-20 flex items-center text-sm text-muted-foreground">
            Loading project timesheet entries...
          </div>
        ) : timesheetsError ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {timesheetsError}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-3 py-2 border-b border-border">Employee</th>
                  <th className="text-left px-3 py-2 border-b border-border">Date</th>
                  <th className="text-left px-3 py-2 border-b border-border">Start</th>
                  <th className="text-left px-3 py-2 border-b border-border">End</th>
                  <th className="text-left px-3 py-2 border-b border-border">Hours</th>
                  <th className="text-left px-3 py-2 border-b border-border">Work Summary</th>
                  <th className="text-left px-3 py-2 border-b border-border">Employee Remark</th>
                  <th className="text-left px-3 py-2 border-b border-border">Manager Remark</th>
                </tr>
              </thead>
              <tbody>
                {projectTimesheets.length === 0 ? (
                  <tr>
                    <td className="px-3 py-4 text-muted-foreground" colSpan={8}>
                      {isClientProject
                        ? "No timesheet entries found for this project today."
                        : "No timesheet entries found for this project yet."}
                    </td>
                  </tr>
                ) : (
                  projectTimesheets.map((row) => {
                    const employeeName = row.employee
                      ? [row.employee.firstName, row.employee.middleName, row.employee.lastName]
                          .filter(Boolean)
                          .join(" ")
                      : "Unknown";

                    return (
                      <tr key={row.id} className="border-b border-border last:border-b-0 align-top">
                        <td className="px-3 py-2">
                          <div className="font-medium">{employeeName || "Unknown"}</div>
                          {row.employee?.employeeCode ? (
                            <div className="text-xs text-muted-foreground">{row.employee.employeeCode}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2">{formatDisplayDate(row.date)}</td>
                        <td className="px-3 py-2">{formatDisplayTime(row.startTime)}</td>
                        <td className="px-3 py-2">{formatDisplayTime(row.endTime)}</td>
                        <td className="px-3 py-2">{formatMinutes(row.workingMinutes)}</td>
                        <td className="px-3 py-2 min-w-[220px]">{row.workDescription || "--"}</td>
                        <td className="px-3 py-2 min-w-[180px]">{row.employeeRemark || "--"}</td>
                        <td className="px-3 py-2 min-w-[180px]">{row.managerRemark || "--"}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Project Team Assignment</h2>
          {canManageTeam && !isClientProject && (
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setShowQaPanel((s) => !s)}>
                <Users className="w-4 h-4 mr-1" />
                {showQaPanel ? "Close" : "Add QA/Tester"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => setShowAssignPanel((s) => !s)}>
                <Plus className="w-4 h-4 mr-1" />
                {showAssignPanel ? "Close" : "Assign Members"}
              </Button>
            </div>
          )}
        </div>

        {showQaPanel && canManageTeam && (
          <div className="border border-border rounded-lg p-3 space-y-3">
            <Input
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              placeholder="Search team member by name/email/id"
            />
            <div className="max-h-56 overflow-auto border border-border rounded-md">
              {availableQaEmployees.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No team members found.</div>
              ) : (
                availableQaEmployees.map((emp) => {
                  const checked = selectedIds.includes(emp.userId);
                  const isAlreadyTester = (emp.role || "").toLowerCase() === "tester";
                  return (
                    <div key={emp.userId} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border last:border-b-0">
                      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={isAlreadyTester}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? [...prev, emp.userId]
                                : prev.filter((id) => id !== emp.userId),
                            )
                          }
                        />
                        <span className="text-sm truncate">
                          {emp.firstName} {emp.lastName} ({emp.employeeCode || emp.employeeId || "—"})
                        </span>
                      </label>
                      <Badge variant={isAlreadyTester ? "default" : "outline"} className="text-[10px] px-1.5">
                        {isAlreadyTester ? "Tester" : emp.role || "member"}
                      </Badge>
                    </div>
                  );
                })
              )}
            </div>
            <Button
              size="sm"
              onClick={handleAssignQa}
              disabled={assigning || selectedIds.length === 0}
            >
              {assigning ? "Assigning..." : `Assign ${selectedIds.length} as QA/Tester`}
            </Button>
          </div>
        )}

        {showAssignPanel && canManageTeam && (
          <div className="border border-border rounded-lg p-3 space-y-3">
            <Input
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
              placeholder="Search employee by name/email/id"
            />
            <div className="max-h-56 overflow-auto border border-border rounded-md">
              {availableEmployees.length === 0 ? (
                <div className="p-3 text-sm text-muted-foreground">No available employees.</div>
              ) : (
                availableEmployees.map((emp) => {
                  const checked = selectedIds.includes(emp.userId);
                  return (
                    <div key={emp.userId} className="flex items-center justify-between gap-2 px-3 py-2 border-b border-border last:border-b-0">
                      <label className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? [...prev, emp.userId]
                                : prev.filter((id) => id !== emp.userId),
                            )
                          }
                        />
                        <span className="text-sm truncate">
                          {emp.firstName} {emp.lastName} ({emp.employeeCode || emp.employeeId || "—"})
                        </span>
                      </label>
                      {isClientProject ? (
                        <Badge variant="outline" className="text-[10px] px-1.5">
                          member
                        </Badge>
                      ) : (
                        <select
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                          value={selectedRoles[emp.userId] || "member"}
                          onChange={(e) =>
                            setSelectedRoles((prev) => ({
                              ...prev,
                              [emp.userId]: e.target.value as MemberRole,
                            }))
                          }
                        >
                          <option value="member">Member</option>
                          <option value="tester">Tester</option>
                          <option value="lead">Lead</option>
                        </select>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <Button
              size="sm"
              onClick={handleAssignMembers}
              disabled={assigning || selectedIds.length === 0}
            >
              {assigning ? "Assigning..." : `Assign ${selectedIds.length} Member(s)`}
            </Button>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-border">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2 border-b border-border">Name</th>
                <th className="text-left px-3 py-2 border-b border-border">Designation</th>
                <th className="text-left px-3 py-2 border-b border-border">Email</th>
                <th className="text-left px-3 py-2 border-b border-border">Role</th>
                <th className="text-left px-3 py-2 border-b border-border">Manager</th>
                <th className="text-right px-3 py-2 border-b border-border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projectEmployees.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={6}>
                    No members assigned yet.
                  </td>
                </tr>
              ) : (
                projectEmployees.map((emp) => (
                  <tr key={emp.userId} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2">{emp.firstName} {emp.lastName}</td>
                    <td className="px-3 py-2">{emp.designation || "—"}</td>
                    <td className="px-3 py-2">{emp.workEmail || emp.email}</td>
                    <td className="px-3 py-2">
                      {canManageTeam && !isClientProject ? (
                        <select
                          className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                          value={(emp.role || "member").toLowerCase()}
                          onChange={(e) =>
                            handleMemberRoleChange(emp.userId, e.target.value as MemberRole)
                          }
                        >
                          <option value="member">Member</option>
                          <option value="tester">Tester</option>
                          <option value="lead">Lead</option>
                        </select>
                      ) : (
                        <Badge variant="outline" className="capitalize">
                          {emp.role || "member"}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {emp.managerName || "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {!isClientProject && (
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Test Sheet"
                            onClick={() => router.push(`/user/projects/${project?.id}/test-sheet?userId=${emp.userId}`)}
                          >
                            <ClipboardList className="w-4 h-4" />
                          </Button>
                        )}
                        {canManageTeam && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-500"
                            disabled={emp.userId === profileUserId}
                            title={
                              emp.userId === profileUserId
                                ? "You cannot remove yourself"
                                : "Remove member"
                            }
                            onClick={() => handleRemoveMember(emp.userId)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isClientProject ? (
        <div
          id="assign-work-section"
          ref={assignWorkSectionRef}
          className="rounded-xl border border-border bg-card p-4 space-y-4"
        >
          <h2 className="font-semibold">Assigned Work Data Table</h2>
          <p className="text-xs text-muted-foreground">
            Managers can assign work to project employees. Team members can update assigned task status.
          </p>

          {canCreateIssue ? (
            <div className="grid grid-cols-1 md:grid-cols-7 gap-2 p-3 border border-border rounded-lg">
              <Input
                className="md:col-span-1"
                placeholder="Work Area"
                value={issueDraft.pageName}
                onChange={(e) => setIssueDraft((s) => ({ ...s, pageName: e.target.value }))}
              />
              <Input
                className="md:col-span-2"
                placeholder="Task Title"
                value={issueDraft.issueTitle}
                onChange={(e) => setIssueDraft((s) => ({ ...s, issueTitle: e.target.value }))}
              />
              <Textarea
                className="md:col-span-2 min-h-[36px] h-9"
                placeholder="Task Details"
                value={issueDraft.description}
                onChange={(e) => setIssueDraft((s) => ({ ...s, description: e.target.value }))}
              />
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm md:col-span-1"
                value={issueDraft.assigneeUserId}
                onChange={(e) =>
                  setIssueDraft((s) => ({ ...s, assigneeUserId: e.target.value }))
                }
              >
                <option value="">Unassigned</option>
                {projectEmployees.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {fullName(member)} ({(member.role || "member").toLowerCase()})
                  </option>
                ))}
              </select>
              <select
                className="h-9 rounded-md border border-input bg-background px-2 text-sm md:col-span-1"
                value={issueDraft.status}
                onChange={(e) =>
                  setIssueDraft((s) => ({ ...s, status: e.target.value as IssueStatus }))
                }
              >
                <option value="pending">Pending</option>
                <option value="resolved">Resolved</option>
              </select>

              <div className="md:col-span-5 flex gap-2 items-center">
                <Input
                  placeholder="Attachment URL (or upload below)"
                  value={issueDraft.imageUrl}
                  onChange={(e) => setIssueDraft((s) => ({ ...s, imageUrl: e.target.value }))}
                />
                <label className="inline-flex">
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleIssueImageUpload(file);
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button type="button" size="sm" variant="outline" disabled={uploadingIssueImage} asChild>
                    <span>
                      <Upload className="w-4 h-4 mr-1" />
                      {uploadingIssueImage ? "Uploading..." : "Upload"}
                    </span>
                  </Button>
                </label>
              </div>
              <div className="md:col-span-2 flex justify-end">
                <Button onClick={handleCreateIssue} disabled={savingIssue}>
                  <Plus className="w-4 h-4 mr-1" />
                  {savingIssue ? "Assigning..." : "Assign Work"}
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Only managers can assign work in this project.
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-border">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-2 py-2 border-b border-border">Project</th>
                  <th className="text-left px-2 py-2 border-b border-border">Work Area</th>
                  <th className="text-left px-2 py-2 border-b border-border">Task</th>
                  <th className="text-left px-2 py-2 border-b border-border">Details</th>
                  <th className="text-left px-2 py-2 border-b border-border">Attachment</th>
                  <th className="text-left px-2 py-2 border-b border-border">Assigned To</th>
                  <th className="text-left px-2 py-2 border-b border-border">Status</th>
                  <th className="text-left px-2 py-2 border-b border-border">Assigned By</th>
                  <th className="text-right px-2 py-2 border-b border-border">Save</th>
                </tr>
              </thead>
              <tbody>
                {issues.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-4 text-muted-foreground">
                      No assigned work rows yet.
                    </td>
                  </tr>
                ) : (
                  issues.map((issue) => (
                    <IssueRow
                      key={issue.id}
                      issue={issue}
                      projectName={project.name}
                      reporterName={
                        memberNameByUserId.get(issue.createdByUserId) ||
                        shortId(issue.createdByUserId)
                      }
                      assigneeName={
                        issue.assigneeUserId
                          ? memberNameByUserId.get(issue.assigneeUserId) ||
                            shortId(issue.assigneeUserId)
                          : "Unassigned"
                      }
                      assignableMembers={projectEmployees}
                      canEditFields={canManageTeam}
                      canChangeStatus={
                        !isReadOnlyAdminView &&
                        (canManageTeam || issue.assigneeUserId === profileUserId)
                      }
                      onStatusChange={handleIssueStatusChange}
                      onSave={handleIssueFieldSave}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div
          id="assign-work-section"
          ref={assignWorkSectionRef}
          className="rounded-xl border border-border bg-card p-4 space-y-4"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h2 className="font-semibold">Assign Work / Create Task</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Create tasks for project members and track progress in one place.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {canManageTeam ? (
                <Button
                  size="sm"
                  variant={showClientTaskComposer ? "outline" : "default"}
                  onClick={() => setShowClientTaskComposer((prev) => !prev)}
                >
                  <ListTodo className="w-4 h-4 mr-1" />
                  {showClientTaskComposer ? "Close Assign Work" : "Assign Work"}
                </Button>
              ) : null}
              <Badge variant="outline">{clientTasks.length} tasks</Badge>
            </div>
          </div>

          {canManageTeam ? (
            showClientTaskComposer ? (
              <div className="grid grid-cols-1 md:grid-cols-6 gap-2 p-3 border border-border rounded-lg">
                <Input
                  className="md:col-span-2"
                  placeholder="Task title"
                  value={clientTaskForm.title}
                  onChange={(e) => setClientTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                />
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm md:col-span-1"
                  value={clientTaskForm.assignedToUserId}
                  onChange={(e) =>
                    setClientTaskForm((prev) => ({ ...prev, assignedToUserId: e.target.value }))
                  }
                >
                  <option value="">Unassigned</option>
                  {projectEmployees.map((member) => (
                    <option key={member.userId} value={member.userId}>
                      {fullName(member)}
                    </option>
                  ))}
                </select>
                <select
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm md:col-span-1"
                  value={clientTaskForm.priority}
                  onChange={(e) =>
                    setClientTaskForm((prev) => ({
                      ...prev,
                      priority: e.target.value as ClientTaskPriority,
                    }))
                  }
                >
                  {clientTaskPriorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="date"
                  className="md:col-span-1"
                  value={clientTaskForm.dueDate}
                  onChange={(e) => setClientTaskForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                />
                <Button
                  className="md:col-span-1"
                  disabled={clientTaskSaving || !clientTaskForm.title.trim()}
                  onClick={handleCreateClientTask}
                >
                  {clientTaskSaving ? "Creating..." : "Create Task"}
                </Button>
                <Textarea
                  className="md:col-span-6 min-h-[70px]"
                  placeholder="Task description (optional)"
                  value={clientTaskForm.description}
                  onChange={(e) =>
                    setClientTaskForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                />
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Click <span className="font-medium text-foreground">Assign Work</span> to create a task for employees in this project.
              </p>
            )
          ) : (
            <p className="text-xs text-muted-foreground">
              {isReadOnlyAdminView
                ? "Admin project detail is view-only. Only the assigned project manager can create tasks."
                : "Only the assigned project manager can create tasks. You can still update your assigned task status."}
            </p>
          )}

          {clientTasksLoading ? (
            <div className="h-20 flex items-center text-sm text-muted-foreground">
              Loading tasks...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="text-left px-3 py-2 border-b border-border">Task</th>
                    <th className="text-left px-3 py-2 border-b border-border">Assigned To</th>
                    <th className="text-left px-3 py-2 border-b border-border">Priority</th>
                    <th className="text-left px-3 py-2 border-b border-border">Due Date</th>
                    <th className="text-left px-3 py-2 border-b border-border">Status</th>
                    <th className="text-left px-3 py-2 border-b border-border">Assigned By</th>
                    <th className="text-right px-3 py-2 border-b border-border">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clientTasks.length === 0 ? (
                    <tr>
                      <td className="px-3 py-4 text-muted-foreground" colSpan={7}>
                        No tasks created for this project yet.
                      </td>
                    </tr>
                  ) : (
                    clientTasks.map((task) => {
                      const statusMeta = clientTaskStatusConfig[task.status];
                      const StatusIcon = statusMeta.icon;
                      const canUpdateStatus =
                        !isReadOnlyAdminView &&
                        (canManageTeam || task.assignedToUserId === profileUserId);
                      const canDeleteTask =
                        !isReadOnlyAdminView && canManageTeam;

                      return (
                        <tr key={task.id} className="border-b border-border last:border-b-0 align-top">
                          <td className="px-3 py-2 min-w-[260px]">
                            <p className="font-medium">{task.title}</p>
                            {task.description ? (
                              <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                            ) : null}
                          </td>
                          <td className="px-3 py-2">{formatUserName(task.assignedToUser) || "--"}</td>
                          <td className="px-3 py-2 capitalize">{task.priority}</td>
                          <td className="px-3 py-2">{task.dueDate ? formatDisplayDate(task.dueDate) : "--"}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className={`${statusMeta.color} ${statusMeta.bgColor}`}
                              >
                                <StatusIcon className="w-3 h-3 mr-1" />
                                {statusMeta.label}
                              </Badge>
                              <select
                                className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                                value={task.status}
                                disabled={!canUpdateStatus}
                                onChange={(e) =>
                                  handleClientTaskStatusChange(
                                    task.id,
                                    e.target.value as ClientTaskStatus,
                                  )
                                }
                              >
                                <option value="pending">Pending</option>
                                <option value="in_progress">Working</option>
                                <option value="issue">Issue</option>
                                <option value="completed">Completed</option>
                                <option value="cancelled">Cancelled</option>
                              </select>
                            </div>
                          </td>
                          <td className="px-3 py-2">{formatUserName(task.assignedByUser)}</td>
                          <td className="px-3 py-2 text-right">
                            {canDeleteTask ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-500"
                                onClick={() => handleDeleteClientTask(task.id)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function IssueRow({
  issue,
  projectName,
  reporterName,
  assigneeName,
  assignableMembers,
  canEditFields,
  canChangeStatus,
  onStatusChange,
  onSave,
}: {
  issue: ProjectIssue;
  projectName: string;
  reporterName: string;
  assigneeName: string;
  assignableMembers: ProjectEmployee[];
  canEditFields: boolean;
  canChangeStatus: boolean;
  onStatusChange: (issueId: string, status: IssueStatus) => void;
  onSave: (
    issueId: string,
    patch: Partial<
      Pick<ProjectIssue, "pageName" | "issueTitle" | "description" | "imageUrl" | "assigneeUserId">
    >,
  ) => Promise<void>;
}) {
  const [draft, setDraft] = useState({
    pageName: issue.pageName || "",
    issueTitle: issue.issueTitle || "",
    description: issue.description || "",
    imageUrl: issue.imageUrl || "",
    assigneeUserId: issue.assigneeUserId || "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDraft({
      pageName: issue.pageName || "",
      issueTitle: issue.issueTitle || "",
      description: issue.description || "",
      imageUrl: issue.imageUrl || "",
      assigneeUserId: issue.assigneeUserId || "",
    });
  }, [issue]);

  return (
    <tr className="border-b border-border last:border-b-0 align-top">
      <td className="px-2 py-2 min-w-[180px]">{projectName}</td>
      <td className="px-2 py-2 min-w-[170px]">
        <Input
          value={draft.pageName}
          disabled={!canEditFields}
          onChange={(e) => setDraft((s) => ({ ...s, pageName: e.target.value }))}
        />
      </td>
      <td className="px-2 py-2 min-w-[200px]">
        <Input
          value={draft.issueTitle}
          disabled={!canEditFields}
          onChange={(e) => setDraft((s) => ({ ...s, issueTitle: e.target.value }))}
        />
      </td>
      <td className="px-2 py-2 min-w-[220px]">
        <Textarea
          className="min-h-[38px]"
          value={draft.description}
          disabled={!canEditFields}
          onChange={(e) => setDraft((s) => ({ ...s, description: e.target.value }))}
        />
      </td>
      <td className="px-2 py-2 min-w-[220px]">
        <Input
          value={draft.imageUrl}
          disabled={!canEditFields}
          onChange={(e) => setDraft((s) => ({ ...s, imageUrl: e.target.value }))}
          placeholder="https://..."
        />
        {draft.imageUrl ? (
          <a
            href={draft.imageUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-blue-600 underline mt-1 inline-block"
          >
            Open image
          </a>
        ) : null}
      </td>
      <td className="px-2 py-2 min-w-[190px]">
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm w-full"
          value={draft.assigneeUserId}
          disabled={!canEditFields}
          onChange={(e) => setDraft((s) => ({ ...s, assigneeUserId: e.target.value }))}
        >
          <option value="">Unassigned</option>
          {assignableMembers.map((member) => (
            <option key={member.userId} value={member.userId}>
              {fullName(member)} ({(member.role || "member").toLowerCase()})
            </option>
          ))}
        </select>
        <div className="text-[11px] text-muted-foreground mt-1">{assigneeName}</div>
      </td>
      <td className="px-2 py-2 min-w-[120px]">
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={issue.status}
          disabled={!canChangeStatus}
          onChange={(e) => onStatusChange(issue.id, e.target.value as IssueStatus)}
        >
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
      </td>
      <td className="px-2 py-2 min-w-[130px] text-xs text-muted-foreground">{reporterName}</td>
      <td className="px-2 py-2 text-right min-w-[90px]">
        <Button
          size="sm"
          variant="outline"
          disabled={saving || !canEditFields}
          onClick={async () => {
            if (!canEditFields) return;
            try {
              setSaving(true);
              await onSave(issue.id, {
                pageName: draft.pageName,
                issueTitle: draft.issueTitle,
                description: draft.description,
                imageUrl: draft.imageUrl,
                assigneeUserId: draft.assigneeUserId || null,
              });
            } finally {
              setSaving(false);
            }
          }}
        >
          <Save className="w-3.5 h-3.5 mr-1" />
          Save
        </Button>
      </td>
    </tr>
  );
}
