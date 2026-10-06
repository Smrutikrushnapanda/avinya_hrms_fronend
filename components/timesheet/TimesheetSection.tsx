"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Lock,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useOrganizationTimezone } from "@/hooks/useOrganizationTimezone";
import { useWeeklyTimesheet } from "@/hooks/useWeeklyTimesheet";

import {
  approveTimesheetDay,
  createTimesheet,
  deleteTimesheetEntry,
  getManagerTimesheets,
  getMyClientProjects,
  getMyProjects,
  getTimesheets,
  updateTimesheetEntry,
} from "@/app/api/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import DateRangePicker from "./DateRangePicker";
import TimesheetRowForm from "./TimesheetRowForm";
import {
  formatMinutes,
  newDraftRow,
  TimesheetApprovalStatus,
  TimesheetProjectOption,
  TimesheetRowDraft,
} from "./types";

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type TimesheetSectionMode = "self" | "team" | "project" | "admin";

interface DirectReportOption {
  id: string;
  userId: string;
  name: string;
  employeeCode?: string;
}

interface TimesheetEntry {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  workingMinutes: number;
  projectName: string | null;
  clientName?: string | null;
  moduleFeature: string | null;
  pageScreen: string | null;
  workDescription: string;
  workStatus: "COMPLETED" | "IN_PROGRESS" | "BLOCKED";
  employeeRemark: string | null;
  approvalStatus: TimesheetApprovalStatus;
  managerRemark: string | null;
  employeeId: string;
  employee?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    employeeCode?: string;
  } | null;
}

interface TimesheetSectionProps {
  title: string;
  description?: string;
  organizationId: string;
  mode: TimesheetSectionMode;
  employeeId?: string;
  directReports?: DirectReportOption[];
  showEmployee?: boolean;
  allowApproval?: boolean;
  projectFilterEnabled?: boolean;
}

const WORK_STATUS_BADGE: Record<string, string> = {
  COMPLETED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  IN_PROGRESS: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300",
  BLOCKED: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300",
};

const APPROVAL_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
  APPROVED: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",
  REJECTED: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300",
};

function formatDisplayDate(dateStr: string): string {
  const date = new Date(`${dateStr}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function toTimeInput(isoStr: string): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function entryToDraft(entry: TimesheetEntry): TimesheetRowDraft {
  return {
    key: entry.id,
    id: entry.id,
    startTime: toTimeInput(entry.startTime),
    endTime: toTimeInput(entry.endTime),
    projectId: "",
    projectName: entry.projectName || "",
    moduleFeature: entry.moduleFeature || "",
    pageScreen: entry.pageScreen || "",
    workDescription: entry.workDescription,
    workingMinutes: entry.workingMinutes,
    minutesTouched: true,
    workStatus: entry.workStatus,
    employeeRemark: entry.employeeRemark || "",
  };
}

export default function TimesheetSection({
  title,
  description,
  organizationId,
  mode,
  employeeId,
  directReports = [],
  showEmployee = false,
  allowApproval = false,
  projectFilterEnabled = false,
}: TimesheetSectionProps) {
  const router = useRouter();
  const { today: getOrgToday, toUtcISO: orgToUtcISO, formatOrgTime } = useOrganizationTimezone();
  const week = useWeeklyTimesheet();

  const isSelf = mode === "self";
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedProjectName, setSelectedProjectName] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set([getOrgToday()]));

  const [projects, setProjects] = useState<TimesheetProjectOption[]>([]);
  const [editTarget, setEditTarget] = useState<TimesheetEntry | null>(null);
  const [viewTarget, setViewTarget] = useState<TimesheetEntry | null>(null);
  const [editDraft, setEditDraft] = useState<TimesheetRowDraft | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Quick add modal state for a specific date
  const [addDateTarget, setAddDateTarget] = useState<string | null>(null);
  const [addDraft, setAddDraft] = useState<TimesheetRowDraft | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  const [approveTarget, setApproveTarget] = useState<{ employeeId: string; date: string; employeeName: string } | null>(null);
  const [approveRemark, setApproveRemark] = useState("");
  const [approveSaving, setApproveSaving] = useState(false);

  const isTeam = mode === "team";
  const isNextDisabled = selectedMonth === currentDate.getMonth() && selectedYear === currentDate.getFullYear();

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else setSelectedMonth((m) => m - 1);
  };
  const handleNextMonth = () => {
    if (isNextDisabled) return;
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else setSelectedMonth((m) => m + 1);
  };

  useEffect(() => {
    if (mode !== "self") return;
    Promise.allSettled([getMyProjects(), getMyClientProjects()]).then(([standaloneRes, clientRes]) => {
      const standaloneRows = standaloneRes.status === "fulfilled" && Array.isArray(standaloneRes.value.data) ? standaloneRes.value.data : [];
      const clientRows = clientRes.status === "fulfilled" && Array.isArray(clientRes.value.data) ? clientRes.value.data : [];
      setProjects([
        ...standaloneRows.map((p: any) => ({ id: p.id, name: p.name || p.projectName || "Untitled", source: "standalone" as const })),
        ...clientRows.map((p: any) => ({ id: p.id, name: p.projectName || p.projectCode || p.name || "Untitled", source: "client" as const })),
      ]);
    });
  }, [mode]);

  const fetchEntries = useCallback(async () => {
    if (!organizationId) {
      setLoading(false);
      setEntries([]);
      return;
    }
    setLoading(true);
    try {
      let fromDate: string;
      let toDate: string;

      if (isSelf) {
        fromDate = week.mondayStr;
        toDate = week.saturdayStr;
      } else if (isTeam && dateRange?.from) {
        fromDate = dateRange.from.toISOString().split("T")[0];
        toDate = (dateRange.to || dateRange.from).toISOString().split("T")[0];
      } else {
        fromDate = new Date(selectedYear, selectedMonth, 1).toISOString().split("T")[0];
        toDate = new Date(selectedYear, selectedMonth + 1, 0).toISOString().split("T")[0];
      }

      const status = selectedStatus === "all" ? undefined : selectedStatus;
      const projectName = selectedProjectName === "all" ? undefined : selectedProjectName;

      if (isTeam) {
        const res = await getManagerTimesheets({
          employeeId: selectedEmployeeId || undefined,
          fromDate,
          toDate,
          status,
          projectName,
          page: 1,
          limit: 500,
        });
        setEntries(res.data?.results || []);
      } else {
        const res = await getTimesheets({
          organizationId,
          employeeId: mode === "self" || mode === "admin" ? employeeId : undefined,
          fromDate,
          toDate,
          status,
          projectName,
          page: 1,
          limit: 500,
        });
        setEntries(res.data?.results || []);
      }
    } catch (error) {
      console.error("Failed to load timesheets:", error);
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [
    organizationId,
    employeeId,
    mode,
    isSelf,
    isTeam,
    week.mondayStr,
    week.saturdayStr,
    dateRange,
    selectedMonth,
    selectedYear,
    selectedEmployeeId,
    selectedStatus,
    selectedProjectName,
  ]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // Expand all days by default in self mode
  useEffect(() => {
    if (isSelf) {
      setExpandedDates(new Set(week.days.map((d) => d.dateStr)));
    }
  }, [isSelf, week.days]);

  const groupedByDate = useMemo(() => {
    const map = new Map<string, TimesheetEntry[]>();
    for (const entry of entries) {
      const list = map.get(entry.date) || [];
      list.push(entry);
      map.set(entry.date, list);
    }
    for (const list of map.values()) {
      list.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [entries]);

  const nonSelfGroupedList = useMemo(() => {
    return Array.from(groupedByDate.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [groupedByDate]);

  const projectOptions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.projectName).filter(Boolean))) as string[],
    [entries],
  );

  const overallTotalMinutes = entries.reduce((sum, e) => sum + e.workingMinutes, 0);

  // Daily totals map for the weekly summary
  const dailyMinutesMap = useMemo(() => {
    const res: Record<string, number> = {};
    for (const d of week.days) {
      const dayEntries = groupedByDate.get(d.dateStr) || [];
      res[d.dateStr] = dayEntries.reduce((sum, e) => sum + e.workingMinutes, 0);
    }
    return res;
  }, [week.days, groupedByDate]);

  const toggleDate = (date: string) => {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
  };

  const employeeName = (entry: TimesheetEntry) =>
    [entry.employee?.firstName, entry.employee?.middleName, entry.employee?.lastName].filter(Boolean).join(" ") || "--";

  const openEdit = (entry: TimesheetEntry) => {
    setEditTarget(entry);
    setEditDraft(entryToDraft(entry));
  };

  const openAddForDate = (dateStr: string) => {
    setAddDateTarget(dateStr);
    setAddDraft(newDraftRow());
  };

  const saveAdd = async () => {
    if (!addDateTarget || !addDraft) return;
    if (!addDraft.startTime || !addDraft.endTime) {
      toast.error("Start and end time are required");
      return;
    }
    if (!addDraft.projectName.trim()) {
      toast.error("Please select a project");
      return;
    }
    if (!addDraft.workDescription.trim()) {
      toast.error("Task description is required");
      return;
    }
    if (addDraft.endTime <= addDraft.startTime) {
      toast.error("End time must be after start time");
      return;
    }
    setAddSaving(true);
    try {
      await createTimesheet({
        organizationId,
        employeeId,
        date: addDateTarget,
        startTime: orgToUtcISO(addDateTarget, addDraft.startTime),
        endTime: orgToUtcISO(addDateTarget, addDraft.endTime),
        projectName: addDraft.projectName || undefined,
        moduleFeature: addDraft.moduleFeature.trim() || undefined,
        pageScreen: addDraft.pageScreen.trim() || undefined,
        workDescription: addDraft.workDescription.trim(),
        workStatus: addDraft.workStatus,
        workingMinutes: addDraft.workingMinutes,
        employeeRemark: addDraft.employeeRemark.trim() || undefined,
      });
      toast.success("Entry added");
      setAddDateTarget(null);
      setAddDraft(null);
      fetchEntries();
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || "Failed to add entry");
    } finally {
      setAddSaving(false);
    }
  };

  const saveEdit = async () => {
    if (!editTarget || !editDraft) return;
    if (!editDraft.workDescription.trim()) {
      toast.error("Task description is required");
      return;
    }
    if (editDraft.endTime <= editDraft.startTime) {
      toast.error("End time must be after start time");
      return;
    }
    setEditSaving(true);
    try {
      await updateTimesheetEntry(editTarget.id, {
        startTime: orgToUtcISO(editTarget.date, editDraft.startTime),
        endTime: orgToUtcISO(editTarget.date, editDraft.endTime),
        projectName: editDraft.projectName || undefined,
        moduleFeature: editDraft.moduleFeature.trim() || undefined,
        pageScreen: editDraft.pageScreen.trim() || undefined,
        workDescription: editDraft.workDescription.trim(),
        workStatus: editDraft.workStatus,
        workingMinutes: editDraft.workingMinutes,
        employeeRemark: editDraft.employeeRemark.trim() || undefined,
      });
      toast.success("Entry updated");
      setEditTarget(null);
      setEditDraft(null);
      fetchEntries();
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || "Failed to update entry");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDelete = async (entry: TimesheetEntry) => {
    if (!window.confirm("Delete this timesheet entry?")) return;
    try {
      await deleteTimesheetEntry(entry.id);
      toast.success("Entry deleted");
      fetchEntries();
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || "Failed to delete entry");
    }
  };

  const openApprove = (date: string, dayEntries: TimesheetEntry[]) => {
    setApproveTarget({ employeeId: dayEntries[0].employeeId, date, employeeName: employeeName(dayEntries[0]) });
    setApproveRemark("");
  };

  const submitApproval = async (status: "APPROVED" | "REJECTED") => {
    if (!approveTarget) return;
    setApproveSaving(true);
    try {
      await approveTimesheetDay({
        employeeId: approveTarget.employeeId,
        date: approveTarget.date,
        approvalStatus: status,
        remark: approveRemark.trim() || undefined,
      });
      toast.success(status === "APPROVED" ? "Timesheet approved" : "Timesheet rejected");
      setApproveTarget(null);
      setApproveRemark("");
      fetchEntries();
    } catch (error: unknown) {
      const message =
        typeof error === "object" && error !== null && "response" in error
          ? (error as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      toast.error(message || "Failed to submit approval");
    } finally {
      setApproveSaving(false);
    }
  };

  if (loading && entries.length === 0) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading timesheets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            {isSelf ? `Timesheet — ${week.headerLabel}` : title}
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {isSelf
              ? "Monday through Saturday timesheet — editable during the active week before Saturday ends"
              : description}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {isSelf ? (
            /* Weekly Navigation */
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-lg border">
              <Button
                variant="ghost"
                size="sm"
                onClick={week.goToPreviousWeek}
                className="h-8 px-2.5 text-xs font-medium gap-1 hover:bg-background"
                title="View previous week"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous Week
              </Button>
              <Button
                variant={week.isCurrentWeek ? "default" : "outline"}
                size="sm"
                onClick={week.goToCurrentWeek}
                className="h-8 px-3 text-xs font-medium"
              >
                Current Week
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={week.goToNextWeek}
                className="h-8 px-2.5 text-xs font-medium gap-1 hover:bg-background"
                title="View next week"
              >
                Next Week
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              {isTeam && directReports.length > 0 && (
                <Select value={selectedEmployeeId || "all"} onValueChange={(v) => setSelectedEmployeeId(v === "all" ? "" : v)}>
                  <SelectTrigger className="w-[190px]">
                    <SelectValue placeholder="All employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All employees</SelectItem>
                    {directReports.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {(projectFilterEnabled || isTeam) && (
                <Select value={selectedProjectName} onValueChange={setSelectedProjectName}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projectOptions.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}

              {isTeam && (
                <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="APPROVED">Approved</SelectItem>
                    <SelectItem value="REJECTED">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              )}

              {isTeam ? (
                <DateRangePicker value={dateRange} onChange={setDateRange} />
              ) : (
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" onClick={handlePrevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-background text-sm font-semibold min-w-[160px] justify-center">
                    <CalendarDays className="w-4 h-4 text-muted-foreground" />
                    {monthNames[selectedMonth]} {selectedYear}
                  </div>
                  <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isNextDisabled}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Weekly Banners (Self Mode) */}
      {isSelf && (
        <>
          {/* Banner 1: Saturday Final Deadline Warning with Live Countdown */}
          {week.isSaturday && !week.isClosed && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/95 dark:border-amber-700/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in duration-200">
              <div className="flex items-start gap-3">
                <Clock className="h-6 w-6 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    ⏰ Timesheet deadline is today
                  </h3>
                  <p className="text-sm text-amber-800 dark:text-amber-300 mt-0.5">
                    Please complete and save your timesheet before Saturday ends ({week.timezone}).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/60 px-3.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 self-start md:self-auto font-mono text-sm font-bold">
                <span className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300 font-sans font-medium">
                  Time remaining:
                </span>
                <span>{week.countdownText}</span>
              </div>
            </div>
          )}

          {/* Banner 2: Monday-Friday Active Week Info */}
          {!week.isSaturday && week.isCurrentWeek && !week.isClosed && (
            <div className="rounded-xl border border-blue-200 bg-blue-50/75 dark:border-blue-900/40 dark:bg-blue-950/30 text-blue-900 dark:text-blue-200 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                <span>
                  <strong>⏰ Deadline:</strong> {week.deadlineDateFormatted} before midnight ({week.timezone}). Complete and save your timesheet before Saturday ends.
                </span>
              </div>
              <div className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/50 px-2.5 py-1 rounded border border-blue-200 dark:border-blue-800 self-start sm:self-auto">
                Time remaining: {week.countdownText}
              </div>
            </div>
          )}

          {/* Banner 3: Closed Week Banner */}
          {week.isClosed && (
            <div className="rounded-xl border border-red-200 bg-red-50/90 dark:border-red-900/40 dark:bg-red-950/40 text-red-900 dark:text-red-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Lock className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-bold text-sm">🔒 This timesheet is closed.</h3>
                  <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">
                    Timesheets for this week can no longer be edited because the Saturday deadline has passed.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={week.goToCurrentWeek}
                className="gap-1.5 shrink-0 bg-white dark:bg-zinc-900 font-medium"
              >
                View Current Week
              </Button>
            </div>
          )}

          {/* Banner 4: Future Week */}
          {week.isFutureWeek && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/90 dark:border-zinc-800 dark:bg-zinc-900/50 text-zinc-900 dark:text-zinc-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">Future timesheets are not available yet.</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    You can only view and log work for the active week or review historical timesheets.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={week.goToCurrentWeek} className="gap-1.5 shrink-0">
                Go to Current Week
              </Button>
            </div>
          )}
        </>
      )}

      {/* Weekly Summary Card (Self Mode) */}
      {isSelf && (
        <Card className="border">
          <CardHeader className="py-3 px-4 pb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-semibold tracking-wide uppercase text-muted-foreground">
                Weekly Summary ({week.headerLabel})
              </CardTitle>
              <div className="text-sm font-bold bg-primary/10 text-primary px-3 py-1 rounded-md">
                Total: {formatMinutes(overallTotalMinutes)}
              </div>
            </div>
          </CardHeader>
          <CardContent className="py-2 px-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
              {week.days.map((d) => {
                const dayMins = dailyMinutesMap[d.dateStr] || 0;
                return (
                  <div
                    key={d.dateStr}
                    className={`p-2.5 rounded-lg border text-center transition-colors ${
                      d.isToday
                        ? "bg-primary/5 border-primary/40 font-semibold"
                        : "bg-muted/30 border-muted"
                    }`}
                  >
                    <div className="text-xs font-medium text-muted-foreground">
                      {d.shortDayName}
                    </div>
                    <div className="text-[11px] text-muted-foreground/80 mb-1">{d.formattedDate}</div>
                    <div className="text-sm font-bold text-foreground">
                      {formatMinutes(dayMins)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Non-Self Mode Stats Bar */}
      {!isSelf && (
        <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
          <span className="text-sm font-medium text-muted-foreground">
            {entries.length} {entries.length === 1 ? "entry" : "entries"} across {nonSelfGroupedList.length} {nonSelfGroupedList.length === 1 ? "day" : "days"}
          </span>
          <span className="text-sm font-bold">Total: {formatMinutes(overallTotalMinutes)}</span>
        </div>
      )}

      {/* Main Days List: Self Mode shows all 6 days Monday through Saturday */}
      {isSelf ? (
        <div className="space-y-4">
          {week.days.map((day) => {
            const dayEntries = groupedByDate.get(day.dateStr) || [];
            const dayMinutes = dayEntries.reduce((sum, e) => sum + e.workingMinutes, 0);
            const isOpen = expandedDates.has(day.dateStr);
            const dayStatuses = new Set(dayEntries.map((e) => e.approvalStatus));
            const dayStatus = dayEntries.length === 0 ? "EMPTY" : dayStatuses.size === 1 ? [...dayStatuses][0] : "MIXED";

            return (
              <Card key={day.dateStr} className={`border ${day.isToday ? "border-primary/40 shadow-sm" : ""}`}>
                <Collapsible open={isOpen} onOpenChange={() => toggleDate(day.dateStr)}>
                  <CardHeader className="py-3 px-4 flex-row items-center justify-between space-y-0 select-none">
                    <CollapsibleTrigger asChild>
                      <div className="flex items-center gap-3 cursor-pointer flex-1">
                        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          {day.fullDateLabel}
                          {day.isToday && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0.5">
                              Today
                            </Badge>
                          )}
                        </CardTitle>
                      </div>
                    </CollapsibleTrigger>

                    <div className="flex items-center gap-3">
                      {dayEntries.length > 0 && dayStatus !== "EMPTY" && (
                        <Badge variant="outline" className={`text-[11px] ${APPROVAL_BADGE[dayStatus] || ""}`}>
                          {dayStatus}
                        </Badge>
                      )}
                      <span className="text-sm font-bold">{formatMinutes(dayMinutes)}</span>

                      {/* Add Entry Button if day is editable */}
                      {day.canEdit && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openAddForDate(day.dateStr)}
                          className="h-8 gap-1 text-xs"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Task
                        </Button>
                      )}
                    </div>
                  </CardHeader>

                  <CollapsibleContent>
                    <CardContent className="pt-0 px-4 pb-4">
                      {dayEntries.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground border rounded-lg bg-muted/20 flex flex-col items-center justify-center gap-2">
                          <p>No timesheet entries logged for this day.</p>
                          {day.canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openAddForDate(day.dateStr)}
                              className="h-8 gap-1 text-xs mt-1"
                            >
                              <Plus className="h-3.5 w-3.5" />
                              Log Work for {day.shortDayName}
                            </Button>
                          )}
                        </div>
                      ) : (
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {showEmployee && <TableHead>Employee</TableHead>}
                              <TableHead>Start</TableHead>
                              <TableHead>End</TableHead>
                              <TableHead>Project</TableHead>
                              <TableHead>Module</TableHead>
                              <TableHead>Page/Screen</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Remarks</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dayEntries.map((entry) => (
                              <TableRow key={entry.id}>
                                {showEmployee && (
                                  <TableCell className="text-sm font-medium">{employeeName(entry)}</TableCell>
                                )}
                                <TableCell className="text-sm">{formatOrgTime(entry.startTime)}</TableCell>
                                <TableCell className="text-sm">{formatOrgTime(entry.endTime)}</TableCell>
                                <TableCell className="text-sm font-medium">{entry.projectName || "--"}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{entry.moduleFeature || "--"}</TableCell>
                                <TableCell className="text-sm text-muted-foreground">{entry.pageScreen || "--"}</TableCell>
                                <TableCell
                                  className="text-sm text-muted-foreground max-w-[220px] truncate"
                                  title={entry.workDescription}
                                >
                                  {entry.workDescription && entry.workDescription.length > 100
                                    ? entry.workDescription.slice(0, 100) + "..."
                                    : entry.workDescription}
                                </TableCell>
                                <TableCell className="text-sm font-bold">{formatMinutes(entry.workingMinutes)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`text-[11px] ${WORK_STATUS_BADGE[entry.workStatus] || ""}`}>
                                    {entry.workStatus.replace("_", " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[180px]">
                                  {entry.employeeRemark || "--"}
                                  {entry.managerRemark && (
                                    <div className="text-xs mt-1 italic text-amber-600 dark:text-amber-400">
                                      Manager: {entry.managerRemark}
                                    </div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => setViewTarget(entry)}
                                    title="View details"
                                  >
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                  {day.canEdit && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7"
                                        onClick={() => openEdit(entry)}
                                        title="Edit entry"
                                      >
                                        <Pencil className="h-3.5 w-3.5" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(entry)}
                                        title="Delete entry"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </Button>
                                    </>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Team / Project / Admin mode list */
        nonSelfGroupedList.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              No timesheet entries found for this range.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {nonSelfGroupedList.map(([date, dayEntries]) => {
              const dayMinutes = dayEntries.reduce((sum, e) => sum + e.workingMinutes, 0);
              const isToday = date === getOrgToday();
              const dayStatuses = new Set(dayEntries.map((e) => e.approvalStatus));
              const dayStatus = dayStatuses.size === 1 ? [...dayStatuses][0] : "MIXED";
              const isOpen = expandedDates.has(date);

              return (
                <Card key={date}>
                  <Collapsible open={isOpen} onOpenChange={() => toggleDate(date)}>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer flex-row items-center justify-between space-y-0 py-4">
                        <div className="flex items-center gap-3">
                          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isOpen ? "" : "-rotate-90"}`} />
                          <CardTitle className="text-base font-semibold">
                            {formatDisplayDate(date)} {isToday && <Badge variant="outline" className="ml-2 text-[10px]">Today</Badge>}
                          </CardTitle>
                        </div>
                        <div className="flex items-center gap-3">
                          {allowApproval && (
                            <Badge variant="outline" className={`text-[11px] ${APPROVAL_BADGE[dayStatus] || ""}`}>
                              {dayStatus}
                            </Badge>
                          )}
                          <span className="text-sm font-semibold">{formatMinutes(dayMinutes)}</span>
                          {allowApproval && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                openApprove(date, dayEntries);
                              }}
                            >
                              Review
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {showEmployee && <TableHead>Employee</TableHead>}
                              <TableHead>Start</TableHead>
                              <TableHead>End</TableHead>
                              <TableHead>Project</TableHead>
                              <TableHead>Module</TableHead>
                              <TableHead>Page/Screen</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead>Time</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Remarks</TableHead>
                              <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {dayEntries.map((entry) => (
                              <TableRow key={entry.id}>
                                {showEmployee && (
                                  <TableCell className="text-sm font-medium">{employeeName(entry)}</TableCell>
                                )}
                                <TableCell className="text-sm">{formatOrgTime(entry.startTime)}</TableCell>
                                <TableCell className="text-sm">{formatOrgTime(entry.endTime)}</TableCell>
                                <TableCell className="text-sm">{entry.projectName || "--"}</TableCell>
                                <TableCell className="text-sm">{entry.moduleFeature || "--"}</TableCell>
                                <TableCell className="text-sm">{entry.pageScreen || "--"}</TableCell>
                                <TableCell
                                  className="text-sm text-muted-foreground max-w-[220px] truncate"
                                  title={entry.workDescription}
                                >
                                  {entry.workDescription && entry.workDescription.length > 100
                                    ? entry.workDescription.slice(0, 100) + "..."
                                    : entry.workDescription}
                                </TableCell>
                                <TableCell className="text-sm font-medium">{formatMinutes(entry.workingMinutes)}</TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={`text-[11px] ${WORK_STATUS_BADGE[entry.workStatus] || ""}`}>
                                    {entry.workStatus.replace("_", " ")}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground max-w-[180px]">
                                  {entry.employeeRemark || "--"}
                                  {entry.managerRemark && (
                                    <div className="text-xs mt-1 italic">Manager: {entry.managerRemark}</div>
                                  )}
                                </TableCell>
                                <TableCell className="text-right whitespace-nowrap">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewTarget(entry)}>
                                    <Eye className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              );
            })}
          </div>
        )
      )}

      {/* Quick Add Dialog (for adding task to a specific day) */}
      <Dialog
        open={!!addDateTarget}
        onOpenChange={(open) => {
          if (!open) {
            setAddDateTarget(null);
            setAddDraft(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Task — {addDateTarget && formatDisplayDate(addDateTarget)}</DialogTitle>
            <CardDescription>Log a work item for this day of the active week</CardDescription>
          </DialogHeader>
          {addDraft && (
            <TimesheetRowForm row={addDraft} onChange={setAddDraft} projects={projects} compact />
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAddDateTarget(null);
                setAddDraft(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={saveAdd} loading={addSaving}>
              Save Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View entry dialog (read-only detail view) */}
      <Dialog open={!!viewTarget} onOpenChange={(open) => { if (!open) setViewTarget(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Timesheet Entry Details</DialogTitle>
          </DialogHeader>
          {viewTarget && (
            <div className="space-y-4">
              {showEmployee && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Employee</span>
                  <p className="text-sm">{employeeName(viewTarget)}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Date</span>
                  <p className="text-sm font-semibold">{formatDisplayDate(viewTarget.date)}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Duration</span>
                  <p className="text-sm font-semibold">{formatMinutes(viewTarget.workingMinutes)}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Start Time</span>
                  <p className="text-sm">{formatOrgTime(viewTarget.startTime)}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">End Time</span>
                  <p className="text-sm">{formatOrgTime(viewTarget.endTime)}</p>
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Project</span>
                <p className="text-sm font-medium">{viewTarget.projectName || "--"}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Module / Feature</span>
                  <p className="text-sm">{viewTarget.moduleFeature || "--"}</p>
                </div>
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Page / Screen</span>
                  <p className="text-sm">{viewTarget.pageScreen || "--"}</p>
                </div>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Description</span>
                <p className="text-sm whitespace-pre-wrap">{viewTarget.workDescription || "--"}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Work Status</span>
                <p className="text-sm capitalize">{viewTarget.workStatus.replace("_", " ")}</p>
              </div>
              {viewTarget.employeeRemark && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Employee Remark</span>
                  <p className="text-sm">{viewTarget.employeeRemark}</p>
                </div>
              )}
              {viewTarget.managerRemark && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Manager Remark</span>
                  <p className="text-sm italic">{viewTarget.managerRemark}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewTarget(null)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit entry dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) { setEditTarget(null); setEditDraft(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Entry — {editTarget && formatDisplayDate(editTarget.date)}</DialogTitle>
          </DialogHeader>
          {editDraft && (
            <TimesheetRowForm row={editDraft} onChange={setEditDraft} projects={projects} compact />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditTarget(null); setEditDraft(null); }}>
              Cancel
            </Button>
            <Button onClick={saveEdit} loading={editSaving}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve/reject day dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => { if (!open) setApproveTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Timesheet — {approveTarget?.employeeName}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {approveTarget && formatDisplayDate(approveTarget.date)}
            </p>
            <Textarea
              rows={4}
              placeholder="Add an optional comment for this day's work"
              value={approveRemark}
              onChange={(e) => setApproveRemark(e.target.value)}
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={() => submitApproval("REJECTED")}
              loading={approveSaving}
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
            <Button className="gap-2" onClick={() => submitApproval("APPROVED")} loading={approveSaving}>
              <Check className="h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
