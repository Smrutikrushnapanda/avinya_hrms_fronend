"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, X, Users } from "lucide-react";
import { cn, getFullName} from "@/lib/utils";
import { employeeFilterOptions, matchesEmployeeFilters } from "@/lib/employee-filters";
import {
  getEmployeeSelector,
  getDepartments,
  getDesignations,
  getProfile,
} from "@/app/api/api";

interface Employee {
  id?: string;
  userId?: string;
  firstName?: string;
  name?: string;
  lastName?: string;
  employeeCode?: string;
  workEmail?: string;
  department?: { id?: string; name?: string } | null;
  designation?: { id?: string; name?: string } | null;
  departmentId?: string | null;
  designationId?: string | null;
}

interface Department {
  id: string;
  name: string;
}

interface Designation {
  id: string;
  name: string;
  departmentId?: string | null;
}

interface EmployeeSelectorProps {
  value?: string;
  onChange: (employeeId: string, employee?: Employee) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  showDepartmentFilter?: boolean;
  showDesignationFilter?: boolean;
  options?: Employee[];
  valueKey?: "id" | "userId";
  allLabel?: string;
  allValue?: string;
}

export default function EmployeeSelector({
  value,
  onChange,
  placeholder = "Search employee by name, code, or email...",
  disabled = false,
  className,
  showDepartmentFilter = true,
  showDesignationFilter = true,
  options,
  valueKey = "id",
  allLabel,
  allValue = "all",
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
  const requestRef = useRef(0);
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const [dropdownLayout, setDropdownLayout] = useState<{
    horizontal: "left" | "right";
    vertical: "bottom" | "top";
    listMaxHeight: number;
    maxWidth: number;
  }>({
    horizontal: "left",
    vertical: "bottom",
    listMaxHeight: 280,
    maxWidth: 420,
  });

  const updateDropdownLayout = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const boundaryEl = el.closest("main, [data-slot='dialog-content']");
    const boundaryRect = boundaryEl?.getBoundingClientRect();
    const padding = 16;

    const minLeft = Math.max(0, boundaryRect?.left ?? 0);
    const maxRight = Math.min(window.innerWidth, boundaryRect?.right ?? window.innerWidth);
    const minTop = Math.max(0, boundaryRect?.top ?? 0);
    const maxBottom = Math.min(window.innerHeight, boundaryRect?.bottom ?? window.innerHeight);

    const desiredWidth = Math.max(rect.width, 320);
    const spaceRight = maxRight - rect.left - padding;
    const spaceLeft = rect.right - minLeft - padding;
    const horizontal: "left" | "right" =
      spaceRight < desiredWidth && spaceLeft > spaceRight ? "right" : "left";
    const maxWidth = Math.max(240, Math.floor(horizontal === "right" ? spaceLeft : spaceRight));

    const filterHeaderHeight = 115;
    const spaceBelow = maxBottom - rect.bottom - padding;
    const spaceAbove = rect.top - minTop - padding;
    const vertical: "bottom" | "top" =
      spaceBelow < 240 && spaceAbove > spaceBelow ? "top" : "bottom";
    const availableHeight = vertical === "top" ? spaceAbove : spaceBelow;
    const listMaxHeight = Math.max(140, Math.min(280, Math.floor(availableHeight - filterHeaderHeight)));

    setDropdownLayout({ horizontal, vertical, listMaxHeight, maxWidth });
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updateDropdownLayout();
    const handleScroll = (event: Event) => {
      if (containerRef.current && event.target instanceof Node && containerRef.current.contains(event.target)) {
        return;
      }
      updateDropdownLayout();
    };
    window.addEventListener("resize", updateDropdownLayout);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      window.removeEventListener("resize", updateDropdownLayout);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [isOpen, updateDropdownLayout]);

  useEffect(() => {
    if (options) return;
    let active = true;
    const init = async () => {
      try {
        const profile = await getProfile();
        if (!active) return;
        const orgId = profile.data?.organizationId;
        if (!orgId) return;
        setOrganizationId(orgId);

        const [deptRes, desigRes] = await Promise.all([
          getDepartments(orgId),
          getDesignations(orgId),
        ]);
        if (!active) return;
        setDepartments(deptRes.data?.data || deptRes.data || []);
        setDesignations(desigRes.data?.data || desigRes.data || []);
      } catch {
        // silent
      }
    };
    init();
    return () => { active = false; };
  }, [options]);

  const fetchEmployees = useCallback(
    async (term: string, dept: string, desig: string) => {
      if (!organizationId) return;
      const request = ++requestRef.current;
      setLoading(true);
      try {
        const res = await getEmployeeSelector({
          organizationId,
          search: term || undefined,
          departmentId: dept !== "all" ? dept : undefined,
          designationId: desig !== "all" ? desig : undefined,
          limit: 1000,
        });
        if (request === requestRef.current) setEmployees(res.data || []);
      } catch {
        if (request === requestRef.current) setEmployees([]);
      } finally {
        if (request === requestRef.current) setLoading(false);
      }
    },
    [organizationId],
  );

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (options || !isOpen || !organizationId) return;
    const requests = requestRef;
    void fetchEmployees(debouncedSearch, deptFilter, desigFilter);
    return () => { ++requests.current; };
  }, [options, isOpen, debouncedSearch, deptFilter, desigFilter, organizationId, fetchEmployees]);

  useEffect(() => {
    if (!options && value && employees.length > 0) {
      const emp = employees.find((e) => e.id === value);
      if (emp) setSelectedEmployee(emp);
    }
  }, [value, employees, options]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Ignore when clicked element was unmounted or detached during event dispatch
      if (!target.isConnected) return;

      // Ignore clicks within EmployeeSelector
      if (containerRef.current && containerRef.current.contains(target)) {
        return;
      }

      // Ignore clicks within Radix Select portals (Department & Designation options)
      if (
        target.closest?.(
          '[data-slot="select-content"], [data-slot="select-item"], [data-radix-popper-content-wrapper], [data-radix-select-viewport], [role="listbox"], [role="option"]'
        )
      ) {
        return;
      }

      setIsOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("pointerdown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("pointerdown", handleClickOutside);
    };
  }, []);

  const handleSearchChange = (term: string) => {
    setSearch(term);
  };

  const handleSelect = (emp: Employee) => {
    setSelectedEmployee(emp);
    onChange(emp[valueKey] || "", emp);
    setIsOpen(false);
    setSearch("");
  };

  const handleClear = () => {
    setSelectedEmployee(null);
    onChange(allLabel ? allValue : "", undefined);
    setSearch("");
    setDeptFilter("all");
    setDesigFilter("all");
  };

  const handleResetFilters = () => {
    setDeptFilter("all");
    setDesigFilter("all");
    setSearch("");
  };

  const selected = (options || employees).find((employee) => employee[valueKey] === value)
    || (selectedEmployee?.[valueKey] === value ? selectedEmployee : null);
  const displayName = selected
    ? `${getFullName(selected) || selected.name || "Employee"}${selected.employeeCode ? ` (${selected.employeeCode})` : ""}`
    : "";
  const localOptions = employeeFilterOptions(options || [], deptFilter);
  const visibleDepartments = options ? localOptions.departments : departments;
  const visibleDesignations = options ? localOptions.designations : designations.filter((designation) => deptFilter === "all" || designation.departmentId === deptFilter);
  const results = options ? options.filter((employee) => {
    if (!matchesEmployeeFilters(employee, { departmentId: deptFilter, designationId: desigFilter })) return false;
    const label = `${getFullName(employee)} ${employee.name || ""} ${employee.employeeCode || ""} ${employee.workEmail || ""}`.toLowerCase();
    return label.includes(search.trim().toLowerCase());
  }) : employees;

  return (
    <div ref={containerRef} className={cn("relative", className)} data-employee-selector>
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
        <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
          {displayName || (allLabel && value === allValue ? allLabel : placeholder)}
        </span>
        {selected ? (
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
        <div
          className={cn(
            "absolute z-50 w-full rounded-md border bg-popover p-0 text-popover-foreground shadow-md",
            dropdownLayout.horizontal === "right" ? "right-0" : "left-0",
            dropdownLayout.vertical === "top" ? "bottom-full mb-1" : "top-full mt-1",
          )}
          style={{
            minWidth: `${Math.min(320, dropdownLayout.maxWidth)}px`,
            maxWidth: `${dropdownLayout.maxWidth}px`,
          }}
        >
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
                  <Select value={deptFilter} onValueChange={(value) => { setDeptFilter(value); setDesigFilter("all"); }}>
                    <SelectTrigger aria-label="Filter employees by department" className="h-8 text-xs flex-1 min-w-0">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Departments</SelectItem>
                      {visibleDepartments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {showDesignationFilter && (
                  <Select key={deptFilter} value={desigFilter} onValueChange={setDesigFilter}>
                    <SelectTrigger aria-label="Filter employees by designation" className="h-8 text-xs flex-1 min-w-0">
                      <SelectValue placeholder="Designation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Designations</SelectItem>
                      {visibleDesignations.map((d) => (
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
          <div
            className="overflow-y-auto"
            style={{ maxHeight: `${dropdownLayout.listMaxHeight}px` }}
            data-employee-results
          >
            {allLabel && <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-accent" onClick={() => { handleClear(); setIsOpen(false); }}>{allLabel}</button>}
            {loading ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : results.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Users className="mx-auto mb-1 h-4 w-4" />
                No employees found
              </div>
            ) : (
              <div className="py-1">
                {results.map((emp) => (
                  <button
                    key={emp[valueKey]}
                    type="button"
                    onClick={() => handleSelect(emp)}
                    className={cn(
                      "flex w-full items-start gap-3 px-3 py-2 text-left text-sm hover:bg-accent/50 transition-colors",
                      value === emp[valueKey] && "bg-accent",
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {getFullName(emp) || emp.name || "Employee"}
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
          </div>
        </div>
      )}
    </div>
  );
}
