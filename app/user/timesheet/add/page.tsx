"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, CalendarCheck, Clock, Lock, Plus } from "lucide-react";

import {
  createTimesheetBatch,
  getEmployeeByUserId,
  getMyClientProjects,
  getMyProjects,
  getProfile,
} from "@/app/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import TimesheetRowForm from "@/components/timesheet/TimesheetRowForm";
import { formatMinutes, newDraftRow, TimesheetProjectOption, TimesheetRowDraft } from "@/components/timesheet/types";
import { useOrganizationTimezone } from "@/hooks/useOrganizationTimezone";
import { useWeeklyTimesheet } from "@/hooks/useWeeklyTimesheet";

type StandaloneProjectApi = { id: string; name?: string; projectName?: string };
type ClientProjectApi = { id: string; projectName?: string; projectCode?: string; name?: string };

function AddTimesheetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dateParam = searchParams.get("date");

  const { toUtcISO: orgToUtcISO, formatOrgDate } = useOrganizationTimezone();
  const week = useWeeklyTimesheet();

  const [organizationId, setOrganizationId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState<TimesheetProjectOption[]>([]);
  const [rows, setRows] = useState<TimesheetRowDraft[]>([newDraftRow()]);

  // Available valid dates in active week (Monday through today)
  const availableDates = useMemo(() => {
    return week.days.filter((d) => !d.isFuture);
  }, [week.days]);

  // Selected date defaults to URL param (if valid in active week) or today
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    if (dateParam && week.days.some((d) => d.dateStr === dateParam && !d.isFuture)) {
      return dateParam;
    }
    return week.todayStr;
  });

  useEffect(() => {
    if (dateParam && week.days.some((d) => d.dateStr === dateParam && !d.isFuture)) {
      setSelectedDate(dateParam);
    } else if (week.todayStr && !selectedDate) {
      setSelectedDate(week.todayStr);
    }
  }, [dateParam, week.days, week.todayStr, selectedDate]);

  const selectedDateObj = useMemo(() => {
    return week.days.find((d) => d.dateStr === selectedDate) || {
      dateStr: selectedDate,
      dayName: "Selected Day",
      fullDateLabel: formatOrgDate(new Date(`${selectedDate || week.todayStr}T12:00:00Z`), "EEEE, MMMM d, yyyy"),
      isToday: selectedDate === week.todayStr,
      canEdit: week.isEditable,
    };
  }, [week.days, selectedDate, week.todayStr, week.isEditable, formatOrgDate]);

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await getProfile();
        const profile = profileRes.data || {};
        setOrganizationId(profile.organizationId ?? "");

        const uid = profile.id ?? profile.userId ?? "";
        if (uid) {
          const employeeRes = await getEmployeeByUserId(uid);
          setEmployeeId(employeeRes.data?.id ?? "");
        }

        const [standaloneRes, clientRes] = await Promise.allSettled([
          getMyProjects(),
          getMyClientProjects(),
        ]);
        const standaloneRows =
          standaloneRes.status === "fulfilled" && Array.isArray(standaloneRes.value.data)
            ? standaloneRes.value.data
            : [];
        const clientRows =
          clientRes.status === "fulfilled" && Array.isArray(clientRes.value.data)
            ? clientRes.value.data
            : [];

        const standaloneProjects: TimesheetProjectOption[] = (standaloneRows as StandaloneProjectApi[]).map(
          (p) => ({ id: p.id, name: p.name || p.projectName || "Untitled", source: "standalone" }),
        );
        const clientProjects: TimesheetProjectOption[] = (clientRows as ClientProjectApi[]).map((p) => ({
          id: p.id,
          name: p.projectName || p.projectCode || p.name || "Untitled",
          source: "client",
        }));

        setProjects([...standaloneProjects, ...clientProjects]);
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const updateRow = (key: string, next: TimesheetRowDraft) => {
    setRows((prev) => prev.map((r) => (r.key === key ? next : r)));
  };

  const removeRow = (key: string) => {
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.key !== key) : prev));
  };

  const addRow = () => setRows((prev) => [...prev, newDraftRow()]);

  const totalMinutes = rows.reduce((sum, r) => sum + r.workingMinutes, 0);

  const validate = (): string => {
    if (!selectedDate) return "Please select a date for your timesheet";
    if (week.isClosed) return "Timesheet editing is closed for this week. The deadline was Saturday.";
    if (selectedDate > week.todayStr) return "Timesheet date cannot be in the future";
    if (selectedDate < week.mondayStr) return "Timesheet editing is closed for this week.";

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const label = `Row ${i + 1}`;
      if (!r.startTime || !r.endTime) return `${label}: start and end time are required`;
      if (!r.projectName.trim()) return `${label}: please select a project`;
      if (!r.workDescription.trim()) return `${label}: please add a task description`;
      if (r.endTime <= r.startTime) return `${label}: end time must be after start time`;
    }
    for (let i = 0; i < rows.length; i++) {
      for (let j = i + 1; j < rows.length; j++) {
        const a = rows[i];
        const b = rows[j];
        if (a.startTime < b.endTime && a.endTime > b.startTime) {
          return `Row ${i + 1} and row ${j + 1} have overlapping time ranges`;
        }
      }
    }
    return "";
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }

    setSubmitting(true);
    try {
      await createTimesheetBatch({
        organizationId,
        employeeId,
        date: selectedDate,
        entries: rows.map((r) => ({
          startTime: orgToUtcISO(selectedDate, r.startTime),
          endTime: orgToUtcISO(selectedDate, r.endTime),
          projectName: r.projectName || undefined,
          moduleFeature: r.moduleFeature.trim() || undefined,
          pageScreen: r.pageScreen.trim() || undefined,
          workDescription: r.workDescription.trim(),
          workStatus: r.workStatus,
          workingMinutes: r.workingMinutes,
          employeeRemark: r.employeeRemark.trim() || undefined,
        })),
      });

      toast.success(`Saved ${rows.length} ${rows.length === 1 ? "entry" : "entries"} for ${selectedDateObj.dayName}`);
      router.push("/user/timesheet");
    } catch (err: unknown) {
      const message =
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { message?: string } } }).response?.data?.message === "string"
          ? (err as { response?: { data?: { message?: string } } }).response?.data?.message
          : "Failed to save timesheet";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.push("/user/timesheet")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Add Daily Work</h1>
          <p className="text-sm text-muted-foreground">
            Log tasks worked during the active week ({week.headerLabel})
          </p>
        </div>
      </div>

      {/* Saturday Deadline Warning Banner */}
      {week.isSaturday && !week.isClosed && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/95 dark:border-amber-700/60 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
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
          <div className="flex items-center gap-2 bg-amber-100 dark:bg-amber-900/60 px-3.5 py-1.5 rounded-lg border border-amber-300 dark:border-amber-700 font-mono text-sm font-bold self-start md:self-auto">
            <span className="text-xs uppercase tracking-wider text-amber-700 dark:text-amber-300 font-sans font-medium">
              Time remaining:
            </span>
            <span>{week.countdownText}</span>
          </div>
        </div>
      )}

      {/* Closed Week Banner */}
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
            onClick={() => router.push("/user/timesheet")}
            className="gap-1.5 shrink-0 bg-white dark:bg-zinc-900"
          >
            View Timesheet
          </Button>
        </div>
      )}

      <Card className="w-full">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-primary" />
                {selectedDateObj.fullDateLabel}
              </CardTitle>
              <CardDescription className="mt-1">
                Log every task you worked on for this day during the active week.
              </CardDescription>
            </div>

            {/* Date Picker Selector for active week days */}
            {availableDates.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground font-medium">Timesheet Day:</span>
                <Select value={selectedDate} onValueChange={setSelectedDate} disabled={week.isClosed}>
                  <SelectTrigger className="w-[180px] bg-background">
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableDates.map((d) => (
                      <SelectItem key={d.dateStr} value={d.dateStr}>
                        {d.dayName} ({d.formattedDate}) {d.isToday ? "• Today" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {rows.map((row) => (
            <TimesheetRowForm
              key={row.key}
              row={row}
              onChange={(next) => updateRow(row.key, next)}
              projects={projects}
              onRemove={() => removeRow(row.key)}
            />
          ))}

          <Button variant="outline" onClick={addRow} className="gap-2" disabled={week.isClosed}>
            <Plus className="h-4 w-4" />
            Add Row
          </Button>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">Total hours for this day</span>
            <span className="text-lg font-bold">{formatMinutes(totalMinutes)}</span>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSubmit} loading={submitting} disabled={week.isClosed} className="gap-2">
              Save {rows.length > 1 ? `${rows.length} Entries` : "Entry"}
            </Button>
            <Button variant="outline" onClick={() => router.push("/user/timesheet")} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AddTimesheetPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <AddTimesheetForm />
    </Suspense>
  );
}
