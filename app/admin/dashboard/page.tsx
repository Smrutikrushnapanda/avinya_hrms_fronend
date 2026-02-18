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
} from "@/app/api/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import {
  Users, UserCheck, Calendar, AlertTriangle, Clock, Bell, Settings,
  Eye, EyeOff, Vote, Plus, UserPlus, PieChart, BarChart3
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

// AttendanceChart Component
function AttendanceChart({ attendanceChartData }: { attendanceChartData: any[] }) {
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
              <Bar dataKey="employees" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Active Employees" />
            </BarChart>
          </ResponsiveContainer>
        )}
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
  const organizationId = "24facd21-265a-4edd-8fd1-bc69a036f755";

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const formattedDate = format(new Date(), "yyyy-MM-dd");
      const results = await Promise.allSettled([
        getDashboardSummary(),
        getUserActivities({ limit: 10 }),
        getTodayAnomalies(),
        getNotices(),
        getPolls(),
        api.get("/attendance/daily-stats", { params: { organizationId, date: formattedDate } }),
        getProfile(),
        getHolidays({ organizationId }),
      ]);
      const [dashboardRes, activitiesRes, anomaliesRes, noticesRes, pollsRes, dailyStatsRes, profileRes, holidaysRes] = results;

      setDashboardData(dashboardRes.status === 'fulfilled' && dashboardRes.value.data.success ? dashboardRes.value.data.data : null);
      setActivities(activitiesRes.status === 'fulfilled' ? activitiesRes.value.data?.data || [] : []);
      setAnomalies(anomaliesRes.status === 'fulfilled' ? anomaliesRes.value.data || [] : []);
      setNotices(noticesRes.status === 'fulfilled' ? noticesRes.value.data || [] : []);
      setPolls(pollsRes.status === 'fulfilled' ? pollsRes.value.data || [] : []);
      setDailyStats(dailyStatsRes.status === 'fulfilled' ? dailyStatsRes.value.data : null);
      setCurrentUser(profileRes.status === 'fulfilled' ? profileRes.value.data : null);
      // Handle holidays data
      if (holidaysRes.status === 'fulfilled') {
        const holidaysData = holidaysRes.value.data;
        if (holidaysData?.holidays) {
          setHolidays(holidaysData.holidays);
        } else if (Array.isArray(holidaysData)) {
          setHolidays(holidaysData);
        }
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
    console.log('Daily Stats:', dailyStats);
    console.log("user: ",getProfile());
    if (dailyStats) {
      const presentCount = dailyStats.presentSummary?.total_present || 0;
      const absentCount = dailyStats.notPresentSummary?.absent || 0;
      return [
        { name: 'Present', value: presentCount, color: '#10b981' },
        { name: 'Half Day', value: 0, color: '#f59e0b' },
        { name: 'Absent', value: absentCount, color: '#ef4444' },
      ].filter(item => item.value > 0);
    }
    return [];
  }, [dailyStats]);

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
          <h1 className="text-xl sm:text-2xl font-bold border-b md:border-b-0 md:border-r md:pr-5 pb-2 md:pb-0">Dashboard</h1>
          <LiveClock />
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowWidgetSettings(!showWidgetSettings)} className="flex items-center gap-2">
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
        <Card className="mb-6 border-2 border-blue-200 dark:border-blue-800">
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {isWidgetEnabled('attendance-today') && <AttendanceChart attendanceChartData={attendanceChartData} />}
        {isWidgetEnabled('department-breakdown') && <DepartmentChart departmentData={departmentData} />}
        {isWidgetEnabled('user-activities') && <UserActivitiesWidget activities={activities} />}
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {isWidgetEnabled('active-polls') && <PollWidget polls={polls} currentUser={currentUser} onPollUpdate={handlePollUpdate} />}
        {isWidgetEnabled('company-notices') && <NoticeWidget notices={notices} />}
        {isWidgetEnabled('birthday-tracker') && <BirthdayWidget upcomingBirthdays={upcomingBirthdays} />}
        {isWidgetEnabled('holiday-tracker') && <HolidayWidget holidays={holidays} />}
      </div>

      {/* Anomalies */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        {isWidgetEnabled('attendance-anomalies') && (
          <WidgetCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Attendance Anomalies
                {anomalies.length > 0 && <Badge variant="destructive" className="ml-2">{anomalies.length}</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4 max-h-96 overflow-y-auto">
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
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                      <AlertTriangle className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Anomalies Detected</h3>
                    <p className="text-gray-500 dark:text-gray-400">All attendance records look good today!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </WidgetCard>
        )}
      </div>
    </div>
  );
}
