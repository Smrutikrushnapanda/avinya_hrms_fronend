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
import { Plus, Pencil, Trash2, Building2, Calendar, Umbrella, Users } from "lucide-react";
import { getDepartments, getDesignations, createDepartment, createDesignation, updateDepartment, updateDesignation, deleteDepartment, deleteDesignation, getProfile, getHolidays, createHoliday, updateHoliday, deleteHoliday, getLeaveTypes, createLeaveType, updateLeaveType, deleteLeaveType, createRole, updateRole, deleteRole, getOrgRoles, getOrganization, updateOrganization } from "@/app/api/api";
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

interface LeaveType {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
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
  phone?: string;
  address?: string;
}

const EMPLOYMENT_TYPES = ["Full-time", "Part-time", "Contract", "Intern", "Consultant"];

export default function SettingsPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [organizationId, setOrganizationId] = useState<string>("");
  
  const [isDeptDialogOpen, setIsDeptDialogOpen] = useState(false);
  const [isDesigDialogOpen, setIsDesigDialogOpen] = useState(false);
  const [isHolidayDialogOpen, setIsHolidayDialogOpen] = useState(false);
  const [isLeaveTypeDialogOpen, setIsLeaveTypeDialogOpen] = useState(false);
  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
  
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [editingDesig, setEditingDesig] = useState<Designation | null>(null);
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [editingLeaveType, setEditingLeaveType] = useState<LeaveType | null>(null);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  
  const [deptForm, setDeptForm] = useState({ name: "", code: "" });
  const [desigForm, setDesigForm] = useState({ name: "", code: "" });
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "", description: "", isOptional: false });
  const [leaveTypeForm, setLeaveTypeForm] = useState({ name: "", description: "", isActive: true });
  const [orgForm, setOrgForm] = useState({ name: "", email: "", phone: "", address: "" });
  const [roleForm, setRoleForm] = useState({ roleName: "", description: "" });

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
      loadLeaveTypes();
      loadRoles();
      loadOrganization();
    }
  }, [organizationId]);

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

  const loadLeaveTypes = async () => {
    try {
      const res = await getLeaveTypes(organizationId);
      setLeaveTypes(res.data || []);
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
        phone: res.data.phone || "",
        address: res.data.address || ""
      });
    } catch (error) {
      console.error(error);
    }
  };

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

  const handleSaveOrganization = async () => {
    if (!orgForm.name.trim()) {
      toast.error("Organization name is required");
      return;
    }
    try {
      await updateOrganization(organizationId, orgForm);
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

  const handleSaveLeaveType = async () => {
    if (!leaveTypeForm.name.trim()) {
      toast.error("Leave type name is required");
      return;
    }
    try {
      if (editingLeaveType) {
        await updateLeaveType(editingLeaveType.id, { ...leaveTypeForm });
        toast.success("Leave type updated");
      } else {
        await createLeaveType({ ...leaveTypeForm, organizationId });
        toast.success("Leave type created");
      }
      setIsLeaveTypeDialogOpen(false);
      setLeaveTypeForm({ name: "", description: "", isActive: true });
      setEditingLeaveType(null);
      loadLeaveTypes();
    } catch (error) {
      toast.error("Failed to save leave type");
    }
  };

  const handleDeleteLeaveType = async (id: string) => {
    if (!confirm("Are you sure you want to delete this leave type?")) return;
    try {
      await deleteLeaveType(id);
      toast.success("Leave type deleted");
      loadLeaveTypes();
    } catch (error) {
      toast.error("Failed to delete leave type");
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

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Settings</h1>
      
      <Tabs defaultValue="organization" className="w-full">
        <TabsList className="grid w-full grid-cols-7">
          <TabsTrigger value="office-config">Office Config</TabsTrigger>
          <TabsTrigger value="organization">Organization</TabsTrigger>
          <TabsTrigger value="departments">Departments</TabsTrigger>
          <TabsTrigger value="designations">Designations</TabsTrigger>
          <TabsTrigger value="holidays">Holidays</TabsTrigger>
          <TabsTrigger value="leaves">Leave Types</TabsTrigger>
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
              <Button onClick={() => setIsOrgDialogOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" /> Edit
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {organization && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium">Organization Name</Label>
                    <p className="text-sm text-muted-foreground">{organization.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-muted-foreground">{organization.email || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Phone</Label>
                    <p className="text-sm text-muted-foreground">{organization.phone || "Not set"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Address</Label>
                    <p className="text-sm text-muted-foreground">{organization.address || "Not set"}</p>
                  </div>
                </div>
              )}
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
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departments.map((dept) => (
                    <TableRow key={dept.id}>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {designations.map((desig) => (
                    <TableRow key={desig.id}>
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
                    <TableHead>Name</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Optional</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((holiday) => (
                    <TableRow key={holiday.id}>
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

        <TabsContent value="leaves">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Umbrella className="w-5 h-5" />
                  Leave Types
                </CardTitle>
                <CardDescription>Manage leave types and policies</CardDescription>
              </div>
              <Button onClick={() => { setEditingLeaveType(null); setLeaveTypeForm({ name: "", description: "", isActive: true }); setIsLeaveTypeDialogOpen(true); }}>
                <Plus className="w-4 h-4 mr-2" /> Add Leave Type
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaveTypes.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell>{leave.name}</TableCell>
                      <TableCell>{leave.description || "-"}</TableCell>
                      <TableCell>{leave.isActive ? "Active" : "Inactive"}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => { setEditingLeaveType(leave); setLeaveTypeForm({ name: leave.name, description: leave.description || "", isActive: leave.isActive }); setIsLeaveTypeDialogOpen(true); }}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeleteLeaveType(leave.id)}>
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
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
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

      <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Organization</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Organization Name *</Label>
              <Input value={orgForm.name} onChange={(e) => setOrgForm({ ...orgForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={orgForm.email} onChange={(e) => setOrgForm({ ...orgForm, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={orgForm.phone} onChange={(e) => setOrgForm({ ...orgForm, phone: e.target.value })} />
            </div>
            <div>
              <Label>Address</Label>
              <Textarea value={orgForm.address} onChange={(e) => setOrgForm({ ...orgForm, address: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOrgDialogOpen(false)}>Cancel</Button>
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

      <Dialog open={isLeaveTypeDialogOpen} onOpenChange={setIsLeaveTypeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLeaveType ? "Edit" : "Add"} Leave Type</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input value={leaveTypeForm.name} onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, name: e.target.value })} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={leaveTypeForm.description} onChange={(e) => setLeaveTypeForm({ ...leaveTypeForm, description: e.target.value })} />
            </div>
            <div className="flex items-center justify-between">
              <Label>Active</Label>
              <Switch checked={leaveTypeForm.isActive} onCheckedChange={(v) => setLeaveTypeForm({ ...leaveTypeForm, isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsLeaveTypeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveLeaveType}>Save</Button>
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
    </div>
  );
}
