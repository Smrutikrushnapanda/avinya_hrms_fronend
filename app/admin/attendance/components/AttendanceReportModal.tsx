'use client';

import React, { useState, useEffect } from 'react';
import { X, FileText, Download, Calendar, Filter } from 'lucide-react';
import { getAttendanceReport2 } from '@/app/api/api'
import { exportAttendanceReport } from '@/utils/exportToExcel'
import { Button } from '@/components/ui/button'

interface AttendanceReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  organizationId: string;
}

interface ReportData {
  reportData: Array<{
    userId: string;
    userName: string;
    email: string;
    employeeCode: string;
    department?: string;        
  designation?: string;       
  reportingTo?: string;       
    totalWorkingDays: number;
    presentDays: number;
    absentDays: number;
    halfDays: number;
    onLeaveDays: number;
    attendancePercentage: number;
    totalWorkingHours: number;
    averageWorkingHours: number;
    dailyRecords: Array<{
      date: string;
      status: string;
      inTime: string | null;
      outTime: string | null;
      workingHours: number;
      isHoliday: boolean;
      isSunday: boolean;
    }>;
  }>;
  summary: {
    totalEmployees: number;
    period: string;
    workingDays: number;
    holidays: number;
  };
}

export default function AttendanceReportModal({
  isOpen,
  onClose,
  organizationId,
}: AttendanceReportModalProps) {
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [month, setMonth] = useState<number>(new Date().getMonth() + 1);
  const [exportFormat, setExportFormat] = useState<'excel' | 'csv'>('excel');
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [showAnimation, setShowAnimation] = useState(false);

  // Generate year options (current year and 2 years back)
  const yearOptions = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  // Month options
  const currentYear = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const monthOptions = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
].filter(monthOption => {
  // If selected year is current year, only show months up to current month
  // If selected year is previous year, show all 12 months
  return year === currentYear ? monthOption.value <= currentMonth : true;
});
  // Generate report function
  const generateReport = async () => {
    if (!organizationId) return;
    
    setLoading(true);
    setReportData(null);
    setShowAnimation(false);
    
    try {
      const response = await getAttendanceReport2({
        organizationId,
        year,
        month,
        userIds: 'ALL', // Always select ALL by default
      });

      if (response.data) {
        setReportData(response.data);
        // Trigger animation after data is loaded
        setTimeout(() => setShowAnimation(true), 100);
        // Stop animation after 1 second
        setTimeout(() => setShowAnimation(false), 1100);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Failed to generate report. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Auto-generate report when month/year changes or modal opens
  useEffect(() => {
    if (isOpen && organizationId) {
      generateReport();
    }
  }, [year, month, isOpen, organizationId]);

  // Format data for export with full status names
// Update the formatDataForExport function in AttendanceReportModal
const formatDataForExport = (data: ReportData) => {
  if (!data || !data.reportData) return [];

  const allDates = [...new Set(
    data.reportData.flatMap(user => user.dailyRecords.map(record => record.date))
  )].sort();

  return data.reportData.map(user => {
    const row: any = {
      'Employee Code': user.employeeCode || 'N/A',
      'Employee Name': user.userName || 'N/A', 
      'Department': user.department || 'N/A', // Now from backend
      'Designation': user.designation || 'N/A', // Now from backend
      'Reporting To': user.reportingTo || 'N/A', // Now from backend
    };

    // Add daily attendance columns with short codes
    allDates.forEach(date => {
      const record = user.dailyRecords.find(r => r.date === date);
      if (record) {
        let status = 'A'; // Default absent
        
        // Check boolean flags first for holidays and weekends
        if (record.isHoliday || record.isSunday) {
          status = 'H'; // Both Holiday and Weekend show as H in blue
        } else {
          // Check other status types
          switch (record.status) {
            case 'present':
              status = 'P';
              break;
            case 'half-day':
              status = 'HD'; // Half Day
              break;
            case 'absent':
              status = 'A';
              break;
            case 'on-leave':
              status = 'L';
              break;
            case 'pending':
              status = '-';
              break;
            default:
              status = 'A';
          }
        }
        row[date] = status;
      } else {
        row[date] = 'A';
      }
    });

    // Add summary columns
    row['Total Working Days'] = user.presentDays + user.halfDays; // Half day counts as working
    row['Total LOP'] = user.absentDays || 0; // Loss of Pay days
    row['Attendance %'] = user.attendancePercentage ? `${user.attendancePercentage}%` : '0%';

    return row;
  });
};




  // Export report
  const handleExport = () => {
    if (!reportData) return;

    const exportData = formatDataForExport(reportData);
    const period = `${monthOptions.find(m => m.value === month)?.label}_${year}`;
    
    exportAttendanceReport(exportData, period, exportFormat);
  };

  // Check if export should be enabled
  const hasData = reportData && reportData.reportData && reportData.reportData.length > 0;

  if (!isOpen) return null;

  return (
    <>
      {/* Add vibration animation styles */}
      <style jsx>{`
        @keyframes vibrate {
          0%, 100% { transform: translate(0); }
          20%, 60% { transform: translate(-2px, 2px); }
          40%, 80% { transform: translate(2px, -2px); }
        }
        .animate-vibrate {
          animation: vibrate 0.3s ease-in-out 3;
        }
      `}</style>

      <div className="fixed inset-0 bg-gray-900/20 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-2xl max-w-3xl w-full mx-4 h-fit">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                Attendance Report
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Report Filters */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Report Filters</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                {/* Year Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    <Calendar className="inline h-4 w-4 mr-1" />
                    Year
                  </label>
                  <select
                    value={year}
                    onChange={(e) => setYear(parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    disabled={loading}
                  >
                    {yearOptions.map(yearOption => (
                      <option key={yearOption} value={yearOption}>
                        {yearOption}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Month Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Month
                  </label>
                  <select
                    value={month}
                    onChange={(e) => setMonth(parseInt(e.target.value))}
                    className="w-full px-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent"
                    disabled={loading}
                  >
                    {monthOptions.map(monthOption => (
                      <option key={monthOption.value} value={monthOption.value}>
                        {monthOption.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Report Summary */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Report Summary</h3>
              
              {loading ? (
                // Skeleton Loader
                <div className="grid grid-cols-4 gap-4">
                  {[...Array(4)].map((_, idx) => (
                    <div key={idx} className="p-4 bg-gray-200 dark:bg-gray-700 rounded-xl animate-pulse">
                      <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                      <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    </div>
                  ))}
                </div>
              ) : reportData && hasData ? (
                // Actual Data
                <div className="grid grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 rounded-xl">
                    <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">{reportData.summary.totalEmployees}</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Employees</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/30 dark:to-green-900/30 rounded-xl">
                    <div className="text-2xl font-bold text-green-700 dark:text-green-300">{reportData.summary.workingDays}</div>
                    <div className="text-sm text-green-600 dark:text-green-400 font-medium">Working Days</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 rounded-xl">
                    <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">{reportData.summary.holidays}</div>
                    <div className="text-sm text-orange-600 dark:text-orange-400 font-medium">Holidays</div>
                  </div>
                  <div className="text-center p-4 bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-900/30 rounded-xl">
                    <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">{reportData.summary.period}</div>
                    <div className="text-sm text-purple-600 dark:text-purple-400 font-medium">Period</div>
                  </div>
                </div>
              ) : (
                // No Data Message
                <div className="text-center py-8">
                  <div className="text-red-600 dark:text-red-400 font-semibold text-lg">No data available</div>
                  <div className="text-gray-500 dark:text-gray-400 text-sm mt-1">No attendance records found for the selected period</div>
                </div>
              )}
            </div>

            {/* Export Options */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Export Options</h3>
              
              <div className="flex items-center gap-6">
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="excel"
                    name="format"
                    value="excel"
                    checked={exportFormat === 'excel'}
                    onChange={(e) => setExportFormat(e.target.value as 'excel' | 'csv')}
                    className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600"
                    disabled={loading}
                  />
                  <label htmlFor="excel" className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    Excel (.xlsx)
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="radio"
                    id="csv"
                    name="format"
                    value="csv"
                    checked={exportFormat === 'csv'}
                    onChange={(e) => setExportFormat(e.target.value as 'excel' | 'csv')}
                    className="h-4 w-4 text-blue-600 dark:text-blue-400 focus:ring-blue-500 dark:focus:ring-blue-400 border-gray-300 dark:border-gray-600"
                    disabled={loading}
                  />
                  <label htmlFor="csv" className="ml-3 text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                    CSV (.csv)
                  </label>
                </div>
              </div>

              {/* Single Export Button */}
              <div className="pt-4">
                <Button
                  onClick={handleExport}
                  loading={loading}
                  disabled={!hasData}
                  className={`w-full py-3 px-6 rounded-lg font-medium transition-all duration-200 ${
                    hasData && !loading
                      ? `bg-green-600 dark:bg-green-700 hover:bg-green-700 dark:hover:bg-green-800 text-white ${showAnimation ? 'animate-vibrate' : ''}`
                      : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Download className="h-5 w-5" />
                  {!hasData ? 'No Data to Export' : 'Export'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
