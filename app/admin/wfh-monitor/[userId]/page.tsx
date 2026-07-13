"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Sparkles,
  Award,
  TrendingUp,
  Zap,
  Flame,
  Target,
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
  AreaChart,
  Area,
} from "recharts";
import { motion, AnimatePresence } from "framer-motion";

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string | null) {
  if (!iso) return "\u2014";
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

function formatDurationShort(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHART_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#d946ef",
  "#ec4899", "#f43f5e", "#f97316", "#eab308",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6",
];

const GRADIENT_PAIRS: [string, string][] = [
  ["#6366f1", "#a855f7"],
  ["#06b6d4", "#3b82f6"],
  ["#22c55e", "#14b8a6"],
  ["#f97316", "#eab308"],
  ["#ec4899", "#d946ef"],
  ["#f43f5e", "#ef4444"],
];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.charAt(0).toUpperCase();
}

function computeProductivityScore(summary: AppSummary | null): { score: number; label: string; color: string } {
  if (!summary || summary.totals.durationSeconds === 0) return { score: 0, label: "No Data", color: "#6b7280" };
  const totalSec = summary.totals.durationSeconds;
  const raw = Math.min(100, Math.round((summary.totals.keystrokes * 0.3 + summary.totals.clicks * 0.1 + totalSec * 0.02) / 36));
  const score = Math.min(100, Math.max(0, raw));
  if (score >= 80) return { score, label: "Excellent", color: "#22c55e" };
  if (score >= 60) return { score, label: "Good", color: "#14b8a6" };
  if (score >= 40) return { score, label: "Moderate", color: "#eab308" };
  if (score >= 20) return { score, label: "Low", color: "#f97316" };
  return { score, label: "Minimal", color: "#ef4444" };
}

// ─── Animated Counter ─────────────────────────────────────────────────────────

function AnimatedCounter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  const ref = useRef<number>(0);
  useEffect(() => {
    const start = ref.current;
    const end = value;
    const duration = 1200;
    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      ref.current = Math.floor(start + (end - start) * eased);
      setDisplay(ref.current);
      if (progress < 1) requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }, [value]);
  return <>{display.toLocaleString()}{suffix}</>;
}

// ─── Circular Gauge ───────────────────────────────────────────────────────────

function CircularGauge({ score, color, label }: { score: number; color: string; label: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative flex flex-col items-center justify-center">
      <svg width="140" height="140" className="transform -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-black/5 dark:text-white/5" />
        <motion.circle
          cx="70" cy="70" r={radius}
          fill="none" stroke={color}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: [0.32, 0.72, 0, 1] }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-2xl font-bold tracking-tight"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.6, duration: 0.4 }}
          style={{ color }}
        >
          {score}
        </motion.span>
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mt-0.5">{label}</span>
      </div>
    </div>
  );
}

// ─── Stagger Item ─────────────────────────────────────────────────────────────

const stagger = {
  hidden: { opacity: 0, y: 20 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: [0.32, 0.72, 0, 1] as [number, number, number, number] },
  }),
};

// ─── Glass Card ───────────────────────────────────────────────────────────────

function GlassCard({ children, className = "", gradient = "", delay = 0, style }: {
  children: React.ReactNode;
  className?: string;
  gradient?: string;
  delay?: number;
  style?: React.CSSProperties;
}) {
  return (
    <motion.div
      variants={stagger}
      custom={delay}
      initial="hidden"
      animate="show"
      className={`relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-transparent backdrop-blur-xl shadow-none ${className}`}
      style={style}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
    >
      {gradient && (
        <div
          className="absolute inset-0 opacity-[0.07] dark:opacity-[0.12] pointer-events-none"
          style={{ background: gradient }}
        />
      )}
      {children}
    </motion.div>
  );
}

function GlassCardHeader({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-5 pt-4 pb-2 ${className}`}>
      {children}
    </div>
  );
}

function GlassCardContent({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-5 pb-5 ${className}`}>
      {children}
    </div>
  );
}

// ─── Icon Badge ───────────────────────────────────────────────────────────────

function IconBadge({ icon: Icon, gradient }: { icon: React.ElementType; gradient: string }) {
  return (
    <div
      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg"
      style={{ background: gradient }}
    >
      <Icon className="w-4 h-4 text-white" />
    </div>
  );
}

// ─── Background Mesh ──────────────────────────────────────────────────────────

function BackgroundMesh() {
  return (
    <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
      <div className="absolute -top-40 -right-40 w-[500px] h-[500px] rounded-full bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-transparent blur-3xl" />
      <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-emerald-500/10 via-teal-500/10 to-transparent blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-r from-amber-500/5 via-rose-500/5 to-violet-500/5 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0)_0%,rgba(255,255,255,0.4)_100%)] dark:bg-[radial-gradient(circle_at_50%_50%,rgba(0,0,0,0)_0%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}

// ─── Noise Texture ────────────────────────────────────────────────────────────

function NoiseTexture() {
  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 opacity-[0.015] dark:opacity-[0.03]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: "repeat",
        backgroundSize: "256px 256px",
      }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

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
  const [tab, setTab] = useState("overview");

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

      const activities: CurrentActivity[] = Array.isArray(currentRes.data) ? currentRes.data : [];
      const mine = activities.find((a: CurrentActivity) => a.userId === userId) ?? null;
      setCurrent(mine);
      if (mine?.name && mine.name !== userId) setEmployeeName(mine.name);

      const chart = chartRes.data as { buckets: string[]; employees: Array<{ userId: string; mouse: number[]; keyboard: number[] }> };
      if (chart?.buckets && chart?.employees) {
        const emp = chart.employees.find((e) => e.userId === userId);
        if (emp) {
          setChartData(
            chart.buckets.map((time, i) => ({
              time,
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
    ? { label: "Monitoring", color: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20", dot: "bg-green-500" }
    : activity?.workEndedAt
    ? { label: "Ended", color: "bg-muted/50 text-muted-foreground border-border", dot: "bg-muted-foreground" }
    : { label: "Not Started", color: "bg-muted/50 text-muted-foreground border-border", dot: "bg-muted-foreground" };

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

  const productivity = useMemo(() => computeProductivityScore(summary), [summary]);

  const totalActivity = useMemo(() => {
    const k = summary?.totals.keystrokes ?? activity?.keyboardEvents ?? 0;
    const m = summary?.totals.clicks ?? activity?.mouseEvents ?? 0;
    return k + m;
  }, [summary, activity]);

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-2xl" />
      </div>
    );
  }

  return (
    <>
      <BackgroundMesh />
      <NoiseTexture />
      <div className="p-4 md:p-6 space-y-6 relative z-0">
        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-xl hover:bg-black/5 dark:hover:bg-white/5">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-bold text-white flex-shrink-0 shadow-lg"
              style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}
            >
              {getInitials(employeeName)}
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{employeeName}</h1>
              <p className="text-sm text-muted-foreground/80">WFH Monitoring Details</p>
            </div>
            <Badge variant="outline" className={`text-xs px-3 py-1 border ${statusBadge.color}`}>
              <span className={`w-2 h-2 rounded-full mr-2 inline-block ${statusBadge.dot} ${statusBadge.label === "Monitoring" ? "animate-pulse" : ""}`} />
              {statusBadge.label}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-white/50 dark:bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/10">
              <Clock className="w-3.5 h-3.5" />
              <span>{date === new Date().toISOString().split("T")[0] ? "Today" : date}</span>
            </div>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40 text-sm rounded-xl border-white/20 bg-white/50 dark:bg-white/[0.04] backdrop-blur-sm" />
          </div>
        </motion.div>

        {/* ── Live Activity Banner ── */}
        <AnimatePresence>
          {current?.currentApp && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
              className="relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.06] to-teal-500/[0.06] dark:from-emerald-500/[0.08] dark:to-teal-500/[0.08] backdrop-blur-xl"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(16,185,129,0.1),transparent_70%)]" />
              <div className="relative px-5 py-4 flex items-center gap-3">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                    Currently using <span className="font-semibold">{current.currentApp}</span>
                    {current.keystrokeCount > 0 && (
                      <span className="ml-2 text-xs text-emerald-600/60 dark:text-emerald-400/60">
                        <Keyboard className="w-3 h-3 inline mr-0.5" />
                        {current.keystrokeCount} keystrokes
                      </span>
                    )}
                  </p>
                  {current.currentWindowTitle && (
                    <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70 truncate max-w-2xl mt-0.5">
                      {current.currentWindowTitle}
                    </p>
                  )}
                </div>
                <motion.div
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Sparkles className="w-4 h-4 text-emerald-500/60" />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Productivity Score Card ── */}
        <motion.div
          variants={stagger} custom={0} initial="hidden" animate="show"
          className="relative overflow-hidden rounded-2xl border border-white/10 dark:border-white/5 bg-transparent backdrop-blur-xl shadow-none"
        >
          <div className="absolute inset-0 opacity-[0.05] dark:opacity-[0.08]" style={{ background: "linear-gradient(135deg, #6366f1, #22c55e)" }} />
          <div className="relative px-5 py-5 flex flex-col sm:flex-row items-center gap-6">
            <CircularGauge score={productivity.score} color={productivity.color} label={productivity.label} />
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-center sm:justify-start gap-2">
                <Award className="w-4 h-4" style={{ color: productivity.color }} />
                Productivity Score
              </h2>
              <p className="text-sm text-muted-foreground/70 max-w-lg">
                Based on keyboard activity, mouse interaction, and total active duration.
              </p>
              <div className="flex flex-wrap gap-4 mt-3 justify-center sm:justify-start">
                {[
                  { label: "Active Time", value: formatDurationShort(summary?.totals.durationSeconds ?? 0), icon: Timer, gradient: "linear-gradient(135deg, #6366f1, #8b5cf6)" },
                  { label: "Total Actions", value: totalActivity.toLocaleString(), icon: Zap, gradient: "linear-gradient(135deg, #f97316, #eab308)" },
                  { label: "Apps Used", value: String(summary?.apps?.length ?? 0), icon: Layers, gradient: "linear-gradient(135deg, #22c55e, #14b8a6)" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-white/10">
                    <div className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm" style={{ background: item.gradient }}>
                      <item.icon className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold">{item.value}</p>
                      <p className="text-[10px] text-muted-foreground">{item.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Tabs ── */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="bg-white/60 dark:bg-white/[0.04] backdrop-blur-xl border border-white/10 rounded-xl p-1">
            <TabsTrigger value="overview" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm">
              <Activity className="w-4 h-4 mr-1.5" /> Overview
            </TabsTrigger>
            <TabsTrigger value="apps" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm">
              <Layers className="w-4 h-4 mr-1.5" /> App Breakdown
            </TabsTrigger>
            <TabsTrigger value="timeline" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-white/10 data-[state=active]:shadow-sm">
              <BarChart3 className="w-4 h-4 mr-1.5" /> Timeline
            </TabsTrigger>
          </TabsList>

          {/* ── Overview Tab ── */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { icon: Play, label: "Work Started", value: formatTime(activity?.workStartedAt ?? null), gradient: "linear-gradient(135deg, #6366f1, #a855f7)" },
                { icon: Pause, label: "Work Ended", value: activity?.workEndedAt ? formatTime(activity.workEndedAt) : isWorking ? "Ongoing" : "\u2014", gradient: "linear-gradient(135deg, #06b6d4, #3b82f6)" },
                { icon: Timer, label: "Session Duration", value: sessionDuration ?? "\u2014", gradient: "linear-gradient(135deg, #22c55e, #14b8a6)" },
                { icon: Coffee, label: "Lunch", value: isOnLunch ? "On Break" : lunchDuration ?? "\u2014", gradient: "linear-gradient(135deg, #f97316, #eab308)" },
              ].map((item, i) => (
                <GlassCard key={i} delay={i + 1} gradient={item.gradient}>
                  <GlassCardHeader>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.label}</span>
                      <IconBadge icon={item.icon} gradient={item.gradient} />
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <p className="text-xl font-bold tracking-tight mt-1">{item.value}</p>
                  </GlassCardContent>
                </GlassCard>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  icon: Keyboard, label: "Keystrokes", gradient: "linear-gradient(135deg, #ec4899, #d946ef)",
                  value: (summary?.totals.keystrokes ?? activity?.keyboardEvents ?? 0),
                  sub: activity?.keyboardEvents && summary?.totals.keystrokes
                    ? `${activity.keyboardEvents.toLocaleString()} browser + ${summary.totals.keystrokes.toLocaleString()} desktop`
                    : activity?.keyboardEvents ? `${activity.keyboardEvents.toLocaleString()} browser`
                    : summary?.totals.keystrokes ? `${summary.totals.keystrokes.toLocaleString()} desktop`
                    : null,
                },
                {
                  icon: MousePointerClick, label: "Mouse Clicks", gradient: "linear-gradient(135deg, #f43f5e, #f97316)",
                  value: (summary?.totals.clicks ?? activity?.mouseEvents ?? 0),
                  sub: activity?.mouseEvents && summary?.totals.clicks
                    ? `${activity.mouseEvents.toLocaleString()} browser + ${summary.totals.clicks.toLocaleString()} desktop`
                    : activity?.mouseEvents ? `${activity.mouseEvents.toLocaleString()} browser`
                    : summary?.totals.clicks ? `${summary.totals.clicks.toLocaleString()} desktop`
                    : null,
                },
                {
                  icon: Timer, label: "Active Time", gradient: "linear-gradient(135deg, #14b8a6, #06b6d4)",
                  value: 0, raw: summary?.totals.durationSeconds ?? 0,
                  sub: "Desktop app monitoring",
                },
              ].map((item, i) => (
                <GlassCard key={i} delay={i + 5} gradient={item.gradient}>
                  <GlassCardHeader>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{item.label}</span>
                      <IconBadge icon={item.icon} gradient={item.gradient} />
                    </div>
                  </GlassCardHeader>
                  <GlassCardContent>
                    <p className="text-2xl font-bold tracking-tight">
                      {"raw" in item
                        ? formatDuration(item.raw!)
                        : <AnimatedCounter value={item.value as number} />
                      }
                    </p>
                    {item.sub && (
                      <p className="text-xs text-muted-foreground/70 mt-1">{item.sub}</p>
                    )}
                  </GlassCardContent>
                </GlassCard>
              ))}
            </div>

            <GlassCard delay={8}>
              <GlassCardHeader>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #8b5cf6, #d946ef)" }}>
                    <Clock className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-semibold">Last Active</span>
                </div>
              </GlassCardHeader>
              <GlassCardContent>
                <p className="text-sm text-muted-foreground">
                  {current?.lastActivityAt
                    ? new Date(current.lastActivityAt).toLocaleString()
                    : activity?.lastActiveAt
                    ? new Date(activity.lastActiveAt).toLocaleString()
                    : "No activity recorded today"}
                </p>
              </GlassCardContent>
            </GlassCard>
          </TabsContent>

          {/* ── App Breakdown Tab ── */}
          <TabsContent value="apps" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GlassCard delay={1}>
                <GlassCardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #6366f1, #a855f7)" }}>
                        <PieChartIcon className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-semibold">App Time Distribution</span>
                    </div>
                    {pieData.length > 0 && (
                      <span className="text-xs text-muted-foreground">{pieData.length} apps</span>
                    )}
                  </div>
                </GlassCardHeader>
                <GlassCardContent>
                  {pieData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <PieChartIcon className="w-10 h-10 mb-3 opacity-30" />
                      <p className="text-sm">No app data recorded for this date.</p>
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={320}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%" cy="50%"
                          innerRadius={65}
                          outerRadius={105}
                          paddingAngle={3}
                          dataKey="value"
                          isAnimationActive={true}
                          animationBegin={200}
                          animationDuration={1200}
                          animationEasing="ease-out"
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="transparent" />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) => formatDuration(Number(value ?? 0))}
                          labelFormatter={(name) => String(name ?? "")}
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "rgba(255,255,255,0.8)",
                            backdropFilter: "blur(12px)",
                            fontSize: 12,
                          }}
                        />
                        <Legend
                          formatter={(value) => (
                            <span className="text-xs text-muted-foreground">{value}</span>
                          )}
                          iconType="circle"
                          iconSize={8}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </GlassCardContent>
              </GlassCard>

              <GlassCard delay={2}>
                <GlassCardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #22c55e, #14b8a6)" }}>
                        <Monitor className="w-4 h-4 text-white" />
                      </div>
                      <span className="text-sm font-semibold">Per-App Details</span>
                    </div>
                    {(summary?.apps ?? []).length > 0 && (
                      <span className="text-xs text-muted-foreground">{summary!.apps.length} tracked</span>
                    )}
                  </div>
                </GlassCardHeader>
                <GlassCardContent>
                  {(summary?.apps ?? []).length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Monitor className="w-10 h-10 mb-3 opacity-30" />
                      <p className="text-sm">No app data recorded for this date.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2 scrollbar-thin">
                      {(summary?.apps ?? []).map((app, i) => {
                        const colorIndex = i % GRADIENT_PAIRS.length;
                        const [c1, c2] = GRADIENT_PAIRS[colorIndex];
                        const pct = (app.durationSeconds / maxAppDuration) * 100;
                        return (
                          <motion.div
                            key={app.appName}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04, duration: 0.3 }}
                            className="space-y-1.5 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-white/5 hover:border-white/20 transition-colors"
                          >
                            <div className="flex items-center justify-between text-sm">
                              <span className="flex items-center gap-2 text-muted-foreground truncate min-w-0">
                                <div
                                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm"
                                  style={{ background: `linear-gradient(135deg, ${c1}, ${c2})` }}
                                />
                                <span className="truncate font-medium">{app.appName}</span>
                              </span>
                              <span className="font-bold flex-shrink-0 ml-2 text-xs" style={{ color: c1 }}>
                                {formatDuration(app.durationSeconds)}
                              </span>
                            </div>
                            <div className="relative h-2 rounded-full bg-black/[0.04] dark:bg-white/[0.04] overflow-hidden">
                              <motion.div
                                className="absolute inset-y-0 left-0 rounded-full"
                                style={{ background: `linear-gradient(90deg, ${c1}, ${c2})` }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.8, delay: i * 0.05, ease: [0.32, 0.72, 0, 1] }}
                              />
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                              <span className="flex items-center gap-1">
                                <Keyboard className="w-3 h-3" />
                                {app.keystrokeCount.toLocaleString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <MousePointerClick className="w-3 h-3" />
                                {app.mouseClicks.toLocaleString()}
                              </span>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </GlassCardContent>
              </GlassCard>
            </div>
          </TabsContent>

          {/* ── Timeline Tab ── */}
          <TabsContent value="timeline">
            <GlassCard delay={1}>
              <GlassCardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm" style={{ background: "linear-gradient(135deg, #f97316, #eab308)" }}>
                      <BarChart3 className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <span className="text-sm font-semibold">30-Minute Activity Buckets</span>
                      <p className="text-[10px] text-muted-foreground">Keyboard & mouse activity over time</p>
                    </div>
                  </div>
                  {chartData.length > 0 && (
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "linear-gradient(180deg, #6366f1, #8b5cf6)" }} />
                        Keyboard
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "linear-gradient(180deg, #22c55e, #14b8a6)" }} />
                        Mouse
                      </span>
                    </div>
                  )}
                </div>
              </GlassCardHeader>
              <GlassCardContent>
                {chartData.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                    <BarChart3 className="w-12 h-12 mb-3 opacity-30" />
                    <p className="text-sm">No time-series data available for this date.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="keyboardGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#8b5cf6" />
                            <stop offset="100%" stopColor="#6366f1" />
                          </linearGradient>
                          <linearGradient id="mouseGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#22c55e" />
                            <stop offset="100%" stopColor="#14b8a6" />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-black/[0.04] dark:stroke-white/[0.04]" stroke="currentColor" />
                        <XAxis
                          dataKey="time"
                          tick={{ fontSize: 10 }}
                          interval={1}
                          tickFormatter={(v: string) => v.replace(":00", "").replace(":30", "\u00BD")}
                          className="text-muted-foreground"
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11 }}
                          className="text-muted-foreground"
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            borderRadius: 12,
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "rgba(255,255,255,0.85)",
                            backdropFilter: "blur(12px)",
                            fontSize: 12,
                          }}
                          labelFormatter={(label) => `Time: ${String(label ?? "")}`}
                        />
                        <Bar
                          dataKey="keyboard"
                          name="Keyboard"
                          fill="url(#keyboardGradient)"
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={true}
                          animationBegin={200}
                          animationDuration={1000}
                          animationEasing="ease-out"
                        />
                        <Bar
                          dataKey="mouse"
                          name="Mouse"
                          fill="url(#mouseGradient)"
                          radius={[4, 4, 0, 0]}
                          isAnimationActive={true}
                          animationBegin={400}
                          animationDuration={1000}
                          animationEasing="ease-out"
                        />
                      </BarChart>
                    </ResponsiveContainer>

                    {/* Activity Summary Strip */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        {
                          label: "Peak Keyboard",
                          value: `${Math.max(...chartData.map((d) => d.keyboard)).toLocaleString()} actions`,
                          icon: Keyboard,
                          gradient: "linear-gradient(135deg, #8b5cf6, #6366f1)",
                        },
                        {
                          label: "Peak Mouse",
                          value: `${Math.max(...chartData.map((d) => d.mouse)).toLocaleString()} clicks`,
                          icon: MousePointerClick,
                          gradient: "linear-gradient(135deg, #22c55e, #14b8a6)",
                        },
                        {
                          label: "Active Buckets",
                          value: `${chartData.filter((d) => d.keyboard > 0 || d.mouse > 0).length}/${chartData.length}`,
                          icon: Activity,
                          gradient: "linear-gradient(135deg, #f97316, #eab308)",
                        },
                        {
                          label: "Total Activity",
                          value: `${chartData.reduce((s, d) => s + d.keyboard + d.mouse, 0).toLocaleString()} actions`,
                          icon: TrendingUp,
                          gradient: "linear-gradient(135deg, #ec4899, #d946ef)",
                        },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2.5 p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-white/5"
                        >
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center shadow-sm flex-shrink-0" style={{ background: item.gradient }}>
                            <item.icon className="w-4 h-4 text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">{item.label}</p>
                            <p className="text-xs font-semibold truncate">{item.value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </GlassCardContent>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
