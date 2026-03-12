"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Building2, Calendar, Users, Mail, ClipboardList, CheckCircle2, XCircle, Clock3, Eye, EyeOff } from "lucide-react";
import { getDepartments, getDesignations, createDepartment, createDesignation, updateDepartment, updateDesignation, deleteDepartment, deleteDesignation, getProfile, getHolidays, createHoliday, updateHoliday, deleteHoliday, createRole, updateRole, deleteRole, getOrgRoles, getOrganization, updateOrganization, deleteOrganization, changeOrgAdminCredentials, getOrgResignationRequests, reviewResignationRequest } from "@/app/api/api";
import AttendanceSettingsPage from "../attendance/settings/page";

interface Department {
  id: string;
  name: string;
  code: string;
}

interface Designation {
  id: string;
  name: string;
  code: string;
}

interface Holiday {
  id: number;
  name: string;
  date: string;
  description?: string;
  isOptional: boolean;
}

interface Role {
  id: string;
  roleName: string;
  description?: string;
  type?: string;
}

interface Organization {
  id: string;
  name: string;
  email?: string;
  hrMail?: string;
  phone?: string;
  address?: string;
  logoUrl?: string;
  homeHeaderBackgroundColor?: string;
  homeHeaderMediaUrl?: string;
  homeHeaderMediaStartDate?: string;
  homeHeaderMediaEndDate?: string;
  resignationPolicy?: string;
  resignationNoticePeriodDays?: number;
  allowEarlyRelievingByAdmin?: boolean;
}

interface ResignationRequest {
  id: string;
  message: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  proposedLastWorkingDay?: string | null;
  approvedLastWorkingDay?: string | null;
  allowEarlyRelieving?: boolean;
  hrRemarks?: string | null;
  createdAt: string;
  employee?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    employeeCode?: string;
    workEmail?: string;
  };
}

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern", "Consultant"];
const DEFAULT_HOME_HEADER_COLOR = "#026D94";

export default function SettingsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationId, setOrganizationId] = useState<string>("");
  
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [isDesigDialogOpen, setIsDesigDialogOpen] = useState(false);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  const [deptForm, setDeptForm] = useState({ name: "", code: "" });
  const [desigForm, setDesigForm] = useState({ name: "", code: "" });
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "", description: "", isOptional: false });
const [orgForm, setOrgForm] = useState({
  name: "",
  email: "",
  hrMail: "",
  phone: "",
  address: "",
  logoUrl: "",
  homeHeaderBackgroundColor: "#026D94",
  homeHeaderMediaUrl: "",
  homeHeaderMediaStartDate: "",
  homeHeaderMediaEndDate: "",
  resignationPolicy: "",
  resignationNoticePeriodDays: 30,
  allowEarlyRelievingByAdmin: false,
});
const [orgErrors, setOrgErrors] = useState<Record<string, string>>({});
  const [roleForm, setRoleForm] = useState({ roleName: "", description: "" });
  const [resignationRequests, setResignationRequests] = useState<ResignationRequest[]>([]);
  const [resignationStatusFilter, setResignationStatusFilter] = useState<"ALL" | "PENDING" | "APPROVED" | "REJECTED">("ALL");
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
  const [isDeleteOrgDialogOpen, setIsDeleteOrgDialogOpen] = useState(false);
  const [credentialsForm, setCredentialsForm] = useState({ newUserName: "", newPassword: "", confirmPassword: "" });

  const [showCredPassword, setShowCredPassword] = useState(false);
  const [showCredConfirmPassword, setShowCredConfirmPassword] = useState(false);
  const [isResignationReviewDialogOpen, setIsResignationReviewDialogOpen] = useState(false);
  const [reviewingResignation, setReviewingResignation] = useState<ResignationRequest | null>(null);
  const [resignationReviewForm, setResignationReviewForm] = useState({
    status: "APPROVED" as "APPROVED" | "REJECTED",
    hrRemarks: "",
    approvedLastWorkingDay: "",
    allowEarlyRelieving: false,
  });

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        setOrganizationId(res.data.organizationId);
      } catch (error) {
        toast.error("Failed to load profile");
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    if (organizationId) {
      loadDepartments();
      loadDesignations();
      loadHolidays();
      loadRoles();
      loadOrganization();
      loadResignationRequests(resignationStatusFilter);
    }
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) return;
    loadResignationRequests(resignationStatusFilter);
  }, [resignationStatusFilter, organizationId]);

  const loadDepartments = async () => {
    try {
      const res = await getDepartments(organizationId);
      setDepartments(res.data.data || []);
    } catch (error) {
      toast.error("Failed to load departments");
    }
  };

  const loadDesignations = async () => {
    try {
      const res = await getDesignations(organizationId);
      setDesignations(res.data.data || []);
    } catch (error) {
      toast.error("Failed to load designations");
    }
  };

  const loadHolidays = async () => {
    try {
      const res = await getHolidays({ organizationId });
      setHolidays(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const loadRoles = async () => {
    try {
      const res = await getOrgRoles(organizationId);
      setRoles(res.data || []);
    } catch (error) {
      console.error(error);
    }
  };

const loadOrganization = async () => {
    try {
      const res = await getOrganization(organizationId);
      setOrganization(res.data);
      setOrgForm({
        name: res.data.name || "",
        email: res.data.email || "",
        hrMail: res.data.hrMail || "",
        phone: res.data.phone || "",
        address: res.data.address || "",
        logoUrl: res.data.logoUrl || "",
        homeHeaderBackgroundColor: res.data.homeHeaderBackgroundColor || DEFAULT_HOME_HEADER_COLOR,
        homeHeaderMediaUrl: res.data.homeHeaderMediaUrl || "",
        homeHeaderMediaStartDate: res.data.homeHeaderMediaStartDate || "",
        homeHeaderMediaEndDate: res.data.homeHeaderMediaEndDate || "",
        resignationPolicy: res.data.resignationPolicy || "",
        resignationNoticePeriodDays: Number(res.data.resignationNoticePeriodDays || 30),
        allowEarlyRelievingByAdmin: Boolean(res.data.allowEarlyRelievingByAdmin),
      });
    } catch (error) {
      console.error(error);
    }
  };

  const loadResignationRequests = async (status: "ALL" | "PENDING" | "APPROVED" | "REJECTED" = "ALL") => {
    try {
      const res = await getOrgResignationRequests(status === "ALL" ? undefined : status);
      setResignationRequests(res.data || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load resignation requests");
    }
  };

  const getResignationStatusClass = (status: string) => {
    if (status === "APPROVED") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (status === "REJECTED") return "bg-rose-100 text-rose-700 border-rose-200";
    return "bg-amber-100 text-amber-700 border-amber-200";
  };

  const getEmployeeName = (req: ResignationRequest) =>
    [req.employee?.firstName, req.employee?.middleName, req.employee?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim() || req.employee?.employeeCode || "Employee";

  const handleSaveDepartment = async () => {
    if (!deptForm.name.trim()) {
      toast.error("Department name is required");
      return;
    }
    try {
      if (editingDept) {
        await updateDepartment(editingDept.id, { ...deptForm, organizationId });
        toast.success("Department updated");
      } else {
        await createDepartment({ ...deptForm, organizationId });
        toast.success("Department created");
      }
      setIsDeptDialogOpen(false);
      setDeptForm({ name: "", code: "" });
      setEditingDept(null);
      loadDepartments();
    } catch (error) {
      toast.error("Failed to save department");
    }
  };

  const handleSaveDesignation = async () => {
    if (!desigForm.name.trim()) {
      toast.error("Designation name is required");
      return;
    }
    try {
      if (editingDesig) {
        await updateDesignation(editingDesig.id, { ...desigForm, organizationId });
        toast.success("Designation updated");
      } else {
        await createDesignation({ ...desigForm, organizationId });
        toast.success("Designation created");
      }
      setIsDesigDialogOpen(false);
      setDesigForm({ name: "", code: "" });
      setEditingDesig(null);
      loadDesignations();
    } catch (error) {
      toast.error("Failed to save designation");
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    if (!confirm("Are you sure you want to delete this department?")) return;
    try {
      await deleteDepartment(id);
      toast.success("Department deleted");
      loadDepartments();
    } catch (error) {
      toast.error("Failed to delete department");
    }
  };

  const handleDeleteDesignation = async (id: string) => {
    if (!confirm("Are you sure you want to delete this designation?")) return;
    try {
      await deleteDesignation(id);
      toast.success("Designation deleted");
      loadDesignations();
    } catch (error) {
      toast.error("Failed to delete designation");
    }
  };

  const handleChangeCredentials = async () => {
    if (!credentialsForm.newUserName.trim() && !credentialsForm.newPassword.trim()) {
      toast.error("Enter a new username or password");
      return;
    }
    if (credentialsForm.newPassword && credentialsForm.newPassword !== credentialsForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    try {
      await changeOrgAdminCredentials(organizationId, {
        newUserName: credentialsForm.newUserName || undefined,
        newPassword: credentialsForm.newPassword || undefined,
      });
      toast.success("Admin credentials updated");
      setIsCredentialsDialogOpen(false);
      setCredentialsForm({ newUserName: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update credentials");
    }
  };

  const handleDeleteOrganization = async () => {
    try {
      await deleteOrganization(organizationId);
      toast.success("Organization deleted");
      setIsDeleteOrgDialogOpen(false);
      window.location.href = "/";
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete organization");
    }
  };

  const handleSaveOrganization = async () => {
    const errors: Record<string, string> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!orgForm.name.trim()) errors.name = "Organization name is required";
    else if (orgForm.name.trim().length < 2) errors.name = "Name must be at least 2 characters";

    if (!orgForm.email.trim()) errors.email = "Email is required";
    else if (!emailRegex.test(orgForm.email.trim())) errors.email = "Enter a valid email address";

    if (orgForm.hrMail.trim() && !emailRegex.test(orgForm.hrMail.trim()))
      errors.hrMail = "Enter a valid HR email address";

    if (orgForm.phone.trim() && !/^\+?[\d\s\-()\[\]]{7,20}$/.test(orgForm.phone.trim()))
      errors.phone = "Enter a valid phone number (7–20 digits)";

    if (orgForm.logoUrl.trim() && !/^https?:\/\/.+/.test(orgForm.logoUrl.trim()))
      errors.logoUrl = "Logo URL must start with http:// or https://";

    if (
      orgForm.homeHeaderBackgroundColor.trim() &&
      !/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(orgForm.homeHeaderBackgroundColor.trim())
    ) {
      errors.homeHeaderBackgroundColor = "Header color must be a valid hex value like #026D94";
    }

    if (orgForm.homeHeaderMediaUrl.trim() && !/^https?:\/\/.+/.test(orgForm.homeHeaderMediaUrl.trim())) {
      errors.homeHeaderMediaUrl = "Header media URL must start with http:// or https://";
    }

    if (
      orgForm.homeHeaderMediaStartDate &&
      orgForm.homeHeaderMediaEndDate &&
      orgForm.homeHeaderMediaStartDate > orgForm.homeHeaderMediaEndDate
    ) {
      errors.homeHeaderMediaEndDate = "End date must be on or after the start date";
    }

    if (orgForm.resignationNoticePeriodDays < 0)
      errors.resignationNoticePeriodDays = "Notice period cannot be negative";

    if (Object.keys(errors).length > 0) {
      setOrgErrors(errors);
      return;
    }

    setOrgErrors({});
    try {
      await updateOrganization(organizationId, {
        ...orgForm,
        resignationNoticePeriodDays: Number(orgForm.resignationNoticePeriodDays || 0),
      });
      toast.success("Organization updated");
      setIsOrgDialogOpen(false);
      loadOrganization();
    } catch (error) {
      toast.error("Failed to update organization");
    }
  };

  const handleSaveHoliday = async () => {
    if (!holidayForm.name.trim() || !holidayForm.date) {
      toast.error("Holiday name and date are required");
      return;
    }
    try {
      if (editingHoliday) {
        await updateHoliday(editingHoliday.id, { ...holidayForm });
        toast.success("Holiday updated");
      } else {
        await createHoliday({ ...holidayForm, organizationId });
        toast.success("Holiday created");
      }
      setIsHolidayDialogOpen(false);
      setHolidayForm({ name: "", date: "", description: "", isOptional: false });
      setEditingHoliday(null);
      loadHolidays();
    } catch (error) {
      toast.error("Failed to save holiday");
    }
  };

  const handleDeleteHoliday = async (id: number) => {
    if (!confirm("Are you sure you want to delete this holiday?")) return;
    try {
      await deleteHoliday(id);
      toast.success("Holiday deleted");
      loadHolidays();
    } catch (error) {
      toast.error("Failed to delete holiday");
    }
  };

  const handleSaveRole = async () => {
    if (!roleForm.roleName.trim()) {
      toast.error("Role name is required");
      return;
    }
    try {
      if (editingRole) {
        await updateRole(editingRole.id, { ...roleForm });
        toast.success("Role updated");
      } else {
        await createRole({ ...roleForm, type: "CUSTOM", organizationId });
        toast.success("Role created");
      }
      setIsRoleDialogOpen(false);
      setRoleForm({ roleName: "", description: "" });
      setEditingRole(null);
      loadRoles();
    } catch (error) {
      toast.error("Failed to save role");
    }
  };

  const handleDeleteRole = async (role: Role) => {
    if (role.type === "DEFAULT") {
      toast.error("Default roles cannot be deleted");
      return;
    }
    if (!confirm("Are you sure you want to delete this role?")) return;
    try {
      await deleteRole(role.id);
      toast.success("Role deleted");
      loadRoles();
    } catch (error) {
      toast.error("Failed to delete role");
    }
  };

  const openResignationReviewDialog = (request: ResignationRequest, status: "APPROVED" | "REJECTED") => {
    setReviewingResignation(request);
    setResignationReviewForm({
      status,
      hrRemarks: request.hrRemarks || "",
      approvedLastWorkingDay:
        request.approvedLastWorkingDay || request.proposedLastWorkingDay || "",
      allowEarlyRelieving: Boolean(request.allowEarlyRelieving),
    });
    setIsResignationReviewDialogOpen(true);
  };

  const handleSubmitResignationReview = async () => {
    if (!reviewingResignation) return;
    if (
      resignationReviewForm.status === "APPROVED" &&
      !resignationReviewForm.approvedLastWorkingDay
    ) {
      toast.error("Please set approved last working day");
      return;
    }
    try {
      await reviewResignationRequest(reviewingResignation.id, {
        status: resignationReviewForm.status,
        hrRemarks: resignationReviewForm.hrRemarks || undefined,
        approvedLastWorkingDay:
          resignationReviewForm.status === "APPROVED"
            ? resignationReviewForm.approvedLastWorkingDay
            : undefined,
        allowEarlyRelieving:
          resignationReviewForm.status === "APPROVED"
            ? resignationReviewForm.allowEarlyRelieving
            : false,
      });
      toast.success("Resignation request reviewed");
      setIsResignationReviewDialogOpen(false);
      setReviewingResignation(null);
      loadResignationRequests(resignationStatusFilter);
    } catch (error) {
      toast.error("Failed to review resignation request");
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="organization" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="office-config">Office Config</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="resignations">Resignations</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="designations">Designations</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>

        <TabsContent value="office-config">
          <AttendanceSettingsPage />
        </TabsContent>
        <TabsContent value="organization">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="w-5 h-5" />
                  Organization Settings
                </CardTitle>
                <CardDescription>Manage your organization information</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setIsCredentialsDialogOpen(true)}>
                  <Pencil className="w-4 h-4 mr-2" /> Change Admin Credentials
                </Button>
                <Button onClick={() => setIsOrgDialogOpen(true)}>
                  <Pencil className="w-4 h-4 mr-2" /> Edit
                </Button>
              </div>
            </CardHeader>
<CardContent className="space-y-4">
              {organization && (
                <div className="grid grid-cols-2 gap-4">
                  {organization.logoUrl && (
                    <div className="col-span-2 mb-4">
                      <Label className="text-sm font-medium">Logo</Label>
                      <div className="mt-2">
                        <img 
                          src={organization.logoUrl} 
                          alt={organization.name + " Logo"} 
                          className="h-20 w-auto object-contain border rounded-md p-2"
                        />
                      </div>
                    </div>
                  )}
                  <div>
                    <Label className="text-sm font-medium">Organization Name</Label>
                    <p className="text-sm text-muted-foreground">{organization.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-muted-foreground">{organization.email || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">HR Mail</Label>
                    <p className="text-sm text-muted-foreground">{organization.hrMail || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm text-muted-foreground">{organization.phone || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Address</Label>
                    <p className="text-sm text-muted-foreground">{organization.address || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Home Header Color</Label>
                    <p className="text-sm text-muted-foreground">
                      {organization.homeHeaderBackgroundColor || DEFAULT_HOME_HEADER_COLOR}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Home Header Media</Label>
                    <p className="text-sm text-muted-foreground">
                      {organization.homeHeaderMediaUrl || "Not set"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Media Active From</Label>
                    <p className="text-sm text-muted-foreground">
                      {organization.homeHeaderMediaStartDate || "Not set"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Media Active Till</Label>
                    <p className="text-sm text-muted-foreground">
                      {organization.homeHeaderMediaEndDate || "Not set"}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Notice Period</Label>
                    <p className="text-sm text-muted-foreground">
                      {organization.resignationNoticePeriodDays || 30} days
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Early Relieving by Admin</Label>
                    <p className="text-sm text-muted-foreground">
                      {organization.allowEarlyRelievingByAdmin ? "Allowed" : "Not allowed"}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium">Resignation Policy</Label>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">
                      {organization.resignationPolicy || "Not set"}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="resignations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5" />
                  Resignation Requests
                </CardTitle>
                <CardDescription>
                  Review resignation messages, approve/reject, and set early relieving.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Status</Label>
                <select
                  className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={resignationStatusFilter}
                  onChange={(e) =>
                    setResignationStatusFilter(
                      e.target.value as "ALL" | "PENDING" | "APPROVED" | "REJECTED",
                    )
                  }
                >
                  <option value="ALL">All</option>
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sl#</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Requested LWD</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {resignationRequests.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground">
                        No resignation requests found.
                      </TableCell>
                    </TableRow>
                  )}
                  {resignationRequests.map((req, index) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{getEmployeeName(req)}</div>
                        <div className="text-xs text-muted-foreground">{req.employee?.workEmail || "—"}</div>
                      </TableCell>
                      <TableCell className="max-w-[360px]">
                        <p className="line-clamp-2 text-sm text-muted-foreground whitespace-pre-line">{req.message}</p>
                      </TableCell>
                      <TableCell>{req.proposedLastWorkingDay || "—"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${getResignationStatusClass(req.status)}`}>
                          {req.status === "PENDING" && <Clock3 className="h-3 w-3" />}
                          {req.status === "APPROVED" && <CheckCircle2 className="h-3 w-3" />}
                          {req.status === "REJECTED" && <XCircle className="h-3 w-3" />}
                          {req.status}
                        </span>
                      </TableCell>
                      <TableCell>{new Date(req.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {req.status === "PENDING" ? (
                          <div className="inline-flex items-center gap-2">
                            <Button variant="outline" size="sm" onClick={() => openResignationReviewDialog(req, "APPROVED")}>
                              Approve
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => openResignationReviewDialog(req, "REJECTED")}>
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {req.status === "APPROVED" ? "Reviewed & Approved" : "Reviewed & Rejected"}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="departments">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Departments</CardTitle>
              <Button onClick={() => { setEditingDept(null); setDeptForm({ name: "", code: "" }); setIsDeptDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Department
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sl#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept, index) => (
                    <TableRow key={dept.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{dept.name}</TableCell>
                      <TableCell>{dept.code}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingDept(dept); setDeptForm({ name: dept.name, code: dept.code }); setIsDeptDialogOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteDepartment(dept.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="designations">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Designations</CardTitle>
              <Button onClick={() => { setEditingDesig(null); setDesigForm({ name: "", code: "" }); setIsDesigDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Designation
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sl#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {designations.map((desig, index) => (
                    <TableRow key={desig.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{desig.name}</TableCell>
                      <TableCell>{desig.code}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingDesig(desig); setDesigForm({ name: desig.name, code: desig.code }); setIsDesigDialogOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteDesignation(desig.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Holidays
                </CardTitle>
                <CardDescription>Manage organization holidays</CardDescription>
              </div>
              <Button onClick={() => { setEditingHoliday(null); setHolidayForm({ name: "", date: "", description: "", isOptional: false }); setIsHolidayDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Holiday
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sl#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Optional</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((holiday, index) => (
                    <TableRow key={holiday.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{holiday.name}</TableCell>
                      <TableCell>{holiday.date?.toString().slice(0, 10)}</TableCell>
                      <TableCell>{holiday.isOptional ? "Yes" : "No"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingHoliday(holiday); setHolidayForm({ name: holiday.name, date: holiday.date?.toString().slice(0, 10), description: holiday.description || "", isOptional: holiday.isOptional }); setIsHolidayDialogOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteHoliday(holiday.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Roles & Permissions
                </CardTitle>
                <CardDescription>View system roles</CardDescription>
              </div>
              <Button onClick={() => { setEditingRole(null); setRoleForm({ roleName: "", description: "" }); setIsRoleDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Role
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sl#</TableHead>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role, index) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell className="font-medium">{role.roleName}</TableCell>
                      <TableCell>{role.description || "No description"}</TableCell>
                      <TableCell>{role.type || "CUSTOM"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingRole(role); setRoleForm({ roleName: role.roleName, description: role.description || "" }); setIsRoleDialogOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteRole(role)} disabled={role.type === "DEFAULT"}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDeptDialogOpen} onOpenChange={setIsDeptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDept ? "Edit" : "Add"} Department</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={deptForm.name} onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Code</Label>
              <Input value={deptForm.code} onChange={(e) => setDeptForm({ ...deptForm, code: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeptDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDepartment}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDesigDialogOpen} onOpenChange={setIsDesigDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingDesig ? "Edit" : "Add"} Designation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input value={desigForm.name} onChange={(e) => setDesigForm({ ...desigForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Code</Label>
              <Input value={desigForm.code} onChange={(e) => setDesigForm({ ...desigForm, code: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDesigDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveDesignation}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

<Dialog open={isOrgDialogOpen} onOpenChange={(open) => { setIsOrgDialogOpen(open); if (!open) setOrgErrors({}); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
            <div>
              <Label>Organization Name <span className="text-destructive">*</span></Label>
              <Input
                value={orgForm.name}
                onChange={(e) => { setOrgForm({ ...orgForm, name: e.target.value }); setOrgErrors((p) => ({ ...p, name: "" })); }}
                className={orgErrors.name ? "border-destructive" : ""}
              />
              {orgErrors.name && <p className="text-xs text-destructive mt-1">{orgErrors.name}</p>}
            </div>
            <div>
              <Label>Email <span className="text-destructive">*</span></Label>
              <Input
                type="email"
                value={orgForm.email}
                onChange={(e) => { setOrgForm({ ...orgForm, email: e.target.value }); setOrgErrors((p) => ({ ...p, email: "" })); }}
                placeholder="admin@company.com"
                className={orgErrors.email ? "border-destructive" : ""}
              />
              {orgErrors.email && <p className="text-xs text-destructive mt-1">{orgErrors.email}</p>}
            </div>
            <div>
              <Label className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                HR Mail
              </Label>
              <Input
                type="email"
                value={orgForm.hrMail}
                onChange={(e) => { setOrgForm({ ...orgForm, hrMail: e.target.value }); setOrgErrors((p) => ({ ...p, hrMail: "" })); }}
                placeholder="hr@company.com"
                className={orgErrors.hrMail ? "border-destructive" : ""}
              />
              {orgErrors.hrMail && <p className="text-xs text-destructive mt-1">{orgErrors.hrMail}</p>}
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={orgForm.phone}
                onChange={(e) => { setOrgForm({ ...orgForm, phone: e.target.value }); setOrgErrors((p) => ({ ...p, phone: "" })); }}
                placeholder="+91 98765 43210"
                className={orgErrors.phone ? "border-destructive" : ""}
              />
              {orgErrors.phone && <p className="text-xs text-destructive mt-1">{orgErrors.phone}</p>}
            </div>
            <div>
              <Label>Logo URL</Label>
              <Input
                value={orgForm.logoUrl}
                onChange={(e) => { setOrgForm({ ...orgForm, logoUrl: e.target.value }); setOrgErrors((p) => ({ ...p, logoUrl: "" })); }}
                placeholder="https://example.com/logo.png"
                className={orgErrors.logoUrl ? "border-destructive" : ""}
              />
              {orgErrors.logoUrl && <p className="text-xs text-destructive mt-1">{orgErrors.logoUrl}</p>}
            </div>
            <div>
              <Label>Home Header Color</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="color"
                  value={orgForm.homeHeaderBackgroundColor || DEFAULT_HOME_HEADER_COLOR}
                  onChange={(e) => { setOrgForm({ ...orgForm, homeHeaderBackgroundColor: e.target.value }); setOrgErrors((p) => ({ ...p, homeHeaderBackgroundColor: "" })); }}
                  className="h-10 w-16 p-1"
                />
                <Input
                  value={orgForm.homeHeaderBackgroundColor}
                  onChange={(e) => { setOrgForm({ ...orgForm, homeHeaderBackgroundColor: e.target.value }); setOrgErrors((p) => ({ ...p, homeHeaderBackgroundColor: "" })); }}
                  placeholder="#026D94"
                  className={orgErrors.homeHeaderBackgroundColor ? "border-destructive" : ""}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setOrgForm({
                      ...orgForm,
                      homeHeaderBackgroundColor: DEFAULT_HOME_HEADER_COLOR,
                    })
                  }
                >
                  Reset
                </Button>
              </div>
              {orgErrors.homeHeaderBackgroundColor && <p className="text-xs text-destructive mt-1">{orgErrors.homeHeaderBackgroundColor}</p>}
              <p className="text-xs text-muted-foreground mt-1">
                Default app header color: {DEFAULT_HOME_HEADER_COLOR}
              </p>
            </div>
            <div>
              <Label>Home Header Image/GIF URL</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={orgForm.homeHeaderMediaUrl}
                  onChange={(e) => { setOrgForm({ ...orgForm, homeHeaderMediaUrl: e.target.value }); setOrgErrors((p) => ({ ...p, homeHeaderMediaUrl: "", homeHeaderMediaEndDate: "" })); }}
                  placeholder="https://example.com/christmas-banner.gif"
                  className={orgErrors.homeHeaderMediaUrl ? "border-destructive" : ""}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setOrgForm({
                      ...orgForm,
                      homeHeaderMediaUrl: "",
                      homeHeaderMediaStartDate: "",
                      homeHeaderMediaEndDate: "",
                    })
                  }
                >
                  Delete
                </Button>
              </div>
              {orgErrors.homeHeaderMediaUrl && <p className="text-xs text-destructive mt-1">{orgErrors.homeHeaderMediaUrl}</p>}
              {orgForm.homeHeaderMediaUrl ? (
                <p className="text-xs text-muted-foreground mt-1">
                  Delete will remove the media and clear the active date range.
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Header Media Start Date</Label>
                <Input
                  type="date"
                  value={orgForm.homeHeaderMediaStartDate}
                  onChange={(e) => { setOrgForm({ ...orgForm, homeHeaderMediaStartDate: e.target.value }); setOrgErrors((p) => ({ ...p, homeHeaderMediaEndDate: "" })); }}
                />
              </div>
              <div>
                <Label>Header Media End Date</Label>
                <Input
                  type="date"
                  value={orgForm.homeHeaderMediaEndDate}
                  onChange={(e) => { setOrgForm({ ...orgForm, homeHeaderMediaEndDate: e.target.value }); setOrgErrors((p) => ({ ...p, homeHeaderMediaEndDate: "" })); }}
                  className={orgErrors.homeHeaderMediaEndDate ? "border-destructive" : ""}
                />
                {orgErrors.homeHeaderMediaEndDate && <p className="text-xs text-destructive mt-1">{orgErrors.homeHeaderMediaEndDate}</p>}
              </div>
            </div>
            <div>
              <Label>Address</Label>
              <Textarea
                value={orgForm.address}
                onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })}
                placeholder="123 Main St, City, Country"
              />
            </div>
            <div>
              <Label>Resignation Notice Period (days)</Label>
              <Input
                type="number"
                min={0}
                value={orgForm.resignationNoticePeriodDays}
                onChange={(e) => { setOrgForm({ ...orgForm, resignationNoticePeriodDays: Number(e.target.value || 0) }); setOrgErrors((p) => ({ ...p, resignationNoticePeriodDays: "" })); }}
                className={orgErrors.resignationNoticePeriodDays ? "border-destructive" : ""}
              />
              {orgErrors.resignationNoticePeriodDays && <p className="text-xs text-destructive mt-1">{orgErrors.resignationNoticePeriodDays}</p>}
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label>Allow Early Relieving by Admin</Label>
                <p className="text-xs text-muted-foreground">
                  Admin/HR can approve an employee to leave before notice completion.
                </p>
              </div>
              <Switch
                checked={orgForm.allowEarlyRelievingByAdmin}
                onCheckedChange={(v) => setOrgForm({ ...orgForm, allowEarlyRelievingByAdmin: v })}
              />
            </div>
            <div>
              <Label>Resignation Policy</Label>
              <Textarea
                rows={4}
                value={orgForm.resignationPolicy}
                onChange={(e) => setOrgForm({ ...orgForm, resignationPolicy: e.target.value })}
                placeholder="Example: Employees must serve 30 days notice, complete handover, and return company assets."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsOrgDialogOpen(false); setOrgErrors({}); }}>Cancel</Button>
            <Button onClick={handleSaveOrganization}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isHolidayDialogOpen} onOpenChange={setIsHolidayDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingHoliday ? "Edit" : "Add"} Holiday</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={holidayForm.name} onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Date *</Label>
              <Input type="date" value={holidayForm.date} onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={holidayForm.description} onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Optional</Label>
              <Switch checked={holidayForm.isOptional} onCheckedChange={(v) => setHolidayForm({ ...holidayForm, isOptional: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHolidayDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveHoliday}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? "Edit" : "Add"} Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Role Name *</Label>
              <Input value={roleForm.roleName} onChange={(e) => setRoleForm({ ...roleForm, roleName: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={roleForm.description} onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRoleDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveRole}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isResignationReviewDialogOpen} onOpenChange={setIsResignationReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {resignationReviewForm.status === "APPROVED" ? "Approve" : "Reject"} Resignation
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <select
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={resignationReviewForm.status}
                onChange={(e) =>
                  setResignationReviewForm({
                    ...resignationReviewForm,
                    status: e.target.value as "APPROVED" | "REJECTED",
                  })
                }
              >
                <option value="APPROVED">APPROVED</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
            {resignationReviewForm.status === "APPROVED" && (
              <>
                <div>
                  <Label>Approved Last Working Day</Label>
                  <Input
                    type="date"
                    value={resignationReviewForm.approvedLastWorkingDay}
                    onChange={(e) =>
                      setResignationReviewForm({
                        ...resignationReviewForm,
                        approvedLastWorkingDay: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label>Allow Early Relieving</Label>
                    <p className="text-xs text-muted-foreground">
                      Approve employee exit earlier than standard notice period.
                      {!organization?.allowEarlyRelievingByAdmin
                        ? " Enable this in Organization settings first."
                        : ""}
                    </p>
                  </div>
                  <Switch
                    checked={resignationReviewForm.allowEarlyRelieving}
                    disabled={!organization?.allowEarlyRelievingByAdmin}
                    onCheckedChange={(v) =>
                      setResignationReviewForm({
                        ...resignationReviewForm,
                        allowEarlyRelieving: v,
                      })
                    }
                  />
                </div>
              </>
            )}
            <div>
              <Label>HR Remarks</Label>
              <Textarea
                rows={4}
                value={resignationReviewForm.hrRemarks}
                onChange={(e) =>
                  setResignationReviewForm({
                    ...resignationReviewForm,
                    hrRemarks: e.target.value,
                  })
                }
                placeholder="Add decision remarks for employee and records."
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsResignationReviewDialogOpen(false);
                setReviewingResignation(null);
              }}
            >
              Cancel
            </Button>
            <Button
              variant={resignationReviewForm.status === "APPROVED" ? "default" : "destructive"}
              onClick={handleSubmitResignationReview}
            >
              Submit Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Admin Credentials Dialog */}
      <Dialog open={isCredentialsDialogOpen} onOpenChange={setIsCredentialsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Admin Credentials</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>New Username</Label>
              <Input
                placeholder="Leave blank to keep current"
                value={credentialsForm.newUserName}
                onChange={(e) => setCredentialsForm({ ...credentialsForm, newUserName: e.target.value })}
              />
            </div>
            <div>
              <Label>New Password</Label>
              <div className="relative">
                <Input
                  type={showCredPassword ? "text" : "password"}
                  placeholder="Leave blank to keep current"
                  value={credentialsForm.newPassword}
                  onChange={(e) => setCredentialsForm({ ...credentialsForm, newPassword: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCredPassword((v) => !v)}
                >
                  {showCredPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Confirm Password</Label>
              <div className="relative">
                <Input
                  type={showCredConfirmPassword ? "text" : "password"}
                  placeholder="Repeat new password"
                  value={credentialsForm.confirmPassword}
                  onChange={(e) => setCredentialsForm({ ...credentialsForm, confirmPassword: e.target.value })}
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCredConfirmPassword((v) => !v)}
                >
                  {showCredConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCredentialsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleChangeCredentials}>Save Credentials</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Organization Confirmation Dialog */}
      <Dialog open={isDeleteOrgDialogOpen} onOpenChange={setIsDeleteOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will permanently delete the organization and all its data. This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteOrgDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteOrganization}>Yes, Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
