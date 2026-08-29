"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Coins, Landmark, Pencil, Plus, Search, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getProfile,
  getEmployees,
  getDepartments,
  getDesignations,
  getSalaryStructures,
  getEmployeeBankDetail,
} from "@/app/api/api";

interface EmployeeRow {
  id: string;
  firstName: string;
  lastName?: string;
  employeeCode?: string;
  workEmail?: string;
  department?: { id: string; name: string } | null;
  designation?: { id: string; name: string } | null;
  activeSalary?: {
    grossSalary: number;
    netSalary: number;
    effectiveFrom: string;
  } | null;
  hasBankDetail: boolean;
  panNumber: string;
  uanNumber: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(v || 0));

export default function SalaryStructurePage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [designations, setDesignations] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [desigFilter, setDesigFilter] = useState("all");
  const [isNewDialogOpen, setIsNewDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 15;

  useEffect(() => {
    const init = async () => {
      try {
        const profile = await getProfile();
        const orgId = profile.data?.organizationId;
        if (!orgId) return;

        const [empRes, deptRes, desigRes, structRes] = await Promise.all([
          getEmployees(orgId),
          getDepartments(orgId),
          getDesignations(orgId),
          getSalaryStructures(),
        ]);

        const empList = empRes.data?.data || empRes.data || [];
        const structs = structRes.data || [];

        const activeByEmp = new Map<string, any>();
        for (const s of structs) {
          if (s.status === "active") {
            const existing = activeByEmp.get(s.employeeId);
            if (!existing || new Date(s.effectiveFrom) > new Date(existing.effectiveFrom)) {
              activeByEmp.set(s.employeeId, s);
            }
          }
        }

        const bankResults = await Promise.allSettled(
          empList.map((emp: any) => getEmployeeBankDetail(emp.id)),
        );
        const bankByEmp = new Map<string, any>();
        bankResults.forEach((r, i) => {
          if (r.status === "fulfilled" && r.value?.data) {
            bankByEmp.set(empList[i].id, r.value.data);
          }
        });

        setEmployees(
          empList.map((emp: any) => {
            const bd = bankByEmp.get(emp.id);
            const s = activeByEmp.get(emp.id);
            return {
              id: emp.id,
              firstName: emp.firstName,
              lastName: emp.lastName,
              employeeCode: emp.employeeCode,
              workEmail: emp.workEmail,
              department: emp.department || null,
              designation: emp.designation || null,
              activeSalary: s
                ? { grossSalary: s.grossSalary, netSalary: s.netSalary, effectiveFrom: s.effectiveFrom }
                : null,
              hasBankDetail: !!bd,
              panNumber: bd?.panNumber || "",
              uanNumber: bd?.uanNumber || "",
            };
          }),
        );
        setDepartments(deptRes.data?.data || deptRes.data || []);
        setDesignations(desigRes.data?.data || desigRes.data || []);
      } catch {
        toast.error("Failed to load data");
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const filtered = useMemo(() => {
    let rows = employees;
    if (deptFilter !== "all") rows = rows.filter((r) => r.department?.id === deptFilter);
    if (desigFilter !== "all") rows = rows.filter((r) => r.designation?.id === desigFilter);
    if (search.trim()) {
      const t = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.firstName?.toLowerCase().includes(t) ||
          r.lastName?.toLowerCase().includes(t) ||
          r.employeeCode?.toLowerCase().includes(t) ||
          r.workEmail?.toLowerCase().includes(t),
      );
    }
    return rows;
  }, [employees, deptFilter, desigFilter, search]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const hasFilters = deptFilter !== "all" || desigFilter !== "all" || search.trim();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Coins className="w-6 h-6" /> Salary Structure
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure salary, bank details and statutory information for employees.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/admin/salary-structure/bank-details")}>
            <Landmark className="w-4 h-4 mr-1" /> Bank Details
          </Button>
          <Button onClick={() => setIsNewDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Create Salary Structure
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name, code, or email..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} className="pl-8" />
            </div>
            <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Department" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={desigFilter} onValueChange={(v) => { setDesigFilter(v); setPage(1); }}>
              <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Designation" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Designations</SelectItem>
                {designations.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={() => { setDeptFilter("all"); setDesigFilter("all"); setSearch(""); setPage(1); }}>
                <X className="w-4 h-4 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Employee</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Designation</TableHead>
                  <TableHead className="text-right">Gross Salary</TableHead>
                  <TableHead className="text-right">Net Salary</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>PAN</TableHead>
                  <TableHead>UAN</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8">
                      <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : paginated.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No employees found.</TableCell>
                  </TableRow>
                ) : (
                  paginated.map((emp, idx) => (
                    <TableRow
                      key={emp.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => router.push(`/admin/salary-structure/${emp.id}`)}
                    >
                      <TableCell className="text-muted-foreground">{(page - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell>
                        <div className="font-medium">{emp.firstName} {emp.lastName || ""}</div>
                        <div className="text-xs text-muted-foreground">{emp.workEmail}</div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{emp.employeeCode || "-"}</TableCell>
                      <TableCell>{emp.department?.name || "-"}</TableCell>
                      <TableCell>{emp.designation?.name || "-"}</TableCell>
                      <TableCell className="text-right font-medium">
                        {emp.activeSalary ? formatCurrency(emp.activeSalary.grossSalary) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {emp.activeSalary ? formatCurrency(emp.activeSalary.netSalary) : <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>
                        {emp.activeSalary ? (
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-green-50 text-green-700 ring-1 ring-inset ring-green-600/20">Active</span>
                        ) : (
                          <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-gray-50 text-gray-600 ring-1 ring-inset ring-gray-500/10">Not Set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.panNumber ? <span className="font-mono text-xs">{emp.panNumber}</span> : <span className="text-xs text-orange-600 font-medium">Missing</span>}
                      </TableCell>
                      <TableCell>
                        {emp.uanNumber ? <span className="font-mono text-xs">{emp.uanNumber}</span> : <span className="text-xs text-orange-600 font-medium">Missing</span>}
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/salary-structure/${emp.id}`)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
           </div>
          {filtered.length > pageSize && (
            <div className="flex items-center justify-between px-4 py-3 border-t">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, filtered.length)} of {filtered.length}
              </p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <Button key={p} variant={p === page ? "default" : "outline"} size="sm" onClick={() => setPage(p)}>{p}</Button>
                ))}
                <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Salary Structure — Select Employee Dialog */}
      <Dialog open={isNewDialogOpen} onOpenChange={setIsNewDialogOpen}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Create Salary Structure</DialogTitle>
            <DialogDescription>Select an employee to configure their salary structure.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {employees.map((emp) => (
              <button
                key={emp.id}
                onClick={() => {
                  setIsNewDialogOpen(false);
                  router.push(`/admin/salary-structure/${emp.id}`);
                }}
                className="w-full text-left p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="font-medium text-sm">{emp.firstName} {emp.lastName || ""}</div>
                <div className="text-xs text-muted-foreground">
                  {emp.employeeCode}
                  {emp.designation?.name && ` · ${emp.designation.name}`}
                  {emp.department?.name && ` · ${emp.department.name}`}
                </div>
              </button>
            ))}
            {employees.length === 0 && (
              <div className="text-center py-4 text-sm text-muted-foreground">No employees found.</div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
