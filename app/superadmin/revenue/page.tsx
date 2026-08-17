"use client";

import { useEffect, useState } from "react";
import { getSuperadminRevenue } from "@/app/api/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  BadgeDollarSign,
  TrendingUp,
  TrendingDown,
  Building2,
  Search,
  IndianRupee,
  PieChart as PieChartIcon,
  Users,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import Link from "next/link";

type OrgRevenue = {
  organizationId: string;
  organizationName: string;
  email: string | null;
  isActive: boolean;
  planName: string;
  planType: string | null;
  subscriptionStatus: string;
  monthlyRevenue: number;
  totalPaid: number;
  startDate: string | null;
  endDate: string | null;
  renewalDate: string | null;
  autoRenew: boolean;
  userCount: number;
};

type RevenueData = {
  totalRevenue: number;
  monthlyRecurringRevenue: number;
  annualRecurringRevenue: number;
  orgRevenue: OrgRevenue[];
};

const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "paying" | "trial" | "none">("all");

  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const res = await getSuperadminRevenue();
        setData(res.data);
      } catch (err) {
        console.error("Failed to fetch revenue data");
      } finally {
        setLoading(false);
      }
    };
    fetchRevenue();
  }, []);

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <p className="text-muted-foreground">Error loading revenue data.</p>
      </div>
    );
  }

  const filteredOrgs = data.orgRevenue.filter((org) => {
    const matchesSearch =
      org.organizationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (org.email && org.email.toLowerCase().includes(searchQuery.toLowerCase()));

    if (filter === "paying") return matchesSearch && org.subscriptionStatus === "ACTIVE";
    if (filter === "trial") return matchesSearch && org.subscriptionStatus === "TRIAL";
    if (filter === "none") return matchesSearch && org.subscriptionStatus === "NONE";
    return matchesSearch;
  });

  // Plan distribution for pie chart
  const planDistribution = data.orgRevenue.reduce((acc, org) => {
    const key = org.planType || "No Plan";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.entries(planDistribution).map(([name, value]) => ({
    name: name === "No Plan" ? "Unsubscribed" : name,
    value,
  }));

  // Top earners for bar chart
  const topEarners = data.orgRevenue
    .filter((o) => o.monthlyRevenue > 0)
    .slice(0, 8)
    .map((o) => ({
      name: o.organizationName.length > 12 ? o.organizationName.slice(0, 12) + "..." : o.organizationName,
      revenue: o.monthlyRevenue,
    }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 md:p-8 text-white shadow-md">
        <div className="relative z-10 space-y-2 max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/30 px-3 py-1 text-xs font-semibold tracking-wider text-emerald-100 uppercase">
            <IndianRupee className="h-3 w-3" /> Revenue Analytics
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight">Revenue Dashboard</h1>
          <p className="text-emerald-100 text-sm leading-relaxed">
            Track monthly recurring revenue, annual projections, and per-organization billing performance.
          </p>
        </div>
        <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-gradient-to-l from-white/10 to-transparent pointer-events-none hidden md:block" />
      </div>

      {/* Core Revenue Metrics */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border border-emerald-100 dark:border-emerald-950 bg-gradient-to-br from-white to-emerald-50/10 dark:from-gray-900 dark:to-emerald-950/5 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Total Revenue (All Time)</CardTitle>
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <BadgeDollarSign className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">₹{data.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1.5">Cumulative billing from all subscriptions</p>
          </CardContent>
        </Card>

        <Card className="border border-blue-100 dark:border-blue-950 bg-gradient-to-br from-white to-blue-50/10 dark:from-gray-900 dark:to-blue-950/5 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Monthly Recurring Revenue</CardTitle>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
              <TrendingUp className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">₹{data.monthlyRecurringRevenue.toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-1.5 text-emerald-600 text-xs font-semibold">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>MRR from active contracts</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-indigo-100 dark:border-indigo-950 bg-gradient-to-br from-white to-indigo-50/10 dark:from-gray-900 dark:to-indigo-950/5 shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Annual Recurring Revenue</CardTitle>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Calendar className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold tracking-tight">₹{data.annualRecurringRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1.5">Projected yearly revenue (MRR × 12)</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Revenue by Org - Bar Chart */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="h-5 w-5 text-blue-600" /> Top Earners by MRR
            </CardTitle>
            <CardDescription>Monthly recurring revenue per organization.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {topEarners.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topEarners} layout="vertical" margin={{ left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis type="number" tickFormatter={(v) => `₹${v}`} fontSize={12} />
                  <YAxis type="category" dataKey="name" width={100} fontSize={11} />
                  <Tooltip formatter={(value: any) => [`₹${Number(value).toLocaleString()}`, "MRR"]} />
                  <Bar dataKey="revenue" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No revenue data to display.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Plan Distribution */}
        <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChartIcon className="h-5 w-5 text-emerald-600" /> Plan Distribution
            </CardTitle>
            <CardDescription>Breakdown of organizations by plan type.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`${value} Org(s)`, "Count"]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                No plan data to display.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue Table */}
      <Card className="border border-gray-200 dark:border-gray-800 shadow-sm">
        <CardHeader className="pb-3 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <CardTitle>Organization Revenue Breakdown</CardTitle>
            <CardDescription>Detailed billing performance per customer.</CardDescription>
          </div>
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-1.5">
              {(["all", "paying", "trial", "none"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                    filter === f
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {f === "all" ? "All" : f === "paying" ? "Paying" : f === "trial" ? "Trial" : "No Plan"}
                </button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredOrgs.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Organization</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">MRR</TableHead>
                    <TableHead className="text-right">Total Paid</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrgs.map((org) => (
                    <TableRow key={org.organizationId} className="hover:bg-gray-50/50 dark:hover:bg-gray-850/40">
                      <TableCell className="font-semibold">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold shrink-0">
                            {org.organizationName.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-sm block">{org.organizationName}</span>
                            <span className="text-xs text-muted-foreground font-normal">{org.email || "No email"}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm font-medium">{org.planName}</span>
                        {org.planType && (
                          <span className="text-xs block text-muted-foreground">{org.planType}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={org.subscriptionStatus === "ACTIVE" ? "default" : org.subscriptionStatus === "TRIAL" ? "secondary" : "outline"}
                          className={
                            org.subscriptionStatus === "ACTIVE"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : org.subscriptionStatus === "TRIAL"
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : ""
                          }
                        >
                          {org.subscriptionStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ₹{org.monthlyRevenue.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        ₹{org.totalPaid.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center text-sm">
                        <div className="flex items-center justify-center gap-1">
                          <Users className="h-3.5 w-3.5 text-muted-foreground" />
                          {org.userCount}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {org.endDate
                          ? new Date(org.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Link
                          href={`/superadmin/organizations/${org.organizationId}`}
                          className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400"
                        >
                          View <ArrowUpRight className="h-3.5 w-3.5" />
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/60 mb-3" />
              <h3 className="font-semibold text-lg">No organizations found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                No results match your current filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
