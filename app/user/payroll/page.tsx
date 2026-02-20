"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeDollarSign, Calendar, Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getProfile, getEmployeeByUserId, getPayrollRecords, downloadPayrollSlip } from "@/app/api/api";

type PayrollStatus = "draft" | "processed" | "paid";

interface PayrollRecord {
  id: string;
  employeeId: string;
  payPeriod: string;
  periodStart: string;
  periodEnd: string;
  totalEarnings: number;
  totalDeductions: number;
  netPay: number;
  status: PayrollStatus;
  createdAt?: string;
}

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getStatusBadgeClass = (status: PayrollStatus) => {
  if (status === "paid") return "bg-green-100 text-green-700 border-green-200";
  if (status === "processed") return "bg-blue-100 text-blue-700 border-blue-200";
  return "bg-amber-100 text-amber-700 border-amber-200";
};

export default function PayrollPage() {
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchPayrollRecords = useCallback(async (orgId: string, empId: string) => {
    const response = await getPayrollRecords({
      organizationId: orgId,
      employeeId: empId,
      page: 1,
      limit: 200,
    });

    const list = Array.isArray(response.data?.data) ? response.data.data : [];
    setRecords(
      list.sort((a: PayrollRecord, b: PayrollRecord) => {
        const left = new Date(b.periodEnd || b.createdAt || 0).getTime();
        const right = new Date(a.periodEnd || a.createdAt || 0).getTime();
        return left - right;
      })
    );
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const profileRes = await getProfile();
        const userId = profileRes.data?.id || profileRes.data?.userId;
        const orgId = profileRes.data?.organizationId;

        if (!userId || !orgId) {
          throw new Error("Missing profile details");
        }

        const employeeRes = await getEmployeeByUserId(userId);
        const empId = employeeRes.data?.id || employeeRes.data?.data?.id;

        if (!empId) {
          throw new Error("Employee profile not found");
        }

        setEmployeeId(empId);
        setOrganizationId(orgId);
        await fetchPayrollRecords(orgId, empId);
      } catch {
        toast.error("Failed to load salary slips");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [fetchPayrollRecords]);

  const currentSlip = useMemo(() => (records.length > 0 ? records[0] : null), [records]);

  const handleDownload = async (recordId: string) => {
    try {
      setDownloadingId(recordId);
      const response = await downloadPayrollSlip(recordId);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `salary-slip-${recordId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download salary slip");
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading salary slips...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <BadgeDollarSign className="h-6 w-6 text-blue-600" />
            Salary Slips
          </CardTitle>
          <CardDescription>
            View your current and previous salary slips and download them anytime.
          </CardDescription>
        </CardHeader>
      </Card>

      {currentSlip ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Current Salary Slip</CardTitle>
            <CardDescription>
              Pay Period: {currentSlip.payPeriod || `${formatDate(currentSlip.periodStart)} - ${formatDate(currentSlip.periodEnd)}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg border p-4 bg-green-50">
                <p className="text-xs text-muted-foreground">Net Pay</p>
                <p className="text-xl font-semibold text-green-700">{currency.format(Number(currentSlip.netPay || 0))}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Total Earnings</p>
                <p className="text-lg font-semibold">{currency.format(Number(currentSlip.totalEarnings || 0))}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs text-muted-foreground">Total Deductions</p>
                <p className="text-lg font-semibold">{currency.format(Number(currentSlip.totalDeductions || 0))}</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Badge className={getStatusBadgeClass(currentSlip.status)}>{currentSlip.status.toUpperCase()}</Badge>
              <Button
                onClick={() => handleDownload(currentSlip.id)}
                disabled={downloadingId === currentSlip.id}
                size="sm"
              >
                {downloadingId === currentSlip.id ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Download className="h-4 w-4 mr-2" />
                )}
                Download Current Slip
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            <FileText className="h-10 w-10 mx-auto mb-3 opacity-60" />
            No salary slips found for your account yet.
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Salary Slip History
          </CardTitle>
          <CardDescription>
            Employee ID: {employeeId || "-"} | Organization: {organizationId || "-"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {records.length === 0 ? (
            <p className="text-sm text-muted-foreground">No previous slips available.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Pay Period</th>
                    <th className="py-2 pr-4">Date Range</th>
                    <th className="py-2 pr-4">Net Pay</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((record) => (
                    <tr key={record.id} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 font-medium">{record.payPeriod || "-"}</td>
                      <td className="py-3 pr-4">
                        {formatDate(record.periodStart)} - {formatDate(record.periodEnd)}
                      </td>
                      <td className="py-3 pr-4">{currency.format(Number(record.netPay || 0))}</td>
                      <td className="py-3 pr-4">
                        <Badge className={getStatusBadgeClass(record.status)}>{record.status.toUpperCase()}</Badge>
                      </td>
                      <td className="py-3">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDownload(record.id)}
                          disabled={downloadingId === record.id}
                        >
                          {downloadingId === record.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Download className="h-4 w-4 mr-2" />
                          )}
                          Download
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
