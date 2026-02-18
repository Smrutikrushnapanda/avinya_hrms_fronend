"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import AttendanceCalendar from "@/components/AttendanceCalendar";
import axios from "axios";
import { startOfMonth } from "date-fns";
import { getProfile, getHolidays } from "@/app/api/api";

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

interface Holiday {
  id?: number;
  date?: string;
  name?: string;
  holidayType?: string;
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
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  const userId = "08936291-d8f4-4429-ac51-2879ea34df43";
  const organizationId = "24facd21-265a-4edd-8fd1-bc69a036f755";
  const month = currentMonth.getMonth() + 1; // 1-based
  const year = currentMonth.getFullYear();

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch attendance data
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

    fetchData();
  }, [userId, organizationId, month, year]);

  // Fetch holidays from API
  useEffect(() => {
    const fetchHolidays = async () => {
      try {
        const profileRes = await getProfile();
        const orgId = profileRes.data?.organizationId || organizationId;
        
        const holidaysRes = await getHolidays({ organizationId: orgId });
        let holidaysData = holidaysRes.data;
        
        if (holidaysData?.holidays) {
          setHolidays(holidaysData.holidays);
        } else if (Array.isArray(holidaysData)) {
          setHolidays(holidaysData);
        }
      } catch (error) {
        console.error("Failed to fetch holidays:", error);
      }
    };

    fetchHolidays();
  }, [organizationId]);

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
          {holidays.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {holidays.slice(0, 5).map((holiday, index) => (
                <li 
                  key={holiday.id || index} 
                  className={`border p-2 rounded ${holiday.isOptional ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      {holiday.date ? new Date(holiday.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${holiday.isOptional ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {holiday.isOptional ? 'RH' : 'H'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{holiday.name}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming holidays</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardCalendarSection;
