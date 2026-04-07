"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import {
  createClientProjectDocument,
  createProjectDocument,
  getClientProject,
  getClientProjectDocuments,
  getClientProjectEmployees,
  getProfile,
  getProject,
  getProjectDocuments,
  getProjectEmployees,
  uploadFile,
} from "@/app/api/api";
import { toast } from "sonner";
import { ArrowLeft, FileText, Plus, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type ProjectSource = "standalone" | "client";

type ProjectMember = {
  userId: string;
  role: string;
};

type ProjectDocument = {
  id: string;
  projectId: string;
  organizationId: string;
  title: string;
  description: string | null;
  fileUrl: string;
  fileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  uploadedByUserId: string;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

function normalizeRoleValue(value: unknown) {
  return String(value ?? "").trim().toUpperCase();
}

function extractProfileRoles(profile: Record<string, unknown>): string[] {
  const roleCandidates: string[] = [];
  const addRoleCandidate = (value: unknown) => {
    const normalized = normalizeRoleValue(value);
    if (normalized) roleCandidates.push(normalized);
  };

  const roles = Array.isArray(profile?.roles) ? profile.roles : [];
  roles.forEach((roleItem) => {
    if (typeof roleItem === "string") {
      addRoleCandidate(roleItem);
      return;
    }
    if (roleItem && typeof roleItem === "object") {
      const roleObj = roleItem as {
        roleName?: unknown;
        name?: unknown;
        role?: unknown;
        type?: unknown;
      };
      addRoleCandidate(roleObj.roleName);
      addRoleCandidate(roleObj.name);
      addRoleCandidate(roleObj.role);
      addRoleCandidate(roleObj.type);
    }
  });

  addRoleCandidate(profile?.roleName);
  addRoleCandidate(profile?.role);
  addRoleCandidate(profile?.userType);
  addRoleCandidate(profile?.type);

  return Array.from(new Set(roleCandidates));
}

function formatDisplayDate(dateStr?: string | null) {
  if (!dateStr) return "--";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function formatDocumentSize(size?: number | null) {
  const bytes = Number(size ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;

  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  return `${value.toFixed(value >= 100 ? 0 : value >= 10 ? 1 : 2)} ${units[unitIndex]}`;
}

export default function ProjectDocumentsPage({ mode }: { mode: "user" | "admin" }) {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = String(params?.id || "");
  const source = (searchParams.get("source") === "client" ? "client" : "standalone") as ProjectSource;
  const isClientProject = source === "client";
  const isReadOnlyAdminView = mode === "admin";

  const [loading, setLoading] = useState(true);
  const [projectName, setProjectName] = useState("Project");
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [projectCreatedByUserId, setProjectCreatedByUserId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [uploadingDocumentFile, setUploadingDocumentFile] = useState(false);
  const [savingDocument, setSavingDocument] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string>("");
  const [profileRoles, setProfileRoles] = useState<string[]>([]);
  const [documentDraft, setDocumentDraft] = useState({
    title: "",
    description: "",
    fileUrl: "",
    fileName: "",
    mimeType: "",
    fileSize: null as number | null,
  });

  const hasAdminRole = useMemo(
    () =>
      profileRoles.some((role) => {
        const normalized = normalizeRoleValue(role);
        return normalized === "ADMIN" || normalized === "SUPER_ADMIN" || normalized === "ORG_ADMIN";
      }),
    [profileRoles],
  );

  const hasManagerRole = useMemo(
    () =>
      profileRoles.some((role) => {
        const normalized = normalizeRoleValue(role);
        return normalized === "MANAGER" || normalized.endsWith("_MANAGER");
      }),
    [profileRoles],
  );

  const isCurrentUserProjectManager = useMemo(() => {
    if (!profileUserId) return false;
    if (isClientProject) {
      return projectMembers.some(
        (member) =>
          member.userId === profileUserId && String(member.role || "").toLowerCase() === "manager",
      );
    }
    if (projectCreatedByUserId && projectCreatedByUserId === profileUserId) return true;
    return projectMembers.some(
      (member) =>
        member.userId === profileUserId &&
        ["manager", "lead"].includes(String(member.role || "").toLowerCase()),
    );
  }, [isClientProject, profileUserId, projectCreatedByUserId, projectMembers]);

  const canManageDocuments =
    !isReadOnlyAdminView && (hasAdminRole || hasManagerRole || isCurrentUserProjectManager);

  const loadDocuments = useCallback(async () => {
    if (!projectId) return;
    const response = isClientProject
      ? await getClientProjectDocuments(projectId)
      : await getProjectDocuments(projectId);
    setDocuments(Array.isArray(response.data) ? (response.data as ProjectDocument[]) : []);
  }, [isClientProject, projectId]);

  const loadPage = useCallback(async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const profileRes = await getProfile();
      const profile = profileRes.data || {};
      const currentUserId = String(profile.userId || profile.id || "");
      setProfileUserId(currentUserId);
      setProfileRoles(extractProfileRoles(profile as Record<string, unknown>));

      if (isClientProject) {
        const [projectRes, membersRes, docsRes] = await Promise.all([
          getClientProject(projectId),
          getClientProjectEmployees(projectId),
          getClientProjectDocuments(projectId),
        ]);
        const project = projectRes.data || {};
        setProjectName(String(project.projectName || project.projectCode || "Project"));
        setProjectCreatedByUserId(null);
        setProjectMembers(
          Array.isArray(membersRes.data)
            ? membersRes.data.map((member: { userId?: string; role?: string }) => ({
                userId: String(member.userId || ""),
                role: String(member.role || "member"),
              }))
            : [],
        );
        setDocuments(Array.isArray(docsRes.data) ? (docsRes.data as ProjectDocument[]) : []);
      } else {
        const [projectRes, membersRes, docsRes] = await Promise.all([
          getProject(projectId),
          getProjectEmployees(projectId),
          getProjectDocuments(projectId),
        ]);
        const project = projectRes.data || {};
        setProjectName(String(project.name || "Project"));
        setProjectCreatedByUserId(project?.createdBy?.id ? String(project.createdBy.id) : null);
        setProjectMembers(
          Array.isArray(membersRes.data)
            ? membersRes.data.map((member: { userId?: string; role?: string }) => ({
                userId: String(member.userId || ""),
                role: String(member.role || "member"),
              }))
            : [],
        );
        setDocuments(Array.isArray(docsRes.data) ? (docsRes.data as ProjectDocument[]) : []);
      }
    } catch {
      toast.error("Failed to load project documents");
    } finally {
      setLoading(false);
    }
  }, [isClientProject, projectId]);

  useEffect(() => {
    void loadPage();
  }, [loadPage]);

  const handleDocumentFileUpload = async (file: File) => {
    if (!projectId) return;
    try {
      setUploadingDocumentFile(true);
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadFile(formData, {
        path: isClientProject
          ? `client-projects/${projectId}/documents`
          : `projects/${projectId}/documents`,
        public: true,
      });
      const url = res?.data?.url || res?.data?.secureUrl || "";
      if (!url) {
        toast.error("File upload did not return a URL");
        return;
      }
      setDocumentDraft((prev) => ({
        ...prev,
        fileUrl: url,
        fileName: file.name || prev.fileName,
        mimeType: file.type || prev.mimeType,
        fileSize: Number.isFinite(file.size) ? file.size : prev.fileSize,
        title: prev.title || file.name || "Project Document",
      }));
      toast.success("Document uploaded");
    } catch {
      toast.error("Failed to upload document");
    } finally {
      setUploadingDocumentFile(false);
    }
  };

  const handleCreateDocument = async () => {
    if (!projectId) return;
    if (!canManageDocuments) {
      toast.error("Only manager/admin can add project documents");
      return;
    }
    if (!documentDraft.title.trim() || !documentDraft.fileUrl.trim()) {
      toast.error("Document title and file URL are required");
      return;
    }

    try {
      setSavingDocument(true);
      const payload = {
        title: documentDraft.title.trim(),
        description: documentDraft.description.trim() || undefined,
        fileUrl: documentDraft.fileUrl.trim(),
        fileName: documentDraft.fileName.trim() || undefined,
        mimeType: documentDraft.mimeType.trim() || undefined,
        fileSize: documentDraft.fileSize ?? undefined,
      };

      if (isClientProject) {
        await createClientProjectDocument(projectId, payload);
      } else {
        await createProjectDocument(projectId, payload);
      }

      setDocumentDraft({
        title: "",
        description: "",
        fileUrl: "",
        fileName: "",
        mimeType: "",
        fileSize: null,
      });
      setShowComposer(false);
      await loadDocuments();
      toast.success("Project document added");
    } catch {
      toast.error("Failed to add project document");
    } finally {
      setSavingDocument(false);
    }
  };

  const workspaceBasePath =
    mode === "admin" ? `/admin/projects/${projectId}` : `/user/projects/${projectId}`;
  const workspacePath = isClientProject
    ? `${workspaceBasePath}?source=client`
    : workspaceBasePath;

  if (!projectId) {
    return <div className="p-6 text-sm text-red-500">Invalid project id.</div>;
  }

  return (
    <div className="mx-auto max-w-[1200px] p-6 space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href={workspacePath}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6" />
            {projectName} Documents
          </h1>
        </div>
        {canManageDocuments ? (
          <Button size="sm" variant="outline" onClick={() => setShowComposer((prev) => !prev)}>
            <Plus className="w-4 h-4 mr-1" />
            {showComposer ? "Close" : "Add Document"}
          </Button>
        ) : (
          <Badge variant="outline">Read only</Badge>
        )}
      </div>

      {showComposer && canManageDocuments ? (
        <div className="grid grid-cols-1 md:grid-cols-8 gap-2 p-3 border border-border rounded-lg bg-card">
          <Input
            className="md:col-span-2"
            placeholder="Document title"
            value={documentDraft.title}
            onChange={(e) => setDocumentDraft((prev) => ({ ...prev, title: e.target.value }))}
          />
          <Input
            className="md:col-span-4"
            placeholder="Document URL (or upload below)"
            value={documentDraft.fileUrl}
            onChange={(e) => setDocumentDraft((prev) => ({ ...prev, fileUrl: e.target.value }))}
          />
          <div className="md:col-span-2 flex justify-end">
            <Button onClick={handleCreateDocument} disabled={savingDocument}>
              {savingDocument ? "Saving..." : "Add Document"}
            </Button>
          </div>
          <Textarea
            className="md:col-span-4 min-h-[72px]"
            placeholder="Description (optional)"
            value={documentDraft.description}
            onChange={(e) =>
              setDocumentDraft((prev) => ({ ...prev, description: e.target.value }))
            }
          />
          <div className="md:col-span-4 flex items-center gap-2">
            <label className="inline-flex">
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleDocumentFileUpload(file);
                  e.currentTarget.value = "";
                }}
              />
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={uploadingDocumentFile}
                asChild
              >
                <span>
                  <Upload className="w-4 h-4 mr-1" />
                  {uploadingDocumentFile ? "Uploading..." : "Upload File"}
                </span>
              </Button>
            </label>
            {documentDraft.fileName ? (
              <span className="text-xs text-muted-foreground truncate max-w-[260px]">
                {documentDraft.fileName}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Uploaded Documents</h2>
          <Badge variant="outline">{documents.length}</Badge>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No project documents uploaded yet.</p>
        ) : (
          <div className="space-y-2">
            {documents.map((document) => {
              const size = formatDocumentSize(document.fileSize);
              return (
                <div
                  key={document.id}
                  className="flex items-start justify-between gap-3 rounded-md border border-border p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-medium truncate">{document.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {document.fileName || "Attached document"}
                    </p>
                    {document.description ? (
                      <p className="text-xs text-muted-foreground">{document.description}</p>
                    ) : null}
                    <p className="text-[11px] text-muted-foreground">
                      {formatDisplayDate(document.createdAt)}
                      {size ? ` • ${size}` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" asChild>
                    <a href={document.fileUrl} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
