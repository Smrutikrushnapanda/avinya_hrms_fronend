"use client";

import { useState } from "react";
import {
  User,
  Phone,
  AlertCircle,
  Briefcase,
  Edit,
  Download,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { format, isValid, parseISO, differenceInDays } from 'date-fns';
import { Employee, EmployeeFormData, ExportFields } from "./types";

interface EmployeeDialogsProps {
  // Create Dialog
  isCreateDialogOpen: boolean;
  setIsCreateDialogOpen: (value: boolean) => void;
  newEmployee: EmployeeFormData;
  setNewEmployee: (value: EmployeeFormData) => void;
  onCreateEmployee: () => void;
  formErrors: Record<string, string>;
  employeeData: any;
  
  // Edit Dialog
  isEditDialogOpen: boolean;
  setIsEditDialogOpen: (value: boolean) => void;
  selectedEmployee: Employee | null;
  setSelectedEmployee: (value: Employee | null) => void;
  editEmployee: EmployeeFormData;
  setEditEmployee: (value: EmployeeFormData) => void;
  onUpdateEmployee: () => void;
  
  // View Dialog
  isViewDialogOpen: boolean;
  setIsViewDialogOpen: (value: boolean) => void;
  onEditEmployee: (employee: Employee) => void;
  
  // Bulk Assign Dialog
  isBulkAssignOpen: boolean;
  setIsBulkAssignOpen: (value: boolean) => void;
  bulkAssignData: any;
  setBulkAssignData: (value: any) => void;
  selectedEmployees: string[];
  onBulkAssign: () => void;
  
  // Export Dialog
  isExportDialogOpen: boolean;
  setIsExportDialogOpen: (value: boolean) => void;
  exportFormat: string;
  setExportFormat: (value: string) => void;
  exportFields: ExportFields;
  setExportFields: (value: ExportFields) => void;
  onExport: (monthFilter?: string) => void;
  
  // Common
  initialFormData: EmployeeFormData;
}

export default function EmployeeDialogs({
  // Create Dialog props
  isCreateDialogOpen,
  setIsCreateDialogOpen,
  newEmployee,
  setNewEmployee,
  onCreateEmployee,
  formErrors,
  employeeData,
  
  // Edit Dialog props
  isEditDialogOpen,
  setIsEditDialogOpen,
  selectedEmployee,
  setSelectedEmployee,
  editEmployee,
  setEditEmployee,
  onUpdateEmployee,
  
  // View Dialog props
  isViewDialogOpen,
  setIsViewDialogOpen,
  onEditEmployee,
  
  // Bulk Assign Dialog props
  isBulkAssignOpen,
  setIsBulkAssignOpen,
  bulkAssignData,
  setBulkAssignData,
  selectedEmployees,
  onBulkAssign,
  
  // Export Dialog props
  isExportDialogOpen,
  setIsExportDialogOpen,
  exportFormat,
  setExportFormat,
  exportFields,
  setExportFields,
  onExport,
  
  // Common props
  initialFormData,
}: EmployeeDialogsProps) {
  
  const [exportMonthFilter, setExportMonthFilter] = useState("all");
  
  const departments = employeeData?.filters?.departments || [];
  const designations = employeeData?.filters?.designations || [];
  const managers = employeeData?.filters?.managers || [];
  const employees = employeeData?.employees || [];

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

  // Generate month options for the last 2 years
  const generateMonthOptions = () => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 0; i < 24; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthYear = format(date, 'yyyy-MM');
      const displayText = format(date, 'MMMM yyyy');
      months.push({ value: monthYear, label: displayText });
    }
    
    return months;
  };

  const monthOptions = generateMonthOptions();

  return (
    <>
      {/* Create New Employee Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[1200px] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Employee</DialogTitle>
            <DialogDescription>
              Add a new employee with complete details.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6">
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
                      value={newEmployee.dateOfBirth || ""}
                      onChange={(e) => setNewEmployee({ ...newEmployee, dateOfBirth: e.target.value })}
                      max={new Date().toISOString().split("T")[0]}
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
                      value={newEmployee.dateOfJoining || ""}
                      onChange={(e) => setNewEmployee({ ...newEmployee, dateOfJoining: e.target.value })}
                      className={formErrors.dateOfJoining ? "border-red-500" : ""}
                      max={new Date().toISOString().split("T")[0]}
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
                        {departments.map((dept: any) => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
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
                        {designations.map((desig: any) => (
                          <SelectItem key={desig.id} value={desig.id}>{desig.name}</SelectItem>
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
                        {managers.map((mgr: any) => (
                          <SelectItem key={mgr.id} value={mgr.id}>{`${mgr.firstName} ${mgr.lastName || ''}`}</SelectItem>
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
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setNewEmployee(initialFormData);
              }}
            >
              Cancel
            </Button>
            <Button onClick={onCreateEmployee}>Create Employee</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Employee Dialog */}
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

            {/* Employment Information */}
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
                        {departments.map((dept: any) => (
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
                        {designations.map((desig: any) => (
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
                        {managers.map((mgr: any) => (
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
              setSelectedEmployee(null);
            }}>
              Cancel
            </Button>
            <Button onClick={onUpdateEmployee}>
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
                  <AvatarImage src={selectedEmployee.photoUrl} />
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
                onEditEmployee(selectedEmployee);
              }
            }}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Employee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assignment Dialog */}
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
                  {departments.map((dept: any) => (
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
                  {designations.map((desig: any) => (
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
                  {managers.map((mgr: any) => (
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
            <Button onClick={onBulkAssign}>
              Update {selectedEmployees.length} Employee{selectedEmployees.length > 1 ? 's' : ''}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Enhanced Export Dialog with Month Filter */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Export Employees</DialogTitle>
            <DialogDescription>
              Choose the data, format, and date range for your export
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

            {/* New Month Filter Section */}
            <div className="grid gap-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Filter by Joining Month
              </Label>
              <Select value={exportMonthFilter} onValueChange={setExportMonthFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Select month" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="current">Current Month</SelectItem>
                  <SelectItem value="last3">Last 3 Months</SelectItem>
                  <SelectItem value="last6">Last 6 Months</SelectItem>
                  <SelectItem value="thisYear">This Year</SelectItem>
                  <Separator className="my-2" />
                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Specific Months</div>
                  {monthOptions.map((month) => (
                    <SelectItem key={month.value} value={month.value}>
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Filter employees by their joining date within the selected period
              </p>
            </div>

            <Separator />

            <div className="grid gap-2">
              <Label>Data to Export</Label>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="basic"
                    checked={exportFields.basic}
                    onCheckedChange={(checked) =>
                      setExportFields({ ...exportFields, basic: !!checked })}
                  />
                  <Label htmlFor="basic" className="cursor-pointer text-sm">
                    Basic Information (Name, ID, Code, Gender, DOB, Joining Date)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="contact"
                    checked={exportFields.contact}
                    onCheckedChange={(checked) =>
                      setExportFields({ ...exportFields, contact: !!checked })}
                  />
                  <Label htmlFor="contact" className="cursor-pointer text-sm">
                    Contact Details (Work Email, Personal Email, Phone)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="employment"
                    checked={exportFields.employment}
                    onCheckedChange={(checked) =>
                      setExportFields({ ...exportFields, employment: !!checked })}
                  />
                  <Label htmlFor="employment" className="cursor-pointer text-sm">
                    Employment Info (Department, Designation, Manager, Status)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="emergency"
                    checked={exportFields.emergency}
                    onCheckedChange={(checked) =>
                      setExportFields({ ...exportFields, emergency: !!checked })}
                  />
                  <Label htmlFor="emergency" className="cursor-pointer text-sm">
                    Emergency Contacts (Name, Relationship, Phone)
                  </Label>
                </div>
              </div>
            </div>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {employees.length} employees will be exported based on current filters and selected date range.
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setIsExportDialogOpen(false);
              setExportMonthFilter("all");
            }}>
              Cancel
            </Button>
            <Button onClick={() => onExport(exportMonthFilter)}>
              <Download className="w-4 h-4 mr-2" />
              Export {exportFormat.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
