"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Receipt,
  Check,
  X,
  ExternalLink,
  Filter,
  RefreshCw,
  FileText,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { getProfile, getAllExpenses, updateExpenseStatus } from "@/app/api/api";
import { format } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Expense {
  id: string;
  userId: string;
  user?: { id: string; firstName?: string; lastName?: string; email?: string };
  category: string;
  projectName?: string | null;
  title: string;
  expenseDate: string;
  expenseType: string;
  currency: string;
  amount: number;
  receiptUrl?: string | null;
  status: string;
  adminRemarks?: string | null;
  createdAt: string;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status?: string }) {
  switch (status?.toUpperCase()) {
    case "APPROVED":
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300 hover:bg-green-100">
          Approved
        </Badge>
      );
    case "REJECTED":
      return (
        <Badge className="bg-red-100 text-red-700 border-red-300 hover:bg-red-100">
          Rejected
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
          Pending
        </Badge>
      );
  }
}

function employeeName(exp: Expense): string {
  if (exp.user) {
    const parts = [exp.user.firstName, exp.user.lastName].filter(Boolean);
    if (parts.length) return parts.join(" ");
    return exp.user.email || "Employee";
  }
  return "Employee";
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminExpensesPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Action dialog
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    expense: Expense | null;
    action: "approve" | "reject" | null;
  }>({ open: false, expense: null, action: null });
  const [remarks, setRemarks] = useState("");
  const [actioning, setActioning] = useState(false);

  // ─── Fetch profile ──────────────────────────────────────────────────────

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await getProfile();
        setProfile(res.data);
      } catch {
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // ─── Fetch expenses ─────────────────────────────────────────────────────

  const fetchExpenses = useCallback(async () => {
    if (!profile?.organizationId) return;
    setExpensesLoading(true);
    try {
      const res = await getAllExpenses(profile.organizationId);
      setExpenses(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setExpensesLoading(false);
    }
  }, [profile?.organizationId]);

  useEffect(() => {
    if (profile) fetchExpenses();
  }, [profile, fetchExpenses]);

  // ─── Filter ─────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = expenses;
    if (activeTab !== "all") {
      list = list.filter((e) => e.status?.toLowerCase() === activeTab);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          employeeName(e).toLowerCase().includes(q) ||
          (e.projectName || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [expenses, activeTab, search]);

  // ─── Summary ────────────────────────────────────────────────────────────

  const pending = expenses.filter((e) => e.status === "PENDING").length;
  const approved = expenses.filter((e) => e.status === "APPROVED").length;
  const rejected = expenses.filter((e) => e.status === "REJECTED").length;

  // ─── Approve / Reject ───────────────────────────────────────────────────

  const openAction = (expense: Expense, action: "approve" | "reject") => {
    setRemarks("");
    setActionDialog({ open: true, expense, action });
  };

  const handleAction = async () => {
    if (!actionDialog.expense || !actionDialog.action) return;
    setActioning(true);
    try {
      await updateExpenseStatus(actionDialog.expense.id, {
        status: actionDialog.action === "approve" ? "APPROVED" : "REJECTED",
        adminRemarks: remarks.trim() || undefined,
      });
      toast.success(
        actionDialog.action === "approve"
          ? "Expense approved"
          : "Expense rejected"
      );
      setActionDialog({ open: false, expense: null, action: null });
      fetchExpenses();
    } catch {
      toast.error("Action failed");
    } finally {
      setActioning(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Receipt className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Expenses</h1>
            <p className="text-xs text-muted-foreground">
              Review and manage employee expense claims
            </p>
          </div>
        </div>
        <Button variant="outline" size="icon" onClick={fetchExpenses} title="Refresh">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Pending Review</p>
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Approved</p>
          <p className="text-2xl font-bold text-green-600">{approved}</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Rejected</p>
          <p className="text-2xl font-bold text-red-600">{rejected}</p>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                All Expense Claims
              </CardTitle>
              <CardDescription>Review, approve or reject employee expenses</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  className="pl-8 w-48"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({expenses.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pending})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({approved})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({rejected})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab}>
              {expensesLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No expenses found
                </div>
              ) : (
                <div className="rounded-md border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Sl#</TableHead>
                        <TableHead>Employee</TableHead>
                        <TableHead>Title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Project</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Receipt</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((exp, index) => (
                        <TableRow key={exp.id}>
                          <TableCell className="font-medium">{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {employeeName(exp)}
                          </TableCell>
                          <TableCell className="max-w-[160px] truncate" title={exp.title}>
                            {exp.title}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {exp.category}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">{exp.expenseType}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {exp.projectName || "-"}
                          </TableCell>
                          <TableCell className="text-sm">
                            {(() => {
                              try {
                                return format(new Date(exp.expenseDate), "dd MMM yyyy");
                              } catch {
                                return "-";
                              }
                            })()}
                          </TableCell>
                          <TableCell className="font-semibold">
                            {exp.currency} {Number(exp.amount).toLocaleString()}
                          </TableCell>
                          <TableCell>
                            {exp.receiptUrl ? (
                              <a
                                href={exp.receiptUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
                              >
                                View <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-sm">None</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <StatusBadge status={exp.status} />
                            {exp.adminRemarks && (
                              <p className="text-xs text-muted-foreground mt-1 max-w-[120px] truncate" title={exp.adminRemarks}>
                                {exp.adminRemarks}
                              </p>
                            )}
                          </TableCell>
                          <TableCell>
                            {exp.status === "PENDING" ? (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openAction(exp, "approve")}
                                  className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  title="Approve"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  onClick={() => openAction(exp, "reject")}
                                  className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  title="Reject"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">Done</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Approve/Reject Dialog */}
      <Dialog
        open={actionDialog.open}
        onOpenChange={(open) =>
          setActionDialog((prev) => ({ ...prev, open }))
        }
      >
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="flex flex-col items-center text-center gap-2 pb-2">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center ${
                  actionDialog.action === "approve"
                    ? "bg-green-100"
                    : "bg-red-100"
                }`}
              >
                {actionDialog.action === "approve" ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <X className="w-5 h-5 text-red-600" />
                )}
              </div>
              <DialogTitle>
                {actionDialog.action === "approve"
                  ? "Approve Expense"
                  : "Reject Expense"}
              </DialogTitle>
              {actionDialog.expense && (
                <DialogDescription>
                  {employeeName(actionDialog.expense)} — {actionDialog.expense.title} (
                  {actionDialog.expense.currency}{" "}
                  {Number(actionDialog.expense.amount).toLocaleString()})
                </DialogDescription>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label>
                Remarks{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                rows={3}
                placeholder="Add remarks for the employee..."
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() =>
                setActionDialog({ open: false, expense: null, action: null })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={actioning}
              className={
                actionDialog.action === "approve"
                  ? "bg-green-600 hover:bg-green-700"
                  : "bg-red-600 hover:bg-red-700"
              }
            >
              {actioning ? (
                "Processing..."
              ) : actionDialog.action === "approve" ? (
                "Approve"
              ) : (
                "Reject"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
