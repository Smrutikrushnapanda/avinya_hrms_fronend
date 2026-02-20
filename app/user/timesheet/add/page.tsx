"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CalendarCheck } from "lucide-react";

import { createTimesheet, getClients, getEmployeeByUserId, getProfile, getProjects } from "@/app/api/api";
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

function AddTimesheetContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const today = useMemo(() => new Date(), []);
  const [organizationId, setOrganizationId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");

  const [form, setForm] = useState({
    date: today.toISOString().split("T")[0],
    startTime: "09:30",
    endTime: "18:30",
    projectName: "",
    clientName: "",
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

        if (orgId) {
          const [clientsRes, projectsRes] = await Promise.all([
            getClients({ organizationId: orgId }),
            getProjects({ organizationId: orgId }),
          ]);
          setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
          setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
        }
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
    const clientName = searchParams.get("clientName");
    const workDescription = searchParams.get("workDescription");
    const employeeRemark = searchParams.get("employeeRemark");

    if (date || startTime || endTime || projectName || clientName || workDescription || employeeRemark) {
      setForm((prev) => ({
        ...prev,
        date: date || prev.date,
        startTime: startTime ? toTimeValue(startTime) || prev.startTime : prev.startTime,
        endTime: endTime ? toTimeValue(endTime) || prev.endTime : prev.endTime,
        projectName: projectName || prev.projectName,
        clientName: clientName || prev.clientName,
        workDescription: workDescription || prev.workDescription,
        employeeRemark: employeeRemark || prev.employeeRemark,
      }));
    }
  }, [searchParams]);

  useEffect(() => {
    if (clients.length > 0 && form.clientName && !selectedClientId) {
      const match = clients.find((c) => c.clientName === form.clientName);
      if (match) setSelectedClientId(match.id);
    }
    if (projects.length > 0 && form.projectName && !selectedProjectId) {
      const match = projects.find((p) => p.projectName === form.projectName);
      if (match) setSelectedProjectId(match.id);
    }
  }, [clients, projects, form.clientName, form.projectName, selectedClientId, selectedProjectId]);

  const validate = () => {
    if (!form.date) return "Please select a date";
    if (!form.startTime || !form.endTime) return "Please enter start and end time";
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
        clientName: form.clientName.trim() || undefined,
        workDescription: form.workDescription.trim(),
        employeeRemark: form.employeeRemark.trim() || undefined,
      });

      toast.success("Daily work saved");
      router.push("/user/timesheet");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save timesheet");
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
              <label className="text-sm font-medium">Client</label>
              <select
                className="w-full border rounded-md px-3 py-2 text-sm bg-background"
                value={selectedClientId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSelectedClientId(id);
                  const client = clients.find((c) => c.id === id);
                  setForm((prev) => ({ ...prev, clientName: client?.clientName || "" }));
                  setSelectedProjectId("");
                  setForm((prev) => ({ ...prev, projectName: "" }));
                }}
              >
                <option value="">Select client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.clientName}
                  </option>
                ))}
              </select>
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
                  setForm((prev) => ({ ...prev, projectName: project?.projectName || "" }));
                }}
              >
                <option value="">Select project</option>
                {projects
                  .filter((project) => !selectedClientId || project.clientId === selectedClientId)
                  .map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.projectName}
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
