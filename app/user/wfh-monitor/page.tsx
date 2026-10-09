"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWfhMonitor } from "@/hooks/useWfhMonitor";
import {
  getWfhToday,
  getWfhTimeline,
  wfhToggleLunch,
  wfhToggleWork,
} from "@/app/api/api";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  UtensilsCrossed,
  Activity,
  Clock,
  Play,
  RefreshCw,
  Keyboard,
  Layers,
  MousePointerClick,
  Square,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from "recharts";

interface ActivityData {
  mouseEvents: number;
  keyboardEvents: number;
  tabSwitches: number;
  lastActiveAt: string | null;
  isLunch: boolean;
  lunchStart: string | null;
  lunchEnd: string | null;
  workStartedAt: string | null;
  workEndedAt: string | null;
  isWorking: boolean;
  hasApprovedWfh: boolean;
}

interface TimelineBucket {
  time: string;
  start: string;
  end: string;
  mouse: number;
  keyboard: number;
  tabs: number;
  total: number;
  activeMinutes: number;
  breakMinutes: number;
  status: "active" | "break" | "outside";
}

interface TimelineData {
  date: string;
  workStartedAt: string | null;
  workEndedAt: string | null;
  isWorking: boolean;
  lunchStart: string | null;
  lunchEnd: string | null;
  isLunch: boolean;
  lastActiveAt: string | null;
  totals: {
    mouse: number;
    keyboard: number;
    tabs: number;
    activeMinutes: number;
    breakMinutes: number;
  };
  buckets: TimelineBucket[];
}

const STATUS_COLORS: Record<TimelineBucket["status"], string> = {
  active: "#16a34a",
  break: "#f59e0b",
  outside: "#94a3b8",
};

const STATUS_LABELS: Record<TimelineBucket["status"], string> = {
  active: "Working",
  break: "On break",
  outside: "Outside session",
};

function formatSlotRange(bucket: TimelineBucket) {
  const opts = { hour: "2-digit", minute: "2-digit" } as const;
  const start = new Date(bucket.start).toLocaleTimeString([], opts);
  const end = new Date(bucket.end).toLocaleTimeString([], opts);
  return `${start} – ${end}`;
}

function formatMinutes(total: number) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

/** Custom hover tooltip for the work session timeline. */
function SessionTooltip(props: {
  active?: boolean;
  payload?: Array<{ payload?: TimelineBucket }>;
}) {
  const bucket = props.payload?.[0]?.payload;
  if (!props.active || !bucket) return null;

  return (
    <div className="rounded-lg border border-border bg-popover px-3 py-2 shadow-md text-xs space-y-1 min-w-[180px]">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold text-foreground">
          {formatSlotRange(bucket)}
        </span>
        <span
          className="rounded-full px-1.5 py-0.5 font-medium"
          style={{
            color: STATUS_COLORS[bucket.status],
            backgroundColor: `${STATUS_COLORS[bucket.status]}1a`,
          }}
        >
          {STATUS_LABELS[bucket.status]}
        </span>
      </div>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Active time</span>
        <span className="font-medium text-green-600 dark:text-green-400">
          {bucket.activeMinutes} min
        </span>
      </div>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Break time</span>
        <span className="font-medium text-amber-600 dark:text-amber-400">
          {bucket.breakMinutes} min
        </span>
      </div>
      <div className="border-t border-border pt-1 flex items-center justify-between text-muted-foreground">
        <span>Input events</span>
        <span className="font-medium text-foreground">{bucket.total}</span>
      </div>
      <div className="flex items-center justify-between text-muted-foreground">
        <span>Mouse · Keys · Tabs</span>
        <span className="font-medium text-foreground">
          {bucket.mouse} · {bucket.keyboard} · {bucket.tabs}
        </span>
      </div>
    </div>
  );
}

/** Toggleable legend chip below the chart. */
function LegendChip({
  color,
  label,
  visible,
  onClick,
}: {
  color: string;
  label: string;
  visible: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={visible}
      className={`flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:bg-muted ${
        visible ? "" : "opacity-40"
      }`}
    >
      <span
        className="w-2.5 h-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </button>
  );
}

export default function WfhMonitorPage() {
  const router = useRouter();
  const [activity, setActivity] = useState<ActivityData>({
    mouseEvents: 0,
    keyboardEvents: 0,
    tabSwitches: 0,
    lastActiveAt: null,
    isLunch: false,
    lunchStart: null,
    lunchEnd: null,
    workStartedAt: null,
    workEndedAt: null,
    isWorking: false,
    hasApprovedWfh: false,
  });
  const [loading, setLoading] = useState(true);
  const [inactiveDialogOpen, setInactiveDialogOpen] = useState(false);
  const [lunchLoading, setLunchLoading] = useState(false);
  const [workLoading, setWorkLoading] = useState(false);
  const [timeline, setTimeline] = useState<TimelineData | null>(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [visibleSeries, setVisibleSeries] = useState({
    active: true,
    break: true,
    events: true,
  });

  const fetchTimeline = useCallback(async () => {
    setTimelineLoading(true);
    try {
      const res = await getWfhTimeline();
      setTimeline(res.data as TimelineData);
    } catch {
      // keep whatever timeline we already have; graph falls back to summary
    } finally {
      setTimelineLoading(false);
    }
  }, []);

  useEffect(() => {
    getWfhToday()
      .then((res) => {
        setActivity(res.data);
        window.dispatchEvent(
          new CustomEvent("wfhLunchUpdate", { detail: { isLunch: res.data.isLunch } })
        );
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    fetchTimeline();
  }, [fetchTimeline]);

  // Auto-refresh the graph while a work session is running so the employee
  // always sees their latest activity.
  useEffect(() => {
    if (!activity.isWorking) return;
    const timer = setInterval(() => {
      fetchTimeline();
    }, 60_000);
    return () => clearInterval(timer);
  }, [activity.isWorking, fetchTimeline]);

  const handleManualRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const [todayRes] = await Promise.all([getWfhToday(), fetchTimeline()]);
      setActivity(todayRes.data);
    } catch {
      toast.error("Failed to refresh. Please try again.");
    } finally {
      setRefreshing(false);
    }
  }, [fetchTimeline]);

  const handleInactive = useCallback(() => {
    setInactiveDialogOpen(true);
  }, []);

  // Monitoring only runs when work is started and not yet ended
  useWfhMonitor({ enabled: activity.isWorking, onInactive: handleInactive });

  const handleWorkToggle = async () => {
    setWorkLoading(true);
    try {
      const res = await wfhToggleWork();
      const updated = res.data as {
        workStartedAt: string | null;
        workEndedAt: string | null;
        isWorking: boolean;
      };
      setActivity((prev) => ({ ...prev, ...updated }));
      if (updated.isWorking) {
        toast.success("Work session started. Your activity is now being tracked.");
      } else {
        toast.success("Work session ended. Have a great rest of your day!");
      }
      fetchTimeline();
    } catch {
      toast.error("Failed to toggle work session. Please try again.");
    } finally {
      setWorkLoading(false);
    }
  };

  const handleLunchToggle = async () => {
    setLunchLoading(true);
    try {
      const res = await wfhToggleLunch();
      const updated = res.data as {
        isLunch: boolean;
        lunchStart: string | null;
        lunchEnd: string | null;
      };
      setActivity((prev) => ({ ...prev, ...updated }));
      window.dispatchEvent(
        new CustomEvent("wfhLunchUpdate", { detail: { isLunch: updated.isLunch } })
      );
      if (updated.isLunch) {
        toast.success("Lunch break started. Enjoy your meal!");
      } else {
        toast.success("Welcome back! Lunch break ended.");
      }
      fetchTimeline();
    } catch (error: unknown) {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        "Failed to toggle lunch. Please try again.";
      toast.error(message);
    } finally {
      setLunchLoading(false);
    }
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const lunchDuration = () => {
    if (!activity.lunchStart) return null;
    const end = activity.lunchEnd ? new Date(activity.lunchEnd) : new Date();
    const diff = Math.floor((end.getTime() - new Date(activity.lunchStart).getTime()) / 60000);
    return `${diff} min`;
  };

  const workDuration = () => {
    if (!activity.workStartedAt) return null;
    const end = activity.workEndedAt ? new Date(activity.workEndedAt) : new Date();
    const diffMin = Math.floor((end.getTime() - new Date(activity.workStartedAt).getTime()) / 60000);
    const h = Math.floor(diffMin / 60);
    const m = diffMin % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const getDurationMinutes = (start: string | null, end?: string | null) => {
    if (!start) return 0;
    const endTime = end ? new Date(end) : new Date();
    const diff = Math.floor((endTime.getTime() - new Date(start).getTime()) / 60000);
    return Math.max(0, diff);
  };

  const workMinutes = getDurationMinutes(activity.workStartedAt, activity.workEndedAt);
  const lunchMinutes = getDurationMinutes(activity.lunchStart, activity.lunchEnd);
  const activeMinutes = Math.max(0, workMinutes - lunchMinutes);
  const lunchCompleted = Boolean(activity.lunchEnd && !activity.isLunch);

  // Interactive graph data: 30-min buckets for today's work session.
  const buckets = timeline?.buckets ?? [];
  const hasBuckets = buckets.length > 0;
  const sessionGraphData = hasBuckets
    ? buckets
    : [{ name: "Today", active: activeMinutes, break: lunchMinutes }];

  const selectedBucket = selectedSlot
    ? buckets.find((b) => b.time === selectedSlot) ?? null
    : null;

  // "Now" marker slot while the session is running (matches bucket labels HH:MM).
  const nowDate = new Date();
  const nowSlot =
    activity.isWorking && hasBuckets
      ? `${String(nowDate.getHours()).padStart(2, "0")}:${
          nowDate.getMinutes() < 30 ? "00" : "30"
        }`
      : null;
  const nowInRange =
    nowSlot !== null &&
    buckets.some((b) => b.time === nowSlot);

  const summaryTotals = timeline?.totals ?? {
    mouse: activity.mouseEvents,
    keyboard: activity.keyboardEvents,
    tabs: activity.tabSwitches,
    activeMinutes,
    breakMinutes: lunchMinutes,
  };

  const toggleSeries = (key: "active" | "break" | "events") => {
    setVisibleSeries((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64 text-muted-foreground text-sm">
        Loading WFH status...
      </div>
    );
  }

  // ── Not approved state ────────────────────────────────────────────────────
  if (!activity.hasApprovedWfh) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-[60vh] gap-4 text-center">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
          <ShieldX className="w-8 h-8 text-red-500" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-foreground">No Approved WFH for Today</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            Activity monitoring is only available on days when your work-from-home request has been approved.
            Please apply for WFH and wait for approval.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push("/user/wfh")} className="shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-green-500" />
              <h1 className="text-2xl font-bold text-foreground">WFH Activity Monitor</h1>
            </div>
          <p className="text-sm text-muted-foreground mt-1">
            Your activity is monitored to track productivity during work-from-home.
          </p>
        </div>
      </div>

        <div className="flex items-center gap-2">
          {/* Lunch toggle — only when working */}
          {activity.isWorking && (
            <Button
              onClick={handleLunchToggle}
              loading={lunchLoading}
              disabled={lunchCompleted}
              variant={activity.isLunch ? "destructive" : "outline"}
              size="sm"
              className="flex items-center gap-2"
            >
              <UtensilsCrossed className="w-4 h-4" />
              {activity.isLunch
                ? "End Lunch"
                : lunchCompleted
                ? "Lunch Completed"
                : "Start Lunch"}
            </Button>
          )}

          {/* Work session toggle */}
          <Button
            onClick={handleWorkToggle}
            loading={workLoading}
            variant={activity.isWorking ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            {activity.isWorking ? (
              <><Square className="w-4 h-4" /> End Work</>
            ) : activity.workEndedAt ? (
              <><Play className="w-4 h-4" /> Resume Work</>
            ) : (
              <><Play className="w-4 h-4" /> Start Work</>
            )}
          </Button>
        </div>
      </div>

      {/* Work session card */}
      {activity.workStartedAt && (
        <div className={`rounded-xl border p-4 flex items-center gap-4 ${
          activity.isWorking
            ? "border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-700"
            : "border-border bg-muted/30"
        }`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
            activity.isWorking
              ? "bg-green-100 dark:bg-green-800"
              : "bg-muted"
          }`}>
            <Activity className={`w-5 h-5 ${activity.isWorking ? "text-green-600 dark:text-green-300 animate-pulse" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className={`font-semibold ${activity.isWorking ? "text-green-800 dark:text-green-200" : "text-foreground"}`}>
              {activity.isWorking ? "Work Session Active" : "Work Session Ended"}
            </p>
            <p className="text-xs text-muted-foreground">
              Started: {formatTime(activity.workStartedAt)}
              {activity.workEndedAt && ` · Ended: ${formatTime(activity.workEndedAt)}`}
              {workDuration() && ` · Duration: ${workDuration()}`}
            </p>
          </div>
          {activity.isWorking && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Tracking
            </div>
          )}
        </div>
      )}

      {/* Prompt to start work */}
      {!activity.workStartedAt && (
        <div className="rounded-xl border border-dashed border-border p-6 flex flex-col items-center gap-2 text-center text-muted-foreground">
          <Play className="w-8 h-8 opacity-30" />
          <p className="text-sm">Click <strong>Start Work</strong> to begin your work session and enable activity tracking.</p>
        </div>
      )}

      {/* Lunch status card */}
      {activity.isWorking && (activity.isLunch || activity.lunchStart) && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-900/20 dark:border-amber-700 p-4 flex items-center gap-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800 flex items-center justify-center">
            <UtensilsCrossed className="w-5 h-5 text-amber-600 dark:text-amber-300" />
          </div>
          <div>
            <p className="font-semibold text-amber-800 dark:text-amber-200">
              {activity.isLunch ? "Currently on Lunch Break" : "Lunch Completed"}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Started: {formatTime(activity.lunchStart)}
              {activity.lunchEnd && ` · Ended: ${formatTime(activity.lunchEnd)}`}
              {lunchDuration() && ` · Duration: ${lunchDuration()}`}
            </p>
          </div>
        </div>
      )}

      {/* Session Graph — interactive timeline, only shown when work has been started */}
      {activity.workStartedAt && (
        <div className="rounded-xl border p-4 bg-card">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Work Session Graph</p>
              <p className="text-xs text-muted-foreground">
                {hasBuckets
                  ? "Hover a slot for details, click it to inspect. Updates every minute while you work."
                  : "Visual summary of your active time and break time today."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {hasBuckets && (
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  Live
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleManualRefresh}
                loading={refreshing || timelineLoading}
                className="gap-1.5 text-xs h-8"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Summary chips */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Activity className="w-3.5 h-3.5 text-green-600" />
                Active
              </div>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {formatMinutes(summaryTotals.activeMinutes)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <UtensilsCrossed className="w-3.5 h-3.5 text-amber-600" />
                Break
              </div>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {formatMinutes(summaryTotals.breakMinutes)}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <MousePointerClick className="w-3.5 h-3.5 text-blue-600" />
                Mouse
              </div>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {summaryTotals.mouse.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Keyboard className="w-3.5 h-3.5 text-violet-600" />
                Keystrokes
              </div>
              <p className="text-sm font-semibold text-foreground mt-0.5">
                {summaryTotals.keyboard.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              {hasBuckets ? (
                <ComposedChart
                  data={buckets}
                  margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
                  onClick={(state) => {
                    const idx = state.activeIndex;
                    if (typeof idx === "number" && idx >= 0 && idx < buckets.length) {
                      const slot = buckets[idx];
                      setSelectedSlot((prev) =>
                        prev === slot.time ? null : slot.time,
                      );
                    }
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="time"
                    tick={{ fontSize: 11 }}
                    interval="preserveStartEnd"
                    minTickGap={16}
                  />
                  <YAxis yAxisId="minutes" tick={{ fontSize: 11 }} width={40} />
                  <YAxis
                    yAxisId="events"
                    orientation="right"
                    tick={{ fontSize: 11 }}
                    width={40}
                    allowDecimals={false}
                  />
                  <ChartTooltip content={<SessionTooltip />} cursor={{ fill: "rgba(0,0,0,0.04)" }} />
                  {nowInRange && nowSlot && (
                    <ReferenceLine
                      yAxisId="minutes"
                      x={nowSlot}
                      stroke="#2563eb"
                      strokeDasharray="4 4"
                      label={{
                        value: "Now",
                        position: "insideTopRight",
                        fontSize: 10,
                        fill: "#2563eb",
                      }}
                    />
                  )}
                  <Bar
                    yAxisId="minutes"
                    dataKey="activeMinutes"
                    stackId="time"
                    name="Active (min)"
                    hide={!visibleSeries.active}
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                  >
                    {buckets.map((bucket) => (
                      <Cell
                        key={bucket.time}
                        fill={
                          selectedSlot === bucket.time
                            ? "#15803d"
                            : STATUS_COLORS[bucket.status === "outside" ? "active" : bucket.status]
                        }
                      />
                    ))}
                  </Bar>
                  <Bar
                    yAxisId="minutes"
                    dataKey="breakMinutes"
                    stackId="time"
                    name="Break (min)"
                    hide={!visibleSeries.break}
                    radius={[4, 4, 0, 0]}
                    cursor="pointer"
                  >
                    {buckets.map((bucket) => (
                      <Cell
                        key={bucket.time}
                        fill={selectedSlot === bucket.time ? "#d97706" : "#f59e0b"}
                      />
                    ))}
                  </Bar>
                  <Line
                    yAxisId="events"
                    type="monotone"
                    dataKey="total"
                    name="Input events"
                    stroke="#2563eb"
                    strokeWidth={2}
                    dot={{ r: 2, fill: "#2563eb" }}
                    hide={!visibleSeries.events}
                  />
                </ComposedChart>
              ) : (
                <BarChart data={sessionGraphData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <ChartTooltip />
                  <Bar dataKey="active" stackId="time" fill="#16a34a" name="Active (min)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="break" stackId="time" fill="#f59e0b" name="Break (min)" radius={[6, 6, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          {/* Interactive legend — click to show/hide series */}
          {hasBuckets && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <LegendChip
                color="#16a34a"
                label="Active (min)"
                visible={visibleSeries.active}
                onClick={() => toggleSeries("active")}
              />
              <LegendChip
                color="#f59e0b"
                label="Break (min)"
                visible={visibleSeries.break}
                onClick={() => toggleSeries("break")}
              />
              <LegendChip
                color="#2563eb"
                label="Input events"
                visible={visibleSeries.events}
                onClick={() => toggleSeries("events")}
              />
            </div>
          )}

          {/* Selected slot drill-down */}
          {selectedBucket && (
            <div className="mt-3 rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50/60 dark:bg-blue-950/30 p-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <p className="text-xs font-semibold text-blue-800 dark:text-blue-200">
                    {formatSlotRange(selectedBucket)}
                  </p>
                  <span
                    className="rounded-full px-2 py-0.5 text-[11px] font-medium"
                    style={{
                      color: STATUS_COLORS[selectedBucket.status],
                      backgroundColor: `${STATUS_COLORS[selectedBucket.status]}1a`,
                    }}
                  >
                    {STATUS_LABELS[selectedBucket.status]}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSlot(null)}
                  className="h-6 px-2 text-xs"
                >
                  Clear
                </Button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
                <div>
                  <p className="text-muted-foreground">Active</p>
                  <p className="font-semibold text-green-600 dark:text-green-400">
                    {selectedBucket.activeMinutes} min
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Break</p>
                  <p className="font-semibold text-amber-600 dark:text-amber-400">
                    {selectedBucket.breakMinutes} min
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Mouse</p>
                  <p className="font-semibold text-foreground">
                    {selectedBucket.mouse.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Keystrokes</p>
                  <p className="font-semibold text-foreground">
                    {selectedBucket.keyboard.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Tab switches</p>
                  <p className="font-semibold text-foreground">
                    {selectedBucket.tabs.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              Last active:{" "}
              {activity.lastActiveAt
                ? new Date(activity.lastActiveAt).toLocaleTimeString()
                : "No activity recorded yet"}
            </span>
            {hasBuckets && !selectedSlot && (
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5" />
                Click a slot on the chart to see details.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Inactivity Dialog */}
      <Dialog open={inactiveDialogOpen} onOpenChange={setInactiveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-orange-500" />
              Are you still there?
            </DialogTitle>
            <DialogDescription>
              No activity has been detected for the past 15 minutes. Please
              interact with your screen to confirm you are still working.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-2">
            <Button onClick={() => setInactiveDialogOpen(false)}>
              Yes, I&apos;m here!
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
