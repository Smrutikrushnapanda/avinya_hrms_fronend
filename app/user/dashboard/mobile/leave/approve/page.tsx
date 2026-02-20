"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import {
  getProfile,
  getPendingLeaves,
  approveLeave,
} from "@/app/api/api";
import MobileTabHeader from "../../components/MobileTabHeader";

interface PendingLeave {
  id: string;
  leaveType?: {
    name?: string;
  };
  leaveTypeName?: string;
  startDate?: string;
  endDate?: string;
  status?: string;
  numberOfDays?: number;
  totalDays?: number;
  days?: number;
  duration?: number;
  user?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    employeeCode?: string;
  };
  employee?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    employeeCode?: string;
  };
}

export default function MobileLeaveApprovePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [isApprover, setIsApprover] = useState(false);
  const [approverUserId, setApproverUserId] = useState("");
  const [pendingLeaves, setPendingLeaves] = useState<PendingLeave[]>([]);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchPending = useCallback(async (userId: string) => {
    try {
      const res = await getPendingLeaves(userId);
      const data = res.data || [];
      setPendingLeaves(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch pending leaves:", error);
      toast.error("Failed to load approvals");
    }
  }, []);

  const init = useCallback(async () => {
    setLoading(true);
    try {
      const profileRes = await getProfile();
      const profile = profileRes.data || {};
      const userId = profile.userId ?? profile.id ?? "";
      const approverFlag = Boolean(profile.isApprover);
      setIsApprover(approverFlag);

      setApproverUserId(userId);

      if (!userId) {
        toast.error("Unable to load user profile");
        return;
      }

      if (!approverFlag) {
        router.replace("/user/dashboard/mobile/leave");
        return;
      }

      await fetchPending(userId);
    } catch (error) {
      console.error("Failed to load leave approvals page:", error);
      toast.error("Failed to load approvals");
    } finally {
      setLoading(false);
    }
  }, [fetchPending, router]);

  useEffect(() => {
    init();
  }, [init]);

  const handleAction = async (row: PendingLeave, approve: boolean) => {
    if (!approverUserId) return;
    setActionLoadingId(row.id);
    try {
      await approveLeave(row.id, approverUserId, {
        approve,
        remarks: approve ? "Approved" : "Rejected",
      });
      toast.success(approve ? "Leave approved" : "Leave rejected");
      await fetchPending(approverUserId);
    } catch (error) {
      console.error("Leave action failed:", error);
      toast.error("Failed to update leave");
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MobileTabHeader title="Leave" />
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
      <MobileTabHeader title="Leave" />

      <div className="px-5 -mt-12 z-10 pb-24">
        {/* My Leave / Approve Switch */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => router.push("/user/dashboard/mobile/leave")}
            className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors text-gray-600"
          >
            My Leave
          </button>
          <button
            onClick={() => router.push("/user/dashboard/mobile/leave/approve")}
            className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors bg-[#005F90] text-white"
          >
            Approve
          </button>
        </div>

        <div className="space-y-3">
          {pendingLeaves.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">No pending leave requests</p>
            </div>
          ) : (
            pendingLeaves.map((leave) => {
              const requester = leave.user || leave.employee;
              const requesterName = requester
                ? [requester.firstName, requester.middleName, requester.lastName]
                    .filter(Boolean)
                    .join(" ")
                : "Employee";
              const leaveType = leave.leaveType?.name || leave.leaveTypeName || "Leave";
              const totalDays =
                leave.numberOfDays ?? leave.totalDays ?? leave.days ?? leave.duration ?? "-";

              return (
                <div key={leave.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{requesterName}</p>
                      <p className="text-xs text-gray-500">{requester?.employeeCode ?? ""}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-gray-500">{leaveType}</span>
                  </div>

                  <div className="flex justify-between text-xs text-gray-600 mb-3">
                    <span>
                      {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                    </span>
                    <span>Total: {totalDays}</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(leave, true)}
                      disabled={actionLoadingId === leave.id}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white text-sm font-semibold py-2 rounded-lg disabled:opacity-60"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleAction(leave, false)}
                      disabled={actionLoadingId === leave.id}
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
