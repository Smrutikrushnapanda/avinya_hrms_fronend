"use client";

import { useCallback, useEffect, useState } from "react";
import {
  getMyAssignments,
  getAssignmentsByMe,
  getAssignWorkOptions,
  updateAssignmentProgress,
  WorkAssignment,
  AssignWorkOptions,
} from "@/app/api/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
  DialogFooter,
} from "@/components/ui/dialog";
import { ListTodo, CheckCircle2, ClipboardList, RefreshCw } from "lucide-react";

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

type TabKey = "assigned-to-me" | "assigned-by-me";

export default function UserAssignWorkPage() {
  const [options, setOptions] = useState<AssignWorkOptions | null>(null);
  const [assignedToMe, setAssignedToMe] = useState<WorkAssignment[]>([]);
  const [assignedByMe, setAssignedByMe] = useState<WorkAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<TabKey>("assigned-to-me");

  const [editTarget, setEditTarget] = useState<WorkAssignment | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    status: "pending",
    progressPercent: 0,
    workReport: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [opts, mine, byMe] = await Promise.all([
        getAssignWorkOptions(),
        getMyAssignments(),
        getAssignmentsByMe(),
      ]);
      setOptions(opts.data);
      setAssignedToMe(mine.data || []);
      setAssignedByMe(byMe.data || []);
    } catch {
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const employeeName = (userId: string | null) => {
    if (!userId) return "—";
    const emp = options?.employees.find((e) => e.userId === userId);
    const name = emp ? `${emp.firstName} ${emp.lastName}`.trim() : "";
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
      void load();
    } catch {
      toast.error("Failed to update progress");
    } finally {
      setEditSaving(false);
    }
  };

  const items = tab === "assigned-to-me" ? assignedToMe : assignedByMe;
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
            Track work assigned to you and review work you assigned to others.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()}>
          <RefreshCw className="h-4 w-4 mr-1" />
          Refresh
        </Button>
      </div>

      <div className="flex items-center gap-1 rounded-lg border border-border p-1 bg-muted/30 w-fit">
        {(
          [
            { key: "assigned-to-me", label: "Assigned to Me" },
            { key: "assigned-by-me", label: "Assigned by Me" },
          ] as Array<{ key: TabKey; label: string }>
        ).map((t) => (
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
            {t.label} ({t.key === "assigned-to-me" ? assignedToMe.length : assignedByMe.length})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
          Loading assignments...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
          {tab === "assigned-to-me"
            ? "No work has been assigned to you yet."
            : "You haven't assigned any work yet."}
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((assignment) => {
            const st = statusMeta[assignment.status] || statusMeta.pending;
            const pr = priorityMeta[assignment.priority] || priorityMeta.medium;
            const isMine = tab === "assigned-to-me";
            return (
              <div
                key={`${assignment.type}-${assignment.id}`}
                className="rounded-xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
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
                      <p className="text-xs text-muted-foreground mt-1">
                        {assignment.description}
                      </p>
                    ) : null}
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

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {isMine ? (
                    <span>
                      Assigned by:{" "}
                      <span className="text-foreground font-medium">
                        {employeeName(assignment.assignedByUserId)}
                      </span>
                    </span>
                  ) : (
                    <span>
                      Assigned to:{" "}
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

      <Dialog open={Boolean(editTarget)} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Progress — {editTarget?.title}</DialogTitle>
            <DialogDescription>
              Update status, completion percentage and what you did.
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