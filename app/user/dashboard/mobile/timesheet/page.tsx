"use client";

import { useEffect, useState } from "react";
import { CheckCircle, XCircle, Timer, CalendarDays } from "lucide-react";
import { getProfile, getAttendanceSummary } from "@/app/api/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import MobileTabHeader from "../components/MobileTabHeader";
import { MobileCard } from "../components/MobileCard";
import { StaggerReveal, StaggerItem, SpringNumber } from "../components/animation-wrappers";
import { MobileSkeleton } from "../components/MobileSkeleton";

export default function MobileTimesheetPage() {
  const [loading, setLoading] = useState(true);
  const [timesheetData, setTimesheetData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await getProfile();
        const userId = profileRes.data.id;

        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const attendanceRes = await getAttendanceSummary(userId, { month, year });
        const records = attendanceRes.data?.records || attendanceRes.data || [];
        setTimesheetData(records.slice(0, 15));
      } catch (error) {
        console.error("Error fetching timesheet:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  const presentDays = timesheetData.filter(
    (r) => r.status?.toLowerCase() === "present",
  ).length;
  const absentDays = timesheetData.filter(
    (r) => r.status?.toLowerCase() === "absent",
  ).length;
  const lateDays = timesheetData.filter(
    (r) => r.status?.toLowerCase() === "late",
  ).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileTabHeader title="Timesheet" backHref="/user/dashboard/mobile" compact />
        <MobileSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileTabHeader title="Timesheet" backHref="/user/dashboard/mobile" compact />

      <div className="p-4 pb-24 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <MobileCard className="flex flex-col items-center gap-1 text-center">
            <div className="w-9 h-9 rounded-full bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">Present</span>
            <span className="text-xl font-bold text-emerald-600">
              <SpringNumber value={presentDays} />
            </span>
          </MobileCard>
          <MobileCard className="flex flex-col items-center gap-1 text-center">
            <div className="w-9 h-9 rounded-full bg-rose-50 dark:bg-rose-900/30 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-rose-500" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">Absent</span>
            <span className="text-xl font-bold text-rose-500">
              <SpringNumber value={absentDays} />
            </span>
          </MobileCard>
          <MobileCard className="flex flex-col items-center gap-1 text-center">
            <div className="w-9 h-9 rounded-full bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Timer className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">Late</span>
            <span className="text-xl font-bold text-amber-600">
              <SpringNumber value={lateDays} />
            </span>
          </MobileCard>
        </div>

        <MobileCard>
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">My Timesheet</h3>
          </div>

          {timesheetData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No timesheet data available.</p>
          ) : (
            <StaggerReveal className="space-y-2" staggerDelay={0.04}>
              {timesheetData.map((record: any, index: number) => (
                <StaggerItem
                  key={index}
                  className="border border-slate-100 dark:border-slate-800 rounded-xl p-3.5 flex justify-between items-center bg-card"
                >
                  <div>
                    <p className="font-medium text-sm text-foreground">{formatDate(record.date)}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {record.inTime || record.checkInTime || "--:--"} &mdash;{" "}
                      {record.outTime || record.checkOutTime || "--:--"}
                    </p>
                  </div>
                  <Badge
                    variant={
                      record.status === "PRESENT"
                        ? "default"
                        : record.status === "ABSENT"
                          ? "destructive"
                          : "secondary"
                    }
                    className="text-[11px]"
                  >
                    {record.status || "N/A"}
                  </Badge>
                </StaggerItem>
              ))}
            </StaggerReveal>
          )}
        </MobileCard>
      </div>
    </div>
  );
}
