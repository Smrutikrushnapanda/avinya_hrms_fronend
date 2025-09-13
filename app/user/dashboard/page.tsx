"use client";
import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import AttendanceCalendar from "@/components/AttendanceCalendar";
import { startOfMonth } from "date-fns";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";


interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

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
  isOptional?: boolean;
}

export default function UserDashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [statusByDate, setStatusByDate] = useState<
    Record<string, AttendanceStatus>
  >({});
  const [currentMonth, setCurrentMonth] = useState<Date>(
    startOfMonth(new Date())
  );

  useEffect(() => {
    // Example: fetch user + attendance
    setTimeout(() => {
      setUser({
        id: "1",
        name: "John Doe",
        email: "john@example.com",
        role: "Employee",
      });
      setStatusByDate({
        "2025-09-01": { status: "present", inTime: "09:00", outTime: "18:00" },
        "2025-09-02": { status: "absent" },
        "2025-09-03": { status: "holiday", holidayName: "Ganesh Chaturthi" },
      });
    }, 1000);
  }, []);

  return (
    <div className="p-6">
      <h1 className="text-3xl font-semibold mb-6">Dashboard</h1>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* ✅ Calendar on Left (2/3 width) */}
        <Card className="md:col-span-2 min-h-[650px]">
          <CardHeader>
            <CardTitle>📅 Attendance Calendar</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Show skeleton while loading */}
            {user ? (
              <AttendanceCalendar
                currentMonth={currentMonth}
                setCurrentMonth={setCurrentMonth}
                statusByDate={statusByDate}
              />
            ) : (
              <Skeleton className="h-[600px]" />
            )}
          </CardContent>
        </Card>

        {/* ✅ Right Side Column */}
        <div className="space-y-6">
          {/* Leave Balance Card */}
          <Card>
  <CardHeader>
    <CardTitle>📝 Leave Balance</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    {/* Casual Leave */}
    <div className="flex items-center justify-between border-b pb-2">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-blue-100 rounded-full">
          📅
        </div>
        <div>
          <p className="font-medium">Casual Leave (CL)</p>
          <p className="text-xs text-gray-500">Last Used: 28-05-2025</p>
        </div>
      </div>
      <span className="text-lg font-bold text-blue-600">15</span>
    </div>

    {/* Sick Leave */}
    <div className="flex items-center justify-between border-b pb-2">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-red-100 rounded-full">
          ❤️
        </div>
        <div>
          <p className="font-medium">Sick Leave (SL)</p>
          <p className="text-xs text-gray-500">Last Used: 10-03-2025</p>
        </div>
      </div>
      <span className="text-lg font-bold text-red-600">10</span>
    </div>

    {/* Earned Leave */}
    <div className="flex items-center justify-between border-b pb-2">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-green-100 rounded-full">
          🎁
        </div>
        <div>
          <p className="font-medium">Earned Leave (EL)</p>
          <p className="text-xs text-gray-500">Last Used: 08-01-2025</p>
        </div>
      </div>
      <span className="text-lg font-bold text-green-600">05</span>
    </div>

    {/* Floating Holidays */}
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-purple-100 rounded-full">
          ⭐
        </div>
        <div>
          <p className="font-medium">Floating Holidays (FH)</p>
          <p className="text-xs text-gray-500">Last Used: 21-12-2025</p>
        </div>
      </div>
      <span className="text-lg font-bold text-purple-600">02</span>
    </div>
  </CardContent>
</Card>


          {/* Upcoming Holidays Card (already exists, moved below Leave Card) */}
         <Card>
  <CardHeader>
    <CardTitle>🎉 Holidays</CardTitle>
  </CardHeader>
  <CardContent>
    {!user ? (
      <div>
        <Skeleton className="h-full w-full mb-2" />
        <Skeleton className="h-full w-full mb-2" />
        <Skeleton className="h-full w-full mb-2" />
      </div>
    ) : (
      <Tabs defaultValue="upcoming" className="w-full">
        {/* Tab Buttons */}
        <TabsList className="grid grid-cols-3 w-full mb-4">
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="public">Public</TabsTrigger>
          <TabsTrigger value="restricted">Restricted</TabsTrigger>
        </TabsList>

        {/* Upcoming Holidays */}
        <TabsContent value="upcoming">
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
        </TabsContent>

        {/* Public Holidays */}
        <TabsContent value="public">
          <ul className="space-y-2 text-sm">
            <li className="border p-2 rounded bg-green-50">
              Jan 26 – Republic Day
            </li>
            <li className="border p-2 rounded bg-green-50">
              Aug 15 – Independence Day
            </li>
            <li className="border p-2 rounded bg-green-50">
              Oct 2 – Gandhi Jayanti
            </li>
          </ul>
        </TabsContent>

        {/* Restricted Holidays */}
        <TabsContent value="restricted">
          <ul className="space-y-2 text-sm">
            <li className="border p-2 rounded bg-yellow-50">
              Nov 1 – Kannada Rajyotsava
            </li>
            <li className="border p-2 rounded bg-yellow-50">
              Dec 24 – Christmas Eve
            </li>
          </ul>
        </TabsContent>
      </Tabs>
    )}
  </CardContent>
</Card>
        </div>
      </div>
    </div>
  );
}
