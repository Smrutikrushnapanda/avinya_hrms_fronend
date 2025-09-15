"use client";
import { ReactNode } from "react";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import { Toaster } from "sonner";
import "../globals.css";
import { usePathname } from "next/navigation";

export default function RootLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  // ✅ Hide topbar + sidebar on mobile dashboard route
  const isMobileDashboard = pathname === "/user/dashboard/mobile";

  return (
    <div className="flex flex-col h-screen">
      {/* Conditionally render Topbar */}
      {!isMobileDashboard && <Topbar />}

      <div className="flex flex-1 overflow-hidden">
        {/* Conditionally render Sidebar */}
        {!isMobileDashboard && <Sidebar />}

        <main
          className={`flex-1 overflow-y-auto ${isMobileDashboard
              ? "bg-white" // mobile page clean look (no padding)
              : "p-4 bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-black"
            }`}
        >
          {children}
          <Toaster position="top-right" richColors /> {/* ✅ Toast container */}
        </main>

      </div>
    </div>
  );
}
