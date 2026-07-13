// app/employees/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getProfile, getEmployees } from "@/app/api/api";

interface Employee {
  employeeCode: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  gender?: string;
  designation?: { id: string; name: string } | null;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const profileRes = await getProfile();
        const organizationId = profileRes.data?.organizationId;
        if (!organizationId) return;

        const res = await getEmployees(organizationId);
        const data = res.data?.data || res.data || [];
        setEmployees(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error("Failed to fetch employees", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter((emp) =>
    `${emp.firstName} ${emp.lastName} ${emp.employeeCode}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
  <div className="p-8 space-y-8">
    {/* Page Header */}
    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold">👩‍💼 Employees</h1>
        <p className="text-muted-foreground">
          Manage and view all registered employees in the system
        </p>
      </div>
      <Input
        placeholder="🔍 Search employees..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full md:w-72"
      />
    </div>

    {/* Summary Stats */}
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <Card className="p-4 text-center">
        <h2 className="text-lg font-semibold">Total Employees</h2>
        <p className="text-2xl font-bold">{employees.length}</p>
      </Card>
      <Card className="p-4 text-center">
        <h2 className="text-lg font-semibold">Male</h2>
        <p className="text-2xl font-bold">
          {employees.filter((e) => e.gender?.toUpperCase() === "MALE").length}
        </p>
      </Card>
      <Card className="p-4 text-center">
        <h2 className="text-lg font-semibold">Female</h2>
        <p className="text-2xl font-bold">
          {employees.filter((e) => e.gender?.toUpperCase() === "FEMALE").length}
        </p>
      </Card>
    </div>

    {/* Employees Table */}
    <Card>
      <CardHeader>
        <CardTitle>Employee List</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Sl#</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Designation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={5}>
                      <Skeleton className="h-6 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <>
                  {filteredEmployees.map((emp, i) => (
                    <TableRow key={emp.employeeCode || i} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{i + 1}</TableCell>
                      <TableCell>{emp.employeeCode}</TableCell>
                      <TableCell>
                        {emp.firstName}{" "}
                        {emp.middleName ? emp.middleName + " " : ""}
                        {emp.lastName}
                      </TableCell>
                      <TableCell>{emp.gender ?? "—"}</TableCell>
                      <TableCell>{emp.designation?.name ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                  {filteredEmployees.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center text-muted-foreground py-6"
                      >
                        🚫 No employees found. Try adjusting your search.
                      </TableCell>
                    </TableRow>
                  )}
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
);
}
