"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  UserCheck,
  UserX,
  CalendarClock,
  TrendingUp,
  Activity,
  ArrowRight,
  AlertTriangle,
  Clock,
  Award,
  BarChart3,
  PieChart,
  RefreshCw,
  Eye,
  FileText,
  Camera,
  MapPin,
  Wifi,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { format, formatDistanceToNow } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  BarChart,
  Bar,
  Pie,
} from 'recharts';

// Enhanced API configuration
import axios from "axios";

const fallbackURL = 'https://hrms-backend-346486007446.asia-south1.run.app';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || fallbackURL,
  timeout: 15000,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('Unauthorized - Redirect to login');
    }
    return Promise.reject(error);
  }
);

// Enhanced interfaces
interface DashboardStats {
  totalEmployees: { value: number; change: number };
  presentToday: { value: number; change: number };
  onLeaveToday: { value: number; change: number };
  pendingLeaveRequests: { value: number; change: number };
  attendanceBreakdown: {
    present: number;
    halfDay: number;
    absent: number;
  };
}

interface AttendanceAnomaly {
  id: string;
  timestamp: string;
  type: string;
  source: string;
  photoUrl?: string;
  faceMatchScore?: number;
  faceVerified?: boolean;
  latitude?: string;
  longitude?: string;
  locationAddress?: string;
  wifiSsid?: string;
  wifiBssid?: string;
  deviceInfo?: string;
  anomalyFlag: boolean;
  anomalyReason: string;
  createdAt: string;
  user?: {
    name: string;
    employeeCode: string;
  };
}

interface RecentActivity {
  id: string;
  user: {
    name: string;
    profilePhoto: string | null;
  } | null;
  action: string;
  details: string;
  createdAt: string;
}

interface DailyAttendanceStats {
  date: string;
  presentSummary: {
    total_present: number;
    total_presentDiff: number;
    earlyClockIn: number;
    earlyClockInDiff: number;
    lateClockIn: number;
    lateClockInDiff: number;
  };
  notPresentSummary: {
    absent: number;
    absentDiff: number;
    noClockIn: number;
    noClockInDiff: number;
    noClockOut: number;
    noClockOutDiff: number;
    invalid: number;
    invalidDiff: number;
  };
}

// Enhanced StatCard component
const StatCard = ({
  title,
  value,
  change,
  icon: Icon,
  color,
  loading = false,
}: {
  title: string;
  value: number;
  change: number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) => (
  <Card className="shadow-sm hover:shadow-lg transition-all duration-200 border-0 bg-gradient-to-br from-white to-gray-50">
    <CardHeader className="flex flex-row items-center justify-between pb-2">
      <div>
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
      </div>
      <div className={`p-2 rounded-full bg-opacity-10 ${color.replace('text-', 'bg-')}`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
    </CardHeader>
    <CardContent>
      {loading ? (
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-20 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold mb-1">{value.toLocaleString()}</div>
          <div className="flex items-center text-xs">
            <span
              className={
                change > 0 
                  ? "text-green-600 font-medium" 
                  : change < 0 
                  ? "text-red-600 font-medium" 
                  : "text-gray-500"
              }
            >
              {change > 0 ? "↗ +" : change < 0 ? "↘ " : "→ "}{change}
            </span>
            <span className="text-muted-foreground ml-1">vs yesterday</span>
          </div>
        </>
      )}
    </CardContent>
  </Card>
);

// Anomaly Card Component
const AnomalyCard = ({ anomaly }: { anomaly: AttendanceAnomaly }) => (
  <Card className="mb-3 border-l-4 border-l-orange-500">
    <CardContent className="p-3">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            {anomaly.photoUrl ? (
              <img
                src={anomaly.photoUrl}
                alt="Anomaly Photo"
                className="w-8 h-8 rounded-full object-cover"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                <Camera className="w-4 h-4 text-orange-600" />
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-2 h-2 text-white" />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-xs">
                {anomaly.user?.name || 'Unknown User'}
              </span>
              <Badge variant="outline" className="text-xs px-1 py-0">
                {anomaly.type}
              </Badge>
            </div>
            
            <p className="text-xs text-red-600 font-medium mt-1">
              {anomaly.anomalyReason}
            </p>
            
            <div className="flex items-center space-x-2 mt-1 text-xs text-muted-foreground">
              <Clock className="w-3 h-3" />
              <span>{format(new Date(anomaly.timestamp), 'HH:mm')}</span>
            </div>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>
);

const initialStats: DashboardStats = {
  totalEmployees: { value: 0, change: 0 },
  presentToday: { value: 0, change: 0 },
  onLeaveToday: { value: 0, change: 0 },
  pendingLeaveRequests: { value: 0, change: 0 },
  attendanceBreakdown: {
    present: 0,
    halfDay: 0,
    absent: 0,
  },
};

// Main Dashboard Component
export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [dailyStats, setDailyStats] = useState<DailyAttendanceStats | null>(null);
  const [activity, setActivity] = useState<RecentActivity[]>([]);
  const [anomalies, setAnomalies] = useState<AttendanceAnomaly[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setError(null);
      const today = format(new Date(), 'yyyy-MM-dd');
      const organizationId = "24facd21-265a-4edd-8fd1-bc69a036f755";

      console.log("🚀 Fetching comprehensive dashboard data...");
      
      const [statsResponse, activityResponse, anomaliesResponse, dailyStatsResponse] = 
        await Promise.allSettled([
          api.get("/employees/dashboard-stats"),
          api.get("/user-activities", { params: { limit: 5, page: 1 } }),
          api.get("/attendance/anomalies/today"),
          api.get("/attendance/daily-stats", { 
            params: { organizationId, date: today } 
          }),
        ]);

      // Handle stats response
      if (statsResponse.status === 'fulfilled') {
        console.log("📊 Dashboard stats received:", statsResponse.value.data);
        setStats(statsResponse.value.data || initialStats);
      } else {
        console.error("❌ Stats request failed:", statsResponse.reason);
      }
      
      // Handle activity response
      if (activityResponse.status === 'fulfilled') {
        const data = activityResponse.value.data;
        if (data?.data && Array.isArray(data.data)) {
          setActivity(data.data);
        } else if (Array.isArray(data)) {
          setActivity(data);
        }
        console.log("📋 Activity data received:", data);
      }

      // Handle anomalies response
      if (anomaliesResponse.status === 'fulfilled') {
        console.log("🚨 Anomalies data received:", anomaliesResponse.value.data);
        setAnomalies(anomaliesResponse.value.data || []);
      }

      // Handle daily stats response
      if (dailyStatsResponse.status === 'fulfilled') {
        console.log("📈 Daily stats received:", dailyStatsResponse.value.data);
        setDailyStats(dailyStatsResponse.value.data);
      }

    } catch (error) {
      console.error("❌ Dashboard fetch error:", error);
      setError("Unable to load dashboard data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1,
      transition: { duration: 0.3 }
    },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-lg font-medium text-gray-700">Loading Dashboard...</p>
          <p className="text-sm text-muted-foreground">Fetching latest HRMS data</p>
        </div>
      </div>
    );
  }

  const totalForProgress = Math.max(stats.totalEmployees.value, 1);
  const pieData = [
    { name: 'Present', value: stats.attendanceBreakdown.present, color: '#22c55e' },
    { name: 'Half Day', value: stats.attendanceBreakdown.halfDay, color: '#f59e0b' },
    { name: 'Absent', value: stats.attendanceBreakdown.absent, color: '#ef4444' },
  ];

  const attendanceTrendData = dailyStats ? [
    { name: 'Present', value: dailyStats.presentSummary.total_present, color: '#22c55e' },
    { name: 'Early', value: dailyStats.presentSummary.earlyClockIn, color: '#3b82f6' },
    { name: 'Late', value: dailyStats.presentSummary.lateClockIn, color: '#f59e0b' },
    { name: 'Absent', value: dailyStats.notPresentSummary.absent, color: '#ef4444' },
  ] : [];

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-0">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="space-y-4"
        >

          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <Alert className="border-red-200 bg-red-50">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    {error} - Some data may be outdated. Try refreshing the page.
                  </AlertDescription>
                </Alert>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stat Cards */}
          <motion.div
            variants={containerVariants}
            className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
          >
            <motion.div variants={itemVariants}>
              <StatCard
                title="Total Workforce"
                value={stats.totalEmployees.value}
                change={stats.totalEmployees.change}
                icon={Users}
                color="text-blue-600"
                loading={loading}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StatCard
                title="Present Today"
                value={stats.presentToday.value}
                change={stats.presentToday.change}
                icon={UserCheck}
                color="text-green-600"
                loading={loading}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StatCard
                title="On Leave"
                value={stats.onLeaveToday.value}
                change={stats.onLeaveToday.change}
                icon={UserX}
                color="text-orange-600"
                loading={loading}
              />
            </motion.div>
            <motion.div variants={itemVariants}>
              <StatCard
                title="Pending Requests"
                value={stats.pendingLeaveRequests.value}
                change={stats.pendingLeaveRequests.change}
                icon={CalendarClock}
                color="text-yellow-600"
                loading={loading}
              />
            </motion.div>
          </motion.div>

          {/* Main Dashboard Grid */}
          <motion.div variants={itemVariants} className="grid gap-4 lg:grid-cols-12">
            
            {/* Attendance Overview - Large */}
            <Card className="lg:col-span-8 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Attendance Overview
                </CardTitle>
                <CardDescription>
                  Today's workforce distribution and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  {/* Progress Bars */}
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium flex items-center">
                          <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
                          Present
                        </span>
                        <span className="text-sm font-bold">
                          {stats.attendanceBreakdown.present}
                        </span>
                      </div>
                      <Progress
                        value={(stats.attendanceBreakdown.present / totalForProgress) * 100}
                        className="h-3 bg-green-100 [&>div]:bg-green-500"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium flex items-center">
                          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-2"></div>
                          Half Day
                        </span>
                        <span className="text-sm font-bold">
                          {stats.attendanceBreakdown.halfDay}
                        </span>
                      </div>
                      <Progress
                        value={(stats.attendanceBreakdown.halfDay / totalForProgress) * 100}
                        className="h-3 bg-yellow-100 [&>div]:bg-yellow-500"
                      />
                    </div>
                    
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium flex items-center">
                          <div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div>
                          Absent
                        </span>
                        <span className="text-sm font-bold">
                          {stats.attendanceBreakdown.absent}
                        </span>
                      </div>
                      <Progress
                        value={(stats.attendanceBreakdown.absent / totalForProgress) * 100}
                        className="h-3 bg-red-100 [&>div]:bg-red-500"
                      />
                    </div>
                  </div>

                  {/* Pie Chart */}
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={30}
                          outerRadius={60}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Anomalies - Medium */}
            <Card className="lg:col-span-4 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertTriangle className="mr-2 h-5 w-5 text-orange-500" />
                    Anomalies
                  </div>
                  <Badge variant="outline" className="bg-orange-50">
                    {anomalies.length}
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Today's flagged records
                </CardDescription>
              </CardHeader>
              <CardContent>
                {anomalies.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {anomalies.slice(0, 3).map((anomaly) => (
                      <AnomalyCard key={anomaly.id} anomaly={anomaly} />
                    ))}
                    {anomalies.length > 3 && (
                      <Button variant="ghost" size="sm" className="w-full">
                        View {anomalies.length - 3} more
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Award className="w-8 h-8 text-green-500 mx-auto mb-2" />
                    <p className="text-sm font-medium text-green-600">All Clear!</p>
                    <p className="text-xs text-muted-foreground">No anomalies detected</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Attendance Stats */}
            {dailyStats && (
              <Card className="lg:col-span-6 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="mr-2 h-5 w-5" />
                    Daily Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceTrendData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card className="lg:col-span-6 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="mr-2 h-5 w-5" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {activity.length > 0 ? (
                  <div className="space-y-3 max-h-48 overflow-y-auto">
                    {activity.slice(0, 4).map((item) => {
                      if (!item.user) return null;
                      return (
                        <div key={item.id} className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                              {item.user.name.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-xs">
                              <span className="font-semibold">{item.user.name}</span>{" "}
                              <span className="text-muted-foreground">{item.action.toLowerCase()}</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <Activity className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No Recent Activity</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Footer */}
          <motion.div variants={itemVariants} className="text-center pt-2">
            <p className="text-xs text-muted-foreground">
              Last updated: {format(new Date(), 'PPpp')} • 
              <span className="ml-1 text-green-600">●</span> System Status: Operational
            </p>
          </motion.div>
        </motion.div>
      </div>
  );
}
