import * as XLSX from 'xlsx';
import { format, parseISO, isValid } from 'date-fns';

export interface ExportFields {
  basic: boolean;
  contact: boolean;
  employment: boolean;
  emergency: boolean;
}

// Helper function to filter employees by month
const filterEmployeesByMonth = (employees: any[], monthFilter?: string): any[] => {
  if (!monthFilter || monthFilter === 'all') {
    return employees;
  }

  const now = new Date();
  
  return employees.filter(emp => {
    if (!emp.dateOfJoining) return false;
    
    try {
      const joinDate = parseISO(emp.dateOfJoining);
      if (!isValid(joinDate)) return false;

      switch (monthFilter) {
        case 'current':
          // Current month only
          return joinDate.getFullYear() === now.getFullYear() && 
                 joinDate.getMonth() === now.getMonth();
        
        case 'last3':
          // Last 3 months
          const last3Months = new Date();
          last3Months.setMonth(now.getMonth() - 3);
          return joinDate >= last3Months;
        
        case 'last6':
          // Last 6 months
          const last6Months = new Date();
          last6Months.setMonth(now.getMonth() - 6);
          return joinDate >= last6Months;
        
        case 'thisYear':
          // Current year only
          return joinDate.getFullYear() === now.getFullYear();
        
        default:
          // Specific month format: YYYY-MM
          if (monthFilter.match(/^\d{4}-\d{2}$/)) {
            const [year, month] = monthFilter.split('-').map(Number);
            return joinDate.getFullYear() === year && 
                   joinDate.getMonth() === month - 1; // Month is 0-indexed
          }
          return true;
      }
    } catch (error) {
      console.error('Error parsing date:', error);
      return false;
    }
  });
};

// Helper function to get readable suffix for filename
const getFilterSuffix = (monthFilter: string): string => {
  switch (monthFilter) {
    case 'current':
      return 'Current_Month';
    case 'last3':
      return 'Last_3_Months';
    case 'last6':
      return 'Last_6_Months';
    case 'thisYear':
      return 'This_Year';
    default:
      // For YYYY-MM format
      if (monthFilter.match(/^\d{4}-\d{2}$/)) {
        return monthFilter.replace('-', '_');
      }
      return 'Filtered';
  }
};

// Main export function
export const exportEmployeesToExcel = (
  employees: any[], 
  selectedFields: ExportFields, 
  exportFormat: string = 'excel',
  monthFilter?: string
) => {
  // Filter employees by month first
  const filteredEmployees = filterEmployeesByMonth(employees, monthFilter);
  
  if (filteredEmployees.length === 0) {
    throw new Error(monthFilter && monthFilter !== 'all' 
      ? 'No employees found for the selected month/period' 
      : 'No data to export');
  }

  // Map filtered employees to export rows
  const rows = filteredEmployees.map(emp => {
    const row: any = {};
    
    // Basic Information
    if (selectedFields.basic) {
      row['Employee ID'] = emp.id || '';
      row['Employee Code'] = emp.employeeCode || '';
      row['First Name'] = emp.firstName || '';
      row['Middle Name'] = emp.middleName || '';
      row['Last Name'] = emp.lastName || '';
      row['Full Name'] = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
      row['Gender'] = emp.gender || '';
      row['Date of Birth'] = emp.dateOfBirth ? format(parseISO(emp.dateOfBirth), 'MMM dd, yyyy') : '';
      row['Joining Date'] = emp.dateOfJoining ? format(parseISO(emp.dateOfJoining), 'MMM dd, yyyy') : '';
      row['Blood Group'] = emp.bloodGroup || '';
    }
    
    // Contact Information
    if (selectedFields.contact) {
      row['Work Email'] = emp.workEmail || '';
      row['Personal Email'] = emp.personalEmail || '';
      row['Contact Number'] = emp.contactNumber || '';
    }
    
    // Employment Information
    if (selectedFields.employment) {
      row['Department'] = emp.department?.name || 'Not Assigned';
      row['Designation'] = emp.designation?.name || 'Not Assigned';
      row['Manager'] = emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName || ''}` : 'No Manager';
      row['Employment Type'] = emp.employmentType || '';
      row['Status'] = emp.status || '';
    }
    
    // Emergency Contact Information
    if (selectedFields.emergency) {
      row['Emergency Contact Name'] = emp.emergencyContactName || '';
      row['Emergency Contact Relationship'] = emp.emergencyContactRelationship || '';
      row['Emergency Contact Phone'] = emp.emergencyContactPhone || '';
    }
    
    return row;
  });

  // Create worksheet with proper formatting
  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  // Auto-size columns based on content
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(
      key.length, 
      ...rows.map(row => String(row[key] || '').length)
    ) + 2
  }));
  worksheet['!cols'] = colWidths;
  
  // Create workbook and add worksheet
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Report');

  // Generate filename with date and filter info
  const timestamp = new Date().toISOString().slice(0, 10);
  let fileName = `Employee_Report_${timestamp}`;
  
  // Add month filter to filename if specified
  if (monthFilter && monthFilter !== 'all') {
    const filterSuffix = getFilterSuffix(monthFilter);
    fileName = `Employee_Report_${filterSuffix}_${timestamp}`;
  }
  
  // Export based on format
  if (exportFormat === 'csv') {
    // Export as CSV
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } else {
    // Export as Excel
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${fileName}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
};

// Additional utility function for date validation
export const isValidDateString = (dateString: string): boolean => {
  if (!dateString) return false;
  try {
    const date = parseISO(dateString);
    return isValid(date);
  } catch {
    return false;
  }
};

// Helper function to format employee count message
export const getFilteredCountMessage = (total: number, filtered: number, monthFilter?: string): string => {
  if (!monthFilter || monthFilter === 'all') {
    return `${total} employees will be exported`;
  }
  
  const filterName = getFilterSuffix(monthFilter).replace(/_/g, ' ');
  return `${filtered} of ${total} employees will be exported (${filterName})`;
};
