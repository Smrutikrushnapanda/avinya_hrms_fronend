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
  getEmployees,
  getProfile,
  getAttendanceReport,
  getAllLeaveRequests,
  getPayrollRecords,
  getAllPerformanceReviews,
} from "@/app/api/api";
import {
  exportAttendanceReport,
  exportEmployeeReport,
  exportLeaveReport,
  exportPayrollReport,
  exportPerformanceReport,
  exportChartData,
} from "@/utils/reportExport";
import { adaptAttendanceData } from "@/utils/dataAdapter";

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

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [reportLoading, setReportLoading] = useState<string | null>(null);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [selectedPeriod, setSelectedPeriod] = useState("this-month");
  const [attendanceData, setAttendanceData] = useState<WeeklyAttendanceData[]>([]);
  const [departmentData, setDepartmentData] = useState<DepartmentData[]>([]);
  const [monthlyTrendData, setMonthlyTrendData] = useState<MonthlyTrendData[]>([]);
  const [reportStats, setReportStats] = useState({
    leaveApplications: 0,
    leaveApprovedPct: "0%",
    payrollTotalPaid: 0,
    payrollEmployeeCount: 0,
    performanceReviews: 0,
    performanceAvgScore: "0.0",
  });

  const getPeriodRangeAndLabel = () => {
    const today = new Date();
    let startDate: Date;
    let endDate: Date;
    let periodLabel: string;

    switch (selectedPeriod) {
      case "this-week":
        startDate = startOfWeek(today);
        endDate = endOfWeek(today);
        periodLabel = `Week_${format(startDate, "MMM_dd")}_to_${format(endDate, "MMM_dd")}`;
        break;
      case "this-month":
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        periodLabel = format(today, "MMM_yyyy");
        break;
      case "last-month": {
        const lastMonth = subMonths(today, 1);
        startDate = startOfMonth(lastMonth);
        endDate = endOfMonth(lastMonth);
        periodLabel = format(lastMonth, "MMM_yyyy");
        break;
      }
      case "this-quarter": {
        const quarter = Math.floor(today.getMonth() / 3);
        startDate = new Date(today.getFullYear(), quarter * 3, 1);
        endDate = new Date(today.getFullYear(), quarter * 3 + 3, 0);
        periodLabel = `Q${quarter + 1}_${today.getFullYear()}`;
        break;
      }
      case "this-year":
        startDate = new Date(today.getFullYear(), 0, 1);
        endDate = new Date(today.getFullYear(), 11, 31);
        periodLabel = today.getFullYear().toString();
        break;
      default:
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        periodLabel = format(today, "MMM_yyyy");
    }

    return { startDate, endDate, periodLabel };
  };

  const normalizeList = (payload: any): any[] => {
    if (Array.isArray(payload)) return payload;
    if (Array.isArray(payload?.data)) return payload.data;
    if (Array.isArray(payload?.data?.data)) return payload.data.data;
    if (Array.isArray(payload?.results)) return payload.results;
    return [];
  };

  const isDateInRange = (dateValue: unknown, startDate: Date, endDate: Date): boolean => {
    if (!dateValue) return false;
    const date = new Date(String(dateValue));
    if (Number.isNaN(date.getTime())) return false;
    return date >= startDate && date <= endDate;
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (userProfile?.organizationId) {
      fetchChartData();
    }
  }, [selectedPeriod, userProfile]);

  useEffect(() => {
    if (employees.length > 0) {
      processDepartmentData();
    }
  }, [employees]);

  useEffect(() => {
    if (userProfile?.organizationId) {
      fetchReportStats();
    }
  }, [selectedPeriod, userProfile?.organizationId]);

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
            const employeeList = normalizeList(employeesRes.data);
            setEmployees(employeeList);
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

      const attendanceRes = await getAttendanceReport(params);
      const adaptedData = adaptAttendanceData(attendanceRes.data);
      processAttendanceData(adaptedData);

      // Generate department distribution from employees
      processDepartmentData();
      
    } catch (error) {
      console.error("Failed to fetch chart data:", error);
      toast.warning("Unable to load chart data for this period.");
      setAttendanceData([]);
      setMonthlyTrendData([]);
    }
  };

  const processAttendanceData = (data: any[]) => {
    try {
      if (!Array.isArray(data) || data.length === 0) {
        setAttendanceData([]);
        setMonthlyTrendData([]);
        return;
      }
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

      const monthBuckets = new Map<string, { present: number; leaves: number; total: number }>();
      data.forEach((record) => {
        const rawDate = record?.date;
        if (!rawDate) return;
        const date = new Date(rawDate);
        if (Number.isNaN(date.getTime())) return;
        const month = format(date, "MMM");
        const status = String(record?.status || "").toUpperCase();
        const bucket = monthBuckets.get(month) || { present: 0, leaves: 0, total: 0 };
        bucket.total += 1;
        if (status === "PRESENT") {
          bucket.present += 1;
        } else if (status === "ABSENT" || status === "HALF_DAY" || status === "HALFDAY") {
          bucket.leaves += 1;
        }
        monthBuckets.set(month, bucket);
      });

      const monthOrder = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const monthlyTrend: MonthlyTrendData[] = monthOrder
        .filter((m) => monthBuckets.has(m))
        .map((m) => {
          const bucket = monthBuckets.get(m)!;
          return {
            month: m,
            attendance: bucket.total ? Math.round((bucket.present / bucket.total) * 100) : 0,
            leaves: bucket.total ? Math.round((bucket.leaves / bucket.total) * 100) : 0,
          };
        });
      setMonthlyTrendData(monthlyTrend);
    } catch (error) {
      console.error("Error processing attendance data:", error);
      setAttendanceData([]);
      setMonthlyTrendData([]);
    }
  };

  const fetchReportStats = async () => {
    if (!userProfile?.organizationId) return;
    const { startDate, endDate } = getPeriodRangeAndLabel();
    try {
      const [leaveRes, payrollRes, performanceRes] = await Promise.allSettled([
        getAllLeaveRequests(userProfile.organizationId),
        getPayrollRecords({
          organizationId: userProfile.organizationId,
          from: format(startDate, "yyyy-MM-dd"),
          to: format(endDate, "yyyy-MM-dd"),
          page: 1,
          limit: 1000,
        }),
        getAllPerformanceReviews(),
      ]);

      const leaves = leaveRes.status === "fulfilled"
        ? normalizeList(leaveRes.value?.data).filter((l: any) =>
            isDateInRange(l?.createdAt || l?.startDate || l?.fromDate, startDate, endDate)
          )
        : [];
      const approvedLeaves = leaves.filter((l: any) => String(l?.status || "").toUpperCase() === "APPROVED").length;
      const leaveApprovedPct = leaves.length ? `${((approvedLeaves / leaves.length) * 100).toFixed(1)}%` : "0%";

      const payrollRows = payrollRes.status === "fulfilled" ? normalizeList(payrollRes.value?.data) : [];
      const payrollTotalPaid = payrollRows.reduce((sum: number, row: any) => sum + Number(row?.netPay || 0), 0);
      const payrollEmployeeCount = new Set(
        payrollRows.map((row: any) => row?.employeeId || row?.employee?.id).filter(Boolean)
      ).size;

      const performanceRows = performanceRes.status === "fulfilled"
        ? normalizeList(performanceRes.value?.data).filter((r: any) =>
            isDateInRange(r?.createdAt, startDate, endDate)
          )
        : [];
      const scores = performanceRows
        .map((row: any) => Number(row?.overallRating))
        .filter((score: number) => Number.isFinite(score));
      const avgScore = scores.length
        ? (scores.reduce((sum: number, score: number) => sum + score, 0) / scores.length).toFixed(1)
        : "0.0";

      setReportStats({
        leaveApplications: leaves.length,
        leaveApprovedPct,
        payrollTotalPaid,
        payrollEmployeeCount,
        performanceReviews: performanceRows.length,
        performanceAvgScore: avgScore,
      });
    } catch (error) {
      console.error("Failed to fetch report stats:", error);
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

  const generateReport = async (reportType: string) => {
    if (!userProfile?.organizationId) {
      toast.error("Organization not found. Cannot generate reports.");
      return;
    }

    setReportLoading(reportType);

    try {
      const { startDate, endDate, periodLabel } = getPeriodRangeAndLabel();

      const params = {
        organizationId: userProfile.organizationId,
        fromDate: format(startDate, "yyyy-MM-dd"),
        toDate: format(endDate, "yyyy-MM-dd"),
      };

      switch (reportType) {
        case 'attendance':
          try {
            console.log("Fetching attendance report with params:", params);
            
            const response = await getAttendanceReport(params);
            const attendanceRows = adaptAttendanceData(response.data);
            
            console.log("Adapted attendance data:", attendanceRows);

            if (!Array.isArray(attendanceRows) || attendanceRows.length === 0) {
              toast.error("No data available to export");
              break;
            }
            exportAttendanceReport(attendanceRows, periodLabel);
            toast.success(`Attendance report exported successfully! (${attendanceRows.length} records)`);
          } catch (error) {
            console.error("Attendance report error:", error);
            toast.error("Attendance API is currently unavailable");
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
            const response = await getAllLeaveRequests(userProfile.organizationId);
            const leaveData = normalizeList(response.data).filter((leave: any) =>
              isDateInRange(leave?.createdAt || leave?.startDate || leave?.fromDate, startDate, endDate)
            );
            
            if (Array.isArray(leaveData) && leaveData.length > 0) {
              const adaptedLeaveData = leaveData.map((leave: any) => ({
                employeeId: leave.user?.id || leave.employeeId || leave.userId || '',
                employeeName: leave.user ? 
                  `${leave.user.firstName} ${leave.user.lastName || ''}` : 
                  leave.employeeName || leave.userName || 'Unknown',
                employeeCode: leave.employeeCode || leave.user?.employeeCode || 'N/A',
                leaveType: leave.leaveType?.name || leave.leaveType || leave.type || 'General Leave',
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
              toast.error("No leave records found for selected period");
            }
          } catch (error) {
            console.error("Leave report error:", error);
            toast.error("Leave API is currently unavailable");
          }
          break;

        case 'payroll':
          try {
            const response = await getPayrollRecords({
              organizationId: userProfile.organizationId,
              from: format(startDate, "yyyy-MM-dd"),
              to: format(endDate, "yyyy-MM-dd"),
              page: 1,
              limit: 1000,
            });
            const payrollRows = normalizeList(response.data);
            if (!payrollRows.length) {
              toast.error("No payroll records found for selected period");
              break;
            }

            const exported = payrollRows.map((pay: any) => {
              const allowances =
                Number(pay?.allowances ?? 0) ||
                (Number(pay?.hra || 0) + Number(pay?.conveyance || 0) + Number(pay?.otherAllowances || 0));
              return {
                employeeId: pay?.employeeId || pay?.employee?.id || "",
                employeeName:
                  pay?.employee?.firstName || pay?.employee?.lastName
                    ? `${pay.employee.firstName || ""} ${pay.employee.lastName || ""}`.trim()
                    : "Unknown",
                basicSalary: String(pay?.basic ?? pay?.basicSalary ?? 0),
                allowances: String(allowances),
                deductions: String(pay?.totalDeductions ?? pay?.deductions ?? (Number(pay?.pf || 0) + Number(pay?.tds || 0))),
                grossSalary: String(pay?.totalEarnings ?? pay?.grossSalary ?? 0),
                netSalary: String(pay?.netPay ?? pay?.netSalary ?? 0),
                payDate: pay?.periodEnd || pay?.payDate || pay?.createdAt || "",
                status: pay?.status || "",
              };
            });

            exportPayrollReport(exported, periodLabel);
            toast.success(`Payroll report exported successfully! (${exported.length} records)`);
          } catch (error) {
            console.error("Payroll report error:", error);
            toast.error("Failed to load payroll records");
          }
          break;

        case 'performance':
          try {
            const response = await getAllPerformanceReviews();
            const performanceRows = normalizeList(response.data).filter((review: any) =>
              isDateInRange(review?.createdAt, startDate, endDate)
            );
            if (!performanceRows.length) {
              toast.error("No performance reviews found for selected period");
              break;
            }

            const exported = performanceRows.map((review: any) => {
              const totalAnswers = Array.isArray(review?.answers) ? review.answers.length : 0;
              const answered = Array.isArray(review?.answers)
                ? review.answers.filter((ans: any) => String(ans?.answer || "").trim().length > 0).length
                : 0;
              return {
                employeeId: review?.employee?.id || "",
                employeeName: review?.employee
                  ? `${review.employee.firstName || ""} ${review.employee.lastName || ""}`.trim()
                  : "Unknown",
                reviewPeriod: review?.period || periodLabel,
                overallScore: review?.overallRating ?? "",
                goalsAchieved: totalAnswers ? `${answered}/${totalAnswers}` : "-",
                reviewer: review?.reviewer
                  ? `${review.reviewer.firstName || ""} ${review.reviewer.lastName || ""}`.trim()
                  : review?.reviewType || "Reviewer",
                reviewDate: review?.createdAt || "",
                comments: review?.comments || "",
              };
            });

            exportPerformanceReport(exported, periodLabel);
            toast.success(`Performance report exported successfully! (${exported.length} records)`);
          } catch (error) {
            console.error("Performance report error:", error);
            toast.error("Failed to load performance reviews");
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
  const activeEmployees = Array.isArray(employees)
    ? employees.filter((e) => String(e?.status || "").toUpperCase() === "ACTIVE").length
    : 0;
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
                  <div className="text-2xl font-bold">{reportStats.leaveApprovedPct}</div>
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
                              <Badge variant="outline">{reportStats.leaveApplications}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Approved</span>
                              <span className="text-muted-foreground">{reportStats.leaveApprovedPct}</span>
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
                              <Badge variant="outline">₹{Math.round(reportStats.payrollTotalPaid).toLocaleString("en-IN")}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Employees</span>
                              <span className="text-muted-foreground">{reportStats.payrollEmployeeCount || totalEmployees}</span>
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
                              <Badge variant="outline">{reportStats.performanceReviews}</Badge>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span>Avg Score</span>
                              <span className="text-muted-foreground">{reportStats.performanceAvgScore}/5</span>
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
