"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2, Save, Landmark } from "lucide-react";
import { toast } from "sonner";
import { getProfile, getEmployees, getEmployeeBankDetail, updateEmployeeBankDetail } from "@/app/api/api";

interface Employee {
  id: string;
  firstName: string;
  lastName?: string;
  employeeCode?: string;
  workEmail?: string;
  department?: { name: string };
  designation?: { name: string };
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

export default function BankDetailsPage() {
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [bankForm, setBankForm] = useState<BankDetail>({ ...emptyBankForm });
  const [bankLoaded, setBankLoaded] = useState(false);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingBank, setLoadingBank] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const init = async () => {
      try {
        const profile = await getProfile();
        const orgId = profile.data?.organizationId;
        if (!orgId) return;
        const res = await getEmployees(orgId);
        const list = res.data?.data || res.data || [];
        setEmployees(list);
      } catch {
        toast.error("Failed to load employees");
      } finally {
        setLoadingEmployees(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!selectedEmpId) {
      setBankForm({ ...emptyBankForm });
      setBankLoaded(false);
      return;
    }
    const fetchBank = async () => {
      setLoadingBank(true);
      try {
        const res = await getEmployeeBankDetail(selectedEmpId);
        if (res.data) {
          const bd = res.data;
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
        setBankForm({ ...emptyBankForm });
        setBankLoaded(false);
      } finally {
        setLoadingBank(false);
      }
    };
    fetchBank();
  }, [selectedEmpId]);

  const selectedEmployee = employees.find((e) => e.id === selectedEmpId);

  const filteredEmployees = employees.filter((e) => {
    if (!search.trim()) return true;
    const t = search.toLowerCase();
    return (
      e.firstName?.toLowerCase().includes(t) ||
      e.lastName?.toLowerCase().includes(t) ||
      e.employeeCode?.toLowerCase().includes(t) ||
      e.workEmail?.toLowerCase().includes(t)
    );
  });

  const handleSave = async () => {
    if (!selectedEmpId) {
      toast.error("Select an employee first");
      return;
    }
    if (!bankForm.accountHolderName || !bankForm.bankName || !bankForm.accountNumber || !bankForm.ifscCode) {
      toast.error("Account Holder, Bank Name, Account Number, and IFSC are required");
      return;
    }
    try {
      setSaving(true);
      await updateEmployeeBankDetail(selectedEmpId, bankForm);
      toast.success("Bank details saved successfully");
      setBankLoaded(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/salary-structure")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Landmark className="w-6 h-6" /> Bank & Statutory Details
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Configure bank account and statutory information for salary processing.
          </p>
        </div>
      </div>

      {/* Employee Selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Select Employee</CardTitle>
          <CardDescription>Choose an employee to view or edit their bank and statutory details.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Search employees by name, code, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {loadingEmployees ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading employees...
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[300px] overflow-y-auto border rounded-lg p-2">
              {filteredEmployees.map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => setSelectedEmpId(emp.id)}
                  className={`text-left p-3 rounded-lg border transition-colors ${
                    selectedEmpId === emp.id
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border hover:bg-muted/50"
                  }`}
                >
                  <div className="font-medium text-sm">{emp.firstName} {emp.lastName || ""}</div>
                  <div className="text-xs text-muted-foreground">
                    {emp.employeeCode}
                    {emp.designation?.name && ` · ${emp.designation.name}`}
                  </div>
                </button>
              ))}
              {filteredEmployees.length === 0 && (
                <div className="col-span-full text-center py-4 text-sm text-muted-foreground">No employees found.</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bank Form */}
      {selectedEmpId && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Bank & Statutory Details
              {selectedEmployee && (
                <span className="text-muted-foreground font-normal ml-2">
                  — {selectedEmployee.firstName} {selectedEmployee.lastName || ""}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingBank ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading bank details...
              </div>
            ) : (
              <>
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
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="w-4 h-4 mr-1" />
                    {saving ? "Saving..." : bankLoaded ? "Update Details" : "Save Details"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
