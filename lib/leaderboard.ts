import { getTimesheets } from "@/app/api/api";
import { getMinutesOfDayInZone } from "@/utils/timezone";
import { useOrganizationTimezoneStore } from "@/stores/organizationTimezoneStore";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeaderboardDailyRecord {
  date?: string;
  status?: string;
  inTime?: string | null;
  outTime?: string | null;
  workingHours?: number;
  isHoliday?: boolean;
  isSunday?: boolean;
}

export interface LeaderboardAttendanceRow {
  userId: string;
  userName?: string | null;
  email?: string;
  attendancePercentage?: number | null;
  averageWorkingHours?: number | null;
  presentDays?: number | null;
  totalWorkingDays?: number | null;
  dailyRecords?: LeaderboardDailyRecord[] | null;
}

export interface ScoredEmployee {
  rank: number;
  userId: string;
  name: string;
  email?: string;
  score: number;
  attendancePct: number;
  avgHours: number;
  onTimePct: number;
  presentDays: number;
  totalWorkingDays: number;
  /** Share of worked days that have a valid timesheet entry (0-100) */
  timesheetPct: number;
  /** Distinct days with a valid timesheet entry */
  timesheetDays: number;
  /** Worked days elapsed in the period (denominator for timesheetPct) */
  expectedTimesheetDays: number;
}

// Weights used when timesheet data is available. Without timesheet data the
// historical 40 / 35 / 25 split is kept so scores do not change for orgs that
// do not use the timesheet module.
export const LEADERBOARD_WEIGHTS = {
  attendance: 0.35,
  hours: 0.3,
  onTime: 0.2,
  timesheet: 0.15,
} as const;

export const LEADERBOARD_WEIGHT_LABELS =
  "Attendance 35% · Hours 30% · On-Time 20% · Timesheets 15%";

export const LEADERBOARD_WEIGHT_LABELS_WITHOUT_TIMESHEETS =
  "Attendance 40% · Hours 35% · On-Time 25%";

// ─── Date / time helpers ──────────────────────────────────────────────────────

export function normalizeAttendanceStatus(status: unknown): string {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

export function parseShiftTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || typeof timeStr !== "string") return null;
  const [hRaw, mRaw] = timeStr.trim().split(":");
  const h = Number(hRaw);
  const m = Number(mRaw ?? 0);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return h * 60 + m;
}

export function getOnTimeCutoffMinutes(
  settings?: {
    workStartTime?: string;
    graceMinutes?: number;
    lateThresholdMinutes?: number;
  } | null,
): number | null {
  const startMinutes = parseShiftTimeToMinutes(settings?.workStartTime);
  if (startMinutes === null) return null;
  const allowanceRaw = Number(settings?.graceMinutes ?? settings?.lateThresholdMinutes ?? 0);
  const allowance = Number.isFinite(allowanceRaw) ? Math.max(0, Math.floor(allowanceRaw)) : 0;
  return startMinutes + allowance;
}

export function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;
  // Handles "09:15 AM", "09:15", "2026-03-08T03:45:00.000Z"
  try {
    if (timeStr.includes("T")) {
      const d = new Date(timeStr);
      const tz = useOrganizationTimezoneStore.getState().timezone;
      return getMinutesOfDayInZone(d, tz);
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
  } catch {
    return null;
  }
}

export function getMonthRange(year: number, month: number): { fromDate: string; toDate: string } {
  const mm = String(month).padStart(2, "0");
  const lastDay = new Date(year, month, 0).getDate();
  return {
    fromDate: `${year}-${mm}-01`,
    toDate: `${year}-${mm}-${String(lastDay).padStart(2, "0")}`,
  };
}

/**
 * Days on which a timesheet entry is expected: the days the employee actually
 * worked (present / half-day / late) and that have already elapsed. Using
 * worked days instead of all working days avoids penalising approved leave or
 * holidays twice.
 */
export function countExpectedTimesheetDays(
  dailyRecords: LeaderboardDailyRecord[] | null | undefined,
  year: number,
  month: number,
): number {
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() + 1 === month;
  const lastDay = new Date(year, month, 0).getDate();
  const elapsedDay = isCurrentMonth ? today.getDate() : lastDay;

  if (Array.isArray(dailyRecords) && dailyRecords.length > 0) {
    const expected = dailyRecords.filter((rec) => {
      if (!rec || rec.isHoliday || rec.isSunday) return false;
      const raw = String(rec.date ?? "").slice(0, 10);
      if (!raw) return false;
      const yearNum = Number(raw.slice(0, 4));
      const monthNum = Number(raw.slice(5, 7));
      if (Number.isFinite(yearNum) && yearNum !== year) return false;
      if (Number.isFinite(monthNum) && monthNum !== month) return false;
      const day = Number(raw.slice(8, 10));
      if (!Number.isFinite(day) || day > elapsedDay) return false;
      const status = normalizeAttendanceStatus(rec.status);
      return status === "present" || status === "half-day" || status === "late";
    }).length;
    if (expected > 0) return expected;
  }

  // Fallback: calendar days elapsed, excluding Sundays.
  let fallback = 0;
  for (let day = 1; day <= elapsedDay; day += 1) {
    if (new Date(year, month - 1, day).getDay() !== 0) fallback += 1;
  }
  return fallback;
}

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function computeScore(
  row: LeaderboardAttendanceRow,
  onTimeCutoffMinutes: number | null,
  timesheet?: { submittedDays: number; expectedDays: number } | null,
): ScoredEmployee {
  const attendancePct = Math.min(row.attendancePercentage ?? 0, 100);

  // Normalise avg hours: assume 9h = 100%, cap at 12h
  const avgHours = row.averageWorkingHours ?? 0;
  const hoursScore = Math.min((avgHours / 9) * 100, 100);

  // On-time rate from daily records
  let onTimeDays = 0;
  let checkedDays = 0;
  if (Array.isArray(row.dailyRecords)) {
    for (const rec of row.dailyRecords) {
      if (rec.isHoliday || rec.isSunday) continue;
      const normalizedStatus = normalizeAttendanceStatus(rec.status);
      const isCountable =
        normalizedStatus === "present" ||
        normalizedStatus === "half-day" ||
        normalizedStatus === "late";
      if (!isCountable) continue;
      checkedDays += 1;
      if (normalizedStatus === "late") continue;
      if (onTimeCutoffMinutes === null) {
        onTimeDays += 1;
        continue;
      }
      const mins = parseTimeToMinutes(rec.inTime ?? undefined);
      if (mins === null || mins <= onTimeCutoffMinutes) onTimeDays += 1;
    }
  }
  const onTimePct = checkedDays > 0 ? (onTimeDays / checkedDays) * 100 : 0;

  const expectedDays = Math.max(0, Math.floor(timesheet?.expectedDays ?? 0));
  const submittedDays = Math.max(0, Math.floor(timesheet?.submittedDays ?? 0));
  const hasTimesheetData = expectedDays > 0;
  const timesheetPct = hasTimesheetData
    ? Math.min((Math.min(submittedDays, expectedDays) / expectedDays) * 100, 100)
    : 0;

  const score = hasTimesheetData
    ? attendancePct * LEADERBOARD_WEIGHTS.attendance +
      hoursScore * LEADERBOARD_WEIGHTS.hours +
      onTimePct * LEADERBOARD_WEIGHTS.onTime +
      timesheetPct * LEADERBOARD_WEIGHTS.timesheet
    : attendancePct * 0.4 + hoursScore * 0.35 + onTimePct * 0.25;

  return {
    rank: 0,
    userId: row.userId,
    name: row.userName ?? "Unknown",
    email: row.email,
    score: Math.round(score * 10) / 10,
    attendancePct: Math.round(attendancePct),
    avgHours: Math.round(avgHours * 10) / 10,
    onTimePct: Math.round(onTimePct),
    presentDays: row.presentDays ?? 0,
    totalWorkingDays: row.totalWorkingDays ?? 0,
    timesheetPct: Math.round(timesheetPct),
    timesheetDays: hasTimesheetData ? Math.min(submittedDays, expectedDays) : 0,
    expectedTimesheetDays: expectedDays,
  };
}

// ─── Timesheet compliance ─────────────────────────────────────────────────────

const TIMESHEET_PAGE_SIZE = 500;
const TIMESHEET_MAX_PAGES = 10; // safety cap: 5,000 entries per period

/**
 * Distinct days per employee that have at least one valid (non-rejected,
 * non-zero) timesheet entry for the given month.
 *
 * Returns `null` when the timesheet API is unavailable so the leaderboard can
 * fall back to the attendance-only formula instead of penalising everyone.
 *
 * The returned map is keyed by the employee id used by the timesheet module;
 * callers translate it to user ids with the employee directory.
 */
export async function fetchTimesheetDaysByEmployeeId(
  organizationId: string,
  year: number,
  month: number,
): Promise<Map<string, number> | null> {
  if (!organizationId) return null;
  const { fromDate, toDate } = getMonthRange(year, month);

  try {
    const daysByEmployee = new Map<string, Set<string>>();
    let page = 1;
    let totalPages = 1;

    do {
      const res = await getTimesheets({
        organizationId,
        fromDate,
        toDate,
        page,
        limit: TIMESHEET_PAGE_SIZE,
      });
      const payload = res?.data ?? {};
      const rows: Array<{
        date?: string;
        employeeId?: string;
        workingMinutes?: number | string | null;
        approvalStatus?: string | null;
        employee?: { id?: string } | null;
      }> = Array.isArray(payload.results) ? payload.results : [];

      for (const row of rows) {
        const approval = String(row?.approvalStatus ?? "").toUpperCase();
        if (approval === "REJECTED") continue;
        if (Number(row?.workingMinutes ?? 0) <= 0) continue;

        const employeeId = row?.employeeId ?? row?.employee?.id;
        const date = String(row?.date ?? "").slice(0, 10);
        if (!employeeId || !date) continue;

        const dates = daysByEmployee.get(employeeId) ?? new Set<string>();
        dates.add(date);
        daysByEmployee.set(employeeId, dates);
      }

      const pages = Number(payload?.pagination?.totalPages ?? 1);
      totalPages = Number.isFinite(pages) && pages > 0 ? pages : 1;
      page += 1;
    } while (page <= totalPages && page <= TIMESHEET_MAX_PAGES);

    const daysByUserId = new Map<string, number>();
    daysByEmployee.forEach((dates, employeeId) => {
      daysByUserId.set(employeeId, dates.size);
    });
    return daysByUserId;
  } catch (error) {
    console.error("Failed to fetch timesheet compliance for leaderboard:", error);
    return null;
  }
}
