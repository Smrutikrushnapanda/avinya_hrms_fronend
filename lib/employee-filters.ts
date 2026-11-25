export type EmployeeFilterOption = { id: string; name: string };
export type EmployeeFilterValue = {
  departmentId: string;
  designationId: string;
};

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function employeeFilterRecord(
  value: unknown,
  directory: readonly unknown[] = [],
): Record<string, unknown> {
  const row = record(value);
  const employee = Object.keys(record(row.employee)).length
    ? record(row.employee)
    : row;
  const user = record(employee.user);
  const userId =
    text(employee.userId) ||
    text(employee.user_id) ||
    text(employee.assignedToUserId) ||
    text(user.id);
  const employeeId =
    text(employee.employeeId) ||
    text(employee.employee_id) ||
    text(employee.id);
  const linked = directory.find((item) => {
    const entry = record(item);
    return userId
      ? entry.userId === userId
      : Boolean(employeeId) &&
          (entry.id === employeeId || entry.employeeId === employeeId);
  });
  return {
    ...record(linked),
    ...employee,
    department:
      employee.department ?? user.department ?? record(linked).department,
    designation:
      employee.designation ?? user.designation ?? record(linked).designation,
  };
}

export function employeeClassification(
  value: unknown,
  directory: readonly unknown[] = [],
) {
  const employee = employeeFilterRecord(value, directory);
  const department = record(employee.department);
  const designation = record(employee.designation);
  const departmentName =
    text(department.name) ||
    text(employee.departmentName) ||
    text(employee.department);
  const designationName =
    text(designation.name) ||
    text(employee.designationName) ||
    text(employee.designation);
  return {
    departmentId:
      text(employee.departmentId) ||
      text(department.id) ||
      (departmentName ? `name:${departmentName}` : ""),
    designationId:
      text(employee.designationId) ||
      text(designation.id) ||
      (designationName ? `name:${designationName}` : ""),
    departmentName,
    designationName,
  };
}

export function matchesEmployeeFilters(
  value: unknown,
  filters: EmployeeFilterValue,
  directory: readonly unknown[] = [],
): boolean {
  if (filters.departmentId === "all" && filters.designationId === "all")
    return true;
  const classification = employeeClassification(value, directory);
  return (
    (filters.departmentId === "all" ||
      classification.departmentId === filters.departmentId) &&
    (filters.designationId === "all" ||
      classification.designationId === filters.designationId)
  );
}

export function employeeFilterOptions(
  employees: readonly unknown[],
  departmentId = "all",
  directory: readonly unknown[] = [],
) {
  const departments = new Map<string, string>();
  const designations = new Map<string, string>();
  for (const employee of employees) {
    const item = employeeClassification(employee, directory);
    if (item.departmentId && item.departmentName)
      departments.set(item.departmentId, item.departmentName);
    if (
      item.designationId &&
      item.designationName &&
      (departmentId === "all" || item.departmentId === departmentId)
    ) {
      designations.set(item.designationId, item.designationName);
    }
  }
  const options = (items: Map<string, string>): EmployeeFilterOption[] =>
    Array.from(items, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  return {
    departments: options(departments),
    designations: options(designations),
  };
}
