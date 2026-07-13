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
  Plane,
  Paperclip,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
  getMyOfficeTrips,
  createOfficeTrip,
  deleteOfficeTrip,
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

const TRIP_TYPE_OPTIONS = [
  { value: "OFFICE_TRIP", label: "Office Trip" },
  { value: "CLIENT_VISIT", label: "Client Visit" },
  { value: "OTHER", label: "Other" },
];

const TRIP_TYPE_LABELS: Record<string, string> = {
  OFFICE_TRIP: "Office Trip",
  CLIENT_VISIT: "Client Visit",
  OTHER: "Other",
};

const ATTACHMENT_TYPE_OPTIONS = [
  { value: "TRAVEL_TICKET", label: "Travel Ticket" },
  { value: "APPROVAL_LETTER", label: "Approval Letter" },
  { value: "CLIENT_INVITATION", label: "Client Invitation" },
  { value: "OTHER", label: "Other Document" },
];

const ATTACHMENT_TYPE_LABELS: Record<string, string> = {
  TRAVEL_TICKET: "Travel Ticket",
  APPROVAL_LETTER: "Approval Letter",
  CLIENT_INVITATION: "Client Invitation",
  OTHER: "Other Document",
};

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

interface OfficeTripAttachment {
  type: string;
  url: string;
  fileName: string;
}

interface OfficeTrip {
  id: string;
  tripType: string;
  tripTypeOther?: string | null;
  fromDate: string;
  toDate: string;
  startTime?: string | null;
  endTime?: string | null;
  clientOfficeName: string;
  location: string;
  purpose: string;
  description?: string | null;
  attachments: OfficeTripAttachment[];
  status: string;
  adminRemarks?: string | null;
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

  const today = format(new Date(), "yyyy-MM-dd");

  // ═══ Expenses tab state ═══
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");

  const [tableState, setTableState] = useState<TableState>({
    page: 0,
    pageSize: 10,
    search: "",
    sorting: [],
  });

  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

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

  // ═══ Office Trip / Client Visit tab state ═══
  const [officeTrips, setOfficeTrips] = useState<OfficeTrip[]>([]);
  const [officeTripsLoading, setOfficeTripsLoading] = useState(false);
  const [tripStatusFilter, setTripStatusFilter] = useState("all");

  const [tripTableState, setTripTableState] = useState<TableState>({
    page: 0,
    pageSize: 10,
    search: "",
    sorting: [],
  });

  const [tripDialogOpen, setTripDialogOpen] = useState(false);
  const [tripSubmitting, setTripSubmitting] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [pendingAttachmentType, setPendingAttachmentType] = useState("TRAVEL_TICKET");

  const [tripForm, setTripForm] = useState({
    tripType: "",
    tripTypeOther: "",
    fromDate: today,
    toDate: today,
    startTime: "",
    endTime: "",
    clientOfficeName: "",
    location: "",
    purpose: "",
    description: "",
    attachments: [] as OfficeTripAttachment[],
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

  // ─── Fetch office trips ─────────────────────────────────────────────────

  const fetchOfficeTrips = useCallback(async () => {
    if (!userId) return;
    setOfficeTripsLoading(true);
    try {
      const res = await getMyOfficeTrips(userId);
      setOfficeTrips(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load office trip requests");
    } finally {
      setOfficeTripsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (profile) fetchOfficeTrips();
  }, [profile, fetchOfficeTrips]);

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

  // ─── Upload trip attachment ─────────────────────────────────────────────

  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Attachment must be under 10MB");
      return;
    }
    setUploadingAttachment(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadFile(fd, { path: "office-trips", public: "true" });
      setTripForm((prev) => ({
        ...prev,
        attachments: [
          ...prev.attachments,
          { type: pendingAttachmentType, url: res.data.url, fileName: file.name },
        ],
      }));
      toast.success("Attachment uploaded");
    } catch {
      toast.error("Failed to upload attachment");
    } finally {
      setUploadingAttachment(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (index: number) => {
    setTripForm((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  // ─── Submit office trip ─────────────────────────────────────────────────

  const resetTripForm = () => {
    setTripForm({
      tripType: "",
      tripTypeOther: "",
      fromDate: today,
      toDate: today,
      startTime: "",
      endTime: "",
      clientOfficeName: "",
      location: "",
      purpose: "",
      description: "",
      attachments: [],
    });
    setPendingAttachmentType("TRAVEL_TICKET");
  };

  const handleTripSubmit = async () => {
    if (!tripForm.tripType) { toast.error("Please select a trip type"); return; }
    if (tripForm.tripType === "OTHER" && !tripForm.tripTypeOther.trim()) {
      toast.error("Please specify the trip type");
      return;
    }
    if (!tripForm.fromDate) { toast.error("Please select a From Date"); return; }
    if (!tripForm.toDate) { toast.error("Please select a To Date"); return; }
    if (tripForm.toDate < tripForm.fromDate) {
      toast.error("To Date cannot be before From Date");
      return;
    }
    if (!tripForm.clientOfficeName.trim()) { toast.error("Please enter the Client/Office Name"); return; }
    if (!tripForm.location.trim()) { toast.error("Please enter the Location/City"); return; }
    if (!tripForm.purpose.trim()) { toast.error("Please enter the Purpose of Visit"); return; }

    setTripSubmitting(true);
    try {
      await createOfficeTrip(userId, {
        tripType: tripForm.tripType,
        tripTypeOther: tripForm.tripType === "OTHER" ? tripForm.tripTypeOther.trim() : undefined,
        fromDate: tripForm.fromDate,
        toDate: tripForm.toDate,
        startTime: tripForm.startTime || undefined,
        endTime: tripForm.endTime || undefined,
        clientOfficeName: tripForm.clientOfficeName.trim(),
        location: tripForm.location.trim(),
        purpose: tripForm.purpose.trim(),
        description: tripForm.description.trim() || undefined,
        attachments: tripForm.attachments,
        organizationId: profile.organizationId,
      });
      toast.success("Office trip / client visit request submitted");
      setTripDialogOpen(false);
      resetTripForm();
      fetchOfficeTrips();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to submit request");
    } finally {
      setTripSubmitting(false);
    }
  };

  const handleTripDelete = async (id: string) => {
    if (!confirm("Delete this office trip / client visit request?")) return;
    try {
      await deleteOfficeTrip(id, userId);
      toast.success("Request deleted");
      fetchOfficeTrips();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete request");
    }
  };

  // ─── Expense table columns ──────────────────────────────────────────────

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

  // ─── Office trip table columns ──────────────────────────────────────────

  const tripColumns = useMemo<ColumnDef<OfficeTrip>[]>(
    () => [
      {
        id: "tripType",
        header: "Trip Type",
        enableSorting: false,
        cell: ({ row }) => (
          <Badge variant="outline" className="gap-1">
            <Plane className="h-3 w-3" />
            {row.original.tripType === "OTHER"
              ? row.original.tripTypeOther || "Other"
              : TRIP_TYPE_LABELS[row.original.tripType] || row.original.tripType}
          </Badge>
        ),
      },
      {
        id: "clientOfficeName",
        accessorKey: "clientOfficeName",
        header: "Client / Office",
        enableSorting: false,
        cell: ({ row }) => row.original.clientOfficeName,
      },
      {
        id: "location",
        accessorKey: "location",
        header: "Location",
        enableSorting: false,
        cell: ({ row }) => row.original.location,
      },
      {
        id: "dates",
        header: "From – To",
        enableSorting: false,
        cell: ({ row }) => {
          try {
            const from = format(new Date(row.original.fromDate), "dd MMM yyyy");
            const to = format(new Date(row.original.toDate), "dd MMM yyyy");
            return from === to ? from : `${from} – ${to}`;
          } catch {
            return "-";
          }
        },
      },
      {
        id: "purpose",
        header: "Purpose",
        enableSorting: false,
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground line-clamp-1 max-w-[220px] block">
            {row.original.purpose}
          </span>
        ),
      },
      {
        id: "status",
        accessorKey: "status",
        header: "Status",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="space-y-1">
            <StatusBadge status={row.original.status} />
            {row.original.adminRemarks && (
              <p className="text-xs text-muted-foreground max-w-[180px]">
                {row.original.adminRemarks}
              </p>
            )}
          </div>
        ),
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
              onClick={() => handleTripDelete(row.original.id)}
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

  // ─── Filter & paginate: expenses ────────────────────────────────────────

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

  // ─── Filter & paginate: office trips ────────────────────────────────────

  const tripFiltered = useMemo(
    () =>
      tripStatusFilter === "all"
        ? officeTrips
        : officeTrips.filter(
            (t) => t.status?.toLowerCase() === tripStatusFilter.toLowerCase()
          ),
    [officeTrips, tripStatusFilter]
  );

  const tripSearched = useMemo(() => {
    const q = tripTableState.search.toLowerCase().trim();
    if (!q) return tripFiltered;
    return tripFiltered.filter(
      (t) =>
        t.clientOfficeName.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.purpose.toLowerCase().includes(q)
    );
  }, [tripFiltered, tripTableState.search]);

  const tripPageCount = Math.max(1, Math.ceil(tripSearched.length / tripTableState.pageSize));
  const tripPageData = tripSearched.slice(
    tripTableState.page * tripTableState.pageSize,
    (tripTableState.page + 1) * tripTableState.pageSize
  );

  // ─── Summary stats ──────────────────────────────────────────────────────

  const totalAmount = expenses
    .filter((e) => e.status !== "REJECTED")
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const pending = expenses.filter((e) => e.status === "PENDING").length;
  const approved = expenses.filter((e) => e.status === "APPROVED").length;

  const tripPending = officeTrips.filter((t) => t.status === "PENDING").length;
  const tripApproved = officeTrips.filter((t) => t.status === "APPROVED").length;
  const tripRejected = officeTrips.filter((t) => t.status === "REJECTED").length;

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
      <div className="flex items-center gap-3">
        <Receipt className="h-7 w-7 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Expenses & Travels</h1>
          <p className="text-xs text-muted-foreground">
            Submit and track your expense claims and office trip / client visit requests
          </p>
        </div>
      </div>

      <Tabs defaultValue="expenses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="office-trips">Office Trip / Client Visit</TabsTrigger>
        </TabsList>

        {/* ═══════════════════════ Expenses Tab ═══════════════════════ */}
        <TabsContent value="expenses" className="space-y-6">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="icon" onClick={fetchExpenses} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Expense
            </Button>
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
        </TabsContent>

        {/* ═══════════════════ Office Trip / Client Visit Tab ═══════════════════ */}
        <TabsContent value="office-trips" className="space-y-6">
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="icon" onClick={fetchOfficeTrips} title="Refresh">
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => setTripDialogOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Trip Request
            </Button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="p-5">
              <p className="text-xs text-muted-foreground mb-1">Pending</p>
              <p className="text-2xl font-bold text-amber-600">{tripPending}</p>
              <p className="text-xs text-muted-foreground">awaiting admin decision</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-muted-foreground mb-1">Approved</p>
              <p className="text-2xl font-bold text-green-600">{tripApproved}</p>
              <p className="text-xs text-muted-foreground">attendance validation bypassed</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-muted-foreground mb-1">Rejected</p>
              <p className="text-2xl font-bold text-red-600">{tripRejected}</p>
              <p className="text-xs text-muted-foreground">no bypass applied</p>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Plane className="h-5 w-5" />
                  My Office Trip / Client Visit Requests
                </CardTitle>
                <CardDescription>
                  While approved, punches are allowed from any location for the trip window
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={tripStatusFilter} onValueChange={setTripStatusFilter}>
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
              {officeTripsLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <DataTable
                  columns={tripColumns}
                  data={tripPageData}
                  pageCount={tripPageCount}
                  state={tripTableState}
                  setState={setTripTableState}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

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
              loading={submitting}
              disabled={uploadingReceipt}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Submit Expense
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Office Trip / Client Visit Dialog */}
      <Dialog
        open={tripDialogOpen}
        onOpenChange={(open) => {
          setTripDialogOpen(open);
          if (!open) resetTripForm();
        }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex flex-col items-center text-center gap-2 pb-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Plane className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle>Office Trip / Client Visit Request</DialogTitle>
              <DialogDescription>
                Attendance validation (location, Wi-Fi) is bypassed for the dates below once submitted
              </DialogDescription>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Trip Type */}
            <div className="space-y-2">
              <Label>Trip Type</Label>
              <Select
                value={tripForm.tripType}
                onValueChange={(v) => setTripForm((p) => ({ ...p, tripType: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select trip type" />
                </SelectTrigger>
                <SelectContent>
                  {TRIP_TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {tripForm.tripType === "OTHER" && (
                <Input
                  placeholder="Please specify"
                  value={tripForm.tripTypeOther}
                  onChange={(e) =>
                    setTripForm((p) => ({ ...p, tripTypeOther: e.target.value }))
                  }
                />
              )}
            </div>

            {/* From / To Date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>From Date</Label>
                <Input
                  type="date"
                  value={tripForm.fromDate}
                  onChange={(e) =>
                    setTripForm((p) => ({ ...p, fromDate: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>To Date</Label>
                <Input
                  type="date"
                  value={tripForm.toDate}
                  min={tripForm.fromDate}
                  onChange={(e) =>
                    setTripForm((p) => ({ ...p, toDate: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Start / End Time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>
                  Start Time{" "}
                  <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  type="time"
                  value={tripForm.startTime}
                  onChange={(e) =>
                    setTripForm((p) => ({ ...p, startTime: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>
                  End Time{" "}
                  <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  type="time"
                  value={tripForm.endTime}
                  onChange={(e) =>
                    setTripForm((p) => ({ ...p, endTime: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Client/Office Name */}
            <div className="space-y-2">
              <Label>Client / Office Name</Label>
              <Input
                placeholder="e.g. Acme Corp HQ"
                value={tripForm.clientOfficeName}
                onChange={(e) =>
                  setTripForm((p) => ({ ...p, clientOfficeName: e.target.value }))
                }
              />
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label>Location / City</Label>
              <Input
                placeholder="e.g. Mumbai"
                value={tripForm.location}
                onChange={(e) =>
                  setTripForm((p) => ({ ...p, location: e.target.value }))
                }
              />
            </div>

            {/* Purpose */}
            <div className="space-y-2">
              <Label>Purpose of Visit</Label>
              <Textarea
                placeholder="Briefly describe the purpose of the trip"
                value={tripForm.purpose}
                onChange={(e) =>
                  setTripForm((p) => ({ ...p, purpose: e.target.value }))
                }
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>
                Description / Remarks{" "}
                <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Textarea
                placeholder="Any additional details"
                value={tripForm.description}
                onChange={(e) =>
                  setTripForm((p) => ({ ...p, description: e.target.value }))
                }
              />
            </div>

            {/* Attachments */}
            <div className="space-y-2">
              <Label>
                Attachments{" "}
                <span className="text-muted-foreground text-xs">
                  (optional, max 10MB each — travel ticket, approval letter, client invitation, etc.)
                </span>
              </Label>

              {tripForm.attachments.length > 0 && (
                <div className="space-y-1">
                  {tripForm.attachments.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 p-2 border rounded-md bg-green-50 dark:bg-green-950"
                    >
                      <Paperclip className="h-4 w-4 text-green-600 shrink-0" />
                      <span className="text-xs text-green-700 shrink-0">
                        {ATTACHMENT_TYPE_LABELS[a.type] || a.type}:
                      </span>
                      <span className="text-sm text-green-700 flex-1 truncate">
                        {a.fileName}
                      </span>
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 text-xs hover:underline shrink-0"
                      >
                        View
                      </a>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="text-red-500 text-xs hover:underline shrink-0"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2">
                <Select
                  value={pendingAttachmentType}
                  onValueChange={setPendingAttachmentType}
                >
                  <SelectTrigger className="w-[170px] shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ATTACHMENT_TYPE_OPTIONS.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="relative flex-1">
                  <Input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleAttachmentUpload}
                    disabled={uploadingAttachment}
                    className="cursor-pointer"
                  />
                  {uploadingAttachment && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60 rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setTripDialogOpen(false);
                resetTripForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleTripSubmit}
              loading={tripSubmitting}
              disabled={uploadingAttachment}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
