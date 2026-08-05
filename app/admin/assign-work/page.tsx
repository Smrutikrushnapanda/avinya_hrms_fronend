"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getAssignWorkOptions,
  createAssignWork,
  getAllAssignments,
  getMyAssignments,
  getAssignmentsByMe,
  updateAssignmentProgress,
  deleteAssignment,
  uploadFile,
  WorkAssignment,
  AssignWorkOptions,
} from "@/app/api/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ListTodo,
  Plus,
  Upload,
  Image as ImageIcon,
  Search,
  Trash2,
  RefreshCw,
  ClipboardList,
  CheckCircle2,
} from "lucide-react";

type TabKey = "all" | "assigned-by-me" | "assigned-to-me";

const statusMeta: Record<string, { label: string; color: string; bg: string }> = {
  pending: { label: "Pending", color: "text-slate-600", bg: "bg-slate-100" },
  in_progress: { label: "Working", color: "text-blue-700", bg: "bg-blue-100" },
  issue: { label: "Issue", color: "text-amber-700", bg: "bg-amber-100" },
  completed: { label: "Completed", color: "text-green-700", bg: "bg-green-100" },
  cancelled: { label: "Cancelled", color: "text-red-700", bg: "bg-red-100" },
  resolved: { label: "Resolved", color: "text-green-700", bg: "bg-green-100" },
};

const priorityMeta: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: "Low", color: "text-slate-600", bg: "bg-slate-100" },
  medium: { label: "Medium", color: "text-blue-700", bg: "bg-blue-100" },
  high: { label: "High", color: "text-orange-700", bg: "bg-orange-100" },
  urgent: { label: "Urgent", color: "text-red-700", bg: "bg-red-100" },
};

const OTHER_PROJECT_VALUE = "__other__";

export default function AssignWorkPage() {
  const [options, setOptions] = useState<AssignWorkOptions | null>(null);
  const [all, setAll] = useState<WorkAssignment[]>([]);
  const [assignedToMe, setAssignedToMe] = useState<WorkAssignment[]>([]);
  const [assignedByMe, setAssignedByMe] = useState<WorkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerSaving, setComposerSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [form, setForm] = useState({
    projectValue: "",
    otherProjectName: "",
    assignedToUserIds: [] as string[],
    employeeSearch: "",
    title: "",
    description: "",
    dueDate: "",
    priority: "medium",
    imageUrl: "",
  });

  // Update dialog state
  const [editTarget, setEditTarget] = useState<WorkAssignment | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    status: "pending",
    progressPercent: 0,
    workReport: "",
  });

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [optionsRes, allRes, mineRes, byMeRes] = await Promise.all([
        getAssignWorkOptions(),
        getAllAssignments(),
        getMyAssignments(),
        getAssignmentsByMe(),
      ]);
      setOptions(optionsRes.data);
      setAll(allRes.data || []);
      setAssignedToMe(mineRes.data || []);
      setAssignedByMe(byMeRes.data || []);
    } catch {
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  const filtered = useMemo(() => {
    const base =
      activeTab === "all"
        ? all
        : activeTab === "assigned-by-me"
          ? assignedByMe
          : assignedToMe;
    const q = search.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (a) =>
        a.title.toLowerCase().includes(q) ||
        a.projectName.toLowerCase().includes(q) ||
        `${a.assignedToUser?.firstName || ""} ${a.assignedToUser?.lastName || ""}`
          .toLowerCase()
          .includes(q),
    );
  }, [activeTab, all, assignedByMe, assignedToMe, search]);

  const counts = useMemo(
    () => ({
      all: all.length,
      "assigned-by-me": assignedByMe.length,
      "assigned-to-me": assignedToMe.length,
    }),
    [all, assignedByMe, assignedToMe],
  );

  const filteredEmployees = useMemo(() => {
    const q = form.employeeSearch.trim().toLowerCase();
    const list = options?.employees || [];
    if (!q) return list;
    return list.filter(
      (e) =>
        `${e.firstName} ${e.lastName}`.toLowerCase().includes(q) ||
        e.firstName.toLowerCase().includes(q) ||
        (e.lastName || "").toLowerCase().includes(q),
    );
  }, [form.employeeSearch, options]);

  const employeeName = (userId: string | null) => {
    if (!userId) return "—";
    const emp = options?.employees.find((e) => e.userId === userId);
    return emp ? `${emp.firstName} ${emp.lastName}`.trim() : userId.slice(0, 8);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    const date = new Date(d);
    if (Number.isNaN(date.getTime())) return d;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const openComposer = () => {
    setForm({
      projectValue: "",
      otherProjectName: "",
      assignedToUserIds: [],
      employeeSearch: "",
      title: "",
      description: "",
      dueDate: "",
      priority: "medium",
      imageUrl: "",
    });
    setComposerOpen(true);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    try {
      setUploadingImage(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadFile(formData, { path: "assign-work", public: true });
      const url = res?.data?.url || res?.data?.secureUrl || "";
      if (!url) {
        toast.error("Image upload did not return a URL");
        return;
      }
      setForm((prev) => ({ ...prev, imageUrl: url }));
      toast.success("Image uploaded");
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };

  const toggleAssignee = (userId: string) =>
    setForm((prev) => ({
      ...prev,
      assignedToUserIds: prev.assignedToUserIds.includes(userId)
        ? prev.assignedToUserIds.filter((id) => id !== userId)
        : [...prev.assignedToUserIds, userId],
    }));

  const canSubmit = useMemo(() => {
    const projectOk =
      form.projectValue === OTHER_PROJECT_VALUE
        ? form.otherProjectName.trim().length > 0
        : true;
    return Boolean(
      form.title.trim() && form.assignedToUserIds.length > 0 && projectOk,
    );
  }, [form]);

  const handleCreate = async () => {
    if (!canSubmit) {
      toast.error("Work title, assignee and project/work name are required");
      return;
    }
    try {
      setComposerSaving(true);
      const isOther = form.projectValue === OTHER_PROJECT_VALUE;
      const project = options?.projects.find((p) => p.id === form.projectValue);
      await createAssignWork({
        projectId: isOther ? undefined : project?.id,
        source: isOther ? undefined : project?.source,
        otherProjectName: isOther ? form.otherProjectName.trim() : undefined,
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        assignedToUserIds: form.assignedToUserIds,
        dueDate: form.dueDate || undefined,
        priority: form.priority as "low" | "medium" | "high" | "urgent",
        imageUrl: form.imageUrl || undefined,
      });
      toast.success("Work assigned successfully");
      setComposerOpen(false);
      void loadAll();
    } catch {
      toast.error("Failed to assign work");
    } finally {
      setComposerSaving(false);
    }
  };

  const openEdit = (assignment: WorkAssignment) => {
    setEditTarget(assignment);
    setEditForm({
      status: assignment.status,
      progressPercent: assignment.progressPercent,
      workReport: assignment.workReport || "",
    });
  };

  const handleSaveProgress = async () => {
    if (!editTarget) return;
    try {
      setEditSaving(true);
      await updateAssignmentProgress(editTarget.id, {
        status: editForm.status,
        progressPercent: editForm.progressPercent,
        workReport: editForm.workReport,
        source: editTarget.type,
      });
      toast.success("Progress updated");
      setEditTarget(null);
      void loadAll();
    } catch {
      toast.error("Failed to update progress");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (assignment: WorkAssignment) => {
    if (!window.confirm(`Delete assignment "${assignment.title}"?`)) return;
    try {
      await deleteAssignment(assignment.id, assignment.type);
      toast.success("Assignment deleted");
      void loadAll();
    } catch {
      toast.error("Failed to delete assignment");
    }
  };

  const statusOptions =
    editTarget?.type === "internal"
      ? ["pending", "resolved"]
      : ["pending", "in_progress", "issue", "completed", "cancelled"];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Assign Work
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Assign work to employees, track progress and review what they completed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadAll()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={openComposer}>
            <Plus className="h-4 w-4 mr-1" />
            Assign New Work
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/30 w-fit">
          {(
            [
              { key: "all", label: "All" },
              { key: "assigned-by-me", label: "Assigned by Me" },
              { key: "assigned-to-me", label: "Assigned to Me" },
            ] as Array<{ key: TabKey; label: string }>
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label} ({counts[tab.key]})
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search title, project, assignee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
          Loading assignments...
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
          No work assignments found. Click <span className="font-medium text-foreground">Assign New Work</span> to create one.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40">
              <tr>
                <th className="text-left px-3 py-2 border-b border-border">Work</th>
                <th className="text-left px-3 py-2 border-b border-border">Project</th>
                <th className="text-left px-3 py-2 border-b border-border">Assigned To</th>
                <th className="text-left px-3 py-2 border-b border-border">Assigned By</th>
                <th className="text-left px-3 py-2 border-b border-border">Due Date</th>
                <th className="text-left px-3 py-2 border-b border-border">Priority</th>
                <th className="text-left px-3 py-2 border-b border-border">Status</th>
                <th className="text-left px-3 py-2 border-b border-border">Progress</th>
                <th className="text-left px-3 py-2 border-b border-border">Work Report</th>
                <th className="text-left px-3 py-2 border-b border-border">Image</th>
                <th className="text-right px-3 py-2 border-b border-border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((assignment) => {
                const st = statusMeta[assignment.status] || statusMeta.pending;
                const pr = priorityMeta[assignment.priority] || priorityMeta.medium;
                return (
                  <tr
                    key={`${assignment.type}-${assignment.id}`}
                    className="border-b border-border last:border-b-0 align-top hover:bg-muted/20"
                  >
                    <td className="px-3 py-2 min-w-[220px]">
                      <p className="font-medium">{assignment.title}</p>
                      {assignment.description ? (
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {assignment.description}
                        </p>
                      ) : null}
                      {assignment.type === "internal" ? (
                        <Badge variant="outline" className="mt-1 text-[10px]">
                          Internal
                        </Badge>
                      ) : null}
                    </td>
                    <td className="px-3 py-2">
                      {assignment.projectId ? (
                        <span className="text-sm">{assignment.projectName || "—"}</span>
                      ) : (
                        <Badge variant="secondary" className="text-[10px]">
                          Other{assignment.projectName ? `: ${assignment.projectName}` : ""}
                        </Badge>
                      )}
                    </td>
                    <td className="px-3 py-2">{employeeName(assignment.assignedToUserId)}</td>
                    <td className="px-3 py-2">{employeeName(assignment.assignedByUserId)}</td>
                    <td className="px-3 py-2 whitespace-nowrap">
                      {formatDate(assignment.dueDate)}
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={`${pr.color} ${pr.bg}`}>
                        {pr.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="outline" className={`${st.color} ${st.bg}`}>
                        {st.label}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 min-w-[110px]">
                      <div className="flex items-center gap-2">
                        <Progress value={assignment.progressPercent} className="w-16" />
                        <span className="text-xs font-medium whitespace-nowrap">
                          {assignment.progressPercent}%
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-2 max-w-[200px]">
                      {assignment.workReport ? (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {assignment.workReport}
                        </p>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {assignment.imageUrl ? (
                        <a href={assignment.imageUrl} target="_blank" rel="noreferrer">
                          <ImageIcon className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </a>
                      ) : (
                        <span className="text-xs text-muted-foreground/60">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEdit(assignment)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Update
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500"
                          onClick={() => void handleDelete(assignment)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign New Work dialog */}
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Assign New Work</DialogTitle>
            <DialogDescription>
              Choose a project (or select Other) and an employee to assign the work to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Project</Label>
                <Select
                  value={form.projectValue}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, projectValue: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a project" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>Client Projects</SelectLabel>
                      {(options?.projects || [])
                        .filter((p) => p.source === "client")
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Internal Projects</SelectLabel>
                      {(options?.projects || [])
                        .filter((p) => p.source === "internal")
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>Other</SelectLabel>
                      <SelectItem value={OTHER_PROJECT_VALUE}>Other (not listed)</SelectItem>
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              {form.projectValue === OTHER_PROJECT_VALUE ? (
                <div className="space-y-1.5">
                  <Label>Work Name</Label>
                  <Input
                    placeholder="e.g. Website banner design"
                    value={form.otherProjectName}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, otherProjectName: e.target.value }))
                    }
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, dueDate: e.target.value }))
                    }
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label>Assign To ({form.assignedToUserIds.length} selected)</Label>
                {form.assignedToUserIds.length > 0 && (
                  <button
                    type="button"
                    className="text-xs text-destructive hover:underline"
                    onClick={() =>
                      setForm((prev) => ({ ...prev, assignedToUserIds: [] }))
                    }
                  >
                    Clear selection
                  </button>
                )}
              </div>
              <Input
                placeholder="Search employee by name..."
                value={form.employeeSearch}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, employeeSearch: e.target.value }))
                }
              />
              <div className="max-h-40 overflow-y-auto rounded-md border border-border">
                {filteredEmployees.length === 0 ? (
                  <p className="p-3 text-xs text-muted-foreground">No employees found</p>
                ) : (
                  filteredEmployees.map((emp) => {
                    const checked = form.assignedToUserIds.includes(emp.userId);
                    return (
                      <button
                        key={emp.userId}
                        type="button"
                        onClick={() => toggleAssignee(emp.userId)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-muted/40 flex items-center gap-2 ${
                          checked ? "bg-muted/60 font-medium" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleAssignee(emp.userId)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 accent-foreground"
                        />
                        <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground" />
                        {emp.firstName} {emp.lastName}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Work Title *</Label>
              <Input
                placeholder="e.g. Build login page UI"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                placeholder="Details of the work (optional)"
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, priority: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Work Image (optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Image URL (or upload below)"
                    value={form.imageUrl}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, imageUrl: e.target.value }))
                    }
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void handleImageUpload(file);
                      e.currentTarget.value = "";
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    loading={uploadingImage}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    Upload
                  </Button>
                </div>
                {form.imageUrl ? (
                  <a
                    href={form.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600"
                  >
                    <ImageIcon className="h-3 w-3" />
                    View uploaded image
                  </a>
                ) : null}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setComposerOpen(false)}
              disabled={composerSaving}
            >
              Cancel
            </Button>
            <Button onClick={() => void handleCreate()} loading={composerSaving} disabled={!canSubmit}>
              <Plus className="w-4 h-4 mr-1" />
              Assign Work
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update progress dialog */}
      <Dialog open={Boolean(editTarget)} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Progress — {editTarget?.title}</DialogTitle>
            <DialogDescription>
              Update status, completion percentage and what was done.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm((prev) => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((s) => (
                    <SelectItem key={s} value={s}>
                      {(statusMeta[s] || { label: s }).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Completion Percentage: {editForm.progressPercent}%</Label>
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={editForm.progressPercent}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    progressPercent: Number(e.target.value),
                  }))
                }
                className="w-full"
              />
              <Progress value={editForm.progressPercent} />
            </div>
            <div className="space-y-1.5">
              <Label>What did you do?</Label>
              <Textarea
                placeholder="Describe the work completed so far..."
                value={editForm.workReport}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, workReport: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={editSaving}>
              Cancel
            </Button>
            <Button onClick={() => void handleSaveProgress()} loading={editSaving}>
              Save Progress
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
