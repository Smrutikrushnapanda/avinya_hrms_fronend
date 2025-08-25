export interface Widget {
  id: string;
  title: string;
  isEnabled: boolean;
  category: 'stats' | 'charts' | 'activities' | 'notifications';
}

export const DEFAULT_WIDGETS: Widget[] = [
  { id: 'dashboard-stats', title: 'Dashboard Statistics', isEnabled: true, category: 'stats' },
  { id: 'employee-list', title: 'Employee Overview', isEnabled: true, category: 'stats' },
  { id: 'attendance-today', title: "Today's Attendance", isEnabled: true, category: 'stats' },
  { id: 'leave-requests', title: 'Leave Requests', isEnabled: true, category: 'activities' },
  { id: 'active-polls', title: 'Active Polls', isEnabled: true, category: 'notifications' },
  { id: 'company-notices', title: 'Company Notices', isEnabled: true, category: 'notifications' },
  { id: 'birthday-tracker', title: 'Birthday Tracker', isEnabled: true, category: 'notifications' },
  { id: 'department-breakdown', title: 'Department Breakdown', isEnabled: true, category: 'charts' },
  { id: 'attendance-trends', title: 'Attendance Trends', isEnabled: true, category: 'charts' },
  { id: 'user-activities', title: 'Recent Activities', isEnabled: true, category: 'activities' },
  { id: 'attendance-anomalies', title: 'Attendance Anomalies', isEnabled: true, category: 'notifications' }
];
