"use client";
import { ReactNode } from "react";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import { usePathname } from "next/navigation";
import "../globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isMobileDashboard = pathname.startsWith("/user/dashboard/mobile");

  return (
    <div className="flex flex-col h-screen">
      {!isMobileDashboard && <Topbar />}
      <div className="flex flex-1 overflow-hidden">
        {!isMobileDashboard && <Sidebar />}
        <main
          className={`flex-1 overflow-y-auto ${
            isMobileDashboard
              ? "bg-white"
              : "p-4 bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-black"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
