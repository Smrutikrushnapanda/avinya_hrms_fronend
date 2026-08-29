"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Coins,
  Landmark,
  History,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  getSalaryStructuresByEmployee,
  getActiveSalaryStructure,
  createSalaryStructure,
  updateSalaryStructure,
  deleteSalaryStructure,
  getEmployeeBankDetail,
  updateEmployeeBankDetail,
  getEmployees,
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
}

interface BankDetail {
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  panNumber: string;
  uanNumber: string;
  pfNumber: string;
  esiNumber: string;
}

const emptySalaryForm = {
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

const emptyBankForm: BankDetail = {
  accountHolderName: "",
  bankName: "",
  accountNumber: "",
  ifscCode: "",
  branchName: "",
  panNumber: "",
  uanNumber: "",
  pfNumber: "",
  esiNumber: "",
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v || 0));

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

export default function EmployeeSalaryPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.employeeId as string;

  const [employee, setEmployee] = useState<any>(null);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [activeStructure, setActiveStructure] = useState<SalaryStructure | null>(null);
  const [bankForm, setBankForm] = useState<BankDetail>({ ...emptyBankForm });
  const [bankLoaded, setBankLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  // Salary dialog
  const [isSalaryDialogOpen, setIsSalaryDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SalaryStructure | null>(null);
  const [salaryForm, setSalaryForm] = useState({ ...emptySalaryForm });
  const [saving, setSaving] = useState(false);

  // Bank
  const [bankSaving, setBankSaving] = useState(false);

  // History
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<SalaryStructure | null>(null);

  const fetchData = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const [empRes, structRes, activeRes, bankRes] = await Promise.allSettled([
        getEmployees("").catch(() => null),
        getSalaryStructuresByEmployee(employeeId),
        getActiveSalaryStructure(employeeId),
        getEmployeeBankDetail(employeeId),
      ]);

      // Find employee from org list
      if (empRes.status === "fulfilled" && empRes.value?.data) {
        const list = empRes.value.data?.data || empRes.value.data || [];
        const emp = list.find((e: any) => e.id === employeeId);
        if (emp) setEmployee(emp);
      }

      if (structRes.status === "fulfilled") setStructures(structRes.value.data || []);
      if (activeRes.status === "fulfilled") setActiveStructure(activeRes.value.data || null);

      if (bankRes.status === "fulfilled" && bankRes.value.data) {
        const bd = bankRes.value.data;
        setBankForm({
          accountHolderName: bd.accountHolderName || "",
          bankName: bd.bankName || "",
          accountNumber: bd.accountNumber || "",
          ifscCode: bd.ifscCode || "",
          branchName: bd.branchName || "",
          panNumber: bd.panNumber || "",
          uanNumber: bd.uanNumber || "",
          pfNumber: bd.pfNumber || "",
          esiNumber: bd.esiNumber || "",
        });
        setBankLoaded(true);
      } else {
        setBankForm({ ...emptyBankForm });
        setBankLoaded(false);
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  // --- Salary ---
  const openEdit = (s: SalaryStructure) => {
    setEditing(s);
    setSalaryForm({
      name: s.name || "",
      basic: Number(s.basic),
      hra: Number(s.hra),
      conveyance: Number(s.conveyance),
      otherAllowances: Number(s.otherAllowances),
      pf: Number(s.pf),
      tds: Number(s.tds),
      effectiveFrom: s.effectiveFrom?.slice(0, 10) || "",
      effectiveTo: s.effectiveTo?.slice(0, 10) || "",
      status: s.status || "active",
      notes: s.notes || "",
    });
    setIsSalaryDialogOpen(true);
  };

  const handleSaveSalary = async () => {
    if (!salaryForm.effectiveFrom) {
      toast.error("Effective From is required");
      return;
    }
    const payload: any = {
      employeeId,
      name: salaryForm.name || undefined,
      basic: Number(salaryForm.basic || 0),
      hra: Number(salaryForm.hra || 0),
      conveyance: Number(salaryForm.conveyance || 0),
      otherAllowances: Number(salaryForm.otherAllowances || 0),
      pf: Number(salaryForm.pf || 0),
      tds: Number(salaryForm.tds || 0),
      effectiveFrom: salaryForm.effectiveFrom,
      effectiveTo: salaryForm.effectiveTo || undefined,
      status: salaryForm.status || "active",
      notes: salaryForm.notes || undefined,
    };
    try {
      setSaving(true);
      if (editing) {
        await updateSalaryStructure(editing.id, payload);
        toast.success("Updated");
      } else {
        await createSalaryStructure(payload);
        toast.success("Created");
      }
      setIsSalaryDialogOpen(false);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteSalary = async () => {
    if (!deleteTarget) return;
    try {
      await deleteSalaryStructure(deleteTarget.id);
      toast.success("Deleted");
      setDeleteTarget(null);
      fetchData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to delete");
    }
  };

  // --- Bank ---
  const handleSaveBank = async () => {
    if (!bankForm.accountHolderName || !bankForm.bankName || !bankForm.accountNumber || !bankForm.ifscCode) {
      toast.error("Account Holder, Bank Name, Account Number, and IFSC are required");
      return;
    }
    try {
      setBankSaving(true);
      await updateEmployeeBankDetail(employeeId, bankForm);
      toast.success("Bank details saved");
      setBankLoaded(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setBankSaving(false);
    }
  };

  const salaryTotals = useMemo(() => {
    const gross = Number(salaryForm.basic || 0) + Number(salaryForm.hra || 0) + Number(salaryForm.conveyance || 0) + Number(salaryForm.otherAllowances || 0);
    const deductions = Number(salaryForm.pf || 0) + Number(salaryForm.tds || 0);
    return { gross, deductions, net: gross - deductions };
  }, [salaryForm]);

  const normalizeNumberInput = (v: string) => {
    const c = v.replace(/[^0-9.]/g, "");
    const p = c.split(".");
    return p.length <= 1 ? c : `${p[0]}.${p.slice(1).join("")}`;
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/salary-structure")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {employee?.firstName} {employee?.lastName || ""}
          </h1>
          <p className="text-muted-foreground text-sm">
            {employee?.employeeCode}
            {employee?.designation?.name && ` · ${employee.designation.name}`}
            {employee?.department?.name && ` · ${employee.department.name}`}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="salary">
        <TabsList>
          <TabsTrigger value="salary" className="flex items-center gap-1">
            <Coins className="w-4 h-4" /> Salary Structure
          </TabsTrigger>
          <TabsTrigger value="bank" className="flex items-center gap-1">
            <Landmark className="w-4 h-4" /> Bank & Statutory
          </TabsTrigger>
        </TabsList>

        {/* ====== SALARY TAB ====== */}
        <TabsContent value="salary" className="space-y-4 mt-4">
          {activeStructure ? (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-base">Current Active Salary</CardTitle>
                  {activeStructure.name && <CardDescription>{activeStructure.name}</CardDescription>}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openEdit(activeStructure)}>
                    <Pencil className="w-4 h-4 mr-1" /> Edit
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div><div className="text-sm text-muted-foreground">Gross Salary</div><div className="text-xl font-semibold">{formatCurrency(activeStructure.grossSalary)}</div></div>
                  <div><div className="text-sm text-muted-foreground">Total Deductions</div><div className="text-xl font-semibold">{formatCurrency(activeStructure.totalDeductions)}</div></div>
                  <div><div className="text-sm text-muted-foreground">Net Salary</div><div className="text-xl font-semibold text-green-600">{formatCurrency(activeStructure.netSalary)}</div></div>
                  <div><div className="text-sm text-muted-foreground">Effective From</div><div className="text-xl font-semibold">{formatDate(activeStructure.effectiveFrom)}</div></div>
                </div>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Basic</span><div>{formatCurrency(activeStructure.basic)}</div></div>
                  <div><span className="text-muted-foreground">HRA</span><div>{formatCurrency(activeStructure.hra)}</div></div>
                  <div><span className="text-muted-foreground">Conveyance</span><div>{formatCurrency(activeStructure.conveyance)}</div></div>
                  <div><span className="text-muted-foreground">Other Allowances</span><div>{formatCurrency(activeStructure.otherAllowances)}</div></div>
                  <div><span className="text-muted-foreground">PF</span><div>{formatCurrency(activeStructure.pf)}</div></div>
                  <div><span className="text-muted-foreground">TDS</span><div>{formatCurrency(activeStructure.tds)}</div></div>
                  <div><span className="text-muted-foreground">Effective To</span><div>{activeStructure.effectiveTo ? formatDate(activeStructure.effectiveTo) : "Ongoing"}</div></div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <Coins className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
                <p className="text-sm text-muted-foreground mb-3">No salary structure configured yet.</p>
                <Button onClick={() => { setEditing(null); setSalaryForm({ ...emptySalaryForm, effectiveFrom: new Date().toISOString().slice(0, 10) }); setIsSalaryDialogOpen(true); }}><Plus className="w-4 h-4 mr-1" /> Create Salary Structure</Button>
              </CardContent>
            </Card>
          )}

          {structures.length > 0 && (
            <Button variant="outline" onClick={() => setIsHistoryOpen(true)}>
              <History className="w-4 h-4 mr-1" /> View Salary History ({structures.length})
            </Button>
          )}
        </TabsContent>

        {/* ====== BANK TAB ====== */}
        <TabsContent value="bank" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Employee Bank & Statutory Details</CardTitle>
              <CardDescription>Bank account and statutory information for salary processing and payslips.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label className="text-sm font-semibold mb-3 block">Statutory Details</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>PAN Number</Label>
                    <Input value={bankForm.panNumber} onChange={(e) => setBankForm({ ...bankForm, panNumber: e.target.value.toUpperCase() })} placeholder="ABCDE1234F" maxLength={10} />
                  </div>
                  <div className="space-y-2">
                    <Label>UAN Number</Label>
                    <Input value={bankForm.uanNumber} onChange={(e) => setBankForm({ ...bankForm, uanNumber: e.target.value })} placeholder="123456789012" />
                  </div>
                  <div className="space-y-2">
                    <Label>PF Number</Label>
                    <Input value={bankForm.pfNumber} onChange={(e) => setBankForm({ ...bankForm, pfNumber: e.target.value })} placeholder="PF account number" />
                  </div>
                  <div className="space-y-2">
                    <Label>ESI Number</Label>
                    <Input value={bankForm.esiNumber} onChange={(e) => setBankForm({ ...bankForm, esiNumber: e.target.value })} placeholder="ESI account number" />
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-sm font-semibold mb-3 block">Bank Account Details</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Account Holder Name *</Label>
                    <Input value={bankForm.accountHolderName} onChange={(e) => setBankForm({ ...bankForm, accountHolderName: e.target.value })} placeholder="Full name as per bank" />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank Name *</Label>
                    <Input value={bankForm.bankName} onChange={(e) => setBankForm({ ...bankForm, bankName: e.target.value })} placeholder="e.g. HDFC Bank" />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number *</Label>
                    <Input value={bankForm.accountNumber} onChange={(e) => setBankForm({ ...bankForm, accountNumber: e.target.value })} placeholder="Bank account number" />
                  </div>
                  <div className="space-y-2">
                    <Label>IFSC Code *</Label>
                    <Input value={bankForm.ifscCode} onChange={(e) => setBankForm({ ...bankForm, ifscCode: e.target.value.toUpperCase() })} placeholder="HDFC0001234" maxLength={11} />
                  </div>
                  <div className="space-y-2">
                    <Label>Branch Name</Label>
                    <Input value={bankForm.branchName} onChange={(e) => setBankForm({ ...bankForm, branchName: e.target.value })} placeholder="Branch name" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={handleSaveBank} disabled={bankSaving}>
                  <Save className="w-4 h-4 mr-1" />
                  {bankSaving ? "Saving..." : bankLoaded ? "Update Details" : "Save Details"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ====== SALARY HISTORY DIALOG ====== */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Salary Structure History</DialogTitle></DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gross</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net</TableHead>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {structures.map((s, i) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{i + 1}</TableCell>
                  <TableCell>{s.name || "-"}</TableCell>
                  <TableCell>{formatCurrency(s.grossSalary)}</TableCell>
                  <TableCell>{formatCurrency(s.totalDeductions)}</TableCell>
                  <TableCell className="font-semibold">{formatCurrency(s.netSalary)}</TableCell>
                  <TableCell>{formatDate(s.effectiveFrom)}</TableCell>
                  <TableCell>{s.effectiveTo ? formatDate(s.effectiveTo) : "Ongoing"}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${s.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-50 text-gray-600"}`}>{s.status}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => { setIsHistoryOpen(false); openEdit(s); }}><Pencil className="w-4 h-4" /></Button>
                    <Button variant="ghost" size="sm" onClick={() => { setIsHistoryOpen(false); setDeleteTarget(s); }}><Trash2 className="w-4 h-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {/* ====== CREATE/EDIT SALARY DIALOG ====== */}
      <Dialog open={isSalaryDialogOpen} onOpenChange={setIsSalaryDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader className="pb-2">
            <DialogTitle className="text-xl">{editing ? "Edit Salary Structure" : "Create Salary Structure"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Structure Name</Label>
                <Input className="h-11" value={salaryForm.name} onChange={(e) => setSalaryForm({ ...salaryForm, name: e.target.value })} placeholder="e.g. Standard Package 2026" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Status</Label>
                <Select value={salaryForm.status} onValueChange={(v) => setSalaryForm({ ...salaryForm, status: v })}>
                  <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Effective Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Effective From *</Label>
                <Input type="date" className="h-11" value={salaryForm.effectiveFrom} onChange={(e) => setSalaryForm({ ...salaryForm, effectiveFrom: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Effective To</Label>
                <Input type="date" className="h-11" value={salaryForm.effectiveTo} onChange={(e) => setSalaryForm({ ...salaryForm, effectiveTo: e.target.value })} />
                <p className="text-xs text-muted-foreground">Leave empty for ongoing.</p>
              </div>
            </div>

            {/* Earnings */}
            <div className="rounded-lg border bg-green-50/50 p-5 space-y-4">
              <Label className="text-sm font-semibold text-green-700">Earnings</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                  { key: "basic", label: "Basic *" },
                  { key: "hra", label: "HRA *" },
                  { key: "conveyance", label: "Conveyance *" },
                  { key: "otherAllowances", label: "Other Allowances *" },
                ].map(({ key, label }) => (
                  <div className="space-y-2" key={key}>
                    <Label className="text-sm">{label}</Label>
                    <Input type="text" inputMode="decimal" className="h-11" placeholder="0" value={(salaryForm as any)[key] || ""} onChange={(e) => { const v = normalizeNumberInput(e.target.value); setSalaryForm({ ...salaryForm, [key]: v === "" ? 0 : Number(v) }); }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Deductions */}
            <div className="rounded-lg border bg-red-50/50 p-5 space-y-4">
              <Label className="text-sm font-semibold text-red-700">Deductions</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {[
                  { key: "pf", label: "PF *" },
                  { key: "tds", label: "TDS *" },
                ].map(({ key, label }) => (
                  <div className="space-y-2" key={key}>
                    <Label className="text-sm">{label}</Label>
                    <Input type="text" inputMode="decimal" className="h-11" placeholder="0" value={(salaryForm as any)[key] || ""} onChange={(e) => { const v = normalizeNumberInput(e.target.value); setSalaryForm({ ...salaryForm, [key]: v === "" ? 0 : Number(v) }); }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-green-200 bg-green-50/30">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Gross Salary</div>
                  <div className="text-xl font-bold">{formatCurrency(salaryTotals.gross)}</div>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-red-50/30">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Total Deductions</div>
                  <div className="text-xl font-bold">{formatCurrency(salaryTotals.deductions)}</div>
                </CardContent>
              </Card>
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                  <div className="text-xs text-muted-foreground mb-1">Net Salary</div>
                  <div className="text-xl font-bold text-green-600">{formatCurrency(salaryTotals.net)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Notes</Label>
              <Textarea className="min-h-[80px]" value={salaryForm.notes} onChange={(e) => setSalaryForm({ ...salaryForm, notes: e.target.value })} placeholder="Optional notes about this salary structure" />
            </div>
          </div>
          <DialogFooter className="pt-4 border-t">
            <Button variant="outline" onClick={() => setIsSalaryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSalary} disabled={saving}>{saving ? "Saving..." : editing ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ====== DELETE CONFIRMATION ====== */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>Delete Salary Structure</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDeleteSalary}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
