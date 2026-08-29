"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Plus, Trash2, Coins } from "lucide-react";
import { toast } from "sonner";
import {
  getProfile,
  getEmployees,
  getSalaryStructures,
  getSalaryStructuresByEmployee,
  getActiveSalaryStructure,
  createSalaryStructure,
  updateSalaryStructure,
  deleteSalaryStructure,
} from "@/app/api/api";

interface SalaryStructure {
  id: string;
  organizationId: string;
  employeeId: string;
  name?: string;
  basic: number;
  hra: number;
  conveyance: number;
  otherAllowances: number;
  pf: number;
  tds: number;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  effectiveFrom: string;
  effectiveTo?: string;
  status: string;
  notes?: string;
  employee?: {
    id: string;
    firstName: string;
    lastName?: string;
    employeeCode?: string;
  };
}

const emptyForm = {
  employeeId: "",
  name: "",
  basic: 0,
  hra: 0,
  conveyance: 0,
  otherAllowances: 0,
  pf: 0,
  tds: 0,
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: "",
  status: "active",
  notes: "",
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(value || 0));

export default function SalaryStructurePage() {
  const [organizationId, setOrganizationId] = useState<string>("");
  const [employees, setEmployees] = useState<any[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("");
  const [employeeStructures, setEmployeeStructures] = useState<
    SalaryStructure[]
  >([]);
  const [activeStructure, setActiveStructure] =
    useState<SalaryStructure | null>(null);
  const [loading, setLoading] = useState(false);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryStructure | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const profile = await getProfile();
        const orgId = profile.data?.organizationId;
        if (!orgId) return;
        setOrganizationId(orgId);

        const empRes = await getEmployees(orgId);
        setEmployees(empRes.data?.data || empRes.data || []);

        const structRes = await getSalaryStructures();
        setStructures(structRes.data || []);
      } catch (error) {
        toast.error("Failed to load salary structure data");
      }
    };
    init();
  }, []);

  const fetchEmployeeStructures = async (employeeId: string) => {
    if (!employeeId) {
      setEmployeeStructures([]);
      setActiveStructure(null);
      return;
    }
    try {
      const res = await getSalaryStructuresByEmployee(employeeId);
      setEmployeeStructures(res.data || []);

      const activeRes = await getActiveSalaryStructure(employeeId);
      setActiveStructure(activeRes.data || null);
    } catch (error) {
      setEmployeeStructures([]);
      setActiveStructure(null);
    }
  };

  useEffect(() => {
    if (selectedEmployeeId) {
      fetchEmployeeStructures(selectedEmployeeId);
    }
  }, [selectedEmployeeId]);

  const fetchAllStructures = async () => {
    setLoading(true);
    try {
      const res = await getSalaryStructures();
      setStructures(res.data || []);
    } catch (error) {
      toast.error("Failed to load salary structures");
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      employeeId: selectedEmployeeId || "",
      effectiveFrom: new Date().toISOString().slice(0, 10),
    });
    setIsDialogOpen(true);
  };

  const openEdit = (structure: SalaryStructure) => {
    setEditing(structure);
    setForm({
      employeeId: structure.employeeId,
      name: structure.name || "",
      basic: Number(structure.basic),
      hra: Number(structure.hra),
      conveyance: Number(structure.conveyance),
      otherAllowances: Number(structure.otherAllowances),
      pf: Number(structure.pf),
      tds: Number(structure.tds),
      effectiveFrom: structure.effectiveFrom?.slice(0, 10) || "",
      effectiveTo: structure.effectiveTo?.slice(0, 10) || "",
      status: structure.status || "active",
      notes: structure.notes || "",
    });
    setIsDialogOpen(true);
  };

  const calcTotals = () => {
    const grossSalary =
      Number(form.basic || 0) +
      Number(form.hra || 0) +
      Number(form.conveyance || 0) +
      Number(form.otherAllowances || 0);
    const totalDeductions = Number(form.pf || 0) + Number(form.tds || 0);
    const netSalary = grossSalary - totalDeductions;
    return { grossSalary, totalDeductions, netSalary };
  };

  const normalizeNumberInput = (value: string) => {
    const cleaned = value.replace(/[^0-9.]/g, "");
    const parts = cleaned.split(".");
    if (parts.length <= 1) return cleaned;
    return `${parts[0]}.${parts.slice(1).join("")}`;
  };

  const handleSave = async () => {
    if (!form.employeeId) {
      toast.error("Please select an employee");
      return;
    }
    if (!form.effectiveFrom) {
      toast.error("Effective From date is required");
      return;
    }

    const payload: any = {
      employeeId: form.employeeId,
      name: form.name || undefined,
      basic: Number(form.basic || 0),
      hra: Number(form.hra || 0),
      conveyance: Number(form.conveyance || 0),
      otherAllowances: Number(form.otherAllowances || 0),
      pf: Number(form.pf || 0),
      tds: Number(form.tds || 0),
      effectiveFrom: form.effectiveFrom,
      effectiveTo: form.effectiveTo || undefined,
      status: form.status || "active",
      notes: form.notes || undefined,
    };

    try {
      setSaving(true);
      if (editing) {
        await updateSalaryStructure(editing.id, payload);
        toast.success("Salary structure updated");
      } else {
        await createSalaryStructure(payload);
        toast.success("Salary structure created");
      }
      setIsDialogOpen(false);
      fetchAllStructures();
      if (selectedEmployeeId) {
        fetchEmployeeStructures(selectedEmployeeId);
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to save salary structure"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this salary structure?"))
      return;
    try {
      await deleteSalaryStructure(id);
      toast.success("Salary structure deleted");
      fetchAllStructures();
      if (selectedEmployeeId) {
        fetchEmployeeStructures(selectedEmployeeId);
      }
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to delete salary structure"
      );
    }
  };

  const totals = useMemo(calcTotals, [form]);

  const getEmployeeName = (employeeId: string) => {
    const emp = employees.find((e: any) => e.id === employeeId);
    return emp
      ? `${emp.firstName} ${emp.lastName || ""} (${emp.employeeCode || ""})`
      : employeeId;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="w-5 h-5" />
              Employee Salary Structure
            </CardTitle>
            <CardDescription>
              Configure and manage salary structures for employees. Salary
              structures are used to auto-populate payroll records.
            </CardDescription>
          </div>
        </CardHeader>
      </Card>

      {/* Employee Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Employee</CardTitle>
          <CardDescription>
            Choose an employee to view or configure their salary structure.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Employee</Label>
              <Select
                value={selectedEmployeeId}
                onValueChange={setSelectedEmployeeId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an employee" />
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

            {activeStructure && (
              <div className="md:col-span-2">
                <div className="rounded-lg border bg-muted/50 p-4">
                  <div className="text-sm font-medium text-muted-foreground mb-2">
                    Active Salary Structure
                    {activeStructure.name
                      ? ` — ${activeStructure.name}`
                      : ""}
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground">
                        Gross Salary
                      </span>
                      <div className="font-semibold">
                        {formatCurrency(activeStructure.grossSalary)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Total Deductions
                      </span>
                      <div className="font-semibold">
                        {formatCurrency(activeStructure.totalDeductions)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Net Salary</span>
                      <div className="font-semibold text-green-600">
                        {formatCurrency(activeStructure.netSalary)}
                      </div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Effective From
                      </span>
                      <div className="font-semibold">
                        {new Date(
                          activeStructure.effectiveFrom
                        ).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {selectedEmployeeId && (
            <div className="mt-4">
              <Button onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" /> Add Salary Structure
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Employee's Salary Structure History */}
      {selectedEmployeeId && employeeStructures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Salary Structure History</CardTitle>
            <CardDescription>
              All salary structures for the selected employee.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sl#</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Gross Salary</TableHead>
                  <TableHead>Deductions</TableHead>
                  <TableHead>Net Salary</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead>Effective To</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employeeStructures.map((s, index) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>{s.name || "-"}</TableCell>
                    <TableCell>{formatCurrency(s.grossSalary)}</TableCell>
                    <TableCell>{formatCurrency(s.totalDeductions)}</TableCell>
                    <TableCell className="font-semibold">
                      {formatCurrency(s.netSalary)}
                    </TableCell>
                    <TableCell>
                      {new Date(s.effectiveFrom).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell>
                      {s.effectiveTo
                        ? new Date(s.effectiveTo).toLocaleDateString("en-IN")
                        : "Ongoing"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          s.status === "active"
                            ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                            : "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10"
                        }`}
                      >
                        {s.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(s)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(s.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* All Salary Structures */}
      <Card>
        <CardHeader>
          <CardTitle>All Salary Structures</CardTitle>
          <CardDescription>
            All salary structures across the organization.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sl#</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gross Salary</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Salary</TableHead>
                <TableHead>Effective From</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {structures.map((s, index) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{index + 1}</TableCell>
                  <TableCell>
                    {s.employee
                      ? `${s.employee.firstName} ${s.employee.lastName || ""}`
                      : getEmployeeName(s.employeeId)}
                    {s.employee?.employeeCode && (
                      <span className="text-muted-foreground ml-1">
                        ({s.employee.employeeCode})
                      </span>
                    )}
                  </TableCell>
                  <TableCell>{s.name || "-"}</TableCell>
                  <TableCell>{formatCurrency(s.grossSalary)}</TableCell>
                  <TableCell>{formatCurrency(s.totalDeductions)}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(s.netSalary)}
                  </TableCell>
                  <TableCell>
                    {new Date(s.effectiveFrom).toLocaleDateString("en-IN")}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                        s.status === "active"
                          ? "bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20"
                          : "bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10"
                      }`}
                    >
                      {s.status}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(s)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(s.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {structures.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={9}
                    className="text-center text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2 py-6">
                      <Coins className="h-8 w-8" />
                      <div>No salary structures configured yet.</div>
                      <p className="text-sm">
                        Select an employee above to add their salary structure.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[900px]">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit Salary Structure" : "Add Salary Structure"}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            {/* Employee & Meta */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Employee *</Label>
                <Select
                  value={form.employeeId}
                  onValueChange={(v) => setForm({ ...form, employeeId: v })}
                  disabled={!!editing}
                >
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
                <Label>Structure Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Standard Package 2026"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) => setForm({ ...form, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Effective Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Effective From *</Label>
                <Input
                  type="date"
                  value={form.effectiveFrom}
                  onChange={(e) =>
                    setForm({ ...form, effectiveFrom: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Effective To</Label>
                <Input
                  type="date"
                  value={form.effectiveTo}
                  onChange={(e) =>
                    setForm({ ...form, effectiveTo: e.target.value })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Leave empty if this is the current/ongoing structure.
                </p>
              </div>
            </div>

            {/* Earnings */}
            <div>
              <Label className="text-sm font-semibold text-green-700 mb-2 block">
                Earnings
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Basic Pay *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.basic || ""}
                    onChange={(e) => {
                      const v = normalizeNumberInput(e.target.value);
                      setForm({
                        ...form,
                        basic: v === "" ? 0 : Number(v),
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>HRA *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.hra || ""}
                    onChange={(e) => {
                      const v = normalizeNumberInput(e.target.value);
                      setForm({
                        ...form,
                        hra: v === "" ? 0 : Number(v),
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Conveyance *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.conveyance || ""}
                    onChange={(e) => {
                      const v = normalizeNumberInput(e.target.value);
                      setForm({
                        ...form,
                        conveyance: v === "" ? 0 : Number(v),
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Special Allowance *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.otherAllowances || ""}
                    onChange={(e) => {
                      const v = normalizeNumberInput(e.target.value);
                      setForm({
                        ...form,
                        otherAllowances: v === "" ? 0 : Number(v),
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div>
              <Label className="text-sm font-semibold text-red-700 mb-2 block">
                Deductions
              </Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>PF *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.pf || ""}
                    onChange={(e) => {
                      const v = normalizeNumberInput(e.target.value);
                      setForm({
                        ...form,
                        pf: v === "" ? 0 : Number(v),
                      });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>TDS *</Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="0.00"
                    value={form.tds || ""}
                    onChange={(e) => {
                      const v = normalizeNumberInput(e.target.value);
                      setForm({
                        ...form,
                        tds: v === "" ? 0 : Number(v),
                      });
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Computed Totals */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">
                    Gross Salary
                  </div>
                  <div className="text-2xl font-semibold">
                    {formatCurrency(totals.grossSalary)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">
                    Total Deductions
                  </div>
                  <div className="text-2xl font-semibold">
                    {formatCurrency(totals.totalDeductions)}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-sm text-muted-foreground">
                    Net Salary
                  </div>
                  <div className="text-2xl font-semibold text-green-600">
                    {formatCurrency(totals.netSalary)}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional notes about this salary structure"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} loading={saving}>
              {editing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
