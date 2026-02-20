"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Menu, LogIn, LogOut, Eye, Clock, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { getProfile, getTimeslips } from "@/app/api/api";
import { Skeleton } from "@/components/ui/skeleton";
import MobileTabHeader from "../components/MobileTabHeader";

interface Timeslip {
  id: string | number;
  date: string;
  corrected_in: string | null;
  corrected_out: string | null;
  missing_type: "IN" | "OUT" | "BOTH" | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
}

interface TimestampEntry {
  id: string | number;
  date: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  checkIn: {
    time: string | null;
    location: string;
  } | null;
  checkOut: {
    time: string | null;
    location: string;
  } | null;
}

type Tab = "All" | "Pending" | "Approved" | "Rejected";

export default function MobileTimeslipPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeslips, setTimeslips] = useState<TimestampEntry[]>([]);
  const [selectedTab, setSelectedTab] = useState<Tab>("All");
  const [isApprover, setIsApprover] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);

  const fetchTimeslips = useCallback(async () => {
    try {
      // Fetch timeslips
      const timeslipsRes = await getTimeslips();
      const data = timeslipsRes.data;
      
      let timeslipsData: Timeslip[] = [];
      if (Array.isArray(data)) {
        timeslipsData = data;
      } else if (data?.results) {
        timeslipsData = data.results;
      } else if (data?.data) {
        timeslipsData = Array.isArray(data.data) ? data.data : [data.data];
      }

      // Format timeslips data
      const formattedEntries: TimestampEntry[] = timeslipsData.map((slip) => {
        const status = ["PENDING", "APPROVED", "REJECTED"].includes(slip.status)
          ? slip.status
          : "PENDING";

        const formattedDate = new Date(slip.date).toLocaleDateString("en-US", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });

        return {
          id: slip.id,
          date: formattedDate,
          status,
          checkIn:
            slip.missing_type === "IN" || slip.missing_type === "BOTH"
              ? {
                  time: slip.corrected_in
                    ? new Date(slip.corrected_in).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : null,
                  location: "Office - Main Building",
                }
              : null,
          checkOut:
            slip.missing_type === "OUT" || slip.missing_type === "BOTH"
              ? {
                  time: slip.corrected_out
                    ? new Date(slip.corrected_out).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : null,
                  location: "Office - Main Building",
                }
              : null,
        };
      });

      setTimeslips(formattedEntries);
    } catch (error) {
      console.error("Error fetching timeslips:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchProfileAndApprover = useCallback(async () => {
    try {
      const profileRes = await getProfile();
      const profile = profileRes.data || {};
      setIsApprover(Boolean(profile.isApprover));
    } catch (error) {
      console.error("Error fetching profile:", error);
      setIsApprover(false);
    }
  }, []);

  useEffect(() => {
    fetchProfileAndApprover();
    fetchTimeslips();
  }, [fetchProfileAndApprover, fetchTimeslips]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchTimeslips();
    } finally {
      setRefreshing(false);
    }
  }, [fetchTimeslips]);

  // Calculate summary data
  const timestampData = {
    all: timeslips.length,
    pending: timeslips.filter((entry) => entry.status === "PENDING").length,
    approved: timeslips.filter((entry) => entry.status === "APPROVED").length,
    rejected: timeslips.filter((entry) => entry.status === "REJECTED").length,
  };

  const tabs: Tab[] = ["All", "Pending", "Approved", "Rejected"];

  const filteredTimestamps = timeslips.filter((entry) => {
    if (selectedTab === "All") return true;
    return entry.status === selectedTab.toUpperCase();
  });

  const hasPendingRequests = timeslips.some(
    (entry) => entry.status === "PENDING"
  );

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "APPROVED":
        return "#10B981";
      case "PENDING":
        return "#F59E0B";
      case "REJECTED":
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  const getStatusBgColor = (status: string): string => {
    switch (status) {
      case "APPROVED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "REJECTED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const canApprove = isApprover;

  const toggleFab = () => {
    if (canApprove) {
      setFabOpen(!fabOpen);
    } else {
      router.push("/user/dashboard/mobile/timeslip/add");
    }
  };

  const handleAddTimeslip = () => {
    router.push("/user/dashboard/mobile/timeslip/add");
    setFabOpen(false);
  };

  const handleApprove = () => {
    router.push("/user/dashboard/mobile/timeslip/approve");
    setFabOpen(false);
  };

  const handleSeeDetails = (entryId: string | number) => {
    router.push(`/user/timeslips?id=${entryId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Header */}
        <MobileTabHeader title="Time Slips" />

        {/* Loading Skeleton */}
        <div className="px-5 -mt-12 z-10">
          <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-4 relative overflow-hidden">
            {/* Triangle Decorations */}
            <div className="absolute top-0 left-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent" />
            <div className="absolute bottom-0 right-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent rotate-180" />
            <div className="absolute bottom-0 left-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent rotate-270" />
            <div className="absolute top-0 right-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent rotate-90" />
            
            <div className="flex justify-between items-center relative z-10">
              <div className="flex flex-col items-center flex-1">
                <div className="w-2 h-2 rounded-full bg-gray-400 mb-2" />
                <Skeleton className="h-6 w-8 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="h-10 w-px bg-gray-200 mx-2" />
              <div className="flex flex-col items-center flex-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500 mb-2" />
                <Skeleton className="h-6 w-8 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="h-10 w-px bg-gray-200 mx-2" />
              <div className="flex flex-col items-center flex-1">
                <div className="w-2 h-2 rounded-full bg-green-500 mb-2" />
                <Skeleton className="h-6 w-8 mb-1" />
                <Skeleton className="h-3 w-12" />
              </div>
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
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <MobileTabHeader title="Time Slips" />

      {/* Content */}
      <div className="px-5 -mt-12 z-10 pb-24">
        {/* My Time Slips / Approve Switch - only shown for approvers */}
        {canApprove && (
          <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
            <button
              onClick={() => router.push("/user/dashboard/mobile/timeslip")}
              className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors bg-[#005F90] text-white"
            >
              My Time Slips
            </button>
            <button
              onClick={() => router.push("/user/dashboard/mobile/timeslip/approve")}
              className="flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-colors text-gray-600"
            >
              Approve
            </button>
          </div>
        )}

        {/* Summary Card - Matching RN */}
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100 mb-4 relative overflow-hidden">
          {/* Triangle Decorations */}
          <div className="absolute top-0 left-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent" />
          <div className="absolute bottom-0 right-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent rotate-180" />
          <div className="absolute bottom-0 left-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent rotate-270" />
          <div className="absolute top-0 right-0 w-0 h-0 border-t-[60px] border-t-blue-100 border-r-[60px] border-r-transparent rotate-90" />
          
          <div className="flex justify-between items-center relative z-10">
            {/* Total */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-2 h-2 rounded-full bg-gray-500 mb-2" />
              <p className="text-2xl font-bold text-gray-800">{timestampData.all}</p>
              <p className="text-xs text-gray-500 font-medium">Total</p>
            </div>
            
            {/* Divider */}
            <div className="h-10 w-px bg-gray-200 mx-2" />
            
            {/* Pending */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mb-2" />
              <p className="text-2xl font-bold text-yellow-600">{timestampData.pending}</p>
              <p className="text-xs text-gray-500 font-medium">Pending</p>
            </div>
            
            {/* Divider */}
            <div className="h-10 w-px bg-gray-200 mx-2" />
            
            {/* Approved */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-2 h-2 rounded-full bg-green-500 mb-2" />
              <p className="text-2xl font-bold text-green-600">{timestampData.approved}</p>
              <p className="text-xs text-gray-500 font-medium">Approved</p>
            </div>

            {/* Divider */}
            <div className="h-10 w-px bg-gray-200 mx-2" />
            
            {/* Rejected */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-2 h-2 rounded-full bg-red-500 mb-2" />
              <p className="text-2xl font-bold text-red-600">{timestampData.rejected}</p>
              <p className="text-xs text-gray-500 font-medium">Rejected</p>
            </div>
          </div>
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

        {/* Timeslip Cards */}
        <div className="space-y-3">
          {filteredTimestamps.length === 0 ? (
            <div className="py-8 text-center">
              <Clock className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No {selectedTab.toLowerCase()} timeslips found</p>
            </div>
          ) : (
            filteredTimestamps.map((entry) => (
              <div 
                key={entry.id.toString()} 
                className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden relative"
              >
                {/* Date Badge - Top Right */}
                <div className="absolute top-0 right-0 bg-[#005F90] px-3 py-1.5 rounded-bl-lg z-10">
                  <p className="text-white text-[10px] font-bold">{entry.date}</p>
                </div>

                {/* Time Entries Container */}
                <div className="flex p-4 pt-5">
                  {/* Check In */}
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
                        <LogIn className="w-4 h-4 text-blue-500" />
                      </div>
                      <span className="text-xs font-semibold text-gray-500">Check In</span>
                    </div>
                    {entry.checkIn && entry.checkIn.time ? (
                      <div>
                        <p className="text-lg font-bold text-gray-800 mb-2">{entry.checkIn.time}</p>
                        <div className="flex items-center">
                          <div 
                            className="w-2 h-2 rounded-full mr-1.5" 
                            style={{ backgroundColor: getStatusColor(entry.status) }}
                          />
                          <span 
                            className="text-[11px] font-semibold"
                            style={{ color: getStatusColor(entry.status) }}
                          >
                            {entry.status}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg font-bold text-gray-300 mb-2">--:--</p>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full mr-1.5 bg-gray-300" />
                          <span className="text-[11px] font-semibold text-gray-400">
                            --
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Vertical Divider */}
                  <div className="flex flex-col items-center justify-center mx-4">
                    <div className="w-px h-14 bg-gray-200 rounded" />
                    <div className="w-1.5 h-1.5 rounded-full bg-[#005F90] -mt-1" />
                  </div>

                  {/* Check Out */}
                  <div className="flex-1">
                    <div className="flex items-center mb-3">
                      <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center mr-2">
                        <LogOut className="w-4 h-4 text-orange-500" />
                      </div>
                      <span className="text-xs font-semibold text-gray-500">Check Out</span>
                    </div>
                    {entry.checkOut && entry.checkOut.time ? (
                      <div>
                        <p className="text-lg font-bold text-gray-800 mb-2">{entry.checkOut.time}</p>
                        <div className="flex items-center">
                          <div 
                            className="w-2 h-2 rounded-full mr-1.5" 
                            style={{ backgroundColor: getStatusColor(entry.status) }}
                          />
                          <span 
                            className="text-[11px] font-semibold"
                            style={{ color: getStatusColor(entry.status) }}
                          >
                            {entry.status}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-lg font-bold text-gray-300 mb-2">--:--</p>
                        <div className="flex items-center">
                          <div className="w-2 h-2 rounded-full mr-1.5 bg-gray-300" />
                          <span className="text-[11px] font-semibold text-gray-400">
                            --
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* See Details Button */}
                <div className="px-4 pb-4 pt-2">
                  <button
                    onClick={() => handleSeeDetails(entry.id)}
                    className="w-full flex items-center justify-between bg-gray-50 px-4 py-3 rounded-lg border border-gray-200"
                  >
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 text-[#005F90]" />
                      <span className="ml-3 text-sm font-semibold text-[#005F90]">See Details</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[#005F90]" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Overlay for FAB */}
      {canApprove && fabOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40"
          onClick={() => setFabOpen(false)}
        />
      )}

      {/* FAB Actions */}
      {canApprove && fabOpen && (
        <div className="fixed bottom-32 right-5 flex gap-3 z-50">
          <button
            onClick={handleApprove}
            className="w-20 h-20 rounded-2xl bg-green-500 flex flex-col items-center justify-center shadow-lg"
          >
            <div className="relative">
              <Plus className="w-5 h-5 text-white" />
              {hasPendingRequests && (
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white" />
              )}
            </div>
            <span className="text-white text-[11px] font-bold mt-1">Approve</span>
            <span className="text-white text-[9px] opacity-90">Requests</span>
          </button>
          <button
            onClick={handleAddTimeslip}
            className="w-20 h-20 rounded-2xl bg-blue-500 flex flex-col items-center justify-center shadow-lg"
          >
            <Plus className="w-5 h-5 text-white" />
            <span className="text-white text-[11px] font-bold mt-1">Add</span>
            <span className="text-white text-[9px] opacity-90">Timeslip</span>
          </button>
        </div>
      )}

      {/* Main FAB */}
      <div className="fixed bottom-16 right-5 z-50">
        <button
          onClick={toggleFab}
          className="w-14 h-14 rounded-full bg-[#005F90] flex items-center justify-center shadow-lg"
        >
          {canApprove ? (
            <Menu className="w-6 h-6 text-white" />
          ) : (
            <Plus className="w-6 h-6 text-white" />
          )}
          {hasPendingRequests && canApprove && !fabOpen && (
            <div className="absolute -top-3 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
          )}
        </button>
      </div>

      {/* Pull to refresh button */}
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
