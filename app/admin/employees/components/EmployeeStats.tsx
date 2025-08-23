"use client";

import { motion } from "framer-motion";
import { Users, UserCheck, Star, Building, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { differenceInDays } from 'date-fns';
import { Employee } from "./types";

interface EmployeeStatsProps {
  employeeData: any;
}

export default function EmployeeStats({ employeeData }: EmployeeStatsProps) {
  const employees = employeeData?.employees || [];
  const dashboardStats = employeeData?.summary?.dashboardStats || {};
  const pagination = employeeData?.pagination || { total: 0 };
  
  // Safe array operations for unique values
  const uniqueDepartments = [...new Set(employees.map((e: Employee) => e.department?.name).filter(Boolean))];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.3 } },
  };

  return (
    <motion.div variants={containerVariants} className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
      {/* Total Employees Card */}
      <motion.div variants={itemVariants}>
        <Card className="h-32"> {/* Fixed height for all cards */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold">
              {dashboardStats?.totalEmployees?.value || pagination.total || employees.length}
            </div>

          </CardContent>
        </Card>
      </motion.div>

      {/* Active Employees Card */}
      <motion.div variants={itemVariants}>
        <Card className="h-32"> {/* Fixed height for all cards */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-green-600">
              {dashboardStats?.activeEmployees?.value || employees.filter((e: Employee) => e.status === 'active').length}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* New Joiners Card */}
      <motion.div variants={itemVariants}>
        <Card className="h-32"> {/* Fixed height for all cards */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Joiners</CardTitle>
            <Star className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-blue-600">
              {dashboardStats?.newJoinersThisMonth?.value || employees.filter((e: Employee) => differenceInDays(new Date(), new Date(e.dateOfJoining)) <= 30).length}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Departments Card */}
      <motion.div variants={itemVariants}>
        <Card className="h-32"> {/* Fixed height for all cards */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Departments</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold">
              {dashboardStats?.departments?.value || uniqueDepartments.length}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Unassigned Card */}
      <motion.div variants={itemVariants}>
        <Card className="h-32"> {/* Fixed height for all cards */}
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent className="pb-2">
            <div className="text-2xl font-bold text-orange-600">
              {employees.filter((e: Employee) => !e.departmentId || !e.designationId).length}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
