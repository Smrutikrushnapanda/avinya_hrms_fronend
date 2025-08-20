import { ReactNode } from "react";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import { Toaster } from "sonner";
import "../globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      {/* Topbar full width */}
      <Topbar />

      {/* Below topbar: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 bg-gradient-to-b from-white to-slate-100 dark:from-slate-900 dark:to-black overflow-y-auto p-4">
          {children}
           <Toaster position="top-right" richColors /> {/* ✅ Toast container */}
        </main>
      </div>
    </div>
  );
}
