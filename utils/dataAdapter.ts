import { format } from 'date-fns';

export interface AttendanceRecord {
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  email: string;
  department: string;
  designation: string;
  date: string;
  status: string;
  checkIn: string;
  checkOut: string;
  totalHours: string;
  workingMinutes: number;
  location: string;
  overtime: string;
  anomalyFlag: boolean;
  anomalyReason: string | null;
}

// Multi-format data adapter
export const adaptAttendanceData = (rawData: any): AttendanceRecord[] => {
  if (!rawData) return [];

  // Handle different response structures
  let dataArray: any[] = [];
  
  if (Array.isArray(rawData)) {
    dataArray = rawData;
  } else if (rawData.results && Array.isArray(rawData.results)) {
    dataArray = rawData.results;
  } else if (rawData.data && Array.isArray(rawData.data)) {
    dataArray = rawData.data;
  } else {
    console.warn('Unknown data format:', rawData);
    return [];
  }

  return dataArray.map((record: any) => {
    // Handle nested user object or flat structure
    const user = record.user || record;
    const employeeName = user.userName || 
      `${user.firstName || ''} ${user.middleName || ''} ${user.lastName || ''}`.trim() ||
      record.employeeName || 
      'Unknown Employee';

    const workingMinutes = record.workingMinutes || 0;
    const totalHours = workingMinutes > 0 ? (workingMinutes / 60).toFixed(2) : '0';
    const overtime = workingMinutes > 480 ? ((workingMinutes - 480) / 60).toFixed(2) : '0';

    return {
      employeeId: user.id || record.userId || record.employeeId || '',
      employeeName,
      employeeCode: record.employeeCode || 'N/A',
      email: user.email || record.email || '',
      department: record.department?.name || record.department || 'Not Assigned',
      designation: record.designation?.name || record.designation || 'Not Assigned',
      date: record.attendanceDate || record.date || format(new Date(), 'yyyy-MM-dd'),
      status: record.status || 'UNKNOWN',
      checkIn: record.inTime || record.checkIn || 'Not recorded',
      checkOut: record.outTime || record.checkOut || 'Not recorded',
      totalHours,
      workingMinutes,
      location: record.inLocationAddress || record.locationAddress || record.location || 'Office',
      overtime,
      anomalyFlag: record.anomalyFlag || false,
      anomalyReason: record.anomalyReason || null,
    };
  });
};

// Generate mock data when no real data exists
export const generateMockAttendanceData = (employees: any[], dateRange: { fromDate: string; toDate: string }): AttendanceRecord[] => {
  const mockStatuses = ['PRESENT', 'ABSENT', 'HALF_DAY'];
  const mockTimes = {
    PRESENT: { checkIn: '09:00 AM', checkOut: '06:00 PM', hours: '8.0', minutes: 480 },
    HALF_DAY: { checkIn: '09:00 AM', checkOut: '01:00 PM', hours: '4.0', minutes: 240 },
    ABSENT: { checkIn: '', checkOut: '', hours: '0.0', minutes: 0 },
  };

  return employees.slice(0, Math.min(employees.length, 20)).map((emp, index) => {
    const status = mockStatuses[index % mockStatuses.length] as keyof typeof mockTimes;
    const timeData = mockTimes[status];
    
    return {
      employeeId: emp.id,
      employeeName: `${emp.firstName} ${emp.lastName || ''}`,
      employeeCode: emp.employeeCode || `EMP${String(index + 1).padStart(3, '0')}`,
      email: emp.workEmail || emp.email || `employee${index + 1}@company.com`,
      department: emp.department?.name || 'Engineering',
      designation: emp.designation?.name || 'Software Engineer',
      date: dateRange.fromDate,
      status,
      checkIn: timeData.checkIn,
      checkOut: timeData.checkOut,
      totalHours: timeData.hours,
      workingMinutes: timeData.minutes,
      location: 'Office',
      overtime: timeData.minutes > 480 ? ((timeData.minutes - 480) / 60).toFixed(2) : '0',
      anomalyFlag: false,
      anomalyReason: null,
    };
  });
};
