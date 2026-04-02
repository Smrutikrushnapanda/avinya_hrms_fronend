"use client";

import { useParams, useSearchParams } from "next/navigation";
import ProjectWorkspace from "@/components/projects/project-workspace";

export default function UserProjectWorkspacePage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = String(params?.id || "");
  const source = searchParams.get("source") === "client" ? "client" : "standalone";

  if (!projectId) {
    return <div className="p-6 text-sm text-red-500">Invalid project id.</div>;
  }

  return <ProjectWorkspace projectId={projectId} mode="user" source={source} />;
}
