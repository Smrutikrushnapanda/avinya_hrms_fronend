"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
  X,
} from "lucide-react";

import {
  approveTimesheetDay,
  deleteTimesheetEntry,
  getManagerTimesheets,
  getMyClientProjects,
  getMyProjects,
  getTimesheets,
  updateTimesheetEntry,
} from "@/app/api/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

function formatTime(isoStr?: string): string {
  if (!isoStr) return "--";
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function toTimeInput(isoStr: string): string {
  const d = new Date(isoStr);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function todayIso(): string {
  return new Date().toISOString().split("T")[0];
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
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [selectedProjectName, setSelectedProjectName] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [entries, setEntries] = useState<TimesheetEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set([todayIso()]));

  const [projects, setProjects] = useState<TimesheetProjectOption[]>([]);
  const [editTarget, setEditTarget] = useState<TimesheetEntry | null>(null);
  const [editDraft, setEditDraft] = useState<TimesheetRowDraft | null>(null);
  const [editSaving, setEditSaving] = useState(false);

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
      if (isTeam && dateRange?.from) {
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
          employeeId: mode === "self" ? employeeId : undefined,
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
  }, [organizationId, employeeId, mode, isTeam, dateRange, selectedMonth, selectedYear, selectedEmployeeId, selectedStatus, selectedProjectName]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

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
    return Array.from(map.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  }, [entries]);

  const projectOptions = useMemo(
    () => Array.from(new Set(entries.map((e) => e.projectName).filter(Boolean))) as string[],
    [entries],
  );

  const overallTotalMinutes = entries.reduce((sum, e) => sum + e.workingMinutes, 0);

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
        startTime: new Date(`${editTarget.date}T${editDraft.startTime}:00`).toISOString(),
        endTime: new Date(`${editTarget.date}T${editDraft.endTime}:00`).toISOString(),
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

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading timesheets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          {description ? <p className="text-sm text-muted-foreground mt-0.5">{description}</p> : null}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
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
        </div>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
        <span className="text-sm font-medium text-muted-foreground">
          {entries.length} {entries.length === 1 ? "entry" : "entries"} across {groupedByDate.length} {groupedByDate.length === 1 ? "day" : "days"}
        </span>
        <span className="text-sm font-bold">Total: {formatMinutes(overallTotalMinutes)}</span>
      </div>

      {groupedByDate.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No timesheet entries found for this range.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {groupedByDate.map(([date, dayEntries]) => {
            const dayMinutes = dayEntries.reduce((sum, e) => sum + e.workingMinutes, 0);
            const isToday = date === todayIso();
            const canEditDay = mode === "self" && isToday;
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
                            {canEditDay && <TableHead className="text-right">Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dayEntries.map((entry) => (
                            <TableRow key={entry.id}>
                              {showEmployee && (
                                <TableCell className="text-sm font-medium">{employeeName(entry)}</TableCell>
                              )}
                              <TableCell className="text-sm">{formatTime(entry.startTime)}</TableCell>
                              <TableCell className="text-sm">{formatTime(entry.endTime)}</TableCell>
                              <TableCell className="text-sm">{entry.projectName || "--"}</TableCell>
                              <TableCell className="text-sm">{entry.moduleFeature || "--"}</TableCell>
                              <TableCell className="text-sm">{entry.pageScreen || "--"}</TableCell>
                              <TableCell className="text-sm text-muted-foreground max-w-[220px]">{entry.workDescription}</TableCell>
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
                              {canEditDay && (
                                <TableCell className="text-right whitespace-nowrap">
                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(entry)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive"
                                    onClick={() => handleDelete(entry)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </TableCell>
                              )}
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
      )}

      {/* Edit entry dialog (today's own entries only) */}
      <Dialog open={!!editTarget} onOpenChange={(open) => { if (!open) { setEditTarget(null); setEditDraft(null); } }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Entry</DialogTitle>
          </DialogHeader>
          {editDraft && (
            <TimesheetRowForm row={editDraft} onChange={setEditDraft} projects={projects} compact />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditTarget(null); setEditDraft(null); }}>
              Cancel
            </Button>
            <Button onClick={saveEdit} disabled={editSaving}>
              {editSaving ? "Saving..." : "Save Changes"}
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
              disabled={approveSaving}
            >
              <X className="h-4 w-4" />
              Reject
            </Button>
            <Button className="gap-2" onClick={() => submitApproval("APPROVED")} disabled={approveSaving}>
              <Check className="h-4 w-4" />
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
