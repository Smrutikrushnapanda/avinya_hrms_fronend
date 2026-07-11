export type TimesheetWorkStatus = "COMPLETED" | "IN_PROGRESS" | "BLOCKED";
export type TimesheetApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface TimesheetProjectOption {
  id: string;
  name: string;
  source: "standalone" | "client";
}

export interface TimesheetRowDraft {
  /** stable client-side key for list rendering — not the backend id */
  key: string;
  /** present only when editing an existing saved entry */
  id?: string;
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  projectId: string;
  projectName: string;
  moduleFeature: string;
  pageScreen: string;
  workDescription: string;
  workingMinutes: number;
  /** true once the user manually edits Time Taken — stops auto-recompute from start/end */
  minutesTouched: boolean;
  workStatus: TimesheetWorkStatus;
  employeeRemark: string;
}

export const WORK_STATUS_OPTIONS: { value: TimesheetWorkStatus; label: string }[] = [
  { value: "COMPLETED", label: "Completed" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "BLOCKED", label: "Blocked" },
];

export function computeMinutes(startTime: string, endTime: string): number {
  if (!startTime || !endTime) return 0;
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  if ([sh, sm, eh, em].some((n) => Number.isNaN(n))) return 0;
  const diff = eh * 60 + em - (sh * 60 + sm);
  return Math.max(0, diff);
}

export function formatMinutes(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

export function newDraftRow(): TimesheetRowDraft {
  return {
    key: `row-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    startTime: "09:00",
    endTime: "10:00",
    projectId: "",
    projectName: "",
    moduleFeature: "",
    pageScreen: "",
    workDescription: "",
    workingMinutes: 60,
    minutesTouched: false,
    workStatus: "COMPLETED",
    employeeRemark: "",
  };
}
