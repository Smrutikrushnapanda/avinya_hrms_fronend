import axios from "axios";
import { toast } from "sonner";

const cloudFallbackURL = "https://avinya-hrms-backend-y6f5.onrender.com";
const envOverrideURL =
  process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_LOCAL_API_BASE_URL;

const apiBaseURL = envOverrideURL || cloudFallbackURL;

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("access_token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let isRedirectingToLogin = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const requestUrl = error.config?.url || "";
    const isAuthRoute = requestUrl.includes("/auth/login");

    if (error.response?.status === 401 && typeof window !== "undefined" && !isAuthRoute) {
      const isAdminRoute = window.location.pathname.startsWith("/admin");
      if (isAdminRoute) {
        if (!isRedirectingToLogin) {
          isRedirectingToLogin = true;
          localStorage.removeItem("access_token");
          localStorage.removeItem("user");
          toast.error("Session expired. Please sign in again.");
          window.location.href = "/signin";
        }
        return new Promise(() => {});
      }
    }
    return Promise.reject(error);
  }
);

// 🏢 Organization APIs
export const getOrganizations = () => api.get("/organizations");
export const createOrganization = (data: any) => api.post("/organizations", data);
export const updateOrganization = (id: string, data: any) => api.put(`/organizations/${id}`, data);
export const getOrganization = (id: string) => api.get(`/organizations/${id}`);
export const deleteOrganization = (id: string) => api.delete(`/organizations/${id}`);
export const changeOrgAdminCredentials = (id: string, data: { newUserName?: string; newPassword?: string }) =>
  api.put(`/organizations/${id}/credentials`, data);

// 📅 Holiday APIs
export const getHolidays = (params: { organizationId: string; fromYear?: number }) => {
  const now = new Date();
  const defaultFromYear =
    now.getMonth() < 3 ? now.getFullYear() - 1 : now.getFullYear();
  const finalParams = {
    organizationId: params.organizationId,
    fromYear: params.fromYear ?? defaultFromYear,
  };
  return api.get("/attendance/holidays/financial-year", { params: finalParams });
};
export const createHoliday = (data: any) => api.post("/attendance/holidays", data);
export const updateHoliday = (id: number, data: any) => api.put(`/attendance/holidays/${id}`, data);
export const deleteHoliday = (id: number) => api.delete(`/attendance/holidays/${id}`);

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
export const updateRole = (id: string, data: any) => api.put(`/roles/${id}`, data);
export const deleteRole = (id: string) => api.delete(`/roles/${id}`);
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
export const getEmployeeHierarchy = (organizationId: string, employeeId?: string) =>
  api.get("/employees/hierarchy", { params: { organizationId, employeeId } });

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

export const createDepartment = (data: any) => api.post("/departments", data);
export const updateDepartment = (id: string, data: any) => api.put(`/departments/${id}`, data);
export const deleteDepartment = (id: string) => api.delete(`/departments/${id}`);

export const createDesignation = (data: any) => api.post("/designations", data);
export const updateDesignation = (id: string, data: any) => api.put(`/designations/${id}`, data);
export const deleteDesignation = (id: string) => api.delete(`/designations/${id}`);

// 📊 Department Statistics API
export const getDepartmentStatistics = (organizationId: string) => 
  api.get("/departments/statistics", { params: { organizationId } });

// 🚀 NEW: Single Dashboard Summary API
export const getDashboardSummary = () => api.get("/dashboard/summary");

// 🕒 Attendance APIs
export const getAttendanceSettings = (organizationId: string) =>
  api.get("/attendance/settings", { params: { organizationId } });
export const updateAttendanceSettings = (organizationId: string, data: any) =>
  api.put("/attendance/settings", data, { params: { organizationId } });
export const createWifiLocation = (data: any) => api.post("/attendance/wifi-locations", data);
export const getWifiLocations = (organizationId: string) => api.get("/attendance/wifi-locations", { params: { organizationId } });
export const updateWifiLocation = (id: string, data: any) => api.put(`/attendance/wifi-locations/${id}`, data);
export const deleteWifiLocation = (id: string) => api.delete(`/attendance/wifi-locations/${id}`);
export const getBranches = (organizationId: string) => api.get("/attendance/branches", { params: { organizationId } });
export const createBranch = (data: any) => api.post("/attendance/branches", data);
export const updateBranch = (id: string, data: any) => api.put(`/attendance/branches/${id}`, data);
export const deleteBranch = (id: string) => api.delete(`/attendance/branches/${id}`);
export const registerDevice = (data: any) => api.post("/attendance/devices", data);
export const logAttendance = (data: any) => api.post("/attendance/log", data);
export const getTodayLogs = (params: any) => api.get("/attendance/today-logs", { params });
export const getAttendanceSummary = (userId: string, params: any) => api.get(`/attendance/summary/${userId}`, { params });
export const getMonthlyAttendance = (params: any) => api.get("/attendance/monthly", { params });
export const getDailyStats = (params: any) => api.get("/attendance/daily-stats", { params });
export const getAttendanceByDate = (params: any) => api.get("/attendance/by-date", { params });
export const processDailySummary = (params?: any) => api.post("/attendance/process-daily-summary", {}, { params });
export const getTodayAnomalies = () => api.get("/attendance/anomalies/today");

// 📝 Timesheet APIs
export const createTimesheet = (data: any) => api.post("/timesheets", data);
export const getTimesheets = (params: any) => api.get("/timesheets", { params });
export const addTimesheetRemark = (id: string, data: any) => api.patch(`/timesheets/${id}/remark`, data);

// 🧑‍💼 Client & Project APIs
export const getClients = (params: any) => api.get("/clients", { params });
export const createClient = (data: any) => api.post("/clients", data);
export const updateClient = (id: string, data: any) => api.put(`/clients/${id}`, data);
export const deleteClient = (id: string) => api.delete(`/clients/${id}`);

// Client-linked projects (under /client-projects)
export const getClientProjects = (params: any) => api.get("/client-projects", { params });
export const createClientProject = (data: any) => api.post("/client-projects", data);
export const updateClientProject = (id: string, data: any) => api.put(`/client-projects/${id}`, data);
export const deleteClientProject = (id: string) => api.delete(`/client-projects/${id}`);
export const getMyClientProjects = () => api.get("/client-projects/my");
export const updateClientProjectCompletion = (id: string, completionPercent: number) =>
  api.put(`/client-projects/${id}/completion`, { completionPercent });

// PM Projects (under /projects)
export const getProjects = (params?: any) => api.get("/projects", { params });
export const createProject = (data: any) => api.post("/projects", data);
export const updateProject = (id: string, data: any) => api.patch(`/projects/${id}`, data);
export const deleteProject = (id: string) => api.delete(`/projects/${id}`);
export const getMyProjects = () => api.get('/projects/my');
export const getProject = (id: string) => api.get(`/projects/${id}`);
export const assignProjectMembers = (id: string, userIds: string[]) =>
  api.post(`/projects/${id}/members`, { userIds });
export const removeProjectMember = (id: string, userId: string) =>
  api.delete(`/projects/${id}/members/${userId}`);

// Employee Assignment APIs (for managers to assign employees to projects)
export const getProjectEmployees = (id: string) => api.get(`/projects/${id}/employees`);
export const assignProjectEmployees = (id: string, userIds: string[]) =>
  api.post(`/projects/${id}/employees`, { userIds });
export const removeProjectEmployee = (id: string, userId: string) =>
  api.delete(`/projects/${id}/employees/${userId}`);
export const getMyTeamEmployees = () => api.get('/projects/managers/team');
export const getAllOrgEmployees = (params?: {
  search?: string;
  designationId?: string;
  limit?: number;
}) => api.get('/projects/org-employees', { params });

// Client Project Employee Assignment APIs
export const getClientProjectEmployees = (id: string) => api.get(`/client-projects/${id}/employees`);
export const assignClientProjectEmployees = (id: string, userIds: string[]) =>
  api.post(`/client-projects/${id}/employees`, { userIds });
export const removeClientProjectEmployee = (id: string, userId: string) =>
  api.delete(`/client-projects/${id}/employees/${userId}`);

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
export const getLeaveTypes = (orgId: string, gender?: string) =>
  api.get(`/leave/types/${orgId}`, gender ? { params: { gender } } : undefined);
export const createLeaveType = (data: any) => api.post(`/leave/types`, data);
export const updateLeaveType = (id: string, data: any) => api.put(`/leave/types/${id}`, data);
export const deleteLeaveType = (id: string) => api.delete(`/leave/types/${id}`);
export const getLeaveBalance = (userId: string) => api.get(`/leave/balance/${userId}`);
export const applyLeave = (userId: string, data: any) => api.post(`/leave/apply/${userId}`, data);
export const approveLeave = (requestId: string, approverId: string, data: any) => api.post(`/leave/approve/${requestId}/${approverId}`, data);
export const getPendingLeaves = (approverId: string) => api.get(`/leave/pending/${approverId}`);
export const getAllLeaveApprovals = (approverId: string) => api.get(`/leave/my-approvals/${approverId}`);
export const getLeaveRequests = (userId: string) => api.get(`/leave/requests/${userId}`);
export const getAllLeaveRequests = (orgId: string) => api.get(`/leave/all/${orgId}`);
export const createApprovalAssignment = (data: any) => api.post('/leave/approval-assignments', data);
export const getApprovalAssignments = (userId: string) => api.get(`/leave/approval-assignments/${userId}`);
export const getApprovalAssignmentsByOrg = (orgId: string) => api.get(`/leave/approval-assignments/org/${orgId}`);
export const deleteApprovalAssignment = (id: string) => api.delete(`/leave/approval-assignments/${id}`);
export const initializeLeaveBalance = (data: any) => api.post('/leave/balance/initialize', data);
export const setLeaveBalanceTemplates = (data: any) => api.post('/leave/balance-templates', data);
export const getLeaveBalanceTemplates = (orgId: string, employmentType?: string) =>
  api.get(`/leave/balance-templates/${orgId}`, { params: { employmentType } });

// 🏠 WFH Management APIs
export const applyWfh = (userId: string, data: any) => api.post(`/wfh/apply/${userId}`, data);
export const approveWfh = (requestId: string, approverId: string, data: any) => api.post(`/wfh/approve/${requestId}/${approverId}`, data);
export const getPendingWfh = (approverId: string) => api.get(`/wfh/pending/${approverId}`);
export const getWfhRequests = (userId: string) => api.get(`/wfh/requests/${userId}`);
export const getAllWfhRequests = (orgId: string) => api.get(`/wfh/all/${orgId}`);
export const getAllWfhApprovals = (approverId: string) => api.get(`/wfh/my-approvals/${approverId}`);
export const createWfhAssignment = (data: any) => api.post('/wfh/approval-assignments', data);
export const getWfhAssignments = (userId: string) => api.get(`/wfh/approval-assignments/${userId}`);
export const getWfhAssignmentsByOrg = (orgId: string) => api.get(`/wfh/approval-assignments/org/${orgId}`);
export const deleteWfhAssignment = (id: string) => api.delete(`/wfh/approval-assignments/${id}`);
export const getWfhBalance = (userId: string) => api.get(`/wfh/balance/${userId}`);
export const initializeWfhBalance = (data: any) => api.post('/wfh/balance/initialize', data);
export const setWfhBalanceTemplates = (data: any) => api.post('/wfh/balance-templates', data);
export const getWfhBalanceTemplates = (orgId: string, employmentType?: string) =>
  api.get(`/wfh/balance-templates/${orgId}`, { params: { employmentType } });

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
export const deletePoll = (id: string) => api.delete(`/polls/${id}`);
export const updatePoll = (id: string, data: any) => api.patch(`/polls/${id}`, data);
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

// 📝 Posts/Community APIs
export const getPosts = (organizationId: string) => api.get("/posts", { params: { organizationId } });
export const getLatestPosts = (params: { organizationId?: string; limit?: number }) => api.get("/posts/latest", { params });
export const getPost = (id: string) => api.get(`/posts/${id}`);
export const createPost = (data: {
  content: string;
  imageUrl?: string;
  postType?: string;
  authorId: string;
  organizationId: string;
  isPinned?: boolean;
}) => api.post("/posts", data);
export const updatePost = (id: string, data: {
  content?: string;
  imageUrl?: string;
  postType?: string;
  isPinned?: boolean;
}) => api.put(`/posts/${id}`, data);
export const deletePost = (id: string) => api.delete(`/posts/${id}`);
export const likePost = (postId: string, userId: string) => api.post(`/posts/${postId}/like`, { userId });
export const unlikePost = (postId: string, userId: string) => api.delete(`/posts/${postId}/like`, { params: { userId } });
export const getPostLikes = (postId: string) => api.get(`/posts/${postId}/likes`);
export const hasUserLiked = (postId: string, userId: string) => api.get(`/posts/${postId}/liked`, { params: { userId } });
export const commentPost = (postId: string, data: { userId: string; content: string }) => api.post(`/posts/${postId}/comments`, data);
export const getPostComments = (postId: string) => api.get(`/posts/${postId}/comments`);
export const deleteComment = (commentId: string) => api.delete(`/posts/comments/${commentId}`);
export const getPostCount = (organizationId: string) => api.get("/posts/count/all", { params: { organizationId } });

// 💬 Messaging APIs
export const createMessage = (data: {
  organizationId: string;
  recipientUserIds: string[];
  title: string;
  body: string;
  type?: string;
}) => api.post("/messages", data);
export const getInboxMessages = () => api.get("/messages/inbox");
export const markMessageRead = (messageId: string) =>
  api.post("/messages/read", { messageId });

// ⚙️ Common APIs
export const uploadFile = (data: any, params?: any) => api.post("/common/upload", data, { params });
export const getCurrentTime = () => api.get("/common/time/now");

// 🧾 Log Reports APIs
export const createLogReport = (data: any) => api.post("/logreports", data);
export const getLogReports = (params: any) => api.get("/logreports", { params });
export const deleteLogReport = (id: string) => api.delete(`/logreports/${id}`);
export const getLogReportSettings = (orgId: string) => api.get(`/logreports/settings/${orgId}`);
export const updateLogReportSettings = (orgId: string, data: any) => api.put(`/logreports/settings/${orgId}`, data);

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
export const batchUpdateTimeslipStatuses = (data: {
  timeslipIds: string[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  approverId?: string;
}) => api.post(`/timeslips/batch-update-status`, data);
export const getTimeslipsByApprover = (approverId: string, params?: { 
  status?: string; 
  page?: number; 
  limit?: number; 
}) => api.get(`/timeslips/approver/${approverId}`, { params });
export const updateStepApprover = (stepId: string, approverId: string) =>
  api.put(`/workflows/steps/${stepId}/approver`, { approverId });


// Employee List API (for HR to select approvers)
export const getEmployeesList = (organizationId: string) => api.get(`/employees?organizationId=${organizationId}`);

// 💰 Payroll APIs
export const getPayrollRecords = (params: any) => api.get("/payroll", { params });
export const createPayrollRecord = (data: any) => api.post("/payroll", data);
export const updatePayrollRecord = (id: string, data: any) => api.put(`/payroll/${id}`, data);
export const getPayrollSettings = (orgId: string) => api.get(`/payroll/settings/${orgId}`);
export const updatePayrollSettings = (orgId: string, data: any) => api.put(`/payroll/settings/${orgId}`, data);
export const downloadPayrollSlip = (id: string) =>
  api.get(`/payroll/${id}/slip`, { responseType: "blob" });
export const sendPayslip = (id: string, method: 'email' | 'in_app' | 'both' = 'both') =>
  api.post(`/payroll/${id}/send`, { method });

// 💬 Chat APIs
export const getChatConversations = () => api.get('/chat/conversations');
export const createDirectChat = (userId: string) =>
  api.post('/chat/conversations/direct', { userId });
export const createGroupChat = (data: { title: string; userIds: string[] }) =>
  api.post('/chat/conversations/group', data);
export const getChatMessages = (
  conversationId: string,
  params?: { limit?: number; before?: string },
) => api.get(`/chat/conversations/${conversationId}/messages`, { params });
export const sendChatMessage = (conversationId: string, data: FormData) =>
  api.post(`/chat/conversations/${conversationId}/messages`, data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// 📡 WFH Monitoring APIs
export const wfhHeartbeat = (data: { mouseEvents: number; keyboardEvents: number; tabSwitches: number }) =>
  api.post('/wfh-monitoring/heartbeat', data);
export const wfhToggleLunch = () => api.post('/wfh-monitoring/lunch/toggle');
export const wfhToggleWork = () => api.post('/wfh-monitoring/work/toggle');
export const getWfhToday = () => api.get('/wfh-monitoring/today');
export const getEmployeeWfhActivity = (userId: string, date?: string) =>
  api.get(`/wfh-monitoring/employee/${userId}`, { params: { date } });
export const getTeamWfhActivity = (date?: string) =>
  api.get('/wfh-monitoring/team', { params: { date } });
export const getWfhChartData = (date?: string) =>
  api.get('/wfh-monitoring/chart', { params: { date } });

// 📋 Company Policy APIs
export const getPolicies = () => api.get('/policy');
export const getPolicyById = (id: string) => api.get(`/policy/${id}`);
export const createPolicy = (data: { title: string; content: string; category?: string }) =>
  api.post('/policy', data);
export const updatePolicy = (id: string, data: Partial<{ title: string; content: string; category: string; isActive: boolean }>) =>
  api.put(`/policy/${id}`, data);
export const deletePolicy = (id: string) => api.delete(`/policy/${id}`);

// 🙋 Resignation APIs
export const createResignationRequest = (data: {
  message: string;
  proposedLastWorkingDay?: string;
}) => api.post('/resignations/request', data);

export const getMyResignationRequests = () => api.get('/resignations/me');

export const getOrgResignationRequests = (status?: string) =>
  api.get('/resignations/org', { params: { status } });

export const reviewResignationRequest = (
  id: string,
  data: {
    status: 'APPROVED' | 'REJECTED';
    hrRemarks?: string;
    approvedLastWorkingDay?: string;
    allowEarlyRelieving?: boolean;
  },
) => api.patch(`/resignations/${id}/review`, data);

// 🏆 Performance APIs
export const getPerformanceSettings = () => api.get('/performance/settings');
export const togglePerformanceEnabled = () => api.post('/performance/settings/toggle');
export const updatePerformanceSettings = (data: { requireHrApproval?: boolean }) =>
  api.patch('/performance/settings', data);
export const getPerformanceQuestions = () => api.get('/performance/questions');
export const createPerformanceQuestion = (data: { question: string; orderIndex?: number }) =>
  api.post('/performance/questions', data);
export const deletePerformanceQuestion = (id: string) => api.delete(`/performance/questions/${id}`);
export const checkIsManager = () => api.get('/performance/is-manager');
export const checkIsHr = () => api.get('/performance/is-hr');
export const getTeamWithReviews = () => api.get('/performance/team');
export const getAllEmployeesForHr = () => api.get('/performance/employees');
export const submitSelfReview = (data: { period?: string; answers: { questionId: string; question: string; answer: string }[]; overallRating?: number; comments?: string }) =>
  api.post('/performance/reviews/self', data);
export const submitManagerReview = (data: { employeeId: string; period?: string; answers?: { questionId: string; question: string; answer: string }[]; overallRating?: number; comments?: string }) =>
  api.post('/performance/reviews/manager', data);
export const submitHrReview = (data: { employeeId: string; period?: string; answers?: { questionId: string; question: string; answer: string }[]; overallRating?: number; comments?: string }) =>
  api.post('/performance/reviews/hr', data);
export const getMyPerformanceReviews = () => api.get('/performance/reviews/me');
export const getTeamPerformanceReviews = () => api.get('/performance/reviews/team');
export const getAllPerformanceReviews = () => api.get('/performance/reviews/all');
export const getAllReviewsAggregated = () => api.get('/performance/reviews/all-aggregated');

// 💸 Expenses & Travel APIs
export const createExpense = (userId: string, data: any) => api.post(`/expenses/${userId}`, data);
export const getMyExpenses = (userId: string) => api.get(`/expenses/my/${userId}`);
export const getAllExpenses = (organizationId: string) => api.get('/expenses/all', { params: { organizationId } });
export const updateExpenseStatus = (id: string, data: { status: string; adminRemarks?: string }) =>
  api.put(`/expenses/${id}/status`, data);
export const deleteExpense = (id: string, userId: string) => api.delete(`/expenses/${id}/${userId}`);

// Credit earned leave (admin → employee who worked on weekend/holiday)
export const creditEarnedLeave = (userId: string, data: { days: number; organizationId: string }) =>
  api.post(`/leave/credit-earned/${userId}`, data);

// 📅 Meeting APIs
export const createMeeting = (data: {
  title: string;
  description?: string;
  scheduledAt: string;
  durationMinutes?: number;
  participantIds?: string[];
  organizationId: string;
  createdById: string;
}) => api.post('/meetings', data);

export const getMeetingsByOrg = (organizationId: string) =>
  api.get(`/meetings/org/${organizationId}`);

export const getUpcomingMeetingsByOrg = (organizationId: string) =>
  api.get(`/meetings/org/${organizationId}/upcoming`);

export const getMeetingsForUser = (userId: string) =>
  api.get(`/meetings/user/${userId}`);

export const getUpcomingMeetingsForUser = (userId: string) =>
  api.get(`/meetings/user/${userId}/upcoming`);

export const getMeetingById = (id: string) =>
  api.get(`/meetings/${id}`);

export const updateMeeting = (id: string, data: {
  title?: string;
  description?: string;
  scheduledAt?: string;
  durationMinutes?: number;
  participantIds?: string[];
  status?: string;
}) => api.put(`/meetings/${id}`, data);

export const deleteMeeting = (id: string) =>
  api.delete(`/meetings/${id}`);

export const sendMeetingNotification = (id: string) =>
  api.post(`/meetings/${id}/notify`);

export const updateMeetingStatus = (id: string, status: string) =>
  api.put(`/meetings/${id}/status`, { status });

// Export the axios instance as default and named export
export { api, apiBaseURL };
export default api;
