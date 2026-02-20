"use client";

import { useEffect, useState } from "react";
import { Briefcase, Building2, PlusCircle } from "lucide-react";

import {
  createClient,
  createProject,
  deleteClient,
  deleteProject,
  getClients,
  getProfile,
  getProjects,
  updateClient,
  updateProject,
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

export default function ClientsProjectsPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [clientSubmitting, setClientSubmitting] = useState(false);
  const [projectSubmitting, setProjectSubmitting] = useState(false);
  const [editClientId, setEditClientId] = useState<string | null>(null);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);

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
  });

  const loadData = async (orgId: string) => {
    const [clientsRes, projectsRes] = await Promise.all([
      getClients({ organizationId: orgId }),
      getProjects({ organizationId: orgId }),
    ]);
    setClients(Array.isArray(clientsRes.data) ? clientsRes.data : []);
    setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
  };

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await getProfile();
        const orgId = profileRes.data?.organizationId ?? "";
        setOrganizationId(orgId);
        if (orgId) {
          await loadData(orgId);
        }
      } catch (error) {
        console.error("Failed to load clients/projects:", error);
        toast.error("Failed to load clients and projects");
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
      await createProject({
        organizationId,
        clientId: projectForm.clientId || undefined,
        projectName: projectForm.projectName,
        status: projectForm.status || "ACTIVE",
        startDate: projectForm.startDate || undefined,
        endDate: projectForm.endDate || undefined,
        description: projectForm.description || undefined,
      });
      toast.success("Project added");
      setProjectForm({
        clientId: "",
        projectName: "",
        status: "ACTIVE",
        startDate: "",
        endDate: "",
        description: "",
      });
      await loadData(organizationId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to add project");
    } finally {
      setProjectSubmitting(false);
    }
  };

  const openEditProject = (project: any) => {
    setEditProjectId(project.id);
    setProjectForm({
      clientId: project.clientId || "",
      projectName: project.projectName || "",
      status: project.status || "ACTIVE",
      startDate: project.startDate || "",
      endDate: project.endDate || "",
      description: project.description || "",
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
      await updateProject(editProjectId, {
        clientId: projectForm.clientId || undefined,
        projectName: projectForm.projectName,
        status: projectForm.status || "ACTIVE",
        startDate: projectForm.startDate || undefined,
        endDate: projectForm.endDate || undefined,
        description: projectForm.description || undefined,
      });
      toast.success("Project updated");
      setEditProjectId(null);
      setProjectForm({
        clientId: "",
        projectName: "",
        status: "ACTIVE",
        startDate: "",
        endDate: "",
        description: "",
      });
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
      await deleteProject(id);
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
                  disabled={clientSubmitting}
                >
                  <PlusCircle className="h-4 w-4" />
                  {clientSubmitting
                    ? "Saving..."
                    : editClientId
                      ? "Save Client"
                      : "Add Client"}
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
                    <TableHead>Client</TableHead>
                    <TableHead>Industry</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-muted-foreground">
                        No clients added yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    clients.map((client) => (
                      <TableRow key={client.id}>
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
                              onClick={() => openEditClient(client)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
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
              <div className="flex items-center gap-2">
                <Button
                  onClick={editProjectId ? handleUpdateProject : handleCreateProject}
                  className="gap-2"
                  disabled={projectSubmitting}
                >
                  <Briefcase className="h-4 w-4" />
                  {projectSubmitting
                    ? "Saving..."
                    : editProjectId
                      ? "Save Project"
                      : "Add Project"}
                </Button>
                {editProjectId ? (
                  <Button
                    variant="outline"
                    disabled={projectSubmitting}
                    onClick={() => {
                      setEditProjectId(null);
                      setProjectForm({
                        clientId: "",
                        projectName: "",
                        status: "ACTIVE",
                        startDate: "",
                        endDate: "",
                        description: "",
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
              <CardTitle>Project List</CardTitle>
              <CardDescription>Manage active projects</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {projects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-sm text-muted-foreground">
                        No projects added yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div className="font-medium">{project.projectName}</div>
                        </TableCell>
                        <TableCell>{project.client?.clientName || "--"}</TableCell>
                        <TableCell>{project.status || "--"}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditProject(project)}>
                              Edit
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => handleDeleteProject(project.id)}>
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
      </Tabs>

    </div>
  );
}
