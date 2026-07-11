"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getEmployeeWfhActivity,
  getEmployeeAppSummary,
  getTeamCurrentActivity,
  getWfhChartData,
} from "@/app/api/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ArrowLeft,
  Keyboard,
  MousePointerClick,
  Timer,
  Monitor,
  Clock,
  Coffee,
  Play,
  Pause,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Layers,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppUsage {
  appName: string;
  keystrokeCount: number;
  mouseClicks: number;
  durationSeconds: number;
}

interface EmployeeActivity {
  mouseEvents: number;
  keyboardEvents: number;
  tabSwitches: number;
  lastActiveAt: string | null;
  isLunch: boolean;
  lunchStart: string | null;
  lunchEnd: string | null;
  workStartedAt: string | null;
  workEndedAt: string | null;
}

interface AppSummary {
  date: string;
  apps: AppUsage[];
  totals: {
    keystrokes: number;
    clicks: number;
    durationSeconds: number;
  };
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

const CHART_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

// ─── Component ─────────────────────────────────────────────────────────────────

export default function EmployeeWfhDetailPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<EmployeeActivity | null>(null);
  const [summary, setSummary] = useState<AppSummary | null>(null);
  const [current, setCurrent] = useState<CurrentActivity | null>(null);
  const [chartData, setChartData] = useState<{ time: string; mouse: number; keyboard: number }[]>([]);
  const [employeeName, setEmployeeName] = useState("Employee");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [activityRes, summaryRes, currentRes, chartRes] = await Promise.all([
        getEmployeeWfhActivity(userId, date),
        getEmployeeAppSummary(userId, date).catch(() => ({ data: null })),
        getTeamCurrentActivity().catch(() => ({ data: [] })),
        getWfhChartData(date).catch(() => ({ data: { buckets: [], employees: [] } })),
      ]);

      setActivity(activityRes.data ?? null);

      if (summaryRes.data) setSummary(summaryRes.data);

      // Find this user's current activity
      const activities: CurrentActivity[] = Array.isArray(currentRes.data) ? currentRes.data : [];
      const mine = activities.find((a: CurrentActivity) => a.userId === userId) ?? null;
      setCurrent(mine);
      if (mine?.name && mine.name !== userId) setEmployeeName(mine.name);

      // Filter chart data for this user
      const chart = chartRes.data as { buckets: string[]; employees: Array<{ userId: string; mouse: number[]; keyboard: number[] }> };
      if (chart?.buckets && chart?.employees) {
        const emp = chart.employees.find((e) => e.userId === userId);
        if (emp) {
          setChartData(
            chart.buckets.map((time, i) => ({
              time: time,
              mouse: emp.mouse[i] ?? 0,
              keyboard: emp.keyboard[i] ?? 0,
            }))
          );
        } else {
          setChartData([]);
        }
      }
    } catch {
      toast.error("Failed to load employee details");
    } finally {
      setLoading(false);
    }
  }, [userId, date]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const isWorking = activity?.workStartedAt && !activity?.workEndedAt;
  const isOnLunch = activity?.isLunch;

  const statusBadge = current?.isMonitoring
    ? { label: "Monitoring", color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300", dot: "bg-green-500" }
    : activity?.workEndedAt
    ? { label: "Ended", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" }
    : { label: "Not Started", color: "bg-muted text-muted-foreground border-border", dot: "bg-muted-foreground" };

  const sessionDuration = useMemo(() => {
    if (!activity?.workStartedAt) return null;
    const end = activity.workEndedAt ? new Date(activity.workEndedAt) : new Date();
    const diff = Math.floor((end.getTime() - new Date(activity.workStartedAt).getTime()) / 1000);
    return formatDuration(Math.max(0, diff));
  }, [activity]);

  const lunchDuration = useMemo(() => {
    if (!activity?.lunchStart) return null;
    const end = activity.lunchEnd ? new Date(activity.lunchEnd) : new Date();
    const diff = Math.floor((end.getTime() - new Date(activity.lunchStart).getTime()) / 1000);
    return formatDuration(Math.max(0, diff));
  }, [activity]);

  const pieData = useMemo(() => {
    const apps = summary?.apps ?? [];
    if (apps.length === 0) return [];
    const sorted = [...apps].sort((a, b) => b.durationSeconds - a.durationSeconds);
    const top = sorted.slice(0, 8);
    const rest = sorted.slice(8);
    if (rest.length > 0) {
      top.push({
        appName: `Other (${rest.length})`,
        keystrokeCount: rest.reduce((s, a) => s + a.keystrokeCount, 0),
        mouseClicks: rest.reduce((s, a) => s + a.mouseClicks, 0),
        durationSeconds: rest.reduce((s, a) => s + a.durationSeconds, 0),
      });
    }
    return top.map((a) => ({ name: a.appName, value: a.durationSeconds }));
  }, [summary]);

  const maxAppDuration = Math.max(...(summary?.apps ?? []).map((a) => a.durationSeconds), 1);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
            {employeeName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{employeeName}</h1>
            <p className="text-sm text-muted-foreground">WFH Monitoring Details</p>
          </div>
          <Badge variant="outline" className={`text-xs px-3 py-1 ${statusBadge.color}`}>
            <span className={`w-2 h-2 rounded-full mr-2 inline-block ${statusBadge.dot} ${statusBadge.label === "Monitoring" ? "animate-pulse" : ""}`} />
            {statusBadge.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40 text-sm" />
        </div>
      </div>

      {/* Current Live Activity */}
      {current?.currentApp && (
        <Card className="border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/20">
          <CardContent className="py-4 flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500" />
            </span>
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Currently using <strong>{current.currentApp}</strong>
              </p>
              {current.currentWindowTitle && (
                <p className="text-xs text-green-700 dark:text-green-300 truncate max-w-xl">
                  {current.currentWindowTitle}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">
            <Activity className="w-4 h-4 mr-1.5" /> Overview
          </TabsTrigger>
          <TabsTrigger value="apps">
            <Layers className="w-4 h-4 mr-1.5" /> App Breakdown
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <BarChart3 className="w-4 h-4 mr-1.5" /> Timeline
          </TabsTrigger>
        </TabsList>

        {/* ── Overview Tab ── */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Play className="w-3 h-3" /> Work Started
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{formatTime(activity?.workStartedAt ?? null)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Pause className="w-3 h-3" /> Work Ended
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">
                  {activity?.workEndedAt ? formatTime(activity.workEndedAt) : isWorking ? "Ongoing" : "—"}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Timer className="w-3 h-3" /> Session Duration
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">{sessionDuration ?? "—"}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Coffee className="w-3 h-3" /> Lunch
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-semibold">
                  {isOnLunch ? "On Break" : lunchDuration ?? "—"}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Keyboard className="w-3 h-3" /> Keystrokes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {(summary?.totals.keystrokes ?? activity?.keyboardEvents ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activity?.keyboardEvents ? `${activity.keyboardEvents.toLocaleString()} browser` : ""}
                  {activity?.keyboardEvents && summary?.totals.keystrokes ? " + " : ""}
                  {summary?.totals.keystrokes ? `${summary.totals.keystrokes.toLocaleString()} desktop` : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <MousePointerClick className="w-3 h-3" /> Mouse Clicks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {(summary?.totals.clicks ?? activity?.mouseEvents ?? 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">
                  {activity?.mouseEvents ? `${activity.mouseEvents.toLocaleString()} browser` : ""}
                  {activity?.mouseEvents && summary?.totals.clicks ? " + " : ""}
                  {summary?.totals.clicks ? `${summary.totals.clicks.toLocaleString()} desktop` : ""}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Timer className="w-3 h-3" /> Active Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{formatDuration(summary?.totals.durationSeconds ?? 0)}</p>
                <p className="text-xs text-muted-foreground">Desktop app monitoring</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <Clock className="w-4 h-4" /> Last Active
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {current?.lastActivityAt
                  ? new Date(current.lastActivityAt).toLocaleString()
                  : activity?.lastActiveAt
                  ? new Date(activity.lastActiveAt).toLocaleString()
                  : "No activity recorded today"}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── App Breakdown Tab ── */}
        <TabsContent value="apps" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                  <PieChartIcon className="w-4 h-4" /> App Time Distribution
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pieData.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No app data recorded for this date.</p>
                ) : (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => formatDuration(value)}
                        labelFormatter={(name: string) => name}
                      />
                      <Legend
                        formatter={(value: string) => (
                          <span className="text-xs text-muted-foreground">{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* App Table */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                  <Monitor className="w-4 h-4" /> Per-App Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {(summary?.apps ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">No app data recorded for this date.</p>
                ) : (
                  <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                    {(summary?.apps ?? []).map((app) => (
                      <div key={app.appName} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="flex items-center gap-2 text-muted-foreground truncate">
                            <Monitor className="w-3.5 h-3.5 flex-shrink-0" />
                            <span className="truncate">{app.appName}</span>
                          </span>
                          <span className="font-bold flex-shrink-0 ml-2">{formatDuration(app.durationSeconds)}</span>
                        </div>
                        <Progress value={(app.durationSeconds / maxAppDuration) * 100} className="h-2" />
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><Keyboard className="w-3 h-3" />{app.keystrokeCount.toLocaleString()}</span>
                          <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" />{app.mouseClicks.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── Timeline Tab ── */}
        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4" /> 30-Minute Activity Buckets
              </CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length === 0 ? (
                <p className="text-sm text-muted-foreground py-12 text-center">No time-series data available for this date.</p>
              ) : (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis
                      dataKey="time"
                      tick={{ fontSize: 10 }}
                      interval={1}
                      tickFormatter={(v: string) => v.replace(":00", "").replace(":30", "½")}
                      className="text-muted-foreground"
                    />
                    <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                    <Tooltip
                      contentStyle={{ fontSize: 12 }}
                      labelFormatter={(label: string) => `Time: ${label}`}
                    />
                    <Bar dataKey="keyboard" name="Keyboard" fill="#6366f1" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="mouse" name="Mouse" fill="#22c55e" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
