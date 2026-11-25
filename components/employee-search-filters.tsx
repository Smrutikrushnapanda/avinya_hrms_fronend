"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  employeeFilterOptions,
  employeeFilterRecord,
  matchesEmployeeFilters,
} from "@/lib/employee-filters";
import { Input } from "@/components/ui/input";
import { getDepartments, getDesignations, getProfile } from "@/app/api/api";
import type { EmployeeFilterOption } from "@/lib/employee-filters";

const EMPTY_DIRECTORY: readonly unknown[] = [];

type DesignationOption = EmployeeFilterOption & {
  departmentId?: string | null;
};

export function useOrganizationEmployeeFilterOptions(organizationId?: string) {
  const [options, setOptions] = useState<{
    departments: EmployeeFilterOption[];
    designations: DesignationOption[];
  }>({ departments: [], designations: [] });
  useEffect(() => {
    if (organizationId === "") return;
    let active = true;
    async function load() {
      try {
        const org = organizationId || (await getProfile()).data?.organizationId;
        if (!org || !active) return;
        const [departments, designations] = await Promise.all([
          getDepartments(org),
          getDesignations(org),
        ]);
        if (active)
          setOptions({
            departments: departments.data?.data || [],
            designations: designations.data?.data || [],
          });
      } catch {
        if (active) setOptions({ departments: [], designations: [] });
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [organizationId]);
  return options;
}

export function EmployeeDepartmentFilters({
  departments,
  designations,
  departmentId,
  designationId,
  onDepartmentChange,
  onDesignationChange,
}: {
  departments: EmployeeFilterOption[];
  designations: DesignationOption[];
  departmentId: string;
  designationId: string;
  onDepartmentChange: (id: string) => void;
  onDesignationChange: (id: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2" data-employee-filters>
      <Select
        value={departmentId}
        onValueChange={(id) => {
          onDepartmentChange(id);
          onDesignationChange("all");
        }}
      >
        <SelectTrigger
          aria-label="Filter employees by department"
          className="w-full sm:w-[180px]"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {departments.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        key={departmentId}
        value={designationId}
        onValueChange={onDesignationChange}
      >
        <SelectTrigger
          aria-label="Filter employees by designation"
          className="w-full sm:w-[180px]"
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Designations</SelectItem>
          {designations
            .filter(
              (option) =>
                departmentId === "all" || option.departmentId === departmentId,
            )
            .map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.name}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function useEmployeeSearchFilters<T>(
  employees: readonly T[],
  directory: readonly unknown[] = EMPTY_DIRECTORY,
  withSearch = false,
  onFilterChange?: () => void,
) {
  const [departmentId, setDepartmentId] = useState("all");
  const [designationId, setDesignationId] = useState("all");
  const [search, setSearch] = useState("");
  const options = useMemo(
    () => employeeFilterOptions(employees, departmentId, directory),
    [employees, departmentId, directory],
  );
  const matches = useCallback(
    (employee: unknown) => {
      if (
        !matchesEmployeeFilters(
          employee,
          { departmentId, designationId },
          directory,
        )
      )
        return false;
      if (!withSearch || !search.trim()) return true;
      const item = employeeFilterRecord(employee, directory);
      return [
        item.name,
        item.firstName,
        item.middleName,
        item.lastName,
        item.employeeCode,
        item.workEmail,
        item.email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(search.trim().toLowerCase());
    },
    [departmentId, designationId, directory, search, withSearch],
  );
  const filteredEmployees = useMemo(
    () => employees.filter(matches),
    [employees, matches],
  );
  const reset = () => {
    setDepartmentId("all");
    setDesignationId("all");
    setSearch("");
    onFilterChange?.();
  };
  const controls = (
    <div className="flex flex-wrap gap-2" data-employee-filters>
      {withSearch && (
        <Input
          aria-label="Search employees"
          placeholder="Search name, code, or email..."
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            onFilterChange?.();
          }}
          className="w-full sm:w-[220px]"
        />
      )}
      <Select
        value={departmentId}
        onValueChange={(value) => {
          setDepartmentId(value);
          setDesignationId("all");
          onFilterChange?.();
        }}
      >
        <SelectTrigger
          aria-label="Filter employees by department"
          className="w-full sm:w-[180px]"
        >
          <SelectValue placeholder="All Departments" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Departments</SelectItem>
          {options.departments.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        key={departmentId}
        value={designationId}
        onValueChange={(value) => {
          setDesignationId(value);
          onFilterChange?.();
        }}
      >
        <SelectTrigger
          aria-label="Filter employees by designation"
          className="w-full sm:w-[180px]"
        >
          <SelectValue placeholder="All Designations" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Designations</SelectItem>
          {options.designations.map((option) => (
            <SelectItem key={option.id} value={option.id}>
              {option.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {(departmentId !== "all" || designationId !== "all") && (
        <button
          type="button"
          className="text-xs text-muted-foreground hover:underline"
          onClick={reset}
        >
          Clear employee filters
        </button>
      )}
    </div>
  );
  return {
    departmentId,
    designationId,
    matches,
    filteredEmployees,
    controls,
    reset,
  };
}
