"use client";

import { useEffect, useState } from "react";
import {
  getSuperadminSubscriptions,
  getSuperadminOrganizations,
  getPricingPlans,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  renewSubscription
} from "@/app/api/api";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Plus,
  RefreshCw,
  XCircle,
  Calendar,
  Building,
  CheckCircle2,
  AlertTriangle,
  History,
  FileText,
  CreditCard
} from "lucide-react";
import { toast } from "sonner";

type SubscriptionItem = {
  id: string;
  organizationId: string;
  organizationName: string;
  planId: string;
  plan: {
    name: string;
    planType: string;
    price: number;
  };
  status: string;
  startDate: string;
  endDate: string | null;
  renewalDate: string | null;
  autoRenew: boolean;
  billingCycleMonths: number | null;
  totalPaid: number | null;
  paymentMethod: string | null;
  customizations: string | null;
  createdAt: string;
};

type SimpleOrg = { id: string; name: string };
type SimplePlan = { id: string; name: string; price: number };

export default function SubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [organizations, setOrganizations] = useState<SimpleOrg[]>([]);
  const [plans, setPlans] = useState<SimplePlan[]>([]);
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Selected subscription & form
  const [selectedSub, setSelectedSub] = useState<SubscriptionItem | null>(null);
  const [formData, setFormData] = useState({
    organizationId: "",
    planId: "",
    status: "ACTIVE",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    billingCycleMonths: 1,
    totalPaid: 0,
    paymentMethod: "BANK_TRANSFER",
    autoRenew: true,
  });

  const fetchData = async () => {
    try {
      const [subsRes, orgsRes, plansRes] = await Promise.all([
        getSuperadminSubscriptions(),
        getSuperadminOrganizations(),
        getPricingPlans(),
      ]);
      setSubscriptions(subsRes.data);
      setOrganizations(orgsRes.data.map((o: any) => ({ id: o.id, name: o.name })));
      setPlans(plansRes.data.map((p: any) => ({ id: p.id, name: p.name, price: p.price })));
    } catch (err) {
      toast.error("Failed to load subscription details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.organizationId || !formData.planId) {
      toast.warning("Organization and plan are required fields.");
      return;
    }
    try {
      await createSubscription({
        ...formData,
        billingCycleMonths: Number(formData.billingCycleMonths),
        totalPaid: Number(formData.totalPaid),
      });
      toast.success("Subscription created successfully.");
      setCreateDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to create subscription.");
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSub) return;
    try {
      await updateSubscription(selectedSub.id, {
        status: formData.status,
        endDate: formData.endDate || null,
        paymentMethod: formData.paymentMethod,
        totalPaid: Number(formData.totalPaid),
      });
      toast.success("Subscription updated successfully.");
      setEditDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to update subscription.");
    }
  };

  const handleRenew = async (sub: SubscriptionItem) => {
    try {
      await renewSubscription(sub.id);
      toast.success("Subscription renewed successfully.");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to renew subscription.");
    }
  };

  const handleCancel = async (sub: SubscriptionItem) => {
    try {
      await cancelSubscription(sub.id);
      toast.success("Subscription cancelled successfully.");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to cancel subscription.");
    }
  };

  const openEditDialog = (sub: SubscriptionItem) => {
    setSelectedSub(sub);
    setFormData({
      organizationId: sub.organizationId,
      planId: sub.planId,
      status: sub.status,
      startDate: new Date(sub.startDate).toISOString().split("T")[0],
      endDate: sub.endDate ? new Date(sub.endDate).toISOString().split("T")[0] : "",
      billingCycleMonths: sub.billingCycleMonths || 1,
      totalPaid: sub.totalPaid || 0,
      paymentMethod: sub.paymentMethod || "BANK_TRANSFER",
      autoRenew: sub.autoRenew,
    });
    setEditDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "ACTIVE":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
      case "TRIAL":
        return "bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300";
      case "INACTIVE":
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
      case "EXPIRED":
        return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
            Active Subscriptions
          </h1>
          <p className="text-muted-foreground mt-1">
            Monitor paid plans, renewal schedules, and handle cancellations/renewals.
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2 bg-gradient-to-r from-blue-600 to-cyan-500 text-white hover:opacity-90">
          <Plus className="h-4 w-4" /> Grant Subscription
        </Button>
      </div>

      {/* Table Card */}
      <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader>
          <CardTitle>Customer Subscriptions</CardTitle>
          <CardDescription>Comprehensive audit of billing contracts and subscription statuses.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
            </div>
          ) : subscriptions.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Subscribed Plan</TableHead>
                    <TableHead>Billing Cycle</TableHead>
                    <TableHead>Contract Dates</TableHead>
                    <TableHead>Total Invoiced</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subscriptions.map((sub) => (
                    <TableRow key={sub.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/40">
                      <TableCell className="font-semibold">{sub.organizationName}</TableCell>
                      <TableCell>
                        <div className="text-sm font-semibold">{sub.plan?.name}</div>
                        <div className="text-xs text-muted-foreground">Type: {sub.plan?.planType}</div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {sub.billingCycleMonths ? `${sub.billingCycleMonths} month(s)` : "Custom"}
                      </TableCell>
                      <TableCell className="text-xs space-y-1">
                        <div>Starts: {new Date(sub.startDate).toLocaleDateString()}</div>
                        <div>
                          Ends:{" "}
                          {sub.endDate ? (
                            new Date(sub.endDate).toLocaleDateString()
                          ) : (
                            <span className="text-muted-foreground italic">Continuous</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-semibold">
                        ₹{(sub.totalPaid || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-xs font-mono">{sub.paymentMethod || "N/A"}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusColor(sub.status)}`}>
                          {sub.status}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(sub)} title="Edit Contract">
                            <FileText className="h-4 w-4 text-slate-500 hover:text-blue-600" />
                          </Button>
                          {sub.status !== "EXPIRED" && sub.status !== "INACTIVE" && (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => handleRenew(sub)} title="Renew Contract">
                                <RefreshCw className="h-4 w-4 text-slate-500 hover:text-emerald-600" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleCancel(sub)} title="Cancel Subscription">
                                <XCircle className="h-4 w-4 text-slate-500 hover:text-red-600" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CreditCard className="h-12 w-12 text-muted-foreground/60 mb-3" />
              <h3 className="font-semibold text-lg">No Subscriptions Found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                There are no client organization subscriptions registered. Click "Grant Subscription" above.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* CREATE DIALOG */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Grant Organization Subscription</DialogTitle>
            <DialogDescription>Assign a pricing plan contract to a corporate customer.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="orgSelect">Select Organization *</Label>
              <Select value={formData.organizationId} onValueChange={(val) => setFormData({ ...formData, organizationId: val })}>
                <SelectTrigger id="orgSelect">
                  <SelectValue placeholder="Choose organization..." />
                </SelectTrigger>
                <SelectContent>
                  {organizations.map((org) => (
                    <SelectItem key={org.id} value={org.id}>
                      {org.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="planSelect">Select Pricing Plan *</Label>
              <Select value={formData.planId} onValueChange={(val) => setFormData({ ...formData, planId: val })}>
                <SelectTrigger id="planSelect">
                  <SelectValue placeholder="Choose pricing tier..." />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} (₹{p.price}/mo)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="billingCycle">Billing Cycle (Months)</Label>
                <Input
                  id="billingCycle"
                  type="number"
                  min={1}
                  value={formData.billingCycleMonths}
                  onChange={(e) => setFormData({ ...formData, billingCycleMonths: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="totalPaid">Total Paid (INR)</Label>
                <Input
                  id="totalPaid"
                  type="number"
                  value={formData.totalPaid}
                  onChange={(e) => setFormData({ ...formData, totalPaid: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="paymentMethod">Payment Method</Label>
              <Select value={formData.paymentMethod} onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}>
                <SelectTrigger id="paymentMethod">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer (Offline)</SelectItem>
                  <SelectItem value="CREDIT_CARD">Credit Card / Online Gateway</SelectItem>
                  <SelectItem value="UPI">UPI Payment</SelectItem>
                  <SelectItem value="CHEQUE">Cheque / Demand Draft</SelectItem>
                  <SelectItem value="COMPLIMENTARY">Complimentary / Free Tier</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Activate Contract</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* EDIT DIALOG */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Edit Subscription Details</DialogTitle>
            <DialogDescription>Modify active parameters of the subscription contract.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="edit-status">Contract Status</Label>
              <Select value={formData.status} onValueChange={(val) => setFormData({ ...formData, status: val })}>
                <SelectTrigger id="edit-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active (Paid)</SelectItem>
                  <SelectItem value="TRIAL">Trial Mode</SelectItem>
                  <SelectItem value="INACTIVE">Inactive (Suspended)</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-endDate">Contract End Date</Label>
              <Input
                id="edit-endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-totalPaid">Total Paid (INR)</Label>
                <Input
                  id="edit-totalPaid"
                  type="number"
                  value={formData.totalPaid}
                  onChange={(e) => setFormData({ ...formData, totalPaid: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-paymentMethod">Payment Method</Label>
                <Select value={formData.paymentMethod} onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}>
                  <SelectTrigger id="edit-paymentMethod">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer (Offline)</SelectItem>
                    <SelectItem value="CREDIT_CARD">Credit Card / Online Gateway</SelectItem>
                    <SelectItem value="UPI">UPI Payment</SelectItem>
                    <SelectItem value="CHEQUE">Cheque / Demand Draft</SelectItem>
                    <SelectItem value="COMPLIMENTARY">Complimentary / Free Tier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Update Contract</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
