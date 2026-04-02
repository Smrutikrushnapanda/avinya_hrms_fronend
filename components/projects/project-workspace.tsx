"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  assignClientProjectEmployees,
  assignProjectEmployees,
  createProjectIssue,
  getClientProjectEmployees,
  getAllOrgEmployees,
  getMyClientProjects,
  getProfile,
  getProject,
  getProjectEmployees,
  getProjectIssues,
  getProjectTimesheets,
  getTimesheets,
  removeClientProjectEmployee,
  removeProjectEmployee,
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
  ArrowLeft,
  Calendar,
  Clock,
  FolderKanban,
  Plus,
  Save,
  Upload,
  Users,
  X,
} from "lucide-react";

type ProjectStatus = "planning" | "active" | "on_hold" | "completed";
type ProjectPriority = "low" | "medium" | "high" | "critical";
type IssueStatus = "pending" | "resolved";
type MemberRole = "member" | "tester" | "lead";
type ProjectSource = "standalone" | "client";

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
  members?: Array<{ userId?: string | null; role?: string | null }>;
};

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
  const [issues, setIssues] = useState<ProjectIssue[]>([]);
  const [orgEmployees, setOrgEmployees] = useState<TeamMember[]>([]);
  const [profileUserId, setProfileUserId] = useState<string>("");
  const [profileRoles, setProfileRoles] = useState<string[]>([]);
  const [organizationId, setOrganizationId] = useState<string>("");

  const [progressValue, setProgressValue] = useState<number>(0);
  const [savingProgress, setSavingProgress] = useState(false);

  const [assigning, setAssigning] = useState(false);
  const [showAssignPanel, setShowAssignPanel] = useState(false);
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

  const isAdminOrManager = useMemo(
    () =>
      profileRoles.some((role) =>
        ["ADMIN", "MANAGER", "SUPER_ADMIN", "ORG_ADMIN"].includes(role.toUpperCase()),
      ),
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
  const canManageTeam = isAdminOrManager || mode === "admin";
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

  const loadProjectTimesheetBoard = useCallback(
    async (resolvedSource: ProjectSource, projectName: string, orgId: string) => {
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

        const res = await getTimesheets({
          organizationId: orgId,
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
    [projectId],
  );

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
        const [projectsRes, membersRes] = await Promise.all([
          getMyClientProjects(),
          getClientProjectEmployees(projectId),
        ]);
        const list = Array.isArray(projectsRes.data) ? (projectsRes.data as ClientProjectApi[]) : [];
        const clientProject = list.find((row) => row.id === projectId);
        if (!clientProject) {
          throw new Error("Client project not found");
        }
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
      setProgressValue(Number(workspaceData.project?.completionPercent || 0));
      setProjectEmployees(workspaceData.members);
      setIssues(workspaceData.issues);
      await loadProjectTimesheetBoard(
        workspaceData.source,
        workspaceData.project.name,
        orgId,
      );
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
  }, [loadProjectTimesheetBoard, projectId, source]);

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

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">Loading project workspace...</div>
    );
  }

  if (!project) {
    return <div className="p-6 text-sm text-red-500">Project not found.</div>;
  }

  return (
    <div className="p-6 space-y-6">
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
              Only manager/admin can update progress.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="font-semibold">Project Timesheet Entries</h2>
            <p className="text-xs text-muted-foreground">
              Employees who submitted timesheet entries for this project.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">{projectTimesheets.length} entries</Badge>
            <Badge variant="outline">{timesheetEmployeeCount} employees</Badge>
          </div>
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
                      No timesheet entries found for this project yet.
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

      <div className="rounded-xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Project Team Assignment</h2>
          {canManageTeam && (
            <Button size="sm" variant="outline" onClick={() => setShowAssignPanel((s) => !s)}>
              <Plus className="w-4 h-4 mr-1" />
              {showAssignPanel ? "Close" : "Assign Members"}
            </Button>
          )}
        </div>

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
                <th className="text-left px-3 py-2 border-b border-border">Email</th>
                <th className="text-left px-3 py-2 border-b border-border">Role</th>
                <th className="text-left px-3 py-2 border-b border-border">Manager</th>
                <th className="text-right px-3 py-2 border-b border-border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {projectEmployees.length === 0 ? (
                <tr>
                  <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                    No members assigned yet.
                  </td>
                </tr>
              ) : (
                projectEmployees.map((emp) => (
                  <tr key={emp.userId} className="border-b border-border last:border-b-0">
                    <td className="px-3 py-2">{emp.firstName} {emp.lastName}</td>
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!isClientProject ? (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
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
                        canManageTeam || issue.assigneeUserId === profileUserId
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
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="font-semibold">Work Assignment</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Team assignment and project-wise timesheet visibility are enabled for this client project.
            Task assignment board is available for internal projects.
          </p>
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
