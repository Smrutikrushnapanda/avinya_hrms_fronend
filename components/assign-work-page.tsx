"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getMyAssignments,
  getAssignmentsByMe,
  getAllAssignments,
  getAssignWorkOptions,
  createAssignWork,
  updateAssignmentProgress,
  uploadFile,
  WorkAssignment,
  AssignWorkOptions,
} from "@/app/api/api";
import {
  startOfMonth,
  subMonths,
  addMonths,
  isSameMonth,
  format,
} from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { getFullName } from "@/lib/utils";
import { extractWorkPoints, hasWorkDescription, workPointProgress, workPointStatus } from "@/lib/assign-work";
import { WorkDescriptionEditor } from "@/components/work-description-editor";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ListTodo, CheckCircle2, ClipboardList, RefreshCw, Plus, Upload, Image as ImageIcon } from "lucide-react";

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

type TabKey = "all" | "assigned-to-me" | "assigned-by-me";

const OTHER_PROJECT_VALUE = "__other__";

export default function AssignWorkPage({
  includeAllAssignments = false,
}: {
  includeAllAssignments?: boolean;
}) {
  const [options, setOptions] = useState<AssignWorkOptions | null>(null);
  const [allAssignments, setAllAssignments] = useState<WorkAssignment[]>([]);
  const [assignedToMe, setAssignedToMe] = useState<WorkAssignment[]>([]);
  const [assignedByMe, setAssignedByMe] = useState<WorkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>(includeAllAssignments ? "all" : "assigned-to-me");
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const [month, setMonth] = useState<number | null>(null);
  const [year, setYear] = useState<number | null>(null);

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerLoading, setComposerLoading] = useState(false);
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

  const [editTarget, setEditTarget] = useState<WorkAssignment | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    status: "pending",
    progressPercent: 0,
    workReport: "",
  });

  // Derive month/year from currentMonth for API filtering
  const derivedMonth = useMemo(() => currentMonth.getMonth() + 1, [currentMonth]);
  const derivedYear = useMemo(() => currentMonth.getFullYear(), [currentMonth]);

  // Update month/year state when currentMonth changes
  useEffect(() => {
    setMonth(derivedMonth);
    setYear(derivedYear);
  }, [derivedMonth, derivedYear]);

  // Points tracking for update progress
  const [points, setPoints] = useState<{ text: string; completed: boolean }[]>([]);
  const [pointsChanged, setPointsChanged] = useState(false);

  const hasLegacyPointProgress = points.length > 0 && !pointsChanged &&
    editTarget?.completedPointIndexes == null && editTarget?.progressPercent > 0 &&
    editTarget?.progressPercent < 100 && !["completed", "resolved"].includes(editTarget.status);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mine, byMe, all] = await Promise.all([
        getMyAssignments({
          month,
          year,
        }),
        getAssignmentsByMe({
          month,
          year,
        }),
        includeAllAssignments ? getAllAssignments({ month, year }) : Promise.resolve(null),
      ]);
      setAssignedToMe(mine.data || []);
      setAssignedByMe(byMe.data || []);
      setAllAssignments(all?.data || []);
      // When no month filter (initial load), set month/year state
      if (!month || !year) {
        setMonth(currentMonth.getMonth() + 1);
        setYear(currentMonth.getFullYear());
      }
    } catch {
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, [month, year, includeAllAssignments, currentMonth]);

  useEffect(() => {
    void load();
  }, [load, currentMonth]);

  const employeeName = (userId: string | null) => {
    if (!userId) return "—";
    const emp = options?.employees.find((e) => e.userId === userId);
    const name = emp ? getFullName(emp) : "";
    return name || userId.slice(0, 8);
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

  const openEdit = (assignment: WorkAssignment) => {
    setEditTarget(assignment);
    const extractedPoints = extractWorkPoints(assignment.description || "");
    const savedIndexes = assignment.completedPointIndexes;
    const wasCompleted = assignment.progressPercent === 100 || ["completed", "resolved"].includes(assignment.status);
    const nextPoints = extractedPoints.map((text, index) => ({
      text,
      completed: savedIndexes != null ? savedIndexes.includes(index) : wasCompleted,
    }));
    const preserveLegacyProgress = savedIndexes == null && !wasCompleted && assignment.progressPercent > 0;
    const progress = nextPoints.length > 0 && !preserveLegacyProgress
      ? workPointProgress(nextPoints)
      : assignment.progressPercent;
    setEditForm({
      status: nextPoints.length > 0 ? workPointStatus(assignment.type, assignment.status, progress) : assignment.status,
      progressPercent: progress,
      workReport: assignment.workReport || "",
    });
    setPoints(nextPoints);
    setPointsChanged(false);
  };

  const openComposer = async () => {
    if (!options) {
      setComposerLoading(true);
      try {
        const response = await getAssignWorkOptions();
        setOptions(response.data);
      } catch {
        toast.error("Failed to load projects and employees");
        return;
      } finally {
        setComposerLoading(false);
      }
    }
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
    setPoints([]);
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

  const filteredEmployees = useMemo(() => {
    const q = form.employeeSearch.trim().toLowerCase();
    const list = options?.employees || [];
    if (!q) return list;
    return list.filter(
      (e) =>
        getFullName(e).toLowerCase().includes(q) ||
        (e.firstName || "").toLowerCase().includes(q) ||
        (e.lastName || "").toLowerCase().includes(q),
    );
  }, [form.employeeSearch, options]);

  const canSubmit = useMemo(() => {
    const projectOk =
      form.projectValue === OTHER_PROJECT_VALUE
        ? form.otherProjectName.trim().length > 0
        : true;
    return Boolean(
      form.title.trim() && hasWorkDescription(form.description) && form.assignedToUserIds.length > 0 && projectOk,
    );
  }, [form]);

  const handleCreate = async () => {
    if (!canSubmit) {
      toast.error("Work title, description, assignee and project/work name are required");
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
        description: form.description.trim(),
        assignedToUserIds: form.assignedToUserIds,
        dueDate: form.dueDate || undefined,
        priority: form.priority as "low" | "medium" | "high" | "urgent",
        imageUrl: form.imageUrl || undefined,
      });
      toast.success("Work assigned successfully");
      setComposerOpen(false);
      void load();
    } catch {
      toast.error("Failed to assign work");
    } finally {
      setComposerSaving(false);
    }
  };

  const handleSaveProgress = async () => {
    if (!editTarget) return;
    try {
      setEditSaving(true);
      await updateAssignmentProgress(editTarget.id, {
        status: editForm.status,
        progressPercent: editForm.progressPercent,
        completedPointIndexes: points.length > 0 && !hasLegacyPointProgress
          ? points.flatMap((point, index) => point.completed ? [index] : [])
          : undefined,
        workReport: editForm.workReport,
        source: editTarget.type,
      });
      toast.success("Progress updated");
      setEditTarget(null);
      void load();
    } catch {
      toast.error("Failed to update progress");
    } finally {
      setEditSaving(false);
    }
  };

  const items =
    tab === "all"
      ? allAssignments.filter((a) => isSameMonth(new Date(a.assignedAt ?? a.createdAt), currentMonth))
      : tab === "assigned-to-me"
        ? assignedToMe.filter((a) => isSameMonth(new Date(a.assignedAt ?? a.createdAt), currentMonth))
        : assignedByMe.filter((a) => isSameMonth(new Date(a.assignedAt ?? a.createdAt), currentMonth));
  const statusOptions =
    editTarget?.type === "internal"
      ? ["pending", "resolved"]
      : points.length > 0 && editForm.progressPercent < 100
        ? [editForm.progressPercent > 0 ? "in_progress" : "pending", "issue", "cancelled"]
        : ["pending", "in_progress", "issue", "completed", "cancelled"];
  const tabs: Array<{ key: TabKey; label: string }> = includeAllAssignments
    ? [
        { key: "all", label: "All Assignments" },
        { key: "assigned-to-me", label: "Assigned to Me" },
        { key: "assigned-by-me", label: "Assigned by Me" },
      ]
    : [
        { key: "assigned-to-me", label: "Assigned to Me" },
        { key: "assigned-by-me", label: "Assigned by Me" },
      ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Assign Work
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {includeAllAssignments
              ? "Assign work to employees, track progress and review all assignments."
              : "Track work assigned to you and review work you assigned to others."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()} loading={loading}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={() => void openComposer()} loading={composerLoading}>
            <Plus className="h-4 w-4 mr-1" />
            Assign New Work
          </Button>
        </div>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
        >
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/30 w-fit">
        {tabs.map((t) => {
          const count = tab === "all"
            ? allAssignments.filter((a) => isSameMonth(new Date(a.assignedAt ?? a.createdAt), currentMonth)).length
            : tab === "assigned-to-me"
              ? assignedToMe.filter((a) => isSameMonth(new Date(a.assignedAt ?? a.createdAt), currentMonth)).length
              : assignedByMe.filter((a) => isSameMonth(new Date(a.assignedAt ?? a.createdAt), currentMonth)).length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                tab === t.key
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
          Loading assignments...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {tab === "all"
            ? "No assignments found."
            : tab === "assigned-to-me"
            ? "No work has been assigned to you yet."
            : "You haven't assigned any work yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((assignment, index) => {
            const st = statusMeta[assignment.status] || statusMeta.pending;
            const pr = priorityMeta[assignment.priority] || priorityMeta.medium;
            const isMine = tab === "assigned-to-me";
            const isAssignedByMe = tab === "assigned-by-me";
            return (
              <div
                key={`${assignment.type}-${assignment.id}`}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-muted-foreground">
                      {index + 1}.
                    </span>
                    <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-medium">{assignment.title}</h3>
                      <Badge variant="outline" className="text-[10px]">
                        {assignment.type === "internal" ? "Internal" : "Client"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {assignment.projectId
                        ? assignment.projectName
                        : assignment.projectName
                          ? `Other: ${assignment.projectName}`
                          : "Other / General"}
                    </p>
                    {assignment.description ? (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-3 break-words whitespace-pre-line">
                        {assignment.description}
                      </p>
                    ) : null}
                  </div>
                  </div>
                  <Badge variant="outline" className={`${st.color} ${st.bg}`}>
                    {st.label}
                  </Badge>
                </div>

                <div className="flex items-center gap-3">
                  <Progress value={assignment.progressPercent} className="flex-1" />
                  <span className="text-sm font-semibold whitespace-nowrap">
                    {assignment.progressPercent}%
                  </span>
                </div>

                <div className="text-sm font-semibold text-foreground">
                  Assigned on{" "}
                  {formatDate(assignment.assignedAt ?? assignment.createdAt ?? assignment.dueDate)}
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {isMine ? (
                    <span>
                      Assigned by:{" "}
                      <span className="text-foreground font-medium">
                        {employeeName(assignment.assignedByUserId)}
                      </span>
                    </span>
                  ) : isAssignedByMe ? (
                    <span>
                      Assigned to:{" "}
                      <span className="text-foreground font-medium">
                        {employeeName(assignment.assignedToUserId)}
                      </span>
                    </span>
                  ) : (
                    <span>
                      Assigned to: {" "}
                      <span className="text-foreground font-medium">
                        {employeeName(assignment.assignedToUserId)}
                      </span>
                    </span>
                  )}
                  <span>
                      Due: <span className="text-foreground font-medium">{formatDate(assignment.dueDate)}</span>
                    </span>

                    <Badge variant="outline" className={`${pr.color} ${pr.bg}`}>
                      {pr.label}
                    </Badge>
                </div>

                {assignment.workReport ? (
                  <div className="rounded-md bg-muted/40 p-2.5 text-xs">
                    <span className="font-medium text-foreground">What was done: </span>
                    <span className="text-muted-foreground">{assignment.workReport}</span>
                  </div>
                ) : null}

                <div className="flex items-center justify-end gap-2">
                  {assignment.imageUrl ? (
                    <a
                      href={assignment.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-blue-600"
                    >
                      View image
                    </a>
                  ) : null}
                  <Button size="sm" variant="outline" onClick={() => openEdit(assignment)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Update Progress
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Assign New Work dialog */}
      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4">
          <DialogHeader>
            <DialogTitle>Assign New Work</DialogTitle>
            <DialogDescription>
              Choose a project (or select Other) and an employee to assign the work to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 overflow-y-auto">
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
                        {getFullName(emp)}
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
              <Label htmlFor="work-description">Description *</Label>
              <WorkDescriptionEditor
                id="work-description"
                value={form.description}
                onChange={(description) => setForm((prev) => ({ ...prev, description }))}
                disabled={composerSaving}
                aria-describedby="work-description-help"
              />
              <p id="work-description-help" className="text-xs text-muted-foreground">
                Required. List items become progress checkboxes for the assignee.
              </p>
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

      <Dialog open={Boolean(editTarget)} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Update Progress — {editTarget?.title}</DialogTitle>
            <DialogDescription>
              {points.length > 0
                ? "Check completed points to calculate progress, then save your update."
                : "Update status, completion percentage and what you did."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(v) => setEditForm((prev) => ({ ...prev, status: v }))}
                disabled={editSaving || hasLegacyPointProgress || (points.length > 0 && (editTarget?.type === "internal" || editForm.progressPercent === 100))}
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
            {points.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  Points Completed ({points.filter((point) => point.completed).length}/{points.length})
                </p>
                {hasLegacyPointProgress && (
                  <p className="text-xs text-muted-foreground">
                    Saved progress is {editTarget.progressPercent}%. Check completed points to update it from this checklist.
                  </p>
                )}
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {points.map((point, idx) => (
                    <div
                      key={idx}
                      data-completed={point.completed}
                      className={`flex items-start gap-3 rounded-md border border-border p-3 ${point.completed ? "bg-muted/80" : "bg-muted/40"}`}
                    >
                      <Checkbox
                        id={`work-point-${idx}`}
                        className="mt-0.5"
                        checked={point.completed}
                        disabled={editSaving}
                        onCheckedChange={(checked) => {
                          if (!editTarget) return;
                          const nextPoints = points.map((point, index) =>
                            index === idx ? { ...point, completed: checked === true } : point,
                          );
                          const progress = workPointProgress(nextPoints);
                          setPoints(nextPoints);
                          setPointsChanged(true);
                          setEditForm((prev) => ({
                            ...prev,
                            progressPercent: progress,
                            status: workPointStatus(editTarget.type, prev.status, progress),
                          }));
                        }}
                      />
                      <Label
                        htmlFor={`work-point-${idx}`}
                        className={`flex-1 min-w-0 text-sm leading-relaxed break-words whitespace-pre-wrap ${point.completed ? "text-muted-foreground line-through decoration-red-500 decoration-2" : "text-foreground"}`}
                      >
                        {idx + 1}. {point.text}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">Progress is calculated from completed points.</p>
              </div>
            ) : editTarget?.description ? (
              <p className="rounded-md border border-border bg-muted/40 p-3 text-sm whitespace-pre-wrap break-words">
                {editTarget.description}
              </p>
            ) : null}
            <div className="space-y-1.5">
              <Label>Completion Percentage: {editForm.progressPercent}%</Label>
              {points.length === 0 && (
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={editForm.progressPercent}
                  disabled={editSaving}
                  onChange={(e) =>
                    setEditForm((prev) => ({
                      ...prev,
                      progressPercent: Number(e.target.value),
                    }))
                  }
                  className="w-full"
                />
              )}
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
