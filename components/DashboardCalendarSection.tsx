"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import AttendanceCalendar from "@/components/AttendanceCalendar";
import axios from "axios";// adjust path if needed
import { startOfMonth } from "date-fns";

interface AttendanceRecord {
  date: string;
  status: "present" | "absent" | "half-day" | "holiday" | "pending";
  isSunday: boolean;
  isHoliday: boolean;
  holidayName?: string;
  inTime?: string;
  outTime?: string;
  isOptional?: boolean;
}

const DashboardCalendarSection = () => {
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);
  const [currentMonth, setCurrentMonth] = useState<Date>(
    startOfMonth(new Date())
  );
  const [loading, setLoading] = useState(true);

  const userId = "08936291-d8f4-4429-ac51-2879ea34df43";
  const organizationId = "24facd21-265a-4edd-8fd1-bc69a036f755";
  const month = currentMonth.getMonth() + 1; // 1-based
  const year = currentMonth.getFullYear();

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
         const res = await axios.get("/attendance/monthly", {
          params: {
            userId,
            organizationId,
            month,
            year,
          },
        });
        setAttendanceRecords(res.data || []);
      } catch (error) {
        console.error("Failed to fetch attendance:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [userId, organizationId, month, year]);

  // ✅ Transform to match AttendanceCalendar's props
  const statusByDate = useMemo(() => {
    const map: Record<
      string,
      {
        status: "present" | "absent" | "half-day" | "holiday" | "pending";
        holidayName?: string;
        inTime?: string;
        outTime?: string;
      }
    > = {};

    for (const item of attendanceRecords) {
      const dateKey = item.date;
      map[dateKey] = {
        status: item.isHoliday ? "holiday" : item.status,
        holidayName: item.holidayName,
        inTime: item.inTime,
        outTime: item.outTime,
      };
    }

    return map;
  }, [attendanceRecords]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
      {/* Calendar Card */}
      <Card className="col-span-1 md:col-span-4">
        <CardContent className="overflow-x-auto">
          {loading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <AttendanceCalendar
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              statusByDate={statusByDate}
            />
          )}
        </CardContent>
      </Card>

      {/* Holiday Card */}
      <Card className="col-span-1 md:col-span-2">
        <CardHeader>
          <CardTitle>🎉 Upcoming Holidays</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="border p-2 rounded bg-blue-50">
              Aug 15 – Independence Day
            </li>
            <li className="border p-2 rounded bg-blue-50">
              Aug 19 – Raksha Bandhan
            </li>
            <li className="border p-2 rounded bg-blue-50">
              Oct 2 – Gandhi Jayanti
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardCalendarSection;
