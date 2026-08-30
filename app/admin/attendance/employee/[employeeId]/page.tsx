"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  User,
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  MapPin,
  Camera,
  ArrowLeft,
  Briefcase,
} from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay, parseISO } from "date-fns";
import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { getMonthlyAttendance, getEmployee } from "@/app/api/api";

type MonthlyRecord = {
  date: string;
  status: string;
  isSunday: boolean;
  isHoliday: boolean;
  holidayName?: string;
  inTime?: string;
  outTime?: string;
  inPhotoUrl?: string;
  outPhotoUrl?: string;
  workingMinutes?: number;
  anomalyFlag?: boolean;
  anomalyReason?: string;
  inLocationAddress?: string;
  outLocationAddress?: string;
};

const statusColors: Record<string, string> = {
  present: "bg-green-100 text-green-800 border-green-200",
  absent: "bg-red-100 text-red-800 border-red-200",
  "half-day": "bg-yellow-100 text-yellow-800 border-yellow-200",
  late: "bg-orange-100 text-orange-800 border-orange-200",
  "on-leave": "bg-blue-100 text-blue-800 border-blue-200",
  holiday: "bg-purple-100 text-purple-800 border-purple-200",
  weekend: "bg-gray-100 text-gray-800 border-gray-200",
  "work-from-home": "bg-cyan-100 text-cyan-800 border-cyan-200",
  pending: "bg-gray-100 text-gray-600 border-gray-200",
};

const statusLabels: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  "half-day": "Half Day",
  late: "Late",
  "on-leave": "On Leave",
  holiday: "Holiday",
  weekend: "Weekend",
  "work-from-home": "WFH",
  pending: "Pending",
};

export default function EmployeeAttendanceDetailPage() {
  const params = useParams();
  const employeeId = params.employeeId as string;

  const [currentDate, setCurrentDate] = useState(new Date());
  const [records, setRecords] = useState<MonthlyRecord[]>([]);
  const [employee, setEmployee] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string>("");

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch employee details
        const empRes = await getEmployee(employeeId);
        const emp = empRes.data;
        setEmployee(emp);
        setOrganizationId(emp.organizationId);

        // Fetch monthly attendance — use emp.userId (the users.user_id FK),
        // not employeeId (the employees.id PK). The backend attendance query
        // joins on users.user_id.
        const attRes = await getMonthlyAttendance({
          userId: emp.userId,
          month,
          year,
          organizationId: emp.organizationId,
        });
        setRecords(attRes.data || []);
      } catch (err) {
        console.error("Failed to fetch employee attendance:", err);
      } finally {
        setLoading(false);
      }
    };

    if (employeeId) {
      fetchData();
    }
  }, [employeeId, month, year]);

  const stats = useMemo(() => {
    const workingDays = records.filter(
      (r) => !r.isSunday && !r.isHoliday && r.status !== "on-leave"
    );
    const present = records.filter((r) => r.status === "present");
    const absent = records.filter((r) => r.status === "absent");
    const halfDays = records.filter((r) => r.status === "half-day");
    const late = records.filter((r) => r.status === "late");
    const onLeave = records.filter((r) => r.status === "on-leave");
    const totalMinutes = records.reduce((sum, r) => sum + (r.workingMinutes || 0), 0);
    const presentWithHours = present.filter((r) => r.workingMinutes && r.workingMinutes > 0);

    return {
      totalDays: records.length,
      workingDays: workingDays.length,
      present: present.length,
      absent: absent.length,
      halfDays: halfDays.length,
      late: late.length,
      onLeave: onLeave.length,
      totalHours: Math.floor(totalMinutes / 60),
      totalMinutesRemainder: totalMinutes % 60,
      averageHours:
        presentWithHours.length > 0
          ? (presentWithHours.reduce((sum, r) => sum + (r.workingMinutes || 0), 0) /
              presentWithHours.length /
              60).toFixed(1)
          : "0.0",
      attendancePercentage:
        workingDays.length > 0
          ? Math.round((present.length / workingDays.length) * 100)
          : 0,
    };
  }, [records]);

  const calendarDays = useMemo(() => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    const days = eachDayOfInterval({ start, end });
    const startDayOfWeek = getDay(start);

    const padding: (null | Date)[] = Array(startDayOfWeek).fill(null);
    return [...padding, ...days];
  }, [currentDate]);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const getRecordForDate = (date: Date) => {
    const dateStr = format(date, "yyyy-MM-dd");
    return records.find((r) => r.date === dateStr);
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return "-";
    return timeStr;
  };

  const formatWorkingTime = (minutes?: number) => {
    if (!minutes) return "-";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h}h ${m}m`;
  };

  if (loading && !employee) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-100 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-100 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Back button + header */}
      <div className="flex items-center gap-4">
        <Link href="/admin/attendance">
          <Button variant="ghost" size="sm" className="gap-1">
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Employee Attendance Detail</h1>
          {employee && (
            <p className="text-muted-foreground">
              {employee.user?.firstName} {employee.user?.lastName} ({employee.employeeCode})
            </p>
          )}
        </div>
      </div>

      {/* Employee info card */}
      {employee && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <img
                src={employee.user?.profileImage || "/default-avatar.png"}
                alt={`${employee.user?.firstName} ${employee.user?.lastName}`}
                className="w-16 h-16 rounded-full object-cover ring-2 ring-muted"
              />
              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Employee</p>
                  <p className="font-semibold">
                    {employee.user?.firstName} {employee.user?.lastName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Code</p>
                  <p className="font-semibold">{employee.employeeCode || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Department</p>
                  <p className="font-semibold">{employee.department?.name || "-"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Designation</p>
                  <p className="font-semibold">{employee.designation?.name || "-"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Month navigation + stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrevMonth}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-lg font-semibold min-w-[160px] text-center">
            {format(currentDate, "MMMM yyyy")}
          </span>
          <Button variant="outline" size="sm" onClick={handleNextMonth}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalDays}</p>
                <p className="text-xs text-muted-foreground">Total Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.present}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.halfDays}</p>
                <p className="text-xs text-muted-foreground">Half Days</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.onLeave}</p>
                <p className="text-xs text-muted-foreground">On Leave</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Clock className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.totalHours}h {stats.totalMinutesRemainder}m
                </p>
                <p className="text-xs text-muted-foreground">
                  Avg: {stats.averageHours}h/day | {stats.attendancePercentage}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar view */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Monthly Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="text-center text-xs font-medium text-muted-foreground py-2">
                {day}
              </div>
            ))}
            {calendarDays.map((day, idx) => {
              if (!day) {
                return <div key={`pad-${idx}`} className="h-16" />;
              }

              const record = getRecordForDate(day);
              const isToday = isSameDay(day, new Date());
              const statusClass = record ? statusColors[record.status] || "" : "";

              return (
                <div
                  key={format(day, "yyyy-MM-dd")}
                  className={`h-16 border rounded-md p-1 flex flex-col text-xs ${statusClass} ${
                    isToday ? "ring-2 ring-blue-500" : ""
                  }`}
                >
                  <span className={`font-medium ${isToday ? "text-blue-600" : ""}`}>
                    {format(day, "d")}
                  </span>
                  {record && (
                    <>
                      <span className="text-[10px] mt-auto truncate">
                        {record.inTime || record.status === "absent" ? "A" : ""}
                      </span>
                      {record.workingMinutes && (
                        <span className="text-[10px]">
                          {Math.floor(record.workingMinutes / 60)}h
                        </span>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Daily records table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Daily Attendance Records</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : records.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No attendance records for this month.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 font-medium">Date</th>
                    <th className="text-left py-3 px-2 font-medium">Day</th>
                    <th className="text-left py-3 px-2 font-medium">Status</th>
                    <th className="text-left py-3 px-2 font-medium">Clock In</th>
                    <th className="text-left py-3 px-2 font-medium">Clock Out</th>
                    <th className="text-left py-3 px-2 font-medium">Working Hours</th>
                    <th className="text-left py-3 px-2 font-medium">In Photo</th>
                    <th className="text-left py-3 px-2 font-medium">Out Photo</th>
                    <th className="text-left py-3 px-2 font-medium">Location</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((rec) => (
                    <tr key={rec.date} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-2 font-medium">{format(parseISO(rec.date), "dd MMM yyyy")}</td>
                      <td className="py-3 px-2">{format(parseISO(rec.date), "EEE")}</td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className={statusColors[rec.status]}>
                          {statusLabels[rec.status] || rec.status}
                        </Badge>
                        {rec.anomalyFlag && (
                          <Badge variant="destructive" className="ml-1 text-[10px]">
                            Anomaly
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-2 font-mono">{formatTime(rec.inTime)}</td>
                      <td className="py-3 px-2 font-mono">{formatTime(rec.outTime)}</td>
                      <td className="py-3 px-2">{formatWorkingTime(rec.workingMinutes)}</td>
                      <td className="py-3 px-2">
                        {rec.inPhotoUrl ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="w-8 h-10 overflow-hidden rounded cursor-pointer hover:opacity-80">
                                <Image
                                  src={rec.inPhotoUrl}
                                  alt="In"
                                  width={32}
                                  height={40}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg p-2">
                              <Image
                                src={rec.inPhotoUrl}
                                alt="In Full"
                                width={400}
                                height={500}
                                className="w-full h-auto object-contain rounded"
                              />
                            </DialogContent>
                          </Dialog>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-2">
                        {rec.outPhotoUrl ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="w-8 h-10 overflow-hidden rounded cursor-pointer hover:opacity-80">
                                <Image
                                  src={rec.outPhotoUrl}
                                  alt="Out"
                                  width={32}
                                  height={40}
                                  className="object-cover w-full h-full"
                                />
                              </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg p-2">
                              <Image
                                src={rec.outPhotoUrl}
                                alt="Out Full"
                                width={400}
                                height={500}
                                className="w-full h-auto object-contain rounded"
                              />
                            </DialogContent>
                          </Dialog>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="py-3 px-2 text-xs max-w-[200px] truncate">
                        {rec.inLocationAddress || rec.outLocationAddress || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
