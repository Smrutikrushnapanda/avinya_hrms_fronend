"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, CheckCircle, Clock, Calendar } from "lucide-react";
import { useRouter } from "next/navigation";
import { getProfile, getLeaveBalance, getLeaveRequests, getPendingLeaves } from "@/app/api/api";
import { motion } from "framer-motion";
import MobileTabHeader from "../components/MobileTabHeader";
import { MobileCard, MobileBadge } from "../components/MobileCard";
import { MobileFloatingActionButton } from "../components/MobileFloatingActionButton";
import { StaggerReveal, StaggerItem, SpringNumber } from "../components/animation-wrappers";
import { MobileEmptyState } from "../components/MobileEmptyState";
import { MobileSkeleton } from "../components/MobileSkeleton";

interface LeaveBalance {
  id?: string;
  leaveType?: { name?: string };
  leaveTypeName?: string;
  allocated?: number;
  used?: number;
  remaining?: number;
  closingBalance?: number;
}

interface LeaveRequest {
  id: string;
  leaveType?: { name?: string };
  leaveTypeName?: string;
  startDate: string;
  endDate: string;
  status: string;
  createdAt?: string;
  numberOfDays?: number;
  totalDays?: number;
  days?: number;
  duration?: number;
  approvals?: Array<{ level: number; status: string }>;
  requiresManagerApproval?: boolean;
}

const tabs = ["All", "Pending", "Approved", "Rejected"];

function normalizeStatus(status?: string) {
  const s = (status || "").toLowerCase();
  if (!s) return "Unknown";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString();
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

  const fetchLeaveData = useCallback(async () => {
    if (!userId) return;
    try {
      const [balanceRes, requestsRes, pendingRes] = await Promise.all([
        getLeaveBalance(userId),
        getLeaveRequests(userId),
        getPendingLeaves(userId).catch(() => ({ data: [] })),
      ]);
      const balanceData = balanceRes.data;
      if (Array.isArray(balanceData)) setLeaveBalances(balanceData);
      else if (balanceData?.balances) setLeaveBalances(balanceData.balances);

      const requestsData = requestsRes.data;
      if (Array.isArray(requestsData)) setLeaveRequests(requestsData);
      else if (requestsData?.results) setLeaveRequests(requestsData.results);

      const pendingData = pendingRes?.data;
      setPendingCount(Array.isArray(pendingData) ? pendingData.length : 0);
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
        setUserId(profile.userId ?? profile.id ?? "");
        setIsApprover(Boolean(profile.isApprover));
      } catch {
        setIsApprover(false);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (userId) fetchLeaveData();
  }, [userId, fetchLeaveData]);

  const filteredLeaves =
    selectedTab === "All"
      ? leaveRequests
      : leaveRequests.filter((item) => normalizeStatus(item.status) === selectedTab);

  const hasPendingRequests =
    pendingCount > 0 || leaveRequests.some((leave) => normalizeStatus(leave.status) === "Pending");

  const getApprovalState = (leave: LeaveRequest) => {
    let managerStatus: "pending" | "approved" | "rejected" = "pending";
    let hrStatus: "pending" | "approved" | "rejected" = "pending";
    const approvals = Array.isArray(leave?.approvals) ? leave.approvals : [];
    const level1 = approvals.find((a) => a.level === 1);
    const level2 = approvals.find((a) => a.level === 2);
    if (level1?.status === "APPROVED") managerStatus = "approved";
    if (level1?.status === "REJECTED") managerStatus = "rejected";
    if (level2?.status === "APPROVED") hrStatus = "approved";
    if (level2?.status === "REJECTED") hrStatus = "rejected";
    if (leave?.status === "APPROVED") { managerStatus = "approved"; hrStatus = "approved"; }
    else if (leave?.status === "REJECTED" && managerStatus === "pending") managerStatus = "rejected";
    const showManager = (Boolean(level2) && Boolean(level1)) || Boolean(leave?.requiresManagerApproval);
    return { managerStatus, hrStatus, showManager };
  };

  const statusVariant = (status: string) => {
    const n = normalizeStatus(status);
    if (n === "Approved") return "success" as const;
    if (n === "Pending") return "warning" as const;
    if (n === "Rejected") return "danger" as const;
    return "default" as const;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileTabHeader title="Leave" />
        <MobileSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileTabHeader title="Leave" />

      <div className="px-4 -mt-6 z-10 pb-24 space-y-4">
        {isApprover && (
          <MobileCard className="flex gap-2 p-1.5">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/user/dashboard/mobile/leave")}
              className="flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground"
            >
              My Leave
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/user/dashboard/mobile/leave/approve")}
              className="flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold text-muted-foreground"
            >
              Approve
            </motion.button>
          </MobileCard>
        )}

        <MobileCard className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 to-primary/10" />
          {leaveBalances.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No leave balances available</p>
          ) : (
            <div className="space-y-1">
              {leaveBalances.map((balance, index) => {
                const remaining = Number(balance.closingBalance ?? balance.remaining ?? 0);
                const isUnpaid = remaining < 0;
                return (
                  <div key={balance.id || index}>
                    <div className="flex items-center py-2">
                      <div className="w-9 h-9 rounded-full bg-primary/8 flex items-center justify-center mr-3">
                        <Calendar className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-sm text-foreground">
                          {balance.leaveType?.name || balance.leaveTypeName || "Leave"}
                        </p>
                        <p className="text-xs text-muted-foreground">Balance</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-xl font-bold tabular-nums ${isUnpaid ? "text-rose-500" : "text-foreground"}`}>
                          <SpringNumber value={Math.abs(remaining)} />
                          {isUnpaid && <span className="text-xs ml-0.5">(Unpaid)</span>}
                        </p>
                        <p className={`text-xs ${isUnpaid ? "text-rose-500 font-semibold" : "text-muted-foreground"}`}>
                          {isUnpaid ? "Unpaid" : "Available"}
                        </p>
                      </div>
                    </div>
                    {index < leaveBalances.length - 1 && <div className="h-px bg-border ml-12" />}
                  </div>
                );
              })}
            </div>
          )}
        </MobileCard>

        <MobileCard className="flex gap-1 p-1" padded={false}>
          {tabs.map((tab) => (
            <motion.button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              layout
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors relative ${
                selectedTab === tab ? "text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {selectedTab === tab && (
                <motion.span
                  layoutId="leaveTabBg"
                  className="absolute inset-0 bg-primary rounded-xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </motion.button>
          ))}
        </MobileCard>

        {filteredLeaves.length === 0 ? (
          <MobileEmptyState
            icon={<Calendar size={24} />}
            title="No leave requests"
            description="No requests found for this filter."
          />
        ) : (
          <StaggerReveal className="space-y-3" staggerDelay={0.05}>
            {filteredLeaves.map((leave) => {
              const approvalState = getApprovalState(leave);
              return (
                <StaggerItem key={leave.id}>
                  <MobileCard className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm text-foreground">
                          {formatDate(leave.createdAt)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {leave.leaveType?.name || (typeof leave.leaveType === "string" ? leave.leaveType : null) || "Leave"}
                        </p>
                      </div>
                      <MobileBadge variant={statusVariant(leave.status)}>
                        {normalizeStatus(leave.status)}
                      </MobileBadge>
                    </div>

                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-muted-foreground">Leave Date</p>
                        <p className="font-semibold text-sm text-foreground">
                          {formatDate(leave.startDate)} &mdash; {formatDate(leave.endDate)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-muted-foreground">Total</p>
                        <p className="font-semibold text-sm text-foreground tabular-nums">
                          {leave.numberOfDays ?? leave.totalDays ?? leave.days ?? leave.duration ?? "-"}
                        </p>
                      </div>
                    </div>

                    <div className="bg-muted/50 rounded-xl p-3 border border-border/50">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col items-center flex-1">
                          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                          <p className="text-[9px] text-muted-foreground font-semibold mt-1">Applied</p>
                        </div>

                        {approvalState.showManager && (
                          <div className={`h-0.5 flex-1 mx-1 rounded ${
                            approvalState.managerStatus === "approved" ? "bg-emerald-500" :
                            approvalState.managerStatus === "rejected" ? "bg-rose-500" : "bg-amber-300"
                          }`} />
                        )}

                        {approvalState.showManager && (
                          <div className="flex flex-col items-center flex-1">
                            <div className={`w-2.5 h-2.5 rounded-full ${
                              approvalState.managerStatus === "approved" ? "bg-emerald-500" :
                              approvalState.managerStatus === "rejected" ? "bg-rose-500" : "bg-amber-500"
                            }`} />
                            <p className="text-[9px] text-muted-foreground font-semibold mt-1">Manager</p>
                          </div>
                        )}

                        <div className={`h-0.5 flex-1 mx-1 rounded ${
                          approvalState.hrStatus === "approved" ? "bg-emerald-500" :
                          approvalState.hrStatus === "rejected" ? "bg-rose-500" : "bg-amber-300"
                        }`} />

                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-2.5 h-2.5 rounded-full ${
                            approvalState.hrStatus === "approved" ? "bg-emerald-500" :
                            approvalState.hrStatus === "rejected" ? "bg-rose-500" : "bg-amber-500"
                          }`} />
                          <p className="text-[9px] text-muted-foreground font-semibold mt-1">HR</p>
                        </div>
                      </div>
                    </div>
                  </MobileCard>
                </StaggerItem>
              );
            })}
          </StaggerReveal>
        )}
      </div>

      <MobileFloatingActionButton
        actions={
          isApprover
            ? [
                { icon: <CheckCircle className="w-4 h-4" />, label: "Approve", onClick: () => router.push("/user/dashboard/mobile/leave/approve") },
                { icon: <Plus className="w-4 h-4" />, label: "Apply Leave", onClick: () => router.push("/user/dashboard/mobile/leave/apply") },
              ]
            : [{ icon: <Plus className="w-4 h-4" />, label: "Apply Leave", onClick: () => router.push("/user/dashboard/mobile/leave/apply") }]
        }
      />

      {refreshing && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-card border border-border shadow-lg rounded-full px-4 py-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4 animate-spin" />
            Refreshing...
          </div>
        </div>
      )}
    </div>
  );
}
