"use client";

import { useEffect, useState } from "react";
import { getSuperadminOrganizations, createOrganization, updateOrganization, deleteOrganization, blockOrganization, unblockOrganization } from "@/app/api/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Building,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
  MoreVertical,
  Activity,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";

type OrganizationItem = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdOn: string;
  userCount: number;
  subscription: {
    planName: string | null;
    planType: string | null;
    status: string | null;
    endDate: string | null;
  } | null;
};

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockingOrgId, setBlockingOrgId] = useState<string | null>(null);

  // Form states
  const [selectedOrg, setSelectedOrg] = useState<OrganizationItem | null>(null);
  const [formData, setFormData] = useState({
    organizationName: "",
    email: "",
    hrMail: "",
    phone: "",
    address: "",
    isActive: true,
  });

  const fetchOrganizations = async () => {
    try {
      const res = await getSuperadminOrganizations();
      setOrganizations(res.data);
    } catch (err) {
      toast.error("Failed to load organizations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organizationName) {
      toast.warning("Organization name is required.");
      return;
    }
    try {
      await createOrganization(formData);
      toast.success("Organization created successfully.");
      setCreateDialogOpen(false);
      setFormData({
        organizationName: "",
        email: "",
        hrMail: "",
        phone: "",
        address: "",
        isActive: true,
      });
      fetchOrganizations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create organization.");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrg) return;
    try {
      await updateOrganization(selectedOrg.id, {
        organizationName: formData.organizationName,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
      });
      toast.success("Organization updated successfully.");
      setEditDialogOpen(false);
      fetchOrganizations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update organization.");
    }
  };

  const handleDelete = async () => {
    if (!selectedOrg) return;
    try {
      await deleteOrganization(selectedOrg.id);
      toast.success("Organization deleted successfully.");
      setDeleteDialogOpen(false);
      fetchOrganizations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete organization.");
    }
  };

  const requestToggleStatus = (org: OrganizationItem) => {
    if (org.isActive) {
      // Blocking locks out an entire company — confirm first.
      setBlockingOrgId(org.id);
      setBlockDialogOpen(true);
      return;
    }
    unblockOrg(org.id);
  };

  const unblockOrg = async (orgId: string) => {
    try {
      await unblockOrganization(orgId);
      toast.success("Organization unblocked successfully.");
      fetchOrganizations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to unblock organization.");
    }
  };

  const confirmBlockOrg = async () => {
    if (!blockingOrgId) return;
    try {
      await blockOrganization(blockingOrgId);
      toast.success("Organization blocked successfully.");
      setBlockDialogOpen(false);
      setBlockingOrgId(null);
      fetchOrganizations();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to block organization.");
    }
  };

  const openEditDialog = (org: OrganizationItem) => {
    setSelectedOrg(org);
    setFormData({
      organizationName: org.name,
      email: org.email || "",
      hrMail: "", // not in summary
      phone: org.phone || "",
      address: org.address || "",
      isActive: org.isActive,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (org: OrganizationItem) => {
    setSelectedOrg(org);
    setDeleteDialogOpen(true);
  };

  const filteredOrgs = organizations.filter(
    (org) =>
      org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.email && org.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Customers & Tenants
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage corporate accounts, database profiles, and system access.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Corporate Tenant
        </Button>
      </div>

      {/* Filter and Table Card */}
      <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader className="pb-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Registered Tenants</CardTitle>
            <CardDescription>Full inventory of all companies hosted on the HRMS cluster.</CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : filteredOrgs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization Name</TableHead>
                    <TableHead>Contact Email / Phone</TableHead>
                    <TableHead>Joined Date</TableHead>
                    <TableHead>Active Plan</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.map((org) => (
                    <TableRow key={org.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/40">
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-950/40 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold shrink-0">
                            {org.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm block">{org.name}</span>
                            <span className="text-xs text-muted-foreground font-normal truncate max-w-[200px] block">{org.address || "No address listed"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span>{org.email || "N/A"}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            <span>{org.phone || "N/A"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(org.createdOn).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        {org.subscription ? (
                          <div>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                              {org.subscription.planName}
                            </span>
                            <span className="text-xs block text-slate-500">
                              Expires {org.subscription.endDate ? new Date(org.subscription.endDate).toLocaleDateString() : "N/A"}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">No Active Plan</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium text-sm">
                        {org.userCount}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={org.isActive}
                            onCheckedChange={() => requestToggleStatus(org)}
                          />
                          <span className={`text-xs font-medium ${org.isActive ? "text-emerald-600" : "text-red-500"}`}>
                            {org.isActive ? "Active" : "Suspended"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(org)}>
                            <Edit2 className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(org)}>
                            <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building className="h-12 w-12 text-muted-foreground/60 mb-3" />
              <h3 className="font-semibold text-lg">No tenants found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                There are no organizations matching "{searchQuery}" registered on the system.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Register Corporate Tenant</DialogTitle>
            <DialogDescription>
              Create a new client organization profile. System will auto-create administrative credentials.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="organizationName">Organization Name *</Label>
              <Input
                id="organizationName"
                placeholder="e.g. Acme Corp Inc."
                value={formData.organizationName}
                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Primary Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="contact@acme.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="hrMail">HR Email</Label>
                <Input
                  id="hrMail"
                  type="email"
                  placeholder="hr@acme.com"
                  value={formData.hrMail}
                  onChange={(e) => setFormData({ ...formData, hrMail: e.target.value })}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                placeholder="+91 XXXXX XXXXX"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                placeholder="HQ office location details"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Tenant</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Organization Profile</DialogTitle>
            <DialogDescription>
              Modify company profile metadata for {selectedOrg?.name}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Organization Name *</Label>
              <Input
                id="edit-name"
                value={formData.organizationName}
                onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-email">Contact Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-phone">Phone Number</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-address">Address</Label>
              <Input
                id="edit-address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Changes</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Delete Tenant Account
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you absolutely sure you want to delete <strong>{selectedOrg?.name}</strong>?
              This action will permanently delete the organization record and its configuration settings.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete}>
              Confirm Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* BLOCK CONFIRMATION DIALOG */}
      <Dialog open={blockDialogOpen} onOpenChange={(open) => { setBlockDialogOpen(open); if (!open) setBlockingOrgId(null); }}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Block Organization
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you sure you want to block{" "}
              <strong>{organizations.find((o) => o.id === blockingOrgId)?.name}</strong>?
              All of its users will be immediately signed out and unable to log back in until you unblock it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={confirmBlockOrg}>
              Confirm Block
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
