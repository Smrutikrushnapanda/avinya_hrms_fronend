"use client";

import { useEffect, useState } from "react";
import {
  getSuperadminExpiringSoon,
  sendRenewalEmail,
  sendBulkRenewalEmails,
  getRenewalEmailHistory,
} from "@/app/api/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Mail,
  Clock,
  AlertTriangle,
  Send,
  CheckCircle,
  History,
  Loader2,
  RefreshCw,
  Bell,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type ExpiringOrg = {
  subscriptionId: string;
  organizationId: string;
  organizationName: string;
  contactEmail: string | null;
  planName: string;
  planType: string;
  planPrice: number;
  status: string;
  endDate: string;
  renewalDate: string | null;
  daysUntilExpiry: number;
  urgency: "CRITICAL" | "HIGH" | "MEDIUM";
};

type RenewalLog = {
  id: string;
  organizationId: string;
  organizationName: string;
  recipientEmail: string;
  subject: string;
  emailType: string;
  sentBy: string;
  subscriptionEndDate: string;
  planName: string;
  planPrice: number;
  status: string;
  notes: string | null;
  sentAt: string;
};

const urgencyConfig = {
  CRITICAL: { color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/30", border: "border-red-200 dark:border-red-800", badge: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
  HIGH: { color: "text-amber-600", bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-800", badge: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300" },
  MEDIUM: { color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/30", border: "border-blue-200 dark:border-blue-800", badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300" },
};

export default function RenewalsPage() {
  const [expiringOrgs, setExpiringOrgs] = useState<ExpiringOrg[]>([]);
  const [renewalLogs, setRenewalLogs] = useState<RenewalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [daysThreshold, setDaysThreshold] = useState(30);
  const [activeTab, setActiveTab] = useState<"expiring" | "history">("expiring");

  // Single email dialog
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [selectedOrg, setSelectedOrg] = useState<ExpiringOrg | null>(null);
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Bulk email state
  const [bulkSending, setBulkSending] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  const fetchData = async () => {
    try {
      const [expiringRes, historyRes] = await Promise.all([
        getSuperadminExpiringSoon(daysThreshold),
        getRenewalEmailHistory(50, 0),
      ]);
      setExpiringOrgs(expiringRes.data);
      setRenewalLogs(historyRes.data.data);
    } catch (err) {
      toast.error("Failed to fetch renewal data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [daysThreshold]);

  const handleSendSingleEmail = async () => {
    if (!selectedOrg) return;
    setSending(true);
    try {
      await sendRenewalEmail({
        organizationId: selectedOrg.organizationId,
        customMessage: customMessage || undefined,
      });
      toast.success(`Renewal reminder sent to ${selectedOrg.organizationName}`);
      setEmailDialogOpen(false);
      setSelectedOrg(null);
      setCustomMessage("");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  const handleSendBulkEmails = async () => {
    setBulkSending(true);
    try {
      const res = await sendBulkRenewalEmails({
        daysThreshold,
        customMessage: customMessage || undefined,
      });
      const result = res.data;
      toast.success(
        `Bulk emails sent: ${result.successful} successful, ${result.failed} failed out of ${result.totalTargeted} targeted.`
      );
      setBulkDialogOpen(false);
      setCustomMessage("");
      fetchData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send bulk emails.");
    } finally {
      setBulkSending(false);
    }
  };

  const openEmailDialog = (org: ExpiringOrg) => {
    setSelectedOrg(org);
    setEmailDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500 to-orange-600 p-6 md:p-8 text-white shadow-md">
        <div className="relative z-10 space-y-2 max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/30 px-3 py-1 text-xs font-semibold tracking-wider text-amber-100 uppercase">
            <Bell className="h-3 w-3" /> Subscription Renewals
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Renewal Management</h1>
          <p className="text-amber-100 text-sm leading-relaxed">
            Monitor expiring subscriptions, send renewal reminders, and track email delivery history.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none hidden md:block" />
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border border-red-100 dark:border-red-950 bg-gradient-to-br from-white to-red-50/10 dark:from-gray-900 dark:to-red-950/5 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Critical (≤7 days)</CardTitle>
            <div className="p-2 bg-red-50 dark:bg-red-950/50 text-red-600 rounded-lg">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-red-600">
              {expiringOrgs.filter((o) => o.urgency === "CRITICAL").length}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-amber-100 dark:border-amber-950 bg-gradient-to-br from-white to-amber-50/10 dark:from-gray-900 dark:to-amber-950/5 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">High (≤14 days)</CardTitle>
            <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 rounded-lg">
              <Clock className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-amber-600">
              {expiringOrgs.filter((o) => o.urgency === "HIGH").length}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-blue-100 dark:border-blue-950 bg-gradient-to-br from-white to-blue-50/10 dark:from-gray-900 dark:to-blue-950/5 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Medium (≤30 days)</CardTitle>
            <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 rounded-lg">
              <Mail className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-blue-600">
              {expiringOrgs.filter((o) => o.urgency === "MEDIUM").length}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-100 dark:border-emerald-950 bg-gradient-to-br from-white to-emerald-50/10 dark:from-gray-900 dark:to-emerald-950/5 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Emails Sent</CardTitle>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 rounded-lg">
              <CheckCircle className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-extrabold text-emerald-600">{renewalLogs.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs + Actions */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("expiring")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "expiring"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            Expiring Subscriptions
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === "history"
                ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            <History className="inline h-4 w-4 mr-1.5" />
            Email History
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-xs text-muted-foreground whitespace-nowrap">Threshold:</Label>
            <select
              value={daysThreshold}
              onChange={(e) => setDaysThreshold(Number(e.target.value))}
              className="px-2 py-1.5 text-xs border rounded-lg bg-background"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          {activeTab === "expiring" && expiringOrgs.length > 0 && (
            <Button
              onClick={() => setBulkDialogOpen(true)}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90"
            >
              <Send className="h-4 w-4" /> Send Bulk Reminders
            </Button>
          )}
        </div>
      </div>

      {/* Expiring Subscriptions Table */}
      {activeTab === "expiring" && (
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="pt-6">
            {expiringOrgs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead className="text-right">Price/mo</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead className="text-center">Days Left</TableHead>
                      <TableHead>Urgency</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiringOrgs.map((org) => {
                      const config = urgencyConfig[org.urgency];
                      return (
                        <TableRow key={org.subscriptionId} className={`${config.bg} hover:opacity-90`}>
                          <TableCell className="font-semibold">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-white dark:bg-gray-900 flex items-center justify-center font-bold shrink-0 border">
                                {org.organizationName.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <span className="text-sm block">{org.organizationName}</span>
                                <Link
                                  href={`/superadmin/organizations/${org.organizationId}`}
                                  className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                                >
                                  View details <ArrowUpRight className="h-3 w-3" />
                                </Link>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{org.planName}</TableCell>
                          <TableCell className="text-right text-sm font-medium">₹{org.planPrice.toLocaleString()}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(org.endDate).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`text-lg font-extrabold ${config.color}`}>{org.daysUntilExpiry}</span>
                          </TableCell>
                          <TableCell>
                            <Badge className={config.badge}>{org.urgency}</Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {org.contactEmail || "No email"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-1.5 text-xs"
                              onClick={() => openEmailDialog(org)}
                              disabled={!org.contactEmail}
                            >
                              <Mail className="h-3.5 w-3.5" /> Send Reminder
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <CheckCircle className="h-12 w-12 text-emerald-400 mb-3" />
                <h3 className="font-semibold text-lg">All clear!</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  No subscriptions expiring within {daysThreshold} days.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Email History */}
      {activeTab === "history" && (
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardContent className="pt-6">
            {renewalLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Recipient</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Sent At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {renewalLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-semibold text-sm">{log.organizationName}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{log.recipientEmail}</TableCell>
                        <TableCell className="text-xs max-w-[250px] truncate">{log.subject}</TableCell>
                        <TableCell className="text-sm">{log.planName}</TableCell>
                        <TableCell>
                          <Badge variant={log.status === "SENT" ? "default" : "destructive"}>
                            {log.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.sentAt).toLocaleString("en-US", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Mail className="h-12 w-12 text-muted-foreground/60 mb-3" />
                <h3 className="font-semibold text-lg">No emails sent yet</h3>
                <p className="text-sm text-muted-foreground max-w-sm mt-1">
                  Renewal reminder emails will appear here once sent.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Single Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-amber-600" /> Send Renewal Reminder
            </DialogTitle>
            <DialogDescription>
              Send a subscription renewal reminder to <strong>{selectedOrg?.organizationName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Plan:</span>
                  <span className="ml-2 font-medium">{selectedOrg?.planName}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Price:</span>
                  <span className="ml-2 font-medium">₹{selectedOrg?.planPrice.toLocaleString()}/mo</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Expires:</span>
                  <span className="ml-2 font-medium">
                    {selectedOrg?.endDate
                      ? new Date(selectedOrg.endDate).toLocaleDateString()
                      : "N/A"}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Days left:</span>
                  <span className={`ml-2 font-bold ${urgencyConfig[selectedOrg?.urgency || "MEDIUM"].color}`}>
                    {selectedOrg?.daysUntilExpiry}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="recipient">Recipient</Label>
              <Input id="recipient" value={selectedOrg?.contactEmail || ""} disabled />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="message">Custom Message (Optional)</Label>
              <Textarea
                id="message"
                placeholder="Add a personal note to the renewal email..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendSingleEmail} disabled={sending} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Sending..." : "Send Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Email Dialog */}
      <Dialog open={bulkDialogOpen} onOpenChange={setBulkDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-amber-600" /> Send Bulk Renewal Reminders
            </DialogTitle>
            <DialogDescription>
              Send renewal reminder emails to all {expiringOrgs.length} organization(s) expiring within {daysThreshold} days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg text-sm">
              <p className="font-medium text-amber-800 dark:text-amber-200">
                This will send emails to {expiringOrgs.length} organization(s):
              </p>
              <ul className="mt-2 space-y-1 text-amber-700 dark:text-amber-300">
                {expiringOrgs.slice(0, 5).map((org) => (
                  <li key={org.organizationId} className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${urgencyConfig[org.urgency].color.replace("text-", "bg-")}`} />
                    {org.organizationName} — {org.daysUntilExpiry} days left
                  </li>
                ))}
                {expiringOrgs.length > 5 && (
                  <li className="text-muted-foreground">...and {expiringOrgs.length - 5} more</li>
                )}
              </ul>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="bulk-message">Custom Message (Optional)</Label>
              <Textarea
                id="bulk-message"
                placeholder="Add a note to include in all renewal emails..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => setBulkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendBulkEmails} disabled={bulkSending} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
              {bulkSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {bulkSending ? "Sending..." : `Send to ${expiringOrgs.length} Org(s)`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
