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
  Settings,
  Briefcase,
  ShieldAlert,
  ShieldCheck,
  Package,
  Download,
  Plus,
  Edit,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Unlock,
  Eye,
  FileDown,
  Loader2,
  DollarSign,
  Tag,
  Laptop,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format, isValid, parseISO } from "date-fns";
import {
  Employee,
  EmployeeAsset,
  AssetClearance,
  EmployeeDocument,
  EmployeeSettlement,
  ManagerInfo,
} from "./types";
import {
  getEmployee,
  getLeaveBalance,
  getAttendanceSettings,
  getProfile,
  getMonthlyAttendance,
  updateEmployee,
  getSalaryStructuresByEmployee,
  getPayrollRecords,
  getEmployeeAssets,
  createEmployeeAsset,
  updateEmployeeAsset,
  returnEmployeeAsset,
  deleteEmployeeAsset,
  getEmployeeClearance,
  getEmployeeDocuments,
  createEmployeeDocument,
  deleteEmployeeDocument,
  getEmployeeSettlement,
  saveEmployeeSettlement,
  downloadSettlementPdf,
  uploadFile,
} from "@/app/api/api";
import TimeslipTab from "./TimeslipTab";
import WorkflowManagement from "./WorkflowManagement";
import { toast } from "sonner";

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

function normalizeAttendanceStatus(status: unknown): string {
  return String(status ?? "")
    .trim()
    .toLowerCase()
    .replace(/_/g, "-");
}

function parseClockTimeToMinutes(timeStr?: string | null): number | null {
  if (!timeStr || typeof timeStr !== "string") return null;
  try {
    if (timeStr.includes("T")) {
      const d = new Date(timeStr);
      return d.getHours() * 60 + d.getMinutes();
    }
    const clean = timeStr.trim();
    const isPM = clean.toUpperCase().includes("PM");
    const isAM = clean.toUpperCase().includes("AM");
    const parts = clean.replace(/AM|PM/gi, "").trim().split(":");
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || "0", 10);
    if (isPM && h !== 12) h += 12;
    if (isAM && h === 12) h = 0;
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  } catch {
    return null;
  }
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
  const [credentialsForm, setCredentialsForm] = useState({
    userName: "",
    password: "",
  });
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);

  useEffect(() => {
    fetchEmployeeDetails();
  }, [employeeId]);

  useEffect(() => {
    if (employee?.userId) {
      fetchAttendanceStats();
    }
  }, [employee?.userId]);

  const fetchEmployeeDetails = async () => {
    try {
      const response = await getEmployee(employeeId);
      setEmployee(response.data);
      setCredentialsForm({
        userName: response.data?.userName || "",
        password: "",
      });
    } catch (error) {
      console.error("Error fetching employee details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendanceStats = async () => {
    try {
      const profileResponse = await getProfile();
      const organizationId = profileResponse.data?.organizationId;
      if (!organizationId || !employee?.userId) return;

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth() + 1;
      const currentYear = currentDate.getFullYear();

      const [attendanceResponse, settingsResponse] = await Promise.allSettled([
        getMonthlyAttendance({
          userId: employee.userId,
          month: currentMonth,
          year: currentYear,
          organizationId: organizationId,
        }),
        getAttendanceSettings(organizationId),
      ]);

      const configuredEndMinutes =
        settingsResponse.status === "fulfilled"
          ? parseClockTimeToMinutes(settingsResponse.value?.data?.workEndTime)
          : null;
      const workEndMinutes = configuredEndMinutes ?? 18 * 60;

      if (
        attendanceResponse.status === "fulfilled" &&
        attendanceResponse.value?.data &&
        Array.isArray(attendanceResponse.value.data)
      ) {
        const attendanceData = attendanceResponse.value.data;
        const stats = {
          dayOff: attendanceData.filter((day) => {
            const status = normalizeAttendanceStatus(day.status);
            return day.isSunday || day.isHoliday || status === "holiday" || status === "weekend";
          }).length,
          lateClockIn: attendanceData.filter((day) => normalizeAttendanceStatus(day.status) === "late").length,
          lateClockOut: attendanceData.filter((day) => {
            const status = normalizeAttendanceStatus(day.status);
            const isWorkedStatus =
              status === "present" || status === "late" || status === "half-day";
            if (!isWorkedStatus || !day.outTime) return false;
            const outMinutes = parseClockTimeToMinutes(day.outTime);
            return outMinutes !== null && outMinutes < workEndMinutes;
          }).length,
          noClockOut: attendanceData.filter((day) => {
            const status = normalizeAttendanceStatus(day.status);
            const isWorkedStatus =
              status === "present" || status === "late" || status === "half-day";
            return isWorkedStatus && day.inTime && !day.outTime;
          }).length,
          offTimeQuota: attendanceData.filter((day) => day.isSunday).length,
          absent: attendanceData.filter((day) => normalizeAttendanceStatus(day.status) === "absent").length,
        };
        setAttendanceStats(stats);
      }
    } catch (error) {
      console.error("Error fetching attendance stats:", error);
    }
  };

  const safeFormatDate = (dateString: string | null | undefined, fallback: string = "Not set") => {
    if (!dateString) return fallback;
    try {
      const date = typeof dateString === "string" ? parseISO(dateString) : new Date(dateString);
      return isValid(date) ? format(date, "MMM dd, yyyy") : fallback;
    } catch {
      return fallback;
    }
  };

  const handleUpdateCredentials = async () => {
    if (!employee) return;
    if (!credentialsForm.userName.trim()) {
      toast.error("Username is required");
      return;
    }

    try {
      setIsUpdatingCredentials(true);
      const payload: Record<string, any> = {
        loginUserName: credentialsForm.userName.trim(),
      };
      if (credentialsForm.password.trim()) {
        payload.loginPassword = credentialsForm.password;
      }

      await updateEmployee(employee.id, payload);
      toast.success("Login credentials updated");
      await fetchEmployeeDetails();
      setCredentialsForm((prev) => ({ ...prev, password: "" }));
    } catch (error: any) {
      const msg = error?.response?.data?.message || "Failed to update credentials";
      toast.error(msg);
    } finally {
      setIsUpdatingCredentials(false);
    }
  };

  // Group managers by manager ID and collect their projects and primary status
  const groupedManagers = (() => {
    if (!employee?.managers || employee.managers.length === 0) return [];
    const map = new Map<
      string,
      {
        id: string;
        name: string;
        managerType: "PRIMARY" | "SECONDARY";
        status?: string;
        projects: string[];
      }
    >();

    employee.managers.forEach((m) => {
      const id = m.id || m.name;
      const mName = m.name || `${m.firstName || ""} ${m.lastName || ""}`.trim() || "Manager";
      if (!map.has(id)) {
        map.set(id, {
          id,
          name: mName,
          managerType: m.managerType || "PRIMARY",
          status: m.status,
          projects: [],
        });
      }
      const existing = map.get(id)!;
      if (m.managerType === "PRIMARY") {
        existing.managerType = "PRIMARY";
      }
      if (m.projectName && !existing.projects.includes(m.projectName)) {
        existing.projects.push(m.projectName);
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.managerType === "PRIMARY") return -1;
      if (b.managerType === "PRIMARY") return 1;
      return a.name.localeCompare(b.name);
    });
  })();

  if (loading || !employee) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          </div>
          <div className="md:col-span-2">
            <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
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
            <p className="text-gray-600 dark:text-gray-400">Complete profile, assets, and settlement management</p>
          </div>
        </div>
      </div>

      {/* Employee Profile Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <Card>
            <CardHeader className="text-center">
              <Avatar className="h-24 w-24 mx-auto">
                <AvatarImage src={employee.photoUrl} />
                <AvatarFallback className="text-lg">
                  {`${employee.firstName.charAt(0)}${(employee.lastName || "").charAt(0)}`}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold">
                  {`${employee.firstName} ${employee.lastName || ""}`}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">{employee.designation?.name || "No designation"}</p>
                <Badge variant="outline">{employee.employeeCode}</Badge>
                <Badge
                  className={
                    employee.status === "active"
                      ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                      : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                  }
                >
                  {employee.status?.toUpperCase() || "ACTIVE"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <Mail className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm">{employee.workEmail}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Phone className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm">{employee.contactNumber || "Not provided"}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Building className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm">{employee.department?.name || "Not assigned"}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Calendar className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                  <span className="text-sm">Joined {safeFormatDate(employee.dateOfJoining)}</span>
                </div>

                {/* Managers and Projects summary */}
                {groupedManagers.length > 0 && (
                  <div className="pt-3 border-t space-y-3">
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-primary" />
                      Managers & Projects ({groupedManagers.length})
                    </span>
                    <div className="space-y-2">
                      {groupedManagers.map((mgr) => (
                        <div key={mgr.id} className="flex flex-col bg-muted/40 p-2.5 rounded-lg border text-xs space-y-1.5">
                          <div className="flex items-center justify-between font-semibold">
                            <span className="text-foreground">{mgr.name}</span>
                            <div className="flex items-center gap-1">
                              <Badge
                                variant={mgr.managerType === "PRIMARY" ? "default" : "secondary"}
                                className={`text-[9px] h-4 px-1.5 font-bold uppercase ${
                                  mgr.managerType === "PRIMARY"
                                    ? "bg-blue-600 hover:bg-blue-600 text-white"
                                    : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                                }`}
                              >
                                {mgr.managerType || "PRIMARY"}
                              </Badge>
                              {mgr.status === "inactive" && (
                                <Badge variant="destructive" className="text-[9px] h-4 px-1">
                                  Inactive
                                </Badge>
                              )}
                            </div>
                          </div>
                          {mgr.projects.length > 0 ? (
                            <div className="text-[11px] text-muted-foreground space-y-0.5">
                              <span className="font-medium text-foreground/80">Projects:</span>
                              <ul className="list-disc list-inside pl-1 space-y-0.5">
                                {mgr.projects.map((proj, pIdx) => (
                                  <li key={pIdx} className="truncate">
                                    {proj}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground italic">General Reporting</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{attendanceStats.dayOff}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Day off</div>
                </div>
                <div className="text-center p-4 bg-orange-50 dark:bg-orange-950/30 rounded-lg border">
                  <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{attendanceStats.lateClockIn}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Late clock-in</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-950/30 rounded-lg border">
                  <div className="text-2xl font-bold text-red-600 dark:text-red-400">{attendanceStats.lateClockOut}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Late clock-out</div>
                </div>
                <div className="text-center p-4 bg-purple-50 dark:bg-purple-950/30 rounded-lg border">
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{attendanceStats.noClockOut}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">No clock-out</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-950/30 rounded-lg border">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">{attendanceStats.offTimeQuota}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Off time quota</div>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-800/40 rounded-lg border">
                  <div className="text-2xl font-bold text-gray-600 dark:text-gray-300">{attendanceStats.absent}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">Absent</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Detailed Information Tabs */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.2 }}>
        <Card>
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 md:grid-cols-10 gap-1 h-auto p-1 bg-muted">
                <TabsTrigger value="timeslip" className="flex items-center space-x-1.5 text-xs py-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Time Slip</span>
                </TabsTrigger>
                <TabsTrigger value="projects" className="flex items-center space-x-1.5 text-xs py-2">
                  <Briefcase className="h-3.5 w-3.5" />
                  <span>Projects</span>
                </TabsTrigger>
                <TabsTrigger value="assets" className="flex items-center space-x-1.5 text-xs py-2">
                  <Package className="h-3.5 w-3.5" />
                  <span>Assets</span>
                </TabsTrigger>
                <TabsTrigger value="settlement" className="flex items-center space-x-1.5 text-xs py-2">
                  <FileText className="h-3.5 w-3.5" />
                  <span>Settlement</span>
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex items-center space-x-1.5 text-xs py-2">
                  <FolderOpen className="h-3.5 w-3.5" />
                  <span>Docs</span>
                </TabsTrigger>
                <TabsTrigger value="leave" className="flex items-center space-x-1.5 text-xs py-2">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>Leave</span>
                </TabsTrigger>
                <TabsTrigger value="payroll" className="flex items-center space-x-1.5 text-xs py-2">
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>Payroll</span>
                </TabsTrigger>
                <TabsTrigger value="personal" className="flex items-center space-x-1.5 text-xs py-2">
                  <User className="h-3.5 w-3.5" />
                  <span>Personal</span>
                </TabsTrigger>
                <TabsTrigger value="workflows" className="flex items-center space-x-1.5 text-xs py-2">
                  <Settings className="h-3.5 w-3.5" />
                  <span>Workflows</span>
                </TabsTrigger>
                <TabsTrigger value="credentials" className="flex items-center space-x-1.5 text-xs py-2">
                  <User className="h-3.5 w-3.5" />
                  <span>Credentials</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="timeslip" className="mt-6">
                <TimeslipTab employeeId={employeeId} employee={employee} />
              </TabsContent>

              <TabsContent value="projects" className="mt-6">
                <ProjectsTab employee={employee} />
              </TabsContent>

              <TabsContent value="assets" className="mt-6">
                <AssetsTab employeeId={employeeId} employee={employee} />
              </TabsContent>

              <TabsContent value="settlement" className="mt-6">
                <SettlementTab employeeId={employeeId} employee={employee} />
              </TabsContent>

              <TabsContent value="documents" className="mt-6">
                <DocumentsTab employeeId={employeeId} employee={employee} />
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

              <TabsContent value="workflows" className="mt-6">
                <WorkflowManagement />
              </TabsContent>

              <TabsContent value="credentials" className="mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Login Credentials
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Username</Label>
                        <Input
                          value={credentialsForm.userName}
                          onChange={(e) =>
                            setCredentialsForm((prev) => ({
                              ...prev,
                              userName: e.target.value,
                            }))
                          }
                          placeholder="username"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">New Password</Label>
                        <Input
                          type="password"
                          value={credentialsForm.password}
                          onChange={(e) =>
                            setCredentialsForm((prev) => ({
                              ...prev,
                              password: e.target.value,
                            }))
                          }
                          placeholder="Leave blank to keep current password"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <Button onClick={handleUpdateCredentials} disabled={isUpdatingCredentials}>
                        {isUpdatingCredentials ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          "Update Credentials"
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Tab: Assigned Projects & Managers
// ------------------------------------------------------------------------------------------------
function ProjectsTab({ employee }: { employee: Employee }) {
  const assignments = employee.projectAssignments || [];
  const managers = employee.managers || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Assigned Projects & Managers</h3>
          <p className="text-sm text-muted-foreground">
            Projects worked on by {employee.firstName} and their respective reporting managers (Primary & Secondary)
          </p>
        </div>
      </div>

      {assignments.length === 0 && managers.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground space-y-3">
            <Briefcase className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <p className="font-medium text-base">No project assignments configured</p>
            <p className="text-sm">
              Use the "Projects & Managers" action in the main Employee Directory to assign projects and managers.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="border rounded-lg overflow-hidden bg-card">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b">
                <tr>
                  <th className="p-3 text-left font-semibold">Project</th>
                  <th className="p-3 text-left font-semibold">Type</th>
                  <th className="p-3 text-left font-semibold">Reporting Manager</th>
                  <th className="p-3 text-left font-semibold">Manager Type</th>
                  <th className="p-3 text-left font-semibold">Project Role</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {assignments.map((assignment) => (
                  <tr key={assignment.id} className="hover:bg-muted/30">
                    <td className="p-3 font-medium">
                      <div>{assignment.project?.name || "Project"}</div>
                      {assignment.project?.code && (
                        <span className="text-xs text-muted-foreground font-mono">
                          Code: {assignment.project.code}
                        </span>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge variant="outline" className="text-xs capitalize">
                        {assignment.projectSource === "client" ? "Client Project" : "Internal"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {assignment.manager ? (
                        <div className="flex items-center space-x-1.5 font-medium">
                          <span>
                            {`${assignment.manager.firstName} ${assignment.manager.lastName || ""}`.trim()}
                          </span>
                          {!assignment.manager.isActive && (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">No Manager</span>
                      )}
                    </td>
                    <td className="p-3">
                      {assignment.manager ? (
                        <Badge
                          variant={assignment.managerType === "PRIMARY" ? "default" : "secondary"}
                          className={`text-[10px] font-bold ${
                            assignment.managerType === "PRIMARY"
                              ? "bg-blue-600 text-white hover:bg-blue-600"
                              : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {assignment.managerType || "PRIMARY"}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="p-3 text-muted-foreground capitalize">{assignment.role || "Member"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {managers.length > 0 && assignments.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Direct Reporting Managers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {managers.map((m, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 border rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{m.name || `${m.firstName} ${m.lastName || ""}`.trim()}</span>
                      <Badge
                        variant={m.managerType === "PRIMARY" ? "default" : "secondary"}
                        className={`text-[10px] font-bold ${
                          m.managerType === "PRIMARY" ? "bg-blue-600 text-white" : ""
                        }`}
                      >
                        {m.managerType || "PRIMARY"}
                      </Badge>
                    </div>
                    <span className="text-muted-foreground text-xs">{m.projectName || "General Reporting"}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Tab: Company Assets & Exit Clearance
// ------------------------------------------------------------------------------------------------
function AssetsTab({ employeeId, employee }: { employeeId: string; employee: Employee }) {
  const [assets, setAssets] = useState<EmployeeAsset[]>([]);
  const [clearance, setClearance] = useState<AssetClearance | null>(null);
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isReturnOpen, setIsReturnOpen] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<EmployeeAsset | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [assetForm, setAssetForm] = useState({
    assetType: "Laptop",
    customAssetType: "",
    assetName: "",
    serialNumber: "",
    assetTag: "",
    brand: "",
    model: "",
    condition: "Good",
    issuedDate: format(new Date(), "yyyy-MM-dd"),
    expectedReturnDate: "",
    isReturnRequired: true,
    status: "ASSIGNED",
    notes: "",
  });

  const [returnForm, setReturnForm] = useState({
    actualReturnDate: format(new Date(), "yyyy-MM-dd"),
    returnCondition: "Good",
    remarks: "",
  });

  const standardAssetTypes = [
    "Laptop",
    "Laptop Charger",
    "Monitor",
    "Keyboard",
    "Mouse",
    "Mobile Phone",
    "SIM Card",
    "ID Card",
    "Access Card",
    "Headset",
    "Other",
  ];

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [assetsRes, clearanceRes] = await Promise.all([
        getEmployeeAssets(employeeId),
        getEmployeeClearance(employeeId),
      ]);
      setAssets(Array.isArray(assetsRes.data) ? assetsRes.data : []);
      setClearance(clearanceRes.data);
    } catch (error) {
      console.error("Error loading assets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAsset = async () => {
    if (!assetForm.assetName.trim()) {
      toast.error("Asset name is required");
      return;
    }
    const finalType =
      assetForm.assetType === "Other"
        ? assetForm.customAssetType.trim() || "Other"
        : assetForm.assetType;

    try {
      setIsSaving(true);
      await createEmployeeAsset(employeeId, {
        assetType: finalType,
        assetName: assetForm.assetName.trim(),
        serialNumber: assetForm.serialNumber.trim() || undefined,
        assetTag: assetForm.assetTag.trim() || undefined,
        brand: assetForm.brand.trim() || undefined,
        model: assetForm.model.trim() || undefined,
        condition: assetForm.condition || "Good",
        issuedDate: assetForm.issuedDate || undefined,
        expectedReturnDate: assetForm.expectedReturnDate || undefined,
        isReturnRequired: assetForm.isReturnRequired,
        status: assetForm.status as any,
        notes: assetForm.notes.trim() || undefined,
      });
      toast.success("Asset assigned successfully");
      setIsAddOpen(false);
      resetAssetForm();
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to assign asset");
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateAsset = async () => {
    if (!selectedAsset) return;
    if (!assetForm.assetName.trim()) {
      toast.error("Asset name is required");
      return;
    }
    const finalType =
      assetForm.assetType === "Other"
        ? assetForm.customAssetType.trim() || "Other"
        : assetForm.assetType;

    try {
      setIsSaving(true);
      await updateEmployeeAsset(employeeId, selectedAsset.id, {
        assetType: finalType,
        assetName: assetForm.assetName.trim(),
        serialNumber: assetForm.serialNumber.trim() || undefined,
        assetTag: assetForm.assetTag.trim() || undefined,
        brand: assetForm.brand.trim() || undefined,
        model: assetForm.model.trim() || undefined,
        condition: assetForm.condition,
        issuedDate: assetForm.issuedDate || undefined,
        expectedReturnDate: assetForm.expectedReturnDate || undefined,
        isReturnRequired: assetForm.isReturnRequired,
        status: assetForm.status as any,
        notes: assetForm.notes.trim() || undefined,
      });
      toast.success("Asset updated successfully");
      setIsEditOpen(false);
      setSelectedAsset(null);
      resetAssetForm();
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to update asset");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReturnAsset = async () => {
    if (!selectedAsset) return;
    try {
      setIsSaving(true);
      await returnEmployeeAsset(employeeId, selectedAsset.id, {
        actualReturnDate: returnForm.actualReturnDate,
        returnCondition: returnForm.returnCondition,
        remarks: returnForm.remarks.trim() || undefined,
      });
      toast.success("Asset marked as returned successfully");
      setIsReturnOpen(false);
      setSelectedAsset(null);
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to mark asset as returned");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    if (!confirm("Are you sure you want to delete this asset record?")) return;
    try {
      await deleteEmployeeAsset(employeeId, assetId);
      toast.success("Asset removed");
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete asset");
    }
  };

  const resetAssetForm = () => {
    setAssetForm({
      assetType: "Laptop",
      customAssetType: "",
      assetName: "",
      serialNumber: "",
      assetTag: "",
      brand: "",
      model: "",
      condition: "Good",
      issuedDate: format(new Date(), "yyyy-MM-dd"),
      expectedReturnDate: "",
      isReturnRequired: true,
      status: "ASSIGNED",
      notes: "",
    });
  };

  const openEditDialog = (asset: EmployeeAsset) => {
    setSelectedAsset(asset);
    const isStandard = standardAssetTypes.includes(asset.assetType);
    setAssetForm({
      assetType: isStandard ? asset.assetType : "Other",
      customAssetType: isStandard ? "" : asset.assetType,
      assetName: asset.assetName,
      serialNumber: asset.serialNumber || "",
      assetTag: asset.assetTag || "",
      brand: asset.brand || "",
      model: asset.model || "",
      condition: asset.condition || "Good",
      issuedDate: asset.issuedDate ? asset.issuedDate.split("T")[0] : "",
      expectedReturnDate: asset.expectedReturnDate ? asset.expectedReturnDate.split("T")[0] : "",
      isReturnRequired: asset.isReturnRequired,
      status: asset.status,
      notes: asset.notes || "",
    });
    setIsEditOpen(true);
  };

  const openReturnDialog = (asset: EmployeeAsset) => {
    setSelectedAsset(asset);
    setReturnForm({
      actualReturnDate: format(new Date(), "yyyy-MM-dd"),
      returnCondition: asset.condition || "Good",
      remarks: "",
    });
    setIsReturnOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ASSIGNED":
        return <Badge className="bg-blue-600 text-white hover:bg-blue-600">Assigned</Badge>;
      case "RETURN_PENDING":
        return <Badge className="bg-amber-500 text-white hover:bg-amber-500">Return Pending</Badge>;
      case "RETURNED":
        return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Returned ✓</Badge>;
      case "LOST":
        return <Badge variant="destructive">Lost</Badge>;
      case "DAMAGED":
        return <Badge className="bg-purple-600 text-white hover:bg-purple-600">Damaged</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading asset and clearance records...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Exit Clearance Summary Banner */}
      <Card className="border-2 border-muted">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              {clearance?.clearanceStatus === "CLEARED" ? (
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/50 rounded-full text-emerald-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
              ) : clearance?.clearanceStatus === "PARTIALLY_CLEARED" ? (
                <div className="p-2.5 bg-amber-100 dark:bg-amber-950/50 rounded-full text-amber-600">
                  <AlertTriangle className="h-6 w-6" />
                </div>
              ) : (
                <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-600">
                  <ShieldAlert className="h-6 w-6" />
                </div>
              )}
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  Company Assets & Exit Clearance
                  <Badge
                    className={
                      clearance?.clearanceStatus === "CLEARED"
                        ? "bg-emerald-600 text-white hover:bg-emerald-600"
                        : clearance?.clearanceStatus === "PARTIALLY_CLEARED"
                        ? "bg-amber-500 text-white hover:bg-amber-500"
                        : "bg-slate-500 text-white hover:bg-slate-500"
                    }
                  >
                    {clearance?.clearanceStatus?.replace("_", " ") || "NOT STARTED"}
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  {clearance?.clearanceStatus === "CLEARED"
                    ? "All company assets requiring return have been returned. Exit clearance is complete."
                    : "Track all company equipment assigned to employee. All assets must be returned prior to settlement generation."}
                </CardDescription>
              </div>
            </div>
            <Button
              onClick={() => {
                resetAssetForm();
                setIsAddOpen(true);
              }}
              size="sm"
              className="gap-1.5"
            >
              <Plus className="h-4 w-4" />
              Assign Asset
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-muted/40 rounded-lg border">
              <span className="text-xs text-muted-foreground">Total Assets</span>
              <p className="text-xl font-bold">{clearance?.totalAssets || 0}</p>
            </div>
            <div className="p-3 bg-muted/40 rounded-lg border">
              <span className="text-xs text-muted-foreground">Return Required</span>
              <p className="text-xl font-bold">{clearance?.returnRequiredAssets || 0}</p>
            </div>
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <span className="text-xs text-emerald-700 dark:text-emerald-400">Returned</span>
              <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                {clearance?.returnedAssets || 0}
              </p>
            </div>
            <div
              className={`p-3 rounded-lg border ${
                (clearance?.pendingAssetsCount || 0) > 0
                  ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400"
                  : "bg-muted/40 text-muted-foreground"
              }`}
            >
              <span className="text-xs">Pending Return</span>
              <p className="text-xl font-bold">{clearance?.pendingAssetsCount || 0}</p>
            </div>
          </div>

          {clearance?.pendingAssets && clearance.pendingAssets.length > 0 && (
            <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-md text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Pending Assets Requiring Return: </span>
                <span>
                  {clearance.pendingAssets
                    .map((a) => `${a.assetName} (${a.assetType}${a.serialNumber ? ` - ${a.serialNumber}` : ""})`)
                    .join(", ")}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assets Table */}
      {assets.length === 0 ? (
        <div className="border border-dashed rounded-lg p-10 text-center space-y-3">
          <Package className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="font-medium text-sm">No company assets assigned to this employee</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              resetAssetForm();
              setIsAddOpen(true);
            }}
          >
            + Assign First Asset
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold">Asset Details</th>
                <th className="p-3 text-left font-semibold">Type</th>
                <th className="p-3 text-left font-semibold">Serial / Tag</th>
                <th className="p-3 text-left font-semibold">Brand / Model</th>
                <th className="p-3 text-left font-semibold">Condition</th>
                <th className="p-3 text-left font-semibold">Issue Date</th>
                <th className="p-3 text-left font-semibold">Status</th>
                <th className="p-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {assets.map((asset) => (
                <tr key={asset.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-semibold text-foreground">{asset.assetName}</div>
                    {asset.notes && <div className="text-[11px] text-muted-foreground">{asset.notes}</div>}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px]">
                      {asset.assetType}
                    </Badge>
                  </td>
                  <td className="p-3 font-mono text-[11px]">
                    <div>{asset.serialNumber || "—"}</div>
                    {asset.assetTag && <div className="text-muted-foreground">Tag: {asset.assetTag}</div>}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {asset.brand || asset.model ? `${asset.brand || ""} ${asset.model || ""}`.trim() : "—"}
                  </td>
                  <td className="p-3">{asset.condition || "Good"}</td>
                  <td className="p-3 text-muted-foreground">
                    <div>{asset.issuedDate ? format(new Date(asset.issuedDate), "MMM dd, yyyy") : "—"}</div>
                    {asset.actualReturnDate && (
                      <div className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Ret: {format(new Date(asset.actualReturnDate), "MMM dd, yyyy")}
                      </div>
                    )}
                  </td>
                  <td className="p-3">{getStatusBadge(asset.status)}</td>
                  <td className="p-3 text-right space-x-1">
                    {asset.status !== "RETURNED" && asset.isReturnRequired && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                        onClick={() => openReturnDialog(asset)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Return
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => openEditDialog(asset)}
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                      onClick={() => handleDeleteAsset(asset.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Asset Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Company Asset</DialogTitle>
            <DialogDescription>
              Record equipment issued to {employee.firstName} {employee.lastName || ""}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Asset Type *</Label>
              <Select
                value={assetForm.assetType}
                onValueChange={(val) => setAssetForm({ ...assetForm, assetType: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {standardAssetTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {assetForm.assetType === "Other" && (
              <div className="space-y-1">
                <Label className="text-xs">Custom Asset Type *</Label>
                <Input
                  value={assetForm.customAssetType}
                  onChange={(e) => setAssetForm({ ...assetForm, customAssetType: e.target.value })}
                  placeholder="e.g. Ergonomic Chair, Drawing Tablet"
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Asset Name *</Label>
              <Input
                value={assetForm.assetName}
                onChange={(e) => setAssetForm({ ...assetForm, assetName: e.target.value })}
                placeholder="e.g. MacBook Pro 16 / Dell 27' Monitor"
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Serial Number</Label>
                <Input
                  value={assetForm.serialNumber}
                  onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                  placeholder="SN12345678"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Asset Tag / ID</Label>
                <Input
                  value={assetForm.assetTag}
                  onChange={(e) => setAssetForm({ ...assetForm, assetTag: e.target.value })}
                  placeholder="LAP-0042"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Brand</Label>
                <Input
                  value={assetForm.brand}
                  onChange={(e) => setAssetForm({ ...assetForm, brand: e.target.value })}
                  placeholder="Apple / Dell / Logitech"
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Model</Label>
                <Input
                  value={assetForm.model}
                  onChange={(e) => setAssetForm({ ...assetForm, model: e.target.value })}
                  placeholder="M2 Max / U2723QE"
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Condition</Label>
                <Select
                  value={assetForm.condition}
                  onValueChange={(val) => setAssetForm({ ...assetForm, condition: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">Brand New</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Issue Date</Label>
                <Input
                  type="date"
                  value={assetForm.issuedDate}
                  onChange={(e) => setAssetForm({ ...assetForm, issuedDate: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="isReturnRequired"
                checked={assetForm.isReturnRequired}
                onCheckedChange={(checked) =>
                  setAssetForm({ ...assetForm, isReturnRequired: !!checked })
                }
              />
              <Label htmlFor="isReturnRequired" className="text-xs font-medium cursor-pointer">
                Return Required upon resignation/exit
              </Label>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes / Remarks</Label>
              <Textarea
                value={assetForm.notes}
                onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                placeholder="Accessories included, condition notes..."
                className="text-xs"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleCreateAsset} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
              Assign Asset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Asset Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Asset Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Asset Name *</Label>
              <Input
                value={assetForm.assetName}
                onChange={(e) => setAssetForm({ ...assetForm, assetName: e.target.value })}
                className="h-9 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Status</Label>
                <Select
                  value={assetForm.status}
                  onValueChange={(val) => setAssetForm({ ...assetForm, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ASSIGNED">ASSIGNED</SelectItem>
                    <SelectItem value="RETURN_PENDING">RETURN_PENDING</SelectItem>
                    <SelectItem value="RETURNED">RETURNED</SelectItem>
                    <SelectItem value="LOST">LOST</SelectItem>
                    <SelectItem value="DAMAGED">DAMAGED</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Condition</Label>
                <Select
                  value={assetForm.condition}
                  onValueChange={(val) => setAssetForm({ ...assetForm, condition: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="New">Brand New</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Fair">Fair</SelectItem>
                    <SelectItem value="Poor">Poor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Serial Number</Label>
                <Input
                  value={assetForm.serialNumber}
                  onChange={(e) => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Asset Tag</Label>
                <Input
                  value={assetForm.assetTag}
                  onChange={(e) => setAssetForm({ ...assetForm, assetTag: e.target.value })}
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 pt-1">
              <Checkbox
                id="editIsReturnRequired"
                checked={assetForm.isReturnRequired}
                onCheckedChange={(checked) =>
                  setAssetForm({ ...assetForm, isReturnRequired: !!checked })
                }
              />
              <Label htmlFor="editIsReturnRequired" className="text-xs font-medium cursor-pointer">
                Return Required upon exit
              </Label>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea
                value={assetForm.notes}
                onChange={(e) => setAssetForm({ ...assetForm, notes: e.target.value })}
                className="text-xs"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpdateAsset} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Asset Dialog */}
      <Dialog open={isReturnOpen} onOpenChange={setIsReturnOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark Asset as Returned</DialogTitle>
            <DialogDescription>
              Confirm return of <strong>{selectedAsset?.assetName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Actual Return Date</Label>
              <Input
                type="date"
                value={returnForm.actualReturnDate}
                onChange={(e) => setReturnForm({ ...returnForm, actualReturnDate: e.target.value })}
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Condition on Return</Label>
              <Select
                value={returnForm.returnCondition}
                onValueChange={(val) => setReturnForm({ ...returnForm, returnCondition: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Fair">Fair</SelectItem>
                  <SelectItem value="Damaged">Damaged (Requires Deduction)</SelectItem>
                  <SelectItem value="Poor">Poor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Return Remarks</Label>
              <Textarea
                value={returnForm.remarks}
                onChange={(e) => setReturnForm({ ...returnForm, remarks: e.target.value })}
                placeholder="Condition remarks, accessories returned..."
                className="text-xs"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsReturnOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleReturnAsset} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
              Confirm Return
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Tab: Full & Final Settlement
// ------------------------------------------------------------------------------------------------
function SettlementTab({ employeeId, employee }: { employeeId: string; employee: Employee }) {
  const [settlement, setSettlement] = useState<EmployeeSettlement | null>(null);
  const [clearance, setClearance] = useState<AssetClearance | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const [form, setForm] = useState({
    resignationDate: "",
    lastWorkingDate: "",
    noticePeriodDays: 30,
    salaryDue: 0,
    pendingSalary: 0,
    leaveEncashment: 0,
    bonus: 0,
    performanceIncentive: 0,
    otherPayables: 0,
    noticePeriodRecovery: 0,
    loanRecovery: 0,
    assetDeduction: 0,
    otherDeductions: 0,
    remarks: "",
    status: "DRAFT",
  });

  useEffect(() => {
    fetchData();
  }, [employeeId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settlementRes, clearanceRes] = await Promise.all([
        getEmployeeSettlement(employeeId),
        getEmployeeClearance(employeeId),
      ]);
      setSettlement(settlementRes.data);
      setClearance(clearanceRes.data);
      if (settlementRes.data) {
        const s = settlementRes.data;
        setForm({
          resignationDate: s.resignationDate || "",
          lastWorkingDate: s.lastWorkingDate || "",
          noticePeriodDays: s.noticePeriodDays ?? 30,
          salaryDue: Number(s.salaryDue || 0),
          pendingSalary: Number(s.pendingSalary || 0),
          leaveEncashment: Number(s.leaveEncashment || 0),
          bonus: Number(s.bonus || 0),
          performanceIncentive: Number(s.performanceIncentive || 0),
          otherPayables: Number(s.otherPayables || 0),
          noticePeriodRecovery: Number(s.noticePeriodRecovery || 0),
          loanRecovery: Number(s.loanRecovery || 0),
          assetDeduction: Number(s.assetDeduction || 0),
          otherDeductions: Number(s.otherDeductions || 0),
          remarks: s.remarks || "",
          status: s.status || "DRAFT",
        });
      }
    } catch (error) {
      console.error("Error loading settlement data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettlement = async () => {
    try {
      setIsSaving(true);
      await saveEmployeeSettlement(employeeId, form);
      toast.success("Settlement details saved successfully");
      setIsEditOpen(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to save settlement");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (clearance && clearance.hasPendingAssets) {
      toast.error("Final settlement is locked. All company assets must be returned first.");
      return;
    }

    try {
      setIsDownloading(true);
      const res = await downloadSettlementPdf(employeeId);
      const blob = res.data;
      const url = window.URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `Full_and_Final_Settlement_${employee.employeeCode || employeeId}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Settlement PDF downloaded successfully");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to generate settlement PDF. Ensure all assets are cleared."
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const formatCurrency = (amount: number | string | undefined) => {
    const val = Number(amount || 0);
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val);
  };

  const isLocked = clearance ? clearance.hasPendingAssets : false;

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading Full & Final Settlement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Clearance Gate Banner */}
      {isLocked ? (
        <Card className="border-2 border-amber-400 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-amber-200 dark:bg-amber-900 rounded-full text-amber-800 dark:text-amber-200 mt-0.5">
                <Lock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-amber-900 dark:text-amber-200">
                  Final Settlement Locked — Asset Clearance Pending
                </h4>
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  Final settlement statement generation and download are locked because {clearance?.pendingAssetsCount} company asset(s) are still pending return.
                </p>
                {clearance?.pendingAssets && (
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-200 mt-1">
                    Pending: {clearance.pendingAssets.map((a) => a.assetName).join(", ")}
                  </p>
                )}
              </div>
            </div>
            <Button variant="outline" size="sm" disabled className="gap-1.5 opacity-60">
              <Lock className="h-4 w-4" />
              Download Locked
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-2 border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20">
          <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-200 dark:bg-emerald-900 rounded-full text-emerald-800 dark:text-emerald-200">
                <Unlock className="h-5 w-5" />
              </div>
              <div>
                <h4 className="font-semibold text-emerald-900 dark:text-emerald-200">
                  Exit Clearance Complete — Settlement Available
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300">
                  All required company assets have been marked as returned. You can now generate, edit, and download the official PDF.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="gap-1.5 text-xs"
              >
                <Edit className="h-3.5 w-3.5" />
                Customize Values
              </Button>
              <Button
                size="sm"
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="h-3.5 w-3.5" />
                )}
                Download Settlement PDF
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statement Preview */}
      <Card className="border shadow-md">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg uppercase tracking-wide">
                Full & Final Settlement Statement
              </CardTitle>
              <CardDescription className="text-xs">
                Official employee settlement calculation sheet
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={settlement?.status === "PAID" ? "default" : "outline"}
                className="text-xs uppercase"
              >
                Status: {settlement?.status || "DRAFT"}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditOpen(true)}
                className="text-xs gap-1"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit Details
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Employee Basic Overview Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg text-xs">
            <div>
              <span className="text-muted-foreground">Employee Name</span>
              <p className="font-semibold text-sm">
                {employee.firstName} {employee.lastName || ""}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Employee Code</span>
              <p className="font-semibold text-sm">{employee.employeeCode}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Designation</span>
              <p className="font-semibold text-sm">{employee.designation?.name || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Department</span>
              <p className="font-semibold text-sm">{employee.department?.name || "—"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Date of Joining</span>
              <p className="font-semibold">
                {employee.dateOfJoining ? format(new Date(employee.dateOfJoining), "MMM dd, yyyy") : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Resignation Date</span>
              <p className="font-semibold">
                {settlement?.resignationDate
                  ? format(new Date(settlement.resignationDate), "MMM dd, yyyy")
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Last Working Date</span>
              <p className="font-semibold">
                {settlement?.lastWorkingDate
                  ? format(new Date(settlement.lastWorkingDate), "MMM dd, yyyy")
                  : "—"}
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Notice Period</span>
              <p className="font-semibold">{settlement?.noticePeriodDays || 30} Days</p>
            </div>
          </div>

          {/* Earnings & Deductions Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {/* Earnings Section */}
            <div className="border rounded-lg p-4 space-y-3 bg-card">
              <h4 className="font-bold text-sm text-emerald-700 dark:text-emerald-400 border-b pb-2 flex items-center justify-between">
                <span>1. PAYABLE DUES & EARNINGS</span>
                <span>Amount (₹)</span>
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-dashed">
                  <span className="text-muted-foreground">Salary Due</span>
                  <span className="font-medium">{formatCurrency(settlement?.salaryDue)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed">
                  <span className="text-muted-foreground">Pending / Hold Salary</span>
                  <span className="font-medium">{formatCurrency(settlement?.pendingSalary)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed">
                  <span className="text-muted-foreground">Leave Encashment</span>
                  <span className="font-medium">{formatCurrency(settlement?.leaveEncashment)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed">
                  <span className="text-muted-foreground">Bonus</span>
                  <span className="font-medium">{formatCurrency(settlement?.bonus)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed">
                  <span className="text-muted-foreground">Performance Incentive</span>
                  <span className="font-medium">{formatCurrency(settlement?.performanceIncentive)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed">
                  <span className="text-muted-foreground">Other Payable Amounts</span>
                  <span className="font-medium">{formatCurrency(settlement?.otherPayables)}</span>
                </div>
                <div className="flex justify-between pt-2 font-bold text-sm text-emerald-700 dark:text-emerald-400">
                  <span>TOTAL EARNINGS (A)</span>
                  <span>{formatCurrency(settlement?.totalEarnings)}</span>
                </div>
              </div>
            </div>

            {/* Deductions Section */}
            <div className="border rounded-lg p-4 space-y-3 bg-card">
              <h4 className="font-bold text-sm text-red-700 dark:text-red-400 border-b pb-2 flex items-center justify-between">
                <span>2. RECOVERIES & DEDUCTIONS</span>
                <span>Amount (₹)</span>
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between py-1 border-b border-dashed">
                  <span className="text-muted-foreground">Notice Period Recovery</span>
                  <span className="font-medium">{formatCurrency(settlement?.noticePeriodRecovery)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed">
                  <span className="text-muted-foreground">Loan / Advance Recovery</span>
                  <span className="font-medium">{formatCurrency(settlement?.loanRecovery)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed">
                  <span className="text-muted-foreground">Asset Loss / Damage Deduction</span>
                  <span className="font-medium">{formatCurrency(settlement?.assetDeduction)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-dashed">
                  <span className="text-muted-foreground">Other Deductions</span>
                  <span className="font-medium">{formatCurrency(settlement?.otherDeductions)}</span>
                </div>
                <div className="flex justify-between pt-8 font-bold text-sm text-red-700 dark:text-red-400">
                  <span>TOTAL DEDUCTIONS (B)</span>
                  <span>{formatCurrency(settlement?.totalDeductions)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Final Net Calculation Box */}
          <div className="p-4 bg-primary/5 border-2 border-primary/20 rounded-lg flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                Net Final Settlement Amount (A - B)
              </span>
              <p className="text-2xl font-extrabold text-primary">
                {formatCurrency(settlement?.finalSettlementAmount)}
              </p>
            </div>
            <Button
              onClick={handleDownloadPdf}
              disabled={isLocked || isDownloading}
              className="gap-2 bg-primary text-white text-xs"
            >
              {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Download Official PDF
            </Button>
          </div>

          {/* Physical Signatures & Stamp Placeholders */}
          <div className="pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-4 text-center text-xs text-muted-foreground">
            <div className="border border-dashed p-4 rounded-md">
              <div className="h-12" />
              <p className="font-semibold text-foreground">Employee Signature</p>
              <span className="text-[10px]">Date: ____________</span>
            </div>
            <div className="border border-dashed p-4 rounded-md">
              <div className="h-12" />
              <p className="font-semibold text-foreground">Prepared By</p>
              <span className="text-[10px]">HR Executive</span>
            </div>
            <div className="border border-dashed p-4 rounded-md">
              <div className="h-12" />
              <p className="font-semibold text-foreground">HR Approval</p>
              <span className="text-[10px]">Head of HR</span>
            </div>
            <div className="border border-dashed p-4 rounded-md">
              <div className="h-12" />
              <p className="font-semibold text-foreground">Finance Approval</p>
              <span className="text-[10px]">Finance Department</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Edit Settlement Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Full & Final Settlement Details</DialogTitle>
            <DialogDescription>
              Adjust earnings, dues, leave encashment, and deductions for {employee.firstName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2 text-xs">
            {/* Dates & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Resignation Date</Label>
                <Input
                  type="date"
                  value={form.resignationDate}
                  onChange={(e) => setForm({ ...form, resignationDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Last Working Date</Label>
                <Input
                  type="date"
                  value={form.lastWorkingDate}
                  onChange={(e) => setForm({ ...form, lastWorkingDate: e.target.value })}
                  className="h-8 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Settlement Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(val) => setForm({ ...form, status: val })}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">DRAFT</SelectItem>
                    <SelectItem value="UNDER_REVIEW">UNDER_REVIEW</SelectItem>
                    <SelectItem value="APPROVED">APPROVED</SelectItem>
                    <SelectItem value="PAID">PAID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Earnings */}
            <div className="border rounded-md p-3 space-y-2 bg-muted/20">
              <h5 className="font-bold text-xs text-emerald-700 dark:text-emerald-400">
                Payables / Earnings (₹)
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <div>
                  <Label className="text-[11px]">Salary Due</Label>
                  <Input
                    type="number"
                    value={form.salaryDue}
                    onChange={(e) => setForm({ ...form, salaryDue: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Pending / Hold Salary</Label>
                  <Input
                    type="number"
                    value={form.pendingSalary}
                    onChange={(e) => setForm({ ...form, pendingSalary: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Leave Encashment</Label>
                  <Input
                    type="number"
                    value={form.leaveEncashment}
                    onChange={(e) => setForm({ ...form, leaveEncashment: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Bonus</Label>
                  <Input
                    type="number"
                    value={form.bonus}
                    onChange={(e) => setForm({ ...form, bonus: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Performance Incentive</Label>
                  <Input
                    type="number"
                    value={form.performanceIncentive}
                    onChange={(e) =>
                      setForm({ ...form, performanceIncentive: Number(e.target.value) })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Other Payables</Label>
                  <Input
                    type="number"
                    value={form.otherPayables}
                    onChange={(e) => setForm({ ...form, otherPayables: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Deductions */}
            <div className="border rounded-md p-3 space-y-2 bg-muted/20">
              <h5 className="font-bold text-xs text-red-700 dark:text-red-400">
                Recoveries / Deductions (₹)
              </h5>
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2">
                <div>
                  <Label className="text-[11px]">Notice Period Recovery</Label>
                  <Input
                    type="number"
                    value={form.noticePeriodRecovery}
                    onChange={(e) =>
                      setForm({ ...form, noticePeriodRecovery: Number(e.target.value) })
                    }
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Loan / Advance Recovery</Label>
                  <Input
                    type="number"
                    value={form.loanRecovery}
                    onChange={(e) => setForm({ ...form, loanRecovery: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Asset Loss / Damage</Label>
                  <Input
                    type="number"
                    value={form.assetDeduction}
                    onChange={(e) => setForm({ ...form, assetDeduction: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-[11px]">Other Deductions</Label>
                  <Input
                    type="number"
                    value={form.otherDeductions}
                    onChange={(e) => setForm({ ...form, otherDeductions: Number(e.target.value) })}
                    className="h-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1">
              <Label className="text-xs">Settlement Remarks</Label>
              <Textarea
                value={form.remarks}
                onChange={(e) => setForm({ ...form, remarks: e.target.value })}
                placeholder="Details of calculations, approvals, check numbers..."
                className="text-xs"
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSaveSettlement} disabled={isSaving}>
              {isSaving ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
              Save Settlement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Tab: Real Employee Documents
// ------------------------------------------------------------------------------------------------
function DocumentsTab({ employeeId, employee }: { employeeId: string; employee: Employee }) {
  const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [uploadForm, setUploadForm] = useState({
    documentName: "",
    documentType: "Identity",
    remarks: "",
    file: null as File | null,
  });

  const categories = [
    "All",
    "Identity",
    "Joining",
    "Employment",
    "Salary",
    "Leave",
    "Performance",
    "Resignation",
    "Exit",
    "Settlement",
    "Other",
  ];

  useEffect(() => {
    fetchDocuments();
  }, [employeeId]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await getEmployeeDocuments(employeeId);
      setDocuments(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    if (!uploadForm.documentName.trim()) {
      toast.error("Document title is required");
      return;
    }
    if (!uploadForm.file) {
      toast.error("Please select a file to upload");
      return;
    }

    try {
      setIsUploading(true);
      const fileData = new FormData();
      fileData.append("file", uploadForm.file);

      // Upload using existing /common/upload API
      const uploadRes = await uploadFile(fileData);
      const fileUrl = uploadRes.data?.url || uploadRes.data?.fileUrl || uploadRes.data;

      if (!fileUrl) {
        throw new Error("Failed to receive uploaded file URL");
      }

      await createEmployeeDocument(employeeId, {
        documentName: uploadForm.documentName.trim(),
        documentType: uploadForm.documentType,
        documentUrl: fileUrl,
        fileType: uploadForm.file.type || uploadForm.file.name.split(".").pop(),
        fileSize: uploadForm.file.size,
        remarks: uploadForm.remarks.trim() || undefined,
      });

      toast.success("Document uploaded successfully");
      setIsUploadOpen(false);
      setUploadForm({
        documentName: "",
        documentType: "Identity",
        remarks: "",
        file: null,
      });
      await fetchDocuments();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || "Failed to upload document");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await deleteEmployeeDocument(employeeId, docId);
      toast.success("Document deleted");
      await fetchDocuments();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to delete document");
    }
  };

  const filteredDocs =
    selectedCategory === "All"
      ? documents
      : documents.filter((d) => (d.documentType || "Other").toLowerCase() === selectedCategory.toLowerCase());

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (loading) {
    return <div className="py-12 text-center text-muted-foreground">Loading employee documents...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Category Pills & Upload Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
        <Button onClick={() => setIsUploadOpen(true)} size="sm" className="gap-1.5 text-xs shrink-0">
          <Plus className="h-3.5 w-3.5" />
          Upload Document
        </Button>
      </div>

      {/* Document List */}
      {filteredDocs.length === 0 ? (
        <div className="border border-dashed rounded-lg p-10 text-center space-y-3">
          <FolderOpen className="h-10 w-10 mx-auto text-muted-foreground/40" />
          <p className="font-medium text-sm">
            {selectedCategory === "All"
              ? "No documents uploaded yet for this employee"
              : `No documents in "${selectedCategory}" category`}
          </p>
          <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(true)}>
            + Upload Document
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden bg-card">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 border-b">
              <tr>
                <th className="p-3 text-left font-semibold">Document Title</th>
                <th className="p-3 text-left font-semibold">Category</th>
                <th className="p-3 text-left font-semibold">File Type / Size</th>
                <th className="p-3 text-left font-semibold">Uploaded Date</th>
                <th className="p-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredDocs.map((doc) => (
                <tr key={doc.id} className="hover:bg-muted/30">
                  <td className="p-3">
                    <div className="font-semibold text-foreground flex items-center gap-1.5">
                      <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span>{doc.documentName}</span>
                    </div>
                    {doc.remarks && (
                      <div className="text-[11px] text-muted-foreground pl-5">{doc.remarks}</div>
                    )}
                  </td>
                  <td className="p-3">
                    <Badge variant="outline" className="text-[10px]">
                      {doc.documentType || "Other"}
                    </Badge>
                  </td>
                  <td className="p-3 text-muted-foreground uppercase text-[11px]">
                    {doc.fileType?.split("/").pop() || "file"} • {formatFileSize(doc.fileSize)}
                  </td>
                  <td className="p-3 text-muted-foreground">
                    {doc.createdAt ? format(new Date(doc.createdAt), "MMM dd, yyyy") : "—"}
                  </td>
                  <td className="p-3 text-right space-x-1">
                    <a
                      href={doc.documentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center"
                    >
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                        <Download className="h-3.5 w-3.5 mr-1" />
                        Download
                      </Button>
                    </a>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                      onClick={() => handleDelete(doc.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadOpen} onOpenChange={setIsUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Employee Document</DialogTitle>
            <DialogDescription>
              Upload identity, contract, settlement, or salary document for {employee.firstName}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Document Title *</Label>
              <Input
                value={uploadForm.documentName}
                onChange={(e) => setUploadForm({ ...uploadForm, documentName: e.target.value })}
                placeholder="e.g. Appointment Letter, Degree Certificate, PAN Card"
                className="h-9 text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category *</Label>
              <Select
                value={uploadForm.documentType}
                onValueChange={(val) => setUploadForm({ ...uploadForm, documentType: val })}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories
                    .filter((c) => c !== "All")
                    .map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Select File * (PDF, Images, Docs up to 10MB)</Label>
              <Input
                type="file"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setUploadForm({ ...uploadForm, file: f });
                }}
                className="h-9 text-xs cursor-pointer"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Remarks / Notes</Label>
              <Textarea
                value={uploadForm.remarks}
                onChange={(e) => setUploadForm({ ...uploadForm, remarks: e.target.value })}
                placeholder="Optional notes or reference number..."
                className="text-xs"
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpload} disabled={isUploading}>
              {isUploading ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
              Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Tab: Leave
// ------------------------------------------------------------------------------------------------
function LeaveTab({ employeeId, employee }: { employeeId: string; employee: Employee }) {
  const [leaveData, setLeaveData] = useState<Array<{ type: string; balance: number | string }> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLeaveData();
  }, [employeeId]);

  const fetchLeaveData = async () => {
    try {
      const response = await getLeaveBalance(employeeId);
      setLeaveData(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Leave API error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading leave data...</div>;
  }

  if (!leaveData || leaveData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
        <p>No leave balances assigned for this employee</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Leave Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {leaveData.map((leave: any) => (
          <div key={leave.type} className="p-4 bg-white dark:bg-gray-900 rounded-lg shadow dark:shadow-none border">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-md font-semibold">{leave.type}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{leave.balance} days remaining</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Tab: Payroll
// ------------------------------------------------------------------------------------------------
function PayrollTab({ employeeId, employee }: { employeeId: string; employee: Employee }) {
  const [salaryStructures, setSalaryStructures] = useState<any[]>([]);
  const [payrollRecords, setPayrollRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ssRes, prRes] = await Promise.all([
          getSalaryStructuresByEmployee(employeeId),
          getPayrollRecords({ employeeId, page: 1, limit: 10 }),
        ]);
        setSalaryStructures(ssRes.data || []);
        setPayrollRecords(prRes.data?.data || []);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [employeeId]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  if (loading) {
    return <div className="py-6 text-center text-gray-500">Loading payroll data...</div>;
  }

  const activeStructure = salaryStructures.find((s: any) => s.status === "active");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Salary & Payroll</h3>
        <a href="/admin/salary-structure" className="text-sm text-blue-600 hover:underline">
          Manage Salary Structure →
        </a>
      </div>

      {activeStructure ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Active Salary Structure</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Basic Pay</span>
                <p className="font-semibold">{formatCurrency(activeStructure.basic)}</p>
              </div>
              <div>
                <span className="text-gray-500">HRA</span>
                <p className="font-semibold">{formatCurrency(activeStructure.hra)}</p>
              </div>
              <div>
                <span className="text-gray-500">Conveyance</span>
                <p className="font-semibold">{formatCurrency(activeStructure.conveyance)}</p>
              </div>
              <div>
                <span className="text-gray-500">Special Allowance</span>
                <p className="font-semibold">{formatCurrency(activeStructure.otherAllowances)}</p>
              </div>
              <div>
                <span className="text-gray-500">PF</span>
                <p className="font-semibold">{formatCurrency(activeStructure.pf)}</p>
              </div>
              <div>
                <span className="text-gray-500">TDS</span>
                <p className="font-semibold">{formatCurrency(activeStructure.tds)}</p>
              </div>
              <div>
                <span className="text-gray-500">Gross Salary</span>
                <p className="font-semibold text-green-600">{formatCurrency(activeStructure.grossSalary)}</p>
              </div>
              <div>
                <span className="text-gray-500">Net Salary</span>
                <p className="font-semibold text-green-600">{formatCurrency(activeStructure.netSalary)}</p>
              </div>
            </div>
            {activeStructure.effectiveFrom && (
              <p className="text-xs text-gray-400 mt-3">
                Effective from {new Date(activeStructure.effectiveFrom).toLocaleDateString("en-IN")}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            <CreditCard className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>No salary structure configured for this employee.</p>
            <a href="/admin/salary-structure" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
              Configure Salary Structure →
            </a>
          </CardContent>
        </Card>
      )}

      {payrollRecords.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Payroll Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {payrollRecords.slice(0, 5).map((record: any) => (
                <div key={record.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div>
                    <span className="text-sm font-medium">{record.payPeriod}</span>
                    <span
                      className={`ml-2 text-xs px-2 py-0.5 rounded-full ${
                        record.status === "paid"
                          ? "bg-green-100 text-green-700"
                          : record.status === "processed"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-600"
                      }`}
                    >
                      {record.status}
                    </span>
                  </div>
                  <span className="font-semibold">{formatCurrency(record.netPay)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ------------------------------------------------------------------------------------------------
// Tab: Personal Details
// ------------------------------------------------------------------------------------------------
function PersonalDetailsTab({ employee }: { employee: Employee }) {
  const safeFormatDate = (dateString: string | null | undefined, fallback: string = "Not set") => {
    if (!dateString) return fallback;
    try {
      const date = typeof dateString === "string" ? parseISO(dateString) : new Date(dateString);
      return isValid(date) ? format(date, "MMM dd, yyyy") : fallback;
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
            <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Full Name</Label>
            <p className="text-base">
              {`${employee.firstName} ${employee.middleName || ""} ${employee.lastName || ""}`.trim()}
            </p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Date of Birth</Label>
            <p className="text-base">{safeFormatDate(employee.dateOfBirth)}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Gender</Label>
            <p className="text-base">{employee.gender || "Not specified"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Blood Group</Label>
            <p className="text-base">{employee.bloodGroup || "Not specified"}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Work Email</Label>
            <p className="text-base">{employee.workEmail}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Personal Email</Label>
            <p className="text-base">{employee.personalEmail || "Not provided"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact Number</Label>
            <p className="text-base">{employee.contactNumber || "Not provided"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Employment Type</Label>
            <p className="text-base">{employee.employmentType || "Not specified"}</p>
          </div>
        </div>
      </div>

      <div className="border-t pt-6">
        <h4 className="text-md font-semibold mb-4">Emergency Contact</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Contact Name</Label>
            <p className="text-base">{employee.emergencyContactName || "Not provided"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Relationship</Label>
            <p className="text-base">{employee.emergencyContactRelationship || "Not specified"}</p>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-500 dark:text-gray-400">Phone Number</Label>
            <p className="text-base">{employee.emergencyContactPhone || "Not provided"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
