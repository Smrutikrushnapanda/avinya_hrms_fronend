"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getTeamWfhActivity, getWfhChartData } from "@/app/api/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mouse,
  Keyboard,
  MonitorX,
  UtensilsCrossed,
  RefreshCw,
  Clock,
  Activity,
  WifiOff,
  Eye,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserInfo {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

interface ActivityRow {
  id: string;
  date: string;
  mouseEvents: number;
  keyboardEvents: number;
  tabSwitches: number;
  lastActiveAt: string | null;
  isLunch: boolean;
  lunchStart: string | null;
  lunchEnd: string | null;
  workStartedAt: string | null;
  workEndedAt: string | null;
  user: UserInfo;
}

interface EmployeeChartData {
  userId: string;
  name: string;
  email: string;
  mouse: number[];
  keyboard: number[];
  tabs: number[];
}

interface ChartResponse {
  buckets: string[];
  employees: EmployeeChartData[];
}

type ActivityStatus = "active" | "idle" | "inactive" | "lunch" | "not_started";
type ChartMetric = "mouse" | "keyboard" | "tabs";

// ─── Constants ────────────────────────────────────────────────────────────────

const statusConfig: Record<ActivityStatus, { label: string; color: string; dot: string }> = {
  active:      { label: "Active",      color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300",      dot: "bg-green-500"  },
  idle:        { label: "Idle",        color: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",      dot: "bg-amber-400"  },
  inactive:    { label: "Inactive",    color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300",                dot: "bg-red-500"    },
  lunch:       { label: "Lunch",       color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300", dot: "bg-orange-400" },
  not_started: { label: "Not Started", color: "bg-muted text-muted-foreground border-border",                                               dot: "bg-muted-foreground" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatus(row: ActivityRow): ActivityStatus {
  if (!row.workStartedAt) return "not_started";
  if (row.isLunch) return "lunch";
  if (!row.lastActiveAt) return "inactive";
  const idleMin = (Date.now() - new Date(row.lastActiveAt).getTime()) / 60000;
  if (idleMin < 5) return "active";
  if (idleMin < 15) return "idle";
  return "inactive";
}

function displayName(row: ActivityRow) {
  return [row.user.firstName, row.user.lastName].filter(Boolean).join(" ") || row.user.email;
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatTimeAgo(iso: string | null) {
  if (!iso) return "Never";
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diffMin === 0) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const h = Math.floor(diffMin / 60);
  return `${h}h ${diffMin % 60}m ago`;
}

function workDuration(row: ActivityRow) {
  if (!row.workStartedAt) return null;
  const end = row.workEndedAt ? new Date(row.workEndedAt) : new Date();
  const diffMin = Math.floor((end.getTime() - new Date(row.workStartedAt).getTime()) / 60000);
  const h = Math.floor(diffMin / 60);
  const m = diffMin % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function trimBuckets(series: Record<string, string | number>[], names: string[]) {
  const hasActivity = series.map((pt) => names.some((n) => (pt[n] as number) > 0));
  const first = hasActivity.indexOf(true);
  const last = hasActivity.lastIndexOf(true);
  if (first === -1) return series.slice(0, 20);
  return series.slice(Math.max(0, first - 1), Math.min(series.length, last + 2));
}

function buildEmployeeChart(chart: ChartResponse, userId: string, metric: ChartMetric) {
  const emp = chart.employees.find((e) => e.userId === userId);
  if (!emp) return [];
  const key = metric === "mouse" ? "Mouse" : metric === "keyboard" ? "Keyboard" : "Tabs";
  return chart.buckets.map((bucket, i) => ({ time: bucket, [key]: emp[metric][i] ?? 0 }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminWfhMonitorPage() {
  const [rows, setRows] = useState<ActivityRow[]>([]);
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [selectedRow, setSelectedRow] = useState<ActivityRow | null>(null);
  const [sheetMetric, setSheetMetric] = useState<ChartMetric>("mouse");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [teamRes, chartRes] = await Promise.all([
        getTeamWfhActivity(date),
        getWfhChartData(date),
      ]);
      setRows(Array.isArray(teamRes.data) ? teamRes.data : []);
      setChart(chartRes.data ?? null);
      setLastRefreshed(new Date());
    } catch {
      if (!silent) toast.error("Failed to load WFH activity");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [date]);

  useEffect(() => { fetchAll(false); }, [fetchAll]);
  useEffect(() => {
    timerRef.current = setInterval(() => fetchAll(true), 30_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchAll]);

  const summary = {
    active:      rows.filter((r) => getStatus(r) === "active").length,
    idle:        rows.filter((r) => getStatus(r) === "idle").length,
    inactive:    rows.filter((r) => getStatus(r) === "inactive").length,
    lunch:       rows.filter((r) => getStatus(r) === "lunch").length,
    not_started: rows.filter((r) => getStatus(r) === "not_started").length,
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return displayName(r).toLowerCase().includes(q) || r.user.email.toLowerCase().includes(q);
  });

  const sheetDataKey = sheetMetric === "mouse" ? "Mouse" : sheetMetric === "keyboard" ? "Keyboard" : "Tabs";
  const sheetChartSeries = selectedRow && chart
    ? trimBuckets(buildEmployeeChart(chart, selectedRow.user.id, sheetMetric), [sheetDataKey])
    : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WFH Activity Monitor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Showing only employees with approved WFH for the selected date — refreshes every 30s.
            {lastRefreshed && (
              <span className="ml-2 text-xs opacity-70">Updated {lastRefreshed.toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40 text-sm" />
          <Button variant="outline" size="icon" onClick={() => fetchAll(false)} disabled={loading || refreshing}>
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {(["active","idle","inactive","lunch","not_started"] as ActivityStatus[]).map((s) => (
          <div key={s} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${statusConfig[s].color}`}>
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusConfig[s].dot} ${s === "active" ? "animate-pulse" : ""}`} />
            <div>
              <p className="text-xs font-medium capitalize">{statusConfig[s].label}</p>
              <p className="text-2xl font-bold">{summary[s]}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Data Table */}
      <div className="border border-border rounded-xl bg-card overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs text-sm h-8"
          />
          <span className="ml-auto text-xs text-muted-foreground">
            {filtered.length} WFH employee{filtered.length !== 1 ? "s" : ""} today
          </span>
        </div>

        {loading ? (
          <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <WifiOff className="w-8 h-8 opacity-30" />
            <p className="text-sm">
              {rows.length === 0
                ? `No employees have approved WFH for ${date}.`
                : "No employees match your search."}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Work Session</TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center gap-1 justify-center"><Mouse className="w-3.5 h-3.5" />Mouse</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center gap-1 justify-center"><Keyboard className="w-3.5 h-3.5" />Keyboard</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center gap-1 justify-center"><MonitorX className="w-3.5 h-3.5" />Tabs</span>
                </TableHead>
                <TableHead>Last Active</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row) => {
                const status = getStatus(row);
                const cfg = statusConfig[status];
                return (
                  <TableRow key={row.id} className="hover:bg-accent/30">
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{displayName(row)}</p>
                        <p className="text-xs text-muted-foreground">{row.user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${cfg.dot} ${status === "active" ? "animate-pulse" : ""}`} />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.workStartedAt ? (
                        <>
                          {formatTime(row.workStartedAt)} → {row.workEndedAt ? formatTime(row.workEndedAt) : "ongoing"}
                          {workDuration(row) && <span className="ml-1 opacity-60">({workDuration(row)})</span>}
                        </>
                      ) : <span className="opacity-40">Not started</span>}
                    </TableCell>
                    <TableCell className="text-center font-medium text-sm">{row.mouseEvents.toLocaleString()}</TableCell>
                    <TableCell className="text-center font-medium text-sm">{row.keyboardEvents.toLocaleString()}</TableCell>
                    <TableCell className="text-center font-medium text-sm">{row.tabSwitches.toLocaleString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatTimeAgo(row.lastActiveAt)}</div>
                      {row.isLunch && (
                        <div className="flex items-center gap-1 text-amber-600 mt-0.5">
                          <UtensilsCrossed className="w-3 h-3" />Lunch
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="gap-1 text-xs h-7"
                        onClick={() => { setSelectedRow(row); setSheetMetric("mouse"); }}>
                        <Eye className="w-3.5 h-3.5" />View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Activity className="w-3 h-3 animate-pulse text-green-500" />
        Auto-refreshes every 30 seconds
      </div>

      {/* ── Full-screen Detail Dialog ── */}
      <Dialog open={!!selectedRow} onOpenChange={(open) => { if (!open) setSelectedRow(null); }}>
        <DialogContent className="max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {selectedRow && (() => {
            const status = getStatus(selectedRow);
            const cfg = statusConfig[status];
            const name = displayName(selectedRow);
            const empChartData = chart?.employees.find((e) => e.userId === selectedRow.user.id);
            const maxAll = Math.max(selectedRow.mouseEvents, selectedRow.keyboardEvents, selectedRow.tabSwitches, 1);

            return (
              <>
                <DialogHeader className="pb-4 border-b border-border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-xl font-semibold">{name}</DialogTitle>
                      <DialogDescription>{selectedRow.user.email}</DialogDescription>
                    </div>
                    <Badge variant="outline" className={`text-xs px-3 py-1 ${cfg.color}`}>
                      <span className={`w-2 h-2 rounded-full mr-2 inline-block ${cfg.dot}`} />
                      {cfg.label}
                    </Badge>
                  </div>
                </DialogHeader>

                <div className="pt-4 space-y-5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoCard title="Work Session">
                      {selectedRow.workStartedAt ? (
                        <div className="grid grid-cols-3 gap-2">
                          <InfoItem label="Started"  value={formatTime(selectedRow.workStartedAt)} />
                          <InfoItem label="Ended"    value={selectedRow.workEndedAt ? formatTime(selectedRow.workEndedAt) : "Ongoing"} />
                          <InfoItem label="Duration" value={workDuration(selectedRow) ?? "—"} />
                        </div>
                      ) : <p className="text-sm text-muted-foreground">Not started yet.</p>}
                    </InfoCard>

                    <InfoCard title="Lunch Break">
                      {selectedRow.lunchStart ? (
                        <div className="grid grid-cols-2 gap-2">
                          <InfoItem label="Started" value={formatTime(selectedRow.lunchStart)} />
                          <InfoItem label="Ended"   value={selectedRow.lunchEnd ? formatTime(selectedRow.lunchEnd) : "Ongoing"} />
                        </div>
                      ) : <p className="text-sm text-muted-foreground">No lunch recorded.</p>}
                    </InfoCard>
                  </div>

                  <InfoCard title="Activity Counts">
                    <div className="space-y-4">
                      {[
                        { icon: <Mouse className="w-4 h-4 text-blue-500" />,   label: "Mouse Events",   value: selectedRow.mouseEvents,    bar: "bg-blue-500"   },
                        { icon: <Keyboard className="w-4 h-4 text-green-500" />, label: "Keyboard Events", value: selectedRow.keyboardEvents, bar: "bg-green-500"  },
                        { icon: <MonitorX className="w-4 h-4 text-purple-500" />, label: "Tab Switches",   value: selectedRow.tabSwitches,    bar: "bg-purple-500" },
                      ].map(({ icon, label, value, bar }) => (
                        <div key={label} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-2 text-muted-foreground">{icon}{label}</span>
                            <span className="font-bold">{value.toLocaleString()}</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div className={`h-full rounded-full ${bar}`} style={{ width: `${Math.min(100, (value / maxAll) * 100)}%` }} />
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                        <Clock className="w-3.5 h-3.5" />
                        Last active: {formatTime(selectedRow.lastActiveAt)}
                        {selectedRow.lastActiveAt && <span className="opacity-60 ml-1">({formatTimeAgo(selectedRow.lastActiveAt)})</span>}
                      </div>
                    </div>
                  </InfoCard>

                  <InfoCard title="Activity Over Time">
                    <div className="flex rounded-lg border border-border overflow-hidden text-xs mb-4">
                      {(["mouse","keyboard","tabs"] as ChartMetric[]).map((m) => (
                        <button key={m} onClick={() => setSheetMetric(m)}
                          className={`flex-1 px-3 py-1.5 font-medium transition-colors ${sheetMetric === m ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:bg-accent"}`}>
                          {m === "mouse" ? "🖱 Mouse" : m === "keyboard" ? "⌨ Keyboard" : "🗂 Tabs"}
                        </button>
                      ))}
                    </div>
                    {!empChartData || sheetChartSeries.length === 0 ? (
                      <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                        No chart data for this employee.
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={260}>
                        <AreaChart data={sheetChartSeries} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                          <defs>
                            <linearGradient id="dlg-grad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                          <XAxis dataKey="time" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: 12 }}
                            labelStyle={{ fontWeight: 600, color: "hsl(var(--foreground))" }} />
                          <Legend wrapperStyle={{ fontSize: 12 }} iconType="circle" iconSize={8} />
                          <Area type="monotone" dataKey={sheetDataKey} stroke="#6366f1" fill="url(#dlg-grad)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </InfoCard>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-muted/50 px-3 py-2">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
