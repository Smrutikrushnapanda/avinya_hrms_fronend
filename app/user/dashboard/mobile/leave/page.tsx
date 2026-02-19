"use client";

import { useEffect, useState, useCallback } from "react";
import { Bell, Plus, CheckCircle, Clock, XCircle, Calendar, Menu } from "lucide-react";
import { useRouter } from "next/navigation";
import { getProfile, getLeaveBalance, getLeaveRequests, getPendingLeaves } from "@/app/api/api";
import { Skeleton } from "@/components/ui/skeleton";

interface LeaveBalance {
  id?: string;
  leaveType?: {
    name?: string;
  };
  leaveTypeName?: string;
  allocated?: number;
  used?: number;
  remaining?: number;
  closingBalance?: number;
}

interface LeaveRequest {
  id: string;
  leaveType?: {
    name?: string;
  };
  leaveTypeName?: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt?: string;
  numberOfDays?: number;
  totalDays?: number;
  days?: number;
  duration?: number;
  approvals?: Array<{
    level: number;
    status: string;
  }>;
  requiresManagerApproval?: boolean;
}

export default function MobileLeavePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState("");
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalance[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [selectedTab, setSelectedTab] = useState("All");
  const [isApprover, setIsApprover] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [fabOpen, setFabOpen] = useState(false);

  const fetchLeaveData = useCallback(async () => {
    if (!userId) return;
 try {
      const    [balanceRes, requestsRes, pendingRes] = await Promise.all([
        getLeaveBalance(userId),
        getLeaveRequests(userId),
        getPendingLeaves(userId).catch(() => ({ data: [] })),
      ]);

      // Handle balance data
      const balanceData = balanceRes.data;
      if (Array.isArray(balanceData)) {
        setLeaveBalances(balanceData);
      } else if (balanceData?.balances) {
        setLeaveBalances(balanceData.balances);
      }

      // Handle requests data
      const requestsData = requestsRes.data;
      if (Array.isArray(requestsData)) {
        setLeaveRequests(requestsData);
      } else if (requestsData?.results) {
        setLeaveRequests(requestsData.results);
      }

      // Handle pending count
      const pendingData = pendingRes?.data;
      if (Array.isArray(pendingData)) {
        setPendingCount(pendingData.length);
        setIsApprover(pendingData.length > 0);
      } else {
        setPendingCount(0);
        setIsApprover(false);
      }
    } catch (error) {
      console.error("Error fetching leave data:", error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await getProfile();
        const profile = profileRes.data || {};
        const resolvedUserId = profile.userId ?? profile.id ?? "";
        setUserId(resolvedUserId);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching profile:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchLeaveData();
    }
  }, [userId, fetchLeaveData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchLeaveData();
    } finally {
      setRefreshing(false);
    }
  }, [fetchLeaveData]);

  const normalizeStatus = (status?: string) => {
    const s = (status || "").toLowerCase();
    if (!s) return "Unknown";
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString();
  };

  const filteredLeaves =
    selectedTab === "All"
      ? leaveRequests
      : leaveRequests.filter(
          (item) => normalizeStatus(item.status) === selectedTab
        );

  const hasPendingRequests =
    pendingCount > 0 ||
    leaveRequests.some((leave) => normalizeStatus(leave.status) === "Pending");

  const getApprovalState = (leave: LeaveRequest) => {
    let managerStatus: "pending" | "approved" | "rejected" = "pending";
    let hrStatus: "pending" | "approved" | "rejected" = "pending";

    const approvals = Array.isArray(leave?.approvals) ? leave.approvals : [];
    const level1 = approvals.find((a: any) => a.level === 1);
    const level2 = approvals.find((a: any) => a.level === 2);

    if (level1?.status === "APPROVED") managerStatus = "approved";
    if (level1?.status === "REJECTED") managerStatus = "rejected";

    if (level2?.status === "APPROVED") hrStatus = "approved";
    if (level2?.status === "REJECTED") hrStatus = "rejected";

    if (leave?.status === "APPROVED") {
      managerStatus = "approved";
      hrStatus = "approved";
    } else if (leave?.status === "REJECTED") {
      if (managerStatus === "pending") managerStatus = "rejected";
    }

    const showManager =
      (Boolean(level2) && Boolean(level1)) || Boolean(leave?.requiresManagerApproval);
    return { managerStatus, hrStatus, showManager };
  };

  const getStatusColor = (status: string) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case "Approved":
        return "bg-green-100 text-green-800 border-green-200";
      case "Pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Rejected":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const tabs = ["All", "Pending", "Approved", "Rejected"];

  const toggleFab = () => {
    if (isApprover) {
      setFabOpen(!fabOpen);
    } else {
      router.push("/user/dashboard/mobile/leave/apply");
    }
  };

  const handleAddLeave = () => {
    router.push("/user/dashboard/mobile/leave/apply");
    setFabOpen(false);
  };

  const handleApprove = () => {
    router.push("/user/dashboard/mobile/leave");
    setFabOpen(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <div className="bg-[#005F90] text-white px-4 pt-5 pb-16 flex items-center justify-between">
          <div className="flex items-center">
            <div className="bg-white/20 rounded-full px-4 py-2">
              <h2 className="text-xl font-bold">Leave</h2>
            </div>
          </div>
          <Bell className="w-5 h-5" />
        </div>

        {/* Loading Skeleton */}
        <div className="px-5 -mt-12 z-10">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent" />
            <div className="absolute bottom-0 right-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent rotate-180" />
            <div className="absolute bottom-0 left-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent rotate-270" />
            <div className="absolute top-0 right-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent rotate-90" />
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-6 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="px-5 mb-4">
          <div className="flex bg-gray-100 rounded-xl p-1">
            {tabs.map((tab) => (
              <Skeleton key={tab} className="flex-1 h-9 rounded-lg" />
            ))}
          </div>
        </div>

        {/* Cards Skeleton */}
        <div className="px-5 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#005F90] text-white px-4 pt-5 pb-16 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-white/20 rounded-full px-4 py-2">
            <h2 className="text-xl font-bold">Leave</h2>
          </div>
        </div>
        <Bell className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="px-5 -mt-12 z-10 pb-24">
        {/* Summary Card - Matching RN */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-4 relative overflow-hidden">
          {/* Triangle Decorations */}
          <div className="absolute top-0 left-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent" />
          <div className="absolute bottom-0 right-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent rotate-180" />
          <div className="absolute bottom-0 left-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent rotate-270" />
          <div className="absolute top-0 right-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent rotate-90" />

          {leaveBalances.length === 0 ? (
            <div className="py-4 text-center">
              <p className="text-sm text-gray-500">No leave balances available</p>
            </div>
          ) : (
            <div className="space-y-1 relative z-10">
              {leaveBalances.map((balance, index) => (
                <div key={balance.id || index}>
                  <div className="flex items-center py-2">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                      <Calendar className="w-5 h-5 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-gray-800 text-sm">
                        {balance.leaveType?.name || balance.leaveTypeName || "Leave"}
                      </p>
                      <p className="text-xs text-gray-500">Balance</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-blue-600">
                        {balance.closingBalance ?? balance.remaining ?? 0}
                      </p>
                      <p className="text-xs text-gray-500">Available</p>
                    </div>
                  </div>
                  {index < leaveBalances.length - 1 && (
                    <div className="h-px bg-gray-200 my-1 ml-12" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter Tabs - Matching RN */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
                selectedTab === tab
                  ? "bg-[#005F90] text-white"
                  : "text-gray-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Leave Applications */}
        <div className="space-y-3" style={{ maxHeight: 'none', overflowY: 'visible' }}>
          {filteredLeaves.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">No leave requests found</p>
            </div>
          ) : (
            filteredLeaves.map((leave) => {
              const approvalState = getApprovalState(leave);
              return (
                <div key={leave.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  {/* Card Header */}
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">
                        {formatDate(leave.createdAt)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {leave.leaveType?.name || (typeof leave.leaveType === "string" ? leave.leaveType : null) || "Leave"}
                      </p>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="text-xs text-gray-500">Leave Date</p>
                      <p className="font-semibold text-sm text-gray-800">
                        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Total Leave</p>
                      <p className="font-semibold text-sm text-gray-800">
                        {leave.numberOfDays ?? leave.totalDays ?? leave.days ?? leave.duration ?? "-"}
                      </p>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center mb-3">
                    {normalizeStatus(leave.status) === "Approved" ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : normalizeStatus(leave.status) === "Pending" ? (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span className={`ml-1.5 text-sm font-semibold ${
                      normalizeStatus(leave.status) === "Approved"
                        ? "text-green-600"
                        : normalizeStatus(leave.status) === "Pending"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}>
                      {normalizeStatus(leave.status)}
                    </span>
                  </div>

                  {/* Timeline - Matching RN */}
                  <div className="mt-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <div className="flex items-center justify-between">
                      {/* Applied */}
                      <div className="flex flex-col items-center flex-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        <p className="text-[9px] text-gray-600 font-semibold mt-1">Applied</p>
                      </div>

                      {/* Line to Manager */}
                      {approvalState.showManager && (
                        <div className={`h-0.5 flex-1 mx-1 rounded ${
                          approvalState.managerStatus === "approved"
                            ? "bg-green-500"
                            : approvalState.managerStatus === "rejected"
                            ? "bg-red-500"
                            : "bg-yellow-300"
                        }`} />
                      )}

                      {/* Manager */}
                      {approvalState.showManager && (
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            approvalState.managerStatus === "approved"
                              ? "bg-green-500"
                              : approvalState.managerStatus === "rejected"
                              ? "bg-red-500"
                              : "bg-yellow-500"
                          }`} />
                          <p className="text-[9px] text-gray-600 font-semibold mt-1">Manager</p>
                        </div>
                      )}

                      {/* Line to HR */}
                      <div className={`h-0.5 flex-1 mx-1 rounded ${
                        approvalState.hrStatus === "approved"
                          ? "bg-green-500"
                          : approvalState.hrStatus === "rejected"
                          ? "bg-red-500"
                          : "bg-yellow-300"
                      }`} />

                      {/* HR */}
                      <div className="flex flex-col items-center flex-1">
                        <div className={`w-2.5 h-2.5 rounded-full ${
                          approvalState.hrStatus === "approved"
                            ? "bg-green-500"
                            : approvalState.hrStatus === "rejected"
                            ? "bg-red-500"
                            : "bg-yellow-500"
                        }`} />
                        <p className="text-[9px] text-gray-600 font-semibold mt-1">HR</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Overlay for FAB */}
      {isApprover && fabOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setFabOpen(false)}
        />
      )}

      {/* FAB Actions */}
      {isApprover && fabOpen && (
        <div className="fixed bottom-32 right-5 flex gap-3 z-50">
          <button
            onClick={handleApprove}
            className="w-20 h-20 rounded-2xl bg-green-500 flex flex-col items-center justify-center shadow-lg"
          >
            <div className="relative">
              <CheckCircle className="w-5 h-5 text-white" />
              {hasPendingRequests && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
              )}
            </div>
            <span className="text-white text-[11px] font-bold mt-1">Approve</span>
            <span className="text-white text-[9px] opacity-90">Leaves</span>
          </button>
          <button
            onClick={handleAddLeave}
            className="w-20 h-20 rounded-2xl bg-blue-500 flex flex-col items-center justify-center shadow-lg"
          >
            <Plus className="w-5 h-5 text-white" />
            <span className="text-white text-[11px] font-bold mt-1">Add Leave</span>
            <span className="text-white text-[9px] opacity-90">Request</span>
          </button>
        </div>
      )}

      {/* Main FAB */}
      <div className="fixed bottom-16 right-5 z-50">
        <button
          onClick={toggleFab}
          className="w-14 h-14 rounded-full bg-[#005F90] flex items-center justify-center shadow-lg"
        >
          {isApprover ? (
            <Menu className="w-6 h-6 text-white" />
          ) : (
            <Plus className="w-6 h-6 text-white" />
          )}
          {hasPendingRequests && isApprover && !fabOpen && (
            <div className="absolute -top-3 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
          )}
        </button>
      </div>

      {/* Pull to refresh indicator would need JavaScript - using button instead */}
      <div className="fixed bottom-4 left-4 z-30">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="bg-white p-2 rounded-full shadow-md border border-gray-200"
        >
          <svg
            className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
