"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Clock,
  Home,
  Plus,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile, getWfhBalance, getWfhRequests } from "@/app/api/api";
import MobileTabHeader from "../components/MobileTabHeader";

type Approval = {
  level: number;
  status: string;
};

type WfhRequest = {
  id: string;
  date?: string;
  endDate?: string;
  numberOfDays?: number;
  status?: string;
  createdAt?: string;
  approvals?: Approval[];
};

type WfhResponseRow = {
  id?: string;
  date?: string;
  startDate?: string;
  endDate?: string;
  numberOfDays?: number;
  days?: number;
  duration?: number;
  status?: string;
  createdAt?: string;
  approvals?: Approval[];
  wfhRequestId?: string;
  requestId?: string;
  wfhRequest?: WfhResponseRow;
  request?: WfhResponseRow;
};

type WfhBalance = {
  closingBalance?: number;
  remaining?: number;
};

function normalizeStatus(status?: string) {
  const normalized = (status || "").toLowerCase();
  if (!normalized) return "Unknown";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleDateString();
}

function normalizeRequest(row: WfhResponseRow): WfhRequest | null {
  const request = row?.wfhRequest || row?.request || row;
  const requestId = request?.id || row?.wfhRequestId || row?.requestId;
  if (!requestId) return null;

  return {
    id: requestId,
    date: request?.date || request?.startDate,
    endDate: request?.endDate || request?.date || request?.startDate,
    numberOfDays:
      request?.numberOfDays ?? request?.days ?? request?.duration ?? 1,
    status: request?.status || row?.status,
    createdAt: request?.createdAt || row?.createdAt,
    approvals: request?.approvals || row?.approvals || [],
  };
}

export default function MobileWfhPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userId, setUserId] = useState("");
  const [selectedTab, setSelectedTab] = useState("All");
  const [requests, setRequests] = useState<WfhRequest[]>([]);
  const [balance, setBalance] = useState<WfhBalance | null>(null);

  const fetchWfhData = useCallback(async () => {
    if (!userId) return;

    try {
      const [requestsRes, balanceRes] = await Promise.allSettled([
        getWfhRequests(userId),
        getWfhBalance(userId),
      ]);

      if (requestsRes.status === "fulfilled") {
        const rawData = requestsRes.value?.data?.data || requestsRes.value?.data || [];
        const normalized = Array.isArray(rawData)
          ? rawData
              .map((item) => normalizeRequest(item as WfhResponseRow))
              .filter((item): item is WfhRequest => Boolean(item))
          : [];
        setRequests(normalized);
      } else {
        setRequests([]);
      }

      if (balanceRes.status === "fulfilled") {
        setBalance((balanceRes.value?.data || null) as WfhBalance | null);
      } else {
        setBalance(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const profileRes = await getProfile();
        const profile = profileRes.data || {};
        const resolvedUserId =
          profile.userId ?? profile.id ?? profile.employee?.userId ?? "";
        setUserId(resolvedUserId);
      } catch {
        setUserId("");
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchWfhData();
    }
  }, [userId, fetchWfhData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchWfhData();
  }, [fetchWfhData]);

  const getApprovalState = (request: WfhRequest) => {
    let managerStatus: "pending" | "approved" | "rejected" = "pending";
    let hrStatus: "pending" | "approved" | "rejected" = "pending";

    const approvals = Array.isArray(request?.approvals) ? request.approvals : [];
    const level1 = approvals.find((approval) => approval.level === 1);
    const level2 = approvals.find((approval) => approval.level === 2);

    if (level1?.status === "APPROVED") managerStatus = "approved";
    if (level1?.status === "REJECTED") managerStatus = "rejected";
    if (level2?.status === "APPROVED") hrStatus = "approved";
    if (level2?.status === "REJECTED") hrStatus = "rejected";

    if (request?.status === "APPROVED") {
      managerStatus = "approved";
      hrStatus = "approved";
    } else if (request?.status === "REJECTED") {
      if (managerStatus === "pending") managerStatus = "rejected";
    }

    const showManager = Boolean(level2) && Boolean(level1);

    return {
      managerStatus,
      hrStatus,
      showManager,
    };
  };

  const tabs = ["All", "Pending", "Approved", "Rejected"];
  const filteredRequests = useMemo(() => {
    if (selectedTab === "All") return requests;
    return requests.filter(
      (request) => normalizeStatus(request.status) === selectedTab,
    );
  }, [requests, selectedTab]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <MobileTabHeader title="WFH" />

        <div className="px-5 -mt-12 z-10 pb-24 space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
            <div className="space-y-4">
              {[1, 2].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-20 mb-1" />
                    <Skeleton className="h-3 w-14" />
                  </div>
                  <Skeleton className="h-6 w-10" />
                </div>
              ))}
            </div>
          </div>

          <div className="flex bg-gray-100 rounded-xl p-1">
            {tabs.map((tab) => (
              <Skeleton key={tab} className="flex-1 h-9 rounded-lg" />
            ))}
          </div>

          {[1, 2].map((item) => (
            <Skeleton key={item} className="h-36 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MobileTabHeader title="WFH" />

      <div className="px-5 -mt-12 z-10 pb-24">
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-4 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent" />
          <div className="absolute bottom-0 right-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent rotate-180" />
          <div className="absolute bottom-0 left-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent -rotate-90" />
          <div className="absolute top-0 right-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent rotate-90" />

          <div className="relative z-10 flex items-center">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center mr-3">
              <Home className="w-5 h-5 text-blue-500" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800 text-sm">WFH</p>
              <p className="text-xs text-gray-500">Balance</p>
            </div>
            <div className="text-right">
              <p className="text-xl font-bold text-blue-600">
                {Number(balance?.closingBalance ?? balance?.remaining ?? 0)}
              </p>
              <p className="text-xs text-gray-500">Available</p>
            </div>
          </div>
        </div>

        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors ${
                selectedTab === tab ? "bg-[#005F90] text-white" : "text-gray-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {filteredRequests.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-500">No WFH requests found</p>
            </div>
          ) : (
            filteredRequests.map((request) => {
              const approvalState = getApprovalState(request);
              return (
                <div key={request.id} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <p className="font-semibold text-sm text-gray-800">
                      {formatDate(request.createdAt)}
                    </p>
                    <p className="text-xs text-gray-500">WFH</p>
                  </div>

                  <div className="flex justify-between items-center mb-3">
                    <div>
                      <p className="text-xs text-gray-500">Dates</p>
                      <p className="font-semibold text-sm text-gray-800">
                        {formatDate(request.date)} - {formatDate(request.endDate || request.date)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Days</p>
                      <p className="font-semibold text-sm text-gray-800">
                        {request.numberOfDays ?? "-"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center mb-3">
                    {normalizeStatus(request.status) === "Approved" ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : normalizeStatus(request.status) === "Pending" ? (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-500" />
                    )}
                    <span
                      className={`ml-1.5 text-sm font-semibold ${
                        normalizeStatus(request.status) === "Approved"
                          ? "text-green-600"
                          : normalizeStatus(request.status) === "Pending"
                            ? "text-yellow-600"
                            : "text-red-600"
                      }`}
                    >
                      {normalizeStatus(request.status)}
                    </span>
                  </div>

                  <div className="mt-2 bg-gray-50 rounded-lg p-2 border border-gray-100">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col items-center flex-1">
                        <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                        <p className="text-[9px] text-gray-600 font-semibold mt-1">Applied</p>
                      </div>

                      {approvalState.showManager && (
                        <div
                          className={`h-0.5 flex-1 mx-1 rounded ${
                            approvalState.managerStatus === "approved"
                              ? "bg-green-500"
                              : approvalState.managerStatus === "rejected"
                                ? "bg-red-500"
                                : "bg-yellow-300"
                          }`}
                        />
                      )}

                      {approvalState.showManager && (
                        <div className="flex flex-col items-center flex-1">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${
                              approvalState.managerStatus === "approved"
                                ? "bg-green-500"
                                : approvalState.managerStatus === "rejected"
                                  ? "bg-red-500"
                                  : "bg-yellow-500"
                            }`}
                          />
                          <p className="text-[9px] text-gray-600 font-semibold mt-1">Manager</p>
                        </div>
                      )}

                      <div
                        className={`h-0.5 flex-1 mx-1 rounded ${
                          approvalState.hrStatus === "approved"
                            ? "bg-green-500"
                            : approvalState.hrStatus === "rejected"
                              ? "bg-red-500"
                              : "bg-yellow-300"
                        }`}
                      />

                      <div className="flex flex-col items-center flex-1">
                        <div
                          className={`w-2.5 h-2.5 rounded-full ${
                            approvalState.hrStatus === "approved"
                              ? "bg-green-500"
                              : approvalState.hrStatus === "rejected"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                          }`}
                        />
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

      <div className="fixed bottom-16 right-5 z-50">
        <button
          onClick={() => router.push("/user/dashboard/mobile/wfh/apply")}
          className="w-14 h-14 rounded-full bg-[#005F90] flex items-center justify-center shadow-lg animate-bounce"
          aria-label="Add WFH"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      <div className="fixed bottom-4 left-4 z-30">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="bg-white p-2 rounded-full shadow-md border border-gray-200"
          aria-label="Refresh"
        >
          <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>
    </div>
  );
}
