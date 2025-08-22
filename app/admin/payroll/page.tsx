"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeDollarSign,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  Download,
  Upload,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Send,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from 'date-fns';
import { getEmployees, getProfile } from "@/app/api/api";

interface PayrollRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  basicSalary: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  payPeriod: string;
  status: 'draft' | 'processed' | 'paid';
  processedDate?: string;
}

// Mock payroll data - in real app, this would come from API
const mockPayrollData: PayrollRecord[] = [
  {
    id: '1',
    employeeId: 'emp001',
    employeeName: 'John Doe',
    employeeCode: 'EMP001',
    basicSalary: 50000,
    allowances: 5000,
    deductions: 2000,
    netSalary: 53000,
    payPeriod: '2025-08',
    status: 'paid',
    processedDate: '2025-08-15',
  },
  {
    id: '2',
    employeeId: 'emp002',
    employeeName: 'Jane Smith',
    employeeCode: 'EMP002',
    basicSalary: 55000,
    allowances: 6000,
    deductions: 2500,
    netSalary: 58500,
    payPeriod: '2025-08',
    status: 'processed',
  },
  // Add more mock data as needed
];

export default function PayrollPage() {
  const [payrollData, setPayrollData] = useState<PayrollRecord[]>(mockPayrollData);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("2025-08");
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    fetchProfile();
    fetchEmployees();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await getProfile();
      setUserProfile(response.data);
    } catch (error) {
      console.error("Failed to fetch profile:", error);
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const organizationId = userProfile?.organizationId || "24facd21-265a-4edd-8fd1-bc69a036f755";
      const response = await getEmployees(organizationId);
      setEmployees(response.data || []);
    } catch (error) {
      console.error("Failed to fetch employees:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { variant: "secondary" as const, className: "bg-gray-100 text-gray-800" },
      processed: { variant: "default" as const, className: "bg-blue-100 text-blue-800" },
      paid: { variant: "default" as const, className: "bg-green-100 text-green-800" },
    };
    
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  };

  const filteredPayrollData = payrollData.filter((record) => {
    const matchesSearch = record.employeeName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         record.employeeCode.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    const matchesPeriod = record.payPeriod === periodFilter;
    return matchesSearch && matchesStatus && matchesPeriod;
  });

  const totalSalaryPaid = payrollData
    .filter(record => record.status === 'paid' && record.payPeriod === periodFilter)
    .reduce((sum, record) => sum + record.netSalary, 0);

  const totalEmployeesPaid = payrollData
    .filter(record => record.status === 'paid' && record.payPeriod === periodFilter)
    .length;

  const averageSalary = totalEmployeesPaid > 0 ? totalSalaryPaid / totalEmployeesPaid : 0;

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.3 } },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        <motion.div initial="hidden" animate="visible" variants={containerVariants} className="space-y-6">
          
          {/* Header */}
          <motion.div variants={itemVariants} className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
                Payroll Management
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage employee salaries, allowances, and payroll processing
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Button className="bg-green-600 hover:bg-green-700">
                <Send className="w-4 h-4 mr-2" />
                Process Payroll
              </Button>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div variants={containerVariants} className="grid gap-6 md:grid-cols-4">
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Salary Paid</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{totalSalaryPaid.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+5.2%</span> from last month
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Employees Paid</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalEmployeesPaid}</div>
                  <p className="text-xs text-muted-foreground">
                    Out of {employees.length} total employees
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Average Salary</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{Math.round(averageSalary).toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+2.1%</span> vs last month
                  </p>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Processing</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {payrollData.filter(r => r.status !== 'paid' && r.payPeriod === periodFilter).length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Requires attention
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>

          {/* Main Content */}
          <motion.div variants={itemVariants}>
            <Tabs defaultValue="payroll" className="space-y-6">
              <TabsList className="grid w-full lg:w-auto grid-cols-3">
                <TabsTrigger value="payroll" className="flex items-center space-x-2">
                  <BadgeDollarSign className="w-4 h-4" />
                  <span>Payroll Records</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>Analytics</span>
                </TabsTrigger>
                <TabsTrigger value="reports" className="flex items-center space-x-2">
                  <Download className="w-4 h-4" />
                  <span>Reports</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="payroll" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Payroll Records</CardTitle>
                        <CardDescription>
                          Manage employee salary records and payroll processing
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Select value={periodFilter} onValueChange={setPeriodFilter}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="2025-08">Aug 2025</SelectItem>
                            <SelectItem value="2025-07">Jul 2025</SelectItem>
                            <SelectItem value="2025-06">Jun 2025</SelectItem>
                          </SelectContent>
                        </Select>
                        <div className="relative">
                          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Search employees..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-8 w-64"
                          />
                        </div>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="draft">Draft</SelectItem>
                            <SelectItem value="processed">Processed</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Employee</TableHead>
                          <TableHead>Basic Salary</TableHead>
                          <TableHead>Allowances</TableHead>
                          <TableHead>Deductions</TableHead>
                          <TableHead>Net Salary</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Processed Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayrollData.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              <div className="flex items-center space-x-3">
                                <Avatar className="h-8 w-8">
                                  <AvatarFallback>
                                    {record.employeeName.split(' ').map(n => n[0]).join('')}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className="font-medium">{record.employeeName}</div>
                                  <div className="text-sm text-muted-foreground">{record.employeeCode}</div>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>₹{record.basicSalary.toLocaleString()}</TableCell>
                            <TableCell className="text-green-600">+₹{record.allowances.toLocaleString()}</TableCell>
                            <TableCell className="text-red-600">-₹{record.deductions.toLocaleString()}</TableCell>
                            <TableCell className="font-semibold">₹{record.netSalary.toLocaleString()}</TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusBadge(record.status).variant}
                                className={getStatusBadge(record.status).className}
                              >
                                {record.status.toUpperCase()}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {record.processedDate ? format(new Date(record.processedDate), 'MMM dd, yyyy') : '-'}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem>
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem>
                                    <Download className="mr-2 h-4 w-4" />
                                    Download Slip
                                  </DropdownMenuItem>
                                  {record.status === 'processed' && (
                                    <DropdownMenuItem>
                                      <Send className="mr-2 h-4 w-4" />
                                      Mark as Paid
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="analytics" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Salary Distribution</CardTitle>
                      <CardDescription>Overview of salary ranges across the organization</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">₹30,000 - ₹50,000</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full">
                              <div className="w-3/4 h-2 bg-blue-500 rounded-full"></div>
                            </div>
                            <span className="text-sm font-medium">75%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">₹50,000 - ₹70,000</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full">
                              <div className="w-1/2 h-2 bg-green-500 rounded-full"></div>
                            </div>
                            <span className="text-sm font-medium">50%</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">₹70,000+</span>
                          <div className="flex items-center space-x-2">
                            <div className="w-24 h-2 bg-gray-200 rounded-full">
                              <div className="w-1/4 h-2 bg-purple-500 rounded-full"></div>
                            </div>
                            <span className="text-sm font-medium">25%</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Monthly Trends</CardTitle>
                      <CardDescription>Payroll costs over the last 6 months</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {['Aug 2025', 'Jul 2025', 'Jun 2025', 'May 2025', 'Apr 2025', 'Mar 2025'].map((month, index) => (
                          <div key={month} className="flex items-center justify-between">
                            <span className="text-sm">{month}</span>
                            <div className="flex items-center space-x-2">
                              <div className="w-32 h-2 bg-gray-200 rounded-full">
                                <div 
                                  className="h-2 bg-blue-500 rounded-full" 
                                  style={{ width: `${100 - index * 5}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium">
                                ₹{(500000 - index * 25000).toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="reports" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Payroll Reports</CardTitle>
                    <CardDescription>Generate and download various payroll reports</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-6 text-center">
                          <Download className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                          <h3 className="font-semibold mb-1">Monthly Payroll Summary</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Complete payroll breakdown for the month
                          </p>
                          <Button size="sm" variant="outline">Download</Button>
                        </CardContent>
                      </Card>

                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-6 text-center">
                          <Download className="w-8 h-8 mx-auto mb-2 text-green-600" />
                          <h3 className="font-semibold mb-1">Tax Deduction Report</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            TDS and other tax deductions summary
                          </p>
                          <Button size="sm" variant="outline">Download</Button>
                        </CardContent>
                      </Card>

                      <Card className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardContent className="p-6 text-center">
                          <Download className="w-8 h-8 mx-auto mb-2 text-purple-600" />
                          <h3 className="font-semibold mb-1">Employee Wise Report</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            Individual employee salary details
                          </p>
                          <Button size="sm" variant="outline">Download</Button>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
