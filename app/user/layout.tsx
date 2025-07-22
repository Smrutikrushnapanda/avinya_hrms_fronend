import { ReactNode } from "react";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import "../globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col h-screen">
      {/* Topbar full width */}
      <Topbar />

      {/* Below topbar: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 bg-gray-50 overflow-y-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
