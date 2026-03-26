import { api } from './api';

// ═════════════════════════════════════════════════════════════════
// Employee Leave Limits APIs
// ═════════════════════════════════════════════════════════════════

export const setEmployeeLeaveLimit = (data: any) => 
  api.post('/leave/employee-limits', data);

export const getEmployeeLeaveLimits = (userId: string, orgId: string) =>
  api.get(`/leave/employee-limits/${userId}/${orgId}`);

export const updateEmployeeLeaveLimit = (userId: string, leaveTypeId: string, data: any) =>
  api.put(`/leave/employee-limits/${userId}/${leaveTypeId}`, data);

export const deleteEmployeeLeaveLimit = (userId: string, leaveTypeId: string) =>
  api.delete(`/leave/employee-limits/${userId}/${leaveTypeId}`);

// ═════════════════════════════════════════════════════════════════
// Employee WFH Limits APIs
// ═════════════════════════════════════════════════════════════════

export const setEmployeeWfhLimit = (data: any) =>
  api.post('/wfh/employee-limits', data);

export const getEmployeeWfhLimit = (userId: string, orgId: string) =>
  api.get(`/wfh/employee-limits/${userId}/${orgId}`);

export const updateEmployeeWfhLimit = (userId: string, data: any) =>
  api.put(`/wfh/employee-limits/${userId}`, data);

export const deleteEmployeeWfhLimit = (userId: string) =>
  api.delete(`/wfh/employee-limits/${userId}`);
