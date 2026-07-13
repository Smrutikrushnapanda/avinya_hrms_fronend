"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  Clock,
  Home,
  Plus,
  XCircle,
} from "lucide-react";
import { getProfile, getWfhBalance, getWfhRequests } from "@/app/api/api";
import MobileTabHeader from "../components/MobileTabHeader";
import { MobileCard, MobileBadge } from "../components/MobileCard";
import { MobileFloatingActionButton } from "../components/MobileFloatingActionButton";
import { StaggerReveal, StaggerItem, SpringNumber } from "../components/animation-wrappers";
import { MobileEmptyState } from "../components/MobileEmptyState";
import { MobileSkeleton } from "../components/MobileSkeleton";
import { motion } from "framer-motion";

type Approval = { level: number; status: string };

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
  const n = (status || "").toLowerCase();
  if (!n) return "Unknown";
  return n.charAt(0).toUpperCase() + n.slice(1);
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function parseRow(r: WfhResponseRow): WfhRequest {
  const req = r.wfhRequest || r.request || r;
  return {
    id: req.id || r.id || "",
    date: req.date || r.date || req.startDate || r.startDate || "",
    endDate: req.endDate || r.endDate || "",
    numberOfDays: req.numberOfDays ?? r.numberOfDays ?? req.days ?? r.days ?? req.duration ?? r.duration ?? 1,
    status: req.status || r.status || "pending",
    createdAt: req.createdAt || r.createdAt || "",
    approvals: req.approvals || r.approvals || [],
  };
}

const tabs = ["All", "Pending", "Approved", "Rejected"];

const statusBadgeVariant = (s: string) => {
  const n = normalizeStatus(s);
  if (n === "Approved") return "success" as const;
  if (n === "Pending") return "warning" as const;
  if (n === "Rejected") return "danger" as const;
  return "default" as const;
};

export default function MobileWfhPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [wfhRequests, setWfhRequests] = useState<WfhRequest[]>([]);
  const [wfhBalance, setWfhBalance] = useState<WfhBalance | null>(null);
  const [selectedTab, setSelectedTab] = useState("All");
  const [isApprover, setIsApprover] = useState(false);
  const [approvePendingCount, setApprovePendingCount] = useState(0);

  const fetchData = useCallback(async () => {
    if (!wfhRequests.length && !loading) return;
    try {
      const [balanceRes, requestsRes] = await Promise.all([
        getWfhBalance(),
        getWfhRequests().catch(() => ({ data: [] })),
      ]);
      const balanceData = balanceRes.data;
      setWfhBalance(balanceData || null);

      const raw = requestsRes.data;
      let rows: WfhResponseRow[] = [];
      if (Array.isArray(raw)) rows = raw;
      else if (raw?.results) rows = raw.results;
      else if (raw?.data) rows = Array.isArray(raw.data) ? raw.data : [raw.data];
      const parsed = rows.map(parseRow);
      setWfhRequests(parsed);

      const pendingApprove = parsed.filter(
        (r) => normalizeStatus(r.status) === "Pending",
      );
      setApprovePendingCount(pendingApprove.length);
    } catch (e) {
      console.error("Failed to load WFH data:", e);
    } finally {
      setLoading(false);
    }
  }, [loading, wfhRequests.length]);

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await getProfile();
        const profile = profileRes.data || {};
        setIsApprover(Boolean(profile.isApprover));
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const filtered =
    selectedTab === "All"
      ? wfhRequests
      : wfhRequests.filter((r) => normalizeStatus(r.status) === selectedTab);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileTabHeader title="Work From Home" />
        <MobileSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileTabHeader title="Work From Home" />

      <div className="px-4 -mt-12 z-10 pb-24 space-y-4">
        {isApprover && (
          <MobileCard className="flex gap-2 p-1.5">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/user/dashboard/mobile/wfh")}
              className="flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold bg-primary text-primary-foreground"
            >
              My WFH
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push("/user/dashboard/mobile/wfh/approve")}
              className="flex-1 py-2.5 px-3 rounded-xl text-sm font-semibold text-muted-foreground"
            >
              Approve
            </motion.button>
          </MobileCard>
        )}

        <MobileCard className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 to-primary/10" />
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/8 flex items-center justify-center">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">WFH Balance Remaining</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                <SpringNumber value={wfhBalance?.closingBalance ?? wfhBalance?.remaining ?? 0} />
                <span className="text-sm font-medium text-muted-foreground ml-1">days</span>
              </p>
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
                  layoutId="wfhTabBg"
                  className="absolute inset-0 bg-primary rounded-xl"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <span className="relative z-10">{tab}</span>
            </motion.button>
          ))}
        </MobileCard>

        {filtered.length === 0 ? (
          <MobileEmptyState
            icon={<Home size={24} />}
            title="No WFH requests"
            description="No work from home requests found for this filter."
          />
        ) : (
          <StaggerReveal className="space-y-3" staggerDelay={0.05}>
            {filtered.map((req) => (
              <StaggerItem key={req.id}>
                <MobileCard className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {formatDate(req.date)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {req.endDate && req.endDate !== req.date
                          ? `${formatDate(req.date)} — ${formatDate(req.endDate)}`
                          : formatDate(req.date)}
                      </p>
                    </div>
                    <MobileBadge variant={statusBadgeVariant(req.status)}>
                      {normalizeStatus(req.status)}
                    </MobileBadge>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-border/50">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Applied {formatDate(req.createdAt)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-muted-foreground">Duration: </span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {req.numberOfDays ?? 1} day{req.numberOfDays !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
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
                { icon: <CheckCircle className="w-4 h-4" />, label: "Approve", onClick: () => router.push("/user/dashboard/mobile/wfh/approve") },
                { icon: <Plus className="w-4 h-4" />, label: "Apply WFH", onClick: () => router.push("/user/dashboard/mobile/wfh/apply") },
              ]
            : [{ icon: <Plus className="w-4 h-4" />, label: "Apply WFH", onClick: () => router.push("/user/dashboard/mobile/wfh/apply") }]
        }
      />
    </div>
  );
}
