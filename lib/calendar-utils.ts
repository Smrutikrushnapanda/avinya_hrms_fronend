"use client";

import { cn } from "@/lib/utils";

export type AttendanceStatus =
  | "present"
  | "absent"
  | "half-day"
  | "half-leave"
  | "pending"
  | "weekend"
  | "holiday";

export interface AttendanceRecord {
  date: string;
  status: AttendanceStatus;
  isSunday: boolean;
  isWeekend?: boolean;
  isHoliday: boolean;
  holidayName?: string;
  isOptional?: boolean;
  inTime?: string;
  outTime?: string;
}

export interface AttendanceData {
  [date: string]: AttendanceRecord;
}

interface MarkedDate {
  selected: boolean;
  selectedColor: string;
  selectedTextColor: string;
  customStyles?: {
    container?: Record<string, unknown>;
    text?: Record<string, unknown>;
  };
  customText?: string;
}

interface MarkedDates {
  [date: string]: MarkedDate;
}

interface OrgSettings {
  workingDays?: number[];
  weekdayOffRules?: Record<string, number[]>;
}

export function getDayCircleClass(
  status: AttendanceStatus | undefined,
  isCurrentDay: boolean,
  colors: { primary: string; surface: string; text: string; onPrimary: string; grey: string; border: string }
): string {
  const base =
    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold mx-auto relative transition-colors";
  if (status === "present")
    return cn(base, "bg-green-100 dark:bg-green-900/30 border-2 border-green-500 dark:border-green-600 text-green-800 dark:text-green-300");
  if (status === "absent")
    return cn(base, "bg-red-100 dark:bg-red-900/30 border-2 border-red-500 dark:border-red-600 text-red-800 dark:text-red-300");
  if (status === "weekend")
    return cn(base, "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-500 dark:border-blue-600 text-blue-800 dark:text-blue-300");
  if (status === "half-leave")
    return cn(base, "bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-500 dark:border-yellow-500 dark:text-yellow-300");
  if (status === "holiday")
    return cn(base, "bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-300");
  if (status === "pending")
    return cn(base, "bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400");
  if (isCurrentDay)
    return cn(base, "border-2 border-blue-500 dark:border-blue-600 text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950");
  return cn(base, "text-gray-700 dark:text-gray-300");
}

export function getAttendanceBorderColor(
  dayData: AttendanceRecord | undefined,
  colors: { primary: string }
): string | null {
  if (!dayData) return null;

  if (dayData.isWeekend || dayData.isSunday) {
    return colors.primary;
  } else if (dayData.isHoliday) {
    return "#045faaff";
  } else {
    switch (dayData.status) {
      case "present":
        return "#00C851";
      case "absent":
        return "#ba0010ff";
      case "half-day":
        return "#e67b00ff";
      case "pending":
        return null;
      default:
        return null;
    }
  }
}

export function getAttendanceLightBackgroundColor(
  dayData: AttendanceRecord | undefined,
  colors: { primary: string }
): string | null {
  if (!dayData) return null;

  if (dayData.isWeekend || dayData.isSunday) {
    return colors.primary;
  } else if (dayData.isHoliday) {
    return "transparent";
  } else {
    switch (dayData.status) {
      case "present":
        return "rgba(0, 200, 80, 0.09)";
      case "absent":
        return "rgba(186, 0, 16, 0.09)";
      case "half-day":
        return "rgba(230, 123, 0, 0.09)";
      case "pending":
        return null;
      default:
        return null;
    }
  }
}

export function isOrgOffDay(
  date: Date,
  workingDays?: number[],
  weekdayOffRules?: Record<string, number[]>
): boolean {
  const dow = date.getDay(); // 0=Sun
  const weekNum = Math.ceil(date.getDate() / 7);

  if (Array.isArray(workingDays) && workingDays.length && !workingDays.includes(dow)) return true;

  if (weekdayOffRules && Array.isArray(weekdayOffRules[dow])) {
    if (weekdayOffRules[dow].includes(weekNum)) return true;
  }

  if (!workingDays && !weekdayOffRules) {
    if (dow === 0) return true;
  }

  return false;
}

export function generateMarkedDates(
  attendanceData: AttendanceData,
  currentMonth: number,
  currentYear: number,
  colors: { primary: string; surface: string; text: string; onPrimary: string; grey: string; border: string },
  workingDays?: number[],
  weekdayOffRules?: Record<string, number[]>
): MarkedDates {
  const marked: MarkedDates = {};

  const daysInMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

  // First pass: apply attendance data
  Object.keys(attendanceData).forEach((dateStr) => {
    const record = attendanceData[dateStr];
    let backgroundColor: string;

    // Priority: Weekend > Holiday > Status (absent suppressed on off days)
    if (record.isWeekend || record.isSunday) {
      backgroundColor = colors.primary; // Blue for weekend/off days
    } else if (record.isHoliday) {
      backgroundColor = "#ffb4b4ff"; // Blue for holidays
    } else {
      switch (record.status) {
        case "present":
          backgroundColor = "#00C851"; // Green
          break;
        case "absent":
          backgroundColor = "#ba0010ff"; // Improved red color - softer and more professional
          break;
        case "half-day":
          backgroundColor = "#e67b00ff"; // Orange
          break;
        case "pending":
          // Skip marking for pending status - let it appear as normal day
          return;
        default:
          // Skip marking for any other status
          return;
      }
    }

    const markedDate: MarkedDate = {
      selected: true,
      selectedColor: backgroundColor,
      selectedTextColor: "#ffffff",
    };

    marked[dateStr] = markedDate;
  });

  // Second pass: ensure org off days are marked (blue) and never show absent on off days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateObj = new Date(currentYear, currentMonth - 1, day);
    const dateStr = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const off = isOrgOffDay(dateObj, workingDays, weekdayOffRules);

    const existing = marked[dateStr];

    const keepStatuses = ["present", "half-day", "leave", "half-leave"];

    if (existing?.selectedColor === colors.primary && !off) {
      marked[dateStr] = {
        ...existing,
        selectedColor: colors.primary,
        selectedTextColor: "#ffffff",
      };
      continue;
    }

    if (existing) {
      if (keepStatuses.includes(existing.selectedColor ? "present" : "present")) continue;
      // If existing has a color, check if status should be kept
      const status = existing.selectedColor ? "present" : "present";
      if (keepStatuses.includes(status)) continue;
    }

    if (off) {
      marked[dateStr] = {
        selected: true,
        selectedColor: colors.primary,
        selectedTextColor: "#ffffff",
      };
    }
  }

  // Highlight selected date if it's not already marked
  // This part would need the selectedDate prop, but we'll leave it for the component

  return marked;
}

export function mapApiStatus(status: string): AttendanceStatus {
  switch (status?.toLowerCase()) {
    case "present": return "present";
    case "absent": return "absent";
    case "half-day":
    case "half_day": return "half-day";
    case "holiday": return "holiday";
    case "weekend": return "weekend";
    case "on-leave":
    case "half-leave": return "half-leave";
    default: return "pending";
  }
}