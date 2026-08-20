"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CalendarHeart,
  Gift,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { getHolidays, getProfile } from "@/app/api/api";
import { Button } from "@/components/ui/button";
import MobileTabHeader from "../components/MobileTabHeader";
import { MobileCard } from "../components/MobileCard";
import { MobileEmptyState } from "../components/MobileEmptyState";
import { StaggerReveal, StaggerItem } from "../components/animation-wrappers";
import { MobileCardSkeleton } from "../components/MobileSkeleton";

interface Holiday {
  id?: number;
  date?: string;
  name?: string;
  holidayType?: string;
  isOptional?: boolean;
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

const getDaysRemaining = (dateStr?: string): number => {
  if (!dateStr) return -1;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export default function MobileHolidaysPage() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"upcoming" | "all">("upcoming");

  const fetchHolidaysData = useCallback(async () => {
    try {
      const profileRes = await getProfile();
      const orgId = profileRes.data?.organizationId;
      if (!orgId) throw new Error("Organization not found");

      const res = await getHolidays({ organizationId: orgId });
      const list = res.data?.holidays ?? (Array.isArray(res.data) ? res.data : []);
      // Sort holidays chronologically
      const sorted = [...list].sort((a, b) => {
        const left = new Date(a.date || 0).getTime();
        const right = new Date(b.date || 0).getTime();
        return left - right;
      });
      setHolidays(sorted);
    } catch (error: any) {
      console.error("Error fetching holidays:", error);
      toast.error(error?.message || "Failed to load holidays");
      setHolidays([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHolidaysData();
  }, [fetchHolidaysData]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchHolidaysData();
  };

  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const upcomingHolidays = useMemo(() => {
    return holidays.filter((h) => h.date && h.date >= todayStr);
  }, [holidays, todayStr]);

  const displayedHolidays = useMemo(() => {
    return activeTab === "upcoming" ? upcomingHolidays : holidays;
  }, [activeTab, upcomingHolidays, holidays]);

  const nextHoliday = useMemo(() => {
    return upcomingHolidays[0] || null;
  }, [upcomingHolidays]);

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <MobileTabHeader title="Holidays" backHref="/user/dashboard/mobile" />

      <div className="px-4 mt-4 relative z-10 space-y-4 pb-6">
        {nextHoliday && (
          <MobileCard className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary-foreground" />
            <div className="py-2 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                <Gift className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  <Sparkles className="w-3 h-3" /> Next Holiday
                </span>
                <h3 className="text-base font-extrabold text-foreground truncate">
                  {nextHoliday.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                  {formatDate(nextHoliday.date)} &bull; {nextHoliday.holidayType || "PUBLIC HOLIDAY"}
                </p>
                <p className="text-xs text-primary font-semibold mt-2">
                  {getDaysRemaining(nextHoliday.date) === 0
                    ? "Today! 🎉"
                    : getDaysRemaining(nextHoliday.date) === 1
                    ? "Tomorrow! ⏱️"
                    : `In ${getDaysRemaining(nextHoliday.date)} days`}
                </p>
              </div>
            </div>
          </MobileCard>
        )}

        {/* Tab Controls */}
        <div className="bg-muted p-1 rounded-2xl flex gap-1 border border-border/40">
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${
              activeTab === "upcoming"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Upcoming ({upcomingHolidays.length})
          </button>
          <button
            onClick={() => setActiveTab("all")}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all active:scale-[0.98] ${
              activeTab === "all"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            All Holidays ({holidays.length})
          </button>
        </div>

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
        ) : displayedHolidays.length === 0 ? (
          <MobileEmptyState
            icon={<CalendarDays size={28} />}
            title="No holidays found"
            description={
              activeTab === "upcoming"
                ? "There are no more upcoming holidays for this year."
                : "No holidays have been configured for this year."
            }
          />
        ) : (
          <MobileCard>
            <h3 className="text-base font-extrabold text-foreground mb-4 flex items-center gap-2">
              <CalendarHeart className="w-5 h-5 text-primary" />
              {activeTab === "upcoming" ? "Upcoming Schedule" : "Holiday Schedule"}
            </h3>
            <StaggerReveal className="space-y-3" staggerDelay={0.04}>
              {displayedHolidays.map((h, i) => {
                const daysLeft = getDaysRemaining(h.date);
                const isPast = daysLeft < 0;
                return (
                  <StaggerItem key={h.id || i}>
                    <div
                      className={`flex items-center gap-3.5 p-3.5 rounded-2xl border transition-all ${
                        isPast
                          ? "bg-muted/30 border-border/50 opacity-60"
                          : "bg-muted/50 border-border/80 hover:border-primary/20"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                          isPast
                            ? "bg-muted border-border text-muted-foreground"
                            : h.isOptional
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400"
                            : "bg-primary/10 border-primary/20 text-primary"
                        }`}
                      >
                        <CalendarDays className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">
                          {h.name}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                          {formatDate(h.date)} &bull; {h.holidayType || "PUBLIC HOLIDAY"}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        {isPast ? (
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                            Past
                          </span>
                        ) : h.isOptional ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                            Restricted
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-[10px] font-bold">
                            Public
                          </span>
                        )}
                      </div>
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
