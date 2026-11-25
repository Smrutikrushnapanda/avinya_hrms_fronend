"use client";

import { useEmployeeSearchFilters } from "@/components/employee-search-filters";
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Receipt,
  Check,
  X,
  ExternalLink,
  RefreshCw,
  FileText,
  FileSpreadsheet,
  Loader2,
} from "lucide-react";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/ui/data-table";
import AssignWorkPage from "@/components/assign-work-page";
import { toast } from "sonner";
import {
  getProfile,
  getAllExpenses,
  updateExpenseStatus,
} from "@/app/api/api";
import { format, isValid, parseISO } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Expense {
  id: string;
  userId: string;
  user?: { id: string; firstName?: string; middleName?: string; lastName?: string; email?: string };
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

interface TableState {
  page: number;
  pageSize: number;
  search: string;
  sorting: any;
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
    const parts = [exp.user.firstName, exp.user.middleName, exp.user.lastName].filter(Boolean);
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
  const [exporting, setExporting] = useState(false);

  const [activeTab, setActiveTab] = useState("all");
  const [view, setView] = useState("expenses");

  const [tableState, setTableState] = useState<TableState>({
    page: 0,
    pageSize: 10,
    search: "",
    sorting: [],
  });

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

  // ─── Reset pagination on tab change ─────────────────────────────────────

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setTableState((prev) => ({ ...prev, page: 0 }));
  };

  // ─── Summary ────────────────────────────────────────────────────────────

  const pending = expenses.filter((e) => e.status?.toUpperCase() === "PENDING").length;
  const approved = expenses.filter((e) => e.status?.toUpperCase() === "APPROVED").length;
  const rejected = expenses.filter((e) => e.status?.toUpperCase() === "REJECTED").length;

  // ─── Filter, Search & Sort for DataTable ────────────────────────────────

  const tabFiltered = useMemo(() => {
    if (activeTab === "all") return expenses;
    return expenses.filter(
      (e) => e.status?.toLowerCase() === activeTab.toLowerCase()
    );
  }, [expenses, activeTab]);

  const employeeFilters = useEmployeeSearchFilters(expenses, undefined, false, () => setTableState((previous) => ({ ...previous, page: 0 })));
  const searched = useMemo(() => {
    const q = tableState.search.trim().toLowerCase();
    if (!q) return tabFiltered.filter(employeeFilters.matches);
    return tabFiltered.filter(employeeFilters.matches).filter(
      (e) =>
        e.title?.toLowerCase().includes(q) ||
        e.category?.toLowerCase().includes(q) ||
        employeeName(e).toLowerCase().includes(q) ||
        (e.projectName || "").toLowerCase().includes(q) ||
        e.expenseType?.toLowerCase().includes(q) ||
        e.user?.email?.toLowerCase().includes(q)
    );
  }, [tabFiltered, tableState.search, employeeFilters.matches]);

  const sorted = useMemo(() => {
    if (!Array.isArray(tableState.sorting) || tableState.sorting.length === 0) {
      return searched;
    }
    const { id, desc } = tableState.sorting[0];
    const copy = [...searched];
    copy.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";

      if (id === "employee") {
        valA = employeeName(a).toLowerCase();
        valB = employeeName(b).toLowerCase();
      } else if (id === "amount") {
        valA = Number(a.amount) || 0;
        valB = Number(b.amount) || 0;
      } else if (id === "expenseDate") {
        valA = new Date(a.expenseDate || 0).getTime();
        valB = new Date(b.expenseDate || 0).getTime();
      } else {
        valA = String((a as any)[id] || "").toLowerCase();
        valB = String((b as any)[id] || "").toLowerCase();
      }

      if (valA < valB) return desc ? 1 : -1;
      if (valA > valB) return desc ? -1 : 1;
      return 0;
    });
    return copy;
  }, [searched, tableState.sorting]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / tableState.pageSize));
  const pageData = useMemo(() => {
    const start = tableState.page * tableState.pageSize;
    return sorted.slice(start, start + tableState.pageSize);
  }, [sorted, tableState.page, tableState.pageSize]);

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

  const handleExportExcel = async () => {
    if (!profile?.organizationId) return;
    if (tabFiltered.length === 0) {
      toast.error("No expense claims to export for selected status");
      return;
    }
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const exportDate = (value: string, pattern: string) => {
        if (!value) return "-";
        const date = parseISO(value);
        return isValid(date) ? format(date, pattern) : value;
      };
      const rows = tabFiltered.map((expense, index) => ({
        "Sl#": index + 1,
        "Employee Name": employeeName(expense),
        "Employee Email": expense.user?.email || "-",
        "Title": expense.title || "-",
        "Category": expense.category || "-",
        "Expense Type": expense.expenseType || "-",
        "Project Name": expense.projectName || "-",
        "Expense Date": exportDate(expense.expenseDate, "yyyy-MM-dd"),
        "Currency": expense.currency || "INR",
        "Amount": Number(expense.amount) || 0,
        "Status": expense.status || "PENDING",
        "Admin Remarks": expense.adminRemarks || "-",
        "Submitted At": exportDate(expense.createdAt, "yyyy-MM-dd HH:mm"),
        "Receipt URL": expense.receiptUrl || "-",
      }));
      const worksheet = XLSX.utils.json_to_sheet(rows);
      worksheet["!cols"] = [8, 28, 32, 32, 20, 20, 28, 14, 12, 14, 14, 36, 20, 48]
        .map((wch) => ({ wch }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Expenses");
      const filename = `Expense_Claims_${activeTab}_${format(
        new Date(),
        "yyyyMMdd_HHmm"
      )}.xlsx`;
      XLSX.writeFile(workbook, filename, { compression: true });

      toast.success(
        `Exported ${activeTab.toUpperCase()} expense claims to Excel`
      );
    } catch {
      toast.error("Failed to export expenses to Excel");
    } finally {
      setExporting(false);
    }
  };

  // ─── Column Definitions ─────────────────────────────────────────────────

  const columns = useMemo<ColumnDef<Expense>[]>(
    () => [
      {
        id: "employee",
        header: "Employee",
        enableSorting: true,
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{employeeName(row.original)}</p>
            {row.original.user?.email && (
              <p className="text-xs text-muted-foreground">
                {row.original.user.email}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "title",
        accessorKey: "title",
        header: "Title",
        enableSorting: true,
        cell: ({ row }) => (
          <span
            className="font-medium max-w-[180px] truncate block"
            title={row.original.title}
          >
            {row.original.title}
          </span>
        ),
      },
      {
        id: "category",
        accessorKey: "category",
        header: "Category",
        enableSorting: true,
        cell: ({ row }) => (
          <Badge variant="outline" className="text-xs">
            {row.original.category}
          </Badge>
        ),
      },
      {
        id: "expenseType",
        accessorKey: "expenseType",
        header: "Type",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-sm">{row.original.expenseType}</span>
        ),
      },
      {
        id: "projectName",
        accessorKey: "projectName",
        header: "Project",
        enableSorting: true,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {row.original.projectName || "-"}
          </span>
        ),
      },
      {
        id: "expenseDate",
        accessorKey: "expenseDate",
        header: "Date",
        enableSorting: true,
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
        enableSorting: true,
        cell: ({ row }) => (
          <span className="font-semibold">
            {row.original.currency} {Number(row.original.amount).toLocaleString()}
          </span>
        ),
      },
      {
        id: "receiptUrl",
        header: "Receipt",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.receiptUrl ? (
            <a
              href={row.original.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline text-sm"
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
        enableSorting: true,
        cell: ({ row }) => (
          <div>
            <StatusBadge status={row.original.status} />
            {row.original.adminRemarks && (
              <p
                className="text-xs text-muted-foreground mt-1 max-w-[130px] truncate"
                title={row.original.adminRemarks}
              >
                {row.original.adminRemarks}
              </p>
            )}
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.status === "PENDING" ? (
            <div className="flex items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                onClick={() => openAction(row.original, "approve")}
                className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                title="Approve"
              >
                <Check className="h-4 w-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => openAction(row.original, "reject")}
                className="h-7 w-7 text-red-500 hover:text-red-700 hover:bg-red-50"
                title="Reject"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">Done</span>
          ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const columnLabels = {
    employee: "Employee",
    title: "Title",
    category: "Category",
    expenseType: "Type",
    projectName: "Project",
    expenseDate: "Date",
    amount: "Amount",
    receiptUrl: "Receipt",
    status: "Status",
    actions: "Actions",
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Receipt className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-semibold">Expenses</h1>
            <p className="text-xs text-muted-foreground">
              Review employee expense claims and assigned work
            </p>
          </div>
        </div>
        {view === "expenses" && <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={handleExportExcel}
            disabled={exporting || expensesLoading}
            className="gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            )}
            <span>{exporting ? "Exporting..." : "Export Excel"}</span>
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={fetchExpenses}
            title="Refresh"
            disabled={expensesLoading}
          >
            <RefreshCw
              className={`h-4 w-4 ${expensesLoading ? "animate-spin" : ""}`}
            />
          </Button>
        </div>}
      </div>

      <Tabs value={view} onValueChange={setView}>
        <TabsList className="mb-4">
          <TabsTrigger value="expenses">Expense Claims</TabsTrigger>
          <TabsTrigger value="assignments">Assigned Work</TabsTrigger>
        </TabsList>
        <TabsContent value="assignments">
          <AssignWorkPage includeAllAssignments defaultAllTime />
        </TabsContent>
        <TabsContent value="expenses" className="space-y-6">
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
              <CardDescription>
                Review, approve or reject employee expenses
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All ({expenses.length})</TabsTrigger>
              <TabsTrigger value="pending">Pending ({pending})</TabsTrigger>
              <TabsTrigger value="approved">Approved ({approved})</TabsTrigger>
              <TabsTrigger value="rejected">Rejected ({rejected})</TabsTrigger>
            </TabsList>

            {employeeFilters.controls}
            <TabsContent value={activeTab}>
              {expensesLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable
                  columns={columns}
                  data={pageData}
                  pageCount={pageCount}
                  state={tableState}
                  setState={setTableState}
                  columnLabels={columnLabels}
                />
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>

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
                  {employeeName(actionDialog.expense)} —{" "}
                  {actionDialog.expense.title} ({actionDialog.expense.currency}{" "}
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
