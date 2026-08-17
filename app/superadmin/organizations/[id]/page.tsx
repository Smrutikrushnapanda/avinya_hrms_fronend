"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { getSuperadminOrgDetails, sendRenewalEmail } from "@/app/api/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Building2,
  Users,
  Mail,
  Phone,
  MapPin,
  Calendar,
  BadgeDollarSign,
  Clock,
  Send,
  ArrowLeft,
  Loader2,
  CheckCircle,
  History,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type OrgDetails = {
  id: string;
  name: string;
  email: string | null;
  hrMail: string | null;
  phone: string | null;
  address: string | null;
  logoUrl: string | null;
  isActive: boolean;
  createdOn: string;
  userCount: number;
  currentSubscription: {
    planName: string;
    planType: string;
    price: number;
    status: string;
    startDate: string;
    endDate: string;
    renewalDate: string | null;
    autoRenew: boolean;
    totalPaid: number;
    billingCycleMonths: number;
  } | null;
  subscriptionHistory: Array<{
    id: string;
    planName: string;
    planType: string;
    price: number;
    status: string;
    startDate: string;
    endDate: string;
    totalPaid: number;
    createdAt: string;
  }>;
  renewalEmailHistory: Array<{
    id: string;
    recipientEmail: string;
    subject: string;
    status: string;
    planName: string;
    sentAt: string;
    notes: string | null;
  }>;
};

export default function OrgDetailsPage() {
  const params = useParams();
  const orgId = params.id as string;
  const [org, setOrg] = useState<OrgDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);

  const fetchOrg = async () => {
    try {
      const res = await getSuperadminOrgDetails(orgId);
      setOrg(res.data);
    } catch (err) {
      toast.error("Failed to load organization details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orgId) fetchOrg();
  }, [orgId]);

  const handleSendRenewalEmail = async () => {
    if (!org) return;
    setSending(true);
    try {
      await sendRenewalEmail({
        organizationId: org.id,
        customMessage: customMessage || undefined,
      });
      toast.success(`Renewal reminder sent to ${org.name}`);
      setEmailDialogOpen(false);
      setCustomMessage("");
      fetchOrg();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send email.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex h-[80vh] items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">Organization not found.</p>
        <Link href="/superadmin/organizations" className="text-blue-600 hover:underline">
          Back to Organizations
        </Link>
      </div>
    );
  }

  const daysUntilExpiry = org.currentSubscription?.endDate
    ? Math.ceil(
        (new Date(org.currentSubscription.endDate).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/superadmin/organizations"
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg">
              {org.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">{org.name}</h1>
              <p className="text-sm text-muted-foreground">
                Organization ID: {org.id.slice(0, 8)}...
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {org.currentSubscription && (
            <Button
              onClick={() => setEmailDialogOpen(true)}
              className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:opacity-90"
            >
              <Send className="h-4 w-4" /> Send Renewal Reminder
            </Button>
          )}
        </div>
      </div>

      {/* Org Info + Subscription */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Organization Info */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-blue-600" /> Organization Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{org.email || "No email"}</span>
            </div>
            {org.hrMail && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>HR: {org.hrMail}</span>
              </div>
            )}
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{org.phone || "No phone"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{org.address || "No address"}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span>{org.userCount} users</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span>Joined {new Date(org.createdOn).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
            </div>
            <div className="pt-2">
              <Badge variant={org.isActive ? "default" : "destructive"} className={org.isActive ? "bg-emerald-500" : ""}>
                {org.isActive ? "Active" : "Suspended"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Current Subscription */}
        <Card className="md:col-span-2 border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-5 w-5 text-emerald-600" /> Current Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            {org.currentSubscription ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-muted-foreground">Plan</p>
                  <p className="text-lg font-bold">{org.currentSubscription.planName}</p>
                  <Badge variant="outline" className="mt-1 text-[10px]">{org.currentSubscription.planType}</Badge>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-muted-foreground">Monthly Price</p>
                  <p className="text-lg font-bold">₹{org.currentSubscription.price.toLocaleString()}</p>
                  <p className="text-[10px] text-muted-foreground">/month</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-muted-foreground">Total Paid</p>
                  <p className="text-lg font-bold text-emerald-600">₹{org.currentSubscription.totalPaid.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={org.currentSubscription.status === "ACTIVE" ? "default" : "secondary"} className="mt-1">
                    {org.currentSubscription.status}
                  </Badge>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-muted-foreground">Start Date</p>
                  <p className="text-sm font-medium">
                    {new Date(org.currentSubscription.startDate).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-muted-foreground">End Date</p>
                  <p className={`text-sm font-medium ${daysUntilExpiry !== null && daysUntilExpiry <= 14 ? "text-red-600" : ""}`}>
                    {new Date(org.currentSubscription.endDate).toLocaleDateString()}
                  </p>
                  {daysUntilExpiry !== null && (
                    <p className={`text-[10px] font-bold ${daysUntilExpiry <= 7 ? "text-red-600" : daysUntilExpiry <= 14 ? "text-amber-600" : "text-muted-foreground"}`}>
                      {daysUntilExpiry} days left
                    </p>
                  )}
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-muted-foreground">Auto-Renew</p>
                  <p className="text-sm font-medium">{org.currentSubscription.autoRenew ? "Enabled" : "Disabled"}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                  <p className="text-xs text-muted-foreground">Billing Cycle</p>
                  <p className="text-sm font-medium">{org.currentSubscription.billingCycleMonths} month(s)</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <BadgeDollarSign className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p>No active subscription</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subscription History + Email History */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Subscription History */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-5 w-5 text-indigo-600" /> Subscription History
            </CardTitle>
            <CardDescription>Past and current subscription records</CardDescription>
          </CardHeader>
          <CardContent>
            {org.subscriptionHistory.length > 0 ? (
              <div className="space-y-3">
                {org.subscriptionHistory.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50/50 dark:hover:bg-gray-900/20"
                  >
                    <div>
                      <p className="text-sm font-medium">{sub.planName}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sub.startDate).toLocaleDateString()} — {new Date(sub.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={sub.status === "ACTIVE" ? "default" : sub.status === "EXPIRED" ? "destructive" : "secondary"}>
                        {sub.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">₹{sub.totalPaid.toLocaleString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No subscription history</p>
            )}
          </CardContent>
        </Card>

        {/* Renewal Email History */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail className="h-5 w-5 text-amber-600" /> Renewal Email History
            </CardTitle>
            <CardDescription>Sent renewal reminders for this organization</CardDescription>
          </CardHeader>
          <CardContent>
            {org.renewalEmailHistory.length > 0 ? (
              <div className="space-y-3">
                {org.renewalEmailHistory.map((log) => (
                  <div
                    key={log.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50/50 dark:hover:bg-gray-900/20"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.subject}</p>
                      <p className="text-xs text-muted-foreground">
                        To: {log.recipientEmail} • {log.planName}
                      </p>
                      {log.notes && (
                        <p className="text-xs text-muted-foreground mt-1 italic">Note: {log.notes}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <Badge variant={log.status === "SENT" ? "default" : "destructive"}>
                        {log.status}
                      </Badge>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {new Date(log.sentAt).toLocaleString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">No renewal emails sent yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Send Renewal Email Dialog */}
      <Dialog open={emailDialogOpen} onOpenChange={setEmailDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-amber-600" /> Send Renewal Reminder
            </DialogTitle>
            <DialogDescription>
              Send a subscription renewal reminder to <strong>{org.name}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {org.currentSubscription && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-lg text-sm">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-muted-foreground">Plan:</span>
                    <span className="ml-2 font-medium">{org.currentSubscription.planName}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Expires:</span>
                    <span className={`ml-2 font-medium ${daysUntilExpiry !== null && daysUntilExpiry <= 14 ? "text-red-600" : ""}`}>
                      {new Date(org.currentSubscription.endDate).toLocaleDateString()}
                      {daysUntilExpiry !== null && ` (${daysUntilExpiry} days)`}
                    </span>
                  </div>
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Recipient</Label>
              <p className="text-sm">{org.hrMail || org.email || "No email configured"}</p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="org-message">Custom Message (Optional)</Label>
              <Textarea
                id="org-message"
                placeholder="Add a personal note to the renewal email..."
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="pt-4">
            <Button variant="outline" onClick={() => setEmailDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSendRenewalEmail} disabled={sending} className="gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
              {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {sending ? "Sending..." : "Send Reminder"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
