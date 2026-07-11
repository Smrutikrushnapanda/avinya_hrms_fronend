"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarCheck, Plus } from "lucide-react";

import {
  createTimesheetBatch,
  getEmployeeByUserId,
  getMyClientProjects,
  getMyProjects,
  getProfile,
} from "@/app/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import TimesheetRowForm from "@/components/timesheet/TimesheetRowForm";
import { formatMinutes, newDraftRow, TimesheetProjectOption, TimesheetRowDraft } from "@/components/timesheet/types";

type StandaloneProjectApi = { id: string; name?: string; projectName?: string };
type ClientProjectApi = { id: string; projectName?: string; projectCode?: string; name?: string };

export default function AddTimesheetPage() {
  const router = useRouter();
  const today = new Date();
  const todayLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const todayIso = today.toISOString().split("T")[0];

  const [organizationId, setOrganizationId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState<TimesheetProjectOption[]>([]);
  const [rows, setRows] = useState<TimesheetRowDraft[]>([newDraftRow()]);

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
        date: todayIso,
        entries: rows.map((r) => ({
          startTime: new Date(`${todayIso}T${r.startTime}:00`).toISOString(),
          endTime: new Date(`${todayIso}T${r.endTime}:00`).toISOString(),
          projectName: r.projectName || undefined,
          moduleFeature: r.moduleFeature.trim() || undefined,
          pageScreen: r.pageScreen.trim() || undefined,
          workDescription: r.workDescription.trim(),
          workStatus: r.workStatus,
          workingMinutes: r.workingMinutes,
          employeeRemark: r.employeeRemark.trim() || undefined,
        })),
      });

      toast.success(`Saved ${rows.length} ${rows.length === 1 ? "entry" : "entries"} for today`);
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
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-semibold">Add Daily Work</h1>
          <p className="text-sm text-muted-foreground">Log every task you worked on today</p>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            {todayLabel}
          </CardTitle>
          <CardDescription>
            Add a row per task. You can only log and edit entries for today — once the day passes
            they become read-only.
          </CardDescription>
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

          <Button variant="outline" onClick={addRow} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Row
          </Button>

          <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">Total hours worked today</span>
            <span className="text-lg font-bold">{formatMinutes(totalMinutes)}</span>
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? "Saving..." : `Save ${rows.length > 1 ? `${rows.length} Entries` : "Entry"}`}
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
