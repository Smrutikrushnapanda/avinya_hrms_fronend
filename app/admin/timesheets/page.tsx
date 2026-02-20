"use client";

import { useEffect, useMemo, useState } from "react";
import { Users } from "lucide-react";

import { getEmployees, getProfile } from "@/app/api/api";
import TimesheetSection from "@/components/timesheet/TimesheetSection";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type EmployeeOption = {
  id: string;
  userId: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  employeeCode?: string;
  department?: { name?: string };
  designation?: { name?: string };
};

export default function AdminTimesheetsPage() {
  const [organizationId, setOrganizationId] = useState("");
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await getProfile();
        const orgId = profileRes.data?.organizationId ?? "";
        setOrganizationId(orgId);
        if (orgId) {
          const employeesRes = await getEmployees(orgId);
          const list: EmployeeOption[] = employeesRes.data?.employees || employeesRes.data || [];
          setEmployees(list);
          if (list.length > 0) {
            setSelectedEmployeeId(list[0].id);
          }
        }
      } catch (error) {
        console.error("Failed to load employees:", error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const selectedName = useMemo(() => {
    const employee = employees.find((e) => e.id === selectedEmployeeId);
    if (!employee) return "";
    return [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" ");
  }, [employees, selectedEmployeeId]);

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading timesheets...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Users className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-semibold">Employee Timesheets</h1>
          <p className="text-sm text-muted-foreground">
            Review monthly attendance details for any employee
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="py-5 flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-foreground">Select employee</p>
            <p className="text-xs text-muted-foreground">
              Choose an employee to load their timesheet details
            </p>
          </div>
          <Select value={selectedEmployeeId} onValueChange={(value) => setSelectedEmployeeId(value)}>
            <SelectTrigger className="max-w-lg">
              <SelectValue placeholder="Choose an employee" />
            </SelectTrigger>
            <SelectContent>
              {employees.map((employee) => {
                const name = [employee.firstName, employee.middleName, employee.lastName]
                  .filter(Boolean)
                  .join(" ");
                const meta = [employee.employeeCode, employee.designation?.name, employee.department?.name]
                  .filter(Boolean)
                  .join(" - ");
                return (
                  <SelectItem key={employee.id} value={employee.id}>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">{name}</span>
                      {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedEmployeeId ? (
        <TimesheetSection
          title={selectedName ? `${selectedName}'s Timesheet` : "Timesheet"}
          description="Daily work entries submitted by the employee"
          organizationId={organizationId}
          employeeId={selectedEmployeeId}
        />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Select an employee to view their timesheet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
