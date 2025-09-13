import axios from "axios";
import { toast } from "sonner";

const fallbackURL = 'https://hrms-backend-346486007446.asia-south1.run.app';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || fallbackURL,
  timeout: 10000,
  withCredentials: true,
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error("Unauthorized - Redirect to login");
    }
    return Promise.reject(error);
  }
);

// 🏢 Organization APIs
export const getOrganizations = () => api.get("/organizations");
export const createOrganization = (data: any) => api.post("/organizations", data);
export const updateOrganization = (id: string, data: any) => api.put(`/organizations/${id}`, data);
export const getOrganization = (id: string) => api.get(`/organizations/${id}`);

// 🔑 Authentication APIs
export const login = (data: any) => api.post("/auth/login", data);
export const logout = () => api.post("/auth/logout");
export const getProfile = () => api.get("/auth/profile");

// 👥 User Management APIs
export const register = (data: any) => api.post('/users/register', data);
export const createUser = (data: any) => api.post("/users", data);
export const getUsers = (params?: any) => api.get("/users", { params });
export const getUser = (userId: string) => api.get(`/users/${userId}`);
export const updateUser = (userId: string, data: any) => api.patch(`/users/${userId}`, data);
export const deleteUser = (userId: string) => api.delete(`/users/${userId}`);
export const findUserByDob = (data: any) => api.post("/users/useridbydob", data);

// 📜 Role Management APIs
export const createRole = (data: any) => api.post("/roles", data);
export const getRoles = () => api.get("/roles");
export const getRole = (id: string) => api.get(`/roles/${id}`);
export const assignRole = (data: any) => api.post("/roles/assign", data);
export const assignDefaultRole = (data: any) => api.post("/roles/assign-default", data);
export const getOrgRoles = (orgId: string) => api.get(`/roles/organization/${orgId}`);

// 👥 Employee Management APIs
export const getDashboardStats = (organizationId?: string) => {
  if (organizationId) {
    return api.get("/employees/dashboard-stats", { 
      params: { organizationId } 
    });
  }
  return api.get("/employees/dashboard-stats");
};

export const createEmployee = (data: any) => api.post("/employees", data);
export const getEmployees = (organizationId: string) => api.get("/employees", { params: { organizationId } });
export const getEmployee = (id: string) => api.get(`/employees/${id}`);
export const updateEmployee = (id: string, data: any) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id: string) => api.delete(`/employees/${id}`);
export const getEmployeeByUserId = (userId: string) => api.get(`/employees/by-user/${userId}`);

// 🎂 Birthday APIs (Updated - Real API)
export const getEmployeeBirthdays = (organizationId: string, days: number = 30) => 
  api.get("/employees/birthdays/upcoming", { 
    params: { organizationId, days } 
  });

// 🏢 Department & Designation APIs (Updated - Real APIs)
export const getDepartments = (organizationId: string) => 
  api.get("/departments", { params: { organizationId } });

export const getDesignations = (organizationId: string) => 
  api.get("/designations", { params: { organizationId } });

// 📊 Department Statistics API (New)
export const getDepartmentStatistics = (organizationId: string) => 
  api.get("/departments/statistics", { params: { organizationId } });

// 🚀 NEW: Single Dashboard Summary API
export const getDashboardSummary = () => api.get("/dashboard/summary");

// 🕒 Attendance APIs
export const createWifiLocation = (data: any) => api.post("/attendance/wifi-locations", data);
export const registerDevice = (data: any) => api.post("/attendance/devices", data);
export const logAttendance = (data: any) => api.post("/attendance/log", data);
export const getTodayLogs = (params: any) => api.get("/attendance/today-logs", { params });
export const getAttendanceSummary = (userId: string, params: any) => api.get(`/attendance/summary/${userId}`, { params });
export const getMonthlyAttendance = (params: any) => api.get("/attendance/monthly", { params });
export const getDailyStats = (params: any) => api.get("/attendance/daily-stats", { params });
export const getHolidays = (params: any) => api.get("/attendance/holidays/financial-year", { params });
export const getAttendanceByDate = (params: any) => api.get("/attendance/by-date", { params });
export const processDailySummary = (params?: any) => api.post("/attendance/process-daily-summary", {}, { params });
export const getTodayAnomalies = () => api.get("/attendance/anomalies/today");

// 🕒 Enhanced attendance report fetcher
export const getAttendanceReport = async (params: {
  organizationId: string;
  fromDate: string;
  toDate: string;
  search?: string;
  status?: string;
}) => {
  const endpoints = [
    '/attendance/by-date',
    '/attendance/monthly',
    '/attendance/today-logs',
    '/attendance/summary'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying attendance endpoint: ${endpoint}`);
      
      let apiParams: any = { ...params };
      
      if (endpoint === '/attendance/by-date') {
        apiParams = {
          organizationId: params.organizationId,
          date: params.fromDate,
          search: params.search,
          status: params.status,
          page: 1,
          limit: 100,
        };
      } else if (endpoint === '/attendance/monthly') {
        const date = new Date(params.fromDate);
        apiParams = {
          organizationId: params.organizationId,
          month: date.getMonth() + 1,
          year: date.getFullYear(),
        };
      } else if (endpoint === '/attendance/today-logs') {
        apiParams = {
          organizationId: params.organizationId,
          userId: 'all',
        };
      }

      const response = await api.get(endpoint, { params: apiParams });
      
      if (response.data && 
          ((Array.isArray(response.data) && response.data.length > 0) ||
           (response.data.results && response.data.results.length > 0) ||
           (response.data.data && response.data.data.length > 0))) {
        console.log(`Success with endpoint: ${endpoint}`, response.data);
        return response;
      }
    } catch (error: any) {
      console.log(`Failed endpoint ${endpoint}:`, error.message);
      continue;
    }
  }

  console.log('All attendance endpoints failed, returning empty data');
  return { data: { results: [], data: [] } };
};

// ✈️ Leave Management APIs
export const getLeaveTypes = (orgId: string) => api.get(`/leave/types/${orgId}`);
export const getLeaveBalance = (userId: string) => api.get(`/leave/balance/${userId}`);
export const applyLeave = (userId: string, data: any) => api.post(`/leave/apply/${userId}`, data);
export const approveLeave = (requestId: string, approverId: string, data: any) => api.post(`/leave/approve/${requestId}/${approverId}`, data);
export const getPendingLeaves = (approverId: string) => api.get(`/leave/pending/${approverId}`);

// ✈️ Enhanced leave report fetcher
export const getLeaveReport = async (params: {
  organizationId: string;
  fromDate: string;
  toDate: string;
}) => {
  const endpoints = [
    '/leave/reports',
    '/leave/requests', 
    '/leave/history',
    '/leave/pending'
  ];

  for (const endpoint of endpoints) {
    try {
      console.log(`Trying leave endpoint: ${endpoint}`);
      const response = await api.get(endpoint, { params });
      
      if (response.data && 
          ((Array.isArray(response.data) && response.data.length > 0) ||
           (response.data.results && response.data.results.length > 0) ||
           (response.data.data && response.data.data.length > 0))) {
        console.log(`Success with leave endpoint: ${endpoint}`);
        return response;
      }
    } catch (error: any) {
      console.log(`Failed leave endpoint ${endpoint}:`, error.message);
      continue;
    }
  }

  console.log('All leave endpoints failed, returning empty data');
  return { data: [] };
};

// 📝 User Activities APIs
export const createUserActivity = (data: any) => api.post("/user-activities", data);
export const getUserActivities = (params?: any) => api.get("/user-activities", { params });

// 📊 Polls APIs
export const saveResponse = (data: any) => api.post("/polls/save-response", data);
export const createPoll = (data: any) => api.post("/polls", data);
export const getPolls = () => api.get("/polls");
export const getActivePoll = (userId?: string) => api.get("/polls/active", { params: { userId } });
export const getPoll = (id: string) => api.get(`/polls/${id}`);
export const addQuestion = (id: string, data: any) => api.post(`/polls/${id}/questions`, data);
export const getQuestions = (id: string) => api.get(`/polls/${id}/questions`);
export const getPollAnalytics = (pollId: string) => api.get(`/polls/${pollId}/analytics`);
export const getPollsSummary = () => api.get("/polls/summary");
export const getActivePollsWithAnalytics = () => api.get("/polls/active-with-analytics");



// 📢 Notice APIs
export const getActiveNotices = () => api.get("/notices/active");
export const createNotice = (data: any) => api.post("/notices", data);
export const getNotices = () => api.get("/notices");

// ⚙️ Common APIs
export const uploadFile = (data: any, params?: any) => api.post("/common/upload", data, { params });
export const getCurrentTime = () => api.get("/common/time/now");

// 🚀 NEW: Single Employee Management API
export const getEmployeeManagementData = (params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  department?: string;
  designation?: string;
  joinDateFilter?: string;
  sortBy?: string;
  sortOrder?: string;
}) => api.get("/dashboard/employees", { params });

export const getAttendanceReport2 = (params: {
  organizationId: string;
  year: number;
  month: number;
  userIds?: string;
}) => api.get("/attendance/report", { params });

// 🔄 Workflow Management APIs
export const getWorkflows = () => api.get("/workflows");
export const getWorkflow = (id: string) => api.get(`/workflows/${id}`);
export const createWorkflow = (data: any) => api.post("/workflows", data);
export const updateWorkflow = (id: string, data: any) => api.put(`/workflows/${id}`, data);
export const deleteWorkflow = (id: string) => api.delete(`/workflows/${id}`);

// Workflow Steps APIs
export const addWorkflowStep = (workflowId: string, data: any) => api.post(`/workflows/${workflowId}/steps`, data);
export const updateWorkflowStep = (stepId: string, data: any) => api.put(`/workflows/steps/${stepId}`, data);
export const deleteWorkflowStep = (stepId: string) => api.delete(`/workflows/steps/${stepId}`);

// Workflow Assignment APIs  
export const addWorkflowAssignment = (stepId: string, data: any) => api.post(`/workflows/steps/${stepId}/assignments`, data);
export const updateWorkflowAssignment = (id: string, data: any) => api.put(`/workflows/assignments/${id}`, data);
export const deleteWorkflowAssignment = (id: string) => api.delete(`/workflows/assignments/${id}`);

// 🕐 Timeslip APIs
export const createTimeslip = (data: any) => api.post("/timeslips", data);
export const getTimeslips = () => api.get("/timeslips");
export const getTimeslipsByEmployee = (employeeId: string, params?: any) => 
  api.get(`/timeslips/employee/${employeeId}`, { params });
export const getTimeslip = (id: string) => api.get(`/timeslips/${id}`);
export const updateTimeslip = (id: string, data: any) => api.patch(`/timeslips/${id}`, data);
export const deleteTimeslip = (id: string) => api.delete(`/timeslips/${id}`);
export const approveTimeslip = (id: string, data: any) => api.post(`/timeslips/${id}/approve`, data);
export const getTimeslipsByApprover = (approverId: string, params?: { 
  status?: string; 
  page?: number; 
  limit?: number; 
}) => api.get(`/timeslips/approver/${approverId}`, { params });
export const updateStepApprover = (stepId: string, approverId: string) =>
  api.put(`/workflows/steps/${stepId}/approver`, { approverId });


// Employee List API (for HR to select approvers)
export const getEmployeesList = (organizationId: string) => api.get(`/employees?organizationId=${organizationId}`);

// Export the axios instance as default and named export
export { api };
export default api;
