"use client";

import { useMemo, useState } from "react";
import {
  format,
  isToday,
  isSameMonth,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  subMonths,
  addMonths,
} from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useTheme } from "next-themes";

type StatusType =
  | "present"
  | "absent"
  | "half-day"
  | "holiday"
  | "weekend"
  | "pending"
  | "leave"
  | "half-leave"
  | "on-leave"
  | "work-from-home"
  | "late";

interface AttendanceStatus {
  status: StatusType;
  holidayName?: string;
  inTime?: string;
  outTime?: string;
  isOptional?: boolean;
}

interface AttendanceCalendarProps {
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  statusByDate: Record<string, AttendanceStatus>;
}

export default function AttendanceCalendar({
  currentMonth,
  setCurrentMonth,
  statusByDate,
}: AttendanceCalendarProps) {
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [start, end]);

  // Mirror the RN calendar color logic exactly
  const getCircleStyle = (dayData: AttendanceStatus | undefined, isCurrentDay: boolean) => {
    if (!dayData) {
      return isCurrentDay
        ? { border: "2px solid #919191", background: "rgba(145,145,145,0.2)", color: "#919191" }
        : { border: "none", background: "transparent", color: undefined };
    }
    const { status } = dayData;
    if (status === "weekend") {
      return { border: "none", background: "#3b82f6", color: "#ffffff" };
    }
    if (status === "holiday") {
      return { border: "2px solid #045faa", background: "transparent", color: "#045faa" };
    }
    if (status === "present") {
      return { border: "2px solid #00C851", background: "rgba(0,200,80,0.09)", color: "#00C851" };
    }
    if (status === "absent") {
      return { border: "2px solid #ba0010", background: "rgba(186,0,16,0.09)", color: "#ba0010" };
    }
    if (status === "half-day") {
      return { border: "2px solid #e67b00", background: "rgba(230,123,0,0.09)", color: "#e67b00" };
    }
    if (status === "leave") {
      return { border: "2px solid #f59e0b", background: "rgba(245,158,11,0.09)", color: "#f59e0b" };
    }
    if (status === "half-leave") {
      return { border: "2px solid #f59e0b", background: "rgba(245,158,11,0.09)", color: "#f59e0b" };
    }
    return isCurrentDay
      ? { border: "2px solid #919191", background: "rgba(145,145,145,0.2)", color: "#919191" }
      : { border: "none", background: "transparent", color: undefined };
  };

  return (
    <div className="select-none">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors active:scale-95"
        >
          <ChevronRight className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={i}
            className="text-center text-xs font-semibold text-gray-400 dark:text-gray-500 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-y-1.5">
        {calendarDays.map((day, index) => {
          const dateKey = format(day, "yyyy-MM-dd");
          const dayData = statusByDate[dateKey];
          const status = dayData?.status;
          const isCurrentMonth = isSameMonth(day, currentMonth);
          const isCurrentDay = isToday(day);
          const circleStyle = getCircleStyle(dayData, isCurrentDay);

          const tooltip = dayData?.holidayName
            ? dayData.holidayName
            : dayData?.inTime && dayData?.outTime
            ? `In: ${dayData.inTime}, Out: ${dayData.outTime}`
            : status;

          return (
            <Dialog key={index}>
              <DialogTrigger asChild>
                <div
                  className={cn(
                    "flex flex-col items-center cursor-pointer py-0.5",
                    !isCurrentMonth && "opacity-30"
                  )}
                  title={tooltip}
                  onClick={() => setSelectedDate(dateKey)}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center relative mx-auto"
                    style={{
                      border: circleStyle.border,
                      background: circleStyle.background,
                      fontWeight: isCurrentDay ? "bold" : "500",
                    }}
                  >
                    <span
                      className="text-xs"
                      style={{ color: circleStyle.color ?? (isDarkMode ? "#d1d5db" : "#374151") }}
                    >
                      {format(day, "d")}
                    </span>
                    {status === "holiday" && (
                      <span
                        className="absolute -top-1 -right-1 text-[7px] font-bold text-white rounded px-0.5 leading-none"
                        style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
                      >
                        {dayData?.isOptional ? "RH" : "H"}
                      </span>
                    )}
                  </div>
                </div>
              </DialogTrigger>

              {/* Day detail dialog */}
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{format(day, "PPP")}</DialogTitle>
                  <DialogDescription asChild>
                    <div className="text-sm mt-2 space-y-2">
                      {status === "holiday" ? (
                        <>
                          {dayData?.holidayName && (
                            <p className="text-base font-bold" style={{ color: "#045faa" }}>
                              {dayData.holidayName}
                            </p>
                          )}
                          <p className="italic text-muted-foreground">
                            {dayData?.isOptional ? "(Restricted Holiday)" : "(Holiday)"}
                          </p>
                        </>
                      ) : status === "present" || status === "half-day" ? (
                        <div className="rounded-xl bg-gray-50 dark:bg-zinc-800 p-3 space-y-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white dark:bg-zinc-700 flex items-center justify-center shadow-sm shrink-0">
                              <span className="text-green-500 text-base">↗</span>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground font-medium">Punch In</p>
                              <p className="font-bold text-sm">{dayData?.inTime || "N/A"}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white dark:bg-zinc-700 flex items-center justify-center shadow-sm shrink-0">
                              <span className="text-red-500 text-base">↙</span>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground font-medium">Punch Out</p>
                              <p className="font-bold text-sm">{dayData?.outTime || "N/A"}</p>
                            </div>
                          </div>
                        </div>
                      ) : status ? (
                        <p><strong>Status:</strong> {status.charAt(0).toUpperCase() + status.slice(1)}</p>
                      ) : (
                        <p className="text-muted-foreground">No data available.</p>
                      )}
                    </div>
                  </DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
          );
        })}
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-x-2 gap-y-2 mt-4 pt-3 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "#00C851" }} />
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "#ba0010" }} />
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "#e67b00" }} />
          <span>Half-Day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "#f59e0b" }} />
          <span>Leave</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "#f59e0b" }} />
          <span>Half-Leave</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ border: "2px solid #045faa" }} />
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full shrink-0" style={{ background: "#3b82f6" }} />
          <span>Weekend</span>
        </div>
        <div className="flex items-center gap-1.5 col-span-2">
          <span className="font-bold">RH</span><span>= Restricted Holiday,</span>
          <span className="font-bold">H</span><span>= Holiday</span>
        </div>
      </div>
    </div>
  );
}