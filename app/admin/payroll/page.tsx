"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Download, Plus, Pencil, Send, Mail, Smartphone, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import {
  getProfile,
  getEmployees,
  getPayrollRecords,
  createPayrollRecord,
  updatePayrollRecord,
  downloadPayrollSlip,
  getPayrollSettings,
  updatePayrollSettings,
  sendPayslip,
} from "@/app/api/api";

type PayrollStatus = "draft" | "processed" | "paid";

interface PayrollRecord {
  id: string;
  employeeId: string;
  payPeriod: string;
  periodStart: string;
  periodEnd: string;
  basic: number;
  hra: number;
  conveyance: number;
  otherAllowances: number;
  pf: number;
  tds: number;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  status: PayrollStatus;
  employee?: {
    firstName: string;
    lastName?: string;
    employeeCode?: string;
    workEmail?: string;
  };
}

interface PayrollSettings {
  companyName?: string;
  address?: string;
  logoUrl?: string;
  primaryColor?: string;
  footerNote?: string;
}

const emptyForm = {
  employeeId: "",
  periodStart: "",
  periodEnd: "",
  status: "draft" as PayrollStatus,
  basic: 0,
  hra: 0,
  conveyance: 0,
  otherAllowances: 0,
  pf: 0,
  tds: 0,
};

export default function PayrollPage() {
  const [organizationId, setOrganizationId] = useState<string>("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"all" | "monthly" | "range">("all");
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PayrollRecord | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  const [settings, setSettings] = useState<PayrollSettings>({});
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const profile = await getProfile();
        const orgId = profile.data?.organizationId;
        if (!orgId) return;
        setOrganizationId(orgId);

        const empRes = await getEmployees(orgId);
        setEmployees(empRes.data?.data || empRes.data || []);

        const settingsRes = await getPayrollSettings(orgId);
        setSettings(settingsRes.data || {});
      } catch (error) {
        toast.error("Failed to load payroll data");
      }
    };
    init();
  }, []);

  const fetchRecords = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const params: any = {
        organizationId,
        status: statusFilter,
        search: search.trim(),
        page: 1,
        limit: 200,
      };
      if (mode === "monthly") {
        params.month = month;
        params.year = year;
      } else if (mode === "range") {
        if (from) params.from = from;
        if (to) params.to = to;
      }
      const res = await getPayrollRecords(params);
      setRecords(res.data?.data || []);
    } catch (error) {
      toast.error("Failed to load payroll records");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (organizationId) fetchRecords();
  }, [organizationId]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...emptyForm });
    setIsDialogOpen(true);
  };

  const openEdit = (record: PayrollRecord) => {
    setEditing(record);
    setForm({
      employeeId: record.employeeId,
      periodStart: record.periodStart?.slice(0, 10),
      periodEnd: record.periodEnd?.slice(0, 10),
      status: record.status,
      basic: Number(record.basic),
      hra: Number(record.hra),
      conveyance: Number(record.conveyance),
      otherAllowances: Number(record.otherAllowances),
      pf: Number(record.pf),
      tds: Number(record.tds),
    });
    setIsDialogOpen(true);
  };

  const calcTotals = () => {
    const totalEarnings = Number(form.basic) + Number(form.hra) + Number(form.conveyance) + Number(form.otherAllowances);
    const totalDeductions = Number(form.pf) + Number(form.tds);
    const netPay = totalEarnings - totalDeductions;
    return { totalEarnings, totalDeductions, netPay };
  };

  const normalizeNumberInput = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length <= 1) return cleaned;
    return `${parts[0]}.${parts.slice(1).join("")}`;
  };

  const handleSave = async () => {
    if (!organizationId) return;
    if (!form.employeeId || !form.periodStart || !form.periodEnd) {
      toast.error("Employee and period are required");
      return;
    }
    const payPeriod = form.periodStart.slice(0, 7);
    const payload: any = {
      organizationId,
      employeeId: form.employeeId,
      payPeriod,
      periodStart: new Date(form.periodStart).toISOString(),
      periodEnd: new Date(form.periodEnd).toISOString(),
      basic: Number(form.basic),
      hra: Number(form.hra),
      conveyance: Number(form.conveyance),
      otherAllowances: Number(form.otherAllowances),
      pf: Number(form.pf),
      tds: Number(form.tds),
      status: form.status,
    };

    try {
      if (editing) {
        await updatePayrollRecord(editing.id, payload);
        toast.success("Payroll updated");
      } else {
        await createPayrollRecord(payload);
        toast.success("Payroll created");
      }
      setIsDialogOpen(false);
      // Align filters to the created/updated period so the record appears
      const periodDate = new Date(form.periodStart);
      setMode("monthly");
      setMonth(periodDate.getMonth() + 1);
      setYear(periodDate.getFullYear());
      setFrom("");
      setTo("");
      fetchRecords();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save payroll");
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const res = await downloadPayrollSlip(id);
      const blob = new Blob([res.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `salary-slip-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Failed to download slip");
    }
  };

  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleSend = async (record: PayrollRecord, method: 'email' | 'in_app' | 'both') => {
    try {
      setSendingId(record.id);
      const res = await sendPayslip(record.id, method);
      const msg = res.data?.message || "Payslip sent to employee";
      toast.success(msg);
      fetchRecords();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to send payslip");
    } finally {
      setSendingId(null);
    }
  };

  const handleSaveSettings = async () => {
    if (!organizationId) return;
    try {
      setSavingSettings(true);
      await updatePayrollSettings(organizationId, settings);
      toast.success("Payroll configuration updated");
    } catch (error) {
      toast.error("Failed to update configuration");
    } finally {
      setSavingSettings(false);
    }
  };

  const totals = useMemo(calcTotals, [form]);

  return (
    <div className="p-6 space-y-6">
      <Tabs defaultValue="payroll" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="settings">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="payroll" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Payroll Management</CardTitle>
                <CardDescription>Generate payroll and download salary slips</CardDescription>
              </div>
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> Add Payroll
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                <div className="md:col-span-2">
                  <Label>Search</Label>
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or code" />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="processed">Processed</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Mode</Label>
                <Select value={mode} onValueChange={(v: any) => setMode(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Monthly" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="range">Date Range</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {mode === "monthly" ? (
                <>
                    <div>
                      <Label>Month</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={String(month ?? 0)}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                          const next = digitsOnly === "" ? 0 : Number(digitsOnly);
                          setMonth(next);
                        }}
                      />
                    </div>
                    <div>
                      <Label>Year</Label>
                      <Input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={String(year ?? 0)}
                        onChange={(e) => {
                          const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
                          const next = digitsOnly === "" ? 0 : Number(digitsOnly);
                          setYear(next);
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <Label>From</Label>
                      <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
                    </div>
                    <div>
                      <Label>To</Label>
                      <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
                    </div>
                  </>
                )}
              </div>
              <Button onClick={fetchRecords} disabled={loading}>
                {loading ? "Loading..." : "Apply Filters"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payroll Records</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Net Pay</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.employee?.firstName} {r.employee?.lastName || ""}</TableCell>
                      <TableCell>{r.employee?.employeeCode || "-"}</TableCell>
                      <TableCell>{r.payPeriod}</TableCell>
                      <TableCell>{r.netPay}</TableCell>
                      <TableCell>{r.status}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDownload(r.id)}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={sendingId === r.id}
                            >
                              {sendingId === r.id ? (
                                <span className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full inline-block" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                              <ChevronDown className="w-3 h-3 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleSend(r, 'both')}>
                              <Send className="w-4 h-4 mr-2" /> Send Both (Email + App)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSend(r, 'email')}>
                              <Mail className="w-4 h-4 mr-2" /> Send via Email
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSend(r, 'in_app')}>
                              <Smartphone className="w-4 h-4 mr-2" /> Send to App Only
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {records.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        <div className="flex flex-col items-center gap-2 py-6">
                          <div>No payroll records found for the selected filters.</div>
                          <Button variant="outline" onClick={openCreate}>
                            <Plus className="w-4 h-4 mr-2" /> Add Payroll
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Payroll Slip Configuration</CardTitle>
              <CardDescription>Design fields for PDF salary slips</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input value={settings.companyName || ""} onChange={(e) => setSettings({ ...settings, companyName: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Logo URL</Label>
                  <Input value={settings.logoUrl || ""} onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Primary Color</Label>
                  <Input value={settings.primaryColor || ""} onChange={(e) => setSettings({ ...settings, primaryColor: e.target.value })} placeholder="#1f2937" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Textarea value={settings.address || ""} onChange={(e) => setSettings({ ...settings, address: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Footer Note</Label>
                <Textarea value={settings.footerNote || ""} onChange={(e) => setSettings({ ...settings, footerNote: e.target.value })} />
              </div>
              <Button onClick={handleSaveSettings} disabled={savingSettings}>
                {savingSettings ? "Saving..." : "Save Configuration"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Payroll" : "Add Payroll"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={form.employeeId} onValueChange={(v) => setForm({ ...form, employeeId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.firstName} {e.lastName || ""} ({e.employeeCode})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Period Start</Label>
                <Input type="date" value={form.periodStart} onChange={(e) => setForm({ ...form, periodStart: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Period End</Label>
                <Input type="date" value={form.periodEnd} onChange={(e) => setForm({ ...form, periodEnd: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Basic</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.basic}
                  onChange={(e) => {
                    const v = normalizeNumberInput(e.target.value);
                    setForm({ ...form, basic: v === "" ? 0 : Number(v) });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>HRA</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.hra}
                  onChange={(e) => {
                    const v = normalizeNumberInput(e.target.value);
                    setForm({ ...form, hra: v === "" ? 0 : Number(v) });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Conveyance</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.conveyance}
                  onChange={(e) => {
                    const v = normalizeNumberInput(e.target.value);
                    setForm({ ...form, conveyance: v === "" ? 0 : Number(v) });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Other Allowances</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.otherAllowances}
                  onChange={(e) => {
                    const v = normalizeNumberInput(e.target.value);
                    setForm({ ...form, otherAllowances: v === "" ? 0 : Number(v) });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>PF</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.pf}
                  onChange={(e) => {
                    const v = normalizeNumberInput(e.target.value);
                    setForm({ ...form, pf: v === "" ? 0 : Number(v) });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>TDS</Label>
                <Input
                  type="text"
                  inputMode="decimal"
                  value={form.tds}
                  onChange={(e) => {
                    const v = normalizeNumberInput(e.target.value);
                    setForm({ ...form, tds: v === "" ? 0 : Number(v) });
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Draft" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="processed">Processed</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total Earnings</div>
                  <div className="text-2xl font-semibold">{totals.totalEarnings}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Total Deductions</div>
                  <div className="text-2xl font-semibold">{totals.totalDeductions}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">Net Pay</div>
                  <div className="text-2xl font-semibold">{totals.netPay}</div>
                </CardContent>
              </Card>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
