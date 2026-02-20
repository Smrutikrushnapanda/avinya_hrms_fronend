export interface Employee {
  id: string;
  organizationId: string;
  userId: string;
  userName?: string;
  departmentId?: string;
  designationId?: string;
  branchId?: string;
  branchId?: string;
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
  manager?: { id: string; firstName: string; lastName: string };
  user?: { id: string; lastLogin?: string; isActive: boolean };
  createdAt: string;
}

export interface EmployeeFormData {
  organizationId: string;
  departmentId?: string;
  designationId?: string;
  reportingTo?: string;
  employeeCode: string;
  loginUserName: string;
  loginPassword: string;
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
