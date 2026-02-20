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

  return (
    <div className="flex h-screen flex-col">
      {!isMobileDashboard && (
        <div className="shrink-0">
          <Topbar />
        </div>
      )}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {!isMobileDashboard && <Sidebar />}
        <main
          className={`flex-1 min-h-0 ${
            isMobileDashboard
              ? "bg-white overflow-y-auto"
            : isMessages
              ? "overflow-hidden flex flex-col"
              : "overflow-y-auto p-4 bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-black"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
