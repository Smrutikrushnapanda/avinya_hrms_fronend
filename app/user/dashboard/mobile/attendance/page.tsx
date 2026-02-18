"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  ChevronDown,
  Clock,
  CheckCircle,
  XCircle,
  Gift,
  Sun,
  Timer,
  HourglassIcon,
  HelpCircle,
  Bell,
  Loader2,
} from "lucide-react";
import { getProfile, getMonthlyAttendance } from "@/app/api/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceItem {
  date: string;          // "Mon, Feb 17, 2026"
  status: string;        // "present" | "absent" | "late" | etc.
  inTime: string;        // "09:05 AM" or "--"
  outTime: string;       // "06:12 PM" or "--"
  isSunday: boolean;
  isHoliday: boolean;
  holidayName?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getBadgeProps(status: string, isSunday: boolean, isHoliday: boolean) {
  if (isHoliday) return { color: "#9C27B0", text: "Holiday" };
  if (isSunday) return { color: "#026D94", text: "Sunday" };

  switch (status?.toLowerCase()) {
    case "present": return { color: "#00C851", text: "Present" };
    case "absent": return { color: "#FF4444", text: "Absent" };
    case "late": return { color: "#FFBB33", text: "Late" };
    case "halfday":
    case "half_day":
    case "half-day": return { color: "#e67b00", text: "Half Day" };
    case "holiday": return { color: "#9C27B0", text: "Holiday" };
    case "on-leave":
    case "leave": return { color: "#2196F3", text: "On Leave" };
    case "work-from-home":
    case "wfh": return { color: "#00BCD4", text: "WFH" };
    case "weekend": return { color: "#026D94", text: "Weekend" };
    default: return { color: "#FFA500", text: status || "Pending" };
  }
}

function getIconConfig(status: string, isSunday: boolean, isHoliday: boolean) {
  if (isHoliday) return { icon: Gift, color: "#9C27B0", bg: "#F3E5F5" };
  if (isSunday) return { icon: Sun, color: "#026D94", bg: "#E1F4FF" };

  switch (status?.toLowerCase()) {
    case "present": return { icon: CheckCircle, color: "#00C851", bg: "#E8F5E8" };
    case "absent": return { icon: XCircle, color: "#FF4444", bg: "#FFE6E6" };
    case "late": return { icon: Timer, color: "#FFBB33", bg: "#FFF4E0" };
    case "halfday":
    case "half_day":
    case "half-day": return { icon: Clock, color: "#e67b00", bg: "#FFF0E6" };
    case "holiday": return { icon: Gift, color: "#9C27B0", bg: "#F3E5F5" };
    case "on-leave":
    case "leave": return { icon: HourglassIcon, color: "#2196F3", bg: "#E3F2FD" };
    case "weekend": return { icon: Sun, color: "#026D94", bg: "#E1F4FF" };
    default: return { icon: HelpCircle, color: "#FFA500", bg: "#FFF4E0" };
  }
}

function formatDisplayDate(dateStr: string): string {
  try {
    // Use local date parsing to avoid UTC offset shifting the date
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function formatTime12h(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "--";
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WebAttendancePage() {
  const currentDate = new Date();

  // Month/year selection state
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const [displayCount, setDisplayCount] = useState(10);

  // Data state
  const [userId, setUserId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [attendanceData, setAttendanceData] = useState<AttendanceItem[]>([]);
  const [totalWorkingDays, setTotalWorkingDays] = useState(0);
  const [employeeWorkingDays, setEmployeeWorkingDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const attendancePercentage = totalWorkingDays
    ? ((employeeWorkingDays / totalWorkingDays) * 100).toFixed(1)
    : "0.0";

  // ── Fetch monthly attendance
  const fetchMonthlyAttendance = useCallback(
    async (orgId: string, uid: string, month: number, year: number) => {
      setIsRefreshing(true);
      try {
        const res = await getMonthlyAttendance({
          organizationId: orgId,
          userId: uid,
          month,
          year,
        });

        const raw: any[] =
          res.data?.attendance ??
          res.data?.data ??
          (Array.isArray(res.data) ? res.data : []);

        // Exclude future dates
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const filtered = raw.filter((r) => {
          const dateStr: string = r.attendanceDate ?? r.date ?? "";
          if (!dateStr) return false;
          const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
          return new Date(y, m - 1, d) <= today;
        });

        // Sort descending by date (newest first)
        const sorted = [...filtered].sort((a, b) => {
          const da = new Date(a.attendanceDate ?? a.date ?? 0).getTime();
          const db = new Date(b.attendanceDate ?? b.date ?? 0).getTime();
          return db - da;
        });

        const items: AttendanceItem[] = sorted.map((record) => {
          const dateStr: string = record.attendanceDate ?? record.date ?? "";
          const status: string = record.status ?? "";
          const isWeekend = status === "weekend";
          const isHoliday = status === "holiday";

          return {
            date: dateStr ? formatDisplayDate(dateStr) : "--",
            status,
            inTime: record.inTime ? formatTime12h(record.inTime) : "--",
            outTime: record.outTime ? formatTime12h(record.outTime) : "--",
            isSunday: isWeekend,
            isHoliday,
            holidayName: record.holidayName,
          };
        });

        setAttendanceData(items);
        setDisplayCount(10); // reset pagination on month change

        // Stats: only count non-weekend, non-holiday days (from filtered data)
        const workingDays = filtered.filter(
          (r) => !["weekend", "holiday"].includes(r.status?.toLowerCase() ?? "")
        ).length;
        const workedDays = filtered.filter((r) =>
          ["present", "late", "half-day", "half_day"].includes(r.status?.toLowerCase() ?? "")
        ).length;
        setTotalWorkingDays(workingDays);
        setEmployeeWorkingDays(workedDays);
      } catch (e) {
        console.error("Failed to fetch monthly attendance:", e);
        setAttendanceData([]);
        setTotalWorkingDays(0);
        setEmployeeWorkingDays(0);
      } finally {
        setIsRefreshing(false);
      }
    },
    []
  );

  // ── Initial load: fetch profile → then attendance
  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      try {
        const profileRes = await getProfile();
        const data = profileRes.data;
        const orgId: string = data?.organizationId ?? "";
        const uid: string = data?.id ?? data?.userId ?? "";
        setOrganizationId(orgId);
        setUserId(uid);

        if (orgId && uid) {
          await fetchMonthlyAttendance(orgId, uid, selectedMonth, selectedYear);
        }
      } catch (e) {
        console.error("Failed to load attendance page:", e);
      } finally {
        setIsLoading(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-fetch when month/year selection changes
  useEffect(() => {
    if (organizationId && userId) {
      fetchMonthlyAttendance(organizationId, userId, selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear, organizationId, userId, fetchMonthlyAttendance]);

  // ── Month picker helpers
  const generateYears = () => {
    const cy = currentDate.getFullYear();
    const years: number[] = [];
    for (let y = cy; y >= cy - 3; y--) years.push(y);
    if (!years.includes(selectedYear)) years.unshift(selectedYear);
    return years;
  };

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month);
    setSelectedYear(pickerYear);
    setShowMonthPicker(false);
  };

  const toggleMonthPicker = () => {
    if (!showMonthPicker) setPickerYear(selectedYear);
    setShowMonthPicker(!showMonthPicker);
  };

  const displayedItems = attendanceData.slice(0, displayCount);
  const hasMoreData = displayCount < attendanceData.length;

  // ─── Loading state ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-gray-400">
          <Loader2 className="w-8 h-8 animate-spin text-[#026D94]" />
          <p className="text-sm">Loading attendance…</p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white">
      {/* ── HEADER ── */}
      <div className="bg-[#005F90] text-white px-4 pt-5 pb-16 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-white/20 rounded-full px-4 py-2">
            <h2 className="text-xl font-bold">Attendance</h2>
          </div>
        </div>
        <Bell className="w-5 h-5" />
      </div>

      {/* ── CONTENT ── */}
      <div className="px-5 -mt-12 relative z-10 pb-8">

        {/* ── STATS CARD ── */}
        <div className="bg-white rounded-[20px] p-6 shadow-md border border-[#E8ECEF] relative overflow-hidden">
          {/* Decorative triangles */}
          <div className="absolute top-[10px] left-[10px] w-0 h-0 border-l-[0px] border-r-[60px] border-t-[60px] border-l-transparent border-r-transparent border-t-[#E1F4FF]" />
          <div className="absolute bottom-[10px] right-[10px] w-0 h-0 border-l-[0px] border-r-[60px] border-t-[60px] border-l-transparent border-r-transparent border-t-[#E1F4FF] rotate-180" />
          <div className="absolute bottom-[10px] left-[10px] w-0 h-0 border-l-[0px] border-r-[60px] border-t-[60px] border-l-transparent border-r-transparent border-t-[#E1F4FF] -rotate-90" />
          <div className="absolute top-[10px] right-[10px] w-0 h-0 border-l-[0px] border-r-[60px] border-t-[60px] border-l-transparent border-r-transparent border-t-[#E1F4FF] rotate-90" />

          <div className="flex items-center justify-around py-2 relative z-10">
            {/* Attendance Rate */}
            <div className="flex flex-col items-center flex-1">
              <div className="w-[60px] h-[60px] rounded-full bg-[#035F91] border-2 border-[#026D94] flex items-center justify-center mb-2">
                <span className="text-white text-sm font-semibold">{attendancePercentage}%</span>
              </div>
              <span className="text-[13px] font-medium text-gray-700 text-center">
                Attendance Rate
              </span>
            </div>

            <div className="w-[1px] h-[50px] bg-[#E8ECEF] mx-4" />

            {/* Total Working Days */}
            <div className="flex flex-col items-center flex-1">
              <span className="text-[28px] font-bold text-[#035F91] mb-2">{totalWorkingDays}</span>
              <span className="text-[13px] font-medium text-gray-700 text-center">
                Total Working Days
              </span>
            </div>

            <div className="w-[1px] h-[50px] bg-[#E8ECEF] mx-4" />

            {/* Total Worked Days */}
            <div className="flex flex-col items-center flex-1">
              <span className="text-[28px] font-bold text-[#00C851] mb-2">{employeeWorkingDays}</span>
              <span className="text-[13px] font-medium text-gray-700 text-center">
                Total Worked Days
              </span>
            </div>
          </div>
        </div>

        {/* ── ATTENDANCE DETAILS SECTION ── */}
        <div className="mt-5">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold text-gray-900">Attendance Details</h2>
            <button
              onClick={toggleMonthPicker}
              className="flex items-center gap-1.5 bg-[#E1F4FF] border border-[#035F91] rounded-full px-3 py-2"
            >
              <Calendar className="w-4 h-4 text-[#035F91]" />
              <span className="text-[13px] font-medium text-[#035F91]">
                {monthNames[selectedMonth - 1]} {selectedYear}
              </span>
              <ChevronDown
                className={`w-3 h-3 text-[#035F91] transition-transform duration-300 ${
                  showMonthPicker ? "rotate-180" : ""
                }`}
              />
            </button>
          </div>

          {/* Inline Month Picker */}
          {showMonthPicker && (
            <div className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-[#E8ECEF]">
              <p className="text-[15px] font-bold text-gray-900 mb-2.5">Year</p>
              <div className="flex flex-wrap gap-2 mb-4">
                {generateYears().map((year) => {
                  const isActive = year === pickerYear;
                  return (
                    <button
                      key={year}
                      onClick={() => setPickerYear(year)}
                      className={`flex items-center gap-2 px-3 py-2.5 rounded-xl flex-1 min-w-[120px] ${
                        isActive ? "bg-[#026D94]" : "bg-gray-50"
                      }`}
                    >
                      <div
                        className={`w-[30px] h-[30px] rounded-full flex items-center justify-center ${
                          isActive ? "bg-white/20" : "bg-[#035F91]/10"
                        }`}
                      >
                        <Calendar className={`w-4 h-4 ${isActive ? "text-white" : "text-[#035F91]"}`} />
                      </div>
                      <span className={`text-sm font-semibold ${isActive ? "text-white" : "text-gray-900"}`}>
                        {year}
                      </span>
                    </button>
                  );
                })}
              </div>

              <p className="text-[15px] font-bold text-gray-900 mb-2.5">Month</p>
              <div className="grid grid-cols-4 gap-2">
                {monthNames.map((monthName, index) => {
                  const monthNumber = index + 1;
                  const isFutureMonth =
                    pickerYear > currentDate.getFullYear() ||
                    (pickerYear === currentDate.getFullYear() &&
                      monthNumber > currentDate.getMonth() + 1);
                  const isSelected =
                    selectedMonth === monthNumber && selectedYear === pickerYear;

                  return (
                    <button
                      key={`${pickerYear}-${monthNumber}`}
                      onClick={() => !isFutureMonth && handleMonthSelect(monthNumber)}
                      disabled={isFutureMonth}
                      className={`py-3 rounded-[10px] text-[13px] font-semibold text-center ${
                        isSelected
                          ? "bg-[#026D94] text-white font-bold"
                          : isFutureMonth
                          ? "bg-[#F2F2F2] text-[#999] cursor-not-allowed"
                          : "bg-gray-50 text-gray-900"
                      }`}
                    >
                      {monthName.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Refresh indicator */}
          {isRefreshing && (
            <div className="flex items-center justify-center gap-2 py-2 text-[#026D94]">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Updating…</span>
            </div>
          )}

          {/* ── ATTENDANCE CARDS ── */}
          {!isRefreshing && attendanceData.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <HelpCircle className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No attendance records for this month.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedItems.map((item, index) => {
                const { color: badgeColor, text: badgeText } = getBadgeProps(
                  item.status,
                  item.isSunday,
                  item.isHoliday
                );
                const { icon: Icon, color: iconColor, bg: iconBg } = getIconConfig(
                  item.status,
                  item.isSunday,
                  item.isHoliday
                );

                return (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-3 shadow-sm border-l-4 relative"
                    style={{ borderLeftColor: badgeColor }}
                  >
                    {/* Ribbon Badge */}
                    <div
                      className="absolute top-0 right-0 px-2.5 py-0.5 rounded-bl-lg rounded-tr-lg"
                      style={{ backgroundColor: badgeColor }}
                    >
                      <span className="text-white text-xs font-semibold">{badgeText}</span>
                    </div>

                    {/* Date Section */}
                    <div className="flex items-center mb-2">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center mr-2.5"
                        style={{ backgroundColor: iconBg }}
                      >
                        <Icon className="w-4 h-4" style={{ color: iconColor }} />
                      </div>
                      <div>
                        <span className="text-sm font-semibold" style={{ color: iconColor }}>
                          {item.date}
                        </span>
                        {item.holidayName && (
                          <span className="ml-2 text-xs text-purple-500">({item.holidayName})</span>
                        )}
                      </div>
                    </div>

                    {/* Time Section */}
                    {!item.isSunday && !item.isHoliday && (
                      <div className="border-t border-[#eee] pt-2">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-[#999]" />
                          <span className="text-[13px] text-[#333] ml-1.5 mr-3">
                            Punch In: {item.inTime}
                          </span>
                          <div className="w-[1px] h-3.5 bg-[#999] mx-2" />
                          <Clock className="w-3.5 h-3.5 text-[#999]" />
                          <span className="text-[13px] text-[#333] ml-1.5">
                            Last Punch: {item.outTime}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Load More */}
          {hasMoreData && !isRefreshing && (
            <button
              onClick={() => setDisplayCount((prev) => prev + 10)}
              className="w-full mt-3 py-3 bg-[#E1F4FF] rounded-lg flex items-center justify-center gap-2"
            >
              <ChevronDown className="w-4 h-4 text-[#026D94]" />
              <span className="text-[#026D94] text-sm font-semibold">Load More</span>
            </button>
          )}

          {/* End of List */}
          {!hasMoreData && displayedItems.length > 0 && !isRefreshing && (
            <p className="text-center text-[#999] text-sm italic py-5">
              You&apos;ve reached the end of your attendance records
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
