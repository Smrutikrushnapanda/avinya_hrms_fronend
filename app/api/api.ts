import axios from "axios";
import { toast } from "sonner";

const fallbackURL = 'https://hrms-backend-346486007446.asia-south1.run.app';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || fallbackURL,
  timeout: 15000,
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
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
export const getDashboardStats = () => api.get("/employees/dashboard-stats");
export const createEmployee = (data: any) => api.post("/employees", data);
export const getEmployees = (organizationId: string) => api.get("/employees", { params: { organizationId } });
export const getEmployee = (id: string) => api.get(`/employees/${id}`);
export const updateEmployee = (id: string, data: any) => api.put(`/employees/${id}`, data);
export const deleteEmployee = (id: string) => api.delete(`/employees/${id}`);
export const getEmployeeByUserId = (userId: string) => api.get(`/employees/by-user/${userId}`);

// 🎂 Birthday APIs (New)
export const getEmployeeBirthdays = async (organizationId: string) => {
  try {
    // Try to get real birthday data from employees
    const response = await api.get("/employees", { params: { organizationId } });
    const employees = response.data || [];
    
    // Extract birthday information from employee data
    const birthdayData = employees
      .filter((emp: any) => emp.dateOfBirth)
      .map((emp: any) => ({
        id: emp.id,
        name: `${emp.firstName} ${emp.lastName || ''}`.trim(),
        department: emp.department?.name || 'Unknown',
        date: new Date(emp.dateOfBirth),
        avatar: emp.photoUrl,
        email: emp.workEmail,
      }));
    
    return { data: birthdayData };
  } catch (error) {
    console.error("Failed to fetch employee birthdays:", error);
    // Fallback to mock data if API fails
    return {
      data: [
        { id: '1', name: 'John Doe', department: 'Engineering', date: new Date(), avatar: null },
        { id: '2', name: 'Jane Smith', department: 'HR', date: new Date(Date.now() + 86400000), avatar: null },
        { id: '3', name: 'Mike Johnson', department: 'Sales', date: new Date(Date.now() + 259200000), avatar: null },
        { id: '4', name: 'Sarah Wilson', department: 'Marketing', date: new Date(Date.now() + 604800000), avatar: null },
      ]
    };
  }
};

// 🏢 Department & Designation APIs (Mock implementation)
export const getDepartments = async (organizationId: string) => {
  try {
    return {
      data: [
        { id: "1", name: "Engineering", code: "ENG", organizationId },
        { id: "2", name: "Human Resources", code: "HR", organizationId },
        { id: "3", name: "Finance", code: "FIN", organizationId },
        { id: "4", name: "Marketing", code: "MKT", organizationId },
        { id: "5", name: "Sales", code: "SALES", organizationId },
        { id: "6", name: "Operations", code: "OPS", organizationId },
        { id: "7", name: "IT Support", code: "IT", organizationId },
      ]
    };
  } catch (error) {
    console.error("Failed to fetch departments:", error);
    throw error;
  }
};

export const getDesignations = async (organizationId: string) => {
  try {
    return {
      data: [
        { id: "1", name: "Software Engineer", code: "SWE", organizationId },
        { id: "2", name: "Senior Software Engineer", code: "SSE", organizationId },
        { id: "3", name: "Team Lead", code: "TL", organizationId },
        { id: "4", name: "Manager", code: "MGR", organizationId },
        { id: "5", name: "Senior Manager", code: "SMGR", organizationId },
        { id: "6", name: "HR Specialist", code: "HRS", organizationId },
        { id: "7", name: "Accountant", code: "ACC", organizationId },
        { id: "8", name: "Marketing Executive", code: "MKE", organizationId },
        { id: "9", name: "Sales Representative", code: "SR", organizationId },
        { id: "10", name: "Operations Executive", code: "OE", organizationId },
      ]
    };
  } catch (error) {
    console.error("Failed to fetch designations:", error);
    throw error;
  }
};

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

// 💰 Payroll report (Mock - no API yet)
export const getPayrollReport = async (params: any) => {
  console.warn('Payroll report API not implemented, using mock data');
  return {
    data: {
      success: true,
      data: [],
      total: 0,
    }
  };
};

// 📈 Performance report (Mock - no API yet)
export const getPerformanceReport = async (params: any) => {
  console.warn('Performance report API not implemented, using mock data');
  return {
    data: {
      success: true,
      data: [],
      total: 0,
    }
  };
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

// 📢 Notice APIs
export const getActiveNotices = () => api.get("/notices/active");
export const createNotice = (data: any) => api.post("/notices", data);
export const getNotices = () => api.get("/notices");

// ⚙️ Common APIs
export const uploadFile = (data: any, params?: any) => api.post("/common/upload", data, { params });
export const getCurrentTime = () => api.get("/common/time/now");

// Export the axios instance as default and named export
export { api };
export default api;
