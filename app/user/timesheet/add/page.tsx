"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarCheck } from "lucide-react";

import {
  createTimesheet,
  getEmployeeByUserId,
  getMyClientProjects,
  getMyProjects,
  getProfile,
} from "@/app/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

export default function AddTimesheetPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Loading...</div>}>
      <AddTimesheetContent />
    </Suspense>
  );
}

type TimesheetProjectOption = {
  id: string;
  name: string;
  source: "standalone" | "client";
};

type StandaloneProjectApi = {
  id: string;
  name?: string;
  projectName?: string;
};

type ClientProjectApi = {
  id: string;
  projectName?: string;
  projectCode?: string;
  name?: string;
};

function AddTimesheetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = useMemo(() => new Date(), []);
  const [organizationId, setOrganizationId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [projects, setProjects] = useState<TimesheetProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [form, setForm] = useState({
    date: today.toISOString().split("T")[0],
    startTime: "09:30",
    endTime: "18:30",
    projectName: "",
    workDescription: "",
    employeeRemark: "",
  });

  const formatDateOnly = (date: Date) => date.toISOString().split("T")[0];
  const todayStr = formatDateOnly(today);
  const yesterday = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
  }, []);
  const yesterdayStr = formatDateOnly(yesterday);

  const toTimeValue = (iso?: string | null) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toISOString().substring(11, 16);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await getProfile();
        const profile = profileRes.data || {};
        const orgId = profile.organizationId ?? "";
        const uid = profile.id ?? profile.userId ?? "";
        setOrganizationId(orgId);

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

        const standaloneProjects: TimesheetProjectOption[] = (
          standaloneRows as StandaloneProjectApi[]
        ).map((p) => ({
          id: p.id,
          name: p.name || p.projectName || "Untitled",
          source: "standalone",
        }));
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

  useEffect(() => {
    const date = searchParams.get("date");
    const startTime = searchParams.get("startTime");
    const endTime = searchParams.get("endTime");
    const projectName = searchParams.get("projectName");
    const workDescription = searchParams.get("workDescription");
    const employeeRemark = searchParams.get("employeeRemark");

    if (date || startTime || endTime || projectName || workDescription || employeeRemark) {
      setForm((prev) => ({
        ...prev,
        date: date || prev.date,
        startTime: startTime ? toTimeValue(startTime) || prev.startTime : prev.startTime,
        endTime: endTime ? toTimeValue(endTime) || prev.endTime : prev.endTime,
        projectName: projectName || prev.projectName,
        workDescription: workDescription || prev.workDescription,
        employeeRemark: employeeRemark || prev.employeeRemark,
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (projects.length > 0 && form.projectName && !selectedProjectId) {
      const match = projects.find((p) => p.name === form.projectName);
      if (match) setSelectedProjectId(match.id);
    }
  }, [projects, form.projectName, selectedProjectId]);

  const validate = () => {
    if (!form.date) return "Please select a date";
    if (!form.startTime || !form.endTime) return "Please enter start and end time";
    if (!form.projectName.trim()) return "Please select a project";
    if (!form.workDescription.trim()) return "Please add your work summary";

    const selectedDate = new Date(form.date);
    selectedDate.setHours(0, 0, 0, 0);
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);

    if (selectedDate.getTime() > todayDate.getTime()) {
      return "Timesheet date cannot be in the future";
    }

    const diffDays = Math.floor((todayDate.getTime() - selectedDate.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays > 1) {
      return "Only today or yesterday is allowed";
    }

    const start = new Date(`${form.date}T${form.startTime}:00`);
    const end = new Date(`${form.date}T${form.endTime}:00`);
    if (end <= start) return "End time must be after start time";

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
      const start = new Date(`${form.date}T${form.startTime}:00`).toISOString();
      const end = new Date(`${form.date}T${form.endTime}:00`).toISOString();

      await createTimesheet({
        organizationId,
        employeeId,
        date: form.date,
        startTime: start,
        endTime: end,
        projectName: form.projectName.trim() || undefined,
        workDescription: form.workDescription.trim(),
        employeeRemark: form.employeeRemark.trim() || undefined,
      });

      toast.success("Daily work saved");
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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Add Daily Work</h1>
            <p className="text-sm text-muted-foreground">Log your work for today or recent days</p>
          </div>
        </div>
      </div>

      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarCheck className="h-5 w-5 text-primary" />
            Timesheet Entry
          </CardTitle>
          <CardDescription>
            Only today or yesterday is allowed. Future dates are not allowed.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Date</label>
              <Input
                type="date"
                min={yesterdayStr}
                max={todayStr}
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Project</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={selectedProjectId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedProjectId(id);
                  const project = projects.find((p) => p.id === id);
                  setForm((prev) => ({ ...prev, projectName: project?.name || "" }));
                }}
              >
                <option value="">Select project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Start Time</label>
              <Input
                type="time"
                value={form.startTime}
                onChange={(e) => setForm((prev) => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">End Time</label>
              <Input
                type="time"
                value={form.endTime}
                onChange={(e) => setForm((prev) => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Work Summary</label>
            <Textarea
              rows={4}
              placeholder="What did you work on today?"
              value={form.workDescription}
              onChange={(e) => setForm((prev) => ({ ...prev, workDescription: e.target.value }))}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Remark (optional)</label>
            <Textarea
              rows={3}
              placeholder="Add any note for your manager"
              value={form.employeeRemark}
              onChange={(e) => setForm((prev) => ({ ...prev, employeeRemark: e.target.value }))}
            />
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting ? "Saving..." : "Save Daily Work"}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push("/user/timesheet")}
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
