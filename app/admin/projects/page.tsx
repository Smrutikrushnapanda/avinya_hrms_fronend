"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  getProjects,
  getClientProjects,
  createProject,
  updateProject,
  deleteProject,
  assignProjectEmployees,
  removeProjectEmployee,
  getEmployees,
} from "@/app/api/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable } from "@/components/ui/data-table";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Pencil,
  Trash2,
  Eye,
  FolderKanban,
  Users,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar,
  TrendingUp,
  UserPlus,
  Building2,
  MoreHorizontal,
  X,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type ProjectStatus = "planning" | "active" | "on_hold" | "completed";
type ProjectPriority = "low" | "medium" | "high" | "critical";

interface ProjectMemberItem {
  userId: string;
  role: string;
  assignedAt: string;
  user: { id: string; email: string; firstName: string; lastName: string } | null;
}

interface Project {
  id: string;
  name: string;
  projectName?: string;
  description: string;
  status: ProjectStatus;
  priority: ProjectPriority;
  completionPercent: number;
  estimatedEndDate: string | null;
  isOverdue: boolean;
  daysRemaining: number | null;
  memberCount: number;
  members: ProjectMemberItem[];
  createdBy: { id: string; email: string; firstName: string; lastName: string } | null;
  createdAt: string;
  updatedAt: string;
  /** "client" = from client_projects table; "standalone" = from projects table */
  _source?: "client" | "standalone";
}

interface UserOption {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const statusConfig: Record<ProjectStatus, { label: string; color: string; bg: string; hex: string }> = {
  planning:  { label: "Planning",  color: "text-blue-700 border-blue-200",   bg: "bg-blue-100 dark:bg-blue-900/30",   hex: "#3b82f6" },
  active:    { label: "Active",    color: "text-green-700 border-green-200", bg: "bg-green-100 dark:bg-green-900/30", hex: "#10b981" },
  on_hold:   { label: "On Hold",   color: "text-amber-700 border-amber-200", bg: "bg-amber-100 dark:bg-amber-900/30", hex: "#f59e0b" },
  completed: { label: "Completed", color: "text-gray-700 border-gray-200",   bg: "bg-gray-100 dark:bg-gray-800",      hex: "#6b7280" },
};

const priorityConfig: Record<ProjectPriority, { label: string; color: string }> = {
  low:      { label: "Low",      color: "text-slate-600 bg-slate-100 border-slate-200" },
  medium:   { label: "Medium",   color: "text-blue-700 bg-blue-50 border-blue-200" },
  high:     { label: "High",     color: "text-orange-700 bg-orange-100 border-orange-200" },
  critical: { label: "Critical", color: "text-red-700 bg-red-100 border-red-200" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function memberName(m: ProjectMemberItem) {
  if (!m.user) return "Unknown";
  return [m.user.firstName, m.user.lastName].filter(Boolean).join(" ") || m.user.email;
}

function projectName(p: any) {
  return p?.name || p?.projectName || "Untitled Project";
}

function userName(u: UserOption) {
  return [u.firstName, u.lastName].filter(Boolean).join(" ") || u.email;
}

function ProgressBar({ value }: { value: number }) {
  const color = value === 100 ? "bg-green-500" : value >= 70 ? "bg-blue-500" : value >= 40 ? "bg-amber-500" : "bg-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value}%</span>
    </div>
  );
}

// ─── Map client_projects → Project shape ──────────────────────────────────────

function mapClientProject(cp: any): Project {
  const today = new Date().toISOString().split("T")[0];
  const endDate: string | null = cp.endDate ?? null;
  const isOverdue = !!endDate && endDate < today && cp.status !== "INACTIVE";
  const daysRemaining = endDate
    ? Math.ceil(
        (new Date(endDate).getTime() - new Date(today).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;
  const statusMap: Record<string, ProjectStatus> = {
    ACTIVE: "active",
    INACTIVE: "on_hold",
    COMPLETED: "completed",
  };
  const mgr = cp.manager ?? null;
  const managerUserId = mgr?.userId ?? mgr?.user?.id ?? "";
  const mergedMembersByUserId = new Map<string, ProjectMemberItem>();

  (cp.members ?? []).forEach((member: any) => {
    const memberUserId = member?.userId ?? member?.user?.id ?? "";
    if (!memberUserId) return;
    mergedMembersByUserId.set(memberUserId, {
      userId: memberUserId,
      role: member?.role || "member",
      assignedAt: member?.assignedAt ?? cp.createdAt,
      user: {
        id: member?.user?.id ?? memberUserId,
        email: member?.user?.email ?? "",
        firstName: member?.user?.firstName ?? "",
        lastName: member?.user?.lastName ?? "",
      },
    });
  });

  if (managerUserId) {
    const existing = mergedMembersByUserId.get(managerUserId);
    mergedMembersByUserId.set(managerUserId, {
      userId: managerUserId,
      role: "manager",
      assignedAt: cp.createdAt,
      user: {
        id: managerUserId,
        email: mgr?.user?.email ?? mgr?.workEmail ?? existing?.user?.email ?? "",
        firstName: mgr?.firstName ?? existing?.user?.firstName ?? "",
        lastName: mgr?.lastName ?? existing?.user?.lastName ?? "",
      },
    });
  }

  const mergedMembers = Array.from(mergedMembersByUserId.values());
  return {
    id: cp.id,
    name: cp.projectName || cp.projectCode || "Untitled",
    description: cp.description || "",
    status: statusMap[cp.status] ?? "planning",
    priority: "medium",
    completionPercent: cp.completionPercent ?? 0,
    estimatedEndDate: endDate,
    isOverdue,
    daysRemaining,
    memberCount: mergedMembers.length,
    members: mergedMembers,
    createdBy: null,
    createdAt: cp.createdAt,
    updatedAt: cp.updatedAt,
    _source: "client",
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | "all">("all");
  const [allUsers, setAllUsers] = useState<UserOption[]>([]);
  const [currentUserId, setCurrentUserId] = useState("");
  const [tableState, setTableState] = useState({
    page: 0,
    pageSize: 50,
    search: "",
    sorting: [] as any[],
  });

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const router = useRouter();

  // Form state
  const [form, setForm] = useState({
    name: "", description: "", status: "planning" as ProjectStatus,
    priority: "medium" as ProjectPriority, estimatedEndDate: "",
    memberUserIds: [] as string[],
  });
  const [editForm, setEditForm] = useState({
    name: "", description: "", status: "planning" as ProjectStatus,
    priority: "medium" as ProjectPriority, completionPercent: 0, estimatedEndDate: "",
  });
  const [saving, setSaving] = useState(false);
  const [assignUserIds, setAssignUserIds] = useState<string[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let orgId: string | undefined;
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("user");
          if (stored) {
            const parsed = JSON.parse(stored);
            orgId = parsed?.organizationId || parsed?.organization?.id;
            setCurrentUserId(parsed?.userId || parsed?.id || "");
          }
        } catch { /* ignore */ }
      }

      const [projectsRes, clientRes] = await Promise.allSettled([
        getProjects(),
        orgId
          ? getClientProjects({ organizationId: orgId })
          : Promise.resolve({ data: [] }),
      ]);

      const standalone =
        projectsRes.status === "fulfilled" && Array.isArray(projectsRes.value.data)
          ? projectsRes.value.data
          : [];
      const clientList =
        clientRes.status === "fulfilled" && Array.isArray(clientRes.value.data)
          ? clientRes.value.data
          : [];

      setProjects([...standalone, ...clientList.map(mapClientProject)]);
    } catch {
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Load employees who report to current user (if manager) or all employees
  useEffect(() => {
    const loadAssignableUsers = async () => {
      try {
        let organizationId: string | undefined;

        if (typeof window !== "undefined") {
          const storedUser = localStorage.getItem("user");
          if (storedUser) {
            const parsed = JSON.parse(storedUser);
            organizationId = parsed?.organizationId || parsed?.organization?.id;
          }
        }

        // Load only managers (employees who have direct reports) for project assignment
        if (organizationId) {
          const res = await getEmployees(organizationId);
          const employees = Array.isArray(res.data)
            ? res.data
            : res.data?.data ?? res.data?.employees ?? [];

          // Build set of employee record IDs that are managers (someone reports to them)
          const reportsSet = new Set<string>();
          employees.forEach((e: any) => {
            if (e.reportingTo) reportsSet.add(e.reportingTo);
          });

          // Show only managers (employees who have at least one direct report)
          const managersOnly = employees
            .filter((e: any) => reportsSet.has(e.id))
            .map((emp: any) => ({
              id: emp.userId ?? emp.user?.id,
              email: emp.user?.email ?? emp.workEmail ?? "",
              firstName: emp.firstName ?? emp.user?.firstName ?? "",
              lastName: emp.lastName ?? emp.user?.lastName ?? "",
            }))
            .filter((u: UserOption) => !!u.id);

          setAllUsers(managersOnly);
          return;
        }

        // Fallback: empty list
        setAllUsers([]);
      } catch (error) {
        console.error("Failed to load assignable users", error);
        setAllUsers([]);
      }
    };

    loadAssignableUsers();
  }, []);

  // ── Computed ──

  const filtered = projects.filter((p) => {
    const q = (tableState.search || "").toLowerCase();
    const name = (p?.name ?? p?.projectName ?? "").toLowerCase();
    const desc = (p?.description ?? "").toLowerCase();
    const status = p?.status ?? "";
    const matchSearch = name.includes(q) || desc.includes(q);
    const matchStatus = statusFilter === "all" || status === statusFilter;
    return matchSearch && matchStatus;
  });

  const summary = {
    total: projects.length,
    active: projects.filter((p) => p.status === "active").length,
    completed: projects.filter((p) => p.status === "completed").length,
    overdue: projects.filter((p) => p.isOverdue).length,
  };

  const pagedData = useMemo(() => {
    const start = tableState.page * tableState.pageSize;
    const end = start + tableState.pageSize;
    return filtered.slice(start, end);
  }, [filtered, tableState.page, tableState.pageSize]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / tableState.pageSize));

  const pieData = (["planning","active","on_hold","completed"] as ProjectStatus[])
    .map((s) => ({ name: statusConfig[s].label, value: projects.filter((p) => p.status === s).length, color: statusConfig[s].hex }))
    .filter((d) => d.value > 0);

  const barData = filtered.map((p) => {
    const name = p?.name ?? p?.projectName ?? "";
    return {
      name: name.length > 14 ? name.slice(0, 14) + "…" : name,
      Progress: p?.completionPercent ?? 0,
    };
  });

  // ── Handlers ──

  const handleCreate = async () => {
    if (!form.name.trim()) { toast.error("Project name is required"); return; }
    setSaving(true);
    try {
      await createProject({ ...form, estimatedEndDate: form.estimatedEndDate || undefined });
      toast.success("Project created");
      setCreateOpen(false);
      setForm({ name: "", description: "", status: "planning", priority: "medium", estimatedEndDate: "", memberUserIds: [] });
      load();
    } catch { toast.error("Failed to create project"); }
    finally { setSaving(false); }
  };

  const openEdit = (p: Project) => {
    setActiveProject(p);
    setEditForm({
      name: p.name, description: p.description ?? "",
      status: p.status, priority: p.priority,
      completionPercent: p.completionPercent,
      estimatedEndDate: p.estimatedEndDate ?? "",
    });
    setEditOpen(true);
  };

  const handleEdit = async () => {
    if (!activeProject) return;
    setSaving(true);
    try {
      await updateProject(activeProject.id, { ...editForm, estimatedEndDate: editForm.estimatedEndDate || undefined });
      toast.success("Project updated");
      setEditOpen(false);
      load();
    } catch { toast.error("Failed to update project"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteProject(id);
      toast.success("Project deleted");
      setDeleteConfirmId(null);
      load();
    } catch { toast.error("Failed to delete project"); }
  };

  const openAssign = (p: Project) => {
    setActiveProject(p);
    setAssignUserIds([]);
    setAssignOpen(true);
  };

  const handleAssign = async () => {
    if (!activeProject || assignUserIds.length === 0) return;
    setSaving(true);
    try {
      await assignProjectEmployees(activeProject.id, assignUserIds);
      toast.success("Members assigned");
      setAssignOpen(false);
      load();
    } catch { toast.error("Failed to assign members"); }
    finally { setSaving(false); }
  };

  const handleRemoveMember = async (projectId: string, userId: string) => {
    if (userId === currentUserId) {
      toast.error("You cannot remove yourself from this project");
      return;
    }
    try {
      await removeProjectEmployee(projectId, userId);
      toast.success("Member removed");
      // Refresh view dialog
      const res = await getProjects();
      const updated = (Array.isArray(res.data) ? res.data : []).find((p: Project) => p.id === projectId);
      if (updated) setActiveProject(updated);
      load();
    } catch { toast.error("Failed to remove member"); }
  };

  // Members not yet in project for assign dialog
  const availableUsers = allUsers.filter(
    (u) => !(activeProject?.members?.some((m) => m.userId === u.id))
  );

  const columns: ColumnDef<Project>[] = useMemo(
    () => [
      {
        accessorKey: "name",
        header: "Project",
        cell: ({ row }) => {
          const p = row.original;
          return (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">{projectName(p)}</span>
                {p._source === "client" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 text-purple-600 border-purple-200 bg-purple-50">
                    Client
                  </Badge>
                )}
                {p.isOverdue && (
                  <Badge variant="outline" className="text-[10px] px-1.5 text-red-600 border-red-200 bg-red-50">
                    Overdue
                  </Badge>
                )}
              </div>
              {p.description && (
                <p className="text-xs text-muted-foreground truncate max-w-xs">{p.description}</p>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const sc = statusConfig[row.original.status as ProjectStatus] ?? statusConfig.planning;
          return (
            <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${sc.color} ${sc.bg}`}>
              {sc.label}
            </Badge>
          );
        },
      },
      {
        accessorKey: "priority",
        header: "Priority",
        cell: ({ row }) => {
          const pc = priorityConfig[row.original.priority as ProjectPriority] ?? priorityConfig.medium;
          return (
            <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${pc.color}`}>
              {pc.label}
            </Badge>
          );
        },
      },
      {
        id: "progress",
        header: "Progress",
        cell: ({ row }) => <ProgressBar value={row.original.completionPercent} />,
      },
      {
        id: "endDate",
        header: "Est. End Date",
        cell: ({ row }) => {
          const p = row.original;
          return p.estimatedEndDate ? (
            <div className="flex items-center gap-1 text-xs">
              <Calendar className="w-3 h-3" />
              {p.estimatedEndDate}
              {p.daysRemaining !== null && (
                <span className={`ml-1 ${p.isOverdue ? "text-red-500" : "text-muted-foreground"}`}>
                  ({p.isOverdue ? `${Math.abs(p.daysRemaining)}d overdue` : `${p.daysRemaining}d left`})
                </span>
              )}
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Not set</span>
          );
        },
      },
      {
        id: "members",
        header: () => <div className="text-center">Members</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-center gap-1 text-sm">
            <Users className="w-3.5 h-3.5 text-muted-foreground" />
            {row.original.memberCount}
          </div>
        ),
      },
      {
        id: "actions",
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => {
          const project = row.original;
          const isClient = project._source === "client";
          return (
            <div className="flex justify-end">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {!isClient && (
                    <DropdownMenuItem onSelect={() => router.push(`/admin/projects/${project.id}`)}>
                      Open Workspace
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onSelect={() =>
                      isClient
                        ? router.push("/admin/clients-projects")
                        : router.push(`/admin/projects/${project.id}`)
                    }
                  >
                    View Page
                  </DropdownMenuItem>
                  {isClient ? (
                    <DropdownMenuItem onSelect={() => router.push("/admin/clients-projects")}>
                      Edit in Clients &amp; Projects
                    </DropdownMenuItem>
                  ) : (
                    <>
                      <DropdownMenuItem onSelect={() => openEdit(project)}>
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onSelect={() => openAssign(project)}>
                        Assign Members
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600"
                        onSelect={() => setDeleteConfirmId(project.id)}
                      >
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [openAssign, setDeleteConfirmId, openEdit, statusConfig, priorityConfig, router]
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FolderKanban className="w-6 h-6" />Project Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Create and track projects, assign team members, and monitor progress.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push("/admin/clients-projects")}
            className="gap-2"
          >
            <Building2 className="w-4 h-4" />
            Add Client/Project
          </Button>
        </div>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total", value: summary.total,     icon: <FolderKanban className="w-4 h-4" />, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20 border-blue-200" },
          { label: "Active", value: summary.active,    icon: <TrendingUp className="w-4 h-4" />,  color: "text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200" },
          { label: "Completed", value: summary.completed, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-gray-600 bg-gray-50 dark:bg-gray-800 border-gray-200" },
          { label: "Overdue", value: summary.overdue,   icon: <AlertTriangle className="w-4 h-4" />, color: "text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200" },
        ].map(({ label, value, icon, color }) => (
          <div key={label} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${color}`}>
            {icon}
            <div>
              <p className="text-xs font-medium">{label}</p>
              <p className="text-2xl font-bold">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      {projects.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Status pie chart */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Status Distribution</h2>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value">
                  {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Completion bar chart */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="text-sm font-semibold text-foreground mb-3">Project Completion (%)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={barData} margin={{ top: 0, right: 8, bottom: 0, left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                  formatter={(v) => [`${v}%`, "Completion"]}
                />
                <Bar dataKey="Progress" radius={[4, 4, 0, 0]}>
                  {filtered.map((p, i) => (
                    <Cell key={i} fill={p.completionPercent === 100 ? "#10b981" : p.isOverdue ? "#ef4444" : "#6366f1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Project List */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-border">
          <div>
            <h3 className="text-sm font-semibold">Project List</h3>
            <p className="text-xs text-muted-foreground">Manage all projects from one view.</p>
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <Input
              placeholder="Search projects..."
              value={tableState.search}
              onChange={(e) => setTableState((s) => ({ ...s, search: e.target.value, page: 0 }))}
              className="h-8 text-sm w-48"
            />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as ProjectStatus | "all")}>
              <SelectTrigger className="w-36 h-8 text-sm"><SelectValue placeholder="All statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="planning">Planning</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="on_hold">On Hold</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">
              {filtered.length} project{filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading projects...</div>
        ) : filtered.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <FolderKanban className="w-10 h-10 opacity-20" />
            <p className="text-sm">{projects.length === 0 ? "No projects yet. Create your first project." : "No projects match your filters."}</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={pagedData}
            pageCount={pageCount}
            state={tableState}
            setState={setTableState}
          />
        )}
      </div>

      {/* ── Create Dialog ── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>New Project</DialogTitle>
            <DialogDescription>Fill in the project details below.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Project name" /></div>
            <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description..." rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v as ProjectStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => setForm(f => ({ ...f, priority: v as ProjectPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div><Label>Estimated End Date</Label><Input type="date" value={form.estimatedEndDate} onChange={(e) => setForm(f => ({ ...f, estimatedEndDate: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreate} disabled={saving}>{saving ? "Creating..." : "Create Project"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ── */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update project details and progress.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div><Label>Name *</Label><Input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><Label>Description</Label><Textarea value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Status</Label>
                <Select value={editForm.status} onValueChange={(v) => setEditForm(f => ({ ...f, status: v as ProjectStatus }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planning">Planning</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select value={editForm.priority} onValueChange={(v) => setEditForm(f => ({ ...f, priority: v as ProjectPriority }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Completion: {editForm.completionPercent}%</Label>
              <input type="range" min={0} max={100} step={5}
                value={editForm.completionPercent}
                onChange={(e) => setEditForm(f => ({ ...f, completionPercent: Number(e.target.value) }))}
                className="w-full mt-1 accent-primary"
              />
              <div className="mt-1"><ProgressBar value={editForm.completionPercent} /></div>
            </div>
            <div><Label>Estimated End Date</Label><Input type="date" value={editForm.estimatedEndDate} onChange={(e) => setEditForm(f => ({ ...f, estimatedEndDate: e.target.value }))} /></div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button onClick={handleEdit} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── View Details Dialog (full-screen) ── */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {activeProject && (() => {
          const sc = statusConfig[activeProject.status as ProjectStatus] ?? statusConfig.planning;
          const pc = priorityConfig[activeProject.priority as ProjectPriority] ?? priorityConfig.medium;
          return (
            <>
              <DialogHeader className="pb-4 border-b border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <FolderKanban className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <DialogTitle className="text-xl">{projectName(activeProject)}</DialogTitle>
                    <DialogDescription className="text-sm mt-0.5">
                      {activeProject.description || "No description provided."}
                    </DialogDescription>
                  </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge variant="outline" className={`${sc.color} ${sc.bg}`}>{sc.label}</Badge>
                      <Badge variant="outline" className={pc.color}>{pc.label}</Badge>
                    </div>
                  </div>
                </DialogHeader>

                <div className="pt-4 space-y-5">
                  {/* Progress + Timeline */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="sm:col-span-2 rounded-xl border border-border p-4 space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overall Progress</h3>
                      <div className="flex items-center gap-4">
                        <div className="relative w-20 h-20 flex-shrink-0">
                          <svg className="w-20 h-20 -rotate-90">
                            <circle cx="40" cy="40" r="32" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                            <circle cx="40" cy="40" r="32" fill="none"
                              stroke={activeProject.completionPercent === 100 ? "#10b981" : activeProject.isOverdue ? "#ef4444" : "#6366f1"}
                              strokeWidth="8"
                              strokeDasharray={`${2 * Math.PI * 32}`}
                              strokeDashoffset={`${2 * Math.PI * 32 * (1 - activeProject.completionPercent / 100)}`}
                              strokeLinecap="round"
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
                            {activeProject.completionPercent}%
                          </span>
                        </div>
                        <div className="flex-1 space-y-2">
                          <ProgressBar value={activeProject.completionPercent} />
                          <p className="text-xs text-muted-foreground">
                            {activeProject.completionPercent === 100
                              ? "Project completed!"
                              : `${100 - activeProject.completionPercent}% remaining`}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border p-4 space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Timeline</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="w-3.5 h-3.5" />
                          <span className="text-xs">Est. End:</span>
                          <span className="font-medium text-foreground text-xs">{activeProject.estimatedEndDate ?? "Not set"}</span>
                        </div>
                        {activeProject.daysRemaining !== null && (
                          <div className={`flex items-center gap-2 text-xs font-medium ${activeProject.isOverdue ? "text-red-500" : "text-green-600"}`}>
                            {activeProject.isOverdue ? <AlertTriangle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                            {activeProject.isOverdue
                              ? `${Math.abs(activeProject.daysRemaining)} days overdue`
                              : `${activeProject.daysRemaining} days remaining`}
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-muted-foreground text-xs">
                          <Users className="w-3.5 h-3.5" />
                          {activeProject.memberCount} member{activeProject.memberCount !== 1 ? "s" : ""}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Members */}
                  <div className="rounded-xl border border-border p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team Members</h3>
                      <Button size="sm" variant="outline" className="gap-1 h-7 text-xs"
                        onClick={() => { setAssignOpen(true); setAssignUserIds([]); }}>
                        <UserPlus className="w-3 h-3" />Add
                      </Button>
                    </div>
                    {activeProject.members.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No members assigned yet.</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {activeProject.members.map((m) => (
                          <div key={m.userId} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                              {memberName(m).charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{memberName(m)}</p>
                              <p className="text-xs text-muted-foreground truncate">{m.user?.email}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] px-1.5 capitalize flex-shrink-0">{m.role}</Badge>
                            <button className="text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                              disabled={m.userId === currentUserId}
                              title={m.userId === currentUserId ? "You cannot remove yourself" : "Remove member"}
                              onClick={() => handleRemoveMember(activeProject.id, m.userId)}>
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Assign Members Dialog ── */}
      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Assign Members</DialogTitle>
            <DialogDescription>Select users to add to &quot;{activeProject?.name}&quot;</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div className="max-h-60 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
              {availableUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No managers available to assign. Ensure employees have reporting lines set up so managers can be identified.
                </p>
              ) : availableUsers.map((u) => (
                <label key={u.id} className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-accent cursor-pointer">
                  <input type="checkbox" checked={assignUserIds.includes(u.id)}
                    onChange={(e) => setAssignUserIds(ids => e.target.checked ? [...ids, u.id] : ids.filter(id => id !== u.id))}
                    className="accent-primary" />
                  <div>
                    <p className="text-sm font-medium">{userName(u)}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button onClick={handleAssign} disabled={saving || assignUserIds.length === 0}>
                {saving ? "Assigning..." : `Assign ${assignUserIds.length > 0 ? `(${assignUserIds.length})` : ""}`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <Dialog open={!!deleteConfirmId} onOpenChange={(o) => { if (!o) setDeleteConfirmId(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              This will permanently delete the project and all its data. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
