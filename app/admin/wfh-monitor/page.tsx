"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getTeamDesktopActivity, getTeamCurrentActivity } from "@/app/api/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Keyboard,
  MousePointerClick,
  Timer,
  RefreshCw,
  Monitor,
  WifiOff,
  Eye,
  Radio,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppUsage {
  appName: string;
  keystrokeCount: number;
  mouseClicks: number;
  durationSeconds: number;
}

interface EmployeeDesktopRow {
  userId: string;
  name: string;
  email: string;
  isMonitoring: boolean;
  sessionStart: string | null;
  sessionEnd: string | null;
  apps: AppUsage[];
  totals: { keystrokes: number; clicks: number; durationSeconds: number };
}

interface CurrentActivity {
  userId: string;
  name: string;
  isMonitoring: boolean;
  currentApp: string | null;
  currentWindowTitle: string | null;
  lastActivityAt: string | null;
  keystrokeCount: number;
  mouseClicks: number;
}

type SessionStatus = "monitoring" | "ended" | "not_started";

// ─── Constants ────────────────────────────────────────────────────────────────

const statusConfig: Record<SessionStatus, { label: string; color: string; dot: string }> = {
  monitoring:  { label: "Monitoring",  color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300", dot: "bg-green-500" },
  ended:       { label: "Ended",       color: "bg-muted text-muted-foreground border-border",                                          dot: "bg-muted-foreground" },
  not_started: { label: "Not Started", color: "bg-muted text-muted-foreground border-border",                                          dot: "bg-muted-foreground" },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getStatus(row: EmployeeDesktopRow): SessionStatus {
  if (row.isMonitoring) return "monitoring";
  if (row.sessionStart) return "ended";
  return "not_started";
}

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDuration(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function sessionDuration(row: EmployeeDesktopRow) {
  if (!row.sessionStart) return null;
  const end = row.sessionEnd ? new Date(row.sessionEnd) : new Date();
  const diffSec = Math.floor((end.getTime() - new Date(row.sessionStart).getTime()) / 1000);
  return formatDuration(Math.max(0, diffSec));
}

function topApp(row: EmployeeDesktopRow) {
  return row.apps[0]?.appName ?? "—";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminWfhMonitorPage() {
  const router = useRouter();
  const [rows, setRows] = useState<EmployeeDesktopRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [currentActivity, setCurrentActivity] = useState<Map<string, CurrentActivity>>(new Map());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const [summaryRes, activityRes] = await Promise.all([
        getTeamDesktopActivity(date),
        getTeamCurrentActivity(),
      ]);
      setRows(Array.isArray(summaryRes.data) ? summaryRes.data : []);
      const activityMap = new Map<string, CurrentActivity>();
      if (Array.isArray(activityRes.data)) {
        for (const a of activityRes.data) {
          activityMap.set(a.userId, a);
        }
      }
      setCurrentActivity(activityMap);
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
    timerRef.current = setInterval(() => fetchAll(true), 15_000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [fetchAll]);

  const summary = {
    monitoring:  rows.filter((r) => getStatus(r) === "monitoring").length,
    ended:       rows.filter((r) => getStatus(r) === "ended").length,
    not_started: rows.filter((r) => getStatus(r) === "not_started").length,
  };

  const filtered = rows.filter((r) => {
    const q = search.toLowerCase();
    return r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q);
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">WFH Activity Monitor</h1>
          <p className="text-sm text-muted-foreground mt-1">
            App usage, keystrokes, and clicks reported by the Avinya HRMS Monitor desktop app — refreshes every 15s with live current activity.
            {lastRefreshed && (
              <span className="ml-2 text-xs opacity-70">Updated {lastRefreshed.toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40 text-sm" />
          <Button variant="outline" size="icon" onClick={() => fetchAll(false)} disabled={loading} loading={refreshing}>
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Status Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(["monitoring", "ended", "not_started"] as SessionStatus[]).map((s) => (
          <div key={s} className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${statusConfig[s].color}`}>
            <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${statusConfig[s].dot} ${s === "monitoring" ? "animate-pulse" : ""}`} />
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
                <TableHead>Sl#</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Current Activity</TableHead>
                <TableHead>Session</TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center gap-1 justify-center"><Keyboard className="w-3.5 h-3.5" />Keystrokes</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center gap-1 justify-center"><MousePointerClick className="w-3.5 h-3.5" />Clicks</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="flex items-center gap-1 justify-center"><Timer className="w-3.5 h-3.5" />Active Time</span>
                </TableHead>
                <TableHead>Top App</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((row, index) => {
                const status = getStatus(row);
                const cfg = statusConfig[status];
                return (
                  <TableRow key={row.userId} className="hover:bg-accent/30">
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-medium">{row.name}</p>
                        <p className="text-xs text-muted-foreground">{row.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[11px] px-2 py-0.5 ${cfg.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${cfg.dot} ${status === "monitoring" ? "animate-pulse" : ""}`} />
                        {cfg.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs max-w-[200px]">
                      {(() => {
                        const live = currentActivity.get(row.userId);
                        if (!live || !live.currentApp) return <span className="text-muted-foreground/40">—</span>;
                        return (
                          <div className="flex items-center gap-1.5">
                            {live.isMonitoring && (
                              <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                              </span>
                            )}
                            <div className="truncate">
                              <span className="font-medium text-foreground/80">{live.currentApp}</span>
                              {live.currentWindowTitle && (
                                <p className="text-[10px] text-muted-foreground truncate" title={live.currentWindowTitle}>
                                  {live.currentWindowTitle}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {row.sessionStart ? (
                        <>
                          {formatTime(row.sessionStart)} → {row.sessionEnd ? formatTime(row.sessionEnd) : "ongoing"}
                          {sessionDuration(row) && <span className="ml-1 opacity-60">({sessionDuration(row)})</span>}
                        </>
                      ) : <span className="opacity-40">Not started</span>}
                    </TableCell>
                    <TableCell className="text-center font-medium text-sm">{row.totals.keystrokes.toLocaleString()}</TableCell>
                    <TableCell className="text-center font-medium text-sm">{row.totals.clicks.toLocaleString()}</TableCell>
                    <TableCell className="text-center font-medium text-sm">{formatDuration(row.totals.durationSeconds)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      <div className="flex items-center gap-1"><Monitor className="w-3 h-3" />{topApp(row)}</div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="gap-1 text-xs h-7"
                        onClick={() => router.push(`/admin/wfh-monitor/${row.userId}`)}>
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
        <Radio className="w-3 h-3 animate-pulse text-green-500" />
        Auto-refreshes every 15 seconds — live activity shown in real-time
      </div>

    </div>
  );
}
