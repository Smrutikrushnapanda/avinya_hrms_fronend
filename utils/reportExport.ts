import * as XLSX from 'xlsx';
import { format } from 'date-fns';

export interface ReportData {
  attendance?: any[];
  employees?: any[];
  leaves?: any[];
  payroll?: any[];
  performance?: any[];
}

export const exportAttendanceReport = (data: any[], period: string) => {
  const rows = data.map(record => ({
    'Employee ID': record.employeeId || '',
    'Employee Name': record.employeeName || '',
    'Date': record.date ? format(new Date(record.date), 'yyyy-MM-dd') : '',
    'Check In': record.checkIn || '',
    'Check Out': record.checkOut || '',
    'Total Hours': record.totalHours || '',
    'Status': record.status || '',
    'Department': record.department || '',
    'Location': record.location || '',
    'Overtime': record.overtime || '0',
  }));

  generateExcelFile(rows, `Attendance_Report_${period}`, 'Attendance Report');
};

export const exportEmployeeReport = (employees: any[]) => {
  const rows = employees.map(emp => ({
    'Employee ID': emp.id || '',
    'Employee Code': emp.employeeCode || '',
    'Full Name': `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
    'Department': emp.department?.name || 'Not Assigned',
    'Designation': emp.designation?.name || 'Not Assigned',
    'Email': emp.workEmail || '',
    'Phone': emp.contactNumber || '',
    'Joining Date': emp.dateOfJoining ? format(new Date(emp.dateOfJoining), 'yyyy-MM-dd') : '',
    'Status': emp.status || '',
    'Manager': emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName}` : 'No Manager',
    'Employment Type': emp.employmentType || '',
  }));

  generateExcelFile(rows, 'Employee_Directory_Report', 'Employee Directory');
};

export const exportLeaveReport = (leaves: any[], period: string) => {
  const rows = leaves.map(leave => ({
    'Employee ID': leave.employeeId || '',
    'Employee Name': leave.employeeName || '',
    'Leave Type': leave.leaveType || '',
    'From Date': leave.fromDate ? format(new Date(leave.fromDate), 'yyyy-MM-dd') : '',
    'To Date': leave.toDate ? format(new Date(leave.toDate), 'yyyy-MM-dd') : '',
    'Days': leave.days || '',
    'Status': leave.status || '',
    'Applied Date': leave.appliedDate ? format(new Date(leave.appliedDate), 'yyyy-MM-dd') : '',
    'Approved By': leave.approvedBy || '',
    'Reason': leave.reason || '',
  }));

  generateExcelFile(rows, `Leave_Report_${period}`, 'Leave Report');
};

export const exportPayrollReport = (payroll: any[], period: string) => {
  const rows = payroll.map(pay => ({
    'Employee ID': pay.employeeId || '',
    'Employee Name': pay.employeeName || '',
    'Basic Salary': pay.basicSalary || '',
    'Allowances': pay.allowances || '',
    'Deductions': pay.deductions || '',
    'Gross Salary': pay.grossSalary || '',
    'Net Salary': pay.netSalary || '',
    'Pay Date': pay.payDate ? format(new Date(pay.payDate), 'yyyy-MM-dd') : '',
    'Status': pay.status || '',
  }));

  generateExcelFile(rows, `Payroll_Report_${period}`, 'Payroll Report');
};

export const exportPerformanceReport = (performance: any[], period: string) => {
  const rows = performance.map(perf => ({
    'Employee ID': perf.employeeId || '',
    'Employee Name': perf.employeeName || '',
    'Review Period': perf.reviewPeriod || '',
    'Overall Score': perf.overallScore || '',
    'Goals Achieved': perf.goalsAchieved || '',
    'Reviewer': perf.reviewer || '',
    'Review Date': perf.reviewDate ? format(new Date(perf.reviewDate), 'yyyy-MM-dd') : '',
    'Comments': perf.comments || '',
  }));

  generateExcelFile(rows, `Performance_Report_${period}`, 'Performance Report');
};

const generateExcelFile = (data: any[], filename: string, sheetName: string) => {
  if (data.length === 0) {
    throw new Error('No data to export');
  }

  // Create worksheet with proper formatting
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Auto-size columns
  const colWidths = Object.keys(data[0] || {}).map(key => ({
    wch: Math.max(key.length, ...data.map(row => String(row[key] || '').length)) + 2
  }));
  worksheet['!cols'] = colWidths;
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Generate and download file
  const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
  const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${timestamp}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
};

// Chart data export
export const exportChartData = (chartData: any[], chartName: string) => {
  generateExcelFile(chartData, `${chartName}_Chart_Data`, chartName);
};
