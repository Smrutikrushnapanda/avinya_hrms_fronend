import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format, parseISO } from 'date-fns';

interface DailyRecord {
  date: string;
  status: string;
  inTime: string | null;
  outTime: string | null;
  workingHours: number;
  isHoliday: boolean;
  isSunday: boolean;
}

interface EmployeeReport {
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
  dailyRecords: DailyRecord[];
}

interface ReportData {
  reportData: EmployeeReport[];
  summary: {
    totalEmployees: number;
    period: string;
    workingDays: number;
    holidays: number;
  };
}

function getStatusShortCode(record: DailyRecord): string {
  if (record.isHoliday || record.isSunday) return 'H';
  switch (record.status) {
    case 'present': return 'P';
    case 'half-day': return 'HD';
    case 'absent': return 'A';
    case 'on-leave': return 'L';
    case 'pending': return '-';
    default: return 'A';
  }
}

export function exportAttendanceReportToPdf(data: ReportData, period: string): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Title
  doc.setFontSize(16);
  doc.setTextColor(30, 60, 120);
  doc.text(`Attendance Report — ${period}`, pageWidth / 2, 15, { align: 'center' });

  // Summary line
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text(
    `Employees: ${data.summary.totalEmployees}  |  Working Days: ${data.summary.workingDays}  |  Holidays: ${data.summary.holidays}`,
    pageWidth / 2,
    22,
    { align: 'center' }
  );

  // Collect all unique dates across all employees
  const allDates = Array.from(
    new Set(data.reportData.flatMap((u) => u.dailyRecords.map((r) => r.date)))
  ).sort();

  const dateHeaders = allDates.map((d) => {
    try {
      return format(parseISO(d), 'dd');
    } catch {
      return d.slice(-2);
    }
  });

  // Table headers
  const head = [
    [
      'Code',
      'Name',
      'Department',
      'Designation',
      ...dateHeaders,
      'Work Days',
      'LOP',
      'Att %',
    ],
  ];

  // Table body
  const body = data.reportData.map((user) => {
    const dayCells = allDates.map((date) => {
      const rec = user.dailyRecords.find((r) => r.date === date);
      return rec ? getStatusShortCode(rec) : 'A';
    });
    return [
      user.employeeCode || '—',
      user.userName || '—',
      user.department || '—',
      user.designation || '—',
      ...dayCells,
      String(user.presentDays + user.halfDays),
      String(user.absentDays || 0),
      `${user.attendancePercentage || 0}%`,
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 28,
    styles: {
      fontSize: 6,
      cellPadding: 1.5,
      overflow: 'linebreak',
      halign: 'center',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [44, 82, 150],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6,
    },
    columnStyles: {
      0: { cellWidth: 16, halign: 'left' },  // Code
      1: { cellWidth: 32, halign: 'left' },  // Name
      2: { cellWidth: 22, halign: 'left' },  // Department
      3: { cellWidth: 22, halign: 'left' },  // Designation
    },
    didParseCell: (hookData) => {
      const colIdx = hookData.column.index;
      // Status columns start at index 4
      if (colIdx >= 4 && colIdx < 4 + allDates.length) {
        const val = String(hookData.cell.raw);
        switch (val) {
          case 'P':
            hookData.cell.styles.textColor = [0, 97, 0];
            hookData.cell.styles.fontStyle = 'bold';
            break;
          case 'A':
            hookData.cell.styles.textColor = [156, 0, 6];
            hookData.cell.styles.fontStyle = 'bold';
            break;
          case 'H':
            hookData.cell.styles.textColor = [0, 100, 180];
            hookData.cell.styles.fontStyle = 'bold';
            break;
          case 'L':
            hookData.cell.styles.textColor = [198, 89, 17];
            hookData.cell.styles.fontStyle = 'bold';
            break;
          case 'HD':
            hookData.cell.styles.textColor = [226, 107, 10];
            hookData.cell.styles.fontStyle = 'bold';
            break;
        }
      }
    },
    margin: { top: 28, left: 8, right: 8 },
  });

  // Legend on last page
  const totalPages = doc.getNumberOfPages();
  doc.setPage(totalPages);
  const finalY = (doc as any).lastAutoTable?.finalY || 28;
  const legendY = Math.min(finalY + 8, doc.internal.pageSize.getHeight() - 12);

  doc.setFontSize(7);
  doc.setTextColor(80, 80, 80);
  const legendItems = [
    { code: 'P', label: 'Present', color: [0, 97, 0] },
    { code: 'A', label: 'Absent', color: [156, 0, 6] },
    { code: 'H', label: 'Holiday/Weekend', color: [0, 100, 180] },
    { code: 'L', label: 'Leave', color: [198, 89, 17] },
    { code: 'HD', label: 'Half Day', color: [226, 107, 10] },
  ];
  let legendX = 10;
  legendItems.forEach((item) => {
    const [r, g, b] = item.color;
    doc.setTextColor(r, g, b);
    doc.text(item.code, legendX, legendY);
    doc.setTextColor(100, 100, 100);
    doc.text(`=${item.label}`, legendX + 8, legendY);
    legendX += 40;
  });

  // Footer
  doc.setFontSize(6);
  doc.setTextColor(150, 150, 150);
  doc.text(
    `Generated on ${format(new Date(), 'dd MMM yyyy HH:mm')}`,
    pageWidth - 10,
    doc.internal.pageSize.getHeight() - 5,
    { align: 'right' }
  );

  const fileName = `Attendance_Report_${period.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
  doc.save(fileName);
}
