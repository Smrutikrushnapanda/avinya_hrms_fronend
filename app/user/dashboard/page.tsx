"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UserCheck,
  Coffee,
  Palmtree,
  DollarSign,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Clock,
  Trophy,
  CalendarDays,
  X,
  Star,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";
import {
  Card,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import AttendanceDonutChart from "@/components/charts/AttendanceDonutChart";
import AttendanceStatus from "@/components/AttendanceStatus";
import { usePlanAccess } from "@/components/plan-access-provider";
import { toast } from "sonner";
import {
  getProfile,
  getDashboardStats,
  getLeaveBalance,
  getEmployeeByUserId,
  getOrganization,
  getTodayLogs,
  getHolidays,
  getAttendanceSettings,
  getUpcomingMeetingsForUser,
  getAttendanceReport2,
  getEmployees,
  getPayrollRecords,
  toggleBreakStatus,
} from "@/app/api/api";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

// ─── LEADERBOARD SCORING ──────────────────────────────────────────────────────

interface ScoredEmployee {
  rank: number;
  userId: string;
  name: string;
  score: number;
  attendancePct: number;
  avgHours: number;
  onTimePct: number;
  presentDays: number;
  totalWorkingDays: number;
}

function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  try {
    if (timeStr.includes("T")) {
      const d = new Date(timeStr);
      const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
      return ist.getUTCHours() * 60 + ist.getUTCMinutes();
    }
    const clean = timeStr.trim();
    const isPM = clean.toUpperCase().includes("PM");
    const isAM = clean.toUpperCase().includes("AM");
    const parts = clean.replace(/AM|PM/gi, "").trim().split(":");
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || "0", 10);
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    return h * 60 + m;
  } catch { return null; }
}

function normalizeAttendanceStatus(status: unknown): string {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function parseShiftTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || typeof timeStr !== "string") return null;
  const [hRaw, mRaw] = timeStr.trim().split(":");
  const h = Number(hRaw);
  const m = Number(mRaw ?? 0);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

function getOnTimeCutoffMinutes(settings?: {
  workStartTime?: string;
  graceMinutes?: number;
  lateThresholdMinutes?: number;
} | null): number | null {
  const startMinutes = parseShiftTimeToMinutes(settings?.workStartTime);
  if (startMinutes === null) return null;
  const allowanceRaw = Number(settings?.graceMinutes ?? settings?.lateThresholdMinutes ?? 0);
  const allowance = Number.isFinite(allowanceRaw) ? Math.max(0, Math.floor(allowanceRaw)) : 0;
  return startMinutes + allowance;
}

function computeScore(row: any, onTimeCutoffMinutes: number | null): ScoredEmployee {
  const attendancePct = Math.min(row.attendancePercentage ?? 0, 100);
  const avgHours = row.averageWorkingHours ?? 0;
  const hoursScore = Math.min((avgHours / 9) * 100, 100);
  let onTimeDays = 0, checkedDays = 0;
  if (Array.isArray(row.dailyRecords)) {
    for (const rec of row.dailyRecords) {
      if (rec.isHoliday || rec.isSunday) continue;
      const normalizedStatus = normalizeAttendanceStatus(rec.status);
      const isCountable =
        normalizedStatus === "present" ||
        normalizedStatus === "half-day" ||
        normalizedStatus === "late";
      if (!isCountable) continue;
      checkedDays++;
      if (normalizedStatus === "late") continue;
      if (onTimeCutoffMinutes === null) {
        onTimeDays++;
        continue;
      }
      const mins = parseTimeToMinutes(rec.inTime);
      if (mins === null || mins <= onTimeCutoffMinutes) onTimeDays++;
    }
  }
  const onTimePct = checkedDays > 0 ? (onTimeDays / checkedDays) * 100 : 0;
  const score = attendancePct * 0.4 + hoursScore * 0.35 + onTimePct * 0.25;
  return {
    rank: 0,
    userId: row.userId,
    name: row.userName ?? "Unknown",
    score: Math.round(score * 10) / 10,
    attendancePct: Math.round(attendancePct),
    avgHours: Math.round(avgHours * 10) / 10,
    onTimePct: Math.round(onTimePct),
    presentDays: row.presentDays ?? 0,
    totalWorkingDays: row.totalWorkingDays ?? 0,
  };
}

function getBreakStateFromLogs(logs: any[]): { isOnBreak: boolean; activeBreakSince: string | null } {
  const sorted = [...(logs || [])].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  let isOnBreak = false;
  let activeBreakSince: string | null = null;
  for (const log of sorted) {
    if (log.type === "check-out" || log.type === "break-end") {
      isOnBreak = false;
      activeBreakSince = null;
    } else if (log.type === "break-start") {
      isOnBreak = true;
      activeBreakSince = log.timestamp ?? null;
    }
  }
  return { isOnBreak, activeBreakSince };
}

// ─── CONFETTI PARTICLE ─────────────────────────────────────────────────────────

const CONFETTI_COLORS = ["#f59e0b", "#3b82f6", "#10b981", "#f43f5e", "#8b5cf6", "#ec4899", "#fbbf24"];

function ConfettiParticle({ i }: { i: number }) {
  const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
  const left = (i * 7.7 + 3) % 100;
  const duration = 1.8 + (i % 5) * 0.4;
  const delay = (i % 8) * 0.25;
  const size = 6 + (i % 3) * 4;
  const isCircle = i % 3 === 0;
  return (
    <div
      className="animate-confetti absolute top-0 pointer-events-none"
      style={{
        left: `${left}%`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
        width: size,
        height: isCircle ? size : size * 0.5,
        borderRadius: isCircle ? "50%" : "2px",
        backgroundColor: color,
        opacity: 0.9,
      }}
    />
  );
}

// ─── CELEBRATION OVERLAY ───────────────────────────────────────────────────────

function CelebrationOverlay({ name, score, onDismiss }: { name: string; score: number; onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[99] flex items-center justify-center" onClick={onDismiss}>
      {/* Blur backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Confetti layer */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 48 }).map((_, i) => <ConfettiParticle key={i} i={i} />)}
      </div>

      {/* Card */}
      <div
        className="relative z-10 animate-celebration-pop max-w-sm w-full mx-4 rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gold gradient header */}
        <div className="bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-500 p-6 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.3),transparent_70%)]" />
          <div className="relative z-10">
            <div className="text-6xl mb-2">🏆</div>
            <h2 className="text-2xl font-black text-white drop-shadow-md tracking-tight">
              Congratulations!
            </h2>
            <p className="text-amber-950/80 text-sm font-semibold mt-1">
              Employee of the Month 🎉
            </p>
          </div>
          {/* sparkle icons */}
          <Sparkles className="absolute top-4 left-4 w-5 h-5 text-white/70" />
          <Sparkles className="absolute top-4 right-4 w-5 h-5 text-white/70" />
          <Star className="absolute bottom-3 left-8 w-4 h-4 text-white/60" />
          <Star className="absolute bottom-3 right-8 w-4 h-4 text-white/60" />
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-900 p-6 text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl font-black mx-auto mb-3 shadow-lg shadow-amber-200/60">
            {name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase()}
          </div>
          <h3 className="text-xl font-extrabold text-foreground">{name}</h3>
          <p className="text-muted-foreground text-sm mt-1">
            You&apos;re the <span className="font-bold text-amber-500">#1 top performer</span> this month!
          </p>

          <div className="mt-4 flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-2xl font-black bg-gradient-to-br from-amber-400 to-orange-500 bg-clip-text text-transparent">{score}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Score</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-2xl">🥇</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Rank 1</div>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="mt-5 w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-sm hover:shadow-lg hover:shadow-amber-200/50 transition-all active:scale-95"
          >
            Thank you! 🎊
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── HOLIDAY CALENDAR WIDGET ──────────────────────────────────────────────────

function HolidayCalendarWidget({
  holidays,
  workingDays,
  weekdayOffRules,
}: {
  holidays: Holiday[];
  workingDays?: number[];
  weekdayOffRules?: Record<string, number[]>;
}) {
  const [month, setMonth] = useState(new Date());
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | null>(null);

  // Normalize to local midnight using UTC date parts so calendar day-matching works
  // regardless of timezone (avoids off-by-one from UTC midnight parsing)
  const normalizeDate = (raw: string) => {
    const d = new Date(raw);
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  };

  const holidayDates = holidays
    .filter((h) => h.date)
    .map((h) => normalizeDate(h.date!));

  const holidayMap = holidays.reduce((acc, h) => {
    if (h.date) {
      acc[normalizeDate(h.date).toDateString()] = h;
    }
    return acc;
  }, {} as Record<string, Holiday>);

  const handleDayClick = (day: Date) => {
    const key = day.toDateString();
    const holiday = holidayMap[key];
    setSelectedHoliday(holiday && holiday.id !== selectedHoliday?.id ? holiday : null);
  };

  const isOrgOffDay = (day: Date) => {
    const dow = day.getDay(); // 0=Sun
    const weekNum = Math.ceil(day.getDate() / 7);

    if (Array.isArray(workingDays) && !workingDays.includes(dow)) return true;
    if (weekdayOffRules && Array.isArray(weekdayOffRules[dow])) {
      if (weekdayOffRules[dow].includes(weekNum)) return true;
    }
    // Default: Sundays + 2nd/4th Saturdays if no settings provided
    if (!workingDays && !weekdayOffRules) {
      if (dow === 0) return true;
      if (dow === 6 && (weekNum === 2 || weekNum === 4)) return true;
    }
    return false;
  };

  // Build weekend/off-day modifiers for the visible month
  const weekendDates = (() => {
    const start = new Date(month.getFullYear(), month.getMonth(), 1);
    const end = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (isOrgOffDay(d)) days.push(new Date(d));
    }
    return days;
  })();

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex-1 w-full min-w-0 flex items-center justify-center p-1 sm:p-2 bg-muted/20 dark:bg-muted/10 rounded-xl border border-border/50">
        <div className="w-full max-w-[260px] sm:max-w-[280px] mx-auto overflow-hidden relative">
          <Calendar
            mode="single"
            month={month}
            onMonthChange={setMonth}
            modifiers={{ holiday: holidayDates, weekend: weekendDates }}
            modifiersClassNames={{
              holiday:
                "!bg-rose-100/80 !text-rose-600 dark:!bg-rose-900/40 dark:!text-rose-400 font-bold rounded-full ring-2 ring-rose-300/50 dark:ring-rose-700/50",
              weekend:
                "!bg-blue-100/60 !text-blue-600 dark:!bg-blue-900/30 dark:!text-blue-300 font-bold rounded-full ring-2 ring-blue-200/50 dark:ring-blue-800/50",
            }}
            onDayClick={handleDayClick}
            className="w-full p-0"
            classNames={{
              root: "w-full flex justify-center relative",
              months: "relative w-full flex-col sm:flex-row space-y-2 sm:space-x-4 sm:space-y-0",
              month: "relative space-y-2 w-full flex flex-col items-center",
              nav: "flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between z-10",
              month_caption: "flex items-center justify-center h-8 w-full px-8",
              table: "w-full border-collapse table-fixed",
              weekdays: "flex w-full justify-between pb-1 border-b border-border/50 gap-1.5",
              weekday: "text-muted-foreground w-7 sm:w-8 font-bold text-[0.65rem] sm:text-[0.7rem] tracking-wider uppercase flex items-center justify-center",
              week: "flex w-full justify-between mt-3 max-w-full gap-1.5",
              day: "relative p-0 text-center text-xs sm:text-sm focus-within:relative focus-within:z-20 w-7 sm:w-8 h-7 sm:h-8 flex items-center justify-center rounded-full overflow-hidden [&:has([aria-selected])]:bg-transparent aspect-square group",
              today: "!bg-gradient-to-br !from-[#184a8c] !to-[#00b4db] !text-white rounded-full font-bold shadow-md shadow-[#00b4db]/20 scale-[1.1] ring-2 ring-white dark:ring-background z-10 transition-transform",
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 px-2 py-2 bg-muted/30 dark:bg-muted/10 rounded-lg border border-border/40">
        <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors">
          <span className="w-2 h-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.6)]" />
          Holiday
        </span>
        <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors">
          <span className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]" />
          Off Day
        </span>
        <span className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold text-muted-foreground hover:text-foreground transition-colors">
          <span className="w-2 h-2 rounded-full bg-gradient-to-r from-[#184a8c] to-[#00b4db] shadow-[0_0_8px_rgba(0,180,219,0.6)]" />
          Today
        </span>
      </div>

      {/* Holiday detail popup on date click */}
      <div className={`mt-3 overflow-hidden transition-all duration-300 ease-in-out ${selectedHoliday ? 'max-h-[140px] opacity-100' : 'max-h-0 opacity-0'}`}>
        {selectedHoliday && (
          <div className="p-3 sm:p-4 rounded-xl bg-gradient-to-br from-rose-50 to-orange-50 dark:from-rose-950/30 dark:to-orange-950/30 border border-rose-200/60 dark:border-rose-800/60 flex items-center gap-3 sm:gap-4 shadow-sm relative group overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-400/10 to-orange-400/10 rounded-full blur-xl -mr-10 -mt-10 pointer-events-none" />
            <div className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-rose-500 to-orange-400 text-white flex flex-col items-center justify-center flex-shrink-0 shadow-md shadow-rose-500/30 relative z-10 border border-white/20">
              <span className="text-[9px] sm:text-[11px] font-bold tracking-widest uppercase leading-none opacity-90 mb-0.5">
                {normalizeDate(selectedHoliday.date!).toLocaleDateString("en-US", { month: "short" })}
              </span>
              <span className="text-lg sm:text-xl font-black leading-none drop-shadow-sm">
                {normalizeDate(selectedHoliday.date!).getDate()}
              </span>
            </div>
            <div className="flex-1 min-w-0 relative z-10">
              <p className="text-sm sm:text-[15px] font-extrabold text-foreground truncate drop-shadow-sm leading-tight">
                {selectedHoliday.name || "Holiday"}
              </p>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[9px] sm:text-[10px] font-bold tracking-wider text-rose-700 dark:text-rose-300 bg-white/60 dark:bg-rose-900/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800 backdrop-blur-sm shadow-sm">
                  {selectedHoliday.isOptional ? "RESTRICTED" : "GENERAL"}
                </span>
              </div>
            </div>
            <button
              onClick={() => setSelectedHoliday(null)}
              className="w-8 h-8 flex items-center justify-center rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-muted-foreground hover:text-foreground transition-all flex-shrink-0 relative z-10"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PAGE ─────────────────────────────────────────────────────────────────────

interface UserData {
  firstName?: string;
  lastName?: string;
  userName?: string;
  email?: string;
  id?: string;
  organizationId?: string;
}

interface DashboardStats {
  totalEmployees?: any;
  presentToday?: any;
  onLeaveToday?: any;
  attendanceBreakdown?: {
    present?: number;
    absent?: number;
    halfDay?: number;
    leave?: number;
    holiday?: number;
  };
}

interface LeaveBalanceData {
  leaveType?: { name?: string };
  openingBalance?: number;
  closingBalance?: number;
  consumed?: number;
  accrued?: number;
  remaining?: number;
  used?: number;
  leaveTypeName?: string;
}

interface Meeting {
  id: string;
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  createdBy?: {
    firstName: string;
    lastName: string;
  };
  participants?: Array<{
    id: string;
    firstName: string;
    lastName: string;
  }>;
}


interface Holiday {
  id?: number;
  date?: string;
  name?: string;
  holidayType?: string;
  isOptional?: boolean;
}

export default function UserDashboardPage() {
  const { isBasicPlan } = usePlanAccess();
  const [isBasicPlanInferred, setIsBasicPlanInferred] = useState(false);
  const effectiveBasicPlan = isBasicPlan || isBasicPlanInferred;
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [hasPunchedInToday, setHasPunchedInToday] = useState(false);
  const [workingDays, setWorkingDays] = useState<number[] | undefined>(undefined);
  const [weekdayOffRules, setWeekdayOffRules] = useState<Record<string, number[]> | undefined>(undefined);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<ScoredEmployee[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(true);
  const [leaderboardOnTimeCutoffMinutes, setLeaderboardOnTimeCutoffMinutes] = useState<number | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [showSalaryAmount, setShowSalaryAmount] = useState(false);
  const [salaryMonthAmount, setSalaryMonthAmount] = useState<number>(0);
  const [salaryMonthLabel, setSalaryMonthLabel] = useState<string>("");
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [activeBreakSince, setActiveBreakSince] = useState<string | null>(null);
  const [breakLoading, setBreakLoading] = useState(false);

  const normalizeLeaveBalance = (balance: LeaveBalanceData): LeaveBalanceData => {
    const openingBalance = Number(balance.openingBalance ?? 0);
    const consumed = Number(balance.consumed ?? balance.used ?? 0);
    const closingBalance = Number(
      balance.closingBalance ?? balance.remaining ?? openingBalance - consumed
    );

    return {
      ...balance,
      openingBalance,
      consumed,
      closingBalance,
      leaveType: balance.leaveType ?? { name: balance.leaveTypeName || "Leave" },
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const normalizePlanHint = (value?: string | number | null) =>
          String(value ?? "").trim().toUpperCase();
        const isBasicPlanHint = (value?: string | number | null) => {
          const normalized = normalizePlanHint(value);
          return normalized === "1" || normalized === "BASIC";
        };
        // First get the profile to get user ID
        const profileRes = await getProfile();
        const profile = profileRes.data;
        
        const resolvedUserId = profile.userId ?? profile.id;

        // Set user data from profile
        setUserData({
          id: resolvedUserId,
          firstName: profile.employee?.firstName ?? profile.firstName,
          lastName: profile.employee?.lastName ?? profile.lastName,
          userName: profile.userName,
          email: profile.email,
          organizationId: profile.organizationId,
        });

        const profileTypeHints = [
          normalizePlanHint(profile?.planType),
          normalizePlanHint(profile?.pricingTypeId),
          normalizePlanHint(profile?.organization?.planType),
          normalizePlanHint(profile?.organization?.pricingTypeId),
          normalizePlanHint(profile?.organization?.pricingType?.typeId),
        ];
        let inferredBasicPlan = profileTypeHints.some((hint) =>
          isBasicPlanHint(hint)
        );

        if (!inferredBasicPlan && profile.organizationId) {
          try {
            const orgRes = await getOrganization(profile.organizationId);
            const org = orgRes.data || {};
            const orgTypeHints = [
              normalizePlanHint(org?.planType),
              normalizePlanHint(org?.pricingTypeId),
              normalizePlanHint(org?.pricingType?.typeId),
            ];
            inferredBasicPlan = orgTypeHints.some((hint) =>
              isBasicPlanHint(hint)
            );
          } catch {
            // ignore org fallback failure
          }
        }

        setIsBasicPlanInferred(inferredBasicPlan);

        // Get employee by user ID
        if (resolvedUserId) {
          try {
            const empResponse = await getEmployeeByUserId(resolvedUserId);
            if (empResponse.data) {
              const employeeName = {
                firstName: empResponse.data.firstName ?? profile.firstName,
                lastName: empResponse.data.lastName ?? profile.lastName,
              };
              setUserData((prev) => ({
                ...(prev || {}),
                id: resolvedUserId,
                firstName: employeeName.firstName,
                lastName: employeeName.lastName,
                userName: profile.userName,
                email: profile.email,
                organizationId: profile.organizationId,
              }));
              setEmployeeId(empResponse.data.id);
              
              // Fetch leave balance using user ID from profile
              const leaveResponse = await getLeaveBalance(resolvedUserId);
              if (leaveResponse.data) {
                const balances = leaveResponse.data;
                // Handle different response formats
                if (Array.isArray(balances)) {
                  setLeaveBalances(balances.map((b: LeaveBalanceData) => normalizeLeaveBalance(b)));
                } else if (balances.balances) {
                  setLeaveBalances(
                    balances.balances.map((b: LeaveBalanceData) => normalizeLeaveBalance(b))
                  );
                }
              }

              if (profile.organizationId && empResponse.data.id) {
                const now = new Date();
                const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const month = previousMonthDate.getMonth() + 1;
                const year = previousMonthDate.getFullYear();
                const monthName = previousMonthDate.toLocaleDateString("en-US", { month: "long" });
                setSalaryMonthLabel(monthName);

                // Prefer paid salary for the month; fallback to latest record (draft/processed/paid).
                const paidRes = await getPayrollRecords({
                  organizationId: profile.organizationId,
                  employeeId: empResponse.data.id,
                  month,
                  year,
                  status: "paid",
                  page: 1,
                  limit: 1,
                });

                const paidList = paidRes.data?.data || [];
                if (paidList.length > 0) {
                  setSalaryMonthAmount(Number(paidList[0]?.netPay || 0));
                } else {
                  const latestPaidRes = await getPayrollRecords({
                    organizationId: profile.organizationId,
                    employeeId: empResponse.data.id,
                    status: "paid",
                    page: 1,
                    limit: 1,
                  });
                  const latestPaidList = latestPaidRes.data?.data || [];
                  if (latestPaidList.length > 0) {
                    const latest = latestPaidList[0];
                    setSalaryMonthAmount(Number(latest?.netPay || 0));
                    const pp = String(latest?.payPeriod || "");
                    if (/^\d{4}-\d{2}$/.test(pp)) {
                      const [y, m] = pp.split("-").map((x: string) => Number(x));
                      const d = new Date(y, m - 1, 1);
                      setSalaryMonthLabel(d.toLocaleDateString("en-US", { month: "long" }));
                    }
                  } else {
                    setSalaryMonthAmount(0);
                  }
                }
              }
            }
          } catch (empError) {
            console.log("Employee data not found:", empError);
          }
        }

        // Fetch dashboard stats using organization ID
        if (profile.organizationId) {
          // Fetch today's attendance logs to determine punch-in status
          try {
            const todayLogsRes = await getTodayLogs({
              organizationId: profile.organizationId,
              userId: profile.id,
            });
            const punchInTime =
              todayLogsRes.data?.punchInTime ?? todayLogsRes.data?.data?.punchInTime;
            const hasLogs =
              (todayLogsRes.data?.logs?.length ?? todayLogsRes.data?.data?.logs?.length ?? 0) > 0;
            setHasPunchedInToday(Boolean(punchInTime || hasLogs));
            const logs = todayLogsRes.data?.logs ?? todayLogsRes.data?.data?.logs ?? [];
            const sortedLogs = [...logs].sort(
              (a: any, b: any) =>
                new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
            );
            const latestCheckIn = [...sortedLogs].reverse().find((log: any) => log.type === "check-in");
            const latestCheckOut = [...sortedLogs].reverse().find((log: any) => log.type === "check-out");
            let currentlyCheckedIn =
              Boolean(latestCheckIn) &&
              (!latestCheckOut ||
                new Date(latestCheckIn.timestamp).getTime() >
                  new Date(latestCheckOut.timestamp).getTime());
            const lastPunch =
              todayLogsRes.data?.lastPunch ?? todayLogsRes.data?.data?.lastPunch ?? null;
            if (!latestCheckIn && punchInTime) {
              const punchInMs = new Date(punchInTime).getTime();
              const lastPunchMs = lastPunch ? new Date(lastPunch).getTime() : NaN;
              currentlyCheckedIn = !lastPunch || punchInMs > lastPunchMs;
            }
            setIsCheckedIn(currentlyCheckedIn);
            const apiIsOnBreak = todayLogsRes.data?.isOnBreak ?? todayLogsRes.data?.data?.isOnBreak;
            const apiActiveBreakSince =
              todayLogsRes.data?.activeBreakSince ?? todayLogsRes.data?.data?.activeBreakSince;
            if (typeof apiIsOnBreak === "boolean") {
              setIsOnBreak(apiIsOnBreak);
              setActiveBreakSince(apiActiveBreakSince ?? null);
            } else {
              const breakState = getBreakStateFromLogs(logs);
              setIsOnBreak(breakState.isOnBreak);
              setActiveBreakSince(breakState.activeBreakSince);
            }
          } catch (todayLogError) {
            console.log("Today's attendance logs not available:", todayLogError);
            setHasPunchedInToday(false);
            setIsCheckedIn(false);
            setIsOnBreak(false);
            setActiveBreakSince(null);
          }

          try {
            const statsResponse = await getDashboardStats(profile.organizationId);
            if (statsResponse.data) {
              setStats(statsResponse.data);
            }
          } catch (statsError) {
            console.log("Stats not available:", statsError);
          }

          // Fetch holidays
          try {
            const holidaysResponse = await getHolidays({ organizationId: profile.organizationId });
            if (holidaysResponse.data) {
              // Handle different response formats
              const holidaysData = holidaysResponse.data;
              if (holidaysData.holidays) {
                setHolidays(holidaysData.holidays);
              } else if (Array.isArray(holidaysData)) {
                setHolidays(holidaysData);
              }
            }
          } catch (holidayError) {
            console.log("Holidays not available:", holidayError);
          }

          // Fetch upcoming meetings for this user
          if (resolvedUserId) {
            try {
              const meetingsRes = await getUpcomingMeetingsForUser(resolvedUserId);
              if (meetingsRes.data) {
                setMeetings(Array.isArray(meetingsRes.data) ? meetingsRes.data : []);
              }
            } catch (meetingError) {
              console.log("Meetings not available:", meetingError);
            }
          }

          // Fetch attendance settings for weekend/off-day rules
          try {
            const settingsRes = await getAttendanceSettings(profile.organizationId);
            const s = settingsRes.data || {};
            setWorkingDays(s?.workingDays);
            setWeekdayOffRules(s?.weekdayOffRules);
            setLeaderboardOnTimeCutoffMinutes(getOnTimeCutoffMinutes(s));
          } catch (settingsError) {
            console.log("Attendance settings not available:", settingsError);
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isBasicPlan]);

  // ── Fetch Leaderboard ────────────────────────────────────────────────────
  const fetchLeaderboard = useCallback(async (orgId: string, userId: string) => {
    try {
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Parallel fetch: report data + employees list (to exclude admin-only accounts)
      const [reportRes, empRes] = await Promise.allSettled([
        getAttendanceReport2({ organizationId: orgId, year, month, userIds: "ALL" }),
        getEmployees(orgId),
      ]);

      const rawData: any[] =
        reportRes.status === "fulfilled"
          ? (reportRes.value.data?.reportData ?? reportRes.value.data ?? [])
          : [];

      if (!Array.isArray(rawData) || rawData.length === 0) return;

      // Build Set of employee userIds — excludes pure-admin accounts
      const employeeUserIds = new Set<string>();
      if (empRes.status === "fulfilled") {
        const empList: any[] = empRes.value.data?.employees ?? empRes.value.data ?? [];
        for (const e of empList) {
          if (e.userId || e.user?.id) employeeUserIds.add(e.userId ?? e.user?.id);
        }
      }

      const scored = rawData
        .filter((r) => {
          if ((r.totalWorkingDays ?? 0) === 0) return false;
          if (employeeUserIds.size > 0 && !employeeUserIds.has(r.userId)) return false;
          return true;
        })
        .map((r) => computeScore(r, leaderboardOnTimeCutoffMinutes))
        .sort((a, b) => b.score - a.score)
        .slice(0, 4)
        .map((emp, i) => ({ ...emp, rank: i + 1 }));

      setLeaderboard(scored);

      // Month-end celebration: last 3 days of month + logged-in user is #1
      const lastDay = new Date(year, month, 0).getDate();
      const isMonthEnd = now.getDate() >= lastDay - 2;
      const isNo1 = scored.length > 0 && scored[0].userId === userId;
      if (isMonthEnd && isNo1) {
        const celebKey = `celebrated_${year}_${month}`;
        if (!sessionStorage.getItem(celebKey)) {
          setShowCelebration(true);
          sessionStorage.setItem(celebKey, "1");
        }
      }
    } catch (err) {
      console.error("Leaderboard fetch failed:", err);
    } finally {
      setLeaderboardLoading(false);
    }
  }, [leaderboardOnTimeCutoffMinutes]);

  useEffect(() => {
    if (userData?.organizationId && userData?.id) {
      fetchLeaderboard(userData.organizationId, userData.id);
    }
  }, [userData, fetchLeaderboard]);

  const getUserName = () => {
    if (userData?.firstName || userData?.lastName) {
      return `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
    }
    return userData?.userName || "User";
  };

  // Employee-specific summary values
  const hasPersonalCheckIn = hasPunchedInToday;
  const totalLeaveRemaining = leaveBalances.reduce((sum, leave) => {
    const remaining = Number(
      leave.closingBalance ?? leave.remaining ?? Math.max(Number(leave.openingBalance ?? 0) - Number(leave.consumed ?? leave.used ?? 0), 0)
    );
    return sum + Math.max(remaining, 0);
  }, 0);
  const upcomingMeetingsCount = meetings.length;
  const previousMonthShort = new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toLocaleDateString("en-US", { month: "long" });
  const formatInrCompact = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  const effectiveSalaryAmount = salaryMonthAmount || 0;
  const payrollDigits = Math.round(Number(effectiveSalaryAmount || 0)).toString().replace(/\D/g, "");
  const hiddenLastTwo = payrollDigits.slice(-2).padStart(2, "0");
  const salaryDisplayValue = showSalaryAmount ? formatInrCompact(effectiveSalaryAmount) : `****${hiddenLastTwo}`;

  // Stat cards
  const statCards = [
    {
      label: "My Attendance",
      value: hasPersonalCheckIn ? "Checked In" : "Not Checked In",
      badge: hasPersonalCheckIn ? "Today" : "Pending",
      up: hasPersonalCheckIn,
      icon: UserCheck,
      accent: hasPersonalCheckIn
        ? "text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20"
        : "text-rose-400 bg-rose-400/10 dark:bg-rose-400/20",
      borderColor: hasPersonalCheckIn ? "border-l-emerald-500" : "border-l-rose-400",
    },
    {
      label: "Leave Remaining",
      value: totalLeaveRemaining.toString(),
      badge: "Days",
      up: true,
      icon: Palmtree,
      accent: "text-teal-500 bg-teal-500/10 dark:bg-teal-500/20",
      borderColor: "border-l-teal-500",
    },
    {
      label: "Upcoming Meetings",
      value: upcomingMeetingsCount.toString(),
      badge: "Scheduled",
      up: upcomingMeetingsCount > 0,
      icon: CalendarDays,
      accent: "text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20",
      borderColor: "border-l-indigo-500",
    },
    {
      label: `Salary Month (${salaryMonthLabel || previousMonthShort})`,
      value: salaryDisplayValue,
      badge: "Paid",
      up: true,
      icon: DollarSign,
      accent: "text-amber-500 bg-amber-500/10 dark:bg-amber-500/20",
      borderColor: "border-l-amber-500",
      sensitive: true,
    },
  ];
  const visibleStatCards = effectiveBasicPlan
    ? statCards.filter((card) => card.label !== "Upcoming Meetings")
    : statCards;

  // Attendance breakdown from stats
  const attendanceBreakdownBase = stats?.attendanceBreakdown || {
    present: 0,
    absent: 0,
    halfDay: 0,
    leave: 0,
    holiday: 0,
  };
  const attendanceBreakdown = hasPunchedInToday
    ? {
        ...attendanceBreakdownBase,
        present: Math.max(1, attendanceBreakdownBase.present || 0),
      }
    : attendanceBreakdownBase;

  const handleBreakToggle = async () => {
    if (!userData?.organizationId || !userData?.id || breakLoading) return;
    if (!isCheckedIn && !isOnBreak) {
      toast.error("Please punch in before using break.");
      return;
    }
    setBreakLoading(true);
    try {
      const res = await toggleBreakStatus({
        organizationId: userData.organizationId,
        userId: userData.id,
        source: "web",
        timestamp: new Date().toISOString(),
      });
      const nextOnBreak = Boolean(res.data?.isOnBreak);
      setIsOnBreak(nextOnBreak);
      setActiveBreakSince(res.data?.activeBreakSince ?? null);
    } catch (error: any) {
      console.error("Failed to toggle break:", error);
    } finally {
      setBreakLoading(false);
    }
  };

  const breakSinceLabel = activeBreakSince
    ? new Date(activeBreakSince).toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;


  if (loading) {
    return (
      <div className="min-h-screen bg-background p-6 font-sans flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Get current month name for display
  const currentMonthLabel = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-background p-6 font-sans">
      {/* ── PAGE HEADER ── */}
      <div className="flex items-center justify-between mb-7">
        <div>
          <p className="text-sm text-muted-foreground font-medium">
            {getGreeting()}
          </p>
          <h1 className="text-3xl font-extrabold bg-gradient-to-r from-[#184a8c] to-[#00b4db] bg-clip-text text-transparent tracking-tight leading-tight">
            {getUserName()}
          </h1>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div
        className={`grid gap-5 mb-6 ${
          effectiveBasicPlan
            ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
            : "grid-cols-2 lg:grid-cols-4"
        }`}
      >
        {visibleStatCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className={`p-5 hover:-translate-y-1 transition-transform duration-200 cursor-pointer relative overflow-hidden border-l-4 ${card.borderColor} rounded-2xl`}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#184a8c]/10 to-[#00b4db]/10 rounded-full blur-xl -mr-12 -mt-12" />
              <div className={`w-11 h-11 rounded-xl ${card.accent} flex items-center justify-center mb-3 relative z-10`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-extrabold text-foreground tracking-tight relative z-10">
                {card.value}
              </p>
              {card.sensitive && (
                <button
                  type="button"
                  onClick={() => setShowSalaryAmount((prev) => !prev)}
                  className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground relative z-10"
                >
                  {showSalaryAmount ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  {showSalaryAmount ? "Hide" : "Show"}
                </button>
              )}
              <p className="text-xs text-muted-foreground font-medium mt-0.5 relative z-10">
                {card.label}
              </p>
              <span
                className={`absolute top-4 right-4 text-xs font-bold px-2 py-0.5 rounded-full font-mono flex items-center gap-0.5 ${
                  card.up
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400"
                    : "bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400"
                }`}
              >
                {card.up ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                {card.badge}
              </span>
            </Card>
          );
        })}
      </div>

      {/* ── ROW 1: DONUT + HOLIDAY CALENDAR + MEETINGS ── */}
      <div
        className={`grid gap-5 mb-5 ${
          effectiveBasicPlan
            ? "grid-cols-1 md:grid-cols-2"
            : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
        }`}
      >
        {/* ATTENDANCE DONUT */}
        <Card className="p-5 min-w-0 border-t-4 border-t-[#184a8c]/50 rounded-2xl h-full flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Attendance Statistics
              </h2>
              <p className="text-xs text-muted-foreground">{currentMonthLabel}</p>
            </div>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <AttendanceDonutChart
            present={attendanceBreakdown.present || 0}
            absent={attendanceBreakdown.absent || 0}
            halfDay={attendanceBreakdown.halfDay || 0}
            leave={attendanceBreakdown.leave || 0}
          />
        </Card>

        {/* HOLIDAY CALENDAR */}
        <Card className="p-5 min-w-0 border-t-4 border-t-[#00b4db]/50 rounded-2xl h-full flex flex-col">
          <div className="flex items-start justify-between mb-3 shadow-sm pb-2 border-b border-border/40">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Holiday Calendar
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Click a highlighted date to see details
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#00b4db]/10 to-[#184a8c]/10 flex items-center justify-center border border-[#00b4db]/20">
              <CalendarDays className="w-4 h-4 text-[#00b4db]" />
            </div>
          </div>
          <HolidayCalendarWidget
            holidays={holidays}
            workingDays={workingDays}
            weekdayOffRules={weekdayOffRules}
          />
        </Card>

        {!effectiveBasicPlan && (
          <Card className="p-5 min-w-0 border-t-4 border-t-[#184a8c]/50 rounded-2xl h-full flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h2 className="text-sm font-bold text-foreground">
                  Upcoming Meetings
                </h2>
                <p className="text-xs text-muted-foreground">
                  Your scheduled meetings
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {meetings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No upcoming meetings
                </p>
              ) : (
                meetings.slice(0, 5).map((m) => {
                  const meetingDate = new Date(m.scheduledAt);
                  const timeStr = meetingDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
                  const dateStr = meetingDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

                  return (
                    <div
                      key={m.id}
                      className="flex gap-3 p-3 rounded-xl bg-gradient-to-r from-[#184a8c]/5 to-[#00b4db]/5 border border-[#184a8c]/20 hover:border-[#00b4db] hover:shadow-md transition-all cursor-pointer"
                    >
                      <div className="flex flex-col items-center gap-1 min-w-[48px]">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-[#184a8c] to-[#00b4db] flex items-center justify-center shadow-sm">
                          <Clock className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[10px] font-bold bg-gradient-to-r from-[#184a8c] to-[#00b4db] bg-clip-text text-transparent whitespace-nowrap">
                          {timeStr}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {m.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {m.description || `${m.durationMinutes} minutes`}
                        </p>
                        {m.participants && m.participants.length > 0 && (
                          <div className="flex mt-1.5">
                            {m.participants.slice(0, 4).map((p, j) => (
                              <div
                                key={p.id}
                                className="w-5 h-5 rounded-full border-2 border-card flex items-center justify-center text-[8px] font-bold text-white -ml-1 first:ml-0"
                                style={{ background: ["#7c6cff", "#e87e8e", "#5cc8a8", "#e8b86c"][j % 4] }}
                              >
                                {p.firstName?.[0] || "?"}
                                {p.lastName?.[0] || ""}
                              </div>
                            ))}
                            {m.participants.length > 4 && (
                              <div className="w-5 h-5 rounded-full border-2 border-card flex items-center justify-center text-[8px] font-bold text-foreground -ml-1 bg-muted">
                                +{m.participants.length - 4}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="bg-primary/10 dark:bg-primary/20 rounded-xl px-2.5 py-1.5 text-center flex-shrink-0 self-start">
                        <p className="text-base font-extrabold text-primary leading-tight">
                          {meetingDate.getDate()}
                        </p>
                        <p className="text-[10px] text-muted-foreground font-medium">
                          {dateStr.split(" ")[0]}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        )}
      </div>

      {/* ── ROW 2: ATTENDANCE + LEAVE BALANCE + AWARD TABLE ── */}
      <div
        className={`grid gap-5 ${
          effectiveBasicPlan
            ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-3"
            : "grid-cols-1 lg:grid-cols-4"
        }`}
      >
        {/* TODAY'S ATTENDANCE STATUS */}
        <Card className="p-5 border-l-4 border-l-[#184a8c]/50 rounded-2xl">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Today&apos;s Attendance
              </h2>
              <p className="text-xs text-muted-foreground">
                Check-in status
              </p>
            </div>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
          <AttendanceStatus userId={userData?.id} organizationId={userData?.organizationId} />
        </Card>

        {/* BREAK TOGGLE */}
        <Card className="p-5 border-l-4 border-l-[#f59e0b]/60 rounded-2xl">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Break Status</h2>
              <p className="text-xs text-muted-foreground">
                Visible to team and admin dashboard
              </p>
            </div>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isOnBreak ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"}`}>
              <Coffee className="w-4 h-4" />
            </div>
          </div>
          <div className="rounded-xl border border-border/60 p-3 mb-3">
            <p className={`text-sm font-bold ${isOnBreak ? "text-amber-600" : "text-emerald-600"}`}>
              {isOnBreak ? "On Break" : "Available"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {isOnBreak && breakSinceLabel ? `Since ${breakSinceLabel}` : "Not currently on break"}
            </p>
          </div>
          <button
            type="button"
            disabled={breakLoading || (!isCheckedIn && !isOnBreak)}
            onClick={handleBreakToggle}
            className={`w-full rounded-xl py-2 text-sm font-semibold transition-colors ${
              !isCheckedIn && !isOnBreak
                ? "bg-muted text-muted-foreground cursor-not-allowed"
                : isOnBreak
                ? "bg-amber-500 hover:bg-amber-600 text-white"
                : "bg-emerald-500 hover:bg-emerald-600 text-white"
            }`}
          >
            {breakLoading ? "Updating..." : isOnBreak ? "End Break" : "Start Break"}
          </button>
          {!isCheckedIn && !isOnBreak && (
            <p className="text-[11px] text-muted-foreground mt-2">Punch in first to use break toggle.</p>
          )}
        </Card>

        {/* LEAVE BALANCE */}
        <Card className="p-5 border-l-4 border-l-[#00b4db]/50 rounded-2xl">
          <div className="mb-4">
            <h2 className="text-sm font-bold text-foreground">Leave Balance</h2>
            <p className="text-xs text-muted-foreground">
              Remaining leave by type
            </p>
          </div>
          <div className="space-y-5">
            {leaveBalances.length > 0 ? (
              leaveBalances.map((leave, index) => {
                const allocated = Number(leave.openingBalance ?? 0);
                const used = Number(leave.consumed ?? leave.used ?? 0);
                const remaining = Number(
                  leave.closingBalance ?? leave.remaining ?? Math.max(allocated - used, 0)
                );
                const pct = allocated > 0 ? Math.round((remaining / allocated) * 100) : 0;
                const colors = ["#7c6cff", "#e87e8e", "#5cc8a8", "#e8b86c"];
                const color = colors[index % colors.length];
                const leaveTypeName = leave.leaveType?.name || leave.leaveTypeName || `Leave Type ${index + 1}`;
                return (
                  <div key={leaveTypeName}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-xl flex items-center justify-center"
                          style={{ background: `${color}20` }}
                        >
                          <CalendarDays className="w-4 h-4" style={{ color }} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            {leaveTypeName}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {allocated} total • {used} used
                          </p>
                        </div>
                      </div>
                      <span className="text-lg font-extrabold" style={{ color }}>
                        {remaining}
                        <span className="text-[10px] font-semibold ml-1 text-muted-foreground">
                          left
                        </span>
                      </span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: color }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No leave data available</p>
              </div>
            )}
          </div>
        </Card>

        {/* EMPLOYEE LEADERBOARD */}
        {!effectiveBasicPlan && (
        <Card className="p-5 border-l-4 border-l-[#184a8c]/50 rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">Employee Leaderboard</h2>
              <p className="text-xs text-muted-foreground">
                {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })} · Auto-calculated
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-400/10 to-orange-400/10 flex items-center justify-center border border-amber-300/30">
              <Trophy className="w-4 h-4 text-amber-500" />
            </div>
          </div>

          {leaderboardLoading ? (
            <div className="space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-14 rounded-xl bg-muted/40 animate-pulse" />
              ))}
            </div>
          ) : leaderboard.length === 0 ? (
            <div className="text-center py-8">
              <Trophy className="w-10 h-10 mx-auto text-amber-300 mb-2" />
              <p className="text-sm text-muted-foreground">No attendance data yet</p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1 scrollbar-hide">
              {leaderboard.map((emp) => {
                const EMOJIS = ["🥇","🥈","🥉","🏅"];
                const GRADIENTS = [
                  "from-amber-400 to-yellow-400",
                  "from-slate-400 to-gray-300",
                  "from-orange-500 to-amber-600",
                  "from-blue-400 to-indigo-400",
                ];
                const BG = [
                  "bg-amber-50 dark:bg-amber-950/30 border-amber-200/60",
                  "bg-slate-50 dark:bg-slate-950/30 border-slate-200/50",
                  "bg-orange-50 dark:bg-orange-950/30 border-orange-200/50",
                  "bg-blue-50 dark:bg-blue-950/30 border-blue-200/40",
                ];
                const grad = GRADIENTS[emp.rank - 1] || GRADIENTS[3];
                const bg = BG[emp.rank - 1] || BG[3];
                const isMe = emp.userId === userData?.id;
                const pct = Math.min(emp.score, 100);
                return (
                  <div key={emp.userId} className={`rounded-xl border p-2.5 ${bg} ${isMe ? 'ring-2 ring-[#184a8c]/40' : ''} animate-fade-in`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${grad} flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-sm relative`}>
                        {emp.name.split(" ").map((n:string) => n[0]).slice(0, 2).join("").toUpperCase()}
                        <span className="absolute -top-1.5 -right-1.5 text-sm">{EMOJIS[emp.rank - 1]}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-xs font-bold text-foreground truncate">{emp.name}</span>
                          {isMe && <span className="text-[9px] font-bold text-[#184a8c] bg-[#184a8c]/10 px-1.5 py-0.5 rounded-full">You</span>}
                        </div>
                        <div className="h-1.5 bg-gray-200/60 dark:bg-gray-700/60 rounded-full overflow-hidden">
                          <div className={`h-full bg-gradient-to-r ${grad} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`text-base font-black bg-gradient-to-br ${grad} bg-clip-text text-transparent`}>{emp.score}</div>
                        <div className="text-[9px] text-muted-foreground">pts</div>
                      </div>
                    </div>
                    <div className="flex gap-3 mt-1.5 ml-11 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5"><UserCheck className="w-2.5 h-2.5" />{emp.attendancePct}%</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{emp.avgHours}h</span>
                      <span className="flex items-center gap-0.5"><Star className="w-2.5 h-2.5" />{emp.onTimePct}% on-time</span>
                    </div>
                  </div>
                );
              })}
              <p className="text-center text-[10px] text-muted-foreground pt-1">
                Score = Attendance 40% · Hours 35% · On-Time 25%
              </p>
            </div>
          )}
        </Card>
        )}
      </div>

      {/* ── CELEBRATION OVERLAY (Month-end #1) ── */}
      {showCelebration && leaderboard.length > 0 && leaderboard[0].userId === userData?.id && (
        <CelebrationOverlay
          name={leaderboard[0].name}
          score={leaderboard[0].score}
          onDismiss={() => setShowCelebration(false)}
        />
      )}
    </div>
  );
}
