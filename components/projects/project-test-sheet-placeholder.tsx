"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProjectTestSheetPlaceholder({
  mode,
}: {
  mode: "user" | "admin";
}) {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = String(params?.id || "");
  const source = searchParams.get("source");

  if (!projectId) {
    return <div className="p-6 text-sm text-red-500">Invalid project id.</div>;
  }

  const workspaceBasePath =
    mode === "admin" ? `/admin/projects/${projectId}` : `/user/projects/${projectId}`;
  const workspacePath =
    source === "client" ? `${workspaceBasePath}?source=client` : workspaceBasePath;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1440px] p-6">
        <div className="flex items-center gap-3 mb-6">
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

        <div className="min-h-[80vh]" />
      </div>
    </div>
  );
}
