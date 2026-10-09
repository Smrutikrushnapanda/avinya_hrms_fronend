"use client";

import { getFullName } from "@/lib/utils";
import { useState, useEffect, useCallback } from "react";
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
  RefreshCw,
  Sparkles,
  Copy,
  FileSignature,
  ScrollText,
  Check,
  ExternalLink,
  Printer,
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
  EmployeeDocumentTemplate,
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
  getDocumentTemplates,
  getDocumentTemplateByType,
  saveDocumentTemplate,
  resetDocumentTemplate,
  previewEmployeeLetter,
  downloadEmployeeLetterPdf,
  uploadFile,
  getEmployeeAssignedProjects,
} from "@/app/api/api";
import TimeslipTab from "./TimeslipTab";
import WorkflowManagement from "./WorkflowManagement";
import VisualDocumentEditor from "./VisualDocumentEditor";
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
  const [isProjectsHistoryOpen, setIsProjectsHistoryOpen] = useState(false);
  const [projectsHistory, setProjectsHistory] = useState<any[]>([]);
  const [projectsHistoryLoading, setProjectsHistoryLoading] = useState(false);

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

  const openProjectsHistory = useCallback(async () => {
    if (!employee) return;
    try {
      setProjectsHistoryLoading(true);
      const data = await getEmployeeAssignedProjects(employee.id);
      setProjectsHistory(Array.isArray(data) ? data : []);
      setIsProjectsHistoryOpen(true);
    } catch (err) {
      console.error("Failed to load project history", err);
    } finally {
      setProjectsHistoryLoading(false);
    }
  }, [employee]);

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
                  {getFullName(employee)}
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openProjectsHistory}
                  disabled={projectsHistoryLoading}
                  className="mt-3 w-full flex items-center justify-center gap-1.5"
                >
                  <Eye className="h-4 w-4" />
                  View Project History
                </Button>
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
      <Dialog open={isProjectsHistoryOpen} onOpenChange={setIsProjectsHistoryOpen}>
        <DialogContent className="max-w-xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Project History</DialogTitle>
            <DialogDescription>
              Membership history for {employee ? getFullName(employee) : "Employee"} (internal & client projects)
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {projectsHistoryLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
              </div>
            ) : projectsHistory.length === 0 ? (
              <p className="text-sm text-muted-foreground">No project history found.</p>
            ) : (
              <div className="space-y-2">
                {projectsHistory.map((ph: any) => (
                  <div key={ph.id} className="rounded-lg border border-border bg-muted/30 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium">{ph.name || ph.projectName || "--"}</p>
                        <p className="text-xs text-muted-foreground">
                          Source: {ph.source === "client" ? "Client Project" : "Internal Project"} • Role: {ph.role || "member"}
                          {ph.designation ? ` • Designation: ${ph.designation}` : ""}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground whitespace-nowrap">
                        {ph.assignedAt ? safeFormatDate(ph.assignedAt) : "--"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProjectsHistoryOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </motion.div>
      </div>
      </div>
    );
  }
