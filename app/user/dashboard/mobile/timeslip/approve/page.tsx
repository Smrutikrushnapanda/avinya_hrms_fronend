"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  getProfile,
  getTimeslipsByApprover,
  approveTimeslip,
} from "@/app/api/api";
import MobileTabHeader from "../../components/MobileTabHeader";

interface TimeslipApprovalRow {
  id: string;
  date: string;
  missing_type: "IN" | "OUT" | "BOTH";
  corrected_in: string | null;
  corrected_out: string | null;
  reason: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  employee?: {
    id?: string;
    firstName?: string;
    middleName?: string;
    lastName?: string;
    employeeCode?: string;
  };
}

export default function MobileTimeslipApprovePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isApprover, setIsApprover] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [timeslips, setTimeslips] = useState<TimeslipApprovalRow[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchApprovals = useCallback(async (approverEmployeeId: string) => {
    try {
      const res = await getTimeslipsByApprover(approverEmployeeId, {
        status: "PENDING",
        page: 1,
        limit: 50,
      });
      const data = res.data?.data || res.data || [];
      setTimeslips(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch timeslip approvals:", error);
      toast.error("Failed to load approvals");
    }
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    try {
      const profileRes = await getProfile();
      const profile = profileRes.data || {};
      const resolvedEmployeeId = profile.employee?.id ?? "";
      const approverFlag = Boolean(profile.isApprover);

      setIsApprover(approverFlag);
      setEmployeeId(resolvedEmployeeId);

      if (!approverFlag) {
        router.replace("/user/dashboard/mobile/timeslip");
        return;
      }

      if (!resolvedEmployeeId) {
        toast.error("Approver profile not linked to employee record");
        return;
      }

      await fetchApprovals(resolvedEmployeeId);
    } catch (error) {
      console.error("Failed to load approvals page:", error);
      toast.error("Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }, [fetchApprovals, router]);

  useEffect(() => {
    init();
  }, [init]);

  const handleAction = async (row: TimeslipApprovalRow, action: "APPROVED" | "REJECTED") => {
    if (!employeeId) return;
    setActionLoadingId(row.id);
    try {
      await approveTimeslip(row.id, {
        approverId: employeeId,
        action,
        remarks: action === "APPROVED" ? "Approved" : "Rejected",
      });
      toast.success(`Timeslip ${action.toLowerCase()}`);
      await fetchApprovals(employeeId);
    } catch (error) {
      console.error("Timeslip action failed:", error);
      toast.error("Failed to update timeslip");
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MobileTabHeader title="Time Slips" />
        <div className="px-5 -mt-12 z-10 pb-24">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-gray-400" />
              <p className="text-sm text-gray-500">Loading approvals...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isApprover) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileTabHeader title="Time Slips" />

      <div className="px-5 -mt-12 z-10 pb-24">
        {/* My Time Slips / Approve Switch */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => router.push("/user/dashboard/mobile/timeslip")}
            className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors text-gray-600"
          >
            My Time Slips
          </button>
          <button
            onClick={() => router.push("/user/dashboard/mobile/timeslip/approve")}
            className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors bg-[#005F90] text-white"
          >
            Approve
          </button>
        </div>

        <div className="space-y-3">
          {timeslips.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">No pending time slips to approve</p>
            </div>
          ) : (
            timeslips.map((row) => {
              const employeeName = row.employee
                ? [row.employee.firstName, row.employee.middleName, row.employee.lastName]
                    .filter(Boolean)
                    .join(" ")
                : "Employee";
              const dateLabel = row.date
                ? new Date(row.date).toLocaleDateString("en-US", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                : "-";

              return (
                <div key={row.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{employeeName}</p>
                      <p className="text-xs text-gray-500">{row.employee?.employeeCode ?? ""}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-500">{dateLabel}</span>
                  </div>

                  <div className="flex justify-between text-xs text-gray-600 mb-3">
                    <span>Missing: {row.missing_type}</span>
                    <span>Status: {row.status}</span>
                  </div>

                  {row.reason && (
                    <p className="text-xs text-gray-500 mb-3">Reason: {row.reason}</p>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(row, "APPROVED")}
                      disabled={actionLoadingId === row.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-60"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(row, "REJECTED")}
                      disabled={actionLoadingId === row.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-500 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-60"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
