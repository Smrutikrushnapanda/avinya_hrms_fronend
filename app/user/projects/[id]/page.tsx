"use client";

import { useParams } from "next/navigation";
import ProjectWorkspace from "@/components/projects/project-workspace";

export default function UserProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const projectId = String(params?.id || "");

  if (!projectId) {
    return <div className="p-6 text-sm text-red-500">Invalid project id.</div>;
  }

  return <ProjectWorkspace projectId={projectId} mode="user" />;
}
