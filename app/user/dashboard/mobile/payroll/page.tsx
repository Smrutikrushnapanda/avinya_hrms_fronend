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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import MobileTabHeader from "../components/MobileTabHeader";
import { MobileCard } from "../components/MobileCard";
import { MobileEmptyState } from "../components/MobileEmptyState";
import { StaggerReveal, StaggerItem, SpringNumber } from "../components/animation-wrappers";
import { MobileCardSkeleton } from "../components/MobileSkeleton";

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
      if (!userId) throw new Error("User not authenticated");

      const employeeRes = await getEmployeeByUserId(userId);
      const employee = employeeRes.data?.data ?? employeeRes.data;
      const employeeId = employee?.id;
      const organizationId = employee?.organizationId ?? profileRes.data?.organizationId;
      if (!employeeId || !organizationId) throw new Error("Employee profile not found");

      const res = await getPayrollRecords({ organizationId, employeeId, status: "paid", limit: 200, page: 1 });
      const list = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data) ? res.data : [];
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

  useEffect(() => { fetchPayslips(); }, [fetchPayslips]);

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
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <MobileTabHeader title="Payslips" backHref="/user/dashboard/mobile" />

      <div className="px-4 -mt-11 relative z-10 space-y-4 pb-6">
        <MobileCard className="relative overflow-hidden text-center">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 to-primary/10" />
          <div className="py-3">
            <div className="w-16 h-16 rounded-full bg-primary/8 mx-auto mb-3 flex items-center justify-center">
              <BadgeIndianRupee className="w-8 h-8 text-primary" />
            </div>
            <p className="text-4xl font-bold text-foreground tabular-nums">
              <SpringNumber value={records.length} />
            </p>
            <p className="text-sm text-muted-foreground mt-1">Payslips Available</p>
            {records.length > 0 && (
              <div className="inline-flex mt-3 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                Total Earned: {formatCurrency(totalEarnings)}
              </div>
            )}
          </div>
        </MobileCard>

        <div className="flex justify-end">
          <Button
            onClick={handleRefresh}
            disabled={loading}
            loading={refreshing}
            variant="ghost"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary active:scale-95 transition-transform"
          >
            <RotateCcw className="w-4 h-4" />
            Refresh
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            <MobileCardSkeleton />
            <MobileCardSkeleton />
            <MobileCardSkeleton />
          </div>
        ) : records.length === 0 ? (
          <MobileEmptyState
            icon={<FileText size={28} />}
            title="No payslips yet"
            description="Payslips will appear here after HR processes them."
          />
        ) : (
          <MobileCard>
            <h3 className="text-lg font-bold text-foreground mb-4">Payment History</h3>
            <StaggerReveal className="space-y-3" staggerDelay={0.05}>
              {records.map((record) => {
                const isDownloading = downloadingId === record.id;
                return (
                  <StaggerItem key={record.id}>
                    <div className="bg-muted/50 rounded-xl p-4 border border-border/50 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/8 flex items-center justify-center shrink-0">
                          <ReceiptText className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {record.payPeriod || "-"}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {formatDate(record.periodStart)} &mdash; {formatDate(record.periodEnd)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-foreground tabular-nums">
                            {formatCurrency(record.netPay)}
                          </p>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold mt-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                            Paid
                          </span>
                        </div>
                      </div>
                      <Button
                        onClick={() => handleDownload(record)}
                        loading={isDownloading}
                        variant="outline"
                        className="w-full h-9 border-primary/30 rounded-xl inline-flex items-center justify-center gap-2 text-primary text-sm font-semibold active:scale-95 transition-transform"
                      >
                        <Download className="w-4 h-4" />
                        Download Payslip
                      </Button>
                    </div>
                  </StaggerItem>
                );
              })}
            </StaggerReveal>
          </MobileCard>
        )}
      </div>
    </div>
  );
}
