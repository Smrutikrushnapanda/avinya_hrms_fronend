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
import { Button } from "@/components/ui/button";
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
  isOptional?: boolean; // ✅ NEW field
}

interface AttendanceCalendarProps {
  currentMonth: Date;
  setCurrentMonth: (date: Date) => void;
  statusByDate: Record<string, AttendanceStatus>;
}

const STATUS_COLORS: Record<string, string> = {
  present: "bg-green-500",
  absent: "bg-red-500",
  pending: "bg-gray-400",
  leave: "bg-yellow-500",
};

const HALF_STATUS_BACKGROUND: Record<AttendanceStatus["status"], string> = {
  "half-day": "bg-red-200 border-red-500",
  "half-leave": "bg-yellow-200 border-yellow-500",
  present: "",
  absent: "",
  leave: "",
  pending: "",
  holiday: "",
};

const HALF_STATUS_FOREGROUND: Record<AttendanceStatus["status"], string> = {
  "half-day": "bg-red-500",
  "half-leave": "bg-yellow-500",
  present: "",
  absent: "",
  leave: "",
  pending: "",
  holiday: "",
};

export default function AttendanceCalendar({
  currentMonth,
  setCurrentMonth,
  statusByDate,
}: AttendanceCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 });

  const calendarDays = useMemo(() => {
    const days = [];
    let day = start;
    while (day <= end) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [start, end]);

  const renderCells = () =>
    calendarDays.map((day, index) => {
      const dateKey = format(day, "yyyy-MM-dd");
      const dayData = statusByDate[dateKey];
      const status = dayData?.status;
      const holidayName = dayData?.holidayName;
      const inTime = dayData?.inTime;
      const outTime = dayData?.outTime;
      const isOptional = dayData?.isOptional;

      const isCurrentMonth = isSameMonth(day, currentMonth);
      const isCurrentDay = isToday(day);
      const isHalfStatus = status === "half-day" || status === "half-leave";

      const tooltip = holidayName
        ? holidayName
        : inTime && outTime
        ? `In: ${inTime}, Out: ${outTime}`
        : status;

      return (
        <Dialog key={index}>
          <DialogTrigger asChild>
            <div
              className={cn(
                "aspect-square p-1 border rounded-lg relative text-xs flex flex-col justify-between cursor-pointer",
                !isCurrentMonth && "text-gray-400",
                isCurrentDay && "border-2 border-blue-500"
              )}
              title={tooltip}
              onClick={() => setSelectedDate(dateKey)}
            >
              {/* Date */}
              <div className="absolute top-1 left-1 font-semibold text-[14px]">
                {format(day, "d")}
              </div>

              {/* Status Indicator */}
              {status === "holiday" ? (
                <span className="absolute top-1 right-1 text-blue-600 text-sm font-bold">
                  {isOptional ? "RH" : "H"}
                </span>
              ) : isHalfStatus ? (
                <div
                  className={cn(
                    "absolute top-1 right-1 w-4 h-4 rounded-full border overflow-hidden",
                    HALF_STATUS_BACKGROUND[status]
                  )}
                >
                  <div
                    className={cn(
                      "absolute top-0 left-0 w-1/2 h-full",
                      HALF_STATUS_FOREGROUND[status]
                    )}
                  />
                </div>
              ) : status && STATUS_COLORS[status] ? (
                <div
                  className={cn(
                    "absolute top-1 right-1 w-4 h-4 rounded-full",
                    STATUS_COLORS[status]
                  )}
                />
              ) : null}

              {/* In/Out Times */}
              <div className="mt-auto font-semibold text-[10px] text-muted-foreground leading-tight">
                {inTime && <div>In: {inTime}</div>}
                {outTime && <div>Out: {outTime}</div>}
              </div>
            </div>
          </DialogTrigger>

          {/* Modal Dialog Content */}
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{format(day, "PPP")}</DialogTitle>
              <DialogDescription>
                {status ? (
                  <div className="text-sm mt-2 space-y-1">
                    <p>
                      <strong>Status:</strong> {status}
                    </p>
                    {inTime && (
                      <p>
                        <strong>In Time:</strong> {inTime}
                      </p>
                    )}
                    {outTime && (
                      <p>
                        <strong>Out Time:</strong> {outTime}
                      </p>
                    )}
                    {status === "holiday" && (
                      <p>
                        <strong>Holiday Type:</strong>{" "}
                        {isOptional
                          ? "Restricted Holiday (RH)"
                          : "General Holiday (H)"}
                      </p>
                    )}
                    {holidayName && (
                      <p>
                        <strong>Holiday Name:</strong> {holidayName}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm mt-2 text-muted-foreground">
                    No data available.
                  </p>
                )}
              </DialogDescription>
            </DialogHeader>
          </DialogContent>
        </Dialog>
      );
    });

  return (
    <div>
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft />
        </Button>
        <h2 className="text-lg font-semibold">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight />
        </Button>
      </div>

      {/* Weekday Labels */}
      <div className="grid grid-cols-7 gap-2 mb-2 text-center text-sm font-medium text-muted-foreground">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2">{renderCells()}</div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 text-sm text-muted-foreground mt-4">
        <LegendDot className="bg-green-500" label="Present" />
        <LegendDot className="bg-red-500" label="Absent" />
        <LegendHalfDot
          bg="bg-red-200 border-red-500"
          fg="bg-red-500"
          label="Half-Day"
        />
        <LegendDot className="bg-yellow-500" label="Leave" />
        <LegendHalfDot
          bg="bg-yellow-200 border-yellow-500"
          fg="bg-yellow-500"
          label="Half-Leave"
        />
        <LegendDot className="bg-gray-400" label="Pending" />
        <div className="flex items-center gap-2 text-blue-600">
          <span className="font-bold text-sm">H</span>
          <span>Holiday</span>
        </div>
        <div className="flex items-center gap-2 text-blue-600">
          <span className="font-bold text-sm">RH</span>
          <span>Restricted Holiday</span>
        </div>
      </div>
    </div>
  );
}

// Legend Components
function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className={cn("w-4 h-4 rounded-full", className)} />
      <span>{label}</span>
    </div>
  );
}

function LegendHalfDot({
  bg,
  fg,
  label,
}: {
  bg: string;
  fg: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "relative w-4 h-4 rounded-full overflow-hidden border",
          bg
        )}
      >
        <div className={cn("absolute top-0 left-0 w-1/2 h-full", fg)} />
      </div>
      <span>{label}</span>
    </div>
  );
}
