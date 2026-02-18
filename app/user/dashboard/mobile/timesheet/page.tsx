"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, ArrowLeft, BookMarked } from "lucide-react";
import { useRouter } from "next/navigation";
import { getProfile, getAttendanceSummary } from "@/app/api/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function MobileTimesheetPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [timesheetData, setTimesheetData] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await getProfile();
        const userId = profileRes.data.id;
        setUserId(userId);

        const now = new Date();
        const month = now.getMonth() + 1;
        const year = now.getFullYear();

        const attendanceRes = await getAttendanceSummary(userId, { month, year });
        const records = attendanceRes.data?.records || attendanceRes.data || [];
        
        setTimesheetData(records.slice(0, 15)); // Show last 15 days
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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#0077b6] text-white px-4 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/user/dashboard/mobile")}>
            <ArrowLeft className="w-5 h-5 text-white" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Timesheet</h2>
          </div>
        </div>
        <Bell className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">My Timesheet</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : timesheetData.length === 0 ? (
              <p className="text-sm text-gray-500">No timesheet data available.</p>
            ) : (
              <div className="space-y-2">
                {timesheetData.map((record: any, index: number) => (
                  <div key={index} className="border rounded-lg p-3 flex justify-between items-center">
                    <div>
                      <p className="font-medium">{formatDate(record.date)}</p>
                      <p className="text-xs text-gray-500">
                        {record.inTime || record.checkInTime || "--:--"} - {record.outTime || record.checkOutTime || "--:--"}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={record.status === "PRESENT" ? "default" : "secondary"}>
                        {record.status || "N/A"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

