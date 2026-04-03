"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardList, Plus, PanelRight, PanelRightClose } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getClientProject,
  createClientProjectTestCase,
  createClientProjectTestSheetTab,
  createProjectTestCase,
  createProjectTestSheetTab,
  getClientProjectEmployees,
  getClientProjectTestSheet,
  getProject,
  getProjectEmployees,
  getProjectTestSheet,
  updateClientProjectTestCase,
  updateProjectTestCase,
} from "@/app/api/api";

type TestCaseStatus = "pending" | "resolved";
type EditableField =
  | "caseCode"
  | "title"
  | "steps"
  | "expectedResult"
  | "actualResult"
  | "qaUserId"
  | "developerUserId"
  | "status";
type BaseColumnKey = EditableField | "updatedAt";
type ColumnKey = BaseColumnKey | `custom_${number}`;

type ProjectMember = {
  userId: string;
  role?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  workEmail?: string;
};

type TestSheetCase = {
  id: string;
  tabId: string;
  rowIndex: number;
  caseCode: string | null;
  title: string;
  steps: string | null;
  expectedResult: string | null;
  actualResult: string | null;
  qaUserId: string | null;
  developerUserId: string | null;
  status: TestCaseStatus;
  createdByUserId: string;
  updatedByUserId: string | null;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TestSheetTab = {
  id: string;
  name: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
  cases: TestSheetCase[];
};

type TestSheetLog = {
  id: string;
  action: string;
  fieldName: string | null;
  summary: string | null;
  beforeValue: Record<string, unknown> | null;
  afterValue: Record<string, unknown> | null;
  changedByUserId: string | null;
  changedByUserName: string | null;
  tabId: string | null;
  testCaseId: string | null;
  createdAt: string;
};

type TestSheetPayload = {
  projectId: string;
  projectSource: "standalone" | "client";
  tabs: TestSheetTab[];
  logs: TestSheetLog[];
};

type TestSheetColumn = {
  key: ColumnKey;
  letter: string;
  defaultTitle: string;
  widthClass: string;
  isCustom?: boolean;
};

const defaultColumnCount = 20;

const baseColumnConfig: Array<Omit<TestSheetColumn, "letter">> = [
  { key: "caseCode", defaultTitle: "Case ID", widthClass: "min-w-[120px]" },
  { key: "title", defaultTitle: "Test Case", widthClass: "min-w-[220px]" },
  { key: "steps", defaultTitle: "Steps", widthClass: "min-w-[240px]" },
  { key: "expectedResult", defaultTitle: "Expected Result", widthClass: "min-w-[240px]" },
  { key: "actualResult", defaultTitle: "Actual Result", widthClass: "min-w-[240px]" },
  { key: "qaUserId", defaultTitle: "QA / Tester", widthClass: "min-w-[180px]" },
  { key: "developerUserId", defaultTitle: "Developer", widthClass: "min-w-[180px]" },
  { key: "status", defaultTitle: "Status", widthClass: "min-w-[140px]" },
  { key: "updatedAt", defaultTitle: "Updated At", widthClass: "min-w-[170px]" },
];

const customColumnConfig: Array<Omit<TestSheetColumn, "letter">> = Array.from(
  { length: Math.max(defaultColumnCount - baseColumnConfig.length, 0) },
  (_, index) => ({
    key: `custom_${index + 1}` as ColumnKey,
    defaultTitle: `Column ${baseColumnConfig.length + index + 1}`,
    widthClass: "min-w-[180px]",
    isCustom: true,
  }),
);

function getColumnLetter(index: number) {
  let current = index + 1;
  let letter = "";

  while (current > 0) {
    const remainder = (current - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    current = Math.floor((current - 1) / 26);
  }

  return letter;
}

const columnConfig: TestSheetColumn[] = [...baseColumnConfig, ...customColumnConfig].map((column, index) => ({
  ...column,
  letter: getColumnLetter(index),
}));

const testSheetTableMinWidth = 52 + columnConfig.length * 170;

function personLabel(member: ProjectMember) {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  return name || member.workEmail || member.email || member.userId.slice(0, 8);
}

function formatDateTime(value?: string | null) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeValue(field: EditableField, value: string): string | null | TestCaseStatus {
  if (field === "status") {
    return value === "resolved" ? "resolved" : "pending";
  }

  const trimmed = value.trim();
  if (field === "title") return trimmed;
  if (field === "qaUserId" || field === "developerUserId") return trimmed || null;
  return trimmed || null;
}

function extractProjectName(data: Record<string, unknown> | null | undefined) {
  const candidate =
    (typeof data?.projectName === "string" && data.projectName) ||
    (typeof data?.name === "string" && data.name) ||
    (typeof data?.projectCode === "string" && data.projectCode) ||
    "";

  const sanitized = candidate.trim();
  return sanitized || "Project";
}

function readCaseFieldValue(row: TestSheetCase, field: BaseColumnKey) {
  if (field === "updatedAt") return row.updatedAt;
  return row[field] ?? "";
}

export default function ProjectTestSheetPlaceholder({
  mode,
}: {
  mode: "user" | "admin";
}) {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const projectId = String(params?.id || "");
  const source = searchParams.get("source");
  const isClientProject = source === "client";

  const [payload, setPayload] = useState<TestSheetPayload | null>(null);
  const [projectName, setProjectName] = useState("Project");
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [activeTabId, setActiveTabId] = useState("");
  const [loading, setLoading] = useState(false);
  const [creatingTab, setCreatingTab] = useState(false);
  const [addingRow, setAddingRow] = useState(false);
  const [newTabName, setNewTabName] = useState("");
  const [selectedCell, setSelectedCell] = useState<{ caseId: string; field: BaseColumnKey } | null>(null);
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [columnTitles, setColumnTitles] = useState<Record<string, string>>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;

  // Column name editing state
  const [editingColumnKey, setEditingColumnKey] = useState<ColumnKey | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");

  // Version Log pagination
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 10;

  const canEdit = mode === "user";
  const columnStorageKey = useMemo(
    () =>
      projectId
        ? `project-test-sheet:columns:${isClientProject ? "client" : "standalone"}:${projectId}`
        : "",
    [isClientProject, projectId],
  );

  const applyPayload = useCallback((nextPayload: TestSheetPayload) => {
    const safeTabs = Array.isArray(nextPayload?.tabs) ? nextPayload.tabs : [];
    const safeLogs = Array.isArray(nextPayload?.logs) ? nextPayload.logs : [];

    setPayload({
      ...nextPayload,
      tabs: safeTabs,
      logs: safeLogs,
    });

    setActiveTabId((previous) => {
      if (safeTabs.some((tab) => tab.id === previous)) return previous;
      return safeTabs[0]?.id || "";
    });
    setCurrentPage(1); // Reset to first page when tabs change
    setLogPage(1); // Reset log page when data changes
  }, []);

  const fetchTestSheet = useCallback(async () => {
    if (!projectId) return;

    try {
      setLoading(true);
      const [sheetRes, membersRes, projectRes] = await Promise.all([
        isClientProject ? getClientProjectTestSheet(projectId) : getProjectTestSheet(projectId),
        isClientProject ? getClientProjectEmployees(projectId) : getProjectEmployees(projectId),
        isClientProject ? getClientProject(projectId) : getProject(projectId),
      ]);

      applyPayload(sheetRes.data as TestSheetPayload);
      setMembers(Array.isArray(membersRes.data) ? membersRes.data : []);
      setProjectName(extractProjectName(projectRes.data as Record<string, unknown>));
    } catch (error) {
      console.error(error);
      toast.error("Failed to load project test sheet.");
      setProjectName("Project");
    } finally {
      setLoading(false);
    }
  }, [applyPayload, isClientProject, projectId]);

  useEffect(() => {
    void fetchTestSheet();
  }, [fetchTestSheet]);

  useEffect(() => {
    if (!columnStorageKey) return;

    try {
      const rawValue = localStorage.getItem(columnStorageKey);
      if (!rawValue) {
        setColumnTitles({});
        return;
      }

      const parsed = JSON.parse(rawValue) as Record<string, unknown>;
      const nextTitles: Record<string, string> = {};
      columnConfig.forEach((column) => {
        const value = parsed?.[column.key];
        if (typeof value === "string" && value.trim()) {
          nextTitles[column.key] = value.trim();
        }
      });
      setColumnTitles(nextTitles);
    } catch (error) {
      console.error(error);
      setColumnTitles({});
    }
  }, [columnStorageKey]);

  useEffect(() => {
    if (!columnStorageKey) return;
    localStorage.setItem(columnStorageKey, JSON.stringify(columnTitles));
  }, [columnStorageKey, columnTitles]);

  const tabs = payload?.tabs || [];

  const activeTab = useMemo(() => {
    if (!tabs.length) return null;
    return tabs.find((tab) => tab.id === activeTabId) || tabs[0];
  }, [activeTabId, tabs]);

  // Paginated cases for current page
  const paginatedCases = useMemo(() => {
    if (!activeTab?.cases) return [];
    const startIndex = (currentPage - 1) * rowsPerPage;
    return activeTab.cases.slice(startIndex, startIndex + rowsPerPage);
  }, [activeTab?.cases, currentPage]);

  const totalPages = Math.ceil((activeTab?.cases?.length || 0) / rowsPerPage);

  // Paginated logs for Version Log
  const paginatedLogs = useMemo(() => {
    if (!payload?.logs) return [];
    const startIndex = (logPage - 1) * logsPerPage;
    return payload.logs.slice(startIndex, startIndex + logsPerPage);
  }, [payload?.logs, logPage]);

  const totalLogPages = Math.ceil((payload?.logs?.length || 0) / logsPerPage);
  const logPageNumbers = useMemo(
    () => Array.from({ length: totalLogPages }, (_, index) => index + 1),
    [totalLogPages],
  );

  const memberMap = useMemo(() => {
    const map = new Map<string, ProjectMember>();
    members.forEach((member) => map.set(member.userId, member));
    return map;
  }, [members]);

  const selectedCellDisplay = useMemo(() => {
    if (!selectedCell || !activeTab) return "";
    const row = activeTab.cases.find((item) => item.id === selectedCell.caseId);
    if (!row) return "";
    const value = readCaseFieldValue(row, selectedCell.field);
    return String(value ?? "");
  }, [activeTab, selectedCell]);

  const getColumnTitle = useCallback(
    (column: TestSheetColumn) => columnTitles[column.key] || column.defaultTitle,
    [columnTitles],
  );

  const saveEditedColumnTitle = useCallback(() => {
    if (!editingColumnKey) return;

    const defaultTitle =
      columnConfig.find((column) => column.key === editingColumnKey)?.defaultTitle || "";
    const nextTitle = editingColumnTitle.trim();

    setColumnTitles((previous) => {
      const next = { ...previous };
      if (!nextTitle || nextTitle === defaultTitle) {
        delete next[editingColumnKey];
      } else {
        next[editingColumnKey] = nextTitle;
      }
      return next;
    });

    setEditingColumnKey(null);
    setEditingColumnTitle("");
    toast.success("Column name updated.");
  }, [editingColumnKey, editingColumnTitle]);

  const workspaceBasePath =
    mode === "admin" ? `/admin/projects/${projectId}` : `/user/projects/${projectId}`;
  const workspacePath = isClientProject
    ? `${workspaceBasePath}?source=client`
    : workspaceBasePath;

  const commitCell = useCallback(
    async (row: TestSheetCase, field: EditableField, rawValue: string) => {
      if (!canEdit) return;

      const normalized = normalizeValue(field, rawValue);
      if (field === "title" && typeof normalized === "string" && !normalized) {
        toast.error("Test case title cannot be empty.");
        return;
      }

      const current = row[field] ?? null;
      if (JSON.stringify(current) === JSON.stringify(normalized)) return;

      const patch: Partial<{
        caseCode: string | null;
        title: string;
        steps: string | null;
        expectedResult: string | null;
        actualResult: string | null;
        qaUserId: string | null;
        developerUserId: string | null;
        status: TestCaseStatus;
      }> = {};

      if (field === "status") {
        patch.status = normalized as TestCaseStatus;
      } else {
        patch[field] = normalized as never;
      }

      const cellKey = `${row.id}:${field}`;
      try {
        setSavingCellKey(cellKey);
        const response = isClientProject
          ? await updateClientProjectTestCase(projectId, row.id, patch)
          : await updateProjectTestCase(projectId, row.id, patch);
        applyPayload(response.data as TestSheetPayload);
      } catch (error) {
        console.error(error);
        toast.error("Failed to save cell value.");
      } finally {
        setSavingCellKey(null);
      }
    },
    [applyPayload, canEdit, isClientProject, projectId],
  );

  const handleCreateTab = useCallback(async () => {
    if (!canEdit || !projectId) return;

    const name = newTabName.trim();
    if (!name) {
      toast.error("Enter a tab name.");
      return;
    }

    try {
      setCreatingTab(true);
      const response = isClientProject
        ? await createClientProjectTestSheetTab(projectId, { name })
        : await createProjectTestSheetTab(projectId, { name });
      applyPayload(response.data as TestSheetPayload);
      setNewTabName("");
      toast.success("New sheet tab created.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to create tab.");
    } finally {
      setCreatingTab(false);
    }
  }, [applyPayload, canEdit, isClientProject, newTabName, projectId]);

  const handleAddRow = useCallback(async () => {
    if (!canEdit || !activeTab || !projectId) return;

    const nextIndex = (activeTab.cases?.length || 0) + 1;
    const defaultCode = `TC-${String(nextIndex).padStart(3, "0")}`;

    try {
      setAddingRow(true);
      const response = isClientProject
        ? await createClientProjectTestCase(projectId, activeTab.id, {
            caseCode: defaultCode,
            title: `Test case ${nextIndex}`,
            status: "pending",
          })
        : await createProjectTestCase(projectId, activeTab.id, {
            caseCode: defaultCode,
            title: `Test case ${nextIndex}`,
            status: "pending",
          });
      applyPayload(response.data as TestSheetPayload);
      setCurrentPage(1); // Reset to first page after adding row
    } catch (error) {
      console.error(error);
      toast.error("Failed to add row.");
    } finally {
      setAddingRow(false);
    }
  }, [activeTab, applyPayload, canEdit, isClientProject, projectId]);

  if (!projectId) {
    return <div className="p-6 text-sm text-red-500">Invalid project id.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full p-4 md:p-6 space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" asChild>
              <Link href={workspacePath}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Link>
            </Button>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <ClipboardList className="w-6 h-6" />
              {projectName} Test Sheet
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-xs text-muted-foreground">
              {mode === "admin"
                ? "Admin view is read-only. Manager and employee can edit in User mode."
                : "QA/Tester can add test cases. Developers can update status to Resolved."}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="ml-2"
            >
              {sidebarOpen ? (
                <>
                  <PanelRightClose className="w-4 h-4 mr-1" />
                  Hide Log
                </>
              ) : (
                <>
                  <PanelRight className="w-4 h-4 mr-1" />
                  Show Log
                </>
              )}
            </Button>
          </div>
        </div>

        <div className={`flex gap-4 ${sidebarOpen ? 'xl:grid xl:grid-cols-[1fr_380px]' : ''}`}>
          <div className="rounded-xl border border-border overflow-hidden bg-[#f4f6fb] flex-1">
            <div className="flex items-center justify-between px-3 py-2 border-b border-[#d6dce6] bg-[#e9edf4]">
              <div className="text-xs font-semibold uppercase tracking-wide text-[#213047]">
                {projectName} Test Sheet
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={() => void handleAddRow()} disabled={!canEdit || addingRow || !activeTab}>
                  <Plus className="w-4 h-4 mr-1" />
                  {addingRow ? "Adding..." : "Add Row"}
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-2 border-b border-[#d6dce6] bg-white px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Cell</div>
              <div className="rounded border border-[#d6dce6] bg-[#f8fafc] px-2 py-1 text-xs text-foreground min-w-[90px]">
                {selectedCell ? `${selectedCell.field}` : "--"}
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Formula Bar</div>
              <div className="flex-1 rounded border border-[#d6dce6] bg-[#f8fafc] px-2 py-1 text-xs text-foreground truncate">
                {selectedCellDisplay || "Select a cell to inspect value"}
              </div>
            </div>

            <div className="max-h-[70vh] overflow-auto bg-white">
              <table
                className="border-separate border-spacing-0 text-[12px]"
                style={{ minWidth: `${testSheetTableMinWidth}px` }}
              >
                <thead>
                  <tr>
                    <th className="sticky top-0 left-0 z-20 w-[52px] border border-[#d6dce6] bg-[#217346] px-2 py-1.5 text-[11px] font-semibold text-white">
                      #
                    </th>
                    {columnConfig.map((column) => (
                      <th
                        key={column.key}
                        className={`sticky top-0 z-10 border border-[#d6dce6] bg-[#217346] px-2 py-1.5 text-left text-[11px] font-semibold text-white ${column.widthClass}`}
                        onDoubleClick={() => {
                          if (canEdit) {
                            setEditingColumnKey(column.key);
                            setEditingColumnTitle(getColumnTitle(column));
                          }
                        }}
                      >
                        <div className="font-mono text-[10px] text-white/75">{column.letter}</div>
                        {editingColumnKey === column.key ? (
                          <Input
                            value={editingColumnTitle}
                            onChange={(e) => setEditingColumnTitle(e.target.value)}
                            onBlur={saveEditedColumnTitle}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                (e.currentTarget as HTMLInputElement).blur();
                              }
                              if (e.key === "Escape") {
                                setEditingColumnKey(null);
                                setEditingColumnTitle("");
                              }
                            }}
                            autoFocus
                            className="h-5 bg-white text-black font-semibold mt-1"
                          />
                        ) : (
                          <div>{getColumnTitle(column)}</div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={columnConfig.length + 1} className="border border-[#d6dce6] px-3 py-4 text-muted-foreground">
                        Loading test sheet...
                      </td>
                    </tr>
                  ) : !activeTab || activeTab.cases.length === 0 ? (
                    <tr>
                      <td colSpan={columnConfig.length + 1} className="border border-[#d6dce6] px-3 py-4 text-muted-foreground">
                        No test cases yet. Use <span className="font-medium text-foreground">Add Row</span> to start.
                      </td>
                    </tr>
                  ) : (
                    paginatedCases.map((row, rowIndex) => (
                      <tr key={row.id} className="align-top">
                        <td className="sticky left-0 z-[5] border border-[#d6dce6] bg-[#f0f4f9] px-2 py-1.5 font-semibold text-[#31435b]">
                          {(currentPage - 1) * rowsPerPage + rowIndex + 1}
                        </td>

                        {columnConfig.map((column) => {
                          const cellKey = `${row.id}:${column.key}`;

                          if (column.key === "updatedAt") {
                            return (
                              <td key={column.key} className="border border-[#d6dce6] px-2 py-1.5 text-[11px] text-muted-foreground">
                                {formatDateTime(row.updatedAt)}
                              </td>
                            );
                          }

                          if (column.key === "qaUserId" || column.key === "developerUserId") {
                            const fieldKey = column.key as "qaUserId" | "developerUserId";
                            const selectedValue = String(readCaseFieldValue(row, column.key) || "");
                            return (
                              <td key={column.key} className="border border-[#d6dce6] px-1 py-1">
                                <select
                                  value={selectedValue}
                                  disabled={!canEdit || savingCellKey === cellKey}
                                  className="h-8 w-full rounded border border-[#d6dce6] bg-white px-2 text-[12px]"
                                  onFocus={() => setSelectedCell({ caseId: row.id, field: fieldKey })}
                                  onChange={(event) =>
                                    void commitCell(row, fieldKey, event.target.value)
                                  }
                                >
                                  <option value="">Unassigned</option>
                                  {members.map((member) => (
                                    <option key={member.userId} value={member.userId}>
                                      {personLabel(member)}
                                    </option>
                                  ))}
                                </select>
                              </td>
                            );
                          }

                          if (column.key === "status") {
                            return (
                              <td key={column.key} className="border border-[#d6dce6] px-1 py-1">
                                <select
                                  value={row.status}
                                  disabled={!canEdit || savingCellKey === cellKey}
                                  className={`h-8 w-full rounded border px-2 text-[12px] ${
                                    row.status === "resolved"
                                      ? "border-green-300 bg-green-50 text-green-700"
                                      : "border-amber-300 bg-amber-50 text-amber-700"
                                  }`}
                                  onFocus={() => setSelectedCell({ caseId: row.id, field: "status" })}
                                  onChange={(event) =>
                                    void commitCell(row, "status", event.target.value)
                                  }
                                >
                                  <option value="pending">Pending</option>
                                  <option value="resolved">Resolved</option>
                                </select>
                              </td>
                            );
                          }

                          const value = String(readCaseFieldValue(row, column.key) || "");
                          const fieldKey = column.key as Exclude<
                            EditableField,
                            "status" | "qaUserId" | "developerUserId"
                          >;

                          return (
                            <td key={column.key} className="border border-[#d6dce6] px-1 py-1">
                              <Input
                                key={`${row.id}:${column.key}:${row.updatedAt}`}
                                defaultValue={value}
                                disabled={!canEdit || savingCellKey === cellKey}
                                className="h-8 border-[#d6dce6] text-[12px]"
                                onFocus={() => setSelectedCell({ caseId: row.id, field: fieldKey })}
                                onBlur={(event) =>
                                  void commitCell(row, fieldKey, event.target.value)
                                }
                                onKeyDown={(event) => {
                                  if (event.key === "Enter") {
                                    (event.currentTarget as HTMLInputElement).blur();
                                  }
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-3 py-2 border-t border-[#d6dce6] bg-white">
                  <div className="text-xs text-muted-foreground">
                    Showing {((currentPage - 1) * rowsPerPage) + 1} to {Math.min(currentPage * rowsPerPage, activeTab?.cases?.length || 0)} of {activeTab?.cases?.length || 0} rows
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(1)}
                      className="h-7 px-2 text-xs"
                    >
                      First
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(currentPage - 1)}
                      className="h-7 px-2 text-xs"
                    >
                      Prev
                    </Button>
                    <span className="text-xs text-muted-foreground px-2">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(currentPage + 1)}
                      className="h-7 px-2 text-xs"
                    >
                      Next
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(totalPages)}
                      className="h-7 px-2 text-xs"
                    >
                      Last
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-[#d6dce6] bg-[#eef2f7] px-3 py-2 flex flex-wrap items-center gap-2">
              {(tabs || []).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTabId(tab.id)}
                  className={`rounded-md border px-3 py-1 text-xs font-medium transition ${
                    activeTab?.id === tab.id
                      ? "border-[#217346] bg-[#217346] text-white"
                      : "border-[#c8d2e1] bg-white text-[#34485f] hover:bg-[#f8fbff]"
                  }`}
                >
                  {tab.name}
                </button>
              ))}

              {canEdit ? (
                <div className="ml-auto flex items-center gap-2">
                  <Input
                    value={newTabName}
                    onChange={(event) => setNewTabName(event.target.value)}
                    placeholder="New tab name"
                    className="h-8 w-[170px] bg-white"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => void handleCreateTab()}
                    disabled={creatingTab}
                  >
                    {creatingTab ? "Creating..." : "Add Tab"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          {sidebarOpen && (
            <div className="rounded-xl border border-border bg-card w-full xl:w-[380px] shrink-0">
              <div className="border-b border-border px-4 py-3">
                <h2 className="text-sm font-semibold">Version Log</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  Every save in the sheet is tracked like lightweight version history.
                </p>
              </div>
              <div className="overflow-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground w-[60px]">Action</th>
                      <th className="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground w-[100px]">Summary</th>
                      <th className="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground w-[80px]">Field</th>
                      <th className="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground w-[80px]">User</th>
                      <th className="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground w-[90px]">Date</th>
                      <th className="border-b border-border px-3 py-2 text-center font-medium text-muted-foreground w-[50px]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.length ? (
                      paginatedLogs.map((log) => {
                        const actor =
                          log.changedByUserName ||
                          (log.changedByUserId
                            ? personLabel(memberMap.get(log.changedByUserId) || { userId: log.changedByUserId })
                            : "Unknown user");
                        const isEditing = editingLogId === log.id;
                        return (
                          <tr key={log.id} className="border-b border-border hover:bg-muted/30">
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <Input
                                  value={logEditData.action}
                                  onChange={(e) => setLogEditData({ ...logEditData, action: e.target.value })}
                                  className="h-6 text-xs"
                                />
                              ) : (
                                <span className="text-foreground">{log.action || "-"}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <Input
                                  value={logEditData.summary}
                                  onChange={(e) => setLogEditData({ ...logEditData, summary: e.target.value })}
                                  className="h-6 text-xs"
                                />
                              ) : (
                                <span className="text-foreground">{log.summary || "-"}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <Input
                                  value={logEditData.fieldName}
                                  onChange={(e) => setLogEditData({ ...logEditData, fieldName: e.target.value })}
                                  className="h-6 text-xs"
                                />
                              ) : (
                                <span className="text-muted-foreground">{log.fieldName || "-"}</span>
                              )}
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-muted-foreground">{actor}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-muted-foreground">{formatDateTime(log.createdAt)}</span>
                            </td>
                            <td className="px-3 py-2">
                              {isEditing ? (
                                <div className="flex items-center gap-1 justify-center">
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={() => {
                                      // Here we would save - for now just close edit mode
                                      cancelEditLog();
                                      toast.success("Log entry updated (demo)");
                                    }}
                                  >
                                    <Save className="w-3 h-3 text-green-600" />
                                  </Button>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-6 w-6"
                                    onClick={cancelEditLog}
                                  >
                                    <X className="w-3 h-3 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-6 w-6"
                                  onClick={() => startEditLog(log)}
                                >
                                  <Edit3 className="w-3 h-3" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-3 py-4 text-center text-muted-foreground">
                          No changes logged yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>

                {/* Version Log Pagination */}
                {totalLogPages > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 border-t border-border bg-muted/30">
                    <div className="text-xs text-muted-foreground">
                      {payload?.logs?.length} total entries
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={logPage === 1}
                        onClick={() => setLogPage(1)}
                        className="h-6 w-6"
                      >
                        <span className="text-xs">«</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={logPage === 1}
                        onClick={() => setLogPage(logPage - 1)}
                        className="h-6 w-6"
                      >
                        <span className="text-xs">‹</span>
                      </Button>
                      <span className="text-xs text-muted-foreground px-1">
                        {logPage}/{totalLogPages}
                      </span>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={logPage === totalLogPages}
                        onClick={() => setLogPage(logPage + 1)}
                        className="h-6 w-6"
                      >
                        <span className="text-xs">›</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        disabled={logPage === totalLogPages}
                        onClick={() => setLogPage(totalLogPages)}
                        className="h-6 w-6"
                      >
                        <span className="text-xs">»</span>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
