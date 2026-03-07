"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Receipt,
  Plus,
  Loader2,
  Send,
  FileText,
  Filter,
  RefreshCw,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import {
  getProfile,
  getMyExpenses,
  createExpense,
  deleteExpense,
  uploadFile,
  getClientProjects,
} from "@/app/api/api";
import { format } from "date-fns";

// ─── Constants ───────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  "Travel",
  "Accommodation",
  "Meals & Entertainment",
  "Office Supplies",
  "Communication",
  "Training & Development",
  "Medical",
  "Other",
];

const EXPENSE_TYPES = [
  "Flight",
  "Train",
  "Bus",
  "Cab / Taxi",
  "Hotel",
  "Meal",
  "Fuel",
  "Internet",
  "Software / Subscription",
  "Equipment",
  "Conference / Event",
  "Other",
];

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD", "CAD"];

// ─── Types ────────────────────────────────────────────────────────────────────

interface Expense {
  id: string;
  category: string;
  projectName?: string | null;
  title: string;
  expenseDate: string;
  expenseType: string;
  currency: string;
  amount: number;
  receiptUrl?: string | null;
  status: string;
  createdAt: string;
}

interface TableState {
  page: number;
  pageSize: number;
  search: string;
  sorting: any[];
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

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function UserExpensesPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const userId = profile?.userId ?? profile?.id;

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const [tableState, setTableState] = useState<TableState>({
    page: 0,
    pageSize: 10,
    search: "",
    sorting: [],
  });

  // Projects for dropdown
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  // Submit dialog
  const today = format(new Date(), "yyyy-MM-dd");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);

  const [form, setForm] = useState({
    category: "",
    categoryOther: "",
    projectName: "",
    projectOther: "",
    title: "",
    expenseDate: today,
    expenseType: "",
    expenseTypeOther: "",
    currency: "INR",
    amount: "",
    receiptUrl: "",
  });

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

  // ─── Fetch projects for dropdown ────────────────────────────────────────

  useEffect(() => {
    if (!profile) return;
    getClientProjects({ organizationId: profile.organizationId })
      .then((res) => {
        const data = Array.isArray(res.data) ? res.data : [];
        setProjects(data.map((p: any) => ({ id: p.id, name: p.projectName })));
      })
      .catch(() => {});
  }, [profile]);

  // ─── Fetch expenses ─────────────────────────────────────────────────────

  const fetchExpenses = useCallback(async () => {
    if (!userId) return;
    setExpensesLoading(true);
    try {
      const res = await getMyExpenses(userId);
      setExpenses(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load expenses");
    } finally {
      setExpensesLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (profile) fetchExpenses();
  }, [profile, fetchExpenses]);

  // ─── Upload receipt ─────────────────────────────────────────────────────

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Receipt must be under 10MB");
      return;
    }
    setUploadingReceipt(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadFile(fd, { path: "expenses", public: "true" });
      setForm((prev) => ({ ...prev, receiptUrl: res.data.url }));
      toast.success("Receipt uploaded");
    } catch {
      toast.error("Failed to upload receipt");
    } finally {
      setUploadingReceipt(false);
    }
  };

  // ─── Submit expense ─────────────────────────────────────────────────────

  const handleSubmit = async () => {
    const category = form.category === "Other" ? form.categoryOther.trim() : form.category;
    const expenseType = form.expenseType === "Other" ? form.expenseTypeOther.trim() : form.expenseType;
    const projectName =
      form.projectName === "Other"
        ? form.projectOther.trim()
        : form.projectName || null;

    if (!category) { toast.error("Please select or enter a category"); return; }
    if (!form.title.trim()) { toast.error("Please enter an expense title"); return; }
    if (!form.expenseDate) { toast.error("Please select a date"); return; }
    if (!expenseType) { toast.error("Please select or enter an expense type"); return; }
    if (!form.amount || isNaN(Number(form.amount)) || Number(form.amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setSubmitting(true);
    try {
      await createExpense(userId, {
        category,
        projectName,
        title: form.title.trim(),
        expenseDate: form.expenseDate,
        expenseType,
        currency: form.currency,
        amount: Number(form.amount),
        receiptUrl: form.receiptUrl || undefined,
        organizationId: profile.organizationId,
      });
      toast.success("Expense submitted successfully");
      setDialogOpen(false);
      resetForm();
      fetchExpenses();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit expense");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setForm({
      category: "",
      categoryOther: "",
      projectName: "",
      projectOther: "",
      title: "",
      expenseDate: today,
      expenseType: "",
      expenseTypeOther: "",
      currency: "INR",
      amount: "",
      receiptUrl: "",
    });
  };

  // ─── Delete expense ─────────────────────────────────────────────────────

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this expense?")) return;
    try {
      await deleteExpense(id, userId);
      toast.success("Expense deleted");
      fetchExpenses();
    } catch {
      toast.error("Failed to delete expense");
    }
  };

  // ─── Table columns ──────────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<Expense>[]>(
    () => [
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-medium">{row.original.title}</span>
        ),
      },
      {
        id: "category",
        accessorKey: "category",
        header: "Category",
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.category}</Badge>
        ),
      },
      {
        id: "expenseType",
        accessorKey: "expenseType",
        header: "Type",
        enableSorting: false,
        cell: ({ row }) => row.original.expenseType,
      },
      {
        id: "projectName",
        accessorKey: "projectName",
        header: "Project",
        enableSorting: false,
        cell: ({ row }) => row.original.projectName || "-",
      },
      {
        id: "expenseDate",
        accessorKey: "expenseDate",
        header: "Date",
        enableSorting: false,
        cell: ({ row }) => {
          try {
            return format(new Date(row.original.expenseDate), "dd MMM yyyy");
          } catch {
            return "-";
          }
        },
      },
      {
        id: "amount",
        accessorKey: "amount",
        header: "Amount",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="font-semibold">
            {row.original.currency} {Number(row.original.amount).toLocaleString()}
          </span>
        ),
      },
      {
        id: "receipt",
        header: "Receipt",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.receiptUrl ? (
            <a
              href={row.original.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline text-sm"
            >
              View <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="text-muted-foreground text-sm">None</span>
          ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === "PENDING" ? (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(row.original.id)}
              className="h-7 w-7 text-red-500 hover:text-red-700"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [userId]
  );

  // ─── Filter & paginate ──────────────────────────────────────────────────

  const filtered = useMemo(
    () =>
      statusFilter === "all"
        ? expenses
        : expenses.filter(
            (e) => e.status?.toLowerCase() === statusFilter.toLowerCase()
          ),
    [expenses, statusFilter]
  );

  const searched = useMemo(() => {
    const q = tableState.search.toLowerCase().trim();
    if (!q) return filtered;
    return filtered.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.projectName || "").toLowerCase().includes(q) ||
        e.expenseType.toLowerCase().includes(q)
    );
  }, [filtered, tableState.search]);

  const pageCount = Math.max(1, Math.ceil(searched.length / tableState.pageSize));
  const pageData = searched.slice(
    tableState.page * tableState.pageSize,
    (tableState.page + 1) * tableState.pageSize
  );

  // ─── Summary stats ──────────────────────────────────────────────────────

  const totalAmount = expenses
    .filter((e) => e.status !== "REJECTED")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const pending = expenses.filter((e) => e.status === "PENDING").length;
  const approved = expenses.filter((e) => e.status === "APPROVED").length;

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
            <h1 className="text-2xl font-semibold">Expenses & Travels</h1>
            <p className="text-xs text-muted-foreground">
              Submit and track your expense claims
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchExpenses} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            New Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Total Claimed</p>
          <p className="text-2xl font-bold text-primary">
            {totalAmount.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground">across all currencies</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl font-bold text-amber-600">{pending}</p>
          <p className="text-xs text-muted-foreground">awaiting approval</p>
        </Card>
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-1">Approved</p>
          <p className="text-2xl font-bold text-green-600">{approved}</p>
          <p className="text-xs text-muted-foreground">this period</p>
        </Card>
      </div>

      {/* Expense Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              My Expenses
            </CardTitle>
            <CardDescription>All your submitted expense claims</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {expensesLoading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={pageData}
              pageCount={pageCount}
              state={tableState}
              setState={setTableState}
            />
          )}
        </CardContent>
      </Card>

      {/* Submit Expense Dialog */}
      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-col items-center text-center gap-2 pb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle>Submit Expense</DialogTitle>
              <DialogDescription>
                Fill in the details of your expense claim
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Category */}
            <div className="space-y-2">
              <Label>Expense Category</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((p) => ({ ...p, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.category === "Other" && (
                <Input
                  placeholder="Enter category name"
                  value={form.categoryOther}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, categoryOther: e.target.value }))
                  }
                />
              )}
            </div>

            {/* Project Name */}
            <div className="space-y-2">
              <Label>
                Project Name{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Select
                value={form.projectName}
                onValueChange={(v) => setForm((p) => ({ ...p, projectName: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">None</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.name}>{p.name}</SelectItem>
                  ))}
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.projectName === "Other" && (
                <Input
                  placeholder="Enter project name"
                  value={form.projectOther}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, projectOther: e.target.value }))
                  }
                />
              )}
            </div>

            {/* Title */}
            <div className="space-y-2">
              <Label>Expense Title</Label>
              <Input
                placeholder="e.g. Flight to Mumbai - Client Meeting"
                value={form.title}
                onChange={(e) =>
                  setForm((p) => ({ ...p, title: e.target.value }))
                }
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.expenseDate}
                max={today}
                onChange={(e) =>
                  setForm((p) => ({ ...p, expenseDate: e.target.value }))
                }
              />
            </div>

            {/* Expense Type */}
            <div className="space-y-2">
              <Label>Expense Type</Label>
              <Select
                value={form.expenseType}
                onValueChange={(v) => setForm((p) => ({ ...p, expenseType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.expenseType === "Other" && (
                <Input
                  placeholder="Enter expense type"
                  value={form.expenseTypeOther}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, expenseTypeOther: e.target.value }))
                  }
                />
              )}
            </div>

            {/* Currency + Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, amount: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Upload Receipt */}
            <div className="space-y-2">
              <Label>
                Upload Receipt{" "}
                <span className="text-muted-foreground text-xs">(optional, max 10MB)</span>
              </Label>
              {form.receiptUrl ? (
                <div className="flex items-center gap-2 p-2 border rounded-md bg-green-50 dark:bg-green-950">
                  <FileText className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 flex-1 truncate">
                    Receipt uploaded
                  </span>
                  <a
                    href={form.receiptUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 text-xs hover:underline"
                  >
                    View
                  </a>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, receiptUrl: "" }))}
                    className="text-red-500 text-xs hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="relative">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleReceiptUpload}
                    disabled={uploadingReceipt}
                    className="cursor-pointer"
                  />
                  {uploadingReceipt && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || uploadingReceipt}
              className="gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Expense
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
