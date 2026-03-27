"use client";

import { ReactNode, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PlanAccessProvider, usePlanAccess } from "@/components/plan-access-provider";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
import "../globals.css";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <PlanAccessProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </PlanAccessProvider>
  );
}

function AdminLayoutContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { loading, isPathAllowed, getFallbackPath } = usePlanAccess();
  const isAllowedPath = isPathAllowed(pathname);

  useEffect(() => {
    if (!loading && !isAllowedPath) {
      router.replace(getFallbackPath(pathname));
    }
  }, [getFallbackPath, isAllowedPath, loading, pathname, router]);

  if (loading || !isAllowedPath) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      <Topbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 bg-background overflow-y-auto scrollbar-hide p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
