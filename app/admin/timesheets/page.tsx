"use client";

import { useEffect, useMemo, useState } from "react";
import { Users, Calendar, Settings, LogOut, Shield, Loader2, Search, ArrowLeft, ArrowRight } from "lucide-react";

import { getEmployees, getProfile } from "@/app/api/api";
import TimesheetSection from "@/components/timesheet/TimesheetSection";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useOrganizationTimezone } from "@/hooks/useOrganizationTimezone";
import { Badge } from "@/components/ui/badge";

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
  const [showAllEmployees, setShowAllEmployees] = useState(false);
  const [loading, setLoading] = useState(true);
  const orgTz = useOrganizationTimezone();

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
    return [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" ") || "—";
  }, [employees, selectedEmployeeId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading timesheets…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <header className="border-b border-border pb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <div>
              <h1 className="text-2xl font-semibold text-foreground">
                Employee Timesheets
              </h1>
              <p className="text-sm text-muted-foreground">
                Review monthly attendance details for any employee
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedEmployeeId || "all"} onValueChange={(v) => setSelectedEmployeeId(v === "all" ? "" : v)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue className="flex items-center gap-2">
                  <span>All employees</span>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[400px] overflow-y-auto">
                <SelectItem value="all">All employees</SelectItem>
                {employees.map((employee) => {
                  const name = [employee.firstName, employee.middleName, employee.lastName]
                    .filter(Boolean)
                    .join(" ");
                  const meta = [
                    employee.employeeCode,
                    employee.designation?.name,
                    employee.department?.name,
                  ]
                    .filter(Boolean)
                    .join(" - ");
                  return (
                    <SelectItem key={employee.id} value={employee.id}>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{name || "—"}</span>
                        {meta ? (
                          <span className="text-xs text-muted-foreground">{meta}</span>
                        ) : null}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowAllEmployees((p) => !p)}
              className="gap-1.5"
            >
              {showAllEmployees ? <LogOut className="h-4 w-4" /> : <Users className="h-4 w-4" />}
              {showAllEmployees ? "Compact" : "Select Employee"}
            </Button>
          </div>
        </div>
      </header>

      {selectedEmployeeId ? (
        <TimesheetSection
          title={selectedName ? `${selectedName}'s Timesheet` : "Timesheet"}
          description="Daily work entries submitted by the employee"
          organizationId={organizationId}
          mode="admin"
          employeeId={selectedEmployeeId}
          allowApproval
        />
      ) : (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            <p className="text-muted-foreground mb-2">
              Select an employee above to view their timesheet details
            </p>
            <p className="text-xs">
              Use the search above or choose "All employees" to see team timesheets
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}