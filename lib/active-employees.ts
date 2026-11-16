interface EmployeeActivity {
  status?: string;
  isActive?: boolean;
  user?: { isActive?: boolean } | null;
}

export function isActiveEmployee(employee: EmployeeActivity): boolean {
  return typeof employee?.status === "string" && employee.status.trim().toLowerCase() === "active" &&
    (employee.isActive === true || employee.user?.isActive === true) &&
    employee.isActive !== false && employee.user?.isActive !== false;
}
