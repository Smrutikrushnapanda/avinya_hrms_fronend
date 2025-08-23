"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BookMarked,
  BarChart3,
  PieChart,
  TrendingUp,
  Download,
  Calendar,
  Users,
  Clock,
  FileText,
  Filter,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { format, subDays, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart as RechartsPieChart,
  Cell,
  Pie,
} from 'recharts';
import {
  getDashboardStats,
  getDailyStats,
  getEmployees,
  getProfile,
  getAttendanceReport,
  getLeaveReport,
} from "@/app/api/api";
import {
  exportAttendanceReport,
  exportEmployeeReport,
  exportLeaveReport,
  exportPayrollReport,
  exportPerformanceReport,
  exportChartData,
} from "@/utils/reportExport";
import { adaptAttendanceData, generateMockAttendanceData } from "@/utils/dataAdapter";

interface WeeklyAttendanceData {
  name: string;
  present: number;
  absent: number;
  halfDay: number;
}

interface MonthlyTrendData {
  month: string;
  attendance: number;
  leaves: number;
}

interface DepartmentData {
  name: string;
  value: number;
  color: string;
}

// Mock API functions for missing endpoints
const getPayrollReport = async (params: any) => {
  console.warn('Payroll report API not implemented, using mock data');
  toast.warning("Payroll API is not available. Using sample data.");
  return {
    data: {
      success: true,
      data: [],
      total: 0,
    }
  };
};

const getPerformanceReport = async (params: any) => {
  console.warn('Performance report API not implemented, using mock data');
  toast.warning("Performance API is not available. Using sample data.");
  return {
    data: {
      success: true,
      data: [],
      total: 0,
    }
  };
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("this-month");
  const [selectedReport, setSelectedReport] = useState("attendance");
  const [attendanceData, setAttendanceData] = useState<WeeklyAttendanceData[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([]);
  const [monthlyTrendData, setMonthlyTrendData] = useState<MonthlyTrendData[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (userProfile?.organizationId) {
      fetchChartData();
    }
  }, [selectedPeriod, userProfile]);

  // FIXED: Enhanced error handling with API availability checks
  const fetchData = async () => {
    try {
      setLoading(true);
      
      const [statsRes, profileRes] = await Promise.allSettled([
        getDashboardStats(),
        getProfile(),
      ]);

      // Handle dashboard stats with error feedback
      if (statsRes.status === 'fulfilled') {
        setDashboardStats(statsRes.value?.data || null);
      } else {
        console.error("Dashboard stats API error:", statsRes.reason);
        toast.error("Dashboard stats API is currently unavailable");
        setDashboardStats(null);
      }

      // Handle profile with error feedback
      if (profileRes.status === 'fulfilled') {
        setUserProfile(profileRes.value?.data || null);
        
        // Fetch employees after getting profile
        if (profileRes.value?.data?.organizationId) {
          try {
            const employeesRes = await getEmployees(profileRes.value.data.organizationId);
            setEmployees(Array.isArray(employeesRes.data) ? employeesRes.data : []);
          } catch (error) {
            console.error("Employees API error:", error);
            toast.error("Employees API is currently unavailable");
            setEmployees([]);
          }
        }
      } else {
        console.error("Profile API error:", profileRes.reason);
        toast.error("User profile API is currently unavailable");
        setUserProfile(null);
        setEmployees([]);
      }
    } catch (error) {
      console.error("Failed to fetch reports data:", error);
      toast.error("Multiple APIs are currently unavailable. Please try again later.");
      // Set safe defaults
      setDashboardStats(null);
      setUserProfile(null);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  // FIXED: Enhanced chart data fetching with error handling
  const fetchChartData = async () => {
    if (!userProfile?.organizationId) return;

    try {
      // Calculate date range based on selected period
      const today = new Date();
      let startDate, endDate;

      switch (selectedPeriod) {
        case "this-week":
          startDate = startOfWeek(today);
          endDate = endOfWeek(today);
          break;
        case "this-month":
          startDate = startOfMonth(today);
          endDate = endOfMonth(today);
          break;
        case "last-month":
          const lastMonth = subMonths(today, 1);
          startDate = startOfMonth(lastMonth);
          endDate = endOfMonth(lastMonth);
          break;
        default:
          startDate = startOfMonth(today);
          endDate = endOfMonth(today);
      }

      // Try to fetch real attendance data for charts
      const params = {
        organizationId: userProfile.organizationId,
        fromDate: format(startDate, 'yyyy-MM-dd'),
        toDate: format(endDate, 'yyyy-MM-dd'),
      };

      try {
        const attendanceRes = await getAttendanceReport(params);
        const adaptedData = adaptAttendanceData(attendanceRes.data);

        if (Array.isArray(adaptedData) && adaptedData.length > 0) {
          processAttendanceData(adaptedData);
        } else {
          generateMockChartData();
        }
      } catch (error) {
        console.error("Attendance report API error:", error);
        toast.warning("Attendance report API is not available. Using sample chart data.");
        generateMockChartData();
      }

      // Generate department distribution from employees
      processDepartmentData();
      
    } catch (error) {
      console.error("Failed to fetch chart data:", error);
      toast.warning("Chart data APIs are not available. Using sample data.");
      generateMockChartData();
    }
  };

  const processAttendanceData = (data: any[]) => {
    try {
      // Process attendance data for weekly chart with proper typing
      const weeklyData: WeeklyAttendanceData[] = [];
      const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
      
      days.forEach(day => {
        const dayData = Array.isArray(data) ? data.filter(record => {
          if (!record?.date) return false;
          try {
            const recordDay = format(new Date(record.date), 'EEE');
            return recordDay === day;
          } catch {
            return false;
          }
        }) : [];

        weeklyData.push({
          name: day,
          present: dayData.filter(d => d.status === 'PRESENT' || d.status === 'present').length,
          absent: dayData.filter(d => d.status === 'ABSENT' || d.status === 'absent').length,
          halfDay: dayData.filter(d => d.status === 'HALF_DAY' || d.status === 'half-day').length,
        });
      });

      setAttendanceData(weeklyData);

      // Generate monthly trend data with proper typing
      const monthlyTrend: MonthlyTrendData[] = [
        { month: 'Jan', attendance: 92, leaves: 8 },
        { month: 'Feb', attendance: 89, leaves: 11 },
        { month: 'Mar', attendance: 94, leaves: 6 },
        { month: 'Apr', attendance: 91, leaves: 9 },
        { month: 'May', attendance: 88, leaves: 12 },
        { month: 'Jun', attendance: 93, leaves: 7 },
        { month: 'Jul', attendance: 90, leaves: 10 },
        { month: 'Aug', attendance: 95, leaves: 5 },
      ];
      setMonthlyTrendData(monthlyTrend);
    } catch (error) {
      console.error("Error processing attendance data:", error);
      generateMockChartData();
    }
  };

  const generateMockChartData = () => {
    try {
      // Mock weekly attendance data with proper typing
      const mockWeeklyData: WeeklyAttendanceData[] = [
        { name: 'Mon', present: 120, absent: 5, halfDay: 3 },
        { name: 'Tue', present: 115, absent: 8, halfDay: 5 },
        { name: 'Wed', present: 125, absent: 3, halfDay: 2 },
        { name: 'Thu', present: 118, absent: 7, halfDay: 3 },
        { name: 'Fri', present: 110, absent: 12, halfDay: 6 },
        { name: 'Sat', present: 85, absent: 25, halfDay: 18 },
        { name: 'Sun', present: 0, absent: 0, halfDay: 0 },
      ];
      setAttendanceData(mockWeeklyData);

      // Mock monthly trend data with proper typing
      const mockMonthlyTrend: MonthlyTrendData[] = [
        { month: 'Jan', attendance: 92, leaves: 8 },
        { month: 'Feb', attendance: 89, leaves: 11 },
        { month: 'Mar', attendance: 94, leaves: 6 },
        { month: 'Apr', attendance: 91, leaves: 9 },
        { month: 'May', attendance: 88, leaves: 12 },
        { month: 'Jun', attendance: 93, leaves: 7 },
        { month: 'Jul', attendance: 90, leaves: 10 },
        { month: 'Aug', attendance: 95, leaves: 5 },
      ];
      setMonthlyTrendData(mockMonthlyTrend);
    } catch (error) {
      console.error("Error generating mock chart data:", error);
      // Set empty arrays as fallback
      setAttendanceData([]);
      setMonthlyTrendData([]);
    }
  };

  const processDepartmentData = () => {
    try {
      if (!Array.isArray(employees) || employees.length === 0) {
        setDepartmentData([]);
        return;
      }

      const deptCounts: Record<string, number> = employees.reduce((acc, emp) => {
        const dept = emp?.department?.name || 'Unassigned';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
      const deptData: DepartmentData[] = Object.entries(deptCounts).map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length],
      }));

      setDepartmentData(deptData);
    } catch (error) {
      console.error("Error processing department data:", error);
      setDepartmentData([]);
    }
  };

  // FIXED: Enhanced report generation with better API error handling
  const generateReport = async (reportType: string) => {
    if (!userProfile?.organizationId) {
      toast.error("Organization not found. Cannot generate reports.");
      return;
    }

    setReportLoading(reportType);

    try {
      const today = new Date();
      let startDate, endDate, periodLabel;

      // Calculate date range and label
      switch (selectedPeriod) {
        case "this-week":
          startDate = startOfWeek(today);
          endDate = endOfWeek(today);
          periodLabel = `Week_${format(startDate, 'MMM_dd')}_to_${format(endDate, 'MMM_dd')}`;
          break;
        case "this-month":
          startDate = startOfMonth(today);
          endDate = endOfMonth(today);
          periodLabel = format(today, 'MMM_yyyy');
          break;
        case "last-month":
          const lastMonth = subMonths(today, 1);
          startDate = startOfMonth(lastMonth);
          endDate = endOfMonth(lastMonth);
          periodLabel = format(lastMonth, 'MMM_yyyy');
          break;
        case "this-quarter":
          const quarter = Math.floor(today.getMonth() / 3);
          startDate = new Date(today.getFullYear(), quarter * 3, 1);
          endDate = new Date(today.getFullYear(), quarter * 3 + 3, 0);
          periodLabel = `Q${quarter + 1}_${today.getFullYear()}`;
          break;
        case "this-year":
          startDate = new Date(today.getFullYear(), 0, 1);
          endDate = new Date(today.getFullYear(), 11, 31);
          periodLabel = today.getFullYear().toString();
          break;
        default:
          startDate = startOfMonth(today);
          endDate = endOfMonth(today);
          periodLabel = format(today, 'MMM_yyyy');
      }

      const params = {
        organizationId: userProfile.organizationId,
        fromDate: format(startDate, 'yyyy-MM-dd'),
        toDate: format(endDate, 'yyyy-MM-dd'),
      };

      switch (reportType) {
        case 'attendance':
          try {
            console.log("Fetching attendance report with params:", params);
            
            const response = await getAttendanceReport(params);
            let attendanceData = adaptAttendanceData(response.data);
            
            console.log("Adapted attendance data:", attendanceData);

            if (!Array.isArray(attendanceData) || attendanceData.length === 0) {
              console.log("No real data found, generating mock data");
              attendanceData = generateMockAttendanceData(employees, params);
              toast.warning("Attendance API returned no data. Sample report generated.");
            } else {
              toast.success("Real attendance data found and processed!");
            }

            if (attendanceData.length > 0) {
              exportAttendanceReport(attendanceData, periodLabel);
              toast.success(`Attendance report exported successfully! (${attendanceData.length} records)`);
            } else {
              toast.error("No data available to export");
            }
          } catch (error) {
            console.error("Attendance report error:", error);
            toast.error("Attendance API is currently unavailable");
            
            // Generate mock data as fallback
            const mockData = generateMockAttendanceData(employees, params);
            exportAttendanceReport(mockData, periodLabel);
            toast.warning("API failed. Sample attendance report generated.");
          }
          break;

        case 'employee':
          try {
            if (Array.isArray(employees) && employees.length > 0) {
              exportEmployeeReport(employees);
              toast.success(`Employee report exported successfully! (${employees.length} employees)`);
            } else {
              toast.error("No employees found to export");
            }
          } catch (error) {
            console.error("Employee report error:", error);
            toast.error("Failed to generate employee report");
          }
          break;

        case 'leave':
          try {
            const response = await getLeaveReport(params);
            let leaveData = response?.data || [];
            
            if (Array.isArray(leaveData) && leaveData.length > 0) {
              const adaptedLeaveData = leaveData.map((leave: any) => ({
                employeeId: leave.user?.id || leave.employeeId || leave.userId || '',
                employeeName: leave.user ? 
                  `${leave.user.firstName} ${leave.user.lastName || ''}` : 
                  leave.employeeName || leave.userName || 'Unknown',
                employeeCode: leave.employeeCode || leave.user?.employeeCode || 'N/A',
                leaveType: leave.leaveType || leave.type || 'General Leave',
                fromDate: leave.startDate || leave.fromDate || '',
                toDate: leave.endDate || leave.toDate || '',
                days: leave.totalDays || leave.days || leave.duration || '1',
                status: leave.status || 'Pending',
                appliedDate: leave.createdAt ? format(new Date(leave.createdAt), 'yyyy-MM-dd') : leave.appliedDate || '',
                approvedBy: leave.approvedBy || leave.approver?.name || 'Manager',
                reason: leave.reason || leave.description || leave.comments || '',
              }));
              
              exportLeaveReport(adaptedLeaveData, periodLabel);
              toast.success(`Leave report exported successfully! (${adaptedLeaveData.length} records)`);
            } else {
              // Generate mock leave data
              const mockLeaveData = (Array.isArray(employees) ? employees : []).slice(0, Math.min(employees.length, 8)).map((emp, index) => ({
                employeeId: emp.id,
                employeeName: `${emp.firstName} ${emp.lastName || ''}`,
                employeeCode: emp.employeeCode || `EMP${String(index + 1).padStart(3, '0')}`,
                leaveType: ['Annual Leave', 'Sick Leave', 'Personal Leave', 'Maternity Leave'][index % 4],
                fromDate: format(subDays(today, 7 - index), 'yyyy-MM-dd'),
                toDate: format(subDays(today, 5 - index), 'yyyy-MM-dd'),
                days: String(2 + (index % 3)),
                status: ['Approved', 'Pending', 'Rejected'][index % 3],
                appliedDate: format(subDays(today, 15), 'yyyy-MM-dd'),
                approvedBy: 'Direct Manager',
                reason: ['Family vacation', 'Medical treatment', 'Personal matters', 'Emergency'][index % 4],
              }));
              
              exportLeaveReport(mockLeaveData, periodLabel);
              toast.warning("Leave API returned no data. Sample leave report generated.");
            }
          } catch (error) {
            console.error("Leave report error:", error);
            toast.error("Leave API is currently unavailable");
          }
          break;

        case 'payroll':
          try {
            const response = await getPayrollReport(params);
            
            // Generate mock payroll data since API is not implemented
            const mockPayrollData = (Array.isArray(employees) ? employees : []).map((emp, index) => {
              const basic = 30000 + (index * 5000) + Math.floor(Math.random() * 20000);
              const allowances = 8000 + (index * 1000) + Math.floor(Math.random() * 5000);
              const deductions = 3000 + (index * 300) + Math.floor(Math.random() * 2000);
              const gross = basic + allowances;
              const net = gross - deductions;

              return {
                employeeId: emp.id,
                employeeName: `${emp.firstName} ${emp.lastName || ''}`,
                employeeCode: emp.employeeCode || `EMP${String(index + 1).padStart(3, '0')}`,
                basicSalary: basic.toString(),
                allowances: allowances.toString(),
                deductions: deductions.toString(),
                grossSalary: gross.toString(),
                netSalary: net.toString(),
                payDate: format(endOfMonth(startDate), 'yyyy-MM-dd'),
                status: ['Paid', 'Processing', 'Pending'][index % 3],
              };
            });
            
            exportPayrollReport(mockPayrollData, periodLabel);
            toast.success(`Payroll report exported successfully! (${mockPayrollData.length} records)`);
          } catch (error) {
            console.error("Payroll report error:", error);
            toast.error("Payroll API is currently unavailable");
          }
          break;

        case 'performance':
          try {
            const response = await getPerformanceReport(params);
            
            // Generate mock performance data since API is not implemented
            const mockPerformanceData = (Array.isArray(employees) ? employees : []).slice(0, Math.min(employees.length, 15)).map((emp, index) => {
              const baseScore = 3.0 + (Math.random() * 2);
              const goals = 4 + Math.floor(Math.random() * 6);
              
              return {
                employeeId: emp.id,
                employeeName: `${emp.firstName} ${emp.lastName || ''}`,
                employeeCode: emp.employeeCode || `EMP${String(index + 1).padStart(3, '0')}`,
                reviewPeriod: periodLabel,
                overallScore: baseScore.toFixed(1),
                goalsAchieved: `${Math.floor(goals * 0.7 + Math.random() * goals * 0.3)}/${goals}`,
                reviewer: ['Direct Manager', 'Team Lead', 'Department Head'][index % 3],
                reviewDate: format(subDays(today, Math.floor(Math.random() * 30)), 'yyyy-MM-dd'),
                comments: [
                  'Excellent performance with consistent delivery',
                  'Good performance with room for improvement',
                  'Outstanding contribution to team goals',
                  'Meets expectations with potential for growth',
                  'Exceptional leadership and technical skills'
                ][index % 5],
              };
            });
            
            exportPerformanceReport(mockPerformanceData, periodLabel);
            toast.success(`Performance report exported successfully! (${mockPerformanceData.length} records)`);
          } catch (error) {
            console.error("Performance report error:", error);
            toast.error("Performance API is currently unavailable");
          }
          break;

        case 'custom':
          toast.info("Custom report builder API is not yet available");
          break;

        default:
          toast.error("Unknown report type");
      }
    } catch (error: any) {
      console.error(`Failed to generate ${reportType} report:`, error);
      toast.error(`Failed to generate ${reportType} report. API may be unavailable.`);
    } finally {
      setReportLoading(null);
    }
  };

  const exportChartAsExcel = (chartName: string, data: any[]) => {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        toast.error(`No ${chartName} data available to export`);
        return;
      }
      
      exportChartData(data, chartName);
      toast.success(`${chartName} data exported successfully!`);
    } catch (error) {
      console.error(`Chart export error:`, error);
      toast.error(`Failed to export ${chartName} data`);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.3 } },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-lg font-medium">Loading Reports...</p>
        </div>
      </div>
    );
  }

  // Safe calculations with fallbacks
  const totalEmployees = Array.isArray(employees) ? employees.length : 0;
  const activeEmployees = Array.isArray(employees) ? employees.filter(e => e.status === 'active').length : 0;
  const attendanceRate = totalEmployees > 0 ? ((activeEmployees / totalEmployees) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto p-6">
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
          
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">Reports & Analytics</h1>
              <p className="text-muted-foreground">Generate comprehensive reports and insights</p>
            </div>
            <div className="flex items-center space-x-3">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="this-week">This Week</SelectItem>
                  <SelectItem value="this-month">This Month</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="this-quarter">This Quarter</SelectItem>
                  <SelectItem value="this-year">This Year</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </motion.div>

          {/* Overview Cards */}
          <motion.div variants={containerVariants} className="grid gap-6 md:grid-cols-4">
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Reports</CardTitle>
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">24</div>
                  <p className="text-xs text-muted-foreground">Generated this month</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{attendanceRate}%</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+2.1%</span> from last month
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Leave Utilization</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">76%</div>
                  <p className="text-xs text-muted-foreground">Of allocated leaves used</p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Work Hours</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">8.2h</div>
                  <p className="text-xs text-muted-foreground">Per employee per day</p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Main Content */}
          <motion.div variants={itemVariants}>
            <Tabs defaultValue="analytics" className="space-y-6">
              <TabsList className="grid w-full lg:w-auto grid-cols-3">
                <TabsTrigger value="analytics" className="flex items-center space-x-2">
                  <BarChart3 className="w-4 h-4" />
                  <span>Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Reports</span>
                </TabsTrigger>
                <TabsTrigger value="downloads" className="flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Downloads</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="analytics" className="space-y-6">
                <div className="grid gap-6 lg:grid-cols-2">
                  {/* Weekly Attendance Chart */}
                  <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Weekly Attendance Overview</CardTitle>
                        <CardDescription>
                          Daily attendance breakdown for the selected period
                        </CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => exportChartAsExcel('Weekly_Attendance', attendanceData)}
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="h-80">
                        {Array.isArray(attendanceData) && attendanceData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={attendanceData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Bar dataKey="present" fill="#10b981" name="Present" />
                              <Bar dataKey="halfDay" fill="#f59e0b" name="Half Day" />
                              <Bar dataKey="absent" fill="#ef4444" name="Absent" />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                              <p>No attendance data available</p>
                              <p className="text-sm">API may be unavailable</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Monthly Trend */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Monthly Trends</CardTitle>
                        <CardDescription>
                          Attendance and leave trends over the year
                        </CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => exportChartAsExcel('Monthly_Trends', monthlyTrendData)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        {Array.isArray(monthlyTrendData) && monthlyTrendData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={monthlyTrendData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="month" />
                              <YAxis />
                              <Tooltip />
                              <Legend />
                              <Line type="monotone" dataKey="attendance" stroke="#3b82f6" name="Attendance %" />
                              <Line type="monotone" dataKey="leaves" stroke="#ef4444" name="Leaves %" />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                              <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No trend data available</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Department Distribution */}
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <div>
                        <CardTitle>Department Distribution</CardTitle>
                        <CardDescription>
                          Employee distribution across departments
                        </CardDescription>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => exportChartAsExcel('Department_Distribution', departmentData)}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64">
                        {Array.isArray(departmentData) && departmentData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <RechartsPieChart>
                              <Pie
                                data={departmentData}
                                cx="50%"
                                cy="50%"
                                innerRadius={40}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                              >
                                {departmentData.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                              </Pie>
                              <Tooltip />
                              <Legend />
                            </RechartsPieChart>
                          </ResponsiveContainer>
                        ) : (
                          <div className="flex items-center justify-center h-full text-muted-foreground">
                            <div className="text-center">
                              <PieChart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">No department data available</p>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="reports" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Generate Reports</CardTitle>
                    <CardDescription>
                      Create detailed reports for various aspects of your HRMS data
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                      {/* Attendance Report */}
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Clock className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">Attendance Report</h3>
                              <p className="text-sm text-muted-foreground">
                                Detailed attendance analytics
                              </p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span>Records</span>
                              <Badge variant="outline">
                                {Array.isArray(attendanceData) ? attendanceData.reduce((sum, day) => sum + day.present + day.absent + day.halfDay, 0) : 0}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Period</span>
                              <span className="text-muted-foreground">{selectedPeriod}</span>
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => generateReport('attendance')}
                              disabled={reportLoading === 'attendance'}
                            >
                              {reportLoading === 'attendance' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 mr-2" />
                              )}
                              Generate
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Employee Report */}
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Users className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">Employee Report</h3>
                              <p className="text-sm text-muted-foreground">
                                Employee directory and details
                              </p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span>Employees</span>
                              <Badge variant="outline">{totalEmployees}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Departments</span>
                              <span className="text-muted-foreground">
                                {new Set((Array.isArray(employees) ? employees : []).map(e => e.department?.name).filter(Boolean)).size}
                              </span>
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => generateReport('employee')}
                              disabled={reportLoading === 'employee'}
                            >
                              {reportLoading === 'employee' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 mr-2" />
                              )}
                              Generate
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Leave Report */}
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-orange-100 rounded-lg">
                              <Calendar className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">Leave Report</h3>
                              <p className="text-sm text-muted-foreground">
                                Leave applications and balances
                              </p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span>Applications</span>
                              <Badge variant="outline">87</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Approved</span>
                              <span className="text-muted-foreground">76%</span>
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => generateReport('leave')}
                              disabled={reportLoading === 'leave'}
                            >
                              {reportLoading === 'leave' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 mr-2" />
                              )}
                              Generate
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Payroll Report */}
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-purple-100 rounded-lg">
                              <TrendingUp className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">Payroll Report</h3>
                              <p className="text-sm text-muted-foreground">
                                Salary and compensation data
                              </p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span>Total Paid</span>
                              <Badge variant="outline">₹45.2L</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Employees</span>
                              <span className="text-muted-foreground">{totalEmployees}</span>
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => generateReport('payroll')}
                              disabled={reportLoading === 'payroll'}
                            >
                              {reportLoading === 'payroll' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 mr-2" />
                              )}
                              Generate
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Performance Report */}
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-red-100 rounded-lg">
                              <BarChart3 className="w-6 h-6 text-red-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">Performance Report</h3>
                              <p className="text-sm text-muted-foreground">
                                Employee performance metrics
                              </p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span>Reviews</span>
                              <Badge variant="outline">156</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Avg Score</span>
                              <span className="text-muted-foreground">4.2/5</span>
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => generateReport('performance')}
                              disabled={reportLoading === 'performance'}
                            >
                              {reportLoading === 'performance' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Download className="w-4 h-4 mr-2" />
                              )}
                              Generate
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Custom Report */}
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center space-x-3 mb-4">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <FileText className="w-6 h-6 text-gray-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold">Custom Report</h3>
                              <p className="text-sm text-muted-foreground">
                                Build your own report
                              </p>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="flex items-center justify-between text-sm">
                              <span>Templates</span>
                              <Badge variant="outline">5</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Fields</span>
                              <span className="text-muted-foreground">50+</span>
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => generateReport('custom')}
                              disabled={reportLoading === 'custom'}
                            >
                              {reportLoading === 'custom' ? (
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              ) : (
                                <Filter className="w-4 h-4 mr-2" />
                              )}
                              Configure
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="downloads" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Downloads</CardTitle>
                    <CardDescription>
                      Previously generated reports and downloads
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Mock download history */}
                      {[
                        {
                          name: "Attendance Report - August 2025",
                          type: "attendance",
                          date: "2025-08-20T10:30:00Z",
                          size: "2.4 MB",
                          format: "Excel"
                        },
                        {
                          name: "Employee Directory",
                          type: "employee",
                          date: "2025-08-19T15:45:00Z",
                          size: "1.8 MB",
                          format: "Excel"
                        },
                        {
                          name: "Payroll Summary - July 2025",
                          type: "payroll",
                          date: "2025-08-18T09:20:00Z",
                          size: "3.2 MB",
                          format: "Excel"
                        },
                        {
                          name: "Leave Analysis Report",
                          type: "leave",
                          date: "2025-08-17T14:10:00Z",
                          size: "1.5 MB",
                          format: "Excel"
                        },
                        {
                          name: "Performance Review Summary",
                          type: "performance",
                          date: "2025-08-16T11:30:00Z",
                          size: "2.7 MB",
                          format: "Excel"
                        }
                      ].map((download, index) => (
                        <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center space-x-4">
                            <div className={`p-2 rounded-lg ${
                              download.type === 'attendance' ? 'bg-blue-100' :
                              download.type === 'employee' ? 'bg-green-100' :
                              download.type === 'payroll' ? 'bg-purple-100' :
                              download.type === 'leave' ? 'bg-orange-100' :
                              'bg-red-100'
                            }`}>
                              <FileText className={`w-5 h-5 ${
                                download.type === 'attendance' ? 'text-blue-600' :
                                download.type === 'employee' ? 'text-green-600' :
                                download.type === 'payroll' ? 'text-purple-600' :
                                download.type === 'leave' ? 'text-orange-600' :
                                'text-red-600'
                              }`} />
                            </div>
                            <div>
                              <div className="font-medium">{download.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {format(new Date(download.date), 'MMM dd, yyyy HH:mm')} • {download.size} • {download.format}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="capitalize">
                              {download.type}
                            </Badge>
                            <Button variant="ghost" size="sm">
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>

          {/* Quick Insights */}
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader>
                <CardTitle>Quick Insights</CardTitle>
                <CardDescription>
                  Key metrics and trends at a glance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 md:grid-cols-3">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-green-600">95%</div>
                    <p className="text-sm text-muted-foreground mt-1">On-time Attendance</p>
                    <p className="text-xs text-green-600 mt-1">↗ +3% this month</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">8.2</div>
                    <p className="text-sm text-muted-foreground mt-1">Avg Daily Hours</p>
                    <p className="text-xs text-blue-600 mt-1">→ Stable</p>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-orange-600">12</div>
                    <p className="text-sm text-muted-foreground mt-1">Pending Leave Requests</p>
                    <p className="text-xs text-orange-600 mt-1">↘ -5 from last week</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
