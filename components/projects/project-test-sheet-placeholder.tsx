"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProjectTestSheetPlaceholder({
  mode,
}: {
  mode: "user" | "admin";
}) {
  const params = useParams<{ id: string }>();
  const projectId = String(params?.id || "");

  if (!projectId) {
    return <div className="p-6 text-sm text-red-500">Invalid project id.</div>;
  }

  const workspacePath =
    mode === "admin" ? `/admin/projects/${projectId}` : `/user/projects/${projectId}`;

  return (
    <div className="mx-auto max-w-[1440px] p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href={workspacePath}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="w-6 h-6" />
          Test Sheet
        </h1>
      </div>

      <div className="rounded-xl border border-border bg-card min-h-[70vh]" />
    </div>
  );
}
