"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import api, {
  getDashboardSummary,
  getUserActivities,
  getTodayAnomalies,
  getPolls,
  getNotices,
  getProfile,
  getHolidays,
  getLatestPosts,
  getLiveBreakOverview,
} from "@/app/api/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { format } from "date-fns";
import {
  Users, UserCheck, Calendar, AlertTriangle, Clock, Bell, Settings,
  Eye, EyeOff, Vote, Plus, UserPlus, PieChart, BarChart3, Heart, MessageCircle, Coffee
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart as RechartsPieChart, Pie, Cell
} from "recharts";

import { DEFAULT_WIDGETS, Widget } from "./components/types";
import { DashboardLoadingSkeleton } from "./components/DashboardSkeleton";
import { StatCard, WidgetCard } from "./components/StatCard";
import {
  PollWidget, NoticeWidget, BirthdayWidget, UserActivitiesWidget, HolidayWidget
} from "./components/DashboardWidgets";
import EmployeeAwardWidget from "./components/EmployeeAwardWidget";

const DEPARTMENT_COLORS = [
  "#93c5fd",
  "#86efac",
  "#fdba74",
  "#c4b5fd",
  "#7dd3fc",
  "#fca5a5",
  "#5eead4",
  "#fcd34d",
  "#f9a8d4",
  "#a5b4fc",
];

// AttendanceChart Component
function AttendanceChart({
  attendanceChartData,
  breakEmployees,
}: {
  attendanceChartData: any[];
  breakEmployees: any[];
}) {
  return (
    <WidgetCard>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Today's Attendance
          </div>
          <Link href="/admin/attendance">
            <Button variant="ghost" size="sm" className="text-xs">
              View Details →
            </Button>
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attendanceChartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <PieChart className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-sm font-medium">No attendance data</p>
            <p className="text-xs opacity-70">Data will appear once employees check in</p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <RechartsPieChart>
                <Pie data={attendanceChartData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value">
                  {attendanceChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip /><Legend />
              </RechartsPieChart>
            </ResponsiveContainer>

            <div className="mt-3 pt-3 border-t border-border/60">
              <div className="flex items-center gap-2 mb-2">
                <Coffee className="h-4 w-4 text-amber-600" />
                <p className="text-xs font-semibold text-muted-foreground">
                  Employees Currently on Break ({breakEmployees.length})
                </p>
              </div>
              {breakEmployees.length === 0 ? (
                <p className="text-xs text-muted-foreground">No one is on break right now.</p>
              ) : (
                <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                  {breakEmployees.slice(0, 5).map((emp, idx) => (
                    <div key={`${emp.userId}-${idx}`} className="flex items-center justify-between text-xs">
                      <span className="truncate pr-2">{emp.employeeName || "Employee"}</span>
                      <span className="text-amber-600 font-medium">{emp.breakMinutes} min</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </WidgetCard>
  );
}

// DepartmentChart Component
function DepartmentChart({ departmentData }: { departmentData: any[] }) {
  return (
    <WidgetCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Department Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {departmentData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <BarChart3 className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-sm font-medium">No department data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={departmentData}>
              <XAxis dataKey="name" fontSize={12} angle={-45} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip formatter={(value) => [value, 'Active Employees']} labelFormatter={(label) => `Department: ${label}`} />
              <Bar dataKey="employees" radius={[4, 4, 0, 0]} name="Active Employees">
                {departmentData.map((entry, index) => (
                  <Cell
                    key={`dept-color-${entry.name}-${index}`}
                    fill={DEPARTMENT_COLORS[index % DEPARTMENT_COLORS.length]}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </WidgetCard>
  );
}

// AttendanceAnomaliesWidget Component
function AttendanceAnomaliesWidget({ anomalies }: { anomalies: any[] }) {
  return (
    <WidgetCard>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          Anomalies
          {anomalies.length > 0 && <Badge variant="destructive" className="ml-2">{anomalies.length}</Badge>}
        </CardTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs">
              View All
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto w-[90vw]">
            <DialogHeader>
              <DialogTitle>All Attendance Anomalies</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {anomalies.length > 0 ? anomalies.map((anomaly, index) => (
                <div key={index} className="bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 hover:shadow-md transition-all duration-200">
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 mt-1">
                      <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <AlertTriangle className="h-5 w-5 text-red-500" />
                      </div>
                    </div>
                    {anomaly.photoUrl && (
                      <div className="flex-shrink-0">
                        <img src={anomaly.photoUrl} alt="Employee Photo" className="w-16 h-16 rounded-lg object-cover border-2 border-white dark:border-gray-700 shadow-sm" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                            {anomaly.anomalyReason || 'Attendance Anomaly'}
                          </h4>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <Badge variant="outline" className="text-xs font-medium bg-blue-50 text-blue-700 border-blue-200">{anomaly.type}</Badge>
                            <Badge variant="outline" className="text-xs font-medium bg-purple-50 text-purple-700 border-purple-200">{anomaly.source}</Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {format(new Date(anomaly.timestamp), 'MMM dd, HH:mm')}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Employee:</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {anomaly.user ? `${anomaly.user.firstName} ${anomaly.user.lastName}`.trim() : 'Unknown'}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Email:</span>
                            <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{anomaly.user?.email || 'Unknown'}</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          {anomaly.locationAddress && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Location:</span>
                              <span className="text-sm text-gray-600 dark:text-gray-400 truncate">{anomaly.locationAddress}</span>
                            </div>
                          )}
                          {anomaly.deviceInfo && (
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Device:</span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">{anomaly.deviceInfo}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      {(anomaly.wifiSsid || anomaly.wifiBssid) && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-4 h-4 bg-indigo-500 rounded-sm"></div>
                            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">Network Information</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            {anomaly.wifiSsid && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">SSID:</span>
                                <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">{anomaly.wifiSsid}</span>
                              </div>
                            )}
                            {anomaly.wifiBssid && (
                              <div className="flex items-center gap-2">
                                <span className="text-gray-500">BSSID:</span>
                                <span className="font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-700 dark:text-gray-300">{anomaly.wifiBssid}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {(anomaly.faceMatchScore !== undefined || anomaly.faceVerified !== undefined) && (
                        <div className="mt-3 flex items-center gap-3 p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Face Match:</span>
                            <Badge variant={anomaly.faceVerified ? "default" : "destructive"} className="text-xs">
                              {anomaly.faceVerified ? "Verified" : "Failed"}
                            </Badge>
                          </div>
                          {anomaly.faceMatchScore !== undefined && (
                            <div className="text-sm text-amber-600 dark:text-amber-400">
                              Score: {(anomaly.faceMatchScore * 100).toFixed(1)}%
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-6 text-gray-500">
                  No anomalies detected today.
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {anomalies.length > 0 ? anomalies.slice(0, 5).map((anomaly, index) => (
            <div key={index} className="flex items-start gap-3 p-3 bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-lg">
              <div className="mt-0.5">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                  {anomaly.user ? `${anomaly.user.firstName} ${anomaly.user.lastName}`.trim() : 'Unknown'}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 line-clamp-1 mt-0.5">
                  {anomaly.anomalyReason || 'Attendance Anomaly'}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  {format(new Date(anomaly.timestamp), 'MMM dd, HH:mm')}
                </p>
              </div>
            </div>
          )) : (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3">
              <div className="w-12 h-12 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">No Anomalies</p>
                <p className="text-xs text-gray-500 mt-1">All clear today</p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </WidgetCard>
  );
}

// Quick Actions
const quickActions = [
  { icon: <UserPlus className="h-4 w-4" />, label: "Add Employee", color: "text-blue-600" },
  { icon: <Calendar className="h-4 w-4" />, label: "Leave Request", color: "text-green-600" },
  { icon: <Clock className="h-4 w-4" />, label: "Attendance", color: "text-orange-600" },
  { icon: <Bell className="h-4 w-4" />, label: "Send Notice", color: "text-purple-600" },
  { icon: <Vote className="h-4 w-4" />, label: "Create Poll", color: "text-pink-600" },
];

// Live Clock
function LiveClock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <div className="text-xs md:text-sm font-medium">{format(currentTime, 'MMM dd, yyyy HH:mm:ss')}</div>;
}

export default function HRDashboardPage() {
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [showWidgetSettings, setShowWidgetSettings] = useState(false);
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
const [holidays, setHolidays] = useState<any[]>([]);
  const [latestPosts, setLatestPosts] = useState<any[]>([]);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [liveBreakData, setLiveBreakData] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const profileRes = await getProfile();
      const orgId = profileRes?.data?.organizationId || "4750a13d-c530-4583-aa8b-36733d06ec22";
      setOrganizationId(orgId);

      const formattedDate = format(new Date(), "yyyy-MM-dd");
      const results = await Promise.allSettled([
        getDashboardSummary(),
        getUserActivities({ limit: 10 }),
        getTodayAnomalies(),
        getNotices(),
        getPolls(),
        api.get("/attendance/daily-stats", { params: { organizationId: orgId, date: formattedDate } }),
        getLiveBreakOverview(orgId),
getHolidays({ organizationId: orgId }),
        getLatestPosts({ limit: 5 }),
      ]);
      const [dashboardRes, activitiesRes, anomaliesRes, noticesRes, pollsRes, dailyStatsRes, liveBreakRes, holidaysRes, postsRes] = results;

      setDashboardData(dashboardRes.status === 'fulfilled' && dashboardRes.value.data.success ? dashboardRes.value.data.data : null);
      setActivities(activitiesRes.status === 'fulfilled' ? activitiesRes.value.data?.data || [] : []);
      setAnomalies(anomaliesRes.status === 'fulfilled' ? anomaliesRes.value.data || [] : []);
      setNotices(noticesRes.status === 'fulfilled' ? noticesRes.value.data || [] : []);
      setPolls(pollsRes.status === 'fulfilled' ? pollsRes.value.data || [] : []);
      setDailyStats(dailyStatsRes.status === 'fulfilled' ? dailyStatsRes.value.data : null);
      setLiveBreakData(liveBreakRes.status === 'fulfilled' ? liveBreakRes.value.data : null);
      setCurrentUser(profileRes?.data || null);
// Handle holidays data
      if (holidaysRes.status === 'fulfilled') {
        const holidaysData = holidaysRes.value.data;
        if (holidaysData?.holidays) {
          setHolidays(holidaysData.holidays);
        } else if (Array.isArray(holidaysData)) {
          setHolidays(holidaysData);
        }
      }

      // Handle posts data
      if (postsRes.status === 'fulfilled') {
        setLatestPosts(postsRes.value.data || []);
      }
    } catch (error) {
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleWidget = (widgetId: string) => {
    setWidgets(prev => prev.map(widget =>
      widget.id === widgetId ? { ...widget, isEnabled: !widget.isEnabled } : widget
    ));
  };

  const isWidgetEnabled = (widgetId: string) => widgets.find(w => w.id === widgetId)?.isEnabled || false;
  const handlePollUpdate = () => { getPolls().then(response => setPolls(response.data || [])); };
  const stats = dashboardData?.dashboardStats;
  const employees = dashboardData?.employees || [];
  const departments = dashboardData?.departments || [];
  const departmentStats = dashboardData?.departmentStats || [];
  const upcomingBirthdays = dashboardData?.upcomingBirthdays || [];

  const departmentData = useMemo(() => {
    if (Array.isArray(departmentStats) && departmentStats.length > 0) {
      return departmentStats
        .filter(dept => dept.activeEmployeeCount > 0)
        .map(dept => ({ name: dept.departmentName, employees: dept.activeEmployeeCount, code: dept.departmentCode }));
    }
    if (Array.isArray(departments) && departments.length > 0) {
      return departments.map(dept => ({
        name: dept.name,
        employees: Array.isArray(employees) ? employees.filter(emp => emp.departmentId === dept.id).length : 0,
      }));
    }
    return [];
  }, [departmentStats, departments, employees]);

  const attendanceChartData = useMemo(() => {
    if (dailyStats) {
      const presentCount = dailyStats.presentSummary?.total_present || 0;
      const absentCount = dailyStats.notPresentSummary?.absent || 0;
      const onBreakCount = liveBreakData?.totalOnBreak || 0;
      return [
        { name: 'Present', value: presentCount, color: '#10b981' },
        { name: 'On Break', value: onBreakCount, color: '#f59e0b' },
        { name: 'Half Day', value: 0, color: '#3b82f6' },
        { name: 'Absent', value: absentCount, color: '#ef4444' },
      ].filter(item => item.value > 0);
    }
    return [];
  }, [dailyStats, liveBreakData]);

  const widgetsByCategory = useMemo(() => {
    return widgets.reduce((acc, widget) => {
      if (!acc[widget.category]) acc[widget.category] = [];
      acc[widget.category].push(widget);
      return acc;
    }, {} as Record<string, Widget[]>);
  }, [widgets]);

  if (loading) return <DashboardLoadingSkeleton />;

  return (
    <div className="px-2 py-2 md:px-6 md:py-6 max-w-[1700px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-[#184a8c] to-[#00b4db] bg-clip-text text-transparent">Dashboard</h1>
          <LiveClock />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowWidgetSettings(!showWidgetSettings)} className="flex items-center gap-2 rounded-md border-[#184a8c]/30 hover:bg-gradient-to-r hover:from-[#184a8c]/10 hover:to-[#00b4db]/10">
          <Settings className="h-4 w-4" />
          <span className="hidden sm:inline">Manage Widgets</span>
        </Button>
      </div>

      {/* Quick Actions */}
      {/* <div className="mb-6">
        <Card className="border-gray-200 dark:border-gray-800">
          <div className="px-2 py-3 md:px-6 md:py-4 flex flex-col md:flex-row md:flex-wrap items-start md:items-center gap-4 w-full">
            <div className="flex items-center mb-2 md:mb-0">
              <Plus className="h-6 w-5 mr-2 text-blue-600" />
              <span className="font-semibold text-gray-800 dark:text-gray-200">Quick Actions</span>
            </div>
            <div className="flex flex-wrap flex-1 gap-2 justify-start sm:justify-between w-full">
              {quickActions.map((action, index) => (
                <Button key={index} variant="ghost" size="sm" className="flex items-center gap-2 px-3 h-auto rounded-md min-w-fit sm:min-w-[120px] whitespace-normal transition-colors hover:bg-gray-50 dark:hover:bg-gray-800">
                  <span className={action.color}>{action.icon}</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-normal">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div> */}

      {/* Widget Settings */}
      {showWidgetSettings && (
        <Card className="mb-6 border-2 border-[#184a8c]/30 bg-gradient-to-r from-[#184a8c]/5 to-[#00b4db]/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Widget Management
            </CardTitle>
            <CardDescription>Enable/disable widgets to customize your dashboard view.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {Object.entries(widgetsByCategory).map(([category, categoryWidgets]) => (
                <div key={category}>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 capitalize">
                    {category === 'stats' ? 'Statistics' : category}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {categoryWidgets.map((widget) => (
                      <div key={widget.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-3">
                          <Switch checked={widget.isEnabled} onCheckedChange={() => toggleWidget(widget.id)} />
                          <div>
                            <div className="font-medium text-sm">{widget.title}</div>
                            <div className="text-xs text-gray-500 capitalize">{widget.category}</div>
                          </div>
                        </div>
                        {widget.isEnabled ? <Eye className="h-4 w-4 text-green-600" /> : <EyeOff className="h-4 w-4 opacity-40" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      {isWidgetEnabled('dashboard-stats') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard title="Total Employees" value={stats?.totalEmployees?.value || employees.length || 0} subtitle="Active workforce" icon={Users} trend={stats?.totalEmployees?.change} color="blue" />
          <StatCard title="Present Today" value={stats?.presentToday?.value || dailyStats?.presentSummary?.total_present || 0} subtitle="Currently in office" icon={UserCheck} trend={stats?.presentToday?.change || dailyStats?.presentSummary?.total_presentDiff} color="green" />
          <StatCard title="On Leave Today" value={stats?.onLeaveToday?.value || 0} subtitle="Taking leave" icon={Calendar} trend={stats?.onLeaveToday?.change} color="orange" />
          <StatCard title="Pending Requests" value={stats?.pendingLeaveRequests?.value || 0} subtitle="Leave requests" icon={Clock} trend={stats?.pendingLeaveRequests?.change} color="red" />
        </div>
      )}

      {/* Charts & Widgets (Combined to enable auto-fill space when disabled) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {isWidgetEnabled('attendance-today') && (
          <AttendanceChart
            attendanceChartData={attendanceChartData}
            breakEmployees={liveBreakData?.employees || []}
          />
        )}
        {isWidgetEnabled('department-breakdown') && <DepartmentChart departmentData={departmentData} />}
        {isWidgetEnabled('user-activities') && <UserActivitiesWidget activities={activities} />}
        {isWidgetEnabled('active-polls') && <PollWidget polls={polls} currentUser={currentUser} onPollUpdate={handlePollUpdate} />}
        {isWidgetEnabled('company-notices') && <NoticeWidget notices={notices} />}
        {isWidgetEnabled('birthday-tracker') && <BirthdayWidget upcomingBirthdays={upcomingBirthdays} />}
        {isWidgetEnabled('holiday-tracker') && <HolidayWidget holidays={holidays} />}
        <EmployeeAwardWidget organizationId={organizationId} />
        {isWidgetEnabled('attendance-anomalies') && <AttendanceAnomaliesWidget anomalies={anomalies} />}
      </div>

{/* Latest Posts Widget - Full Width */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <Card className="border-2 border-indigo-500/20 bg-gradient-to-br from-indigo-50/50 to-purple-50/50 dark:from-indigo-900/10 dark:to-purple-900/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Latest Posts
            </CardTitle>
            <CardDescription>Corporate community updates and announcements</CardDescription>
          </CardHeader>
          <CardContent>
            {latestPosts.length > 0 ? (
              <div className="space-y-4">
                {latestPosts.slice(0, 3).map((post: any) => (
                  <div key={post.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-[#184a8c] to-[#00b4db] rounded-full flex items-center justify-center text-white font-semibold">
                          {post.author?.firstName?.[0] || 'A'}
                        </div>
                        <div>
                          <div className="font-medium">{post.author?.firstName} {post.author?.lastName}</div>
                          <div className="text-xs text-gray-500">{format(new Date(post.createdAt), 'MMM dd, yyyy HH:mm')}</div>
                        </div>
                      </div>
                      <Link href={`/admin/posts/${post.id}`}>
                        <Button variant="ghost" size="sm">View →</Button>
                      </Link>
                    </div>
                    <p className="mt-3 text-gray-700 dark:text-gray-300 line-clamp-2">{post.content}</p>
                    {post.imageUrl && (
                      <div className="mt-3">
                        <img src={post.imageUrl} alt="Post" className="h-32 w-auto rounded-lg object-cover" />
                      </div>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        <span>{post.likeCount || 0}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.commentCount || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
                <div className="flex justify-center pt-2">
                  <Link href="/admin/posts">
                    <Button variant="outline">View All Posts →</Button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="min-h-[200px] flex items-center justify-center text-gray-500 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-lg p-6">
                <div className="text-center">
                  <p className="text-lg font-medium opacity-50">No posts yet</p>
                  <p className="text-sm opacity-70 mt-1">Create your first post to get started!</p>
                  <Link href="/admin/posts">
                    <Button className="mt-4 bg-[#184a8c] hover:bg-[#184a8c]/90">Go to Posts →</Button>
                  </Link>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
