"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeIndianRupee,
  Download,
  FileText,
  Loader2,
  ReceiptText,
  RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import {
  downloadPayrollSlip,
  getEmployeeByUserId,
  getPayrollRecords,
  getProfile,
} from "@/app/api/api";
import { Skeleton } from "@/components/ui/skeleton";
import MobileTabHeader from "../components/MobileTabHeader";

interface PayrollRecord {
  id: string;
  payPeriod: string;
  periodStart: string;
  periodEnd: string;
  netPay: number;
  grossPay?: number;
  deductions?: number;
  status: string;
}

const formatDate = (dateStr?: string): string => {
  if (!dateStr) return "N/A";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatCurrency = (amount?: number): string => {
  if (amount == null) return "N/A";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export default function MobilePayrollPage() {
  const [records, setRecords] = useState<PayrollRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const fetchPayslips = useCallback(async () => {
    try {
      const profileRes = await getProfile();
      const userId = profileRes.data?.id ?? profileRes.data?.userId;

      if (!userId) {
        throw new Error("User not authenticated");
      }

      const employeeRes = await getEmployeeByUserId(userId);
      const employee = employeeRes.data?.data ?? employeeRes.data;
      const employeeId = employee?.id;
      const organizationId = employee?.organizationId ?? profileRes.data?.organizationId;

      if (!employeeId || !organizationId) {
        throw new Error("Employee profile not found");
      }

      const res = await getPayrollRecords({
        organizationId,
        employeeId,
        status: "paid",
        limit: 200,
        page: 1,
      });

      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : [];

      const sorted = [...list].sort((a, b) => {
        const left = new Date(b.periodEnd || b.createdAt || 0).getTime();
        const right = new Date(a.periodEnd || a.createdAt || 0).getTime();
        return left - right;
      });

      setRecords(sorted);
    } catch (error: any) {
      console.error("Error fetching payslips:", error);
      toast.error(error?.message || "Failed to load payslips");
      setRecords([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPayslips();
  }, [fetchPayslips]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchPayslips();
  };

  const handleDownload = async (record: PayrollRecord) => {
    try {
      setDownloadingId(record.id);
      const response = await downloadPayrollSlip(record.id);
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `payslip-${record.payPeriod || record.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Payslip downloaded");
    } catch {
      toast.error("Failed to download payslip");
    } finally {
      setDownloadingId(null);
    }
  };

  const totalEarnings = useMemo(
    () => records.reduce((sum, r) => sum + (Number(r.netPay) || 0), 0),
    [records],
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col pb-20">
      <MobileTabHeader title="Payslips" backHref="/user/dashboard/mobile" className="bg-[#026D94]" />

      <div className="px-5 -mt-11 relative z-10 space-y-4">
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-[#E8ECEF] relative overflow-hidden">
          <div className="absolute top-2 left-2 w-0 h-0 border-t-[56px] border-t-[#E1F4FF] border-r-[56px] border-r-transparent" />
          <div className="absolute bottom-2 right-2 w-0 h-0 border-t-[56px] border-t-[#E1F4FF] border-r-[56px] border-r-transparent rotate-180" />
          <div className="absolute bottom-2 left-2 w-0 h-0 border-t-[56px] border-t-[#E1F4FF] border-r-[56px] border-r-transparent rotate-270" />
          <div className="absolute top-2 right-2 w-0 h-0 border-t-[56px] border-t-[#E1F4FF] border-r-[56px] border-r-transparent rotate-90" />

          <div className="relative z-10 text-center py-3">
            <div className="w-16 h-16 rounded-full bg-[#026D94]/10 mx-auto mb-3 flex items-center justify-center">
              <BadgeIndianRupee className="w-8 h-8 text-[#026D94]" />
            </div>
            <p className="text-4xl font-bold text-slate-900">{records.length}</p>
            <p className="text-sm text-slate-500 mt-1">Payslips Available</p>
            {records.length > 0 && (
              <div className="inline-flex mt-3 px-4 py-2 rounded-full bg-[#026D94] text-white text-sm font-semibold">
                Total Earned: {formatCurrency(totalEarnings)}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 text-sm font-medium text-[#026D94] disabled:opacity-60"
          >
            <RotateCcw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
            <Skeleton className="h-28 rounded-2xl" />
          </div>
        ) : records.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 text-center shadow-sm border border-gray-100">
            <FileText className="w-12 h-12 text-slate-400 mx-auto" />
            <p className="text-lg font-bold text-slate-900 mt-4">No payslips yet</p>
            <p className="text-sm text-slate-500 mt-2">
              Payslips will appear here after HR processes them.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Payment History</h3>

            <div className="space-y-3">
              {records.map((record) => {
                const isDownloading = downloadingId === record.id;

                return (
                  <div key={record.id} className="bg-gray-50 rounded-xl p-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#026D94]/10 flex items-center justify-center shrink-0">
                        <ReceiptText className="w-5 h-5 text-[#026D94]" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{record.payPeriod || "-"}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {formatDate(record.periodStart)} - {formatDate(record.periodEnd)}
                        </p>
                      </div>

                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900">{formatCurrency(record.netPay)}</p>
                        <div className="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-100">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
                          <span className="text-[10px] font-semibold text-green-700">Paid</span>
                        </div>
                      </div>
                    </div>

                    <button
                      className="mt-3 w-full h-9 border border-[#026D94] rounded-lg inline-flex items-center justify-center gap-2 text-[#026D94] text-sm font-semibold disabled:opacity-60"
                      onClick={() => handleDownload(record)}
                      disabled={isDownloading}
                    >
                      {isDownloading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      {isDownloading ? "Downloading..." : "Download Payslip"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
