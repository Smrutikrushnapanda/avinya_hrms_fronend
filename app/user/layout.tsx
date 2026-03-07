"use client";
import { ReactNode } from "react";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import { usePathname } from "next/navigation";
import "../globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMobileDashboard = pathname.startsWith("/user/dashboard/mobile");
  const isMessages = pathname.startsWith("/user/messages");
  const mainBaseClass = "flex-1 min-h-0 min-w-0";
  const desktopDashboardClasses =
    "overflow-y-auto scrollbar-hide p-3 sm:p-4 bg-background";
  const mobileClasses =
    "employee-mobile-shell overflow-y-auto scrollbar-hide bg-background";
  const messagesClasses =
    "employee-messages-shell overflow-hidden bg-background flex flex-col";

  return (
    <div className="employee-shell flex h-dvh min-h-screen flex-col bg-background text-foreground">
      {!isMobileDashboard && (
        <div className="shrink-0">
          <Topbar />
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {!isMobileDashboard && (
          <div className="hidden md:block">
            <Sidebar />
          </div>
        )}
        <main
          className={
            isMobileDashboard
              ? `${mainBaseClass} ${mobileClasses}`
            : isMessages
              ? `${mainBaseClass} ${messagesClasses}`
              : `${mainBaseClass} ${desktopDashboardClasses}`
          }
        >
          {children}
        </main>
      </div>
    </div>
  );
}
