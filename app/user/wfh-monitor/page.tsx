"use client";

import { useCallback, useEffect, useState } from "react";
import { useWfhMonitor } from "@/hooks/useWfhMonitor";
import { getWfhToday, wfhToggleLunch, wfhToggleWork } from "@/app/api/api";
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
  UtensilsCrossed,
  Activity,
  Clock,
  Play,
  Square,
  ShieldCheck,
  ShieldX,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
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

export default function WfhMonitorPage() {
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
  }, []);

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
  const sessionGraphData = [
    { name: "Today", active: activeMinutes, break: lunchMinutes },
  ];

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
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-green-500" />
            <h1 className="text-2xl font-bold text-foreground">WFH Activity Monitor</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Your activity is monitored to track productivity during work-from-home.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Lunch toggle — only when working */}
          {activity.isWorking && (
            <Button
              onClick={handleLunchToggle}
              disabled={lunchLoading || lunchCompleted}
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
            disabled={workLoading}
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

      {/* Session Graph — only shown when work has been started */}
      {activity.workStartedAt && (
        <div className="rounded-xl border p-4 bg-card">
          <div className="mb-3">
            <p className="text-sm font-semibold text-foreground">Work Session Graph</p>
            <p className="text-xs text-muted-foreground">
              Visual summary of your active time and break time today.
            </p>
          </div>

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sessionGraphData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip />
                <Bar dataKey="active" stackId="time" fill="#16a34a" name="Active (min)" radius={[6, 6, 0, 0]} />
                <Bar dataKey="break" stackId="time" fill="#f59e0b" name="Break (min)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            Last active:{" "}
            {activity.lastActiveAt
              ? new Date(activity.lastActiveAt).toLocaleTimeString()
              : "No activity recorded yet"}
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
              No activity has been detected for the past 5 minutes. Please
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
