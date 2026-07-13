"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, LogIn, LogOut, Eye, ChevronRight, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { getProfile, getTimeslips } from "@/app/api/api";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import MobileTabHeader from "../components/MobileTabHeader";
import { MobileCard, MobileBadge } from "../components/MobileCard";
import { MobileFloatingActionButton } from "../components/MobileFloatingActionButton";
import { StaggerReveal, StaggerItem, SpringNumber } from "../components/animation-wrappers";
import { MobileEmptyState } from "../components/MobileEmptyState";
import { MobileSkeleton } from "../components/MobileSkeleton";

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
  checkIn: { time: string | null; location: string } | null;
  checkOut: { time: string | null; location: string } | null;
}

type Tab = "All" | "Pending" | "Approved" | "Rejected";

const tabs: Tab[] = ["All", "Pending", "Approved", "Rejected"];

const badgeVariant = (s: string) => {
  if (s === "APPROVED") return "success" as const;
  if (s === "PENDING") return "warning" as const;
  if (s === "REJECTED") return "danger" as const;
  return "default" as const;
};

export default function MobileTimeslipPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [timeslips, setTimeslips] = useState<TimestampEntry[]>([]);
  const [selectedTab, setSelectedTab] = useState<Tab>("All");
  const [isApprover, setIsApprover] = useState(false);

  const fetchTimeslips = useCallback(async () => {
    try {
      const timeslipsRes = await getTimeslips();
      const data = timeslipsRes.data;
      let timeslipsData: Timeslip[] = [];
      if (Array.isArray(data)) timeslipsData = data;
      else if (data?.results) timeslipsData = data.results;
      else if (data?.data) timeslipsData = Array.isArray(data.data) ? data.data : [data.data];

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

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const profileRes = await getProfile();
        setIsApprover(Boolean(profileRes.data?.isApprover));
      } catch {
        setIsApprover(false);
      }
    };
    fetchProfile();
    fetchTimeslips();
  }, [fetchTimeslips]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchTimeslips();
    setRefreshing(false);
  }, [fetchTimeslips]);

  const timestampData = {
    all: timeslips.length,
    pending: timeslips.filter((e) => e.status === "PENDING").length,
    approved: timeslips.filter((e) => e.status === "APPROVED").length,
    rejected: timeslips.filter((e) => e.status === "REJECTED").length,
  };

  const filteredTimestamps = timeslips.filter((entry) => {
    if (selectedTab === "All") return true;
    return entry.status === selectedTab.toUpperCase();
  });

  const hasPendingRequests = timeslips.some((e) => e.status === "PENDING");

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileTabHeader title="Time Slips" />
        <MobileSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileTabHeader title="Time Slips" />

      <div className="px-4 -mt-12 z-10 pb-24 space-y-4">
        {isApprover && (
          <MobileCard className="flex gap-2 p-1.5">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/user/dashboard/mobile/timeslip")}
              className="flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground"
            >
              My Time Slips
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/user/dashboard/mobile/timeslip/approve")}
              className="flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold text-muted-foreground"
            >
              Approve
            </motion.button>
          </MobileCard>
        )}

        <MobileCard className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 to-primary/10" />
          <div className="grid grid-cols-4 gap-2">
            <div className="flex flex-col items-center">
              <span className="w-2 h-2 rounded-full bg-muted-foreground mb-1.5" />
              <span className="text-xl font-bold text-foreground tabular-nums">
                <SpringNumber value={timestampData.all} />
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">Total</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="w-2 h-2 rounded-full bg-amber-500 mb-1.5" />
              <span className="text-xl font-bold text-amber-600 tabular-nums">
                <SpringNumber value={timestampData.pending} />
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">Pending</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mb-1.5" />
              <span className="text-xl font-bold text-emerald-600 tabular-nums">
                <SpringNumber value={timestampData.approved} />
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">Approved</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="w-2 h-2 rounded-full bg-rose-500 mb-1.5" />
              <span className="text-xl font-bold text-rose-500 tabular-nums">
                <SpringNumber value={timestampData.rejected} />
              </span>
              <span className="text-[10px] font-medium text-muted-foreground">Rejected</span>
            </div>
          </div>
        </MobileCard>

        <MobileCard className="flex gap-1 p-1" padded={false}>
          {tabs.map((tab) => (
            <motion.button
              key={tab}
              onClick={() => setSelectedTab(tab)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors relative ${
                selectedTab === tab ? "text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {selectedTab === tab && (
                <motion.span
                  layoutId="timeslipTabBg"
                  className="absolute inset-0 bg-primary rounded-xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </motion.button>
          ))}
        </MobileCard>

        {filteredTimestamps.length === 0 ? (
          <MobileEmptyState
            icon={<Clock size={24} />}
            title="No timeslips found"
            description={`No ${selectedTab.toLowerCase()} timeslips to display.`}
          />
        ) : (
          <StaggerReveal className="space-y-3" staggerDelay={0.05}>
            {filteredTimestamps.map((entry) => (
              <StaggerItem key={entry.id}>
                <MobileCard className="relative overflow-hidden">
                  <div className="absolute top-0 right-0 bg-primary px-3 py-1.5 rounded-bl-xl z-10">
                    <span className="text-primary-foreground text-[10px] font-bold">{entry.date}</span>
                  </div>

                  <div className="flex pt-2">
                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 rounded-full bg-primary/8 flex items-center justify-center mr-2">
                          <LogIn className="w-4 h-4 text-primary" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">Check In</span>
                      </div>
                      {entry.checkIn?.time ? (
                        <div>
                          <p className="text-lg font-bold text-foreground mb-2">{entry.checkIn.time}</p>
                          <MobileBadge variant={badgeVariant(entry.status)}>
                            {entry.status}
                          </MobileBadge>
                        </div>
                      ) : (
                        <div>
                          <p className="text-lg font-bold text-muted-foreground/30 mb-2">--:--</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                            --
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-center justify-center mx-4">
                      <div className="w-px h-14 bg-border rounded" />
                      <div className="w-1.5 h-1.5 rounded-full bg-primary -mt-1" />
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center mb-3">
                        <div className="w-8 h-8 rounded-full bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mr-2">
                          <LogOut className="w-4 h-4 text-amber-600" />
                        </div>
                        <span className="text-xs font-semibold text-muted-foreground">Check Out</span>
                      </div>
                      {entry.checkOut?.time ? (
                        <div>
                          <p className="text-lg font-bold text-foreground mb-2">{entry.checkOut.time}</p>
                          <MobileBadge variant={badgeVariant(entry.status)}>
                            {entry.status}
                          </MobileBadge>
                        </div>
                      ) : (
                        <div>
                          <p className="text-lg font-bold text-muted-foreground/30 mb-2">--:--</p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border">
                            --
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push(`/user/timeslips?id=${entry.id}`)}
                    className="w-full flex items-center justify-between bg-muted/50 px-4 py-3 rounded-xl border border-border/50 mt-4"
                  >
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <span className="text-sm font-semibold text-primary">See Details</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-primary" />
                  </motion.button>
                </MobileCard>
              </StaggerItem>
            ))}
          </StaggerReveal>
        )}
      </div>

      <MobileFloatingActionButton
        actions={
          isApprover
            ? [
                { icon: <Plus className="w-4 h-4" />, label: "Approve", onClick: () => router.push("/user/dashboard/mobile/timeslip/approve") },
                { icon: <Plus className="w-4 h-4" />, label: "Add Timeslip", onClick: () => router.push("/user/dashboard/mobile/timeslip/add") },
              ]
            : [{ icon: <Plus className="w-4 h-4" />, label: "Add Timeslip", onClick: () => router.push("/user/dashboard/mobile/timeslip/add") }]
        }
      />
    </div>
  );
}
