"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Download, Upload, Settings, Zap, UserCheck, UserX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  getEmployeeManagementData,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  getProfile,
  createUserActivity,
} from "@/app/api/api";
import { exportEmployeesToExcel, ExportFields } from "@/utils/exportToExcel";
import { format } from 'date-fns';
import EmployeeStats from "./components/EmployeeStats";
import EmployeeTable from "./components/EmployeeTable";
import EmployeeDialogs from "./components/EmployeeDialogs";
import { Employee, EmployeeFormData } from "./components/types";

// LiveClock Component
function LiveClock() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-sm font-medium">
      {format(currentTime, 'MMM dd, yyyy HH:mm:ss')}
    </div>
  );
}

export default function EmployeesPage() {
  // NEW: Single state for all employee management data from API
  const [employeeData, setEmployeeData] = useState<any>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isTableLoading, setIsTableLoading] = useState(false);
  
  // Filter states (same as before)
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

  // Dialog states (same as before)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [isBulkAssignOpen, setIsBulkAssignOpen] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Form validation state (same as before)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Export state (same as before)
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

  // OPTIMIZED: Single effect to fetch profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await getProfile();
        setUserProfile(response.data);
      } catch (error: any) {
        console.error("Failed to fetch profile:", error);
        toast.error("Failed to fetch user profile");
      }
    };
    fetchProfile();
  }, []);

  // OPTIMIZED: Fetch function with loading states
  const fetchEmployeeManagementData = useCallback(async (isFilterChange = false) => {
    if (!userProfile?.organizationId) return;

    if (isFilterChange) {
      setIsTableLoading(true);
    } else {
      setIsInitialLoading(true);
    }

    try {
      const params = {
        page: currentPage,
        limit: itemsPerPage,
        search: searchTerm || undefined,
        status: statusFilter !== "all" ? statusFilter : undefined,
        department: departmentFilter !== "all" ? departmentFilter : undefined,
        designation: designationFilter !== "all" ? designationFilter : undefined,
        joinDateFilter: joinDateFilter !== "all" ? joinDateFilter : undefined,
        sortBy,
        sortOrder,
      };

      const response = await getEmployeeManagementData(params);
      
      if (response.data?.success) {
        setEmployeeData(response.data.data);
      } else {
        throw new Error("API returned unsuccessful response");
      }
    } catch (error: any) {
      console.error("Failed to fetch employee management data:", error);
      if (!isFilterChange) {
        toast.error("Failed to fetch employee data");
      }
      setEmployeeData(null);
    } finally {
      setIsInitialLoading(false);
      setIsTableLoading(false);
    }
  }, [userProfile?.organizationId, currentPage, searchTerm, statusFilter, departmentFilter, designationFilter, joinDateFilter, sortBy, sortOrder, itemsPerPage]);

  // Initial load
  useEffect(() => {
    if (userProfile?.organizationId) {
      fetchEmployeeManagementData(false);
    }
  }, [userProfile?.organizationId]);

  // Filter changes with debouncing
  useEffect(() => {
    if (userProfile?.organizationId && !isInitialLoading) {
      const timeoutId = setTimeout(() => {
        fetchEmployeeManagementData(true);
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [searchTerm, statusFilter, departmentFilter, designationFilter, joinDateFilter, sortBy, sortOrder]);

  // Page change
  useEffect(() => {
    if (userProfile?.organizationId && !isInitialLoading) {
      fetchEmployeeManagementData(true);
    }
  }, [currentPage]);

  // Debounce search to avoid excessive API calls
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchTerm]);

  const logActivity = async (action: string, details?: string) => {
    try {
      if (userProfile?.userId) {
        await createUserActivity({
          userId: userProfile.userId,
          action,
          details,
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error("Failed to log activity:", error);
    }
  };

  // Form validation (same as before)
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

    // Check for duplicate employee code within current data
    const employees = employeeData?.employees || [];
    const isDuplicate = employees.some((emp: Employee) =>
      emp.employeeCode.toLowerCase() === data.employeeCode?.toLowerCase() &&
      emp.id !== selectedEmployee?.id
    );
    if (isDuplicate) {
      errors.employeeCode = "Employee code already exists";
    }

    // Check for duplicate email within current data
    const isDuplicateEmail = employees.some((emp: Employee) =>
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

  // OPTIMIZED: Refresh data after operations
  const refreshData = async () => {
    await fetchEmployeeManagementData(true);
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
      await createEmployee(cleanData);
      
      await logActivity("CREATE_EMPLOYEE", `Created employee: ${cleanData.firstName} ${cleanData.lastName || ''}`);
      
      setIsCreateDialogOpen(false);
      setNewEmployee(initialFormData);
      setFormErrors({});
      await refreshData();
      toast.success("Employee created successfully");
    } catch (error: any) {
      console.error("Failed to create employee:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to create employee";
      toast.error(errorMessage);
    }
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
      await updateEmployee(selectedEmployee.id, cleanData);
      
      await logActivity("UPDATE_EMPLOYEE", `Updated employee: ${cleanData.firstName} ${cleanData.lastName || ''}`);
      
      setIsEditDialogOpen(false);
      setSelectedEmployee(null);
      setEditEmployee(initialFormData);
      setFormErrors({});
      await refreshData();
      toast.success("Employee updated successfully");
    } catch (error: any) {
      console.error("Failed to update employee:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to update employee";
      toast.error(errorMessage);
    }
  };

  const handleDeleteEmployee = async (employee: Employee) => {
    if (!window.confirm(`Are you sure you want to delete ${employee.firstName} ${employee.lastName || ''}?`)) {
      return;
    }

    try {
      await deleteEmployee(employee.id);
      
      await logActivity("DELETE_EMPLOYEE", `Deleted employee: ${employee.firstName} ${employee.lastName || ''}`);
      
      await refreshData();
      toast.success("Employee deleted successfully");
    } catch (error: any) {
      console.error("Failed to delete employee:", error);
      toast.error("Failed to delete employee");
    }
  };

  const handleBulkAssign = async () => {
    if (selectedEmployees.length === 0) {
      toast.error("Please select employees first");
      return;
    }

    try {
      const updateData: any = {};

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

      const results = [];
      const errors = [];

      for (const empId of selectedEmployees) {
        try {
          await delay(200);
          const result = await updateEmployee(empId, updateData);
          results.push({ empId, success: true, result });
        } catch (error: any) {
          console.error(`Failed to update employee ${empId}:`, error);
          const errorMessage = error.response?.data?.message || error.message || "Unknown error";
          errors.push({ empId, error: errorMessage });
        }
      }

      await logActivity("BULK_ASSIGN", `Bulk updated ${results.length} employees`);

      if (errors.length === 0) {
        toast.success(`Successfully updated ${selectedEmployees.length} employees`);
      } else if (results.length > 0) {
        toast.warning(`Updated ${results.length} employees. ${errors.length} failed.`);
      } else {
        toast.error("Failed to update all employees");
      }

      setIsBulkAssignOpen(false);
      setBulkAssignData({ departmentId: "", designationId: "", managerId: "", employmentType: "" });
      setSelectedEmployees([]);
      await refreshData();

    } catch (error: any) {
      console.error("Bulk assignment failed:", error);
      toast.error(`Bulk assignment failed: ${error.message || "Unknown error"}`);
    }
  };

  const handleStatusUpdate = async (status: string) => {
    if (selectedEmployees.length === 0) {
      toast.error("Please select employees first");
      return;
    }

    try {
      const results = [];
      const errors = [];

      for (const empId of selectedEmployees) {
        try {
          await delay(200);
          await updateEmployee(empId, { status });
          results.push(empId);
        } catch (error: any) {
          console.error(`Failed to update employee ${empId} status:`, error);
          const errorMessage = error.response?.data?.message || error.message || "Unknown error";
          errors.push({ empId, error: errorMessage });
        }
      }

      await logActivity("BULK_STATUS_UPDATE", `Updated ${results.length} employees to ${status}`);

      if (errors.length === 0) {
        toast.success(`Successfully updated ${selectedEmployees.length} employees to ${status}`);
      } else if (results.length > 0) {
        toast.warning(`Updated ${results.length} employees. ${errors.length} failed.`);
      } else {
        toast.error("Failed to update employee statuses");
      }

      setSelectedEmployees([]);
      await refreshData();

    } catch (error: any) {
      console.error("Status update failed:", error);
      toast.error(`Status update failed: ${error.message || "Unknown error"}`);
    }
  };

  const handleIndividualStatusUpdate = async (employee: Employee, newStatus: string) => {
    try {
      await updateEmployee(employee.id, { status: newStatus });
      
      await logActivity("STATUS_UPDATE", `${newStatus === 'active' ? 'Activated' : 'Deactivated'} employee: ${employee.firstName} ${employee.lastName || ''}`);
      
      toast.success(`Employee ${employee.firstName} ${employee.lastName || ''} ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      await refreshData();
    } catch (error: any) {
      console.error("Failed to update employee status:", error);
      toast.error("Failed to update employee status");
    }
  };

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

  const handleExport = (monthFilter?: string) => {
    try {
      const employees = employeeData?.employees || [];
      if (employees.length === 0) {
        toast.error("No employees to export");
        return;
      }

      exportEmployeesToExcel(employees, exportFields, exportFormat);
      
      logActivity("EXPORT_EMPLOYEES", `Exported ${employees.length} employees in ${exportFormat.toUpperCase()} format`);
      
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
    
    logActivity("VIEW_EMPLOYEE", `Viewed employee: ${employee.firstName} ${employee.lastName || ''}`);
  };

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
    const employees = employeeData?.employees || [];
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map((emp: Employee) => emp.id));
    }
  };

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

  if (isInitialLoading) {
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
    <div className="">
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-5">
            <h1 className="text-2xl font-bold border-r pr-5">Employee</h1>
            <div className="flex items-center gap-2">
              <LiveClock />
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" onClick={() => setIsExportDialogOpen(true)}>
              <Download className="w-4 h-4 mr-2" />
              Export
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
          </div>
        </motion.div>

        {/* Enhanced Stats Cards */}
        <EmployeeStats employeeData={employeeData} />

        {/* Enhanced Employee Management Interface */}
        <EmployeeTable
          employeeData={employeeData}
          loading={isTableLoading}
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          departmentFilter={departmentFilter}
          setDepartmentFilter={setDepartmentFilter}
          designationFilter={designationFilter}
          setDesignationFilter={setDesignationFilter}
          joinDateFilter={joinDateFilter}
          setJoinDateFilter={setJoinDateFilter}
          selectedEmployees={selectedEmployees}
          setSelectedEmployees={setSelectedEmployees}
          sortBy={sortBy}
          sortOrder={sortOrder}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          itemsPerPage={itemsPerPage}
          onSort={handleSort}
          onViewEmployee={handleViewEmployee}
          onEditEmployee={handleEditEmployee}
          onDeleteEmployee={handleDeleteEmployee}
          onAssignEmployee={handleAssignEmployee}
          onIndividualStatusUpdate={handleIndividualStatusUpdate}
          onCreateEmployee={() => setIsCreateDialogOpen(true)}
        />

        {/* All Dialogs */}
        <EmployeeDialogs
          // Create Dialog
          isCreateDialogOpen={isCreateDialogOpen}
          setIsCreateDialogOpen={setIsCreateDialogOpen}
          newEmployee={newEmployee}
          setNewEmployee={setNewEmployee}
          onCreateEmployee={handleCreateEmployee}
          formErrors={formErrors}
          employeeData={employeeData}
          
          // Edit Dialog
          isEditDialogOpen={isEditDialogOpen}
          setIsEditDialogOpen={setIsEditDialogOpen}
          selectedEmployee={selectedEmployee}
          setSelectedEmployee={setSelectedEmployee}
          editEmployee={editEmployee}
          setEditEmployee={setEditEmployee}
          onUpdateEmployee={handleUpdateEmployee}
          
          // View Dialog
          isViewDialogOpen={isViewDialogOpen}
          setIsViewDialogOpen={setIsViewDialogOpen}
          onEditEmployee={handleEditEmployee}
          
          // Bulk Assign Dialog
          isBulkAssignOpen={isBulkAssignOpen}
          setIsBulkAssignOpen={setIsBulkAssignOpen}
          bulkAssignData={bulkAssignData}
          setBulkAssignData={setBulkAssignData}
          selectedEmployees={selectedEmployees}
          onBulkAssign={handleBulkAssign}
          
          // Export Dialog
          isExportDialogOpen={isExportDialogOpen}
          setIsExportDialogOpen={setIsExportDialogOpen}
          exportFormat={exportFormat}
          setExportFormat={setExportFormat}
          exportFields={exportFields}
          setExportFields={setExportFields}
          onExport={handleExport}
          
          // Common
          initialFormData={initialFormData}
        />
      </motion.div>
    </div>
  );
}
