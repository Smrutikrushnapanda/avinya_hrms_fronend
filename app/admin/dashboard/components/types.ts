export interface Widget {
  id: string;
  title: string;
  isEnabled: boolean;
  hasAPI: boolean;
  isImportant: boolean;
  category: 'stats' | 'charts' | 'activities' | 'notifications';
}

export const DEFAULT_WIDGETS: Widget[] = [
  { id: 'dashboard-stats', title: 'Dashboard Statistics', isEnabled: true, hasAPI: true, isImportant: true, category: 'stats' },
  { id: 'employee-list', title: 'Employee Overview', isEnabled: true, hasAPI: true, isImportant: true, category: 'stats' },
  { id: 'attendance-today', title: "Today's Attendance", isEnabled: true, hasAPI: true, isImportant: true, category: 'stats' },
  { id: 'leave-requests', title: 'Leave Requests', isEnabled: true, hasAPI: true, isImportant: true, category: 'activities' },
  { id: 'active-polls', title: 'Active Polls', isEnabled: true, hasAPI: true, isImportant: true, category: 'notifications' },
  { id: 'company-notices', title: 'Company Notices', isEnabled: true, hasAPI: true, isImportant: true, category: 'notifications' },
  { id: 'birthday-tracker', title: 'Birthday Tracker', isEnabled: true, hasAPI: true, isImportant: false, category: 'notifications' },
  { id: 'department-breakdown', title: 'Department Breakdown', isEnabled: true, hasAPI: true, isImportant: true, category: 'charts' },
  { id: 'attendance-trends', title: 'Attendance Trends', isEnabled: true, hasAPI: true, isImportant: false, category: 'charts' },
  { id: 'user-activities', title: 'Recent Activities', isEnabled: true, hasAPI: true, isImportant: false, category: 'activities' },
  { id: 'attendance-anomalies', title: 'Attendance Anomalies', isEnabled: true, hasAPI: true, isImportant: true, category: 'notifications' }
];
