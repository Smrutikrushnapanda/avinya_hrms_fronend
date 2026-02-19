"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Timer,
  Sun,
  Gift,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  TrendingUp,
  Zap,
  LogIn,
  LogOut,
  Loader2,
  HourglassIcon,
  Wifi,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/ui/data-table";
import { Progress } from "@/components/ui/progress";
import { getProfile, getMonthlyAttendance } from "@/app/api/api";

// ─── TYPES ────────────────────────────────────────────────────────────────────

type AttendanceRecord = {
  date: string;
  day: string;
  status: string;
  inTime: string;
  outTime: string;
  hours: string;
  hoursNum: number;
  overtime: string;
};

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function formatTime12h(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleTimeString("en-US", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  } catch {
    return "--";
  }
}

function formatWorkingMinutes(minutes: number): { hours: string; hoursNum: number } {
  if (!minutes || minutes <= 0) return { hours: "--", hoursNum: 0 };
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return { hours: `${h}h ${m}m`, hoursNum: parseFloat((minutes / 60).toFixed(2)) };
}

function formatOvertime(workingMinutes: number): string {
  const overtime = workingMinutes - 480; // 8 hours = 480 minutes
  if (!workingMinutes || overtime <= 0) return "--";
  const h = Math.floor(overtime / 60);
  const m = overtime % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

function formatDisplayDate(dateStr: string): { date: string; day: string } {
  try {
    const [year, month, day] = dateStr.split("T")[0].split("-").map(Number);
    const d = new Date(year, month - 1, day);
    return {
      date: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      day: d.toLocaleDateString("en-US", { weekday: "long" }),
    };
  } catch {
    return { date: dateStr, day: "" };
  }
}

function normalizeStatus(status: string): string {
  const s = (status ?? "").toLowerCase();
  if (s === "half-day" || s === "half_day") return "halfday";
  if (s === "on-leave" || s === "leave") return "leave";
  if (s === "work-from-home" || s === "wfh") return "wfh";
  return s;
}

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  present: { label: "Present",  icon: CheckCircle2,   className: "bg-gradient-to-r from-emerald-100 to-green-50 text-emerald-700 border-emerald-200" },
  absent:  { label: "Absent",   icon: XCircle,        className: "bg-gradient-to-r from-red-100 to-rose-50 text-red-700 border-red-200" },
  late:    { label: "Late",     icon: Timer,           className: "bg-gradient-to-r from-orange-100 to-amber-50 text-orange-700 border-orange-200" },
  halfday: { label: "Half Day", icon: Clock,           className: "bg-gradient-to-r from-purple-100 to-violet-50 text-purple-700 border-purple-200" },
  holiday: { label: "Holiday",  icon: Gift,            className: "bg-gradient-to-r from-pink-100 to-rose-50 text-pink-700 border-pink-200" },
  weekend: { label: "Weekend",  icon: Sun,             className: "bg-gradient-to-r from-sky-100 to-blue-50 text-sky-700 border-sky-200" },
  leave:   { label: "On Leave", icon: HourglassIcon,   className: "bg-gradient-to-r from-blue-100 to-indigo-50 text-blue-700 border-blue-200" },
  wfh:     { label: "WFH",      icon: Wifi,            className: "bg-gradient-to-r from-cyan-100 to-teal-50 text-cyan-700 border-cyan-200" },
};

function getStatusConfig(status: string) {
  return statusConfig[status] ?? {
    label: status || "Unknown",
    icon: Clock,
    className: "bg-gradient-to-r from-gray-100 to-gray-50 text-gray-700 border-gray-200",
  };
}

// ─── COLUMNS ─────────────────────────────────────────────────────────────────

const columns: ColumnDef<AttendanceRecord>[] = [
  {
    id: "serial",
    header: () => <span className="text-muted-foreground">#</span>,
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground font-medium">{row.index + 1}</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "date",
    header: "Date",
    cell: ({ row }) => (
      <div className="flex flex-col min-w-[130px]">
        <span className="text-sm font-semibold text-foreground">{row.original.date}</span>
        <span className="text-xs text-muted-foreground">{row.original.day}</span>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const cfg = getStatusConfig(row.original.status);
      const Icon = cfg.icon;
      return (
        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border ${cfg.className}`}>
          <Icon className="w-3.5 h-3.5" />
          {cfg.label}
        </span>
      );
    },
  },
  {
    accessorKey: "inTime",
    header: () => (
      <div className="flex items-center gap-1.5">
        <LogIn className="w-3.5 h-3.5" />
        <span>Punch In</span>
      </div>
    ),
    cell: ({ row }) => {
      const time = row.original.inTime;
      if (time === "--") return <span className="text-sm text-muted-foreground">--</span>;
      const isLate = row.original.status === "late";
      return (
        <span className={`text-sm font-semibold ${isLate ? "text-orange-600" : "text-emerald-600"}`}>
          {time}
        </span>
      );
    },
  },
  {
    accessorKey: "outTime",
    header: () => (
      <div className="flex items-center gap-1.5">
        <LogOut className="w-3.5 h-3.5" />
        <span>Punch Out</span>
      </div>
    ),
    cell: ({ row }) => {
      const time = row.original.outTime;
      if (time === "--") return <span className="text-sm text-muted-foreground">--</span>;
      return <span className="text-sm font-semibold text-foreground">{time}</span>;
    },
  },
  {
    accessorKey: "hours",
    header: () => (
      <div className="flex items-center gap-1.5">
        <Clock className="w-3.5 h-3.5" />
        <span>Working Hours</span>
      </div>
    ),
    cell: ({ row }) => {
      const { hours, hoursNum } = row.original;
      if (hours === "--") return <span className="text-sm text-muted-foreground">--</span>;
      const color =
        hoursNum >= 9 ? "text-emerald-600" :
        hoursNum >= 8 ? "text-foreground" :
        hoursNum >= 4 ? "text-amber-600" :
        "text-red-600";
      return <span className={`text-sm font-semibold ${color}`}>{hours}</span>;
    },
  },
  {
    accessorKey: "overtime",
    header: () => (
      <div className="flex items-center gap-1.5">
        <Zap className="w-3.5 h-3.5" />
        <span>Overtime</span>
      </div>
    ),
    cell: ({ row }) => {
      const ot = row.original.overtime;
      if (ot === "--") return <span className="text-sm text-muted-foreground">--</span>;
      return <span className="text-sm font-semibold text-indigo-600">{ot}</span>;
    },
  },
];

// ─── PAGE ─────────────────────────────────────────────────────────────────────

export default function EmployeeAttendancePage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth()); // 0-indexed
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [tableState, setTableState] = useState({
    page: 0,
    pageSize: 10,
    search: "",
    sorting: [] as any,
  });

  // API state
  const [userId, setUserId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [rawRecords, setRawRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Map raw records → typed AttendanceRecord rows (exclude future dates)
  const attendanceRecords = useMemo<AttendanceRecord[]>(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return [...rawRecords]
      .filter((record) => {
        const dateStr: string = record.attendanceDate ?? record.date ?? "";
        if (!dateStr) return false;
        const [y, m, d] = dateStr.split("T")[0].split("-").map(Number);
        return new Date(y, m - 1, d) <= today;
      })
      .sort((a, b) => {
        const da = new Date(a.attendanceDate ?? a.date ?? 0).getTime();
        const db = new Date(b.attendanceDate ?? b.date ?? 0).getTime();
        return db - da; // newest first
      })
      .map((record) => {
        const dateStr: string = record.attendanceDate ?? record.date ?? "";
        const { date, day } = dateStr ? formatDisplayDate(dateStr) : { date: "--", day: "" };
        const status = normalizeStatus(record.status ?? "");
        const { hours, hoursNum } = formatWorkingMinutes(record.workingMinutes ?? 0);
        return {
          date,
          day,
          status,
          inTime: record.inTime ?? "--",
          outTime: record.outTime ?? "--",
          hours,
          hoursNum,
          overtime: formatOvertime(record.workingMinutes ?? 0),
        };
      });
  }, [rawRecords]);

  // ── Summary stats derived from real data
  const summary = useMemo(() => {
    const present  = attendanceRecords.filter((r) => r.status === "present").length;
    const absent   = attendanceRecords.filter((r) => r.status === "absent").length;
    const late     = attendanceRecords.filter((r) => r.status === "late").length;
    const halfday  = attendanceRecords.filter((r) => r.status === "halfday").length;
    const workingDays = attendanceRecords.filter(
      (r) => !["weekend", "holiday"].includes(r.status)
    ).length;
    const workedDays = present + late + halfday;
    const attendanceRate =
      workingDays > 0 ? parseFloat(((workedDays / workingDays) * 100).toFixed(1)) : 0;
    const totalMinutes = rawRecords.reduce((sum, r) => sum + (r.workingMinutes ?? 0), 0);
    const th = Math.floor(totalMinutes / 60);
    const tm = totalMinutes % 60;
    const totalHours = totalMinutes > 0 ? `${th}h ${tm}m` : "--";
    return { present, absent, late, halfday, workingDays, workedDays, attendanceRate, totalHours };
  }, [attendanceRecords, rawRecords]);

  // ── Fetch monthly attendance
  const fetchAttendance = useCallback(
    async (orgId: string, uid: string, month: number, year: number) => {
      setIsRefreshing(true);
      try {
        const res = await getMonthlyAttendance({
          organizationId: orgId,
          userId: uid,
          month: month + 1, // API expects 1-indexed month
          year,
        });
        const raw: any[] =
          res.data?.attendance ??
          res.data?.data ??
          (Array.isArray(res.data) ? res.data : []);
        setRawRecords(raw);
        setTableState((prev) => ({ ...prev, page: 0 })); // reset to first page on data change
      } catch (e) {
        console.error("Failed to fetch attendance:", e);
        setRawRecords([]);
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
          await fetchAttendance(orgId, uid, selectedMonth, selectedYear);
        }
      } catch (e) {
        console.error("Failed to load profile:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Refetch when month/year changes
  useEffect(() => {
    if (organizationId && userId) {
      fetchAttendance(organizationId, userId, selectedMonth, selectedYear);
    }
  }, [selectedMonth, selectedYear, organizationId, userId, fetchAttendance]);

  // ── Month navigation
  const handlePrevMonth = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear((y) => y - 1); }
    else setSelectedMonth((m) => m - 1);
  };

  const isNextDisabled = useMemo(() => {
    const now = new Date();
    return selectedMonth === now.getMonth() && selectedYear === now.getFullYear();
  }, [selectedMonth, selectedYear]);

  const handleNextMonth = () => {
    if (isNextDisabled) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear((y) => y + 1); }
    else setSelectedMonth((m) => m + 1);
  };

  // ── Filter + paginate for DataTable
  const filteredData = useMemo(() => {
    const q = tableState.search.toLowerCase().trim();
    if (!q) return attendanceRecords;
    return attendanceRecords.filter(
      (r) =>
        r.date.toLowerCase().includes(q) ||
        r.day.toLowerCase().includes(q) ||
        getStatusConfig(r.status).label.toLowerCase().includes(q) ||
        r.inTime.toLowerCase().includes(q) ||
        r.outTime.toLowerCase().includes(q)
    );
  }, [attendanceRecords, tableState.search]);

  const paginatedData = useMemo(() => {
    const start = tableState.page * tableState.pageSize;
    return filteredData.slice(start, start + tableState.pageSize);
  }, [filteredData, tableState.page, tableState.pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredData.length / tableState.pageSize));

  const statCards = [
    { label: "Present",       value: summary.present,  icon: CheckCircle2, accent: "text-emerald-600 bg-emerald-500/10", valueColor: "text-emerald-600" },
    { label: "Absent",        value: summary.absent,   icon: XCircle,      accent: "text-red-500 bg-red-500/10",         valueColor: "text-red-500" },
    { label: "Late Arrivals", value: summary.late,     icon: Timer,        accent: "text-orange-500 bg-orange-500/10",   valueColor: "text-orange-500" },
    { label: "Half Days",     value: summary.halfday,  icon: Clock,        accent: "text-purple-600 bg-purple-500/10",   valueColor: "text-purple-600" },
  ];

  // ── Loading screen
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm">Loading attendance…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Your monthly attendance records and summary</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Month Navigator */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <div className="flex items-center gap-2 px-4 py-2 border rounded-lg bg-background text-sm font-semibold min-w-[160px] justify-center">
              <CalendarDays className="w-4 h-4 text-muted-foreground" />
              {monthNames[selectedMonth]} {selectedYear}
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth} disabled={isNextDisabled}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {isRefreshing && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
        </div>
      </div>

      {/* ── STAT CARDS ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="py-5">
              <CardContent className="px-5 pt-0 pb-0">
                <div className={`w-10 h-10 rounded-xl ${card.accent} flex items-center justify-center mb-3`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className={`text-3xl font-extrabold tracking-tight ${card.valueColor}`}>
                  {card.value}
                </p>
                <p className="text-sm text-muted-foreground font-medium mt-0.5">{card.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── ATTENDANCE RATE BANNER ── */}
      <Card className="py-0 overflow-hidden">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  Attendance Rate — {monthNames[selectedMonth]} {selectedYear}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {summary.workedDays} worked days out of {summary.workingDays} working days
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 sm:min-w-[280px]">
              <Progress value={summary.attendanceRate} className="flex-1 h-2.5" />
              <span className="text-lg font-extrabold text-primary w-16 text-right">
                {summary.attendanceRate}%
              </span>
            </div>
            <div className="flex items-center gap-6 text-center flex-shrink-0">
              <div>
                <p className="text-lg font-extrabold text-foreground">{summary.totalHours}</p>
                <p className="text-xs text-muted-foreground">Total Hours</p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-foreground">{summary.workingDays}</p>
                <p className="text-xs text-muted-foreground">Working Days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── DATA TABLE CARD ── */}
      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>
            {filteredData.length > 0
              ? `Showing ${filteredData.length} record${filteredData.length !== 1 ? "s" : ""} for ${monthNames[selectedMonth]} ${selectedYear}`
              : `No attendance records found for ${monthNames[selectedMonth]} ${selectedYear}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={paginatedData}
            pageCount={pageCount}
            state={tableState}
            setState={(s) => setTableState(s)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
