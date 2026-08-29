"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, X, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getEmployeeSelector,
  getDepartments,
  getDesignations,
  getProfile,
} from "@/app/api/api";

interface Employee {
  id: string;
  firstName: string;
  lastName?: string;
  employeeCode?: string;
  workEmail?: string;
  department?: { id: string; name: string } | null;
  designation?: { id: string; name: string } | null;
}

interface Department {
  id: string;
  name: string;
}

interface Designation {
  id: string;
  name: string;
}

interface EmployeeSelectorProps {
  value: string;
  onChange: (employeeId: string, employee?: Employee) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showDepartmentFilter?: boolean;
  showDesignationFilter?: boolean;
}

export default function EmployeeSelector({
  value,
  onChange,
  placeholder = "Search employee by name, code, or email...",
  disabled = false,
  className,
  showDepartmentFilter = true,
  showDesignationFilter = true,
}: EmployeeSelectorProps) {
  const [organizationId, setOrganizationId] = useState("");
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [designations, setDesignations] = useState<Designation[]>([]);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [desigFilter, setDesigFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      try {
        const profile = await getProfile();
        const orgId = profile.data?.organizationId;
        if (!orgId) return;
        setOrganizationId(orgId);

        const [deptRes, desigRes] = await Promise.all([
          getDepartments(orgId),
          getDesignations(orgId),
        ]);
        setDepartments(deptRes.data?.data || deptRes.data || []);
        setDesignations(desigRes.data?.data || desigRes.data || []);
      } catch {
        // silent
      }
    };
    init();
  }, []);

  const fetchEmployees = useCallback(
    async (term: string, dept: string, desig: string) => {
      if (!organizationId) return;
      setLoading(true);
      try {
        const res = await getEmployeeSelector({
          organizationId,
          search: term || undefined,
          departmentId: dept !== "all" ? dept : undefined,
          designationId: desig !== "all" ? desig : undefined,
          limit: 50,
        });
        setEmployees(res.data || []);
      } catch {
        setEmployees([]);
      } finally {
        setLoading(false);
      }
    },
    [organizationId],
  );

  useEffect(() => {
    if (!isOpen || !organizationId) return;
    fetchEmployees(search, deptFilter, desigFilter);
  }, [isOpen, search, deptFilter, desigFilter, organizationId, fetchEmployees]);

  useEffect(() => {
    if (value && employees.length > 0) {
      const emp = employees.find((e) => e.id === value);
      if (emp) setSelectedEmployee(emp);
    }
  }, [value, employees]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchChange = (term: string) => {
    setSearch(term);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // immediate fetch on type
    }, 0);
  };

  const handleSelect = (emp: Employee) => {
    setSelectedEmployee(emp);
    onChange(emp.id, emp);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    setSelectedEmployee(null);
    onChange("", undefined);
    setSearch("");
    setDeptFilter("all");
    setDesigFilter("all");
  };

  const handleResetFilters = () => {
    setDeptFilter("all");
    setDesigFilter("all");
    setSearch("");
  };

  const displayName = selectedEmployee
    ? `${selectedEmployee.firstName} ${selectedEmployee.lastName || ""} (${selectedEmployee.employeeCode || ""})`
    : "";

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-colors md:text-sm",
          "border-input hover:bg-accent/50 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          isOpen && "border-ring ring-ring/50 ring-[3px]",
        )}
      >
        <span className={cn("truncate text-left", !selectedEmployee && "text-muted-foreground")}>
          {displayName || placeholder}
        </span>
        {selectedEmployee ? (
          <X
            className="ml-2 h-4 w-4 shrink-0 opacity-50 hover:opacity-100"
            onClick={(e) => {
              e.stopPropagation();
              handleClear();
            }}
          />
        ) : (
          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full min-w-[320px] rounded-md border bg-popover p-0 text-popover-foreground shadow-md">
          {/* Filters */}
          <div className="border-b p-2 space-y-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, code, or email..."
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 h-8 text-sm"
                autoFocus
              />
            </div>
            {(showDepartmentFilter || showDesignationFilter) && (
              <div className="flex gap-2">
                {showDepartmentFilter && (
                  <Select value={deptFilter} onValueChange={setDeptFilter}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {showDesignationFilter && (
                  <Select value={desigFilter} onValueChange={setDesigFilter}>
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="Designation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Designations</SelectItem>
                      {designations.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
            {(deptFilter !== "all" || desigFilter !== "all" || search) && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Clear filters
              </button>
            )}
          </div>

          {/* Results */}
          <ScrollArea className="max-h-[300px]">
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : employees.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Users className="mx-auto mb-1 h-4 w-4" />
                No employees found
              </div>
            ) : (
              <div className="py-1">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => handleSelect(emp)}
                    className={cn(
                      "flex w-full items-start gap-3 px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors",
                      value === emp.id && "bg-accent",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {emp.firstName} {emp.lastName || ""}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {emp.employeeCode && <span>{emp.employeeCode}</span>}
                        {emp.employeeCode && emp.workEmail && <span> · </span>}
                        {emp.workEmail && <span>{emp.workEmail}</span>}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {emp.designation?.name && <span>{emp.designation.name}</span>}
                        {emp.designation?.name && emp.department?.name && <span> · </span>}
                        {emp.department?.name && <span>{emp.department.name}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
