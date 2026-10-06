export interface Employee {
  id: string;
  organizationId: string;
  userId: string;
  userName?: string;
  departmentId?: string;
  designationId?: string;
  branchId?: string;
  shiftId?: string;
  reportingTo?: string;
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  dateOfJoining: string;
  contactNumber?: string;
  personalEmail?: string;
  workEmail: string;
  photoUrl?: string;
  aadharPhotoUrl?: string;
  passportPhotoUrl?: string;
  panCardPhotoUrl?: string;
  employmentType?: string;
  status: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  department?: { id: string; name: string };
  designation?: { id: string; name: string };
  branch?: { id: string; name: string };
  shift?: { id: string; name: string };
  manager?: { id: string; firstName: string; lastName: string };
  managers?: ManagerInfo[];
  projectAssignments?: ProjectAssignment[];
  user?: { id: string; lastLogin?: string; isActive: boolean };
  roles?: { id: string; roleName: string }[];
  roleId?: string | null;
  primaryRole?: string | null;
  createdAt: string;
}

export interface ProjectAssignment {
  id: string;
  employeeId: string;
  projectId: string;
  projectSource?: 'internal' | 'client';
  managerId?: string | null;
  managerType?: 'PRIMARY' | 'SECONDARY';
  role?: string;
  createdAt?: string;
  updatedAt?: string;
  project?: {
    id: string;
    name: string;
    code?: string;
    status?: string;
    source?: 'internal' | 'client';
  };
  manager?: {
    id: string;
    firstName: string;
    lastName?: string;
    workEmail?: string;
    photoUrl?: string | null;
    status?: string;
    isActive?: boolean;
  } | null;
}

export interface ManagerProjectInfo {
  id?: string;
  name: string;
  code?: string;
  source?: string;
  assignmentId?: string;
  role?: string;
  managerType?: 'PRIMARY' | 'SECONDARY';
}

export interface ManagerInfo {
  id: string;
  name?: string;
  firstName: string;
  lastName?: string;
  workEmail?: string;
  employeeCode?: string;
  photoUrl?: string | null;
  status?: string;
  isActive?: boolean;
  managerType?: 'PRIMARY' | 'SECONDARY';
  projects?: ManagerProjectInfo[];
  projectId?: string;
  projectName?: string;
  projectSource?: string;
  assignmentId?: string;
  role?: string;
}

export interface EmployeeAsset {
  id: string;
  organizationId: string;
  employeeId: string;
  assetType: string;
  assetName: string;
  assetId?: string | null;
  serialNumber?: string | null;
  assetTag?: string | null;
  brand?: string | null;
  model?: string | null;
  condition?: string;
  issuedDate?: string | null;
  issueDate?: string | null;
  expectedReturnDate?: string | null;
  actualReturnDate?: string | null;
  returnCondition?: string | null;
  status: 'ASSIGNED' | 'RETURN_PENDING' | 'RETURNED' | 'LOST' | 'DAMAGED';
  isReturnRequired: boolean;
  notes?: string | null;
  remarks?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface AssetClearance {
  clearanceStatus: 'NOT_STARTED' | 'PARTIALLY_CLEARED' | 'CLEARED';
  hasPendingAssets: boolean;
  totalAssets: number;
  returnRequiredAssets: number;
  returnedAssets: number;
  pendingAssetsCount: number;
  pendingAssets: {
    id: string;
    assetName: string;
    assetType: string;
    serialNumber?: string | null;
    status: string;
  }[];
}

export interface EmployeeDocument {
  id: string;
  organizationId: string;
  employeeId: string;
  documentName: string;
  documentType?: string;
  documentCategory?: string;
  documentUrl: string;
  fileUrl?: string;
  fileType?: string;
  fileSize?: number;
  mimeType?: string;
  remarks?: string;
  uploadedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface EmployeeSettlement {
  id?: string;
  organizationId: string;
  employeeId: string;
  resignationRequestId?: string | null;
  resignationDate?: string | null;
  noticePeriodDays?: number;
  lastWorkingDate?: string | null;
  reasonForLeaving?: string | null;
  salaryDue?: number;
  pendingSalary?: number;
  leaveEncashment?: number;
  leaveEncashmentDays?: number;
  bonus?: number;
  performanceIncentive?: number;
  otherPayables?: number;
  totalEarnings?: number;
  noticePeriodRecovery?: number;
  loanRecovery?: number;
  assetDeduction?: number;
  otherDeductions?: number;
  totalDeductions?: number;
  finalSettlementAmount?: number;
  status?: 'DRAFT' | 'UNDER_REVIEW' | 'APPROVED' | 'PAID' | 'REJECTED';
  preparedBy?: string | null;
  hrApprovalName?: string | null;
  financeApprovalName?: string | null;
  approvalDate?: string | null;
  employeeDeclarationAcknowledged?: boolean;
  remarks?: string | null;
}

export interface EmployeeFormData {
  organizationId: string;
  departmentId?: string;
  designationId?: string;
  branchId?: string;
  shiftId?: string;
  reportingTo?: string;
  employeeCode: string;
  loginUserName: string;
  loginPassword: string;
  roleId?: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  dateOfJoining: string;
  dateOfExit?: string;
  workEmail: string;
  personalEmail?: string;
  contactNumber?: string;
  photoUrl?: string;
  aadharPhotoUrl?: string;
  passportPhotoUrl?: string;
  panCardPhotoUrl?: string;
  employmentType?: string;
  status?: string;
  bloodGroup?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
}

export interface ExportFields {
  basic: boolean;
  contact: boolean;
  employment: boolean;
  emergency: boolean;
}
