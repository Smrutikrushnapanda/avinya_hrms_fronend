"use client";

import { ReactNode } from "react";
import { PlanAccessProvider } from "@/components/plan-access-provider";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import "../globals.css";

export default function SuperadminLayout({ children }: { children: ReactNode }) {
  return (
    <PlanAccessProvider>
      <div className="flex flex-col h-screen">
        <Topbar />
        <div className="flex flex-1 overflow-hidden">
          <Sidebar />
          <main className="flex-1 bg-background overflow-y-auto scrollbar-hide p-4">
            {children}
          </main>
        </div>
      </div>
    </PlanAccessProvider>
  );
}
