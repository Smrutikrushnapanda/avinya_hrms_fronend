"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  Building,
  Award,
  Clock,
  FileText,
  CreditCard,
  FolderOpen,
  Settings, // Add this import
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format, isValid, parseISO } from "date-fns";
import { Employee } from "./types";
import {
  getEmployee,
  getAttendanceSummary,
  getLeaveBalance,
  getAttendanceReport2,
  getProfile,
  getMonthlyAttendance,
} from "@/app/api/api";
import TimeslipTab from "./TimeslipTab";
import WorkflowManagement from "./WorkflowManagement"; // Add this import

interface EmployeeDetailsProps {
  employeeId: string;
  onBack: () => void;
}

interface AttendanceStats {
  dayOff: number;
  lateClockIn: number;
  lateClockOut: number;
  noClockOut: number;
  offTimeQuota: number;
  absent: number;
}

export default function EmployeeDetails({ employeeId, onBack }: EmployeeDetailsProps) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [attendanceStats, setAttendanceStats] = useState<AttendanceStats>({
    dayOff: 0,
    lateClockIn: 0,
    lateClockOut: 0,
    noClockOut: 0,
    offTimeQuota: 0,
    absent: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("timeslip");

  useEffect(() => {
    fetchEmployeeDetails();
    fetchAttendanceStats();
  }, [employeeId]);

  const fetchEmployeeDetails = async () => {
    try {
      const response = await getEmployee(employeeId);
      setEmployee(response.data);
    } catch (error) {
      console.error("Error fetching employee details:", error);
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      // Get profile to get organizationId only
      const profileResponse = await getProfile();
      const organizationId = profileResponse.data?.organizationId;
      
      if (!organizationId) {
        console.log("Organization ID not found");
        return;
      }

      // Use the selected employee's userId instead of current user
      if (!employee?.userId) {
        console.log("Employee userId not found");
        return;
      }

      // Get current month and year
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1; // getMonth() returns 0-11
      const currentYear = currentDate.getFullYear();

      // Fetch monthly attendance data for the selected employee
      const attendanceResponse = await getMonthlyAttendance({
        userId: employee.userId, // Use employee's userId instead of current user
        month: currentMonth,
        year: currentYear,
        organizationId: organizationId,
      });

      if (attendanceResponse.data && Array.isArray(attendanceResponse.data)) {
        const attendanceData = attendanceResponse.data;
        
        // Calculate stats from the attendance data
        const stats = {
          dayOff: attendanceData.filter(day => day.isSunday || day.isHoliday).length,
          lateClockIn: attendanceData.filter(day => {
            // Assuming late is after 9:30 AM
            if (day.inTime && day.status !== 'absent') {
              const [time, period] = day.inTime.split(' ');
              const [hours, minutes] = time.split(':');
              const hour24 = period === 'PM' && hours !== '12' ? parseInt(hours) + 12 : 
                            period === 'AM' && hours === '12' ? 0 : parseInt(hours);
              return hour24 > 9 || (hour24 === 9 && parseInt(minutes) > 30);
            }
            return false;
          }).length,
          lateClockOut: attendanceData.filter(day => {
            // Assuming early clock-out is before 6:00 PM
            if (day.outTime && day.status !== 'absent') {
              const [time, period] = day.outTime.split(' ');
              const [hours, minutes] = time.split(':');
              const hour24 = period === 'PM' && hours !== '12' ? parseInt(hours) + 12 : 
                            period === 'AM' && hours === '12' ? 0 : parseInt(hours);
              return hour24 < 18;
            }
            return false;
          }).length,
          noClockOut: attendanceData.filter(day => 
            day.status !== 'absent' && day.inTime && !day.outTime
          ).length,
          offTimeQuota: attendanceData.filter(day => day.isSunday).length,
          absent: attendanceData.filter(day => day.status === 'absent').length,
        };

        setAttendanceStats(stats);
      }
    } catch (error) {
      console.error("Error fetching attendance stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const safeFormatDate = (dateString: string | null | undefined, fallback: string = "Not set") => {
    if (!dateString) return fallback;
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      return isValid(date) ? format(date, 'MMM dd, yyyy') : fallback;
    } catch {
      return fallback;
    }
  };

  if (loading || !employee) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-gray-200 rounded animate-pulse" />
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="md:col-span-2">
            <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Employee Details</h1>
            <p className="text-gray-600">Complete profile and attendance information</p>
          </div>
        </div>
      </div>

      {/* Employee Profile Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card>
            <CardHeader className="text-center">
              <Avatar className="h-24 w-24 mx-auto">
                <AvatarImage src={employee.photoUrl} />
                <AvatarFallback className="text-lg">
                  {`${employee.firstName.charAt(0)}${(employee.lastName || '').charAt(0)}`}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">
                  {`${employee.firstName} ${employee.lastName || ''}`}
                </h3>
                <p className="text-gray-600">{employee.designation?.name || 'No designation'}</p>
                <Badge variant="outline">{employee.employeeCode}</Badge>
                <Badge className={
                  employee.status === 'active' 
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                }>
                  {employee.status?.toUpperCase() || 'ACTIVE'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{employee.workEmail}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{employee.contactNumber || 'Not provided'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Building className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{employee.department?.name || 'Not assigned'}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Joined {safeFormatDate(employee.dateOfJoining)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Attendance Stats Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="lg:col-span-2"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Attendance Overview</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{attendanceStats.dayOff}</div>
                  <div className="text-sm text-gray-600">Day off</div>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">{attendanceStats.lateClockIn}</div>
                  <div className="text-sm text-gray-600">Late clock-in</div>
                </div>
                <div className="text-center p-4 bg-red-50 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{attendanceStats.lateClockOut}</div>
                  <div className="text-sm text-gray-600">Late clock-out</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{attendanceStats.noClockOut}</div>
                  <div className="text-sm text-gray-600">No clock-out</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{attendanceStats.offTimeQuota}</div>
                  <div className="text-sm text-gray-600">Off time quota</div>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-600">{attendanceStats.absent}</div>
                  <div className="text-sm text-gray-600">Absent</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Information Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="timeslip" className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>Time Slip</span>
                </TabsTrigger>
                <TabsTrigger value="leave" className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4" />
                  <span>Leave</span>
                </TabsTrigger>
                <TabsTrigger value="payroll" className="flex items-center space-x-2">
                  <CreditCard className="h-4 w-4" />
                  <span>Payroll</span>
                </TabsTrigger>
                <TabsTrigger value="personal" className="flex items-center space-x-2">
                  <User className="h-4 w-4" />
                  <span>Personal Details</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center space-x-2">
                  <FolderOpen className="h-4 w-4" />
                  <span>Documents</span>
                </TabsTrigger>
                <TabsTrigger value="workflows" className="flex items-center space-x-2">
                  <Settings className="h-4 w-4" />
                  <span>Workflows</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeslip" className="mt-6">
                <TimeslipTab employeeId={employeeId} employee={employee} />
              </TabsContent>

              <TabsContent value="leave" className="mt-6">
                <LeaveTab employeeId={employeeId} employee={employee} />
              </TabsContent>

              <TabsContent value="payroll" className="mt-6">
                <PayrollTab employeeId={employeeId} employee={employee} />
              </TabsContent>

              <TabsContent value="personal" className="mt-6">
                <PersonalDetailsTab employee={employee} />
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                <DocumentsTab employeeId={employeeId} employee={employee} />
              </TabsContent>

              <TabsContent value="workflows" className="mt-6">
                <WorkflowManagement />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// Existing Tab Components (keep these as they are)
function LeaveTab({ employeeId, employee }: { employeeId: string; employee: Employee }) {
  const [leaveData, setLeaveData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaveData();
  }, [employeeId]);

  const fetchLeaveData = async () => {
    try {
      const response = await getLeaveBalance(employeeId);
      setLeaveData(response.data);
    } catch (error) {
      console.error("Leave API not available:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading leave data...</div>;
  }

  if (!leaveData) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
        <p>No API available for leave data</p>
        <p className="text-sm mt-2">Please provide the leave management API endpoint</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Leave Information</h3>
      {/* Leave content will be populated when API is available */}
    </div>
  );
}

function PayrollTab({ employeeId, employee }: { employeeId: string; employee: Employee }) {
  return (
    <div className="text-center py-8 text-gray-500">
      <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
      <p>No API available for payroll data</p>
      <p className="text-sm mt-2">Please provide the payroll API endpoint</p>
    </div>
  );
}

function PersonalDetailsTab({ employee }: { employee: Employee }) {
  const safeFormatDate = (dateString: string | null | undefined, fallback: string = "Not set") => {
    if (!dateString) return fallback;
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      return isValid(date) ? format(date, 'MMM dd, yyyy') : fallback;
    } catch {
      return fallback;
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Personal Information</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Full Name</label>
            <p className="text-base">{`${employee.firstName} ${employee.middleName || ''} ${employee.lastName || ''}`.trim()}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Date of Birth</label>
            <p className="text-base">{safeFormatDate(employee.dateOfBirth)}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Gender</label>
            <p className="text-base">{employee.gender || 'Not specified'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Blood Group</label>
            <p className="text-base">{employee.bloodGroup || 'Not specified'}</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Work Email</label>
            <p className="text-base">{employee.workEmail}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Personal Email</label>
            <p className="text-base">{employee.personalEmail || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Contact Number</label>
            <p className="text-base">{employee.contactNumber || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Employment Type</label>
            <p className="text-base">{employee.employmentType || 'Not specified'}</p>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h4 className="text-md font-semibold mb-4">Emergency Contact</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-500">Contact Name</label>
            <p className="text-base">{employee.emergencyContactName || 'Not provided'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Relationship</label>
            <p className="text-base">{employee.emergencyContactRelationship || 'Not specified'}</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-500">Phone Number</label>
            <p className="text-base">{employee.emergencyContactPhone || 'Not provided'}</p>
          </div>
        </div>
        {!employee.emergencyContactName && !employee.emergencyContactPhone && (
          <div className="text-center py-8 text-gray-500">
            <p>No emergency contact information available</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DocumentsTab({ employeeId, employee }: { employeeId: string; employee: Employee }) {
  return (
    <div className="text-center py-8 text-gray-500">
      <FolderOpen className="h-12 w-12 mx-auto mb-4 text-gray-300" />
      <p>No API available for documents data</p>
      <p className="text-sm mt-2">Please provide the documents management API endpoint</p>
    </div>
  );
}
