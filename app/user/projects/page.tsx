"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  getMyProjects,
  getMyClientProjects,
  updateProject,
  updateClientProjectCompletion,
  getProjectEmployees,
  assignProjectEmployees,
  removeProjectEmployee,
  getMyTeamEmployees,
  getAllOrgEmployees,
  getClientProjectEmployees,
  assignClientProjectEmployees,
  removeClientProjectEmployee,
} from "@/app/api/api";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  FolderKanban,
  Calendar,
  Users,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  ChevronRight,
  Building2,
  UserPlus,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectStatus = "planning" | "active" | "on_hold" | "completed";
type ProjectPriority = "low" | "medium" | "high" | "critical";

interface ProjectMemberItem {
  userId: string;
  role: string;
  user: { id: string; email: string; firstName: string; lastName: string } | null;
}

interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  completionPercent: number;
  estimatedEndDate: string | null;
  startDate?: string | null;
  isOverdue: boolean;
  daysRemaining: number | null;
  memberCount: number;
  members: ProjectMemberItem[];
  createdBy: { firstName: string; lastName: string; email: string } | null;
  createdAt: string;
  _source: "standalone" | "client";
  _isManager: boolean;
}

// Employee assigned to project (from getProjectEmployees)
interface ProjectEmployee {
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
  reportingTo: string | null;
  managerName: string | null;
}

// Team member for manager to assign
interface TeamMember {
  employeeId: string;
  employeeCode?: string | null;
  userId: string;
  firstName: string;
  lastName: string;
  email: string;
  workEmail: string;
  department: string | null;
  designationId?: string | null;
  designation: string | null;
}

type ClientProjectApi = {
  id: string;
  projectName?: string | null;
  projectCode?: string | null;
  description?: string | null;
  status?: string | null;
  completionPercent?: number | null;
  endDate?: string | null;
  startDate?: string | null;
  createdAt: string;
  manager?: {
    userId?: string | null;
    workEmail?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    user?: { id?: string | null; email?: string | null } | null;
  } | null;
};

type StandaloneProjectApi = Project & {
  createdAt?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────

const statusConfig: Record<ProjectStatus, { label: string; color: string; bg: string }> = {
  planning:  { label: "Planning",  color: "text-blue-700 border-blue-200",   bg: "bg-blue-100 dark:bg-blue-900/30"   },
  active:    { label: "Active",    color: "text-green-700 border-green-200", bg: "bg-green-100 dark:bg-green-900/30" },
  on_hold:   { label: "On Hold",   color: "text-amber-700 border-amber-200", bg: "bg-amber-100 dark:bg-amber-900/30" },
  completed: { label: "Completed", color: "text-gray-700 border-gray-200",   bg: "bg-gray-100 dark:bg-gray-800"      },
};

const priorityConfig: Record<ProjectPriority, { label: string; color: string }> = {
  low:      { label: "Low",      color: "text-slate-600 bg-slate-100 border-slate-200"       },
  medium:   { label: "Medium",   color: "text-blue-700 bg-blue-50 border-blue-200"           },
  high:     { label: "High",     color: "text-orange-700 bg-orange-100 border-orange-200"    },
  critical: { label: "Critical", color: "text-red-700 bg-red-100 border-red-200"             },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function memberName(m: ProjectMemberItem) {
  if (!m.user) return "Unknown";
  return [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") || m.user.email;
}

function ProgressBar({ value }: { value: number }) {
  const color =
    value === 100 ? "bg-green-500" :
    value >= 70   ? "bg-blue-500"  :
    value >= 40   ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-semibold w-8 text-right">{value}%</span>
    </div>
  );
}

// ─── Map client_projects → Project shape ──────────────────────────────────────

function mapClientProject(cp: ClientProjectApi, currentUserId: string): Project {
  const today = new Date().toISOString().split("T")[0];
  const endDate: string | null = cp.endDate ?? null;
  const startDate: string | null = cp.startDate ?? null;
  const isOverdue = !!endDate && endDate < today && cp.status !== "INACTIVE";
  const daysRemaining = endDate
    ? Math.ceil((new Date(endDate).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const statusMap: Record<string, ProjectStatus> = {
    ACTIVE: "active", INACTIVE: "on_hold", COMPLETED: "completed",
  };
  const mgr = cp.manager ?? null;
  const managerUserId = mgr?.userId ?? mgr?.user?.id ?? "";
  return {
    id: cp.id,
    name: cp.projectName || cp.projectCode || "Untitled",
    description: cp.description || "",
    status: cp.status ? statusMap[cp.status] ?? "planning" : "planning",
    priority: "medium",
    completionPercent: cp.completionPercent ?? 0,
    estimatedEndDate: endDate,
    startDate,
    isOverdue,
    daysRemaining,
    memberCount: mgr ? 1 : 0,
    members: mgr
      ? [{
          userId: mgr.userId ?? "",
          role: "manager",
          user: {
            id: mgr.userId ?? "",
            email: mgr.user?.email ?? mgr.workEmail ?? "",
            firstName: mgr.firstName ?? "",
            lastName: mgr.lastName ?? "",
          },
        }]
      : [],
    createdBy: null,
    createdAt: cp.createdAt,
    _source: "client",
    _isManager: Boolean(currentUserId && managerUserId && currentUserId === managerUserId),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function UserProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  // Detail dialog
  const [selected, setSelected] = useState<Project | null>(null);
  const [detailTab, setDetailTab] = useState<"overview" | "team">("overview");

  // Team members in detail dialog
  const [projectEmployees, setProjectEmployees] = useState<ProjectEmployee[]>([]);
  const [allOrgEmployees, setAllOrgEmployees] = useState<TeamMember[]>([]);
  const [designationOptions, setDesignationOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [orgEmployeesLoading, setOrgEmployeesLoading] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);
  const [employeeSearchInput, setEmployeeSearchInput] = useState("");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [assigning, setAssigning] = useState(false);

  // Update progress dialog
  const [progressOpen, setProgressOpen] = useState(false);
  const [progressProject, setProgressProject] = useState<Project | null>(null);
  const [progressValue, setProgressValue] = useState(0);
  const [progressSaving, setProgressSaving] = useState(false);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      try {
        let currentUserId = "";
        if (typeof window !== "undefined") {
          try {
            const storedUser = localStorage.getItem("user");
            if (storedUser) {
              const parsed = JSON.parse(storedUser);
              currentUserId = parsed?.userId || parsed?.id || "";
            }
          } catch {
            // ignore malformed local storage
          }
        }

        // Load everything in parallel
        const [standaloneRes, clientRes, teamRes] = await Promise.allSettled([
          getMyProjects(),
          getMyClientProjects(),
          getMyTeamEmployees(),
        ]);

        // Team members determine manager status for standalone projects
        const teamMembersData =
          teamRes.status === "fulfilled" && Array.isArray(teamRes.value.data)
            ? teamRes.value.data
            : [];
        const hasTeam = teamMembersData.length > 0;

        const standaloneRows: StandaloneProjectApi[] =
          standaloneRes.status === "fulfilled" && Array.isArray(standaloneRes.value.data)
            ? (standaloneRes.value.data as StandaloneProjectApi[])
            : [];
        const standalone: Project[] =
          standaloneRows.map((p) => ({
                ...p,
                startDate: p.createdAt?.split("T")[0] ?? null,
                _source: "standalone" as const,
                _isManager: hasTeam, // can manage team if user has direct reports
              }));

        const clientRows: ClientProjectApi[] =
          clientRes.status === "fulfilled" && Array.isArray(clientRes.value.data)
            ? (clientRes.value.data as ClientProjectApi[])
            : [];
        const clientList: Project[] = clientRows.map((cp) =>
          mapClientProject(cp, currentUserId),
        );

        setProjects([...clientList, ...standalone]);
      } catch {
        toast.error("Failed to load your projects");
      } finally {
        setLoading(false);
      }
    };
    loadAll();
  }, []);

  // Load project employees when switching to team tab
  const loadProjectEmployees = useCallback(
    async (project: Project) => {
      if (!project._isManager) return;
      setEmployeesLoading(true);
      setProjectEmployees([]);
      try {
        const res = project._source === "client"
          ? await getClientProjectEmployees(project.id)
          : await getProjectEmployees(project.id);
        setProjectEmployees(Array.isArray(res.data) ? res.data : []);
      } catch {
        toast.error("Failed to load team members");
      } finally {
        setEmployeesLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setEmployeeSearch(employeeSearchInput.trim());
    }, 250);

    return () => window.clearTimeout(timer);
  }, [employeeSearchInput]);

  useEffect(() => {
    if (!assignDialogOpen) return;

    let active = true;

    const loadAssignableEmployees = async () => {
      setOrgEmployeesLoading(true);
      try {
        const res = await getAllOrgEmployees({
          search: employeeSearch || undefined,
          designationId:
            designationFilter !== "all" ? designationFilter : undefined,
          limit: 250,
        });
        if (!active) return;

        const rows = Array.isArray(res.data) ? (res.data as TeamMember[]) : [];
        setAllOrgEmployees(rows);

        if (!employeeSearch && designationFilter === "all") {
          const optionsMap = new Map<string, string>();
          rows.forEach((row) => {
            if (row.designationId && row.designation) {
              optionsMap.set(row.designationId, row.designation);
            }
          });
          setDesignationOptions(
            Array.from(optionsMap.entries())
              .map(([id, name]) => ({ id, name }))
              .sort((a, b) => a.name.localeCompare(b.name)),
          );
        }
      } catch {
        if (active) toast.error("Failed to load employees");
      } finally {
        if (active) setOrgEmployeesLoading(false);
      }
    };

    void loadAssignableEmployees();
    return () => {
      active = false;
    };
  }, [assignDialogOpen, employeeSearch, designationFilter]);

  const availableEmployees = useMemo(
    () =>
      allOrgEmployees.filter(
        (tm) => !projectEmployees.some((pe) => pe.userId === tm.userId),
      ),
    [allOrgEmployees, projectEmployees],
  );

  useEffect(() => {
    setSelectedEmployeeIds((ids) =>
      ids.filter((id) => availableEmployees.some((emp) => emp.userId === id)),
    );
  }, [availableEmployees]);

  const openDetail = (project: Project) => {
    if (project._source === "standalone") {
      router.push(`/user/projects/${project.id}`);
      return;
    }
    setSelected(project);
    setDetailTab("overview");
    setProjectEmployees([]);
  };

  const handleTabChange = (tab: "overview" | "team") => {
    setDetailTab(tab);
    if (tab === "team" && selected && projectEmployees.length === 0 && !employeesLoading) {
      loadProjectEmployees(selected);
    }
  };

  const openProgress = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setProgressProject(project);
    setProgressValue(project.completionPercent);
    setProgressOpen(true);
  };

  const saveProgress = async () => {
    if (!progressProject) return;
    setProgressSaving(true);
    try {
      if (progressProject._source === "client") {
        await updateClientProjectCompletion(progressProject.id, progressValue);
      } else {
        await updateProject(progressProject.id, { completionPercent: progressValue });
      }
      toast.success("Progress updated!");
      setProjects((prev) =>
        prev.map((p) =>
          p.id === progressProject.id ? { ...p, completionPercent: progressValue } : p,
        ),
      );
      if (selected?.id === progressProject.id) {
        setSelected((prev) => (prev ? { ...prev, completionPercent: progressValue } : null));
      }
      setProgressOpen(false);
    } catch {
      toast.error("Failed to update progress");
    } finally {
      setProgressSaving(false);
    }
  };

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-muted-foreground text-sm">
        Loading your projects...
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
          <FolderKanban className="w-8 h-8 text-muted-foreground opacity-40" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">No Projects Assigned</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            You have not been assigned to any projects yet. Your manager will add you when needed.
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <FolderKanban className="w-6 h-6" /> My Projects
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {projects.length} project{projects.length !== 1 ? "s" : ""} — including projects you manage and are assigned to.
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects.map((project) => {
          const sc = statusConfig[project.status];
          const pc = priorityConfig[project.priority];
          return (
            <div
              key={project.id}
              className="rounded-xl border border-border bg-card p-4 space-y-3 hover:shadow-sm transition-shadow cursor-pointer"
              onClick={() => openDetail(project)}
            >
              {/* Title row */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="font-semibold text-foreground truncate">{project.name}</p>
                    {project._source === "client" && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-purple-600 border-purple-200 bg-purple-50 flex-shrink-0">
                        <Building2 className="w-2.5 h-2.5 mr-0.5" />Client
                      </Badge>
                    )}
                    {project._isManager && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-indigo-600 border-indigo-200 bg-indigo-50 flex-shrink-0">
                        Manager
                      </Badge>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{project.description}</p>
                  )}
                </div>
                {project.isOverdue && (
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                )}
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${sc.color} ${sc.bg}`}>
                  {sc.label}
                </Badge>
                <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${pc.color}`}>
                  {pc.label}
                </Badge>
              </div>

              {/* Progress */}
              <ProgressBar value={project.completionPercent} />

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                <div className="flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {project.memberCount} member{project.memberCount !== 1 ? "s" : ""}
                </div>
                {project.estimatedEndDate && (
                  <div className={`flex items-center gap-1 ${project.isOverdue ? "text-red-500" : ""}`}>
                    <Calendar className="w-3.5 h-3.5" />
                    {project.estimatedEndDate}
                  </div>
                )}
              </div>

              {project.daysRemaining !== null && (
                <div className={`text-xs font-medium flex items-center gap-1 ${project.isOverdue ? "text-red-500" : "text-green-600"}`}>
                  {project.isOverdue
                    ? <><AlertTriangle className="w-3 h-3" />{Math.abs(project.daysRemaining)}d overdue</>
                    : <><Clock className="w-3 h-3" />{project.daysRemaining}d remaining</>}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                {project._isManager && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-7"
                    onClick={(e) => openProgress(project, e)}
                  >
                    <TrendingUp className="w-3 h-3 mr-1" />Update Progress
                  </Button>
                )}
                <Button size="sm" variant="outline" className="flex-1 text-xs h-7">
                  <ChevronRight className="w-3 h-3 mr-1" />View Details
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Detail Dialog ─────────────────────────────────────────────────── */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setProjectEmployees([]); } }}>
        <DialogContent className="max-w-4xl w-full max-h-[85vh] overflow-y-auto">
          {selected && (() => {
            const sc = statusConfig[selected.status];
            const pc = priorityConfig[selected.priority];
            return (
              <>
                <DialogHeader className="pb-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FolderKanban className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <DialogTitle className="text-lg leading-tight">{selected.name}</DialogTitle>
                        {selected._source === "client" && (
                          <Badge variant="outline" className="text-[10px] px-1.5 text-purple-600 border-purple-200 bg-purple-50">
                            Client Project
                          </Badge>
                        )}
                        {selected._isManager && (
                          <Badge variant="outline" className="text-[10px] px-1.5 text-indigo-600 border-indigo-200 bg-indigo-50">
                            Manager
                          </Badge>
                        )}
                      </div>
                      <DialogDescription className="text-sm mt-0.5">{selected.description || "No description provided."}</DialogDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap mt-2">
                    <Badge variant="outline" className={`${sc.color} ${sc.bg}`}>{sc.label}</Badge>
                    <Badge variant="outline" className={pc.color}>{pc.label}</Badge>
                    {selected.isOverdue && (
                      <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Overdue</Badge>
                    )}
                  </div>
                </DialogHeader>

                {/* Tabs */}
                <div className="flex gap-1 border-b border-border pt-3">
                  <button
                    onClick={() => handleTabChange("overview")}
                    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                      detailTab === "overview"
                        ? "bg-background border border-b-background border-border -mb-px text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Overview
                  </button>
                  {selected._isManager && (
                    <button
                      onClick={() => handleTabChange("team")}
                      className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                        detailTab === "team"
                          ? "bg-background border border-b-background border-border -mb-px text-foreground"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      Team Members
                    </button>
                  )}
                </div>

                {/* Overview Tab */}
                {detailTab === "overview" && (
                  <div className="pt-4 space-y-5">
                    {/* Progress */}
                    <div className="rounded-xl border border-border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Progress</h3>
                        {selected._isManager && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => { setProgressProject(selected); setProgressValue(selected.completionPercent); setProgressOpen(true); }}
                          >
                            <TrendingUp className="w-3 h-3 mr-1" />Update
                          </Button>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 flex-shrink-0">
                          <svg className="w-16 h-16 -rotate-90">
                            <circle cx="32" cy="32" r="26" fill="none" stroke="hsl(var(--muted))" strokeWidth="6" />
                            <circle
                              cx="32" cy="32" r="26" fill="none"
                              stroke={selected.completionPercent === 100 ? "#10b981" : selected.isOverdue ? "#ef4444" : "#6366f1"}
                              strokeWidth="6"
                              strokeDasharray={`${2 * Math.PI * 26}`}
                              strokeDashoffset={`${2 * Math.PI * 26 * (1 - selected.completionPercent / 100)}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">
                            {selected.completionPercent}%
                          </span>
                        </div>
                        <div className="flex-1 space-y-2">
                          <ProgressBar value={selected.completionPercent} />
                          {selected.completionPercent === 100
                            ? <p className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" />Completed!</p>
                            : <p className="text-xs text-muted-foreground">{100 - selected.completionPercent}% remaining to complete</p>}
                        </div>
                      </div>
                    </div>

                    {/* Timeline */}
                    <div className="rounded-xl border border-border p-4 space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</h3>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {selected.startDate && (
                          <div className="rounded-lg bg-muted/50 px-3 py-2">
                            <p className="text-[10px] text-muted-foreground">Start Date</p>
                            <p className="font-semibold">{selected.startDate}</p>
                          </div>
                        )}
                        <div className="rounded-lg bg-muted/50 px-3 py-2">
                          <p className="text-[10px] text-muted-foreground">Estimated End</p>
                          <p className="font-semibold">{selected.estimatedEndDate ?? "Not set"}</p>
                        </div>
                        {selected.daysRemaining !== null && (
                          <div className={`rounded-lg px-3 py-2 ${selected.isOverdue ? "bg-red-50 dark:bg-red-900/20" : "bg-green-50 dark:bg-green-900/20"}`}>
                            <p className="text-[10px] text-muted-foreground">Status</p>
                            <p className={`font-semibold text-sm ${selected.isOverdue ? "text-red-600" : "text-green-600"}`}>
                              {selected.isOverdue
                                ? `${Math.abs(selected.daysRemaining)}d overdue`
                                : `${selected.daysRemaining}d remaining`}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Members */}
                    <div className="rounded-xl border border-border p-4 space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Team ({selected.memberCount})
                      </h3>
                      {selected.members.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No members assigned.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {selected.members.map((m) => (
                            <div key={m.userId} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                {memberName(m).charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{memberName(m)}</p>
                                <p className="text-xs text-muted-foreground truncate">{m.user?.email}</p>
                              </div>
                              <Badge variant="outline" className="text-[10px] px-1.5 capitalize flex-shrink-0">{m.role}</Badge>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Team Members Tab */}
                {detailTab === "team" && (
                  <div className="pt-4 space-y-3">
                    {selected._isManager ? (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground">
                            Manage team members assigned to this project.
                          </p>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-7 text-xs"
                            onClick={() => {
                              setEmployeeSearchInput("");
                              setEmployeeSearch("");
                              setDesignationFilter("all");
                              setAssignDialogOpen(true);
                            }}
                          >
                            <UserPlus className="w-3 h-3 mr-1" />Add Members
                          </Button>
                        </div>

                        {employeesLoading ? (
                          <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                            Loading team members...
                          </div>
                        ) : projectEmployees.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-24 gap-2 text-center">
                            <Users className="w-8 h-8 text-muted-foreground opacity-40" />
                            <p className="text-sm text-muted-foreground">No team members assigned to this project.</p>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {projectEmployees.map((emp) => (
                              <div key={emp.userId} className="rounded-lg border border-border p-3 space-y-1.5">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                                      {emp.firstName?.charAt(0).toUpperCase()}{emp.lastName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <p className="text-sm font-medium">
                                        {emp.firstName} {emp.lastName}
                                      </p>
                                      <p className="text-xs text-muted-foreground">
                                        {emp.workEmail || emp.email}
                                      </p>
                                      <p className="text-[10px] text-muted-foreground">
                                        ID: {emp.employeeCode || emp.employeeId || "—"}
                                        {emp.designation ? ` • ${emp.designation}` : ""}
                                      </p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-[10px] px-1.5 capitalize">
                                      {emp.role}
                                    </Badge>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-red-500"
                                      onClick={async () => {
                                        try {
                                          if (selected._source === "client") {
                                            await removeClientProjectEmployee(selected.id, emp.userId);
                                          } else {
                                            await removeProjectEmployee(selected.id, emp.userId);
                                          }
                                          toast.success("Member removed");
                                          loadProjectEmployees(selected);
                                        } catch {
                                          toast.error("Failed to remove member");
                                        }
                                      }}
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                                {emp.managerName && (
                                  <p className="text-xs text-muted-foreground">
                                    Reports to: {emp.managerName}
                                  </p>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-24 gap-2 text-center">
                        <Users className="w-8 h-8 text-muted-foreground opacity-40" />
                        <p className="text-sm text-muted-foreground">
                          You don&apos;t have manager access to manage team members.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ─── Update Progress Dialog ───────────────────────────────────────── */}
      <Dialog open={progressOpen} onOpenChange={(o) => { if (!o) setProgressOpen(false); }}>
        <DialogContent className="max-w-sm w-full">
          <DialogHeader>
            <DialogTitle>Update Progress</DialogTitle>
            <DialogDescription>
              {progressProject?.name} — set completion percentage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 pt-2">
            {/* Circle indicator */}
            <div className="flex flex-col items-center gap-3">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 -rotate-90">
                  <circle cx="48" cy="48" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <circle
                    cx="48" cy="48" r="40" fill="none"
                    stroke={progressValue === 100 ? "#10b981" : "#6366f1"}
                    strokeWidth="8"
                    strokeDasharray={`${2 * Math.PI * 40}`}
                    strokeDashoffset={`${2 * Math.PI * 40 * (1 - progressValue / 100)}`}
                    strokeLinecap="round"
                    className="transition-all duration-150"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold">
                  {progressValue}%
                </span>
              </div>

              {/* Slider */}
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={progressValue}
                onChange={(e) => setProgressValue(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />

              {/* Quick buttons */}
              <div className="flex gap-2 flex-wrap justify-center">
                {[0, 25, 50, 75, 100].map((v) => (
                  <button
                    key={v}
                    onClick={() => setProgressValue(v)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      progressValue === v
                        ? "bg-indigo-600 text-white border-indigo-600"
                        : "border-border text-muted-foreground hover:border-indigo-300"
                    }`}
                  >
                    {v}%
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setProgressOpen(false)}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={saveProgress} disabled={progressSaving}>
                {progressSaving ? "Saving..." : "Save Progress"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ─── Assign Team Members Dialog ────────────────────────────────────── */}
      <Dialog
        open={assignDialogOpen}
        onOpenChange={(o) => {
          if (!o) {
            setAssignDialogOpen(false);
            setSelectedEmployeeIds([]);
            setEmployeeSearchInput("");
            setEmployeeSearch("");
            setDesignationFilter("all");
          }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Assign Team Members</DialogTitle>
            <DialogDescription>
              Select team members to add to &quot;{selected?.name}&quot;
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input
                value={employeeSearchInput}
                onChange={(e) => setEmployeeSearchInput(e.target.value)}
                placeholder="Search name, email, employee ID"
              />
              <select
                value={designationFilter}
                onChange={(e) => setDesignationFilter(e.target.value)}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="all">All Designations</option>
                {designationOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Available team members */}
            <div className="max-h-72 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
              {orgEmployeesLoading ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Loading employees...
                </p>
              ) : availableEmployees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  {employeeSearch || designationFilter !== "all"
                    ? "No employees match the current search/filter."
                    : "No employees found in your organization."}
                </p>
              ) : (
                availableEmployees.map((tm) => (
                  <label
                    key={tm.userId}
                    className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedEmployeeIds.includes(tm.userId)}
                      onChange={(e) =>
                        setSelectedEmployeeIds((ids) =>
                          e.target.checked
                            ? [...ids, tm.userId]
                            : ids.filter((id) => id !== tm.userId),
                        )
                      }
                      className="accent-primary"
                    />
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                      {tm.firstName?.charAt(0).toUpperCase()}
                      {tm.lastName?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {tm.firstName} {tm.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {tm.workEmail || tm.email}
                      </p>
                      <p className="text-[10px] text-muted-foreground truncate">
                        ID: {tm.employeeCode || tm.employeeId || "—"}
                        {tm.designation ? ` • ${tm.designation}` : ""}
                      </p>
                    </div>
                  </label>
                ))
              )}
            </div>
            {!orgEmployeesLoading &&
              allOrgEmployees.length > 0 &&
              availableEmployees.length === 0 &&
              !employeeSearch &&
              designationFilter === "all" && (
              <p className="text-sm text-muted-foreground text-center">
                All employees are already assigned to this project.
              </p>
              )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setAssignDialogOpen(false);
                  setSelectedEmployeeIds([]);
                  setEmployeeSearchInput("");
                  setEmployeeSearch("");
                  setDesignationFilter("all");
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!selected || selectedEmployeeIds.length === 0) return;
                  setAssigning(true);
                  try {
                    if (selected._source === "client") {
                      await assignClientProjectEmployees(selected.id, selectedEmployeeIds);
                    } else {
                      await assignProjectEmployees(selected.id, selectedEmployeeIds);
                    }
                    toast.success("Team members assigned");
                    setAssignDialogOpen(false);
                    setSelectedEmployeeIds([]);
                    setEmployeeSearchInput("");
                    setEmployeeSearch("");
                    setDesignationFilter("all");
                    loadProjectEmployees(selected);
                  } catch {
                    toast.error("Failed to assign team members");
                  } finally {
                    setAssigning(false);
                  }
                }}
                disabled={assigning || selectedEmployeeIds.length === 0}
              >
                {assigning ? "Assigning..." : `Assign ${selectedEmployeeIds.length > 0 ? `(${selectedEmployeeIds.length})` : ""}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
