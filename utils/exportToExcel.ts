import * as XLSX from 'xlsx';

export interface ExportFields {
  basic: boolean;
  contact: boolean;
  employment: boolean;
  emergency: boolean;
}

export const exportEmployeesToExcel = (employees: any[], selectedFields: ExportFields, format: string = 'excel') => {
  const rows = employees.map(emp => {
    const row: any = {};
    
    if (selectedFields.basic) {
      row['Employee ID'] = emp.id || '';
      row['Employee Code'] = emp.employeeCode || '';
      row['First Name'] = emp.firstName || '';
      row['Middle Name'] = emp.middleName || '';
      row['Last Name'] = emp.lastName || '';
      row['Full Name'] = `${emp.firstName || ''} ${emp.middleName || ''} ${emp.lastName || ''}`.trim();
      row['Gender'] = emp.gender || '';
      row['Date of Birth'] = emp.dateOfBirth ? new Date(emp.dateOfBirth).toLocaleDateString() : '';
      row['Joining Date'] = emp.dateOfJoining ? new Date(emp.dateOfJoining).toLocaleDateString() : '';
      row['Blood Group'] = emp.bloodGroup || '';
    }
    
    if (selectedFields.contact) {
      row['Work Email'] = emp.workEmail || '';
      row['Personal Email'] = emp.personalEmail || '';
      row['Contact Number'] = emp.contactNumber || '';
    }
    
    if (selectedFields.employment) {
      row['Department'] = emp.department?.name || 'Not Assigned';
      row['Designation'] = emp.designation?.name || 'Not Assigned';
      row['Manager'] = emp.manager ? `${emp.manager.firstName} ${emp.manager.lastName || ''}` : 'No Manager';
      row['Employment Type'] = emp.employmentType || '';
      row['Status'] = emp.status || '';
    }
    
    if (selectedFields.emergency) {
      row['Emergency Contact Name'] = emp.emergencyContactName || '';
      row['Emergency Contact Relationship'] = emp.emergencyContactRelationship || '';
      row['Emergency Contact Phone'] = emp.emergencyContactPhone || '';
    }
    
    return row;
  });

  if (rows.length === 0) {
    throw new Error('No data to export');
  }

  // Create worksheet with proper formatting
  const worksheet = XLSX.utils.json_to_sheet(rows);
  
  // Auto-size columns
  const colWidths = Object.keys(rows[0] || {}).map(key => ({
    wch: Math.max(key.length, ...rows.map(row => String(row[key] || '').length)) + 2
  }));
  worksheet['!cols'] = colWidths;
  
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employee Report');

  // Generate file based on format
  const timestamp = new Date().toISOString().slice(0, 10);
  
  if (format === 'csv') {
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Employee_Report_${timestamp}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } else {
    // Excel format
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `Employee_Report_${timestamp}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
};
