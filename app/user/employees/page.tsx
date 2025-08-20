// app/employees/page.tsx
"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import axios from "axios";

interface Employee {
  employee_code: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  gender: string;
  designation?: string;
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await axios.get("/employees");
      } catch (err) {
        console.error("Failed to fetch employees", err);
      }
    };
    fetchEmployees();
  }, []);

  const filteredEmployees = employees.filter((emp) =>
    `${emp.first_name} ${emp.last_name} ${emp.employee_code}`
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
          {employees.filter((e) => e.gender === "Male").length}
        </p>
      </Card>
      <Card className="p-4 text-center">
        <h2 className="text-lg font-semibold">Female</h2>
        <p className="text-2xl font-bold">
          {employees.filter((e) => e.gender === "Female").length}
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
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Gender</TableHead>
                <TableHead>Designation</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp, i) => (
                <TableRow key={i} className="hover:bg-muted/50">
                  <TableCell>{emp.employee_code}</TableCell>
                  <TableCell>
                    {emp.first_name}{" "}
                    {emp.middle_name ? emp.middle_name + " " : ""}
                    {emp.last_name}
                  </TableCell>
                  <TableCell>{emp.gender}</TableCell>
                  <TableCell>{emp.designation ?? "—"}</TableCell>
                </TableRow>
              ))}
              {filteredEmployees.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    className="text-center text-muted-foreground py-6"
                  >
                    🚫 No employees found. Try adjusting your search.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
);
}
