"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { useParams, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  Plus,
  PanelRight,
  PanelRightClose,
  Upload,
  X,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Eye,
  EyeOff,
  Type,
  ChevronDown,
  Palette,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  getClientProject,
  createClientProjectTestCase,
  createClientProjectTestSheetTab,
  createProjectTestCase,
  createProjectTestSheetTab,
  deleteClientProjectTestCase,
  deleteProjectTestCase,
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
type ColumnKey = BaseColumnKey;
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
  defaultWidth: number;
  isCustom?: boolean;
};

// Only 8 base columns + updatedAt — no custom columns K-Y
const baseColumnConfig: Array<Omit<TestSheetColumn, "letter">> = [
  { key: "caseCode", defaultTitle: "Case ID", defaultWidth: 130 },
  { key: "title", defaultTitle: "Test Case", defaultWidth: 240 },
  { key: "steps", defaultTitle: "Steps", defaultWidth: 250 },
  { key: "expectedResult", defaultTitle: "Expected Result", defaultWidth: 250 },
  { key: "actualResult", defaultTitle: "Actual Result", defaultWidth: 250 },
  { key: "qaUserId", defaultTitle: "QA / Tester", defaultWidth: 190 },
  { key: "developerUserId", defaultTitle: "Developer", defaultWidth: 190 },
  { key: "status", defaultTitle: "Status", defaultWidth: 140 },
];

const updatedAtColumn: Omit<TestSheetColumn, "letter"> = {
  key: "updatedAt",
  defaultTitle: "Updated At",
  defaultWidth: 175,
};

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

const columnConfig: TestSheetColumn[] = [...baseColumnConfig, updatedAtColumn].map(
  (column, index) => ({ ...column, letter: getColumnLetter(index) }),
);
const allColumnKeys = columnConfig.map((c) => c.key);

// Per-column type override map (all base columns can be overridden)
const BASE_COLUMN_TYPES: Record<ColumnKey, ColumnInputType> = {
  caseCode: "text",
  title: "text",
  steps: "text",
  expectedResult: "text",
  actualResult: "text",
  qaUserId: "dropdown",
  developerUserId: "dropdown",
  status: "dropdown",
  updatedAt: "text",
};

function personLabel(member: ProjectMember) {
  const name = [member.firstName, member.lastName].filter(Boolean).join(" ").trim();
  return name || member.workEmail || member.email || member.userId.slice(0, 8);
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-IN", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function normalizeValue(field: EditableField, value: string): string | null | TestCaseStatus {
  if (field === "status") return value === "resolved" ? "resolved" : "pending";
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
  return candidate.trim() || "Project";
}

function normalizeColumnHeaders(input: unknown): Record<string, string> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const parsed = input as Record<string, unknown>;
  const normalized: Record<string, string> = {};
  columnConfig.forEach((col) => {
    const value = parsed[col.key];
    if (typeof value === "string" && value.trim()) normalized[col.key] = value.trim();
  });
  return normalized;
}

function normalizeColumnOrder(input: unknown): ColumnKey[] {
  const fallback = [...allColumnKeys];
  if (!Array.isArray(input)) return fallback;
  const unique = new Set<ColumnKey>();
  input.forEach((value) => {
    const key = String(value || "") as ColumnKey;
    if (allColumnKeys.includes(key)) unique.add(key);
  });
  allColumnKeys.forEach((key) => { if (!unique.has(key)) unique.add(key); });
  return Array.from(unique);
}

function normalizeColumnWidths(input: unknown): Record<string, number> {
  if (!input || typeof input !== "object" || Array.isArray(input)) return {};
  const parsed = input as Record<string, unknown>;
  const normalized: Record<string, number> = {};
  allColumnKeys.forEach((key) => {
    const raw = Number(parsed[key]);
    if (Number.isFinite(raw) && raw >= 80 && raw <= 1200) normalized[key] = Math.round(raw);
  });
  return normalized;
}

function readCaseFieldValue(row: TestSheetCase, field: BaseColumnKey) {
  if (field === "updatedAt") return row.updatedAt;
  return row[field] ?? "";
}

// ─── Cell background based on type ──────────────────────────────────────────
function getCellBg(type: ColumnInputType): string {
  switch (type) {
    case "dropdown": return "#f0f7ff";
    case "color":    return "#fdf7ff";
    case "image":    return "#f7fdf9";
    default:         return "#ffffff";
  }
}

// ─── Type icon ───────────────────────────────────────────────────────────────
function TypeIcon({ type, size = 10 }: { type: ColumnInputType; size?: number }) {
  if (type === "dropdown") return <ChevronDown style={{ width: size, height: size }} />;
  if (type === "color")    return <Palette     style={{ width: size, height: size }} />;
  if (type === "image")    return <ImageIcon   style={{ width: size, height: size }} />;
  return <Type style={{ width: size, height: size }} />;
}

export default function ProjectTestSheet({ mode }: { mode: "user" | "admin" }) {
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
  const [selectedCell, setSelectedCell] = useState<{ caseId: string; colKey: ColumnKey } | null>(null);
  const [savingCellKey, setSavingCellKey] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [columnTitles, setColumnTitles] = useState<Record<string, string>>({});
  const [savingColumnHeaders, setSavingColumnHeaders] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<Record<string, boolean>>({});
  const [columnOrder, setColumnOrder] = useState<ColumnKey[]>(() => [...allColumnKeys]);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const [draggedColumnKey, setDraggedColumnKey] = useState<ColumnKey | null>(null);
  const [uploadingImageCellKey, setUploadingImageCellKey] = useState<string | null>(null);
  const [deletingRowId, setDeletingRowId] = useState<string | null>(null);
  const [editingColumnKey, setEditingColumnKey] = useState<ColumnKey | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState("");

  // Per-column type overrides (stored locally)
  const [columnTypeOverrides, setColumnTypeOverrides] = useState<Partial<Record<ColumnKey, ColumnInputType>>>({});
  // Per-column dropdown options (stored locally)
  const [columnDropdownOptions, setColumnDropdownOptions] = useState<Record<string, string[]>>({});
  // Per-cell custom values (for color/image/text override)
  const [customCellValues, setCustomCellValues] = useState<Record<string, string>>({});

  // Context menu for column header right-click
  const [contextMenu, setContextMenu] = useState<{
    columnKey: ColumnKey;
    x: number;
    y: number;
  } | null>(null);
  const [dropdownDraft, setDropdownDraft] = useState("");

  const resizingStateRef = useRef<{
    columnKey: ColumnKey;
    startX: number;
    startWidth: number;
  } | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 20;
  const [logPage, setLogPage] = useState(1);
  const logsPerPage = 10;

  const canEdit = mode === "user";

  const storageKey = useMemo(
    () => projectId ? `pts:ui:${isClientProject ? "c" : "s"}:${projectId}` : "",
    [isClientProject, projectId],
  );

  const applyPayload = useCallback((next: TestSheetPayload) => {
    const safeTabs = Array.isArray(next?.tabs) ? next.tabs : [];
    const safeLogs = Array.isArray(next?.logs) ? next.logs : [];
    setPayload({ ...next, tabs: safeTabs, logs: safeLogs });
    setColumnTitles(normalizeColumnHeaders(next?.columnHeaders));
    setActiveTabId((prev) => {
      const resolved = safeTabs.some((t) => t.id === prev) ? prev : safeTabs[0]?.id || "";
      const count = safeTabs.find((t) => t.id === resolved)?.cases?.length || 0;
      setCurrentPage((p) => Math.min(p, Math.max(1, Math.ceil(count / rowsPerPage))));
      return resolved;
    });
    setLogPage((p) => Math.min(p, Math.max(1, Math.ceil(safeLogs.length / logsPerPage))));
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
    } catch (e) {
      console.error(e);
      toast.error("Failed to load test sheet.");
    } finally {
      setLoading(false);
    }
  }, [applyPayload, isClientProject, projectId]);

  useEffect(() => { void fetchTestSheet(); }, [fetchTestSheet]);

  // Load from localStorage
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        columnTypeOverrides?: Partial<Record<ColumnKey, ColumnInputType>>;
        columnDropdownOptions?: Record<string, string[]>;
        hiddenColumns?: Record<string, boolean>;
        customCellValues?: Record<string, string>;
        columnOrder?: ColumnKey[];
        columnWidths?: Record<string, number>;
      };
      if (parsed?.columnTypeOverrides) setColumnTypeOverrides(parsed.columnTypeOverrides);
      if (parsed?.columnDropdownOptions) setColumnDropdownOptions(parsed.columnDropdownOptions);
      if (parsed?.hiddenColumns) setHiddenColumns(parsed.hiddenColumns);
      if (parsed?.customCellValues) setCustomCellValues(parsed.customCellValues);
      if (parsed?.columnOrder) setColumnOrder(normalizeColumnOrder(parsed.columnOrder));
      if (parsed?.columnWidths) setColumnWidths(normalizeColumnWidths(parsed.columnWidths));
    } catch (e) { console.error(e); }
  }, [storageKey]);

  // Persist to localStorage
  useEffect(() => {
    if (!storageKey) return;
    localStorage.setItem(storageKey, JSON.stringify({
      columnTypeOverrides, columnDropdownOptions, hiddenColumns,
      customCellValues, columnOrder, columnWidths,
    }));
  }, [columnTypeOverrides, columnDropdownOptions, hiddenColumns, customCellValues, columnOrder, columnWidths, storageKey]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, [contextMenu]);

  const tabs = useMemo(() => payload?.tabs ?? [], [payload]);
  const activeTab = useMemo(
    () => (tabs.length ? tabs.find((t) => t.id === activeTabId) || tabs[0] : null),
    [activeTabId, tabs],
  );

  const paginatedCases = useMemo(() => {
    if (!activeTab?.cases) return [];
    return activeTab.cases.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage);
  }, [activeTab, currentPage]);

  const totalPages = Math.ceil((activeTab?.cases?.length || 0) / rowsPerPage);

  const paginatedLogs = useMemo(() => {
    if (!payload?.logs) return [];
    return payload.logs.slice((logPage - 1) * logsPerPage, logPage * logsPerPage);
  }, [payload?.logs, logPage]);

  const totalLogPages = Math.ceil((payload?.logs?.length || 0) / logsPerPage);

  const memberMap = useMemo(() => {
    const m = new Map<string, ProjectMember>();
    members.forEach((mb) => m.set(mb.userId, mb));
    return m;
  }, [members]);

  const getColumnTitle = useCallback(
    (col: TestSheetColumn) => columnTitles[col.key] || col.defaultTitle,
    [columnTitles],
  );

  const getEffectiveType = useCallback(
    (key: ColumnKey): ColumnInputType =>
      columnTypeOverrides[key] ?? BASE_COLUMN_TYPES[key] ?? "text",
    [columnTypeOverrides],
  );

  const orderedColumns = useMemo(() => {
    const normalized = normalizeColumnOrder(columnOrder);
    const map = new Map(columnConfig.map((c) => [c.key, c]));
    return normalized.map((k) => map.get(k)).filter((c): c is TestSheetColumn => !!c);
  }, [columnOrder]);

  const visibleColumns = useMemo(
    () => orderedColumns.filter((c) => !hiddenColumns[c.key]),
    [hiddenColumns, orderedColumns],
  );

  const getColumnWidth = useCallback(
    (col: TestSheetColumn) => {
      const saved = columnWidths[col.key];
      return typeof saved === "number" && Number.isFinite(saved)
        ? Math.max(80, Math.min(1200, saved))
        : col.defaultWidth;
    },
    [columnWidths],
  );

  const tableMinWidth = useMemo(
    () => 60 + visibleColumns.reduce((s, c) => s + getColumnWidth(c), 0),
    [getColumnWidth, visibleColumns],
  );

  // ── Column resize ──────────────────────────────────────────────────────────
  const startColumnResize = useCallback(
    (e: ReactMouseEvent<HTMLDivElement>, col: TestSheetColumn) => {
      e.preventDefault();
      e.stopPropagation();
      resizingStateRef.current = { columnKey: col.key, startX: e.clientX, startWidth: getColumnWidth(col) };
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [getColumnWidth],
  );

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const s = resizingStateRef.current;
      if (!s) return;
      const next = Math.max(80, Math.min(1200, s.startWidth + (e.clientX - s.startX)));
      setColumnWidths((p) => ({ ...p, [s.columnKey]: Math.round(next) }));
    };
    const onUp = () => {
      if (resizingStateRef.current) {
        resizingStateRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, []);

  // ── Column drag-reorder ────────────────────────────────────────────────────
  const handleColumnDragStart = useCallback((e: DragEvent<HTMLElement>, key: ColumnKey) => {
    if (!canEdit) return;
    e.dataTransfer.effectAllowed = "move";
    setDraggedColumnKey(key);
  }, [canEdit]);

  const handleColumnDrop = useCallback((e: DragEvent<HTMLElement>, targetKey: ColumnKey) => {
    e.preventDefault();
    if (!draggedColumnKey || draggedColumnKey === targetKey) { setDraggedColumnKey(null); return; }
    setColumnOrder((prev) => {
      const normalized = normalizeColumnOrder(prev);
      const si = normalized.indexOf(draggedColumnKey);
      const ti = normalized.indexOf(targetKey);
      if (si < 0 || ti < 0) return normalized;
      const next = [...normalized];
      const [m] = next.splice(si, 1);
      next.splice(ti, 0, m);
      return next;
    });
    setDraggedColumnKey(null);
  }, [draggedColumnKey]);

  // ── Custom cell values ─────────────────────────────────────────────────────
  const customKey = useCallback(
    (row: TestSheetCase, colKey: ColumnKey) => `${row.tabId}:${row.id}:${colKey}`,
    [],
  );

  const setCustomVal = useCallback((row: TestSheetCase, colKey: ColumnKey, val: string) => {
    setCustomCellValues((p) => ({ ...p, [customKey(row, colKey)]: val }));
  }, [customKey]);

  const getCustomVal = useCallback(
    (row: TestSheetCase, colKey: ColumnKey) => customCellValues[customKey(row, colKey)] || "",
    [customCellValues, customKey],
  );

  // ── Image upload ───────────────────────────────────────────────────────────
  const uploadImage = useCallback(async (file: File, row: TestSheetCase, colKey: ColumnKey) => {
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be under 10MB."); return; }
    const ck = customKey(row, colKey);
    try {
      setUploadingImageCellKey(ck);
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadFile(fd, { path: "projects/test-sheet", public: true });
      const url = res?.data?.url || res?.data?.secureUrl || res?.data?.fileUrl || "";
      if (!url) { toast.error("Upload did not return a URL."); return; }
      setCustomVal(row, colKey, url);
      toast.success("Image uploaded.");
    } catch (e) { console.error(e); toast.error("Failed to upload image."); }
    finally { setUploadingImageCellKey(null); }
  }, [customKey, setCustomVal]);

  const handleImageDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, row: TestSheetCase, colKey: ColumnKey) => {
      e.preventDefault();
      const file = e.dataTransfer?.files?.[0];
      if (file) void uploadImage(file, row, colKey);
    }, [uploadImage]);

  const handleImagePaste = useCallback(
    (e: ClipboardEvent<HTMLDivElement>, row: TestSheetCase, colKey: ColumnKey) => {
      const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith("image/"));
      if (!item) return;
      const file = item.getAsFile();
      if (file) { e.preventDefault(); void uploadImage(file, row, colKey); }
    }, [uploadImage]);

  // ── Commit cell ────────────────────────────────────────────────────────────
  const commitCell = useCallback(async (row: TestSheetCase, field: EditableField, raw: string) => {
    if (!canEdit) return;
    const normalized = normalizeValue(field, raw);
    const current = row[field] ?? null;
    if (JSON.stringify(current) === JSON.stringify(normalized)) return;

    const patch: Record<string, unknown> = {};
    if (field === "status") patch.status = normalized as TestCaseStatus;
    else patch[field] = normalized;

    const ck = `${row.id}:${field}`;
    try {
      setSavingCellKey(ck);
      const res = isClientProject
        ? await updateClientProjectTestCase(projectId, row.id, patch)
        : await updateProjectTestCase(projectId, row.id, patch);
      applyPayload(res.data as TestSheetPayload);
    } catch (e) { console.error(e); toast.error("Failed to save."); }
    finally { setSavingCellKey(null); }
  }, [applyPayload, canEdit, isClientProject, projectId]);

  // ── Save column header ─────────────────────────────────────────────────────
  const saveEditedColumnTitle = useCallback(async () => {
    if (!editingColumnKey || !projectId) return;
    const defaultTitle = columnConfig.find((c) => c.key === editingColumnKey)?.defaultTitle || "";
    const next = editingColumnTitle.trim();
    const current = columnTitles[editingColumnKey] || defaultTitle;
    const normalized = next || defaultTitle;
    if (current === normalized) { setEditingColumnKey(null); return; }

    const nextHeaders = { ...columnTitles };
    if (!next || next === defaultTitle) delete nextHeaders[editingColumnKey];
    else nextHeaders[editingColumnKey] = next;

    try {
      setSavingColumnHeaders(true);
      const res = isClientProject
        ? await updateClientProjectTestSheetColumns(projectId, { columnHeaders: nextHeaders })
        : await updateProjectTestSheetColumns(projectId, { columnHeaders: nextHeaders });
      const np = res.data as TestSheetPayload;
      setPayload((p) => p ? { ...p, logs: np?.logs || p.logs, columnHeaders: np?.columnHeaders || {} } : np);
      setColumnTitles(normalizeColumnHeaders(np?.columnHeaders));
      toast.success("Column name updated.");
    } catch (e) { console.error(e); toast.error("Failed to update column name."); }
    finally { setSavingColumnHeaders(false); setEditingColumnKey(null); setEditingColumnTitle(""); }
  }, [columnTitles, editingColumnKey, editingColumnTitle, isClientProject, projectId]);

  // ── Add tab ────────────────────────────────────────────────────────────────
  const handleCreateTab = useCallback(async () => {
    const name = newTabName.trim();
    if (!name) { toast.error("Enter a tab name."); return; }
    try {
      setCreatingTab(true);
      const res = isClientProject
        ? await createClientProjectTestSheetTab(projectId, { name })
        : await createProjectTestSheetTab(projectId, { name });
      applyPayload(res.data as TestSheetPayload);
      setNewTabName("");
      toast.success("Tab created.");
    } catch (e) { console.error(e); toast.error("Failed to create tab."); }
    finally { setCreatingTab(false); }
  }, [applyPayload, isClientProject, newTabName, projectId]);

  // ── Add row ────────────────────────────────────────────────────────────────
  const handleAddRow = useCallback(async () => {
    if (!activeTab) return;
    try {
      setAddingRow(true);
      const res = isClientProject
        ? await createClientProjectTestCase(projectId, activeTab.id, { title: "", status: "pending" })
        : await createProjectTestCase(projectId, activeTab.id, { title: "", status: "pending" });
      const np = res.data as TestSheetPayload;
      applyPayload(np);
      const nextCount = (np?.tabs || []).find((t) => t.id === activeTab.id)?.cases?.length || 0;
      setCurrentPage(Math.max(1, Math.ceil(nextCount / rowsPerPage)));
    } catch (e) { console.error(e); toast.error("Failed to add row."); }
    finally { setAddingRow(false); }
  }, [activeTab, applyPayload, isClientProject, projectId]);

  // ── Delete row ─────────────────────────────────────────────────────────────
  const handleDeleteRow = useCallback(async (row: TestSheetCase) => {
    if (!canEdit) return;
    if (!window.confirm("Delete this row permanently?")) return;
    try {
      setDeletingRowId(row.id);
      const res = isClientProject
        ? await deleteClientProjectTestCase(projectId, row.id)
        : await deleteProjectTestCase(projectId, row.id);
      applyPayload(res.data as TestSheetPayload);
      toast.success("Row deleted.");
    } catch (e) { console.error(e); toast.error("Failed to delete row."); }
    finally { setDeletingRowId(null); }
  }, [applyPayload, canEdit, isClientProject, projectId]);

  const workspaceBasePath = mode === "admin" ? `/admin/projects/${projectId}` : `/user/projects/${projectId}`;
  const workspacePath = isClientProject ? `${workspaceBasePath}?source=client` : workspaceBasePath;

  if (!projectId) return <div className="p-6 text-sm text-red-500">Invalid project id.</div>;

  // ── Styles ─────────────────────────────────────────────────────────────────
  const headerBg = "#1e7e45";
  const headerText = "#ffffff";
  const rowNumBg = "#f1f3f4";
  const borderColor = "#d0d7de";
  const tabBarBg = "#f8f9fa";
  const activeTabBg = "#1e7e45";
  const frozenShadow = "2px 0 4px rgba(0,0,0,0.08)";

  return (
    <div style={{ minHeight: "100vh", background: "#f8f9fa", fontFamily: "'Google Sans', Arial, sans-serif" }}>
      {/* ── Top bar ── */}
      <div style={{
        background: "#fff",
        borderBottom: `1px solid ${borderColor}`,
        padding: "8px 16px",
        display: "flex",
        alignItems: "center",
        gap: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}>
        <Button variant="ghost" size="sm" asChild>
          <Link href={workspacePath} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <ArrowLeft size={14} /> Back
          </Link>
        </Button>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ClipboardList size={20} color={headerBg} />
          <span style={{ fontSize: 16, fontWeight: 600, color: "#202124" }}>
            {projectName} · Test Sheet
          </span>
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 12, color: "#5f6368" }}>
            {mode === "admin" ? "Admin — read only" : "QA can add cases · Devs can resolve"}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSidebarOpen((p) => !p)}
            style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}
          >
            {sidebarOpen ? <><PanelRightClose size={13} /> Hide Log</> : <><PanelRight size={13} /> Show Log</>}
          </Button>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div style={{
        background: "#fff",
        borderBottom: `1px solid ${borderColor}`,
        padding: "4px 16px",
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}>
        <Button
          size="sm"
          onClick={() => void handleAddRow()}
          disabled={!canEdit || addingRow || !activeTab}
          style={{ background: headerBg, color: "#fff", border: "none", fontSize: 12, height: 30 }}
        >
          <Plus size={13} style={{ marginRight: 4 }} />
          {addingRow ? "Adding…" : "Add Row"}
        </Button>

        <div style={{ width: 1, height: 20, background: borderColor, margin: "0 4px" }} />

        {/* Column visibility toggle */}
        {columnConfig.map((col) => (
          <button
            key={col.key}
            title={hiddenColumns[col.key] ? `Show ${getColumnTitle(col)}` : `Hide ${getColumnTitle(col)}`}
            onClick={() => setHiddenColumns((p) => ({ ...p, [col.key]: !p[col.key] }))}
            style={{
              fontSize: 11,
              padding: "2px 8px",
              borderRadius: 4,
              border: `1px solid ${hiddenColumns[col.key] ? "#d0d7de" : borderColor}`,
              background: hiddenColumns[col.key] ? "#fafafa" : "#fff",
              color: hiddenColumns[col.key] ? "#bbb" : "#333",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: 4,
              height: 28,
            }}
          >
            {hiddenColumns[col.key] ? <EyeOff size={10} /> : <Eye size={10} />}
            {col.letter}
          </button>
        ))}
      </div>

      {/* ── Main area ── */}
      <div style={{ display: "flex", gap: 0, height: "calc(100vh - 110px)" }}>

        {/* ── Sheet ── */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>

          {/* Scrollable table */}
          <div style={{ flex: 1, overflow: "auto", background: "#fff" }}>
            <table
              style={{
                borderCollapse: "collapse",
                minWidth: `${tableMinWidth}px`,
                fontSize: 12,
                tableLayout: "fixed",
              }}
            >
              {/* ── Column header row ── */}
              <thead>
                <tr>
                  {/* Row number header */}
                  <th style={{
                    position: "sticky", top: 0, left: 0, zIndex: 30,
                    width: 60, minWidth: 60,
                    background: headerBg, color: headerText,
                    border: `1px solid rgba(255,255,255,0.2)`,
                    padding: "6px 4px",
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 600,
                    boxShadow: frozenShadow,
                  }}>
                    #
                  </th>

                  {visibleColumns.map((col) => {
                    const type = getEffectiveType(col.key);
                    const w = getColumnWidth(col);
                    return (
                      <th
                        key={col.key}
                        draggable={canEdit}
                        onDragStart={(e) => handleColumnDragStart(e, col.key)}
                        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; }}
                        onDrop={(e) => handleColumnDrop(e, col.key)}
                        onDragEnd={() => setDraggedColumnKey(null)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setContextMenu({ columnKey: col.key, x: e.clientX, y: e.clientY });
                          setDropdownDraft((columnDropdownOptions[col.key] || []).join(", "));
                        }}
                        style={{
                          position: "sticky", top: 0, zIndex: 20,
                          width: w, minWidth: w,
                          background: draggedColumnKey === col.key ? "#155d35" : headerBg,
                          color: headerText,
                          border: `1px solid rgba(255,255,255,0.2)`,
                          padding: "0",
                          userSelect: "none",
                          cursor: canEdit ? "grab" : "default",
                          verticalAlign: "middle",
                        }}
                      >
                        <div style={{ padding: "4px 8px", position: "relative" }}>
                          {/* letter + type icon */}
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 1 }}>
                            <span style={{ fontSize: 9, opacity: 0.65, fontFamily: "monospace" }}>{col.letter}</span>
                            <TypeIcon type={type} size={9} />
                          </div>

                          {/* editable column title */}
                          {editingColumnKey === col.key ? (
                            <input
                              autoFocus
                              value={editingColumnTitle}
                              onChange={(e) => setEditingColumnTitle(e.target.value)}
                              onBlur={() => void saveEditedColumnTitle()}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                                if (e.key === "Escape") { setEditingColumnKey(null); setEditingColumnTitle(""); }
                              }}
                              disabled={savingColumnHeaders}
                              style={{
                                width: "100%", background: "rgba(255,255,255,0.2)", border: "none",
                                borderBottom: "1px solid #fff", color: "#fff", fontSize: 12,
                                fontWeight: 600, outline: "none", padding: "1px 2px",
                              }}
                            />
                          ) : (
                            <div
                              style={{ fontWeight: 600, fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", cursor: canEdit ? "text" : "default" }}
                              onDoubleClick={() => {
                                if (!canEdit) return;
                                setEditingColumnKey(col.key);
                                setEditingColumnTitle(getColumnTitle(col));
                              }}
                              title={`${getColumnTitle(col)} · Right-click to change type`}
                            >
                              {getColumnTitle(col)}
                            </div>
                          )}

                          {/* resize handle */}
                          {canEdit && (
                            <div
                              onMouseDown={(e) => startColumnResize(e, col)}
                              style={{
                                position: "absolute", right: 0, top: 0, width: 4, height: "100%",
                                cursor: "col-resize",
                                background: "rgba(255,255,255,0)",
                              }}
                              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.35)"; }}
                              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0)"; }}
                            />
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>

              {/* ── Body ── */}
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} style={{ padding: "24px 16px", color: "#5f6368", fontSize: 13 }}>
                      Loading test sheet…
                    </td>
                  </tr>
                ) : !activeTab || activeTab.cases.length === 0 ? (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} style={{ padding: "24px 16px", color: "#5f6368", fontSize: 13 }}>
                      No test cases yet. Click <strong>Add Row</strong> to start.
                    </td>
                  </tr>
                ) : (
                  paginatedCases.map((row, ri) => {
                    const globalIndex = (currentPage - 1) * rowsPerPage + ri + 1;
                    const isSelected = selectedCell?.caseId === row.id;
                    return (
                      <tr
                        key={row.id}
                        style={{ background: isSelected ? "#f0f7ff" : ri % 2 === 0 ? "#fff" : "#fafbfc" }}
                      >
                        {/* Row number */}
                        <td style={{
                          position: "sticky", left: 0, zIndex: 5,
                          width: 60, minWidth: 60,
                          background: rowNumBg,
                          border: `1px solid ${borderColor}`,
                          padding: "2px 4px",
                          textAlign: "center",
                          color: "#5f6368",
                          fontSize: 11,
                          fontWeight: 500,
                          boxShadow: frozenShadow,
                        }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                            <span>{globalIndex}</span>
                            {canEdit && (
                              <button
                                title="Delete row"
                                disabled={deletingRowId === row.id}
                                onClick={() => void handleDeleteRow(row)}
                                style={{
                                  display: "none", // shown on row hover via CSS trick — use inline style
                                  width: 14, height: 14, padding: 0, border: "none",
                                  borderRadius: 2, background: "#fee2e2", color: "#dc2626",
                                  cursor: "pointer", alignItems: "center", justifyContent: "center",
                                }}
                                className="row-del-btn"
                              >
                                <X size={9} />
                              </button>
                            )}
                          </div>
                        </td>

                        {visibleColumns.map((col) => {
                          const w = getColumnWidth(col);
                          const colStyle: React.CSSProperties = {
                            width: w, minWidth: w,
                            border: `1px solid ${borderColor}`,
                            padding: 0,
                            verticalAlign: "top",
                          };

                          const isSelectedCell = selectedCell?.caseId === row.id && selectedCell?.colKey === col.key;
                          const cellBorder = isSelectedCell ? "2px solid #1e7e45" : `1px solid ${borderColor}`;
                          const isSaving = savingCellKey === `${row.id}:${col.key}`;

                          const type = getEffectiveType(col.key);
                          const bg = getCellBg(type);

                          // ── updatedAt ──
                          if (col.key === "updatedAt") {
                            return (
                              <td key={col.key} style={{ ...colStyle, border: cellBorder, background: "#fafafa" }}>
                                <div style={{ padding: "5px 8px", fontSize: 11, color: "#5f6368", whiteSpace: "nowrap" }}>
                                  {formatDateTime(row.updatedAt)}
                                </div>
                              </td>
                            );
                          }

                          // ── IMAGE type ──
                          if (type === "image") {
                            const cKey = customKey(row, col.key);
                            const val = getCustomVal(row, col.key);
                            return (
                              <td key={col.key} style={{ ...colStyle, border: cellBorder, background: "#f7fdf9" }}>
                                <div
                                  onClick={() => setSelectedCell({ caseId: row.id, colKey: col.key })}
                                  onDragOver={(e) => e.preventDefault()}
                                  onDrop={(e) => handleImageDrop(e, row, col.key)}
                                  onPaste={(e) => handleImagePaste(e, row, col.key)}
                                  tabIndex={0}
                                  style={{ padding: 4, outline: "none" }}
                                >
                                  {val ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={val} alt="cell" style={{ width: "100%", height: 64, objectFit: "cover", borderRadius: 3 }} />
                                  ) : (
                                    <div style={{
                                      height: 64, border: "1.5px dashed #aad4b8", borderRadius: 4,
                                      display: "flex", flexDirection: "column", alignItems: "center",
                                      justifyContent: "center", color: "#94a3b8", fontSize: 10, gap: 2,
                                    }}>
                                      <ImageIcon size={14} />
                                      <span>Drop / Paste / Upload</span>
                                    </div>
                                  )}
                                  {canEdit && (
                                    <label style={{
                                      marginTop: 4, display: "flex", alignItems: "center", justifyContent: "center",
                                      gap: 4, fontSize: 10, color: "#1e7e45", cursor: "pointer",
                                      padding: "2px 6px", borderRadius: 3, background: "#f0faf4",
                                      border: "1px solid #c3e6cb",
                                    }}>
                                      <Upload size={9} />
                                      {uploadingImageCellKey === cKey ? "Uploading…" : "Upload"}
                                      <input
                                        type="file" accept="image/*" style={{ display: "none" }}
                                        disabled={uploadingImageCellKey === cKey}
                                        onChange={(e) => {
                                          const file = e.target.files?.[0];
                                          if (file) void uploadImage(file, row, col.key);
                                          e.currentTarget.value = "";
                                        }}
                                      />
                                    </label>
                                  )}
                                </div>
                              </td>
                            );
                          }

                          // ── COLOR type ──
                          if (type === "color") {
                            const val = getCustomVal(row, col.key) || row[col.key as EditableField] as string || "#2563eb";
                            return (
                              <td key={col.key} style={{ ...colStyle, border: cellBorder, background: val + "22" }}>
                                <div
                                  style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 8px" }}
                                  onClick={() => setSelectedCell({ caseId: row.id, colKey: col.key })}
                                >
                                  <input
                                    type="color"
                                    value={val}
                                    disabled={!canEdit}
                                    style={{ width: 28, height: 28, border: "none", padding: 0, borderRadius: 3, cursor: "pointer", background: "transparent" }}
                                    onChange={(e) => setCustomVal(row, col.key, e.target.value)}
                                  />
                                  <span style={{ fontSize: 11, fontFamily: "monospace", color: val, fontWeight: 600 }}>{val}</span>
                                </div>
                              </td>
                            );
                          }

                          // ── DROPDOWN type — members ──
                          if (col.key === "qaUserId" || col.key === "developerUserId") {
                            const fieldKey = col.key as "qaUserId" | "developerUserId";
                            const val = String(readCaseFieldValue(row, col.key) || "");
                            return (
                              <td key={col.key} style={{ ...colStyle, border: cellBorder, background: bg }}>
                                <select
                                  value={val}
                                  disabled={!canEdit || isSaving}
                                  onFocus={() => setSelectedCell({ caseId: row.id, colKey: col.key })}
                                  onChange={(e) => void commitCell(row, fieldKey, e.target.value)}
                                  style={{
                                    width: "100%", height: "100%", minHeight: 30,
                                    border: "none", outline: "none",
                                    background: bg, fontSize: 12, padding: "5px 8px",
                                    appearance: "auto", color: "#202124",
                                  }}
                                >
                                  <option value="">— Unassigned —</option>
                                  {members.map((m) => (
                                    <option key={m.userId} value={m.userId}>{personLabel(m)}</option>
                                  ))}
                                </select>
                              </td>
                            );
                          }

                          // ── DROPDOWN type — status ──
                          if (col.key === "status") {
                            const statusBg = row.status === "resolved" ? "#dcfce7" : "#fef9c3";
                            const statusColor = row.status === "resolved" ? "#166534" : "#854d0e";
                            return (
                              <td key={col.key} style={{ ...colStyle, border: cellBorder, background: statusBg }}>
                                <select
                                  value={row.status}
                                  disabled={!canEdit || isSaving}
                                  onFocus={() => setSelectedCell({ caseId: row.id, colKey: col.key })}
                                  onChange={(e) => void commitCell(row, "status", e.target.value)}
                                  style={{
                                    width: "100%", height: "100%", minHeight: 30,
                                    border: "none", outline: "none",
                                    background: "transparent", fontSize: 12,
                                    padding: "5px 8px", fontWeight: 600, color: statusColor,
                                    appearance: "auto",
                                  }}
                                >
                                  <option value="pending">⏳ Pending</option>
                                  <option value="resolved">✅ Resolved</option>
                                </select>
                              </td>
                            );
                          }

                          // ── DROPDOWN type — custom options ──
                          if (type === "dropdown") {
                            const opts = columnDropdownOptions[col.key] || [];
                            const val = getCustomVal(row, col.key);
                            return (
                              <td key={col.key} style={{ ...colStyle, border: cellBorder, background: bg }}>
                                <select
                                  value={val}
                                  disabled={!canEdit}
                                  onFocus={() => setSelectedCell({ caseId: row.id, colKey: col.key })}
                                  onChange={(e) => setCustomVal(row, col.key, e.target.value)}
                                  style={{
                                    width: "100%", height: "100%", minHeight: 30,
                                    border: "none", outline: "none",
                                    background: bg, fontSize: 12, padding: "5px 8px",
                                    appearance: "auto", color: "#202124",
                                  }}
                                >
                                  <option value="">— Select —</option>
                                  {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                              </td>
                            );
                          }

                          // ── TEXT type (default) ──
                          const val = String(readCaseFieldValue(row, col.key as BaseColumnKey) || "");
                          const fieldKey = col.key as Exclude<EditableField, "status" | "qaUserId" | "developerUserId">;
                          return (
                            <td key={col.key} style={{ ...colStyle, border: cellBorder, background: bg }}>
                              <input
                                key={`${row.id}:${col.key}:${row.updatedAt}`}
                                defaultValue={val}
                                disabled={!canEdit || isSaving}
                                onFocus={() => setSelectedCell({ caseId: row.id, colKey: col.key })}
                                onBlur={(e) => void commitCell(row, fieldKey, e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur(); }}
                                style={{
                                  width: "100%", border: "none", outline: "none",
                                  background: "transparent", fontSize: 12,
                                  padding: "5px 8px", color: "#202124",
                                  minHeight: 30,
                                }}
                              />
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "6px 16px", borderTop: `1px solid ${borderColor}`,
              background: "#fff", fontSize: 12, color: "#5f6368",
            }}>
              <span>
                Rows {((currentPage - 1) * rowsPerPage) + 1}–{Math.min(currentPage * rowsPerPage, activeTab?.cases?.length || 0)} of {activeTab?.cases?.length || 0}
              </span>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1} style={pgBtn}><ChevronsLeft size={12} /></button>
                <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} style={pgBtn}><ChevronLeft size={12} /></button>
                <span style={{ padding: "0 8px" }}>Page {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages} style={pgBtn}><ChevronRight size={12} /></button>
                <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages} style={pgBtn}><ChevronsRight size={12} /></button>
              </div>
            </div>
          )}

          {/* ── Tab bar ── */}
          <div style={{
            display: "flex", alignItems: "center", gap: 0,
            background: tabBarBg, borderTop: `1px solid ${borderColor}`,
            padding: "0 8px", flexWrap: "nowrap", overflowX: "auto",
            minHeight: 36,
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                style={{
                  padding: "6px 16px", fontSize: 12, border: "none",
                  borderRight: `1px solid ${borderColor}`,
                  background: activeTab?.id === tab.id ? activeTabBg : "transparent",
                  color: activeTab?.id === tab.id ? "#fff" : "#333",
                  cursor: "pointer", whiteSpace: "nowrap",
                  fontWeight: activeTab?.id === tab.id ? 600 : 400,
                }}
              >
                {tab.name}
              </button>
            ))}

            {canEdit && (
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: "auto", padding: "0 8px" }}>
                <input
                  value={newTabName}
                  onChange={(e) => setNewTabName(e.target.value)}
                  placeholder="New tab name"
                  onKeyDown={(e) => { if (e.key === "Enter") void handleCreateTab(); }}
                  style={{
                    height: 26, border: `1px solid ${borderColor}`, borderRadius: 4,
                    padding: "0 8px", fontSize: 12, outline: "none", background: "#fff",
                  }}
                />
                <button
                  onClick={() => void handleCreateTab()}
                  disabled={creatingTab}
                  style={{
                    height: 26, padding: "0 10px", fontSize: 12,
                    background: headerBg, color: "#fff", border: "none",
                    borderRadius: 4, cursor: "pointer",
                  }}
                >
                  {creatingTab ? "…" : "+ Add Tab"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ── Version Log sidebar ── */}
        {sidebarOpen && (
          <div style={{
            width: 380, flexShrink: 0,
            borderLeft: `1px solid ${borderColor}`,
            background: "#fff",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}>
            <div style={{ padding: "10px 14px", borderBottom: `1px solid ${borderColor}` }}>
              <div style={{ fontWeight: 600, fontSize: 13, color: "#202124" }}>Version Log</div>
              <div style={{ fontSize: 11, color: "#5f6368", marginTop: 2 }}>Every save is tracked here.</div>
            </div>

            <div style={{ flex: 1, overflow: "auto" }}>
              <table style={{ width: "100%", fontSize: 11, borderCollapse: "collapse" }}>
                <thead style={{ position: "sticky", top: 0, background: "#f8f9fa" }}>
                  <tr>
                    {["#", "Action", "Summary", "Field", "User", "Date"].map((h) => (
                      <th key={h} style={{ padding: "6px 8px", textAlign: "left", fontWeight: 600, color: "#5f6368", borderBottom: `1px solid ${borderColor}`, whiteSpace: "nowrap", fontSize: 11 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginatedLogs.length ? paginatedLogs.map((log, i) => {
                    const actor = log.changedByUserName ||
                      (log.changedByUserId ? personLabel(memberMap.get(log.changedByUserId) || { userId: log.changedByUserId }) : "Unknown");
                    return (
                      <tr key={log.id} style={{ borderBottom: `1px solid ${borderColor}` }}>
                        <td style={{ padding: "5px 8px", color: "#5f6368" }}>{(logPage - 1) * logsPerPage + i + 1}</td>
                        <td style={{ padding: "5px 8px" }}>{log.action || "—"}</td>
                        <td style={{ padding: "5px 8px", maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={log.summary || ""}>{log.summary || "—"}</td>
                        <td style={{ padding: "5px 8px", color: "#5f6368" }}>{log.fieldName || "—"}</td>
                        <td style={{ padding: "5px 8px", color: "#5f6368" }}>{actor}</td>
                        <td style={{ padding: "5px 8px", color: "#5f6368", whiteSpace: "nowrap" }}>{formatDateTime(log.createdAt)}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td colSpan={6} style={{ padding: "20px 12px", textAlign: "center", color: "#aaa" }}>No changes logged yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalLogPages > 1 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", borderTop: `1px solid ${borderColor}`, fontSize: 11, color: "#5f6368" }}>
                <span>{payload?.logs?.length} entries</span>
                <div style={{ display: "flex", gap: 2 }}>
                  <button onClick={() => setLogPage(p => p - 1)} disabled={logPage === 1} style={pgBtn}><ChevronLeft size={11} /></button>
                  <span style={{ padding: "0 6px" }}>{logPage}/{totalLogPages}</span>
                  <button onClick={() => setLogPage(p => p + 1)} disabled={logPage === totalLogPages} style={pgBtn}><ChevronRight size={11} /></button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Context menu (right-click column header to change type) ── */}
      {contextMenu && canEdit && (
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "fixed",
            left: contextMenu.x, top: contextMenu.y,
            zIndex: 9999,
            background: "#fff",
            border: `1px solid ${borderColor}`,
            borderRadius: 6,
            boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
            padding: 12,
            minWidth: 240,
            fontSize: 12,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 8, color: "#202124" }}>
            Column Type · {columnConfig.find(c => c.key === contextMenu.columnKey)?.letter}
          </div>

          {(["text", "dropdown", "color", "image"] as ColumnInputType[]).map((t) => {
            const active = getEffectiveType(contextMenu.columnKey) === t;
            return (
              <button
                key={t}
                onClick={() => {
                  setColumnTypeOverrides((p) => ({ ...p, [contextMenu.columnKey]: t }));
                  if (t !== "dropdown") setContextMenu(null);
                }}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  width: "100%", padding: "6px 10px",
                  background: active ? "#e8f5e9" : "transparent",
                  border: active ? `1px solid #1e7e45` : "1px solid transparent",
                  borderRadius: 4, cursor: "pointer", marginBottom: 2,
                  color: active ? "#1e7e45" : "#333", fontWeight: active ? 600 : 400,
                }}
              >
                <TypeIcon type={t} size={12} />
                <span style={{ textTransform: "capitalize" }}>{t}</span>
              </button>
            );
          })}

          {getEffectiveType(contextMenu.columnKey) === "dropdown" && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: 11, color: "#5f6368", marginBottom: 4 }}>Options (comma-separated)</div>
              <input
                value={dropdownDraft}
                onChange={(e) => setDropdownDraft(e.target.value)}
                placeholder="Option A, Option B, Option C"
                style={{
                  width: "100%", border: `1px solid ${borderColor}`, borderRadius: 4,
                  padding: "5px 8px", fontSize: 12, outline: "none",
                }}
              />
              <button
                onClick={() => {
                  const opts = dropdownDraft.split(",").map(s => s.trim()).filter(Boolean).slice(0, 50);
                  setColumnDropdownOptions((p) => ({ ...p, [contextMenu.columnKey]: opts }));
                  toast.success("Dropdown options saved.");
                  setContextMenu(null);
                }}
                style={{
                  marginTop: 6, width: "100%", padding: "5px 0",
                  background: headerBg, color: "#fff", border: "none",
                  borderRadius: 4, cursor: "pointer", fontSize: 12,
                }}
              >
                Save Options
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Row hover delete button CSS ── */}
      <style>{`
        tr:hover .row-del-btn { display: inline-flex !important; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 8px; height: 8px; }
        ::-webkit-scrollbar-track { background: #f1f3f4; }
        ::-webkit-scrollbar-thumb { background: #c1c8cd; border-radius: 4px; }
        ::-webkit-scrollbar-thumb:hover { background: #9aa3aa; }
      `}</style>
    </div>
  );
}

const pgBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", justifyContent: "center",
  width: 26, height: 26, border: "1px solid #d0d7de",
  borderRadius: 4, background: "#fff", cursor: "pointer",
  color: "#333", padding: 0,
};
pgBtn[":disabled" as string] = { opacity: 0.4, cursor: "default" };