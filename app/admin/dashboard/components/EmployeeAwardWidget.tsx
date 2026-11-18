"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, Clock, UserCheck, TrendingUp, ClipboardCheck } from "lucide-react";
import { getAttendanceReport2, getAttendanceSettings, getEmployees } from "@/app/api/api";
import {
  computeScore,
  countExpectedTimesheetDays,
  fetchTimesheetDaysByEmployeeId,
  getOnTimeCutoffMinutes,
  LEADERBOARD_WEIGHT_LABELS,
  LEADERBOARD_WEIGHT_LABELS_WITHOUT_TIMESHEETS,
  type LeaderboardAttendanceRow,
  type ScoredEmployee,
} from "@/lib/leaderboard";

export type { ScoredEmployee };

// ─── Rank Styling ─────────────────────────────────────────────────────────────

const RANK_CONFIG = [
  {
    gradient: "from-amber-400 via-yellow-400 to-amber-500",
    ring: "ring-amber-400/60",
    bg: "bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30",
    border: "border-amber-300/70 dark:border-amber-700/50",
    badge: "bg-amber-500 text-white",
    emoji: "🥇",
    label: "1st",
    shadowColor: "shadow-amber-200/70",
  },
  {
    gradient: "from-slate-400 via-gray-300 to-slate-400",
    ring: "ring-slate-400/50",
    bg: "bg-gradient-to-br from-slate-50 to-gray-50 dark:from-slate-950/40 dark:to-gray-950/30",
    border: "border-slate-300/70 dark:border-slate-700/50",
    badge: "bg-slate-500 text-white",
    emoji: "🥈",
    label: "2nd",
    shadowColor: "shadow-slate-200/60",
  },
  {
    gradient: "from-orange-500 via-amber-600 to-orange-500",
    ring: "ring-orange-400/50",
    bg: "bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/30",
    border: "border-orange-300/70 dark:border-orange-700/50",
    badge: "bg-orange-600 text-white",
    emoji: "🥉",
    label: "3rd",
    shadowColor: "shadow-orange-200/60",
  },
  {
    gradient: "from-blue-400 via-indigo-400 to-blue-500",
    ring: "ring-blue-400/40",
    bg: "bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/30",
    border: "border-blue-300/50 dark:border-blue-700/40",
    badge: "bg-blue-500 text-white",
    emoji: "🏅",
    label: "4th",
    shadowColor: "shadow-blue-200/50",
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name, rank }: { name: string; rank: number }) {
  const cfg = RANK_CONFIG[rank - 1] || RANK_CONFIG[3];
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div
      className={`relative w-12 h-12 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white font-bold text-sm ring-2 ${cfg.ring} shadow-lg flex-shrink-0`}
    >
      {initials}
      <span className="absolute -top-1.5 -right-1.5 text-base leading-none">
        {cfg.emoji}
      </span>
    </div>
  );
}

function ScoreBar({ value, max = 100 }: { value: number; max?: number }) {
  const pct = Math.min((value / max) * 100, 100);
  const color =
    pct >= 80
      ? "from-emerald-400 to-teal-500"
      : pct >= 60
      ? "from-amber-400 to-orange-400"
      : "from-red-400 to-rose-500";

  return (
    <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden w-full">
      <div
        className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700 ease-out`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function EmployeeCard({ emp, animDelay }: { emp: ScoredEmployee; animDelay: number }) {
  const cfg = RANK_CONFIG[emp.rank - 1] || RANK_CONFIG[3];
  const isTop = emp.rank === 1;

  return (
    <div
      className={`relative rounded-xl border ${cfg.border} ${cfg.bg} p-2 shadow-sm ${cfg.shadowColor} hover:shadow-md transition-all duration-300 animate-fade-in`}
      style={{ animationDelay: `${animDelay}ms`, animationFillMode: "both" }}
    >
      {isTop && (
        <div className="absolute -top-px left-4 right-4 h-0.5 bg-gradient-to-r from-transparent via-amber-400 to-transparent rounded-full" />
      )}

      <div className="flex items-center gap-2">
        <div
          className={`relative w-9 h-9 rounded-full bg-gradient-to-br ${cfg.gradient} flex items-center justify-center text-white font-bold text-xs ring-2 ${cfg.ring} shadow-lg flex-shrink-0`}
        >
          {emp.name.split(" ").map((n) => n[0]).slice(0, 2).join("").toUpperCase()}
          <span className="absolute -top-1 -right-1 text-sm leading-none">
            {cfg.emoji}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="font-bold text-xs text-foreground truncate">
              {emp.name}
            </span>
            <Badge
              className={`${cfg.badge} text-[9px] px-1 py-0 leading-3 rounded-full flex-shrink-0`}
            >
              {cfg.label}
            </Badge>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-muted-foreground mb-1">
            <span className="flex items-center gap-0.5">
              <UserCheck className="w-2.5 h-2.5" />
              {emp.presentDays}/{emp.totalWorkingDays}d
            </span>
            <span className="flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {emp.avgHours}h
            </span>
            <span className="flex items-center gap-0.5">
              <TrendingUp className="w-2.5 h-2.5" />
              {emp.onTimePct}%
            </span>
            <span
              className="flex items-center gap-0.5"
              title={`Timesheets: ${emp.timesheetDays}/${emp.expectedTimesheetDays} worked days`}
            >
              <ClipboardCheck className="w-2.5 h-2.5" />
              {emp.timesheetPct}%
            </span>
          </div>

          <ScoreBar value={emp.score} />
        </div>

        <div className="text-right flex-shrink-0">
          <div
            className={`text-lg font-black bg-gradient-to-br ${cfg.gradient} bg-clip-text text-transparent leading-none`}
          >
            {emp.score}
          </div>
          <div className="text-[8px] text-muted-foreground font-medium mt-0.5 uppercase tracking-wider">
            score
          </div>
        </div>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border/40 bg-muted/20 p-4 animate-pulse flex items-center gap-3">
      <div className="w-12 h-12 rounded-full bg-muted flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-muted rounded w-3/4" />
        <div className="h-2 bg-muted rounded w-1/2" />
        <div className="h-1.5 bg-muted rounded w-full" />
      </div>
      <div className="w-10 h-8 bg-muted rounded flex-shrink-0" />
    </div>
  );
}

// ─── Main Widget ──────────────────────────────────────────────────────────────

interface EmployeeAwardWidgetProps {
  organizationId: string | null;
}

export default function EmployeeAwardWidget({ organizationId }: EmployeeAwardWidgetProps) {
  const [leaderboard, setLeaderboard] = useState<ScoredEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [includesTimesheets, setIncludesTimesheets] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [month] = useState(() => new Date().getMonth() + 1);
  const [year] = useState(() => new Date().getFullYear());

  const fetchLeaderboard = useCallback(async () => {
    if (!organizationId) return;
    try {
      // Fetch employees list to filter out admin-only users
      const [reportRes, empRes, settingsRes, timesheetRes] = await Promise.allSettled([
        getAttendanceReport2({ organizationId, year, month, userIds: "ALL" }),
        getEmployees(organizationId),
        getAttendanceSettings(organizationId),
        fetchTimesheetDaysByEmployeeId(organizationId, year, month),
      ]);

      const rawData: LeaderboardAttendanceRow[] =
        reportRes.status === "fulfilled"
          ? (reportRes.value.data?.reportData ?? reportRes.value.data ?? [])
          : [];
      const onTimeCutoffMinutes =
        settingsRes.status === "fulfilled"
          ? getOnTimeCutoffMinutes(settingsRes.value.data)
          : null;
      // null => timesheet API unavailable, empty => module unused; both keep attendance-only scoring
      const timesheetDaysByEmployeeId =
        timesheetRes.status === "fulfilled" ? timesheetRes.value : null;
      const hasTimesheetData = Boolean(timesheetDaysByEmployeeId && timesheetDaysByEmployeeId.size > 0);
      setIncludesTimesheets(hasTimesheetData);

      if (!Array.isArray(rawData) || rawData.length === 0) {
        setLeaderboard([]);
        return;
      }

      // Build userId sets / employeeId → userId map (excludes pure-admin accounts)
      const employeeUserIds = new Set<string>();
      const employeeIdByUserId = new Map<string, string>();
      if (empRes.status === "fulfilled") {
        const empList: any[] = empRes.value.data?.employees ?? empRes.value.data ?? [];
        for (const e of empList) {
          const userId = e.userId ?? e.user?.id;
          if (!userId) continue;
          employeeUserIds.add(userId);
          const employeeId = e.id ?? e.employeeId;
          if (employeeId) employeeIdByUserId.set(userId, employeeId);
        }
      }

      const scored = rawData
        .filter((row) => {
          if ((row.totalWorkingDays ?? 0) === 0) return false;
          // Only include if they're in the employees list (skip if list unavailable)
          if (employeeUserIds.size > 0 && !employeeUserIds.has(row.userId)) return false;
          return true;
        })
        .map((row) => {
          const employeeId = employeeIdByUserId.get(row.userId);
          const submittedDays =
            timesheetDaysByEmployeeId && employeeId
              ? timesheetDaysByEmployeeId.get(employeeId) ?? 0
              : 0;
          return computeScore(
            row,
            onTimeCutoffMinutes,
            hasTimesheetData
              ? {
                  submittedDays,
                  expectedDays: countExpectedTimesheetDays(row.dailyRecords, year, month),
                }
              : null,
          );
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map((emp, i) => ({ ...emp, rank: i + 1 }));

      setLeaderboard(scored);
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch employee leaderboard:", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId, year, month]);

  useEffect(() => {
    fetchLeaderboard();
    const interval = setInterval(fetchLeaderboard, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, [fetchLeaderboard]);

  const monthLabel = new Date(year, month - 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-amber-500" />
          Employee Leaderboard
        </CardTitle>
      </CardHeader>

      <CardContent className="px-4 sm:px-5 pb-4">
        <div className="space-y-2 max-h-[184px] overflow-y-auto pr-1 scrollbar-hide">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : leaderboard.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950/30 flex items-center justify-center mb-3">
              <Trophy className="w-7 h-7 text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-foreground">No data yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Attendance records for {monthLabel} will appear here
            </p>
          </div>
        ) : (
          leaderboard.map((emp, i) => (
            <EmployeeCard key={emp.userId} emp={emp} animDelay={i * 80} />
          ))
        )}
        </div>
        {!loading && leaderboard.length > 0 && (
          <p className="text-center text-[10px] text-muted-foreground pt-2">
            Score ={" "}
            {includesTimesheets
              ? LEADERBOARD_WEIGHT_LABELS
              : LEADERBOARD_WEIGHT_LABELS_WITHOUT_TIMESHEETS}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
