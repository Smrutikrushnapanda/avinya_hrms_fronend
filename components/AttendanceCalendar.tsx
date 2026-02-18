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
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AttendanceStatus {
  status:
    | "present"
    | "absent"
    | "half-day"
    | "holiday"
    | "pending"
    | "leave"
    | "half-leave";
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

function getDayCircleClass(
  status: AttendanceStatus["status"] | undefined,
  isCurrentDay: boolean
): string {
  const base =
    "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold mx-auto relative transition-colors";
  if (status === "present")
    return cn(base, "bg-green-100 border-2 border-green-500 text-green-800");
  if (status === "absent")
    return cn(base, "bg-red-100 border-2 border-red-500 text-red-800");
  if (status === "leave")
    return cn(base, "bg-yellow-100 border-2 border-yellow-500 text-yellow-800");
  if (status === "holiday")
    return cn(base, "bg-blue-100 border-2 border-blue-400 text-blue-800");
  if (status === "pending")
    return cn(base, "bg-gray-100 border border-gray-300 text-gray-500");
  if (isCurrentDay)
    return cn(base, "border-2 border-blue-500 text-blue-700 bg-blue-50");
  return cn(base, "text-gray-700");
}

export default function AttendanceCalendar({
  currentMonth,
  setCurrentMonth,
  statusByDate,
}: AttendanceCalendarProps) {
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

  return (
    <div className="select-none">
      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors active:scale-95"
        >
          <ChevronLeft className="w-4 h-4 text-gray-600" />
        </button>
        <h2 className="text-sm font-semibold text-gray-800">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1.5 rounded-full hover:bg-gray-100 transition-colors active:scale-95"
        >
          <ChevronRight className="w-4 h-4 text-gray-600" />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 mb-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <div
            key={i}
            className="text-center text-xs font-semibold text-gray-400 py-1"
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
          const isHalf = status === "half-day" || status === "half-leave";

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
                  {isHalf ? (
                    // Split circle for half-day / half-leave
                    <div
                      className={cn(
                        "w-9 h-9 rounded-full mx-auto relative overflow-hidden border-2 flex items-center justify-center",
                        status === "half-day"
                          ? "border-orange-400"
                          : "border-yellow-400",
                        isCurrentDay && "ring-2 ring-blue-500 ring-offset-1"
                      )}
                    >
                      <div
                        className={cn(
                          "absolute left-0 top-0 w-1/2 h-full",
                          status === "half-day"
                            ? "bg-orange-200"
                            : "bg-yellow-200"
                        )}
                      />
                      <span className="relative z-10 text-xs font-semibold text-gray-700">
                        {format(day, "d")}
                      </span>
                    </div>
                  ) : (
                    <div className={getDayCircleClass(status, isCurrentDay)}>
                      {format(day, "d")}
                      {status === "holiday" && (
                        <span className="absolute -top-1.5 -right-1 text-[8px] font-bold text-blue-600 bg-white border border-blue-200 rounded px-0.5 leading-none">
                          {dayData?.isOptional ? "RH" : "H"}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </DialogTrigger>

              {/* Day detail dialog */}
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{format(day, "PPP")}</DialogTitle>
                  <DialogDescription asChild>
                    <div className="text-sm mt-2 space-y-1">
                      {status ? (
                        <>
                          <p>
                            <strong>Status:</strong> {status}
                          </p>
                          {dayData?.inTime && (
                            <p>
                              <strong>In Time:</strong> {dayData.inTime}
                            </p>
                          )}
                          {dayData?.outTime && (
                            <p>
                              <strong>Out Time:</strong> {dayData.outTime}
                            </p>
                          )}
                          {status === "holiday" && (
                            <p>
                              <strong>Holiday Type:</strong>{" "}
                              {dayData?.isOptional
                                ? "Restricted Holiday (RH)"
                                : "General Holiday (H)"}
                            </p>
                          )}
                          {dayData?.holidayName && (
                            <p>
                              <strong>Holiday Name:</strong>{" "}
                              {dayData.holidayName}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-muted-foreground">
                          No data available.
                        </p>
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
      <div className="grid grid-cols-3 gap-x-2 gap-y-2 mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
          <span>Present</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500 shrink-0" />
          <span>Absent</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-orange-400 overflow-hidden shrink-0">
            <div className="w-1/2 h-full bg-orange-200" />
          </div>
          <span>Half-Day</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-yellow-500 shrink-0" />
          <span>Leave</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full border-2 border-yellow-400 overflow-hidden shrink-0">
            <div className="w-1/2 h-full bg-yellow-200" />
          </div>
          <span>Half-Leave</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-gray-300 shrink-0" />
          <span>Pending</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-blue-400 shrink-0" />
          <span>Holiday</span>
        </div>
      </div>
    </div>
  );
}
