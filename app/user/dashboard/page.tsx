"use client";

import { useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  Palmtree,
  DollarSign,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  Clock,
  Trophy,
  CalendarDays,
  X,
} from "lucide-react";
import {
  Card,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import AttendanceDonutChart from "@/components/charts/AttendanceDonutChart";
import AttendanceStatus from "@/components/AttendanceStatus";
import {
  getProfile,
  getDashboardStats,
  getLeaveBalance,
  getEmployeeByUserId,
  getTodayLogs,
  getHolidays,
} from "@/app/api/api";

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

function getNumericValue(value: any): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'value' in value) return value.value;
  return 0;
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Approved:
      "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
    Declined:
      "bg-red-50 text-red-500 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
    Pending:
      "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  };
  return (
    <span
      className={`text-xs font-semibold px-3 py-1 rounded-full border ${map[status] ?? ""}`}
    >
      {status}
    </span>
  );
}

// ─── HOLIDAY CALENDAR WIDGET ──────────────────────────────────────────────────

function HolidayCalendarWidget({ holidays }: { holidays: Holiday[] }) {
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

  return (
    <div className="flex flex-col">
      <Calendar
        mode="single"
        month={month}
        onMonthChange={setMonth}
        modifiers={{ holiday: holidayDates }}
        modifiersClassNames={{
          holiday:
            "!bg-rose-100 !text-rose-600 dark:!bg-rose-900/40 dark:!text-rose-400 font-bold rounded-full ring-2 ring-rose-300 dark:ring-rose-700",
        }}
        onDayClick={handleDayClick}
        classNames={{
          root: "w-full",
          table: "w-full",
          today:
            "!bg-[#00BBA7] !text-white rounded-full font-bold shadow-[0_0_0_3px_rgba(0,187,167,0.25)] scale-110 transition-transform duration-200",
        }}
      />

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1 px-1">
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block" />
          Holiday
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: "#00BBA7" }} />
          Today
        </span>
      </div>

      {/* Holiday detail popup on date click */}
      {selectedHoliday && (
        <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="w-10 h-10 rounded-lg bg-rose-500 text-white flex flex-col items-center justify-center flex-shrink-0 text-center">
            <span className="text-[9px] font-medium leading-none">
              {normalizeDate(selectedHoliday.date!).toLocaleDateString("en-US", { month: "short" })}
            </span>
            <span className="text-sm font-extrabold leading-tight">
              {normalizeDate(selectedHoliday.date!).getDate()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">
              {selectedHoliday.name || "Holiday"}
            </p>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {selectedHoliday.isOptional ? "Restricted Holiday" : "General Holiday"}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-semibold text-rose-600 bg-rose-100 dark:bg-rose-900/50 px-2 py-1 rounded-full">
              {selectedHoliday.isOptional ? "RH" : "H"}
            </span>
            <button
              onClick={() => setSelectedHoliday(null)}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
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
  payrollDue?: any;
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
  time: string;
  date: string;
  title: string;
  topic: string;
  members: string[];
  colors: string[];
}

interface Award {
  id: string;
  name: string;
  dept: string;
  award: string;
  date: string;
  status: string;
  initials: string;
  avatarBg: string;
}

interface Holiday {
  id?: number;
  date?: string;
  name?: string;
  holidayType?: string;
  isOptional?: boolean;
}

export default function UserDashboardPage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [leaveBalances, setLeaveBalances] = useState<LeaveBalanceData[]>([]);
  const [loading, setLoading] = useState(true);
  const [employeeId, setEmployeeId] = useState<string>("");
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [hasPunchedInToday, setHasPunchedInToday] = useState(false);

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
        // First get the profile to get user ID
        const profileRes = await getProfile();
        const profile = profileRes.data;
        
        const resolvedUserId = profile.userId ?? profile.id;

        // Set user data from profile
        setUserData({
          id: resolvedUserId,
          firstName: profile.firstName,
          lastName: profile.lastName,
          userName: profile.userName,
          email: profile.email,
          organizationId: profile.organizationId,
        });

        // Get employee by user ID
        if (resolvedUserId) {
          try {
            const empResponse = await getEmployeeByUserId(resolvedUserId);
            if (empResponse.data) {
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
          } catch (todayLogError) {
            console.log("Today's attendance logs not available:", todayLogError);
            setHasPunchedInToday(false);
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
              let holidaysData = holidaysResponse.data;
              if (holidaysData.holidays) {
                setHolidays(holidaysData.holidays);
              } else if (Array.isArray(holidaysData)) {
                setHolidays(holidaysData);
              }
            }
          } catch (holidayError) {
            console.log("Holidays not available:", holidayError);
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getUserName = () => {
    if (userData?.firstName || userData?.lastName) {
      return `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
    }
    return userData?.userName || "User";
  };

  // Get values from stats (handles both number and object formats)
  const totalEmployees = getNumericValue(stats?.totalEmployees);
  const presentToday = getNumericValue(stats?.presentToday);
  const onLeave = getNumericValue(stats?.onLeaveToday);

  // Stat cards
  const statCards = [
    {
      label: "Total Employees",
      value: totalEmployees.toString(),
      badge: "+4.2%",
      up: true,
      icon: Users,
      accent: "text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/20",
    },
    {
      label: "Present Today",
      value: presentToday.toString(),
      badge: "+2.1%",
      up: true,
      icon: UserCheck,
      accent: "text-rose-400 bg-rose-400/10 dark:bg-rose-400/20",
    },
    {
      label: "On Leave",
      value: onLeave.toString(),
      badge: "-1.5%",
      up: false,
      icon: Palmtree,
      accent: "text-teal-500 bg-teal-500/10 dark:bg-teal-500/20",
    },
    {
      label: "Payroll Due",
      value: "$0",
      badge: "+0.8%",
      up: true,
      icon: DollarSign,
      accent: "text-amber-500 bg-amber-500/10 dark:bg-amber-500/20",
    },
  ];

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

  // Sample meetings
  const meetings: Meeting[] = [
    {
      time: "2:00 – 4:30",
      date: "22 Aug",
      title: "Q1 Strategy Planning",
      topic: "Product roadmap alignment",
      members: ["A", "B", "C"],
      colors: ["#7c6cff", "#e87e8e", "#5cc8a8"],
    },
    {
      time: "6:00 – 7:30",
      date: "22 Aug",
      title: "Design Review",
      topic: "UX team sync & feedback",
      members: ["D", "E"],
      colors: ["#e8b86c", "#6cb8e8"],
    },
    {
      time: "9:00 – 10:00",
      date: "23 Aug",
      title: "Client Presentation",
      topic: "Acme Corp live demo",
      members: ["F", "G", "H"],
      colors: ["#5cc8a8", "#e87e8e", "#7c6cff"],
    },
  ];

  // Sample awards
  const awards: Award[] = [
    {
      id: "01",
      name: "Jonathan I. Sheikh",
      dept: "Production",
      award: "Coby Beach",
      date: "30-11-2023",
      status: "Approved",
      initials: "JI",
      avatarBg: "bg-indigo-500/15 text-indigo-600 dark:bg-indigo-500/25 dark:text-indigo-400",
    },
    {
      id: "02",
      name: "Maisha Lucy",
      dept: "Electrical",
      award: "Best Employee",
      date: "01-06-2024",
      status: "Declined",
      initials: "ML",
      avatarBg: "bg-teal-500/15 text-teal-600 dark:bg-teal-500/25 dark:text-teal-400",
    },
    {
      id: "03",
      name: "Alex Rodriguez",
      dept: "Engineering",
      award: "Innovation Star",
      date: "15-08-2024",
      status: "Pending",
      initials: "AR",
      avatarBg: "bg-amber-500/15 text-amber-600 dark:bg-amber-500/25 dark:text-amber-400",
    },
    {
      id: "04",
      name: "Sarah Chen",
      dept: "Design",
      award: "Team Leader",
      date: "22-09-2024",
      status: "Approved",
      initials: "SC",
      avatarBg: "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/25 dark:text-emerald-400",
    },
  ];

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
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight leading-tight">
            {getUserName()}
          </h1>
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card
              key={card.label}
              className="p-5 hover:-translate-y-1 transition-transform duration-200 cursor-pointer relative overflow-hidden"
            >
              <div className={`w-11 h-11 rounded-xl ${card.accent} flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-2xl font-extrabold text-foreground tracking-tight">
                {card.value}
              </p>
              <p className="text-xs text-muted-foreground font-medium mt-0.5">
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
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* ATTENDANCE DONUT */}
        <Card className="p-5">
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
        <Card className="p-5">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Holiday Calendar
              </h2>
              <p className="text-xs text-muted-foreground">
                Click a highlighted date to see details
              </p>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-rose-500" />
            </div>
          </div>
          <HolidayCalendarWidget holidays={holidays} />
        </Card>

        {/* UPCOMING MEETINGS */}
        <Card className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Upcoming Meetings
              </h2>
              <p className="text-xs text-muted-foreground">
                Today&apos;s schedule
              </p>
            </div>
            <button className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-lg hover:bg-primary/15 transition-colors">
              Show All
            </button>
          </div>
          <div className="space-y-3">
            {meetings.map((m, i) => (
              <div
                key={i}
                className="flex gap-3 p-3 rounded-xl bg-muted/50 border border-transparent hover:border-primary/20 hover:bg-primary/5 transition-all cursor-pointer"
              >
                <div className="flex flex-col items-center gap-1 min-w-[48px]">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center shadow-sm">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-[10px] font-bold text-primary whitespace-nowrap">
                    {m.time}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {m.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{m.topic}</p>
                  <div className="flex mt-1.5">
                    {m.members.map((mem, j) => (
                      <div
                        key={j}
                        className="w-5 h-5 rounded-full border-2 border-card flex items-center justify-center text-[8px] font-bold text-white -ml-1 first:ml-0"
                        style={{ background: m.colors[j] }}
                      >
                        {mem}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-primary/10 dark:bg-primary/20 rounded-xl px-2.5 py-1.5 text-center flex-shrink-0 self-start">
                  <p className="text-base font-extrabold text-primary leading-tight">
                    {m.date.split(" ")[0]}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-medium">
                    {m.date.split(" ")[1]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── ROW 2: ATTENDANCE + LEAVE BALANCE + AWARD TABLE ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* TODAY'S ATTENDANCE STATUS */}
        <Card className="p-5">
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

        {/* LEAVE BALANCE */}
        <Card className="p-5">
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

        {/* EMPLOYEE AWARD LIST */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">
                Employee Award List
              </h2>
              <p className="text-xs text-muted-foreground">
                Recent recognitions
              </p>
            </div>
            <button className="text-xs font-semibold text-primary bg-primary/10 px-3 py-1 rounded-lg hover:bg-primary/15 transition-colors flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5" />
              Award list
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-muted/50 rounded-xl">
                  <th className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2 first:rounded-l-xl">
                    #
                  </th>
                  <th className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">
                    Employee
                  </th>
                  <th className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2">
                    Award
                  </th>
                  <th className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-3 py-2 last:rounded-r-xl">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {awards.map((emp, i) => (
                  <tr
                    key={emp.id}
                    className={`hover:bg-muted/30 transition-colors ${
                      i < awards.length - 1 ? "border-b border-border" : ""
                    }`}
                  >
                    <td className="px-3 py-3 text-xs font-bold text-muted-foreground">
                      {emp.id}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-7 h-7 rounded-lg ${emp.avatarBg} flex items-center justify-center text-[10px] font-bold flex-shrink-0`}
                        >
                          {emp.initials}
                        </div>
                        <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                          {emp.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-xs text-muted-foreground">
                      {emp.award}
                    </td>
                    <td className="px-3 py-3">
                      <StatusPill status={emp.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
