"use client";

import AttendancePage from "@/app/user/attendance/page";
import DashboardCalendarSection from "@/components/DashboardCalendarSection";

export default function AdminDashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">👨‍💼 Admin Dashboard</h1>
      <DashboardCalendarSection />
      <AttendancePage />
    </div>
  );
}
