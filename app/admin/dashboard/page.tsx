"use client";

import { useEffect, useState, useMemo } from "react";
import api, {
  getDashboardSummary,
  getUserActivities,
  getTodayAnomalies,
  getPolls,
  getNotices,
  getProfile,
} from "@/app/api/api";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { format } from "date-fns";
import { useTheme } from "next-themes";
import {
  Users, UserCheck, Calendar, AlertTriangle, Clock, Bell, Settings,
  Eye, EyeOff, Vote, Plus, FileText, UserPlus
} from "lucide-react";

// Import components
import { DEFAULT_WIDGETS, Widget } from "./components/types";
import { DashboardLoadingSkeleton } from "./components/DashboardSkeleton";
import { StatCard, WidgetCard } from "./components/StatCard";
import {
  PollWidget, NoticeWidget, BirthdayWidget, AttendanceChart,
  DepartmentChart, UserActivitiesWidget
} from "./components/DashboardWidgets";

// Quick Actions Configuration
const quickActions = [
  { icon: <UserPlus className="h-4 w-4" />, label: "Add Employee", color: "text-blue-600" },
  { icon: <Calendar className="h-4 w-4" />, label: "Leave Request", color: "text-green-600" },
  { icon: <Clock className="h-4 w-4" />, label: "Attendance", color: "text-orange-600" },
  { icon: <Bell className="h-4 w-4" />, label: "Send Notice", color: "text-purple-600" },
  { icon: <Vote className="h-4 w-4" />, label: "Create Poll", color: "text-pink-600" },
  { icon: <FileText className="h-4 w-4" />, label: "Reports", color: "text-indigo-600" },
  { icon: <Users className="h-4 w-4" />, label: "Departments", color: "text-teal-600" },
  { icon: <Settings className="h-4 w-4" />, label: "Settings", color: "text-gray-600" },
];

// Live Clock Component
function LiveClock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return <div className="text-sm font-medium">{format(currentTime, 'MMM dd, yyyy HH:mm:ss')}</div>;
}

export default function HRDashboardPage() {
  const { theme } = useTheme();
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
        api.get("/attendance/daily-stats", {
          params: {
            organizationId,
            date: formattedDate,
          },
        }),
        getProfile(),
      ]);
      const [
        dashboardRes, activitiesRes, anomaliesRes, noticesRes, pollsRes,
        dailyStatsRes, profileRes
      ] = results;
      if (dashboardRes.status === 'fulfilled' && dashboardRes.value.data.success) {
        setDashboardData(dashboardRes.value.data.data);
      } else {
        setDashboardData(null);
      }
      setActivities(activitiesRes.status === 'fulfilled' ? activitiesRes.value.data?.data || [] : []);
      setAnomalies(anomaliesRes.status === 'fulfilled' ? anomaliesRes.value.data || [] : []);
      setNotices(noticesRes.status === 'fulfilled' ? noticesRes.value.data || [] : []);
      setPolls(pollsRes.status === 'fulfilled' ? pollsRes.value.data || [] : []);
      setDailyStats(dailyStatsRes.status === 'fulfilled' ? dailyStatsRes.value.data : null);
      setCurrentUser(profileRes.status === 'fulfilled' ? profileRes.value.data : null);
    } catch (error) {
      setDashboardData(null);
    } finally {
      setLoading(false);
    }
  };

  const toggleWidget = (widgetId: string) => {
    setWidgets(prev => prev.map(widget =>
      widget.id === widgetId
        ? { ...widget, isEnabled: !widget.isEnabled }
        : widget
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
        .map(dept => ({
          name: dept.departmentName,
          employees: dept.activeEmployeeCount,
          code: dept.departmentCode,
        }));
    }
    if (Array.isArray(departments) && departments.length > 0) {
      return departments.map(dept => ({
        name: dept.name,
        employees: Array.isArray(employees) ?
          employees.filter(emp => emp.departmentId === dept.id).length : 0,
      }));
    }
    return [];
  }, [departmentStats, departments, employees]);

  const attendanceChartData = useMemo(() => {
    if (dailyStats) {
      const presentCount = dailyStats.presentSummary?.total_present || 0;
      const absentCount = dailyStats.notPresentSummary?.absent || 0;
      const halfDayCount = 0;
      return [
        { name: 'Present', value: presentCount, color: '#10b981' },
        { name: 'Half Day', value: halfDayCount, color: '#f59e0b' },
        { name: 'Absent', value: absentCount, color: '#ef4444' },
      ].filter(item => item.value > 0);
    }
    return [];
  }, [dailyStats]);

  if (loading) {
    return <DashboardLoadingSkeleton />;
  }

  return (
    <div>
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-5">
          <h1 className="text-2xl font-bold border-r pr-5">Dashboard</h1>
          <div className="flex items-center gap-2"><LiveClock /></div>
        </div>
        <Button variant="outline" size="sm"
          onClick={() => setShowWidgetSettings(!showWidgetSettings)}
          className="flex items-center gap-2">
          <Settings className="h-4 w-4" />
          Manage Widgets
        </Button>
      </div>

      {/* Quick Actions - Sleek Single Line */}
      <div className="mb-6">
        <Card className="border-gray-200 dark:border-gray-800">
          <div className="px-6 flex items-center">
            {/* Quick Actions Title */}
            <div className="flex items-center mr-6">
              <Plus className="h-5 w-5 mr-2 text-blue-600" />
              <span className="font-semibold text-gray-800 dark:text-gray-200">Quick Actions</span>
            </div>
            
            {/* Action Buttons */}
            <div className="flex-1 flex items-center gap-2 overflow-x-auto">
              {quickActions.map((action, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  className="flex items-center gap-2 px-3 h-auto min-w-fit whitespace-nowrap hover:bg-gray-50 dark:hover:bg-gray-800 rounded-md transition-colors"
                >
                  <span className={action.color}>{action.icon}</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {action.label}
                  </span>
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>
        
      {/* Widget Settings Panel */}
      {showWidgetSettings && (
        <Card className="mb-6 border-2 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Widget Management
            </CardTitle>
            <CardDescription>
              Enable/disable widgets based on your needs. Widgets marked as "Important" are recommended for HR operations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {widgets.map((widget) => (
                <div key={widget.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Switch checked={widget.isEnabled}
                      onCheckedChange={() => toggleWidget(widget.id)}
                      disabled={!widget.hasAPI && widget.isImportant}
                    />
                    <div>
                      <div className="font-medium text-sm">{widget.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {widget.hasAPI ? (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">API Ready</Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">Coming Soon</Badge>
                        )}
                        {widget.isImportant && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">Important</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {widget.isEnabled ? (
                    <Eye className="h-4 w-4 text-green-600" />
                  ) : <EyeOff className="h-4 w-4 opacity-40" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Statistics Cards */}
      {isWidgetEnabled('dashboard-stats') && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Total Employees"
            value={stats?.totalEmployees?.value || employees.length || 0}
            subtitle="Active workforce"
            icon={Users}
            trend={stats?.totalEmployees?.change}
            color="blue"
          />
          <StatCard
            title="Present Today"
            value={stats?.presentToday?.value || dailyStats?.presentSummary?.total_present || 0}
            subtitle="Currently in office"
            icon={UserCheck}
            trend={stats?.presentToday?.change || dailyStats?.presentSummary?.total_presentDiff}
            color="green"
          />
          <StatCard
            title="On Leave Today"
            value={stats?.onLeaveToday?.value || 0}
            subtitle="Taking leave"
            icon={Calendar}
            trend={stats?.onLeaveToday?.change}
            color="orange"
          />
          <StatCard
            title="Pending Requests"
            value={stats?.pendingLeaveRequests?.value || 0}
            subtitle="Leave requests"
            icon={Clock}
            trend={stats?.pendingLeaveRequests?.change}
            color="red"
          />
        </div>
      )}
      
      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {isWidgetEnabled('attendance-today') && <AttendanceChart attendanceChartData={attendanceChartData} />}
        {isWidgetEnabled('department-breakdown') && <DepartmentChart departmentData={departmentData} />}
        {isWidgetEnabled('user-activities') && <UserActivitiesWidget activities={activities} />}
      </div>
      
      {/* Polls, Notices, and Birthday Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {isWidgetEnabled('active-polls') && (
          <PollWidget polls={polls} currentUser={currentUser} onPollUpdate={handlePollUpdate} />
        )}
        {isWidgetEnabled('company-notices') && <NoticeWidget notices={notices} />}
        {isWidgetEnabled('birthday-tracker') && <BirthdayWidget upcomingBirthdays={upcomingBirthdays} />}
      </div>
      
      {/* Notifications & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
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
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {anomalies.length > 0 ? anomalies.map((anomaly, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-1" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{anomaly.anomalyReason || 'Attendance Anomaly'}</div>
                      <div className="text-xs opacity-70">Employee ID: {anomaly.employeeId || 'Unknown'}</div>
                      <div className="text-xs opacity-50">{format(new Date(anomaly.timestamp), 'MMM dd, HH:mm')}</div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center opacity-60 py-4">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No anomalies detected today
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
