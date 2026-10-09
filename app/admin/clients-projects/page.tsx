"use client";

import { Fragment, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Building2, PlusCircle, ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";

import {
  createClient,
  createClientProject,
  deleteClient,
  deleteClientProject,
  getClientProjects,
  getClients,
  getProfile,
  updateClient,
  updateClientProject,
  getEmployees,
} from "@/app/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getFullName } from "@/lib/utils";

const DEFAULT_PROJECT_FORM = {
  clientId: "",
  projectName: "",
  status: "ACTIVE",
  startDate: "",
  endDate: "",
  description: "",
  managerId: "",
  additionalManagerIds: [] as string[],
  projectCost: "",
  hourlyRate: "",
  workOrderAssigned: "no" as "yes" | "no",
  parentProjectId: "",
};

export default function ClientsProjectsPage() {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [workOrderFilter, setWorkOrderFilter] = useState<"all" | "assigned" | "pending">("all");
  const [managers, setManagers] = useState<any[]>([]);
  const [clientSubmitting, setClientSubmitting] = useState(false);
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [expandedStreams, setExpandedStreams] = useState<Record<string, boolean>>({});

  const [clientForm, setClientForm] = useState({
    clientName: "",
    industry: "",
    industryOther: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    website: "",
    address: "",
    notes: "",
  });

  const [projectForm, setProjectForm] = useState({
    clientId: "",
    projectName: "",
    status: "ACTIVE",
    startDate: "",
    endDate: "",
    description: "",
    managerId: "",
    additionalManagerIds: [] as string[],
    projectCost: "",
    hourlyRate: "",
    workOrderAssigned: "no" as "yes" | "no",
    parentProjectId: "",
  });

  const loadData = async (orgId: string) => {
    const [clientsRes, projectsRes, employeesRes] = await Promise.all([
      getClients({ organizationId: orgId }),
      getClientProjects({ organizationId: orgId }),
      getEmployees(orgId).catch(() => ({ data: [] })),
    ]);
    setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
    setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);

    const employees = Array.isArray(employeesRes.data)
      ? employeesRes.data
      : employeesRes.data?.data ?? employeesRes.data?.employees ?? [];

    // A manager is anyone who has at least one direct report (reportingTo points to them)
    const reportsSet = new Set<string>();
    employees.forEach((e: any) => {
      if (e.reportingTo) reportsSet.add(e.reportingTo);
    });

    const mgrs = employees
      .filter((e: any) => reportsSet.has(e.id))
      .map((e: any) => ({
        id: e.id,
        userId: e.userId ?? e.user?.id ?? "",
        name:
          getFullName(e) ||
          getFullName(e.user) ||
          e.firstName ||
          e.user?.firstName ||
          "",
        email: e.user?.email ?? e.workEmail ?? "",
      }));

    setManagers(mgrs);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const profilePromise = getProfile();
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Request timeout: Unable to fetch profile information. Please check your connection and try again.")), 30000);
        });
        
        const profileRes = (await Promise.race([profilePromise, timeoutPromise])) as {
          data?: { organizationId?: string };
        };
        const orgId = profileRes.data?.organizationId ?? "";
        setOrganizationId(orgId);
        if (orgId) {
          await loadData(orgId);
        }
      } catch (error) {
        console.error("Failed to load clients/projects:", error);
        if ((error as { message?: string })?.message?.includes("timeout")) {
          toast.error("Request timed out. Please check your internet connection and try again.");
        } else {
          toast.error("Failed to load clients and projects");
        }
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const industryOptions = [
    "Technology",
    "Finance",
    "Healthcare",
    "Manufacturing",
    "Retail",
    "Education",
    "Telecommunications",
    "Logistics",
    "Real Estate",
    "Energy",
    "Hospitality",
    "Government",
    "Media",
    "Construction",
    "Automotive",
    "Agriculture",
    "Other",
  ];

  const openEditClient = (client: any) => {
    const industry = client.industry || "";
    const isOther = industry && !industryOptions.includes(industry);
    setEditClientId(client.id);
    setClientForm({
      clientName: client.clientName || "",
      industry: isOther ? "Other" : industry,
      industryOther: isOther ? industry : "",
      contactName: client.contactName || "",
      contactEmail: client.contactEmail || "",
      contactPhone: client.contactPhone || "",
      website: client.website || "",
      address: client.address || "",
      notes: client.notes || "",
    });
  };

  const handleCreateClient = async () => {
    if (!clientForm.clientName.trim()) {
      toast.error("Client name is required");
      return;
    }
    if (clientForm.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientForm.contactEmail)) {
      toast.error("Please enter a valid contact email");
      return;
    }
    if (clientForm.contactPhone && !/^\d{10}$/.test(clientForm.contactPhone)) {
      toast.error("Please enter a valid contact phone");
      return;
    }
    const industryValue =
      clientForm.industry === "Other"
        ? clientForm.industryOther.trim()
        : clientForm.industry;
    if (clientForm.industry === "Other" && !industryValue) {
      toast.error("Please enter industry name");
      return;
    }
    try {
      setClientSubmitting(true);
      const payload = {
        organizationId,
        clientName: clientForm.clientName,
        industry: industryValue || undefined,
        contactName: clientForm.contactName || undefined,
        contactEmail: clientForm.contactEmail || undefined,
        contactPhone: clientForm.contactPhone || undefined,
        website: clientForm.website || undefined,
        address: clientForm.address || undefined,
        notes: clientForm.notes || undefined,
      };
      await createClient(payload);
      toast.success("Client added");
      setClientForm({
        clientName: "",
        industry: "",
        industryOther: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        website: "",
        address: "",
        notes: "",
      });
      await loadData(organizationId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to add client");
    } finally {
      setClientSubmitting(false);
    }
  };

  const handleUpdateClient = async () => {
    if (!editClientId) return;
    if (!clientForm.clientName.trim()) {
      toast.error("Client name is required");
      return;
    }
    if (clientForm.contactEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(clientForm.contactEmail)) {
      toast.error("Please enter a valid contact email");
      return;
    }
    if (clientForm.contactPhone && !/^\d{10}$/.test(clientForm.contactPhone)) {
      toast.error("Please enter a valid contact phone");
      return;
    }
    const industryValue =
      clientForm.industry === "Other"
        ? clientForm.industryOther.trim()
        : clientForm.industry;
    if (clientForm.industry === "Other" && !industryValue) {
      toast.error("Please enter industry name");
      return;
    }
    try {
      setClientSubmitting(true);
      await updateClient(editClientId, {
        clientName: clientForm.clientName,
        industry: industryValue || undefined,
        contactName: clientForm.contactName || undefined,
        contactEmail: clientForm.contactEmail || undefined,
        contactPhone: clientForm.contactPhone || undefined,
        website: clientForm.website || undefined,
        address: clientForm.address || undefined,
        notes: clientForm.notes || undefined,
      });
      toast.success("Client updated");
      setEditClientId(null);
      setClientForm({
        clientName: "",
        industry: "",
        industryOther: "",
        contactName: "",
        contactEmail: "",
        contactPhone: "",
        website: "",
        address: "",
        notes: "",
      });
      await loadData(organizationId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update client");
    } finally {
      setClientSubmitting(false);
    }
  };

  const handleCreateProject = async () => {
    if (!projectForm.projectName.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (projectForm.startDate && projectForm.endDate) {
      const start = new Date(projectForm.startDate);
      const end = new Date(projectForm.endDate);
      if (end < start) {
        toast.error("End date must be after start date");
        return;
      }
    }
    try {
      setProjectSubmitting(true);
      await createClientProject({
        organizationId,
        clientId: projectForm.clientId || undefined,
        projectName: projectForm.projectName,
        status: projectForm.status || "ACTIVE",
        startDate: projectForm.startDate || undefined,
        endDate: projectForm.endDate || undefined,
        description: projectForm.description || undefined,
        managerId: projectForm.managerId || undefined,
        additionalManagerIds:
          projectForm.additionalManagerIds.length > 0
            ? projectForm.additionalManagerIds
            : undefined,
        projectCost: projectForm.projectCost ? parseFloat(projectForm.projectCost) : undefined,
        hourlyRate: projectForm.hourlyRate ? parseFloat(projectForm.hourlyRate) : undefined,
        workOrderAssigned: projectForm.workOrderAssigned === "yes",
        parentProjectId: projectForm.parentProjectId || undefined,
      });
      toast.success("Project added");
      setProjectForm({ ...DEFAULT_PROJECT_FORM });
      await loadData(organizationId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to add project");
    } finally {
      setProjectSubmitting(false);
    }
  };

  const openEditProject = (project: any) => {
    setEditProjectId(project.id);
    const primaryManagerUserId =
      project.manager?.user?.id ?? project.manager?.userId ?? "";
    const additionalManagerIds = (project.members ?? [])
      .filter(
        (m: any) =>
          String(m.role || "").toLowerCase() === "manager" &&
          (m.userId ?? m.user?.id ?? "") !== primaryManagerUserId,
      )
      .map((m: any) => m.userId ?? m.user?.id ?? "")
      .filter(Boolean);
    setProjectForm({
      clientId: project.clientId || "",
      projectName: project.projectName || "",
      status: project.status || "ACTIVE",
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      description: project.description || "",
      managerId: project.managerId || project.manager?.id || "",
      additionalManagerIds,
      projectCost: project.projectCost?.toString() || "",
      hourlyRate: project.hourlyRate?.toString() || "",
      workOrderAssigned: project.workOrderAssigned === false ? "no" : "yes",
      parentProjectId: project.parentProjectId || "",
    });
  };

  const handleUpdateProject = async () => {
    if (!editProjectId) return;
    if (!projectForm.projectName.trim()) {
      toast.error("Project name is required");
      return;
    }
    if (projectForm.startDate && projectForm.endDate) {
      const start = new Date(projectForm.startDate);
      const end = new Date(projectForm.endDate);
      if (end < start) {
        toast.error("End date must be after start date");
        return;
      }
    }
    try {
      setProjectSubmitting(true);
      await updateClientProject(editProjectId, {
        projectName: projectForm.projectName,
        status: projectForm.status || "ACTIVE",
        startDate: projectForm.startDate || undefined,
        endDate: projectForm.endDate || undefined,
        description: projectForm.description || undefined,
        managerId: projectForm.managerId || undefined,
        additionalManagerIds:
          projectForm.additionalManagerIds.length > 0
            ? projectForm.additionalManagerIds
            : undefined,
        projectCost: projectForm.projectCost ? parseFloat(projectForm.projectCost) : undefined,
        hourlyRate: projectForm.hourlyRate ? parseFloat(projectForm.hourlyRate) : undefined,
        workOrderAssigned: projectForm.workOrderAssigned === "yes",
        parentProjectId: projectForm.parentProjectId || undefined,
      });
      toast.success("Project updated");
      setEditProjectId(null);
      setProjectForm({ ...DEFAULT_PROJECT_FORM });
      await loadData(organizationId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update project");
    } finally {
      setProjectSubmitting(false);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (!confirm("Delete this client?")) return;
    try {
      await deleteClient(id);
      toast.success("Client deleted");
      await loadData(organizationId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete client");
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    try {
      await deleteClientProject(id);
      toast.success("Project deleted");
      await loadData(organizationId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete project");
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
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => router.push("/admin/projects")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Building2 className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Clients & Projects</h1>
          <p className="text-sm text-muted-foreground">Manage client details and project catalog</p>
        </div>
      </div>

      <Tabs defaultValue="clients" className="space-y-6">
        <TabsList>
          <TabsTrigger value="clients">Clients</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        <TabsContent value="clients" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Client</CardTitle>
              <CardDescription>Capture client details for project mapping</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Client Name</Label>
                  <Input
                    value={clientForm.clientName}
                    onChange={(e) => setClientForm((prev) => ({ ...prev, clientName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Industry</Label>
                  <Select
                    value={clientForm.industry}
                    onValueChange={(value) =>
                      setClientForm((prev) => ({
                        ...prev,
                        industry: value,
                        industryOther: value === "Other" ? prev.industryOther : "",
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {industryOptions.map((industry) => (
                        <SelectItem key={industry} value={industry}>
                          {industry}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {clientForm.industry === "Other" ? (
                  <div className="space-y-1.5">
                    <Label>Industry Name</Label>
                    <Input
                      value={clientForm.industryOther}
                      onChange={(e) =>
                        setClientForm((prev) => ({ ...prev, industryOther: e.target.value }))
                      }
                    />
                  </div>
                ) : null}
                <div className="space-y-1.5">
                  <Label>Contact Name</Label>
                  <Input
                    value={clientForm.contactName}
                    onChange={(e) => setClientForm((prev) => ({ ...prev, contactName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Email</Label>
                  <Input
                    value={clientForm.contactEmail}
                    onChange={(e) => setClientForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Contact Phone</Label>
                  <Input
                    type="tel"
                    inputMode="tel"
                    maxLength={10}
                    value={clientForm.contactPhone}
                    onChange={(e) => {
                      const digitsOnly = e.target.value.replace(/\\D/g, "").slice(0, 10);
                      setClientForm((prev) => ({ ...prev, contactPhone: digitsOnly }));
                    }}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Website</Label>
                  <Input
                    value={clientForm.website}
                    onChange={(e) => setClientForm((prev) => ({ ...prev, website: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Address</Label>
                <Textarea
                  rows={2}
                  value={clientForm.address}
                  onChange={(e) => setClientForm((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={2}
                  value={clientForm.notes}
                  onChange={(e) => setClientForm((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={editClientId ? handleUpdateClient : handleCreateClient}
                  className="gap-2"
                  loading={clientSubmitting}
                >
                  <PlusCircle className="h-4 w-4" />
                  {editClientId ? "Save Client" : "Add Client"}
                </Button>
                {editClientId ? (
                  <Button
                    variant="outline"
                    disabled={clientSubmitting}
                    onClick={() => {
                      setEditClientId(null);
                      setClientForm({
                        clientName: "",
                        industry: "",
                        industryOther: "",
                        contactName: "",
                        contactEmail: "",
                        contactPhone: "",
                        website: "",
                        address: "",
                        notes: "",
                      });
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Client List</CardTitle>
              <CardDescription>Manage existing clients</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sl#</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-sm text-muted-foreground">
                        No clients added yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((client, index) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{index + 1}</TableCell>
                        <TableCell>
                          <div className="font-medium">{client.clientName}</div>
                        </TableCell>
                        <TableCell>{client.industry || "--"}</TableCell>
                        <TableCell>
                          <div className="text-sm">{client.contactName || "--"}</div>
                          <div className="text-xs text-muted-foreground">{client.contactEmail || "--"}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              onClick={() => openEditClient(client)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteClient(client.id)}
                            >
                            Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Add Project</CardTitle>
              <CardDescription>Assign projects to clients and track status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Client (optional)</Label>
                <Select
                  value={projectForm.clientId}
                  onValueChange={(value) => setProjectForm((prev) => ({ ...prev, clientId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.clientName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Assign Manager</Label>
                  <Select
                    value={projectForm.managerId}
                    onValueChange={(value) => setProjectForm((prev) => ({ ...prev, managerId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={managers.length ? "Select manager" : "No managers found"} />
                    </SelectTrigger>
                    <SelectContent>
                      {managers.length === 0 ? (
                        <SelectItem value="no-managers" disabled>
                          No managers available
                        </SelectItem>
                      ) : (
                        managers.map((mgr) => (
                          <SelectItem key={mgr.id} value={mgr.id}>
                            {mgr.name || "Unnamed"} {mgr.email ? `• ${mgr.email}` : ""}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Additional Managers</Label>
                  <div className="max-h-40 overflow-auto border border-border rounded-md p-2 space-y-1.5">
                    {managers.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No managers available</p>
                    ) : (
                      managers.map((mgr) => {
                        const checked = projectForm.additionalManagerIds.includes(mgr.userId);
                        const isPrimary = mgr.id === projectForm.managerId;
                        return (
                          <label
                            key={mgr.userId}
                            className={`flex items-center gap-2 cursor-pointer rounded px-2 py-1 ${
                              isPrimary ? "opacity-50 pointer-events-none" : "hover:bg-muted/60"
                            }`}
                            title={isPrimary ? "Primary manager is already assigned" : undefined}
                          >
                            <input
                              type="checkbox"
                              disabled={isPrimary}
                              checked={checked || isPrimary}
                              onChange={(e) =>
                                setProjectForm((prev) => ({
                                  ...prev,
                                  additionalManagerIds: e.target.checked
                                    ? [...prev.additionalManagerIds, mgr.userId]
                                    : prev.additionalManagerIds.filter(
                                        (id) => id !== mgr.userId,
                                      ),
                                }))
                              }
                            />
                            <span className="text-sm truncate">
                              {mgr.name || "Unnamed"} {mgr.email ? `• ${mgr.email}` : ""}
                            </span>
                            {isPrimary && (
                              <span className="ml-auto text-[10px] text-muted-foreground">
                                Primary
                              </span>
                            )}
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Project Name</Label>
                  <Input
                    value={projectForm.projectName}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, projectName: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={projectForm.status}
                    onValueChange={(value) => setProjectForm((prev) => ({ ...prev, status: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                      <SelectItem value="ON_HOLD">ON_HOLD</SelectItem>
                      <SelectItem value="COMPLETED">COMPLETED</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Work Order Assigned</Label>
                  <Select
                    value={projectForm.workOrderAssigned}
                    onValueChange={(value) =>
                      setProjectForm((prev) => ({ ...prev, workOrderAssigned: value as "yes" | "no" }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes — Work order issued</SelectItem>
                      <SelectItem value="no">No — Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Parent Work Stream (optional)</Label>
                  <Select
                    value={projectForm.parentProjectId}
                    onValueChange={(value) =>
                      setProjectForm((prev) => ({
                        ...prev,
                        parentProjectId: value === "none-stream" ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (standalone project)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none-stream">None (standalone)</SelectItem>
                      {projects
                        .filter(
                          (p) =>
                            !p.parentProjectId &&
                            (!editProjectId || p.id !== editProjectId)
                        )
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.projectName}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Start Date</Label>
                  <Input
                    type="date"
                    value={projectForm.startDate}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End Date</Label>
                  <Input
                    type="date"
                    value={projectForm.endDate}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  rows={2}
                  value={projectForm.description}
                  onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Project Cost (₹)</Label>
                  <Input
                    type="number"
                    placeholder="Optional"
                    value={projectForm.projectCost}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, projectCost: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Hourly Rate (₹)</Label>
                  <Input
                    type="number"
                    placeholder="Optional"
                    value={projectForm.hourlyRate}
                    onChange={(e) => setProjectForm((prev) => ({ ...prev, hourlyRate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={editProjectId ? handleUpdateProject : handleCreateProject}
                  className="gap-2"
                  loading={projectSubmitting}
                >
                  <Briefcase className="h-4 w-4" />
                  {editProjectId ? "Save Project" : "Add Project"}
                </Button>
                {editProjectId ? (
                  <Button
                    variant="outline"
                    disabled={projectSubmitting}
                    onClick={() => {
                      setEditProjectId(null);
                      setProjectForm({ ...DEFAULT_PROJECT_FORM });
                    }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4">
                <CardTitle>Project List</CardTitle>
                <div className="w-44">
                  <Select
                    value={workOrderFilter}
                    onValueChange={(value) =>
                      setWorkOrderFilter(value as "all" | "assigned" | "pending")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Work Orders</SelectItem>
                      <SelectItem value="assigned">Work Order Assigned</SelectItem>
                      <SelectItem value="pending">Work Order Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <CardDescription>Manage active projects</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"> </TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Work Order</TableHead>
                    <TableHead>Manager</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-sm text-muted-foreground">
                        No projects added yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    (() => {
                      const childrenMap: Record<string, any[]> = {};
                      const parents: any[] = [];
                      projects.forEach((project) => {
                        if (project.parentProjectId && projects.some((p) => p.id === project.parentProjectId)) {
                          childrenMap[project.parentProjectId] = [
                            ...(childrenMap[project.parentProjectId] || []),
                            project,
                          ];
                        } else if (
                          workOrderFilter === "assigned"
                            ? project.workOrderAssigned !== false
                            : workOrderFilter === "pending"
                              ? project.workOrderAssigned === false
                              : true
                        ) {
                          parents.push(project);
                        }
                      });

                      const renderProjectRow = (
                        project: any,
                        nested: boolean,
                        streamName?: string
                      ) => {
                        const children = childrenMap[project.id] || [];
                        const expanded = expandedStreams[project.id] !== false;
                        const workOrderAssigned = project.workOrderAssigned !== false;
                        return (
                          <Fragment key={project.id}>
                            <TableRow className={nested ? "bg-muted/30" : undefined}>
                              <TableCell className="font-medium">
                                {nested ? "↳" : children.length > 0 ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setExpandedStreams((prev) => ({
                                        ...prev,
                                        [project.id]: !expanded,
                                      }))
                                    }
                                    className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
                                    aria-label="Toggle work streams"
                                  >
                                    {expanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </button>
                                ) : null}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{project.projectName}</div>
                                {nested && streamName && (
                                  <div className="text-[11px] text-muted-foreground truncate">
                                    Work stream of {streamName}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>{project.client?.clientName || "--"}</TableCell>
                              <TableCell>
                                {project.status === "ACTIVE" ? (
                                  <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    {project.status}
                                  </span>
                                ) : project.status === "ON_HOLD" ? (
                                  <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                                    {project.status}
                                  </span>
                                ) : (
                                  <span className="inline-flex rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                                    {project.status || "--"}
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {workOrderAssigned ? (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                                    Assigned
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                                    Work Order Pending
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                {getFullName(project.manager) || project.manager?.email || "--"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" onClick={() => openEditProject(project)}>
                                    Edit
                                  </Button>
                                  <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDeleteProject(project.id)}>
                                    Delete
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {children.length > 0 &&
                              expanded &&
                              children.map((child) =>
                                renderProjectRow(child, true, project.projectName)
                              )}
                          </Fragment>
                        );
                      };

                      return parents.map((project) => renderProjectRow(project, false));
                    })()
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

    </div>
  );
}
