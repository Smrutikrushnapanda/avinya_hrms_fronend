"use client";

import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  computeMinutes,
  formatMinutes,
  TimesheetProjectOption,
  TimesheetRowDraft,
  WORK_STATUS_OPTIONS,
} from "./types";

const OTHER_PROJECT_VALUE = "__other__";

interface TimesheetRowFormProps {
  row: TimesheetRowDraft;
  onChange: (next: TimesheetRowDraft) => void;
  projects: TimesheetProjectOption[];
  onRemove?: () => void;
  compact?: boolean;
}

export default function TimesheetRowForm({
  row,
  onChange,
  projects,
  onRemove,
  compact,
}: TimesheetRowFormProps) {
  const set = <K extends keyof TimesheetRowDraft>(key: K, value: TimesheetRowDraft[K]) => {
    const next = { ...row, [key]: value };
    if (key === "startTime" || key === "endTime") {
      if (!next.minutesTouched) {
        next.workingMinutes = computeMinutes(next.startTime, next.endTime);
      }
    }
    onChange(next);
  };

  // A saved entry may carry a project name that isn't in today's project list
  // (e.g. it was entered via "Other" originally, or the project since got
  // archived) — treat that as "Other" too, so the free-text name still shows.
  const matchedProject = projects.find((p) => p.name === row.projectName);
  const projectSelectValue =
    row.projectId === OTHER_PROJECT_VALUE
      ? OTHER_PROJECT_VALUE
      : matchedProject
        ? matchedProject.id
        : row.projectName
          ? OTHER_PROJECT_VALUE
          : "";

  return (
    <div className={compact ? "space-y-4" : "space-y-4 rounded-xl border border-border p-4"}>
      {!compact && onRemove && (
        <div className="flex justify-end">
          <Button variant="ghost" size="icon" onClick={onRemove} className="h-7 w-7 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Start Time</label>
          <Input type="time" value={row.startTime} onChange={(e) => set("startTime", e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">End Time</label>
          <Input type="time" value={row.endTime} onChange={(e) => set("endTime", e.target.value)} />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Time Taken (min)</label>
          <Input
            type="number"
            min={1}
            value={row.workingMinutes}
            onChange={(e) =>
              onChange({ ...row, workingMinutes: Math.max(1, Number(e.target.value) || 0), minutesTouched: true })
            }
          />
          <p className="text-[11px] text-muted-foreground">{formatMinutes(row.workingMinutes)}</p>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Status</label>
          <Select value={row.workStatus} onValueChange={(v) => set("workStatus", v as TimesheetRowDraft["workStatus"])}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WORK_STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Project</label>
          <Select
            value={projectSelectValue}
            onValueChange={(id) => {
              if (id === OTHER_PROJECT_VALUE) {
                onChange({ ...row, projectId: OTHER_PROJECT_VALUE, projectName: matchedProject ? "" : row.projectName });
                return;
              }
              const project = projects.find((p) => p.id === id);
              onChange({ ...row, projectId: id, projectName: project?.name || "" });
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>
                  {project.name}
                </SelectItem>
              ))}
              <SelectItem value={OTHER_PROJECT_VALUE}>Other</SelectItem>
            </SelectContent>
          </Select>
          {projectSelectValue === OTHER_PROJECT_VALUE && (
            <Input
              className="mt-1.5"
              placeholder="Type the project name"
              value={row.projectName}
              onChange={(e) => onChange({ ...row, projectId: OTHER_PROJECT_VALUE, projectName: e.target.value })}
            />
          )}
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Module / Feature</label>
          <Input
            placeholder="e.g. Authentication"
            value={row.moduleFeature}
            onChange={(e) => set("moduleFeature", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-muted-foreground">Page / Screen</label>
          <Input
            placeholder="e.g. Login Page"
            value={row.pageScreen}
            onChange={(e) => set("pageScreen", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Task / Work Description</label>
        <Textarea
          rows={2}
          placeholder="What did you work on?"
          value={row.workDescription}
          onChange={(e) => set("workDescription", e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Remarks (optional)</label>
        <Textarea
          rows={2}
          placeholder="Any note for your manager"
          value={row.employeeRemark}
          onChange={(e) => set("employeeRemark", e.target.value)}
        />
      </div>
    </div>
  );
}
