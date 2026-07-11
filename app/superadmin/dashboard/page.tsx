"use client";

import { useEffect, useState } from "react";
import { getSuperadminStats } from "@/app/api/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Users,
  Building2,
  BadgeDollarSign,
  TrendingUp,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Server,
  Database,
  Mail,
  HardDrive,
  CheckCircle,
  HelpCircle,
  Plus,
  RefreshCw,
  Bell
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import Link from "next/link";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

type Stats = {
  totalOrganizations: number;
  activeOrganizations: number;
  totalUsers: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  estimatedMRR: number;
  planBreakdown: {
    BASIC: number;
    PRO: number;
    ENTERPRISE: number;
  };
  recentSignups: Array<{
    id: string;
    name: string;
    email: string;
    createdOn: string;
    isActive: boolean;
  }>;
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

export default function SuperadminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await getSuperadminStats();
        setStats(res.data);
      } catch (err) {
        toast.error("Failed to fetch platform statistics.");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p className="text-muted-foreground">Error loading dashboard statistics.</p>
      </div>
    );
  }

  const pieData = [
    { name: "Basic Plan", value: stats.planBreakdown.BASIC || 0 },
    { name: "Pro Plan", value: stats.planBreakdown.PRO || 0 },
    { name: "Enterprise Plan", value: stats.planBreakdown.ENTERPRISE || 0 },
  ].filter(d => d.value > 0);

  const barData = [
    { name: "Basic", count: stats.planBreakdown.BASIC || 0, fill: "#3b82f6" },
    { name: "Pro", count: stats.planBreakdown.PRO || 0, fill: "#10b981" },
    { name: "Enterprise", count: stats.planBreakdown.ENTERPRISE || 0, fill: "#f59e0b" },
  ];

  // Calculate subscription health ratio (Paid vs Total active)
  const totalActiveContracts = stats.activeSubscriptions + stats.trialSubscriptions;
  const paidRatio = totalActiveContracts > 0 ? (stats.activeSubscriptions / totalActiveContracts) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 md:p-8 text-white shadow-md">
        <div className="relative z-10 space-y-2 max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/30 px-3 py-1 text-xs font-semibold tracking-wider text-blue-100 uppercase">
            <Sparkles className="h-3 w-3 text-blue-200 animate-spin" /> SaaS Management Center
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Welcome, Super Administrator</h1>
          <p className="text-blue-100 text-sm leading-relaxed">
            Monitor and configure tenant clusters, default and customized plans, billing agreements, and security events.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none hidden md:block" />
      </div>

      {/* Main Grid: Core stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border border-blue-100 dark:border-blue-950 bg-gradient-to-br from-white to-blue-50/10 dark:from-gray-900 dark:to-blue-950/5 shadow-sm hover:shadow-md transition-all hover:scale-[1.01]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Customers</CardTitle>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <Building2 className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">{stats.totalOrganizations}</div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-emerald-600">{stats.activeOrganizations}</span> active customers
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-100 dark:border-emerald-950 bg-gradient-to-br from-white to-emerald-50/10 dark:from-gray-900 dark:to-emerald-950/5 shadow-sm hover:shadow-md transition-all hover:scale-[1.01]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Platform Users</CardTitle>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Users className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">{stats.totalUsers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1.5">Registered workforce database size</p>
          </CardContent>
        </Card>

        <Card className="border border-amber-100 dark:border-amber-950 bg-gradient-to-br from-white to-amber-50/10 dark:from-gray-900 dark:to-amber-950/5 shadow-sm hover:shadow-md transition-all hover:scale-[1.01]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Active Subscriptions</CardTitle>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
              <ShieldCheck className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">{stats.activeSubscriptions + stats.trialSubscriptions}</div>
            <p className="text-xs text-muted-foreground mt-1.5">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.activeSubscriptions}</span> paid, {stats.trialSubscriptions} trials
            </p>
          </CardContent>
        </Card>

        <Card className="border border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-white to-indigo-50/10 dark:from-gray-900 dark:to-indigo-950/5 shadow-sm hover:shadow-md transition-all hover:scale-[1.01]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Monthly Run-rate</CardTitle>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">₹{stats.estimatedMRR.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1.5 text-emerald-600 text-xs font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>Active contracts MRR</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Visual Analytics Section */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Plan Breakdown */}
        <Card className="md:col-span-2 border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle>Plan Subscription Analysis</CardTitle>
            <CardDescription>Visual breakdown of registered companies by subscription plan tier.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {pieData.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 h-full items-center">
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={85}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${value} Tenants`, "Volume"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-4 px-4">
                  {pieData.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 border-b last:border-0">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <span className="text-sm font-semibold">{item.value} Org(s)</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No active pricing contracts to display.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contract Health (Paid vs Trial) */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Billing Conversion Health</CardTitle>
            <CardDescription>Ratio of paid subscriptions versus active trial signups.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-4">
              <span className="text-4xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
                {paidRatio.toFixed(0)}%
              </span>
              <p className="text-xs text-muted-foreground mt-1.5 uppercase tracking-wider font-semibold">
                Paid Conversion Ratio
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Paid Subscriptions</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{stats.activeSubscriptions}</span>
              </div>
              <Progress value={paidRatio} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Trial Subscriptions</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">{stats.trialSubscriptions}</span>
              </div>
            </div>
            <div className="p-3 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/50 dark:border-blue-900/30 rounded-xl text-xs text-blue-700 dark:text-blue-300">
              Increase conversion by managing custom SLA configurations on the plan parameters.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Grid: System Status & Recent Customers */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Recent Registrations */}
        <Card className="md:col-span-2 border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Customer Signups</CardTitle>
            <CardDescription>Last 5 organizations boarded on the HRMS cluster.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3.5">
              {stats.recentSignups.map((org) => (
                <div key={org.id} className="flex items-center justify-between p-3.5 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold shrink-0">
                      {org.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm">{org.name}</h4>
                      <p className="text-xs text-muted-foreground">{org.email || "No email provided"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-xs font-semibold">{new Date(org.createdOn).toLocaleDateString()}</p>
                      <p className="text-[10px] text-muted-foreground">Joined</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${org.isActive ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300"}`}>
                      {org.isActive ? "Active" : "Suspended"}
                    </span>
                  </div>
                </div>
              ))}
              {stats.recentSignups.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-6">No organizations registered yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Health Check (High fidelity refinement) */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5">
              <Server className="h-5 w-5 text-blue-600" /> Platform Infrastructure
            </CardTitle>
            <CardDescription>Real-time online status of cluster services.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 flex-1">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/20">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium">PostgreSQL Database</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                  <CheckCircle className="h-3.5 w-3.5" /> Online
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/20">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium">Redis Cache Storage</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                  <CheckCircle className="h-3.5 w-3.5" /> Online
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/20">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium">Brevo SMTP Engine</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                  <CheckCircle className="h-3.5 w-3.5" /> Online
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/20">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-medium">Cloudinary CDN Server</span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase">
                  <CheckCircle className="h-3.5 w-3.5" /> Online
                </div>
              </div>
            </div>
            <div className="text-[10px] text-muted-foreground text-center pt-2">
              SaaS Cluster: <strong>avinyahrms.duckdns.org</strong>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
