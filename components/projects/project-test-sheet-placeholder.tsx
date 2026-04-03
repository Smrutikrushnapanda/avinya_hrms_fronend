"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type ClipboardEvent, type DragEvent } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, ClipboardList, Plus, PanelRight, PanelRightClose, Upload, X } from "lucide-react";
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
  updateClientProjectTestSheetColumns,
  updateClientProjectTestCase,
  uploadFile,
  updateProjectTestSheetColumns,
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
type ColumnInputType = "text" | "dropdown" | "color" | "image";

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
  columnHeaders?: Record<string, string> | null;
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

const defaultColumnCount = 26;

const baseColumnConfig: Array<Omit<TestSheetColumn, "letter">> = [
  { key: "caseCode", defaultTitle: "Case ID", widthClass: "min-w-[120px]" },
  { key: "title", defaultTitle: "Test Case", widthClass: "min-w-[220px]" },
  { key: "steps", defaultTitle: "Steps", widthClass: "min-w-[240px]" },
  { key: "expectedResult", defaultTitle: "Expected Result", widthClass: "min-w-[240px]" },
  { key: "actualResult", defaultTitle: "Actual Result", widthClass: "min-w-[240px]" },
  { key: "qaUserId", defaultTitle: "QA / Tester", widthClass: "min-w-[180px]" },
  { key: "developerUserId", defaultTitle: "Developer", widthClass: "min-w-[180px]" },
  { key: "status", defaultTitle: "Status", widthClass: "min-w-[140px]" },
];

const updatedAtColumn: Omit<TestSheetColumn, "letter"> = {
  key: "updatedAt",
  defaultTitle: "Updated At",
  widthClass: "min-w-[170px]",
};

const customColumnConfig: Array<Omit<TestSheetColumn, "letter">> = Array.from(
  { length: Math.max(defaultColumnCount - baseColumnConfig.length - 1, 0) },
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

const columnConfig: TestSheetColumn[] = [...baseColumnConfig, ...customColumnConfig, updatedAtColumn].map((column, index) => ({
  ...column,
  letter: getColumnLetter(index),
}));

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

function normalizeColumnHeaders(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const parsed = input as Record<string, unknown>;
  const normalized: Record<string, string> = {};

  columnConfig.forEach((column) => {
    const value = parsed[column.key];
    if (typeof value === "string" && value.trim()) {
      normalized[column.key] = value.trim();
    }
  });

  return normalized;
}

function readCaseFieldValue(row: TestSheetCase, field: BaseColumnKey) {
  if (field === "updatedAt") return row.updatedAt;
  return row[field] ?? "";
}

function customCellKey(tabId: string, caseId: string, columnKey: ColumnKey) {
  return `${tabId}:${caseId}:${columnKey}`;
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
  const [selectedCell, setSelectedCell] = useState<{ caseId: string; field: ColumnKey } | null>(null);
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [columnTitles, setColumnTitles] = useState<Record<string, string>>({});
  const [savingColumnHeaders, setSavingColumnHeaders] = useState(false);
  const [columnTypes, setColumnTypes] = useState<Record<string, ColumnInputType>>({});
  const [columnDropdownOptions, setColumnDropdownOptions] = useState<Record<string, string[]>>({});
  const [hiddenColumns, setHiddenColumns] = useState<Record<string, boolean>>({});
  const [customCellValues, setCustomCellValues] = useState<Record<string, string>>({});
  const [uploadingImageCellKey, setUploadingImageCellKey] = useState<string | null>(null);
  const [columnSettingKey, setColumnSettingKey] = useState<ColumnKey>(() => {
    const firstCustom = columnConfig.find((column) => column.isCustom);
    return firstCustom?.key || "title";
  });
  const [dropdownOptionsDraft, setDropdownOptionsDraft] = useState("");

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
  const customUiStorageKey = useMemo(
    () =>
      projectId
        ? `project-test-sheet:ui:${isClientProject ? "client" : "standalone"}:${projectId}`
        : "",
    [isClientProject, projectId],
  );

  const applyPayload = useCallback((nextPayload: TestSheetPayload) => {
    const safeTabs = Array.isArray(nextPayload?.tabs) ? nextPayload.tabs : [];
    const safeLogs = Array.isArray(nextPayload?.logs) ? nextPayload.logs : [];
    const safeColumnHeaders = normalizeColumnHeaders(nextPayload?.columnHeaders);

    setPayload({
      ...nextPayload,
      tabs: safeTabs,
      logs: safeLogs,
    });
    setColumnTitles(safeColumnHeaders);

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
    if (!customUiStorageKey) return;
    try {
      const raw = localStorage.getItem(customUiStorageKey);
      if (!raw) return;

      const parsed = JSON.parse(raw) as {
        columnTypes?: Record<string, ColumnInputType>;
        columnDropdownOptions?: Record<string, string[]>;
        hiddenColumns?: Record<string, boolean>;
        customCellValues?: Record<string, string>;
      };

      if (parsed?.columnTypes && typeof parsed.columnTypes === "object") {
        setColumnTypes(parsed.columnTypes);
      }
      if (parsed?.columnDropdownOptions && typeof parsed.columnDropdownOptions === "object") {
        setColumnDropdownOptions(parsed.columnDropdownOptions);
      }
      if (parsed?.hiddenColumns && typeof parsed.hiddenColumns === "object") {
        setHiddenColumns(parsed.hiddenColumns);
      }
      if (parsed?.customCellValues && typeof parsed.customCellValues === "object") {
        setCustomCellValues(parsed.customCellValues);
      }
    } catch (error) {
      console.error(error);
    }
  }, [customUiStorageKey]);

  useEffect(() => {
    if (!customUiStorageKey) return;
    const payloadToStore = {
      columnTypes,
      columnDropdownOptions,
      hiddenColumns,
      customCellValues,
    };
    localStorage.setItem(customUiStorageKey, JSON.stringify(payloadToStore));
  }, [columnDropdownOptions, columnTypes, customCellValues, customUiStorageKey, hiddenColumns]);

  const tabs = useMemo(() => payload?.tabs ?? [], [payload?.tabs]);

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

  const getColumnTitle = useCallback(
    (column: TestSheetColumn) => columnTitles[column.key] || column.defaultTitle,
    [columnTitles],
  );

  const visibleColumns = useMemo(
    () => columnConfig.filter((column) => !hiddenColumns[column.key]),
    [hiddenColumns],
  );
  const visibleTableMinWidth = 52 + visibleColumns.length * 170;
  const configurableColumns = useMemo(
    () => visibleColumns.filter((column) => column.isCustom),
    [visibleColumns],
  );
  const getColumnInputType = useCallback(
    (columnKey: ColumnKey): ColumnInputType =>
      columnTypes[columnKey] || "text",
    [columnTypes],
  );
  const selectedConfigType = getColumnInputType(columnSettingKey);

  useEffect(() => {
    if (!selectedCell) return;
    if (String(selectedCell.field).startsWith("custom_")) {
      setColumnSettingKey(selectedCell.field);
    }
  }, [selectedCell]);

  useEffect(() => {
    if (!configurableColumns.length) return;
    if (!configurableColumns.some((column) => column.key === columnSettingKey)) {
      setColumnSettingKey(configurableColumns[0].key);
    }
  }, [columnSettingKey, configurableColumns]);

  useEffect(() => {
    const options = columnDropdownOptions[columnSettingKey] || [];
    setDropdownOptionsDraft(options.join(", "));
  }, [columnDropdownOptions, columnSettingKey]);

  const saveEditedColumnTitle = useCallback(async () => {
    if (!editingColumnKey || !projectId) return;

    const defaultTitle =
      columnConfig.find((column) => column.key === editingColumnKey)?.defaultTitle || "";
    const nextTitle = editingColumnTitle.trim();
    const currentTitle = columnTitles[editingColumnKey] || defaultTitle;
    const normalizedTitle = nextTitle || defaultTitle;

    if (currentTitle === normalizedTitle) {
      setEditingColumnKey(null);
      setEditingColumnTitle("");
      return;
    }

    const nextHeaders = { ...columnTitles };
    if (!nextTitle || nextTitle === defaultTitle) {
      delete nextHeaders[editingColumnKey];
    } else {
      nextHeaders[editingColumnKey] = nextTitle;
    }

    try {
      setSavingColumnHeaders(true);
      const response = isClientProject
        ? await updateClientProjectTestSheetColumns(projectId, { columnHeaders: nextHeaders })
        : await updateProjectTestSheetColumns(projectId, { columnHeaders: nextHeaders });
      const nextPayload = response.data as TestSheetPayload;
      setPayload((previous) => {
        if (!previous) return nextPayload;
        const safeLogs = Array.isArray(nextPayload?.logs) ? nextPayload.logs : previous.logs;
        return {
          ...previous,
          logs: safeLogs,
          columnHeaders: nextPayload?.columnHeaders || {},
        };
      });
      setColumnTitles(normalizeColumnHeaders(nextPayload?.columnHeaders));
      toast.success("Column name updated.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update column name.");
    } finally {
      setSavingColumnHeaders(false);
      setEditingColumnKey(null);
      setEditingColumnTitle("");
    }
  }, [columnTitles, editingColumnKey, editingColumnTitle, isClientProject, projectId]);

  const saveDropdownOptions = useCallback(() => {
    if (!String(columnSettingKey).startsWith("custom_")) return;

    const parsedOptions = dropdownOptionsDraft
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 50);

    setColumnDropdownOptions((previous) => ({
      ...previous,
      [columnSettingKey]: parsedOptions,
    }));
    toast.success("Dropdown options updated.");
  }, [columnSettingKey, dropdownOptionsDraft]);

  const removeCustomColumn = useCallback((columnKey: ColumnKey) => {
    if (!String(columnKey).startsWith("custom_")) return;

    setHiddenColumns((previous) => ({ ...previous, [columnKey]: true }));
    setColumnTypes((previous) => {
      const next = { ...previous };
      delete next[columnKey];
      return next;
    });
    setColumnDropdownOptions((previous) => {
      const next = { ...previous };
      delete next[columnKey];
      return next;
    });
    setColumnTitles((previous) => {
      const next = { ...previous };
      delete next[columnKey];
      return next;
    });
    setCustomCellValues((previous) => {
      const next: Record<string, string> = {};
      Object.entries(previous).forEach(([key, value]) => {
        if (!key.endsWith(`:${columnKey}`)) {
          next[key] = value;
        }
      });
      return next;
    });
    toast.success("Column removed.");
  }, []);

  const showAllColumns = useCallback(() => {
    setHiddenColumns({});
  }, []);

  const setCustomValue = useCallback((row: TestSheetCase, columnKey: ColumnKey, value: string) => {
    const key = customCellKey(row.tabId, row.id, columnKey);
    setCustomCellValues((previous) => ({
      ...previous,
      [key]: value,
    }));
  }, []);

  const uploadImageForCell = useCallback(
    async (file: File, row: TestSheetCase, columnKey: ColumnKey) => {
      if (!file) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Image must be under 10MB.");
        return;
      }

      const key = customCellKey(row.tabId, row.id, columnKey);
      try {
        setUploadingImageCellKey(key);
        const formData = new FormData();
        formData.append("file", file);
        const response = await uploadFile(formData, { path: "projects/test-sheet", public: true });
        const url =
          response?.data?.url ||
          response?.data?.secureUrl ||
          response?.data?.fileUrl ||
          "";
        if (!url) {
          toast.error("Image upload did not return a URL.");
          return;
        }
        setCustomValue(row, columnKey, url);
        toast.success("Image uploaded.");
      } catch (error) {
        console.error(error);
        toast.error("Failed to upload image.");
      } finally {
        setUploadingImageCellKey(null);
      }
    },
    [setCustomValue],
  );

  const handleImageDrop = useCallback(
    (event: DragEvent<HTMLDivElement>, row: TestSheetCase, columnKey: ColumnKey) => {
      event.preventDefault();
      const file = event.dataTransfer?.files?.[0];
      if (file) {
        void uploadImageForCell(file, row, columnKey);
      }
    },
    [uploadImageForCell],
  );

  const handleImagePaste = useCallback(
    (event: ClipboardEvent<HTMLDivElement>, row: TestSheetCase, columnKey: ColumnKey) => {
      const fileItem = Array.from(event.clipboardData.items).find((item) =>
        item.type.startsWith("image/"),
      );
      if (!fileItem) return;
      const file = fileItem.getAsFile();
      if (file) {
        event.preventDefault();
        void uploadImageForCell(file, row, columnKey);
      }
    },
    [uploadImageForCell],
  );

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

            <div className="flex flex-wrap items-center gap-2 border-b border-[#d6dce6] bg-white px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Column</div>
              <select
                value={columnSettingKey}
                onChange={(event) => setColumnSettingKey(event.target.value as ColumnKey)}
                disabled={!configurableColumns.length}
                className="h-8 min-w-[170px] rounded border border-[#d6dce6] bg-[#f8fafc] px-2 text-xs"
              >
                {configurableColumns.length ? (
                  configurableColumns.map((column) => (
                    <option key={column.key} value={column.key}>
                      {column.letter} - {getColumnTitle(column)}
                    </option>
                  ))
                ) : (
                  <option value="">No custom columns</option>
                )}
              </select>

              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Type</div>
              <select
                value={selectedConfigType}
                disabled={!configurableColumns.length}
                onChange={(event) =>
                  setColumnTypes((previous) => ({
                    ...previous,
                    [columnSettingKey]: event.target.value as ColumnInputType,
                  }))
                }
                className="h-8 min-w-[130px] rounded border border-[#d6dce6] bg-[#f8fafc] px-2 text-xs"
              >
                <option value="text">Text</option>
                <option value="dropdown">Dropdown</option>
                <option value="color">Color</option>
                <option value="image">Image</option>
              </select>

              {selectedConfigType === "dropdown" ? (
                <>
                  <Input
                    value={dropdownOptionsDraft}
                    onChange={(event) => setDropdownOptionsDraft(event.target.value)}
                    placeholder="Dropdown options (comma separated)"
                    className="h-8 w-[280px] bg-[#f8fafc] text-xs"
                  />
                  <Button size="sm" variant="outline" onClick={saveDropdownOptions}>
                    Save Options
                  </Button>
                </>
              ) : null}

              <Button size="sm" variant="ghost" className="ml-auto" onClick={showAllColumns}>
                Show Columns
              </Button>
            </div>

            <div className="max-h-[70vh] overflow-auto bg-white">
              <table
                className="border-separate border-spacing-0 text-[12px]"
                style={{ minWidth: `${visibleTableMinWidth}px` }}
              >
                <thead>
                  <tr>
                    <th className="sticky top-0 left-0 z-20 w-[52px] border border-[#d6dce6] bg-[#217346] px-2 py-1.5 text-[11px] font-semibold text-white">
                      #
                    </th>
                    {visibleColumns.map((column) => (
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
                            onBlur={() => void saveEditedColumnTitle()}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                (e.currentTarget as HTMLInputElement).blur();
                              }
                              if (e.key === "Escape") {
                                e.preventDefault();
                                setEditingColumnKey(null);
                              }
                            }}
                            autoFocus
                            disabled={savingColumnHeaders}
                            className="h-5 bg-white text-black font-semibold mt-1"
                          />
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span>{getColumnTitle(column)}</span>
                            {canEdit && column.isCustom ? (
                              <button
                                type="button"
                                className="inline-flex h-4 w-4 items-center justify-center rounded hover:bg-white/20"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  removeCustomColumn(column.key);
                                }}
                                title="Remove column"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            ) : null}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={visibleColumns.length + 1} className="border border-[#d6dce6] px-3 py-4 text-muted-foreground">
                        Loading test sheet...
                      </td>
                    </tr>
                  ) : !activeTab || activeTab.cases.length === 0 ? (
                    <tr>
                      <td colSpan={visibleColumns.length + 1} className="border border-[#d6dce6] px-3 py-4 text-muted-foreground">
                        No test cases yet. Use <span className="font-medium text-foreground">Add Row</span> to start.
                      </td>
                    </tr>
                  ) : (
                    paginatedCases.map((row, rowIndex) => (
                      <tr key={row.id} className="align-top">
                        <td className="sticky left-0 z-[5] border border-[#d6dce6] bg-[#f0f4f9] px-2 py-1.5 font-semibold text-[#31435b]">
                          {(currentPage - 1) * rowsPerPage + rowIndex + 1}
                        </td>

                        {visibleColumns.map((column) => {
                          const cellKey = `${row.id}:${column.key}`;

                          if (column.isCustom) {
                            const type = getColumnInputType(column.key);
                            const customKey = customCellKey(row.tabId, row.id, column.key);
                            const customValue = customCellValues[customKey] || "";
                            const dropdownOptions = columnDropdownOptions[column.key] || [];

                            if (type === "dropdown") {
                              return (
                                <td key={column.key} className="border border-[#d6dce6] px-1 py-1">
                                  <select
                                    value={customValue}
                                    disabled={!canEdit}
                                    className="h-8 w-full rounded border border-[#d6dce6] bg-white px-2 text-[12px]"
                                    onFocus={() => setSelectedCell({ caseId: row.id, field: column.key })}
                                    onChange={(event) => setCustomValue(row, column.key, event.target.value)}
                                  >
                                    <option value="">Select</option>
                                    {dropdownOptions.map((option) => (
                                      <option key={option} value={option}>
                                        {option}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                              );
                            }

                            if (type === "color") {
                              return (
                                <td key={column.key} className="border border-[#d6dce6] px-1 py-1">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="color"
                                      value={customValue || "#2563eb"}
                                      disabled={!canEdit}
                                      className="h-8 w-10 rounded border border-[#d6dce6] bg-white p-1"
                                      onFocus={() => setSelectedCell({ caseId: row.id, field: column.key })}
                                      onChange={(event) => setCustomValue(row, column.key, event.target.value)}
                                    />
                                    <span
                                      className="truncate text-xs font-medium"
                                      style={{ color: customValue || "#2563eb" }}
                                    >
                                      {customValue || "Pick color"}
                                    </span>
                                  </div>
                                </td>
                              );
                            }

                            if (type === "image") {
                              return (
                                <td key={column.key} className="border border-[#d6dce6] px-1 py-1">
                                  <div
                                    className="rounded border border-dashed border-[#c8d2e1] p-1"
                                    onDragOver={(event) => event.preventDefault()}
                                    onDrop={(event) => handleImageDrop(event, row, column.key)}
                                    onPaste={(event) => handleImagePaste(event, row, column.key)}
                                  >
                                    {customValue ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={customValue}
                                        alt="Uploaded"
                                        className="h-16 w-full rounded object-cover"
                                      />
                                    ) : (
                                      <div className="h-16 w-full rounded bg-[#f8fafc] text-[10px] text-muted-foreground flex items-center justify-center text-center px-2">
                                        Paste, drag-drop, or upload image
                                      </div>
                                    )}
                                    <label className="mt-1 flex cursor-pointer items-center justify-center gap-1 rounded border border-[#d6dce6] bg-white px-2 py-1 text-[10px]">
                                      <Upload className="h-3 w-3" />
                                      {uploadingImageCellKey === customKey ? "Uploading..." : "Upload"}
                                      <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        disabled={!canEdit || uploadingImageCellKey === customKey}
                                        onChange={(event) => {
                                          const file = event.target.files?.[0];
                                          if (file) {
                                            void uploadImageForCell(file, row, column.key);
                                          }
                                          event.currentTarget.value = "";
                                        }}
                                      />
                                    </label>
                                  </div>
                                </td>
                              );
                            }

                            return (
                              <td key={column.key} className="border border-[#d6dce6] px-2 py-1.5 text-[11px] text-muted-foreground">
                                <Input
                                  value={customValue}
                                  disabled={!canEdit}
                                  className="h-8 border-[#d6dce6] text-[12px]"
                                  onFocus={() => setSelectedCell({ caseId: row.id, field: column.key })}
                                  onChange={(event) => setCustomValue(row, column.key, event.target.value)}
                                />
                              </td>
                            );
                          }

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

                          const value = String(readCaseFieldValue(row, column.key as BaseColumnKey) || "");
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
                      <th className="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground w-[44px]">Sl</th>
                      <th className="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground w-[60px]">Action</th>
                      <th className="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground w-[100px]">Summary</th>
                      <th className="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground w-[80px]">Field</th>
                      <th className="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground w-[80px]">User</th>
                      <th className="border-b border-border px-3 py-2 text-left font-medium text-muted-foreground w-[90px]">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedLogs.length ? (
                      paginatedLogs.map((log, index) => {
                        const actor =
                          log.changedByUserName ||
                          (log.changedByUserId
                            ? personLabel(memberMap.get(log.changedByUserId) || { userId: log.changedByUserId })
                            : "Unknown user");
                        return (
                          <tr key={log.id} className="border-b border-border hover:bg-muted/30">
                            <td className="px-3 py-2">
                              <span className="text-muted-foreground">{(logPage - 1) * logsPerPage + index + 1}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-foreground">{log.action || "-"}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-foreground">{log.summary || "-"}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-muted-foreground">{log.fieldName || "-"}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-muted-foreground">{actor}</span>
                            </td>
                            <td className="px-3 py-2">
                              <span className="text-muted-foreground">{formatDateTime(log.createdAt)}</span>
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
                    <div className="flex items-center gap-1 flex-wrap justify-end">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={logPage === 1}
                        onClick={() => setLogPage(logPage - 1)}
                        className="h-7 px-2 text-xs"
                      >
                        Prev
                      </Button>
                      {logPageNumbers.map((pageNumber) => (
                        <Button
                          key={pageNumber}
                          size="sm"
                          variant={pageNumber === logPage ? "default" : "ghost"}
                          onClick={() => setLogPage(pageNumber)}
                          className="h-7 min-w-7 px-2 text-xs"
                        >
                          {pageNumber}
                        </Button>
                      ))}
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={logPage === totalLogPages}
                        onClick={() => setLogPage(logPage + 1)}
                        className="h-7 px-2 text-xs"
                      >
                        Next
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
