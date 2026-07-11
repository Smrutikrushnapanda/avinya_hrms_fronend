"use client";

import { useEffect, useState } from "react";
import { getPricingPlans, createPricingPlan, updatePricingPlan, deletePricingPlan } from "@/app/api/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Edit2,
  Trash2,
  DollarSign,
  Briefcase,
  AlertTriangle,
  Info,
  CheckCircle2,
  HelpCircle,
  HelpCircleIcon
} from "lucide-react";
import { toast } from "sonner";

type PricingPlan = {
  id: string;
  planType: string;
  name: string;
  description: string;
  price: number;
  displayPrice: string;
  features: Array<{ name: string; available: boolean; value?: string | number }>;
  isActive: boolean;
  supportLevel: string;
  customizable: boolean;
};

export default function PricingPlansPage() {
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Selected plan and form data
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [formData, setFormData] = useState({
    planType: "BASIC",
    name: "",
    description: "",
    price: 0,
    displayPrice: "",
    supportLevel: "STANDARD",
    customizable: false,
    isActive: true,
  });

  const fetchPlans = async () => {
    try {
      const res = await getPricingPlans();
      setPlans(res.data);
    } catch (err) {
      toast.error("Failed to load pricing plans.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.warning("Plan name is required.");
      return;
    }
    try {
      // Default features list for new plans
      const defaultFeatures = [
        { name: "Attendance", available: true },
        { name: "Leave Management", available: true },
        { name: "WFH Gating", available: true },
        { name: "Timesheet", available: formData.planType !== "BASIC" },
        { name: "Payroll Integration", available: formData.planType === "ENTERPRISE" },
        { name: "Biometric Integration", available: formData.planType === "ENTERPRISE" },
      ];

      await createPricingPlan({
        ...formData,
        price: Number(formData.price),
        features: defaultFeatures,
      });

      toast.success("Pricing plan created successfully.");
      setCreateDialogOpen(false);
      resetForm();
      fetchPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create pricing plan.");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlan) return;
    try {
      await updatePricingPlan(selectedPlan.id, {
        name: formData.name,
        description: formData.description,
        price: Number(formData.price),
        displayPrice: formData.displayPrice,
        supportLevel: formData.supportLevel,
        customizable: formData.customizable,
        isActive: formData.isActive,
      });
      toast.success("Pricing plan updated successfully.");
      setEditDialogOpen(false);
      resetForm();
      fetchPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update pricing plan.");
    }
  };

  const handleDelete = async () => {
    if (!selectedPlan) return;
    try {
      await deletePricingPlan(selectedPlan.id);
      toast.success("Pricing plan deleted successfully.");
      setDeleteDialogOpen(false);
      fetchPlans();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to delete pricing plan. Plan may have active subscriptions.");
    }
  };

  const openEditDialog = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setFormData({
      planType: plan.planType,
      name: plan.name,
      description: plan.description || "",
      price: plan.price,
      displayPrice: plan.displayPrice || "",
      supportLevel: plan.supportLevel || "STANDARD",
      customizable: plan.customizable,
      isActive: plan.isActive,
    });
    setEditDialogOpen(true);
  };

  const openDeleteDialog = (plan: PricingPlan) => {
    setSelectedPlan(plan);
    setDeleteDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      planType: "BASIC",
      name: "",
      description: "",
      price: 0,
      displayPrice: "",
      supportLevel: "STANDARD",
      customizable: false,
      isActive: true,
    });
    setSelectedPlan(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Pricing Plans & Packages
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure default and customizable subscription models for organizations.
          </p>
        </div>
        <Button onClick={() => { resetForm(); setCreateDialogOpen(true); }} className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-90">
          <Plus className="h-4 w-4" /> Create Pricing Plan
        </Button>
      </div>

      {/* Grid of Plans */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id} className={`border relative shadow-sm flex flex-col justify-between ${plan.isActive ? "border-slate-200 dark:border-slate-800" : "border-red-200 dark:border-red-950 bg-red-50/10"}`}>
              {!plan.isActive && (
                <span className="absolute top-3 right-3 text-red-500 text-[10px] font-semibold tracking-wider uppercase bg-red-100 dark:bg-red-950 px-2 py-0.5 rounded-full">
                  Inactive
                </span>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest bg-blue-50 dark:bg-blue-950/30 px-2 py-1 rounded">
                    {plan.planType}
                  </span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(plan)}>
                      <Edit2 className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => openDeleteDialog(plan)}>
                      <Trash2 className="h-4 w-4 text-slate-500 hover:text-red-600" />
                    </Button>
                  </div>
                </div>
                <CardTitle className="text-xl mt-3">{plan.name}</CardTitle>
                <CardDescription className="line-clamp-2 h-10 mt-1">{plan.description || "No description provided."}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-t border-b border-gray-100 dark:border-gray-800 py-3 flex items-baseline justify-center gap-1 bg-gray-50/30 dark:bg-gray-900/10 rounded-lg">
                  <span className="text-3xl font-extrabold tracking-tight">
                    {plan.displayPrice || `₹${plan.price}/mo`}
                  </span>
                </div>

                <div>
                  <h5 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Features Included</h5>
                  <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                    {plan.features?.map((f, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${f.available ? "text-emerald-500" : "text-gray-300 dark:text-gray-700"}`} />
                        <span className={f.available ? "" : "line-through text-muted-foreground/60"}>
                          {f.name} {f.value ? `(${f.value})` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 rounded-b-xl flex items-center justify-between text-xs text-muted-foreground">
                <span>Support: <strong>{plan.supportLevel}</strong></span>
                <span>Customizations: <strong>{plan.customizable ? "Allowed" : "No"}</strong></span>
              </div>
            </Card>
          ))}
          {plans.length === 0 && (
            <div className="col-span-3 text-center py-12 border border-dashed rounded-xl">
              <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <h3 className="font-semibold text-lg">No Plans Available</h3>
              <p className="text-sm text-muted-foreground">Create your first pricing plan to start onboarding customers.</p>
            </div>
          )}
        </div>
      )}

      {/* CREATE DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Create Pricing Plan</DialogTitle>
            <DialogDescription>Add a new subscription level for customer organizations.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="planType">Plan Level *</Label>
                <Select value={formData.planType} onValueChange={(val) => setFormData({ ...formData, planType: val })}>
                  <SelectTrigger id="planType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASIC">Basic</SelectItem>
                    <SelectItem value="PRO">Pro</SelectItem>
                    <SelectItem value="ENTERPRISE">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="name">Plan Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g. Starter Suite"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief summary of target demographic and plan boundaries..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="price">Base Price (INR) *</Label>
                <Input
                  id="price"
                  type="number"
                  placeholder="2999"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="displayPrice">Display Text</Label>
                <Input
                  id="displayPrice"
                  placeholder="e.g. ₹2,999/month"
                  value={formData.displayPrice}
                  onChange={(e) => setFormData({ ...formData, displayPrice: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="supportLevel">Support SLA</Label>
                <Select value={formData.supportLevel} onValueChange={(val) => setFormData({ ...formData, supportLevel: val })}>
                  <SelectTrigger id="supportLevel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard Email</SelectItem>
                    <SelectItem value="PRIORITY">Priority 24/7</SelectItem>
                    <SelectItem value="DEDICATED">Dedicated Account Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3 mt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="customizable">Customizable</Label>
                  <p className="text-xs text-muted-foreground">Allows addon features</p>
                </div>
                <Switch
                  id="customizable"
                  checked={formData.customizable}
                  onCheckedChange={(checked) => setFormData({ ...formData, customizable: checked })}
                />
              </div>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create Plan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Pricing Plan</DialogTitle>
            <DialogDescription>Modify settings for {selectedPlan?.name}.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Plan Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-price">Base Price (INR) *</Label>
                <Input
                  id="edit-price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-displayPrice">Display Text</Label>
                <Input
                  id="edit-displayPrice"
                  value={formData.displayPrice}
                  onChange={(e) => setFormData({ ...formData, displayPrice: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-supportLevel">Support SLA</Label>
                <Select value={formData.supportLevel} onValueChange={(val) => setFormData({ ...formData, supportLevel: val })}>
                  <SelectTrigger id="edit-supportLevel">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="STANDARD">Standard Email</SelectItem>
                    <SelectItem value="PRIORITY">Priority 24/7</SelectItem>
                    <SelectItem value="DEDICATED">Dedicated Account Manager</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between border rounded-lg p-3 mt-4">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-customizable">Customizable</Label>
                </div>
                <Switch
                  id="edit-customizable"
                  checked={formData.customizable}
                  onCheckedChange={(checked) => setFormData({ ...formData, customizable: checked })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between border rounded-lg p-3">
              <div className="space-y-0.5">
                <Label htmlFor="edit-active">Plan Status</Label>
                <p className="text-xs text-muted-foreground">Active plans can be subscribed by organizations</p>
              </div>
              <Switch
                id="edit-active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Save Plan</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" /> Delete Plan
            </DialogTitle>
            <DialogDescription className="pt-2">
              Are you absolutely sure you want to delete pricing plan <strong>{selectedPlan?.name}</strong>?
              This action cannot be undone. System will reject deletion if there are active tenant subscriptions.
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
    </div>
  );
}
