"use client";

import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function TestSheetPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = String(params?.id || "");
  const userId = searchParams.get("userId") || "";

  if (!projectId || !userId) {
    return <div className="p-6 text-sm text-red-500">Invalid project or user id.</div>;
  }

  return (
    <div className="mx-auto max-w-[1440px] p-6 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="w-6 h-6" />
              Test Sheet
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Project test sheet for employee
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-8 space-y-4">
        <p className="text-muted-foreground">
          Test sheet functionality will be implemented here. This page is accessible for project userId: {userId} on project: {projectId}
        </p>
      </div>
    </div>
  );
}
