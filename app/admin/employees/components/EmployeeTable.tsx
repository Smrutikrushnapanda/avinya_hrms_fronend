"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Search,
  X,
  ArrowUpDown,
  Building,
  Award,
  UserCheck,
  MoreHorizontal,
  Eye,
  Edit,
  Settings,
  Copy,
  UserX,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { format, isValid, parseISO, differenceInDays } from 'date-fns';
import { Employee } from "./types";

interface EmployeeTableProps {
  employeeData: any;
  loading: boolean;
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  departmentFilter: string;
  setDepartmentFilter: (value: string) => void;
  designationFilter: string;
  setDesignationFilter: (value: string) => void;
  joinDateFilter: string;
  setJoinDateFilter: (value: string) => void;
  selectedEmployees: string[];
  setSelectedEmployees: (value: string[]) => void;
  sortBy: string;
  sortOrder: "asc" | "desc";
  currentPage: number;
  setCurrentPage: (value: number) => void;
  itemsPerPage: number;
  onSort: (column: string) => void;
  onViewEmployee: (employee: Employee) => void;
  onEditEmployee: (employee: Employee) => void;
  onDeleteEmployee: (employee: Employee) => void;
  onAssignEmployee: (employee: Employee) => void;
  onIndividualStatusUpdate: (employee: Employee, status: string) => void;
  onCreateEmployee: () => void;
}

export default function EmployeeTable({
  employeeData,
  loading,
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  departmentFilter,
  setDepartmentFilter,
  designationFilter,
  setDesignationFilter,
  joinDateFilter,
  setJoinDateFilter,
  selectedEmployees,
  setSelectedEmployees,
  sortBy,
  sortOrder,
  currentPage,
  setCurrentPage,
  itemsPerPage,
  onSort,
  onViewEmployee,
  onEditEmployee,
  onDeleteEmployee,
  onAssignEmployee,
  onIndividualStatusUpdate,
  onCreateEmployee,
}: EmployeeTableProps) {
  const employees = employeeData?.employees || [];
  const pagination = employeeData?.pagination || { page: 1, total: 0, totalPages: 1, hasNext: false, hasPrev: false };
  
  // Safe array operations for unique values
  const uniqueDepartments = [...new Set(employees.map((e: Employee) => e.department?.name).filter(Boolean))];
  const uniqueDesignations = [...new Set(employees.map((e: Employee) => e.designation?.name).filter(Boolean))];

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

  // FIXED: Proper status display function
  const getStatusText = (status: string) => {
    if (!status) return "INACTIVE";
    return status.toUpperCase();
  };

  const handleSelectEmployee = (employeeId: string) => {
    setSelectedEmployees(
      selectedEmployees.includes(employeeId)
        ? selectedEmployees.filter(id => id !== employeeId)
        : [...selectedEmployees, employeeId]
    );
  };

  const handleSelectAllEmployees = () => {
    if (selectedEmployees.length === employees.length) {
      setSelectedEmployees([]);
    } else {
      setSelectedEmployees(employees.map((emp: Employee) => emp.id));
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.3 } },
  };

  return (
    <motion.div variants={itemVariants}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Employee Directory</CardTitle>
            </div>
            
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={onCreateEmployee}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Employee
            </Button>
          </div>

          {/* Advanced Filters */}
          <div className="flex flex-wrap items-center gap-4 mt-4">
            <div className="relative w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({pagination.total})</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="new">New</SelectItem>
                <SelectItem value="unassigned">Unassigned</SelectItem>
              </SelectContent>
            </Select>

            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {uniqueDepartments.map((dept) => (
                  <SelectItem key={String(dept)} value={String(dept)}>{String(dept)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={designationFilter} onValueChange={setDesignationFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Designation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Designations</SelectItem>
                {uniqueDesignations.map((desig) => (
                  <SelectItem key={String(desig)} value={String(desig)}>{String(desig)}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={joinDateFilter} onValueChange={setJoinDateFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Join Date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="last30">Last 30 days</SelectItem>
                <SelectItem value="last90">Last 90 days</SelectItem>
                <SelectItem value="thisYear">This Year</SelectItem>
              </SelectContent>
            </Select>

            {(searchTerm || statusFilter !== "all" || departmentFilter !== "all" || designationFilter !== "all" || joinDateFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm("");
                  setStatusFilter("all");
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
          <div className="rounded-md border overflow-x-auto relative">
            {loading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-white/70 dark:bg-gray-950/70 flex items-center justify-center z-10"
              >
                <div className="flex items-center gap-2 bg-white dark:bg-gray-900 px-4 py-2 rounded-lg shadow-md">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Updating...</span>
                </div>
              </motion.div>
            )}
            
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedEmployees.length === employees.length && employees.length > 0}
                      onCheckedChange={handleSelectAllEmployees}
                    />
                  </TableHead>
                  <TableHead className="min-w-[280px]">
                    <Button
                      variant="ghost"
                      onClick={() => onSort("firstName")}
                      className="flex items-center space-x-1 p-0 h-auto font-medium"
                    >
                      <span>Employee</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[180px]">
                    <Button
                      variant="ghost"
                      onClick={() => onSort("department")}
                      className="flex items-center space-x-1 p-0 h-auto font-medium"
                    >
                      <span>Department</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[160px]">Designation</TableHead>
                  <TableHead className="w-[140px]">Manager</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[120px]">
                    <Button
                      variant="ghost"
                      onClick={() => onSort("dateOfJoining")}
                      className="flex items-center space-x-1 p-0 h-auto font-medium"
                    >
                      <span>Joined</span>
                      <ArrowUpDown className="h-3 w-3" />
                    </Button>
                  </TableHead>
                  <TableHead className="w-[60px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <AnimatePresence mode="wait">
                  {employees.length === 0 ? (
                    <motion.tr
                      key="no-employees"
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      transition={{ duration: 0.3 }}
                    >
                      <TableCell colSpan={8} className="h-24 text-center">
                        <div className="flex flex-col items-center space-y-2">
                          <Users className="h-8 w-8 text-muted-foreground" />
                          <p className="text-muted-foreground">No employees found</p>
                          <p className="text-sm text-muted-foreground">
                            Try adjusting your filters or search terms
                          </p>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ) : (
                    employees.map((employee: Employee, index: number) => {
                      const isNew = differenceInDays(new Date(), new Date(employee.dateOfJoining)) <= 30;
                      const isUnassigned = !employee.departmentId || !employee.designationId;

                      return (
                        <motion.tr
                          key={employee.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ 
                            duration: 0.3, 
                            delay: index * 0.05,
                            ease: "easeOut"
                          }}
                          className={selectedEmployees.includes(employee.id) ? "bg-muted/50" : ""}
                        >
                          <TableCell className="w-12">
                            <Checkbox
                              checked={selectedEmployees.includes(employee.id)}
                              onCheckedChange={() => handleSelectEmployee(employee.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium min-w-[280px]">
                            <div className="flex items-center space-x-3">
                              <Avatar className="h-10 w-10 flex-shrink-0">
                                <AvatarImage
                                  src={employee.photoUrl}
                                  alt={`${employee.firstName} ${employee.lastName}`}
                                />
                                <AvatarFallback>
                                  {`${employee.firstName.charAt(0)}${(employee.lastName || '').charAt(0)}`}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <div className="font-medium flex items-center space-x-2">
                                  <span className="truncate">{`${employee.firstName} ${employee.lastName || ''}`}</span>
                                  {isNew && <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 flex-shrink-0">New</Badge>}
                                  {isUnassigned && <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 flex-shrink-0">Unassigned</Badge>}
                                </div>
                                <div className="text-sm text-muted-foreground truncate">
                                  {employee.employeeCode}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="w-[180px]">
                            <div className="flex items-center space-x-1">
                              <Building className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">
                                {employee.department?.name || "Not assigned"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="w-[160px]">
                            <div className="flex items-center space-x-1">
                              <Award className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                              <span className="text-sm truncate">
                                {employee.designation?.name || "Not assigned"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="w-[140px]">
                            {employee.manager ? (
                              <div className="flex items-center space-x-1">
                                <UserCheck className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-sm truncate">
                                  {`${employee.manager.firstName} ${employee.manager.lastName}`}
                                </span>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">No manager</span>
                            )}
                          </TableCell>
                          <TableCell className="w-[100px]">
                            <Badge className={getStatusBadge(employee.status)}>
                              {getStatusText(employee.status)}
                            </Badge>
                          </TableCell>
                          <TableCell className="w-[120px]">
                            <div className="text-sm">
                              {safeFormatDate(employee.dateOfJoining)}
                            </div>
                          </TableCell>
                          <TableCell className="w-[60px] text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => onViewEmployee(employee)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onEditEmployee(employee)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit Employee
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => onAssignEmployee(employee)}>
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
                                  onClick={() => onIndividualStatusUpdate(employee, employee.status === 'active' ? 'inactive' : 'active')}
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
                        </motion.tr>
                      );
                    })
                  )}
                </AnimatePresence>
              </TableBody>
            </Table>
          </div>

          {/* Enhanced Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between space-x-2 py-4">
              <div className="text-sm text-muted-foreground">
                Showing {((pagination.page - 1) * itemsPerPage) + 1} to {Math.min(pagination.page * itemsPerPage, pagination.total)} of {pagination.total} entries
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
                  disabled={!pagination.hasPrev}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <div className="flex items-center space-x-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const pageNum = Math.max(1, currentPage - 2) + i;
                    if (pageNum > pagination.totalPages) return null;
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
                  onClick={() => setCurrentPage(Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={!pagination.hasNext}
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
  );
}
