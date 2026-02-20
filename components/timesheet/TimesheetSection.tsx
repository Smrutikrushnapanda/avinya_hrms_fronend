"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef } from "@tanstack/react-table";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  MessageSquarePlus,
} from "lucide-react";

import { addTimesheetRemark, getTimesheets } from "@/app/api/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type TimesheetRow = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  hours: string;
  projectName: string;
  clientName: string;
  workDescription: string;
  employeeRemark: string;
  managerRemark: string;
  employeeName?: string;
  employeeCode?: string;
};

type TimesheetSectionProps = {
  title: string;
  description?: string;
  organizationId: string;
  employeeId?: string;
  showEmployee?: boolean;
  canRemark?: boolean;
  managerId?: string;
  allowEdit?: boolean;
};

function formatDisplayDate(dateStr?: string): string {
  if (!dateStr) return "--";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatTime(isoStr?: string): string {
  if (!isoStr) return "--";
  const date = new Date(isoStr);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function formatMinutes(minutes?: number): string {
  if (!minutes || minutes <= 0) return "--";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

export default function TimesheetSection({
  title,
  description,
  organizationId,
  employeeId,
  showEmployee = false,
  canRemark = false,
  managerId,
  allowEdit = false,
}: TimesheetSectionProps) {
  const router = useRouter();
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth());
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [rows, setRows] = useState<TimesheetRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [tableState, setTableState] = useState({
    page: 0,
    pageSize: 10,
    search: "",
    sorting: [] as any,
  });

  const [remarkDialogOpen, setRemarkDialogOpen] = useState(false);
  const [remarkTarget, setRemarkTarget] = useState<TimesheetRow | null>(null);
  const [remarkText, setRemarkText] = useState("");
  const [remarkSaving, setRemarkSaving] = useState(false);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear((y) => y - 1);
    } else {
      setSelectedMonth((m) => m - 1);
    }
  };

  const isNextDisabled = useMemo(() => {
    const now = new Date();
    return selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
  }, [selectedMonth, selectedYear]);

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear((y) => y + 1);
    } else {
      setSelectedMonth((m) => m + 1);
    }
  };

  const fetchTimesheets = useCallback(async () => {
    if (!organizationId || !employeeId) {
      setLoading(false);
      setRows([]);
      return;
    }

    setIsRefreshing(true);
    try {
      const fromDate = new Date(selectedYear, selectedMonth, 1);
      const toDate = new Date(selectedYear, selectedMonth + 1, 0);
      const params = {
        organizationId,
        employeeId,
        fromDate: fromDate.toISOString().split("T")[0],
        toDate: toDate.toISOString().split("T")[0],
        page: 1,
        limit: 200,
      };
      const res = await getTimesheets(params);
      const list = res.data?.results || [];

      const mapped: TimesheetRow[] = list.map((entry: any) => {
        const employee = entry.employee || {};
        const employeeName = [employee.firstName, employee.middleName, employee.lastName]
          .filter(Boolean)
          .join(" ");
        return {
          id: entry.id,
          date: entry.date,
          startTime: entry.startTime,
          endTime: entry.endTime,
          hours: formatMinutes(entry.workingMinutes),
          projectName: entry.projectName || "--",
          clientName: entry.clientName || "--",
          workDescription: entry.workDescription || "--",
          employeeRemark: entry.employeeRemark || "--",
          managerRemark: entry.managerRemark || "--",
          employeeName,
          employeeCode: employee.employeeCode || "",
        };
      });

      setRows(mapped);
      setTableState((prev) => ({ ...prev, page: 0 }));
    } catch (error) {
      console.error("Failed to load timesheets:", error);
      setRows([]);
    } finally {
      setIsRefreshing(false);
      setLoading(false);
    }
  }, [organizationId, employeeId, selectedMonth, selectedYear]);

  useEffect(() => {
    setLoading(true);
    fetchTimesheets();
  }, [fetchTimesheets]);

  const filteredRows = useMemo(() => {
    const q = tableState.search.toLowerCase().trim();
    if (!q) return rows;
    return rows.filter((row) => {
      return (
        row.date.toLowerCase().includes(q) ||
        row.projectName.toLowerCase().includes(q) ||
        row.clientName.toLowerCase().includes(q) ||
        row.workDescription.toLowerCase().includes(q) ||
        row.employeeRemark.toLowerCase().includes(q) ||
        row.managerRemark.toLowerCase().includes(q) ||
        (row.employeeName || "").toLowerCase().includes(q)
      );
    });
  }, [rows, tableState.search]);

  const paginatedData = useMemo(() => {
    const start = tableState.page * tableState.pageSize;
    return filteredRows.slice(start, start + tableState.pageSize);
  }, [filteredRows, tableState.page, tableState.pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredRows.length / tableState.pageSize));

  const columns = useMemo<ColumnDef<TimesheetRow>[]>(() => {
    const base: ColumnDef<TimesheetRow>[] = [
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => <span className="text-sm font-medium">{formatDisplayDate(row.original.date)}</span>,
      },
      {
        accessorKey: "startTime",
        header: "Start",
        cell: ({ row }) => <span className="text-sm">{formatTime(row.original.startTime)}</span>,
      },
      {
        accessorKey: "endTime",
        header: "End",
        cell: ({ row }) => <span className="text-sm">{formatTime(row.original.endTime)}</span>,
      },
      {
        accessorKey: "hours",
        header: "Hours",
        cell: ({ row }) => <span className="text-sm font-semibold">{row.original.hours}</span>,
      },
      {
        accessorKey: "projectName",
        header: "Project",
        cell: ({ row }) => <span className="text-sm">{row.original.projectName}</span>,
      },
      {
        accessorKey: "clientName",
        header: "Client",
        cell: ({ row }) => <span className="text-sm">{row.original.clientName}</span>,
      },
      {
        accessorKey: "workDescription",
        header: "Work Summary",
        cell: ({ row }) => (
          <div className="max-w-[260px] text-sm text-muted-foreground">
            {row.original.workDescription}
          </div>
        ),
      },
      {
        accessorKey: "employeeRemark",
        header: "Employee Remark",
        cell: ({ row }) => (
          <div className="max-w-[200px] text-sm text-muted-foreground">
            {row.original.employeeRemark}
          </div>
        ),
      },
      {
        accessorKey: "managerRemark",
        header: "Manager Remark",
        cell: ({ row }) => (
          <div className="max-w-[200px] text-sm text-muted-foreground">
            {row.original.managerRemark}
          </div>
        ),
      },
    ];

    if (showEmployee) {
      base.unshift({
        accessorKey: "employeeName",
        header: "Employee",
        cell: ({ row }) => (
          <div className="text-sm">
            <div className="font-medium">{row.original.employeeName || "--"}</div>
            {row.original.employeeCode ? (
              <div className="text-xs text-muted-foreground">{row.original.employeeCode}</div>
            ) : null}
          </div>
        ),
      });
    }

    if (canRemark) {
      base.push({
        id: "actions",
        header: "Action",
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={!managerId}
            onClick={() => {
              setRemarkTarget(row.original);
              setRemarkText(row.original.managerRemark === "--" ? "" : row.original.managerRemark);
              setRemarkDialogOpen(true);
            }}
          >
            <MessageSquarePlus className="h-4 w-4" />
            {row.original.managerRemark === "--" ? "Add Remark" : "Edit Remark"}
          </Button>
        ),
      });
    }

    if (allowEdit) {
      base.push({
        id: "edit",
        header: "Edit",
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const params = new URLSearchParams();
              params.set("date", row.original.date);
              params.set("startTime", row.original.startTime);
              params.set("endTime", row.original.endTime);
              if (row.original.clientName && row.original.clientName !== "--") {
                params.set("clientName", row.original.clientName);
              }
              if (row.original.projectName && row.original.projectName !== "--") {
                params.set("projectName", row.original.projectName);
              }
              if (row.original.workDescription && row.original.workDescription !== "--") {
                params.set("workDescription", row.original.workDescription);
              }
              if (row.original.employeeRemark && row.original.employeeRemark !== "--") {
                params.set("employeeRemark", row.original.employeeRemark);
              }
              router.push(`/user/timesheet/add?${params.toString()}`);
            }}
          >
            Edit
          </Button>
        ),
      });
    }

    return base;
  }, [showEmployee, canRemark, managerId, allowEdit, router]);

  const handleSaveRemark = async () => {
    if (!remarkTarget || !managerId) return;
    if (!remarkText.trim()) {
      toast.error("Please enter a remark");
      return;
    }
    setRemarkSaving(true);
    try {
      await addTimesheetRemark(remarkTarget.id, {
        managerId,
        remark: remarkText.trim(),
      });
      setRows((prev) =>
        prev.map((row) =>
          row.id === remarkTarget.id
            ? { ...row, managerRemark: remarkText.trim() }
            : row
        )
      );
      toast.success("Remark saved");
      setRemarkDialogOpen(false);
      setRemarkTarget(null);
      setRemarkText("");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save remark");
    } finally {
      setRemarkSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading timesheets...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-background text-sm font-semibold min-w-[160px] justify-center">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              {monthNames[selectedMonth]} {selectedYear}
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isNextDisabled}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          {isRefreshing ? <span className="text-xs text-muted-foreground">Refreshing...</span> : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timesheet Entries</CardTitle>
          <CardDescription>
            {filteredRows.length > 0
              ? `Showing ${filteredRows.length} record${filteredRows.length !== 1 ? "s" : ""} for ${monthNames[selectedMonth]} ${selectedYear}`
              : `No timesheet records found for ${monthNames[selectedMonth]} ${selectedYear}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={paginatedData}
            pageCount={pageCount}
            state={tableState}
            setState={(s) => setTableState(s)}
          />
        </CardContent>
      </Card>

      <Dialog open={remarkDialogOpen} onOpenChange={setRemarkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manager Remark</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={remarkTarget?.employeeName || ""} disabled />
            <Textarea
              rows={4}
              placeholder="Add your remark for this day's work"
              value={remarkText}
              onChange={(e) => setRemarkText(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRemarkDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveRemark} disabled={remarkSaving}>
              {remarkSaving ? "Saving..." : "Save Remark"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
