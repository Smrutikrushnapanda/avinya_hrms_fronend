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
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getProfile, getMonthlyAttendance } from "@/app/api/api";
import MobileTabHeader from "../components/MobileTabHeader";
import { MobileCard } from "../components/MobileCard";
import { StaggerReveal, StaggerItem, SpringNumber } from "../components/animation-wrappers";
import { MobileSkeleton } from "../components/MobileSkeleton";
import { MobileEmptyState } from "../components/MobileEmptyState";

interface AttendanceItem {
  date: string;
  status: string;
  inTime: string;
  outTime: string;
  isSunday: boolean;
  isHoliday: boolean;
  holidayName?: string;
}

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function getBadgeProps(status: string, isSunday: boolean, isHoliday: boolean) {
  if (isHoliday) return { color: "var(--primary)", text: "Holiday" };
  if (isSunday) return { color: "var(--primary)", text: "Sunday" };
  switch (status?.toLowerCase()) {
    case "present": return { color: "#10B981", text: "Present" };
    case "absent": return { color: "#EF4444", text: "Absent" };
    case "late": return { color: "#F59E0B", text: "Late" };
    case "halfday":
    case "half_day":
    case "half-day": return { color: "#F97316", text: "Half Day" };
    case "holiday": return { color: "var(--primary)", text: "Holiday" };
    case "on-leave":
    case "leave": return { color: "#3B82F6", text: "On Leave" };
    case "work-from-home":
    case "wfh": return { color: "#06B6D4", text: "WFH" };
    case "weekend": return { color: "var(--primary)", text: "Weekend" };
    default: return { color: "#F59E0B", text: status || "Pending" };
  }
}

function getIconConfig(status: string, isSunday: boolean, isHoliday: boolean) {
  if (isHoliday) return { icon: Gift, color: "var(--primary)", bg: "var(--primary-8, rgba(29,78,211,0.08))" };
  if (isSunday) return { icon: Sun, color: "var(--primary)", bg: "var(--primary-8, rgba(29,78,211,0.08))" };
  switch (status?.toLowerCase()) {
    case "present": return { icon: CheckCircle, color: "#10B981", bg: "#ECFDF5" };
    case "absent": return { icon: XCircle, color: "#EF4444", bg: "#FEF2F2" };
    case "late": return { icon: Timer, color: "#F59E0B", bg: "#FFFBEB" };
    case "halfday":
    case "half_day":
    case "half-day": return { icon: Clock, color: "#F97316", bg: "#FFF7ED" };
    case "holiday": return { icon: Gift, color: "var(--primary)", bg: "var(--primary-8, rgba(29,78,211,0.08))" };
    case "on-leave":
    case "leave": return { icon: HourglassIcon, color: "#3B82F6", bg: "#EFF6FF" };
    case "weekend": return { icon: Sun, color: "var(--primary)", bg: "var(--primary-8, rgba(29,78,211,0.08))" };
    default: return { icon: HelpCircle, color: "#F59E0B", bg: "#FFFBEB" };
  }
}

function formatDisplayDate(dateStr: string): string {
  try {
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  } catch { return dateStr; }
}

export default function WebAttendancePage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(currentDate.getFullYear());
  const [displayCount, setDisplayCount] = useState(10);
  const [userId, setUserId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [attendanceData, setAttendanceData] = useState<AttendanceItem[]>([]);
  const [totalWorkingDays, setTotalWorkingDays] = useState(0);
  const [employeeWorkingDays, setEmployeeWorkingDays] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const attendancePercentage = totalWorkingDays ? ((employeeWorkingDays / totalWorkingDays) * 100).toFixed(1) : "0.0";

  const fetchMonthlyAttendance = useCallback(
    async (orgId: string, uid: string, month: number, year: number) => {
      setIsRefreshing(true);
      try {
        const res = await getMonthlyAttendance({ organizationId: orgId, userId: uid, month, year });
        const raw: any[] = res.data?.attendance ?? res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
        const today = new Date(); today.setHours(23, 59, 59, 999);
        const filtered = raw.filter((r) => {
          const dateStr: string = r.attendanceDate ?? r.date ?? "";
          if (!dateStr) return false;
          const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
          return new Date(y, m - 1, d) <= today;
        });
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
            inTime: record.inTime ?? "--",
            outTime: record.outTime ?? "--",
            isSunday: isWeekend,
            isHoliday,
            holidayName: record.holidayName,
          };
        });
        setAttendanceData(items);
        setDisplayCount(10);
        const workingDays = filtered.filter((r) => !["weekend", "holiday"].includes(r.status?.toLowerCase() ?? "")).length;
        const workedDays = filtered.filter((r) => ["present", "late", "half-day", "half_day"].includes(r.status?.toLowerCase() ?? "")).length;
        setTotalWorkingDays(workingDays);
        setEmployeeWorkingDays(workedDays);
      } catch (e) {
        console.error("Failed to fetch monthly attendance:", e);
        setAttendanceData([]);
        setTotalWorkingDays(0);
        setEmployeeWorkingDays(0);
      } finally { setIsRefreshing(false); }
    },
    [],
  );

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
        if (orgId && uid) await fetchMonthlyAttendance(orgId, uid, selectedMonth, selectedYear);
      } catch (e) { console.error(e); }
      finally { setIsLoading(false); }
    };
    init();
  }, []);

  useEffect(() => {
    if (organizationId && userId) fetchMonthlyAttendance(organizationId, userId, selectedMonth, selectedYear);
  }, [selectedMonth, selectedYear, organizationId, userId, fetchMonthlyAttendance]);

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileTabHeader title="Attendance" />
        <MobileSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MobileTabHeader title="Attendance" />

      <div className="px-4 mt-4 relative z-10 pb-8 space-y-4">
        <MobileCard className="relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 to-primary/10" />
          <div className="flex items-center justify-around py-2">
            <div className="flex flex-col items-center flex-1">
              <div className="w-[60px] h-[60px] rounded-full bg-primary border-2 border-primary/30 flex items-center justify-center mb-2">
                <span className="text-primary-foreground text-sm font-semibold">{attendancePercentage}%</span>
              </div>
              <span className="text-[13px] font-medium text-muted-foreground text-center">Attendance Rate</span>
            </div>
            <div className="w-px h-[50px] bg-border mx-4" />
            <div className="flex flex-col items-center flex-1">
              <span className="text-[28px] font-bold text-foreground tabular-nums">
                <SpringNumber value={totalWorkingDays} />
              </span>
              <span className="text-[13px] font-medium text-muted-foreground text-center">Working Days</span>
            </div>
            <div className="w-px h-[50px] bg-border mx-4" />
            <div className="flex flex-col items-center flex-1">
              <span className="text-[28px] font-bold text-emerald-600 tabular-nums">
                <SpringNumber value={employeeWorkingDays} />
              </span>
              <span className="text-[13px] font-medium text-muted-foreground text-center">Worked Days</span>
            </div>
          </div>
        </MobileCard>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-extrabold text-foreground">Attendance Details</h2>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleMonthPicker}
              className="flex items-center gap-1.5 bg-primary/8 border border-primary/30 rounded-full px-3 py-2"
            >
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-[13px] font-medium text-primary">
                {monthNames[selectedMonth - 1]} {selectedYear}
              </span>
              <ChevronDown className={`w-3 h-3 text-primary transition-transform duration-300 ${showMonthPicker ? "rotate-180" : ""}`} />
            </motion.button>
          </div>

          <AnimatePresence>
            {showMonthPicker && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 100, damping: 22 }}
                className="overflow-hidden"
              >
                <MobileCard className="mb-3 space-y-3">
                  <p className="text-[15px] font-bold text-foreground">Year</p>
                  <div className="flex flex-wrap gap-2">
                    {generateYears().map((year) => {
                      const isActive = year === pickerYear;
                      return (
                        <motion.button
                          key={year}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => setPickerYear(year)}
                          className={`flex items-center gap-2 px-3 py-2.5 rounded-xl flex-1 min-w-[120px] ${isActive ? "bg-primary" : "bg-muted"}`}
                        >
                          <div className={`w-[30px] h-[30px] rounded-full flex items-center justify-center ${isActive ? "bg-white/20" : "bg-primary/10"}`}>
                            <Calendar className={`w-4 h-4 ${isActive ? "text-primary-foreground" : "text-primary"}`} />
                          </div>
                          <span className={`text-sm font-semibold ${isActive ? "text-primary-foreground" : "text-foreground"}`}>{year}</span>
                        </motion.button>
                      );
                    })}
                  </div>
                  <p className="text-[15px] font-bold text-foreground">Month</p>
                  <div className="grid grid-cols-4 gap-2">
                    {monthNames.map((monthName, index) => {
                      const monthNumber = index + 1;
                      const isFutureMonth = pickerYear > currentDate.getFullYear() || (pickerYear === currentDate.getFullYear() && monthNumber > currentDate.getMonth() + 1);
                      const isSelected = selectedMonth === monthNumber && selectedYear === pickerYear;
                      return (
                        <button
                          key={`${pickerYear}-${monthNumber}`}
                          onClick={() => !isFutureMonth && handleMonthSelect(monthNumber)}
                          disabled={isFutureMonth}
                          className={`py-3 rounded-[10px] text-[13px] font-semibold text-center ${
                            isSelected ? "bg-primary text-primary-foreground font-bold" :
                            isFutureMonth ? "bg-muted text-muted-foreground/40 cursor-not-allowed" : "bg-muted text-foreground"
                          }`}
                        >
                          {monthName.substring(0, 3)}
                        </button>
                      );
                    })}
                  </div>
                </MobileCard>
              </motion.div>
            )}
          </AnimatePresence>

          {isRefreshing && (
            <div className="flex items-center justify-center gap-2 py-2 text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Updating...</span>
            </div>
          )}

          {!isRefreshing && attendanceData.length === 0 ? (
            <MobileEmptyState
              icon={<HelpCircle size={24} />}
              title="No attendance records"
              description="No attendance records for this month."
            />
          ) : (
            <StaggerReveal className="space-y-3" staggerDelay={0.04}>
              {displayedItems.map((item, index) => {
                const { color: badgeColor, text: badgeText } = getBadgeProps(item.status, item.isSunday, item.isHoliday);
                const { icon: Icon, color: iconColor, bg: iconBg } = getIconConfig(item.status, item.isSunday, item.isHoliday);

                return (
                  <StaggerItem key={index}>
                    <MobileCard className="relative overflow-hidden" padded={false}>
                      <div className="absolute top-0 right-0 px-2.5 py-0.5 rounded-bl-xl rounded-tr-xl text-primary-foreground text-xs font-semibold"
                        style={{ backgroundColor: badgeColor }}>
                        {badgeText}
                      </div>
                      <div className="p-3.5">
                        <div className="flex items-center mb-2">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2.5" style={{ backgroundColor: iconBg }}>
                            <Icon className="w-4 h-4" style={{ color: iconColor }} />
                          </div>
                          <div>
                            <span className="text-sm font-semibold" style={{ color: iconColor }}>{item.date}</span>
                            {item.holidayName && <span className="ml-2 text-xs text-muted-foreground">({item.holidayName})</span>}
                          </div>
                        </div>
                        {!item.isSunday && !item.isHoliday && (
                          <div className="border-t border-border pt-2">
                            <div className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-[13px] text-foreground ml-1.5 mr-3">Punch In: {item.inTime}</span>
                              <div className="w-px h-3.5 bg-border mx-2" />
                              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                              <span className="text-[13px] text-foreground ml-1.5">Last Punch: {item.outTime}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </MobileCard>
                  </StaggerItem>
                );
              })}
            </StaggerReveal>
          )}

          {hasMoreData && !isRefreshing && (
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => setDisplayCount((prev) => prev + 10)}
              className="w-full mt-3 py-3 bg-primary/8 rounded-xl flex items-center justify-center gap-2 text-primary text-sm font-semibold"
            >
              <ChevronDown className="w-4 h-4" />
              Load More
            </motion.button>
          )}

          {!hasMoreData && displayedItems.length > 0 && !isRefreshing && (
            <p className="text-center text-muted-foreground text-sm italic py-5">
              You&apos;ve reached the end of your attendance records
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
