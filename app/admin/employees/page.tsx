"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Eye,
  UserPlus,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Building,
  Mail,
  Phone,
  Calendar,
  UserCheck,
  UserX,
  Clock,
  Shield,
  Settings,
  FileText,
  CheckSquare,
  X,
  RotateCcw,
  Send,
  Archive,
  UserMinus,
  Briefcase,
  Award,
  MapPin,
  Activity,
  Star,
  AlertCircle,
  Copy,
  Zap,
  User,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  getEmployees, 
  createEmployee, 
  updateEmployee, 
  getProfile,
  getDepartments,
  getDesignations 
} from "@/app/api/api";
import { exportEmployeesToExcel, ExportFields } from "@/utils/exportToExcel";
import { toast } from "sonner";
import { format, isValid, parseISO, differenceInDays } from 'date-fns';

interface Employee {
  id: string;
  organizationId: string;
  userId: string;
  departmentId?: string;
  designationId?: string;
  reportingTo?: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  dateOfJoining: string;
  contactNumber?: string;
  personalEmail?: string;
  workEmail: string;
  photoUrl?: string;
  employmentType?: string;
  status: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  department?: { id: string; name: string };
  designation?: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string };
  user?: { id: string; lastLogin?: string; isActive: boolean };
  createdAt: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
  organizationId: string;
}

interface Designation {
  id: string;
  name: string;
  code: string;
  organizationId: string;
}

interface EmployeeFormData {
  organizationId: string;
  departmentId?: string;
  designationId?: string;
  reportingTo?: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  dateOfJoining: string;
  dateOfExit?: string;
  workEmail: string;
  personalEmail?: string;
  contactNumber?: string;
  photoUrl?: string;
  employmentType?: string;
  status?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [managers, setManagers] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [designationFilter, setDesignationFilter] = useState("all");
  const [joinDateFilter, setJoinDateFilter] = useState("all");
  const [sortBy, setSortBy] = useState("firstName");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("all");

  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Form validation state
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Export state
  const [exportFormat, setExportFormat] = useState("excel");
  const [exportFields, setExportFields] = useState<ExportFields>({
    basic: true,
    contact: true,
    employment: true,
    emergency: false,
  });

  const initialFormData: EmployeeFormData = {
    organizationId: "",
    employeeCode: "",
    firstName: "",
    middleName: "",
    lastName: "",
    gender: "",
    dateOfBirth: "",
    dateOfJoining: "",
    workEmail: "",
    personalEmail: "",
    contactNumber: "",
    photoUrl: "",
    employmentType: "",
    status: "active",
    bloodGroup: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
  };

  const [newEmployee, setNewEmployee] = useState<EmployeeFormData>(initialFormData);
  const [editEmployee, setEditEmployee] = useState<EmployeeFormData>(initialFormData);
  const [bulkAssignData, setBulkAssignData] = useState({
    departmentId: "",
    designationId: "",
    managerId: "",
    employmentType: "",
  });

  // Helper function for API delays
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    fetchProfile();
  }, []);

  useEffect(() => {
    if (userProfile?.organizationId) {
      fetchDepartments();
      fetchDesignations();
      fetchEmployees();
    }
  }, [userProfile]);

  const fetchProfile = async () => {
    try {
      const response = await getProfile();
      setUserProfile(response.data);
    } catch (error: any) {
      console.error("Failed to fetch profile:", error);
      toast.error("Failed to fetch user profile");
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await getDepartments(userProfile.organizationId);
      setDepartments(response.data || []);
    } catch (error: any) {
      console.error("Failed to fetch departments:", error);
      toast.error("Failed to fetch departments");
    }
  };

  const fetchDesignations = async () => {
    try {
      const response = await getDesignations(userProfile.organizationId);
      setDesignations(response.data || []);
    } catch (error: any) {
      console.error("Failed to fetch designations:", error);
      toast.error("Failed to fetch designations");
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const response = await getEmployees(userProfile.organizationId);
      setEmployees(response.data || []);

      // Set managers (employees who can manage others)
      const potentialManagers = (response.data || []).filter((emp: Employee) =>
        emp.designation?.name?.toLowerCase().includes('manager') ||
        emp.designation?.name?.toLowerCase().includes('lead') ||
        emp.designation?.name?.toLowerCase().includes('senior')
      );
      setManagers(potentialManagers);

      toast.success("Employees loaded successfully");
    } catch (error: any) {
      console.error("Failed to fetch employees:", error);
      toast.error("Failed to fetch employees");
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (data: EmployeeFormData): boolean => {
    const errors: Record<string, string> = {};
    const allowedGenders = ['MALE', 'FEMALE', 'OTHER'];

    if (!data.firstName?.trim()) errors.firstName = "First name is required";
    if (!data.lastName?.trim()) errors.lastName = "Last name is required";
    if (!data.workEmail?.trim()) {
      errors.workEmail = "Work email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.workEmail)) {
      errors.workEmail = "Invalid email format";
    }
    if (!data.employeeCode?.trim()) errors.employeeCode = "Employee code is required";
    if (!data.dateOfJoining) errors.dateOfJoining = "Joining date is required";

    if (data.gender && !allowedGenders.includes(data.gender.toUpperCase())) {
      errors.gender = "Gender must be MALE, FEMALE, or OTHER";
    }

    // Check for duplicate employee code
    const isDuplicate = employees.some(emp =>
      emp.employeeCode.toLowerCase() === data.employeeCode?.toLowerCase() &&
      emp.id !== selectedEmployee?.id
    );
    if (isDuplicate) {
      errors.employeeCode = "Employee code already exists";
    }

    // Check for duplicate email
    const isDuplicateEmail = employees.some(emp =>
      emp.workEmail.toLowerCase() === data.workEmail?.toLowerCase() &&
      emp.id !== selectedEmployee?.id
    );
    if (isDuplicateEmail) {
      errors.workEmail = "Email already exists";
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const prepareEmployeeData = (data: EmployeeFormData) => {
    const cleanData: any = {
      organizationId: data.organizationId,
      employeeCode: data.employeeCode?.trim(),
      firstName: data.firstName?.trim(),
      middleName: data.middleName?.trim() || undefined,
      lastName: data.lastName?.trim() || undefined,
      workEmail: data.workEmail?.trim().toLowerCase(),
      dateOfJoining: new Date(data.dateOfJoining).toISOString(),
    };

    // Optional fields
    if (data.departmentId) cleanData.departmentId = data.departmentId;
    if (data.designationId) cleanData.designationId = data.designationId;
    if (data.reportingTo) cleanData.reportingTo = data.reportingTo;
    if (data.gender) cleanData.gender = data.gender.toUpperCase();
    if (data.dateOfBirth) cleanData.dateOfBirth = new Date(data.dateOfBirth).toISOString();
    if (data.personalEmail?.trim()) cleanData.personalEmail = data.personalEmail.trim().toLowerCase();
    if (data.contactNumber?.trim()) cleanData.contactNumber = data.contactNumber.trim();
    if (data.photoUrl?.trim()) cleanData.photoUrl = data.photoUrl.trim();
    if (data.employmentType?.trim()) cleanData.employmentType = data.employmentType.trim();
    if (data.status) cleanData.status = data.status;
    if (data.bloodGroup?.trim()) cleanData.bloodGroup = data.bloodGroup.trim();
    if (data.emergencyContactName?.trim()) cleanData.emergencyContactName = data.emergencyContactName.trim();
    if (data.emergencyContactRelationship?.trim()) cleanData.emergencyContactRelationship = data.emergencyContactRelationship.trim();
    if (data.emergencyContactPhone?.trim()) cleanData.emergencyContactPhone = data.emergencyContactPhone.trim();

    return cleanData;
  };

  const handleCreateEmployee = async () => {
    const organizationId = userProfile?.organizationId;
    if (!organizationId) {
      toast.error("Organization not found");
      return;
    }

    const formData = { ...newEmployee, organizationId };

    if (!validateForm(formData)) {
      toast.error("Please fix the form errors");
      return;
    }

    try {
      const cleanData = prepareEmployeeData(formData);
      console.log("Creating employee:", cleanData);

      await createEmployee(cleanData);
      setIsCreateDialogOpen(false);
      setNewEmployee(initialFormData);
      setFormErrors({});
      fetchEmployees();
      toast.success("Employee created successfully");
    } catch (error: any) {
      console.error("Failed to create employee:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create employee";
      toast.error(errorMessage);
    }
  };

  // Fixed assign employee handler
  const handleAssignEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setBulkAssignData({
      departmentId: employee.departmentId || "",
      designationId: employee.designationId || "",
      managerId: employee.reportingTo || "",
      employmentType: employee.employmentType || "",
    });
    setSelectedEmployees([employee.id]);
    setIsBulkAssignOpen(true);
  };

  const handleUpdateEmployee = async () => {
    if (!selectedEmployee) return;

    const formData = { ...editEmployee, organizationId: editEmployee.organizationId };

    if (!validateForm(formData)) {
      toast.error("Please fix the form errors");
      return;
    }

    try {
      const cleanData = prepareEmployeeData(formData);
      console.log("Updating employee:", cleanData);

      await updateEmployee(selectedEmployee.id, cleanData);
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      setEditEmployee(initialFormData);
      setFormErrors({});
      fetchEmployees();
      toast.success("Employee updated successfully");
    } catch (error: any) {
      console.error("Failed to update employee:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update employee";
      toast.error(errorMessage);
    }
  };

  // Fixed bulk assignment with proper error handling
  const handleBulkAssign = async () => {
    if (selectedEmployees.length === 0) {
      toast.error("Please select employees first");
      return;
    }

    try {
      console.log("Starting bulk assignment for:", selectedEmployees.length, "employees");
      console.log("Update data:", bulkAssignData);

      const updateData: any = {};
      
      // Handle "no-change" values properly
      if (bulkAssignData.departmentId && bulkAssignData.departmentId !== "" && bulkAssignData.departmentId !== "no-change") {
        updateData.departmentId = bulkAssignData.departmentId;
      }
      if (bulkAssignData.designationId && bulkAssignData.designationId !== "" && bulkAssignData.designationId !== "no-change") {
        updateData.designationId = bulkAssignData.designationId;
      }
      if (bulkAssignData.managerId && bulkAssignData.managerId !== "" && bulkAssignData.managerId !== "no-change") {
        updateData.reportingTo = bulkAssignData.managerId;
      }
      if (bulkAssignData.employmentType && bulkAssignData.employmentType !== "" && bulkAssignData.employmentType !== "no-change") {
        updateData.employmentType = bulkAssignData.employmentType;
      }

      if (Object.keys(updateData).length === 0) {
        toast.error("Please select at least one field to update");
        return;
      }

      console.log("Prepared update data:", updateData);

      // Update employees sequentially with delay
      const results = [];
      const errors = [];

      for (const empId of selectedEmployees) {
        try {
          console.log(`Updating employee ${empId}...`);
          await delay(200); // Small delay to prevent rate limiting
          const result = await updateEmployee(empId, updateData);
          results.push({ empId, success: true, result });
          console.log(`Successfully updated employee ${empId}`);
        } catch (error: any) {
          console.error(`Failed to update employee ${empId}:`, error);
          let errorMessage = "Unknown error";
          if (typeof error === "object" && error !== null) {
            errorMessage = error.response?.data?.message || error.message || errorMessage;
          } else if (typeof error === "string") {
            errorMessage = error;
          }
          errors.push({ empId, error: errorMessage });
        }
      }

      // Handle results
      if (errors.length === 0) {
        toast.success(`Successfully updated ${selectedEmployees.length} employees`);
      } else if (results.length > 0) {
        toast.warning(`Updated ${results.length} employees. ${errors.length} failed.`);
        console.error("Failed updates:", errors);
      } else {
        toast.error("Failed to update all employees");
        console.error("All updates failed:", errors);
      }

      // Clean up
      setIsBulkAssignOpen(false);
      setBulkAssignData({ departmentId: "", designationId: "", managerId: "", employmentType: "" });
      setSelectedEmployees([]);
      fetchEmployees();

    } catch (error: any) {
      console.error("Bulk assignment failed:", error);
      const errorMsg = error.response?.data?.message || error.message || "Unknown error";
      toast.error(`Bulk assignment failed: ${errorMsg}`);
    }
  };

  // Fixed status update with proper error handling
  const handleStatusUpdate = async (status: string) => {
    if (selectedEmployees.length === 0) {
      toast.error("Please select employees first");
      return;
    }

    try {
      console.log(`Updating ${selectedEmployees.length} employees to status: ${status}`);

      const results = [];
      const errors = [];

      for (const empId of selectedEmployees) {
        try {
          console.log(`Updating employee ${empId} status to ${status}...`);
          await delay(200); // Small delay
          await updateEmployee(empId, { status });
          results.push(empId);
          console.log(`Successfully updated employee ${empId} status`);
        } catch (error: any) {
          console.error(`Failed to update employee ${empId} status:`, error);
          let errorMessage = "Unknown error";
          if (typeof error === "object" && error !== null) {
            errorMessage = error.response?.data?.message || error.message || errorMessage;
          } else if (typeof error === "string") {
            errorMessage = error;
          }
          errors.push({ empId, error: errorMessage });
        }
      }

      // Handle results
      if (errors.length === 0) {
        toast.success(`Successfully updated ${selectedEmployees.length} employees to ${status}`);
      } else if (results.length > 0) {
        toast.warning(`Updated ${results.length} employees. ${errors.length} failed.`);
        console.error("Failed status updates:", errors);
      } else {
        toast.error("Failed to update employee statuses");
        console.error("All status updates failed:", errors);
      }

      setSelectedEmployees([]);
      fetchEmployees();

    } catch (error: any) {
      console.error("Status update failed:", error);
      const errorMsg = error.response?.data?.message || error.message || "Unknown error";
      toast.error(`Status update failed: ${errorMsg}`);
    }
  };

  // Fixed individual status update
  const handleIndividualStatusUpdate = async (employee: Employee, newStatus: string) => {
    try {
      await updateEmployee(employee.id, { status: newStatus });
      toast.success(`Employee ${employee.firstName} ${employee.lastName} ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      fetchEmployees();
    } catch (error: any) {
      console.error("Failed to update employee status:", error);
      toast.error("Failed to update employee status");
    }
  };

  // Enhanced Export Handler
  const handleExport = () => {
    try {
      if (filteredAndSortedEmployees.length === 0) {
        toast.error("No employees to export");
        return;
      }

      exportEmployeesToExcel(filteredAndSortedEmployees, exportFields, exportFormat);
      toast.success(`${exportFormat.toUpperCase()} file exported successfully!`);
      setIsExportDialogOpen(false);
    } catch (error: any) {
      console.error("Export failed:", error);
      toast.error("Failed to export file");
    }
  };

  const handleViewEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setIsViewDialogOpen(true);
  };

  // Fixed edit employee handler with proper date formatting
  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);

    const formatDateForInput = (dateStr: string | undefined) => {
      if (!dateStr) return "";
      try {
        const date = new Date(dateStr);
        return date.toISOString().split('T')[0];
      } catch {
        return "";
      }
    };

    setEditEmployee({
      organizationId: employee.organizationId,
      departmentId: employee.departmentId || "",
      designationId: employee.designationId || "",
      reportingTo: employee.reportingTo || "",
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      middleName: employee.middleName || "",
      lastName: employee.lastName || "",
      gender: employee.gender || "",
      dateOfBirth: formatDateForInput(employee.dateOfBirth),
      dateOfJoining: formatDateForInput(employee.dateOfJoining),
      workEmail: employee.workEmail,
      personalEmail: employee.personalEmail || "",
      contactNumber: employee.contactNumber || "",
      photoUrl: employee.photoUrl || "",
      employmentType: employee.employmentType || "",
      status: employee.status || "active",
      bloodGroup: employee.bloodGroup || "",
      emergencyContactName: employee.emergencyContactName || "",
      emergencyContactRelationship: employee.emergencyContactRelationship || "",
      emergencyContactPhone: employee.emergencyContactPhone || "",
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployees(prev =>
      prev.includes(employeeId)
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const handleSelectAllEmployees = () => {
    if (selectedEmployees.length === filteredAndSortedEmployees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(filteredAndSortedEmployees.map(emp => emp.id));
    }
  };

  // Enhanced filtering and sorting
  const filteredAndSortedEmployees = employees
    .filter((employee) => {
      const matchesSearch = `${employee.firstName} ${employee.lastName || ''} ${employee.workEmail} ${employee.employeeCode}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === "all" || employee.status === statusFilter;
      const matchesDepartment = departmentFilter === "all" || employee.department?.name === departmentFilter;
      const matchesDesignation = designationFilter === "all" || employee.designation?.name === designationFilter;

      let matchesJoinDate = true;
      if (joinDateFilter !== "all") {
        const joinDate = new Date(employee.dateOfJoining);
        const today = new Date();
        const daysAgo = differenceInDays(today, joinDate);

        switch (joinDateFilter) {
          case "new": matchesJoinDate = daysAgo <= 30; break;
          case "recent": matchesJoinDate = daysAgo <= 90; break;
          case "old": matchesJoinDate = daysAgo > 365; break;
          default: matchesJoinDate = true;
        }
      }

      let matchesTab = true;
      if (activeTab !== "all") {
        switch (activeTab) {
          case "active": matchesTab = employee.status === "active"; break;
          case "inactive": matchesTab = employee.status === "inactive"; break;
          case "new": matchesTab = differenceInDays(new Date(), new Date(employee.dateOfJoining)) <= 30; break;
          case "unassigned": matchesTab = !employee.departmentId || !employee.designationId; break;
          default: matchesTab = true;
        }
      }

      return matchesSearch && matchesStatus && matchesDepartment && matchesDesignation && matchesJoinDate && matchesTab;
    })
    .sort((a, b) => {
      let aValue = "";
      let bValue = "";

      switch (sortBy) {
        case "firstName":
          aValue = a.firstName;
          bValue = b.firstName;
          break;
        case "lastName":
          aValue = a.lastName || "";
          bValue = b.lastName || "";
          break;
        case "employeeCode":
          aValue = a.employeeCode;
          bValue = b.employeeCode;
          break;
        case "department":
          aValue = a.department?.name || "";
          bValue = b.department?.name || "";
          break;
        case "joiningDate":
          return sortOrder === "asc"
            ? new Date(a.dateOfJoining).getTime() - new Date(b.dateOfJoining).getTime()
            : new Date(b.dateOfJoining).getTime() - new Date(a.dateOfJoining).getTime();
        case "createdAt":
          return sortOrder === "asc"
            ? new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            : new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        default:
          aValue = a.firstName;
          bValue = b.firstName;
      }

      if (sortOrder === "asc") {
        return aValue.localeCompare(bValue);
      } else {
        return bValue.localeCompare(aValue);
      }
    });

  // Pagination Logic
  const totalPages = Math.ceil(filteredAndSortedEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedEmployees = filteredAndSortedEmployees.slice(startIndex, startIndex + itemsPerPage);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortOrder("asc");
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

  const safeFormatDate = (dateString: string | null | undefined, fallback: string = "Not set") => {
    if (!dateString) return fallback;
    try {
      const date = typeof dateString === 'string' ? parseISO(dateString) : new Date(dateString);
      return isValid(date) ? format(date, 'MMM dd, yyyy') : fallback;
    } catch {
      return fallback;
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      inactive: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
      terminated: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
  };

  const uniqueDepartments = [...new Set(employees.map(e => e.department?.name).filter(Boolean))];
  const uniqueDesignations = [...new Set(employees.map(e => e.designation?.name).filter(Boolean))];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-lg font-medium">Loading Employees...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
        
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Employee Management</h1>
            <p className="text-muted-foreground mt-1">
              Advanced workforce management with role-based controls
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(true)}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
            {selectedEmployees.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={() => setIsBulkAssignOpen(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Bulk Assign ({selectedEmployees.length})
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Zap className="w-4 h-4 mr-2" />
                      Quick Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleStatusUpdate("active")}>
                      <UserCheck className="mr-2 h-4 w-4" />
                      Activate Selected
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleStatusUpdate("inactive")}>
                      <UserX className="mr-2 h-4 w-4" />
                      Deactivate Selected
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setSelectedEmployees([])}>
                      <X className="mr-2 h-4 w-4" />
                      Clear Selection
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-blue-600 hover:bg-blue-700">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Employee
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Employee</DialogTitle>
                  <DialogDescription>
                    Add a new employee with complete details and assignments.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-6 py-4">
                  {/* Personal Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <User className="w-5 h-5 mr-2" />
                      Personal Information
                    </h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            value={newEmployee.firstName}
                            onChange={(e) => setNewEmployee({ ...newEmployee, firstName: e.target.value })}
                            placeholder="John"
                            className={formErrors.firstName ? "border-red-500" : ""}
                          />
                          {formErrors.firstName && (
                            <p className="text-sm text-red-500">{formErrors.firstName}</p>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            value={newEmployee.lastName}
                            onChange={(e) => setNewEmployee({ ...newEmployee, lastName: e.target.value })}
                            placeholder="Doe"
                            className={formErrors.lastName ? "border-red-500" : ""}
                          />
                          {formErrors.lastName && (
                            <p className="text-sm text-red-500">{formErrors.lastName}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="middleName">Middle Name</Label>
                        <Input
                          id="middleName"
                          value={newEmployee.middleName}
                          onChange={(e) => setNewEmployee({ ...newEmployee, middleName: e.target.value })}
                          placeholder="Middle name (optional)"
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="dateOfBirth">Date of Birth</Label>
                          <Input
                            id="dateOfBirth"
                            type="date"
                            value={newEmployee.dateOfBirth}
                            onChange={(e) => setNewEmployee({ ...newEmployee, dateOfBirth: e.target.value })}
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="gender">Gender</Label>
                          <Select
                            value={newEmployee.gender}
                            onValueChange={(value) => setNewEmployee({ ...newEmployee, gender: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="MALE">Male</SelectItem>
                              <SelectItem value="FEMALE">Female</SelectItem>
                              <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="bloodGroup">Blood Group</Label>
                          <Select
                            value={newEmployee.bloodGroup}
                            onValueChange={(value) => setNewEmployee({ ...newEmployee, bloodGroup: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select blood group" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="A+">A+</SelectItem>
                              <SelectItem value="A-">A-</SelectItem>
                              <SelectItem value="B+">B+</SelectItem>
                              <SelectItem value="B-">B-</SelectItem>
                              <SelectItem value="AB+">AB+</SelectItem>
                              <SelectItem value="AB-">AB-</SelectItem>
                              <SelectItem value="O+">O+</SelectItem>
                              <SelectItem value="O-">O-</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Contact Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <Phone className="w-5 h-5 mr-2" />
                      Contact Information
                    </h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="workEmail">Work Email *</Label>
                          <Input
                            id="workEmail"
                            type="email"
                            value={newEmployee.workEmail}
                            onChange={(e) => setNewEmployee({ ...newEmployee, workEmail: e.target.value })}
                            placeholder="john.doe@company.com"
                            className={formErrors.workEmail ? "border-red-500" : ""}
                          />
                          {formErrors.workEmail && (
                            <p className="text-sm text-red-500">{formErrors.workEmail}</p>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="personalEmail">Personal Email</Label>
                          <Input
                            id="personalEmail"
                            type="email"
                            value={newEmployee.personalEmail}
                            onChange={(e) => setNewEmployee({ ...newEmployee, personalEmail: e.target.value })}
                            placeholder="john@gmail.com"
                          />
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="contactNumber">Contact Number</Label>
                        <Input
                          id="contactNumber"
                          value={newEmployee.contactNumber}
                          onChange={(e) => setNewEmployee({ ...newEmployee, contactNumber: e.target.value })}
                          placeholder="+91 9876543210"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Emergency Contact */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <AlertCircle className="w-5 h-5 mr-2" />
                      Emergency Contact
                    </h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="emergencyContactName">Contact Name</Label>
                          <Input
                            id="emergencyContactName"
                            value={newEmployee.emergencyContactName}
                            onChange={(e) => setNewEmployee({ ...newEmployee, emergencyContactName: e.target.value })}
                            placeholder="Emergency contact name"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="emergencyContactRelationship">Relationship</Label>
                          <Select
                            value={newEmployee.emergencyContactRelationship}
                            onValueChange={(value) => setNewEmployee({ ...newEmployee, emergencyContactRelationship: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select relationship" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Father">Father</SelectItem>
                              <SelectItem value="Mother">Mother</SelectItem>
                              <SelectItem value="Spouse">Spouse</SelectItem>
                              <SelectItem value="Sibling">Sibling</SelectItem>
                              <SelectItem value="Friend">Friend</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="emergencyContactPhone">Emergency Contact Phone</Label>
                        <Input
                          id="emergencyContactPhone"
                          value={newEmployee.emergencyContactPhone}
                          onChange={(e) => setNewEmployee({ ...newEmployee, emergencyContactPhone: e.target.value })}
                          placeholder="+91 9876543210"
                        />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {/* Employment Information */}
                  <div>
                    <h3 className="text-lg font-semibold mb-3 flex items-center">
                      <Briefcase className="w-5 h-5 mr-2" />
                      Employment Information
                    </h3>
                    <div className="grid gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="employeeCode">Employee Code *</Label>
                          <Input
                            id="employeeCode"
                            value={newEmployee.employeeCode}
                            onChange={(e) => setNewEmployee({ ...newEmployee, employeeCode: e.target.value })}
                            placeholder="EMP001"
                            className={formErrors.employeeCode ? "border-red-500" : ""}
                          />
                          {formErrors.employeeCode && (
                            <p className="text-sm text-red-500">{formErrors.employeeCode}</p>
                          )}
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="dateOfJoining">Joining Date *</Label>
                          <Input
                            id="dateOfJoining"
                            type="date"
                            value={newEmployee.dateOfJoining}
                            onChange={(e) => setNewEmployee({ ...newEmployee, dateOfJoining: e.target.value })}
                            className={formErrors.dateOfJoining ? "border-red-500" : ""}
                          />
                          {formErrors.dateOfJoining && (
                            <p className="text-sm text-red-500">{formErrors.dateOfJoining}</p>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="departmentId">Department</Label>
                          <Select
                            value={newEmployee.departmentId}
                            onValueChange={(value) => setNewEmployee({ ...newEmployee, departmentId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select department" />
                            </SelectTrigger>
                            <SelectContent>
                              {departments.map((dept) => (
                                <SelectItem key={dept.id} value={dept.id}>
                                  {dept.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="designationId">Designation</Label>
                          <Select
                            value={newEmployee.designationId}
                            onValueChange={(value) => setNewEmployee({ ...newEmployee, designationId: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select designation" />
                            </SelectTrigger>
                            <SelectContent>
                              {designations.map((desig) => (
                                <SelectItem key={desig.id} value={desig.id}>
                                  {desig.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="reportingTo">Reporting Manager</Label>
                          <Select
                            value={newEmployee.reportingTo}
                            onValueChange={(value) => setNewEmployee({ ...newEmployee, reportingTo: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select manager" />
                            </SelectTrigger>
                            <SelectContent>
                              {managers.map((mgr) => (
                                <SelectItem key={mgr.id} value={mgr.id}>
                                  {`${mgr.firstName} ${mgr.lastName || ''}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="employmentType">Employment Type</Label>
                          <Select
                            value={newEmployee.employmentType}
                            onValueChange={(value) => setNewEmployee({ ...newEmployee, employmentType: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select employment type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="FULL_TIME">Full Time</SelectItem>
                              <SelectItem value="PART_TIME">Part Time</SelectItem>
                              <SelectItem value="CONTRACT">Contract</SelectItem>
                              <SelectItem value="INTERN">Intern</SelectItem>
                              <SelectItem value="CONSULTANT">Consultant</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="status">Status</Label>
                          <Select
                            value={newEmployee.status}
                            onValueChange={(value) => setNewEmployee({ ...newEmployee, status: value })}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="active">Active</SelectItem>
                              <SelectItem value="inactive">Inactive</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsCreateDialogOpen(false);
                    setNewEmployee(initialFormData);
                    setFormErrors({});
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateEmployee}>
                    Create Employee
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Enhanced Stats Cards */}
        <motion.div variants={containerVariants} className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{employees.length}</div>
                <p className="text-xs text-muted-foreground">
                  {filteredAndSortedEmployees.length} matching filters
                </p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active</CardTitle>
                <UserCheck className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {employees.filter(e => e.status === 'active').length}
                </div>
                <p className="text-xs text-muted-foreground">Currently employed</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Joiners</CardTitle>
                <Star className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {employees.filter(e => differenceInDays(new Date(), new Date(e.dateOfJoining)) <= 30).length}
                </div>
                <p className="text-xs text-muted-foreground">Last 30 days</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Departments</CardTitle>
                <Building className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{uniqueDepartments.length}</div>
                <p className="text-xs text-muted-foreground">Active departments</p>
              </CardContent>
            </Card>
          </motion.div>
          <motion.div variants={itemVariants}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {employees.filter(e => !e.departmentId || !e.designationId).length}
                </div>
                <p className="text-xs text-muted-foreground">Need assignment</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        {/* Enhanced Employee Management Interface */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Employee Directory</CardTitle>
                  <CardDescription>
                    Advanced employee management with bulk operations
                  </CardDescription>
                </div>
              </div>

              {/* Tab Navigation */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5">
                  <TabsTrigger value="all">All ({employees.length})</TabsTrigger>
                  <TabsTrigger value="active">Active ({employees.filter(e => e.status === 'active').length})</TabsTrigger>
                  <TabsTrigger value="inactive">Inactive ({employees.filter(e => e.status === 'inactive').length})</TabsTrigger>
                  <TabsTrigger value="new">New ({employees.filter(e => differenceInDays(new Date(), new Date(e.dateOfJoining)) <= 30).length})</TabsTrigger>
                  <TabsTrigger value="unassigned">Unassigned ({employees.filter(e => !e.departmentId || !e.designationId).length})</TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Advanced Filters */}
              <div className="flex flex-wrap items-center gap-4 mt-4">
                <div className="relative flex-1 min-w-64">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {uniqueDepartments.filter((dept): dept is string => typeof dept === "string").map((dept) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={designationFilter} onValueChange={setDesignationFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Designations</SelectItem>
                    {uniqueDesignations.filter((desig): desig is string => typeof desig === "string").map((desig) => (
                      <SelectItem key={desig} value={desig}>{desig}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={joinDateFilter} onValueChange={setJoinDateFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Join Date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="new">Last 30 days</SelectItem>
                    <SelectItem value="recent">Last 90 days</SelectItem>
                    <SelectItem value="old">1+ years ago</SelectItem>
                  </SelectContent>
                </Select>
                {(searchTerm || departmentFilter !== "all" || designationFilter !== "all" || joinDateFilter !== "all") && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearchTerm("");
                      setDepartmentFilter("all");
                      setDesignationFilter("all");
                      setJoinDateFilter("all");
                    }}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Clear
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedEmployees.length === filteredAndSortedEmployees.length && filteredAndSortedEmployees.length > 0}
                          onCheckedChange={handleSelectAllEmployees}
                        />
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("firstName")}
                          className="flex items-center space-x-1 p-0 h-auto font-medium"
                        >
                          <span>Employee</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("employeeCode")}
                          className="flex items-center space-x-1 p-0 h-auto font-medium"
                        >
                          <span>Code</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("department")}
                          className="flex items-center space-x-1 p-0 h-auto font-medium"
                        >
                          <span>Department</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead>Manager</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>
                        <Button
                          variant="ghost"
                          onClick={() => handleSort("joiningDate")}
                          className="flex items-center space-x-1 p-0 h-auto font-medium"
                        >
                          <span>Joined</span>
                          <ArrowUpDown className="h-3 w-3" />
                        </Button>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedEmployees.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="h-24 text-center">
                          <div className="flex flex-col items-center space-y-2">
                            <Users className="h-8 w-8 text-muted-foreground" />
                            <p className="text-muted-foreground">No employees found</p>
                            <p className="text-sm text-muted-foreground">
                              Try adjusting your filters or search terms
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedEmployees.map((employee) => {
                        const isNew = differenceInDays(new Date(), new Date(employee.dateOfJoining)) <= 30;
                        const isUnassigned = !employee.departmentId || !employee.designationId;

                        return (
                          <TableRow
                            key={employee.id}
                            className={selectedEmployees.includes(employee.id) ? "bg-muted/50" : ""}
                          >
                            <TableCell>
                              <Checkbox
                                checked={selectedEmployees.includes(employee.id)}
                                onCheckedChange={() => handleSelectEmployee(employee.id)}
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback>
                                    {`${employee.firstName.charAt(0)}${(employee.lastName || '').charAt(0)}`}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium flex items-center space-x-2">
                                    <span>{`${employee.firstName} ${employee.lastName || ''}`}</span>
                                    {isNew && <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800">New</Badge>}
                                    {isUnassigned && <Badge variant="outline" className="text-xs text-orange-600 border-orange-300">Unassigned</Badge>}
                                  </div>
                                  <div className="text-sm text-muted-foreground flex items-center">
                                    <Mail className="h-3 w-3 mr-1" />
                                    {employee.workEmail}
                                  </div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-mono text-xs">
                                {employee.employeeCode}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Building className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {employee.department?.name || "Not assigned"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1">
                                <Award className="h-3 w-3 text-muted-foreground" />
                                <span className="text-sm">
                                  {employee.designation?.name || "Not assigned"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {employee.manager ? (
                                <div className="flex items-center space-x-1">
                                  <UserCheck className="h-3 w-3 text-muted-foreground" />
                                  <span className="text-sm">
                                    {`${employee.manager.firstName} ${employee.manager.lastName}`}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">No manager</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusBadge(employee.status)}>
                                {employee.status || "Active"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                {safeFormatDate(employee.dateOfJoining)}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleViewEmployee(employee)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleEditEmployee(employee)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit Employee
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleAssignEmployee(employee)}>
                                    <Settings className="mr-2 h-4 w-4" />
                                    Assign Roles
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      navigator.clipboard.writeText(employee.workEmail);
                                      toast.success("Email copied to clipboard");
                                    }}
                                  >
                                    <Copy className="mr-2 h-4 w-4" />
                                    Copy Email
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleIndividualStatusUpdate(employee, employee.status === 'active' ? 'inactive' : 'active')}
                                    className={employee.status === 'active' ? 'text-orange-600' : 'text-green-600'}
                                  >
                                    {employee.status === 'active' ? (
                                      <>
                                        <UserX className="mr-2 h-4 w-4" />
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <UserCheck className="mr-2 h-4 w-4" />
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Enhanced Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between space-x-2 py-4">
                  <div className="text-sm text-muted-foreground">
                    Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredAndSortedEmployees.length)} of {filteredAndSortedEmployees.length} entries
                    {selectedEmployees.length > 0 && (
                      <span className="ml-2 font-medium">
                        ({selectedEmployees.length} selected)
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const pageNum = Math.max(1, currentPage - 2) + i;
                        if (pageNum > totalPages) return null;
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(pageNum)}
                            className="w-8 h-8 p-0"
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        {/* FIXED: Bulk Assignment Dialog */}
        <Dialog open={isBulkAssignOpen} onOpenChange={setIsBulkAssignOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {selectedEmployees.length === 1 ? "Assign Employee" : "Bulk Assignment"}
              </DialogTitle>
              <DialogDescription>
                {selectedEmployees.length === 1
                  ? `Update assignments for ${selectedEmployee?.firstName} ${selectedEmployee?.lastName || ''}`
                  : `Update assignments for ${selectedEmployees.length} selected employees`
                }
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Department</Label>
                <Select
                  value={bulkAssignData.departmentId || undefined}
                  onValueChange={(value) => setBulkAssignData({ ...bulkAssignData, departmentId: value || "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-change">No change</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept.id} value={dept.id}>
                        {dept.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Designation</Label>
                <Select
                  value={bulkAssignData.designationId || undefined}
                  onValueChange={(value) => setBulkAssignData({ ...bulkAssignData, designationId: value || "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select designation" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-change">No change</SelectItem>
                    {designations.map((desig) => (
                      <SelectItem key={desig.id} value={desig.id}>
                        {desig.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Manager</Label>
                <Select
                  value={bulkAssignData.managerId || undefined}
                  onValueChange={(value) => setBulkAssignData({ ...bulkAssignData, managerId: value || "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select manager" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-change">No change</SelectItem>
                    {managers.map((mgr) => (
                      <SelectItem key={mgr.id} value={mgr.id}>
                        {`${mgr.firstName} ${mgr.lastName || ''}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Employment Type</Label>
                <Select
                  value={bulkAssignData.employmentType || undefined}
                  onValueChange={(value) => setBulkAssignData({ ...bulkAssignData, employmentType: value || "" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-change">No change</SelectItem>
                    <SelectItem value="FULL_TIME">Full Time</SelectItem>
                    <SelectItem value="PART_TIME">Part Time</SelectItem>
                    <SelectItem value="CONTRACT">Contract</SelectItem>
                    <SelectItem value="INTERN">Intern</SelectItem>
                    <SelectItem value="CONSULTANT">Consultant</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBulkAssignOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkAssign}>
                Update {selectedEmployees.length} Employee{selectedEmployees.length > 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enhanced Export Dialog */}
        <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Employees</DialogTitle>
              <DialogDescription>
                Choose the data and format for your export
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Export Format</Label>
                <Select value={exportFormat} onValueChange={setExportFormat}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="excel">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Data to Export</Label>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="basic" 
                      checked={exportFields.basic}
                      onCheckedChange={(checked) => 
                        setExportFields({...exportFields, basic: !!checked})}
                    />
                    <Label htmlFor="basic" className="cursor-pointer">
                      Basic Information (Name, ID, Code, Gender, DOB, Joining Date)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="contact" 
                      checked={exportFields.contact}
                      onCheckedChange={(checked) => 
                        setExportFields({...exportFields, contact: !!checked})}
                    />
                    <Label htmlFor="contact" className="cursor-pointer">
                      Contact Details (Work Email, Personal Email, Phone)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="employment" 
                      checked={exportFields.employment}
                      onCheckedChange={(checked) => 
                        setExportFields({...exportFields, employment: !!checked})}
                    />
                    <Label htmlFor="employment" className="cursor-pointer">
                      Employment Info (Department, Designation, Manager, Status)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="emergency" 
                      checked={exportFields.emergency}
                      onCheckedChange={(checked) => 
                        setExportFields({...exportFields, emergency: !!checked})}
                    />
                    <Label htmlFor="emergency" className="cursor-pointer">
                      Emergency Contacts (Name, Relationship, Phone)
                    </Label>
                  </div>
                </div>
              </div>
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {filteredAndSortedEmployees.length} employees will be exported based on current filters.
                </AlertDescription>
              </Alert>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsExportDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export {exportFormat.toUpperCase()}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Enhanced Edit Employee Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Employee</DialogTitle>
              <DialogDescription>
                Update employee information and assignments.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              {/* Personal Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <User className="w-5 h-5 mr-2" />
                  Personal Information
                </h3>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="editFirstName">First Name *</Label>
                      <Input
                        id="editFirstName"
                        value={editEmployee.firstName}
                        onChange={(e) => setEditEmployee({ ...editEmployee, firstName: e.target.value })}
                        className={formErrors.firstName ? "border-red-500" : ""}
                      />
                      {formErrors.firstName && (
                        <p className="text-sm text-red-500">{formErrors.firstName}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editLastName">Last Name *</Label>
                      <Input
                        id="editLastName"
                        value={editEmployee.lastName}
                        onChange={(e) => setEditEmployee({ ...editEmployee, lastName: e.target.value })}
                        className={formErrors.lastName ? "border-red-500" : ""}
                      />
                      {formErrors.lastName && (
                        <p className="text-sm text-red-500">{formErrors.lastName}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editMiddleName">Middle Name</Label>
                    <Input
                      id="editMiddleName"
                      value={editEmployee.middleName}
                      onChange={(e) => setEditEmployee({ ...editEmployee, middleName: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="editDateOfBirth">Date of Birth</Label>
                      <Input
                        id="editDateOfBirth"
                        type="date"
                        value={editEmployee.dateOfBirth}
                        onChange={(e) => setEditEmployee({ ...editEmployee, dateOfBirth: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editGender">Gender</Label>
                      <Select
                        value={editEmployee.gender}
                        onValueChange={(value) => setEditEmployee({ ...editEmployee, gender: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editBloodGroup">Blood Group</Label>
                      <Select
                        value={editEmployee.bloodGroup}
                        onValueChange={(value) => setEditEmployee({ ...editEmployee, bloodGroup: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select blood group" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A-">A-</SelectItem>
                          <SelectItem value="B+">B+</SelectItem>
                          <SelectItem value="B-">B-</SelectItem>
                          <SelectItem value="AB+">AB+</SelectItem>
                          <SelectItem value="AB-">AB-</SelectItem>
                          <SelectItem value="O+">O+</SelectItem>
                          <SelectItem value="O-">O-</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Contact Information */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Phone className="w-5 h-5 mr-2" />
                  Contact Information
                </h3>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="editWorkEmail">Work Email *</Label>
                      <Input
                        id="editWorkEmail"
                        type="email"
                        value={editEmployee.workEmail}
                        onChange={(e) => setEditEmployee({ ...editEmployee, workEmail: e.target.value })}
                        className={formErrors.workEmail ? "border-red-500" : ""}
                      />
                      {formErrors.workEmail && (
                        <p className="text-sm text-red-500">{formErrors.workEmail}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editPersonalEmail">Personal Email</Label>
                      <Input
                        id="editPersonalEmail"
                        type="email"
                        value={editEmployee.personalEmail}
                        onChange={(e) => setEditEmployee({ ...editEmployee, personalEmail: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editContactNumber">Contact Number</Label>
                    <Input
                      id="editContactNumber"
                      value={editEmployee.contactNumber}
                      onChange={(e) => setEditEmployee({ ...editEmployee, contactNumber: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Emergency Contact */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Emergency Contact
                </h3>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="editEmergencyContactName">Contact Name</Label>
                      <Input
                        id="editEmergencyContactName"
                        value={editEmployee.emergencyContactName}
                        onChange={(e) => setEditEmployee({ ...editEmployee, emergencyContactName: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editEmergencyContactRelationship">Relationship</Label>
                      <Select
                        value={editEmployee.emergencyContactRelationship}
                        onValueChange={(value) => setEditEmployee({ ...editEmployee, emergencyContactRelationship: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select relationship" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Father">Father</SelectItem>
                          <SelectItem value="Mother">Mother</SelectItem>
                          <SelectItem value="Spouse">Spouse</SelectItem>
                          <SelectItem value="Sibling">Sibling</SelectItem>
                          <SelectItem value="Friend">Friend</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="editEmergencyContactPhone">Emergency Contact Phone</Label>
                    <Input
                      id="editEmergencyContactPhone"
                      value={editEmployee.emergencyContactPhone}
                      onChange={(e) => setEditEmployee({ ...editEmployee, emergencyContactPhone: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* ENHANCED: Employment Information with Department/Designation */}
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Briefcase className="w-5 h-5 mr-2" />
                  Employment Information
                </h3>
                <div className="grid gap-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="editEmployeeCode">Employee Code *</Label>
                      <Input
                        id="editEmployeeCode"
                        value={editEmployee.employeeCode}
                        onChange={(e) => setEditEmployee({ ...editEmployee, employeeCode: e.target.value })}
                        className={formErrors.employeeCode ? "border-red-500" : ""}
                      />
                      {formErrors.employeeCode && (
                        <p className="text-sm text-red-500">{formErrors.employeeCode}</p>
                      )}
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editDateOfJoining">Joining Date *</Label>
                      <Input
                        id="editDateOfJoining"
                        type="date"
                        value={editEmployee.dateOfJoining}
                        onChange={(e) => setEditEmployee({ ...editEmployee, dateOfJoining: e.target.value })}
                        className={formErrors.dateOfJoining ? "border-red-500" : ""}
                      />
                      {formErrors.dateOfJoining && (
                        <p className="text-sm text-red-500">{formErrors.dateOfJoining}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="editDepartmentId">Department</Label>
                      <Select
                        value={editEmployee.departmentId}
                        onValueChange={(value) => setEditEmployee({ ...editEmployee, departmentId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>
                              {dept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editDesignationId">Designation</Label>
                      <Select
                        value={editEmployee.designationId}
                        onValueChange={(value) => setEditEmployee({ ...editEmployee, designationId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select designation" />
                        </SelectTrigger>
                        <SelectContent>
                          {designations.map((desig) => (
                            <SelectItem key={desig.id} value={desig.id}>
                              {desig.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editReportingTo">Reporting Manager</Label>
                      <Select
                        value={editEmployee.reportingTo}
                        onValueChange={(value) => setEditEmployee({ ...editEmployee, reportingTo: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select manager" />
                        </SelectTrigger>
                        <SelectContent>
                          {managers.map((mgr) => (
                            <SelectItem key={mgr.id} value={mgr.id}>
                              {`${mgr.firstName} ${mgr.lastName || ''}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="editEmploymentType">Employment Type</Label>
                      <Select
                        value={editEmployee.employmentType}
                        onValueChange={(value) => setEditEmployee({ ...editEmployee, employmentType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select employment type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FULL_TIME">Full Time</SelectItem>
                          <SelectItem value="PART_TIME">Part Time</SelectItem>
                          <SelectItem value="CONTRACT">Contract</SelectItem>
                          <SelectItem value="INTERN">Intern</SelectItem>
                          <SelectItem value="CONSULTANT">Consultant</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="editStatus">Status</Label>
                      <Select
                        value={editEmployee.status}
                        onValueChange={(value) => setEditEmployee({ ...editEmployee, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                          <SelectItem value="terminated">Terminated</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsEditDialogOpen(false);
                setEditEmployee(initialFormData);
                setFormErrors({});
                setSelectedEmployee(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleUpdateEmployee}>
                Update Employee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Employee Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Employee Profile</DialogTitle>
              <DialogDescription>
                Complete employee information and history
              </DialogDescription>
            </DialogHeader>
            {selectedEmployee && (
              <div className="grid gap-6 py-4">
                {/* Enhanced header with avatar and quick actions */}
                <div className="flex items-start space-x-4 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 rounded-lg">
                  <Avatar className="h-20 w-20">
                    <AvatarFallback className="text-xl font-semibold">
                      {`${selectedEmployee.firstName.charAt(0)}${(selectedEmployee.lastName || '').charAt(0)}`}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold">
                      {`${selectedEmployee.firstName} ${selectedEmployee.lastName || ''}`}
                    </h3>
                    <p className="text-muted-foreground">{selectedEmployee.designation?.name || 'No designation'}</p>
                    <p className="text-sm text-muted-foreground">{selectedEmployee.workEmail}</p>
                    <div className="flex items-center space-x-2 mt-2">
                      <Badge className="font-mono text-xs">{selectedEmployee.employeeCode}</Badge>
                      <Badge className={getStatusBadge(selectedEmployee.status)}>
                        {selectedEmployee.status || "Active"}
                      </Badge>
                      {differenceInDays(new Date(), new Date(selectedEmployee.dateOfJoining)) <= 30 && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">New Joiner</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Detailed information tabs */}
                <Tabs defaultValue="personal" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="personal">Personal</TabsTrigger>
                    <TabsTrigger value="employment">Employment</TabsTrigger>
                    <TabsTrigger value="contact">Contact</TabsTrigger>
                    <TabsTrigger value="emergency">Emergency</TabsTrigger>
                  </TabsList>

                  <TabsContent value="personal" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Full Name</Label>
                        <p className="text-sm text-muted-foreground">
                          {`${selectedEmployee.firstName} ${selectedEmployee.middleName || ''} ${selectedEmployee.lastName || ''}`.trim()}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Date of Birth</Label>
                        <p className="text-sm text-muted-foreground">
                          {safeFormatDate(selectedEmployee.dateOfBirth)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Gender</Label>
                        <p className="text-sm text-muted-foreground capitalize">
                          {selectedEmployee.gender?.toLowerCase() || 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Blood Group</Label>
                        <p className="text-sm text-muted-foreground">
                          {selectedEmployee.bloodGroup || 'Not specified'}
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="employment" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Employee Code</Label>
                        <p className="text-sm text-muted-foreground">{selectedEmployee.employeeCode}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Joining Date</Label>
                        <p className="text-sm text-muted-foreground">
                          {safeFormatDate(selectedEmployee.dateOfJoining)}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Department</Label>
                        <p className="text-sm text-muted-foreground">
                          {selectedEmployee.department?.name || "Not assigned"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Designation</Label>
                        <p className="text-sm text-muted-foreground">
                          {selectedEmployee.designation?.name || "Not assigned"}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Employment Type</Label>
                        <p className="text-sm text-muted-foreground">
                          {selectedEmployee.employmentType || 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Reporting Manager</Label>
                        <p className="text-sm text-muted-foreground">
                          {selectedEmployee.manager ?
                            `${selectedEmployee.manager.firstName} ${selectedEmployee.manager.lastName}` :
                            "No manager assigned"
                          }
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="contact" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-sm font-medium">Work Email</Label>
                        <p className="text-sm text-muted-foreground">{selectedEmployee.workEmail}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Personal Email</Label>
                        <p className="text-sm text-muted-foreground">{selectedEmployee.personalEmail || 'Not provided'}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Contact Number</Label>
                        <p className="text-sm text-muted-foreground">{selectedEmployee.contactNumber || 'Not provided'}</p>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="emergency" className="space-y-4">
                    {(selectedEmployee.emergencyContactName || selectedEmployee.emergencyContactPhone) ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm font-medium">Contact Name</Label>
                          <p className="text-sm text-muted-foreground">{selectedEmployee.emergencyContactName || 'Not provided'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Relationship</Label>
                          <p className="text-sm text-muted-foreground">{selectedEmployee.emergencyContactRelationship || 'Not specified'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Phone Number</Label>
                          <p className="text-sm text-muted-foreground">{selectedEmployee.emergencyContactPhone || 'Not provided'}</p>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-400">No emergency contact information</p>
                        <p className="text-sm text-muted-foreground">Add emergency contact details for safety</p>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
                Close
              </Button>
              <Button onClick={() => {
                if (selectedEmployee) {
                  setIsViewDialogOpen(false);
                  handleEditEmployee(selectedEmployee);
                }
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit Employee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
