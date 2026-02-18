"use client";
import { ReactNode, useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import {
  Home,
  CalendarDays,
  Umbrella,
  Clock,
  LayoutGrid,
  X,
  FileText,
  DollarSign,
  MessageSquare,
  BarChart2,
  Settings,
  Bell,
} from "lucide-react";

const tabs = [
  { name: "Home", href: "/user/dashboard/mobile", icon: Home },
  { name: "Attendance", href: "/user/dashboard/mobile/attendance", icon: CalendarDays },
  { name: "Services", href: null, icon: LayoutGrid }, // center floating
  { name: "Leave", href: "/user/dashboard/mobile/leave", icon: Umbrella },
  { name: "Time Slip", href: "/user/dashboard/mobile/timeslip", icon: Clock },
];

const serviceItems = [
  { name: "Timesheet", href: "/user/dashboard/mobile/timesheet", icon: FileText, color: "#026D94" },
  { name: "Payroll", href: "/user/dashboard/mobile/payroll", icon: DollarSign, color: "#026D94" },
  { name: "Messages", href: "/user/dashboard/mobile/messages", icon: MessageSquare, color: "#026D94" },
  { name: "Polls", href: "/user/dashboard/mobile/polls", icon: BarChart2, color: "#026D94" },
  { name: "Settings", href: "/user/dashboard/mobile/settings", icon: Settings, color: "#026D94" },
  { name: "Notifications", href: "/user/dashboard/mobile/notifications", icon: Bell, color: "#026D94" },
];

export default function MobileLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);

  const getActiveTab = () => {
    if (pathname === "/user/dashboard/mobile") return 0;
    if (pathname.includes("/attendance")) return 1;
    if (pathname.includes("/leave")) return 3;
    if (pathname.includes("/timeslip")) return 4;
    if (
      pathname.includes("/services") ||
      pathname.includes("/timesheet") ||
      pathname.includes("/payroll") ||
      pathname.includes("/messages") ||
      pathname.includes("/polls")
    )
      return 2;
    return 0;
  };

  const activeTab = getActiveTab();

  // Close sheet on backdrop click or route change
  useEffect(() => {
    setSheetOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {children}

      {/* Bottom Sheet Overlay */}
      {sheetOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 transition-opacity duration-300"
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* Bottom Sheet */}
      <div
        className={`fixed left-0 w-full bg-white z-50 rounded-t-2xl shadow-2xl transition-transform duration-300 ease-out ${
          sheetOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ bottom: "64px" }} // sits just above the nav bar
      >
        {/* Sheet Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Sheet Header */}
        <div className="flex items-center justify-between px-5 py-3">
          <span className="text-base font-semibold text-gray-800">Services</span>
          <button
            onClick={() => setSheetOpen(false)}
            className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Service Grid */}
        <div className="grid grid-cols-3 gap-4 px-5 pb-8 pt-2">
          {serviceItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.name}
                onClick={() => {
                  setSheetOpen(false);
                  router.push(item.href);
                }}
                className="flex flex-col items-center gap-2 py-4 rounded-2xl bg-gray-50 hover:bg-[#026D94]/10 active:scale-95 transition-all duration-150"
              >
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center border border-gray-100">
                  <Icon className="w-5 h-5 text-[#026D94]" />
                </div>
                <span className="text-[11px] font-medium text-gray-600">{item.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 shadow-lg z-50" style={{ height: "64px" }}>
        <div className="flex items-end h-full relative">
          {tabs.map((tab, index) => {
            const isCenter = index === 2;
            const isActive = activeTab === index;
            const Icon = tab.icon;

            if (isCenter) {
              return (
                <div key={tab.name} className="flex-1 flex flex-col items-center justify-end pb-2 relative">
                  {/* Floating Services Button */}
                  <button
                    onClick={() => setSheetOpen((prev) => !prev)}
                    className="absolute left-1/2 -translate-x-1/2 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 bg-[#026D94]"
                    style={{
                      bottom: "22px",
                      boxShadow: "0 4px 16px rgba(2,109,148,0.4)",
                    }}
                  >
                    <Icon className="w-6 h-6 text-white" />
                  </button>
                  <span
                    className={`text-[10px] ${
                      isActive || sheetOpen ? "text-[#026D94] font-semibold" : "text-[#b9b9b9] font-medium"
                    }`}
                  >
                    {tab.name}
                  </span>
                </div>
              );
            }

            return (
              <button
                key={tab.name}
                onClick={() => tab.href && router.push(tab.href)}
                className={`flex-1 flex flex-col items-center pt-1 pb-3 relative transition-colors ${
                  isActive ? "text-[#026D94]" : "text-[#b9b9b9]"
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-[#026D94] rounded-b-full" />
                )}
                <Icon className="w-5 h-5" />
                <span className={`text-[10px] mt-1 ${isActive ? "font-semibold" : "font-medium"}`}>
                  {tab.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Spacer so content isn't hidden behind nav */}
      <div style={{ height: "64px" }} />
    </div>
  );
}