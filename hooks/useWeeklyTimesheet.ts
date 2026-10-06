"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { TZDate } from "@date-fns/tz";
import { formatTZ, isValidTimezone, DEFAULT_BUSINESS_TIMEZONE } from "@/utils/timezone";
import { useOrganizationTimezone } from "./useOrganizationTimezone";

export interface TimesheetDayInfo {
  dateStr: string; // YYYY-MM-DD
  dayName: string; // "Monday", "Tuesday", etc.
  shortDayName: string; // "Mon", "Tue", etc.
  formattedDate: string; // "Oct 5"
  fullDateLabel: string; // "Monday, October 5, 2026"
  isToday: boolean;
  isPast: boolean;
  isFuture: boolean;
  canEdit: boolean;
}

export interface WeeklyTimesheetState {
  weekOffset: number;
  setWeekOffset: (fn: number | ((prev: number) => number)) => void;
  goToCurrentWeek: () => void;
  goToPreviousWeek: () => void;
  goToNextWeek: () => void;
  mondayStr: string;
  saturdayStr: string;
  headerLabel: string;
  deadlineDateFormatted: string;
  days: TimesheetDayInfo[];
  isCurrentWeek: boolean;
  isPastWeek: boolean;
  isFutureWeek: boolean;
  isSaturday: boolean;
  isClosed: boolean;
  isEditable: boolean;
  countdownText: string;
  timezone: string;
  todayStr: string;
}

export function useWeeklyTimesheet(): WeeklyTimesheetState {
  const { timezone: orgTz, today: getOrgToday } = useOrganizationTimezone();
  const timezone = isValidTimezone(orgTz) ? orgTz : DEFAULT_BUSINESS_TIMEZONE;
  const [weekOffset, setWeekOffset] = useState<number>(0);
  const [nowTimestamp, setNowTimestamp] = useState<number>(() => Date.now());

  // Update wall clock every second for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNowTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const todayStr = useMemo(() => getOrgToday(), [getOrgToday]);

  const weekCalculation = useMemo(() => {
    const now = new TZDate(nowTimestamp, timezone);
    const year = now.getFullYear();
    const month = now.getMonth();
    const day = now.getDate();
    const dayOfWeek = now.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

    let activeMondayDate: TZDate;
    let activeSaturdayDate: TZDate;

    if (dayOfWeek === 0) {
      // Sunday is the transition/reset day: previous week is closed.
      // Active week is upcoming Monday through Saturday.
      activeMondayDate = new TZDate(year, month, day + 1, 0, 0, 0, 0, timezone);
      activeSaturdayDate = new TZDate(year, month, day + 6, 23, 59, 59, 999, timezone);
    } else {
      // Monday (1) through Saturday (6)
      activeMondayDate = new TZDate(year, month, day - (dayOfWeek - 1), 0, 0, 0, 0, timezone);
      activeSaturdayDate = new TZDate(year, month, day + (6 - dayOfWeek), 23, 59, 59, 999, timezone);
    }

    const selectedMondayDate = new TZDate(
      activeMondayDate.getFullYear(),
      activeMondayDate.getMonth(),
      activeMondayDate.getDate() + weekOffset * 7,
      0,
      0,
      0,
      0,
      timezone,
    );

    const selectedSaturdayDate = new TZDate(
      activeSaturdayDate.getFullYear(),
      activeSaturdayDate.getMonth(),
      activeSaturdayDate.getDate() + weekOffset * 7,
      23,
      59,
      59,
      999,
      timezone,
    );

    const mondayStr = formatTZ(selectedMondayDate, timezone, "yyyy-MM-dd");
    const saturdayStr = formatTZ(selectedSaturdayDate, timezone, "yyyy-MM-dd");
    const mondayLabel = formatTZ(selectedMondayDate, timezone, "MMM d");
    const saturdayLabel = formatTZ(selectedSaturdayDate, timezone, "MMM d");
    const headerLabel = `Week of ${mondayLabel} – ${saturdayLabel}`;
    const deadlineDateFormatted = formatTZ(selectedSaturdayDate, timezone, "EEEE, MMM d");

    const isCurrentWeek = weekOffset === 0;
    const isPastWeek = weekOffset < 0;
    const isFutureWeek = weekOffset > 0;
    const isSaturday = isCurrentWeek && dayOfWeek === 6;

    const activeDeadlineMs = activeSaturdayDate.getTime();
    const isDeadlinePassed = isPastWeek || (isCurrentWeek && nowTimestamp >= activeDeadlineMs);
    const isClosed = isPastWeek || isDeadlinePassed;
    const isEditable = isCurrentWeek && !isClosed;

    // Build 6 days array (Monday through Saturday)
    const days: TimesheetDayInfo[] = [0, 1, 2, 3, 4, 5].map((i) => {
      const d = new TZDate(
        selectedMondayDate.getFullYear(),
        selectedMondayDate.getMonth(),
        selectedMondayDate.getDate() + i,
        12,
        0,
        0,
        0,
        timezone,
      );
      const dateStr = formatTZ(d, timezone, "yyyy-MM-dd");
      const dayName = formatTZ(d, timezone, "EEEE");
      const shortDayName = formatTZ(d, timezone, "EEE");
      const formattedDate = formatTZ(d, timezone, "MMM d");
      const fullDateLabel = formatTZ(d, timezone, "EEEE, MMMM d, yyyy");
      const isToday = dateStr === todayStr;
      const isPast = dateStr < todayStr;
      const isFuture = dateStr > todayStr;
      const canEdit = isEditable && (isToday || isPast);

      return {
        dateStr,
        dayName,
        shortDayName,
        formattedDate,
        fullDateLabel,
        isToday,
        isPast,
        isFuture,
        canEdit,
      };
    });

    // Compute live countdown string
    let countdownText = "00h 00m 00s";
    if (isCurrentWeek && !isClosed) {
      const remMs = Math.max(0, activeDeadlineMs - nowTimestamp);
      const totalHours = Math.floor(remMs / (1000 * 60 * 60));
      const minutes = Math.floor((remMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remMs % (1000 * 60)) / 1000);

      if (isSaturday || totalHours < 24) {
        countdownText = `${String(totalHours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
      } else {
        const daysLeft = Math.floor(totalHours / 24);
        const remHours = totalHours % 24;
        countdownText = `${daysLeft}d ${String(remHours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
      }
    }

    return {
      mondayStr,
      saturdayStr,
      headerLabel,
      deadlineDateFormatted,
      days,
      isCurrentWeek,
      isPastWeek,
      isFutureWeek,
      isSaturday,
      isClosed,
      isEditable,
      countdownText,
    };
  }, [nowTimestamp, timezone, weekOffset, todayStr]);

  const goToCurrentWeek = useCallback(() => setWeekOffset(0), []);
  const goToPreviousWeek = useCallback(() => setWeekOffset((p) => p - 1), []);
  const goToNextWeek = useCallback(() => setWeekOffset((p) => p + 1), []);

  return {
    weekOffset,
    setWeekOffset,
    goToCurrentWeek,
    goToPreviousWeek,
    goToNextWeek,
    mondayStr: weekCalculation.mondayStr,
    saturdayStr: weekCalculation.saturdayStr,
    headerLabel: weekCalculation.headerLabel,
    deadlineDateFormatted: weekCalculation.deadlineDateFormatted,
    days: weekCalculation.days,
    isCurrentWeek: weekCalculation.isCurrentWeek,
    isPastWeek: weekCalculation.isPastWeek,
    isFutureWeek: weekCalculation.isFutureWeek,
    isSaturday: weekCalculation.isSaturday,
    isClosed: weekCalculation.isClosed,
    isEditable: weekCalculation.isEditable,
    countdownText: weekCalculation.countdownText,
    timezone,
    todayStr,
  };
}
