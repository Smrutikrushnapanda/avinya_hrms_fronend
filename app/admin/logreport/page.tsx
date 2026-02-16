"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/ui/data-table";
import { Switch } from "@/components/ui/switch";
import { Download } from "lucide-react";
import { getLogReports, getLogReportSettings, updateLogReportSettings, getProfile, getEmployees } from "@/app/api/api";
import { toast } from "sonner";
import * as XLSX from "xlsx";

export default function LogReportPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    userId: "all",
    actionType: "",
    module: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [tableState, setTableState] = useState({
    page: 0,
    pageSize: 20,
    search: "",
    sorting: [],
  });
  const [total, setTotal] = useState(0);
  const [loggingEnabled, setLoggingEnabled] = useState(true);
  const [savingToggle, setSavingToggle] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const profile = await getProfile();
        const orgId = profile.data?.organizationId;
        if (!orgId) return;
        setOrganizationId(orgId);
        const empRes = await getEmployees(orgId);
        setEmployees(empRes.data || empRes.data?.data || []);

        const settingsRes = await getLogReportSettings(orgId);
        setLoggingEnabled(settingsRes.data?.isEnabled ?? true);
      } catch (error) {
        toast.error("Failed to load organization info");
      }
    };
    init();
  }, []);

  const fetchLogs = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const params: any = {
        organizationId,
        page: tableState.page + 1,
        limit: tableState.pageSize,
      };
      if (appliedFilters.from) params.from = appliedFilters.from;
      if (appliedFilters.to) params.to = appliedFilters.to;
      if (appliedFilters.userId !== "all") params.userId = appliedFilters.userId;
      if (appliedFilters.actionType.trim()) params.actionType = appliedFilters.actionType.trim();
      if (appliedFilters.module.trim()) params.module = appliedFilters.module.trim();
      if (tableState.search.trim()) params.search = tableState.search.trim();

      const res = await getLogReports(params);
      setLogs(res.data?.data || []);
      setTotal(res.data?.total || 0);
    } catch (error) {
      toast.error("Failed to load logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) {
      fetchLogs();
    }
  }, [
    organizationId,
    appliedFilters,
    tableState.page,
    tableState.pageSize,
    tableState.search,
  ]);

  const logColumns = useMemo(
    () => [
      {
        accessorKey: "createdAt",
        header: "Date/Time",
        cell: ({ row }: any) =>
          new Date(row.original.createdAt).toLocaleString(),
      },
      {
        accessorKey: "userName",
        header: "User",
        cell: ({ row }: any) => row.original.userName || "-",
      },
      { accessorKey: "actionType", header: "Action" },
      { accessorKey: "module", header: "Module" },
      {
        accessorKey: "ipAddress",
        header: "IP Address",
        cell: ({ row }: any) => row.original.ipAddress || "-",
      },
      {
        accessorKey: "description",
        header: "Description",
        cell: ({ row }: any) => row.original.description || "-",
      },
    ],
    []
  );

  const handleToggleLogging = async (checked: boolean) => {
    if (!organizationId) return;
    try {
      setSavingToggle(true);
      setLoggingEnabled(checked);
      await updateLogReportSettings(organizationId, { isEnabled: checked });
      toast.success(checked ? "Log report activated" : "Log report deactivated");
    } catch (error) {
      toast.error("Failed to update log settings");
    } finally {
      setSavingToggle(false);
    }
  };

  const exportLogs = (format: "csv" | "xlsx") => {
    if (!logs.length) {
      toast.error("No logs to export");
      return;
    }
    const rows = logs.map((log) => ({
      Date: new Date(log.createdAt).toLocaleString(),
      User: log.userName || "",
      Action: log.actionType || "",
      Module: log.module || "",
      "IP Address": log.ipAddress || "",
      Description: log.description || "",
    }));
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Log Report");
    const ts = new Date().toISOString().slice(0, 10);
    if (format === "csv") {
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Log_Report_${ts}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } else {
      XLSX.writeFile(workbook, `Log_Report_${ts}.xlsx`);
    }
  };

  return (
    <div className="p-6">
      <Card>
        <CardHeader>
          <CardTitle>Log Report</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Log Report Status</div>
                <div className="text-xs text-muted-foreground">
                  {loggingEnabled ? "Active (logging enabled)" : "Inactive (logging disabled)"}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm">{loggingEnabled ? "Active" : "Inactive"}</span>
                <Switch checked={loggingEnabled} onCheckedChange={handleToggleLogging} disabled={savingToggle} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>From</Label>
                <Input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>To</Label>
                <Input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>User</Label>
                <Select value={filters.userId} onValueChange={(v) => setFilters({ ...filters, userId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Users" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    {employees.map((emp: any) => (
                      <SelectItem key={emp.userId} value={emp.userId}>
                        {emp.firstName} {emp.lastName || ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Action Type</Label>
                <Input value={filters.actionType} onChange={(e) => setFilters({ ...filters, actionType: e.target.value })} placeholder="CREATE, UPDATE..." />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Module</Label>
                <Input value={filters.module} onChange={(e) => setFilters({ ...filters, module: e.target.value })} placeholder="employees, attendance..." />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    setAppliedFilters(filters);
                    setTableState((prev) => ({ ...prev, page: 0 }));
                  }}
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Apply Filters"}
                </Button>
              </div>
              <div className="flex gap-2 md:justify-end md:col-span-2">
                <Button variant="outline" onClick={() => exportLogs("csv")}>
                  <Download className="w-4 h-4 mr-2" /> Export CSV
                </Button>
                <Button variant="outline" onClick={() => exportLogs("xlsx")}>
                  <Download className="w-4 h-4 mr-2" /> Export Excel
                </Button>
              </div>
            </div>
          </div>

          <DataTable
            columns={logColumns}
            data={logs}
            pageCount={Math.max(1, Math.ceil(total / tableState.pageSize))}
            state={tableState}
            setState={setTableState}
          />
        </CardContent>
      </Card>
    </div>
  );
}
