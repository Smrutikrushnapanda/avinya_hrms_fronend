/**
 * REGRESSION — Employee Timesheet Visibility Bug
 *
 * Root cause:
 *   app/user/timesheet/page.tsx had role detection code that assumed
 *   profile.roles contained strings:
 *
 *     const isAdminUser = userRoles.some(
 *       (r: string) => r.toLowerCase() === "admin" || ...
 *     );
 *
 *   However, the JWT strategy (jwt.strategy.ts) returns roles as objects:
 *
 *     [{ roleId: "...", roleName: "EMPLOYEE", type: "...", description: "..." }]
 *
 *   Calling .toLowerCase() on a role object threw TypeError, which was caught
 *   by the catch block, preventing setOrganizationId(orgId) and setEmployeeId(empId)
 *   from executing. TimesheetSection then received organizationId="" and returned
 *   0 entries.
 *
 * Fix:
 *   Extracted normalizeRoleNames() and hasAdminRole() helpers that handle all
 *   role formats (string, string[], object, object[], null/undefined) safely.
 *   Moved setOrganizationId/setIsApprover/setIsAdmin BEFORE the employee fetch
 *   so role detection errors never block core state initialization.
 *
 * Run: npx tsx __tests__/timesheet-role-normalization.test.ts
 */

// ─── Copied from app/user/timesheet/page.tsx (pure logic, no React deps) ───

const ADMIN_ROLE_NAMES = new Set(["admin", "super_admin", "organization_admin"]);

function normalizeRoleNames(raw: unknown): string[] {
  if (raw == null) return [];
  const arr = Array.isArray(raw) ? raw : [raw];
  return arr
    .map((r) => {
      if (typeof r === "string") return r;
      if (r && typeof r === "object" && typeof (r as any).roleName === "string")
        return (r as any).roleName;
      return null;
    })
    .filter((name): name is string => typeof name === "string");
}

function hasAdminRole(raw: unknown): boolean {
  return normalizeRoleNames(raw).some((name) =>
    ADMIN_ROLE_NAMES.has(name.toLowerCase()),
  );
}

// ─── Tests ─────────────────────────────────────────────────────────────────

let ts_passed = 0;
let ts_failed = 0;

function ts_assert(condition: boolean, label: string) {
  if (condition) {
    ts_passed++;
    console.log(`  ✓ ${label}`);
  } else {
    ts_failed++;
    console.error(`  ✗ ${label}`);
  }
}

console.log("\nREGRESSION — timesheet role normalization\n");

// ── normalizeRoleNames ──────────────────────────────────────────────────────

console.log("normalizeRoleNames:");

ts_assert(
  normalizeRoleNames("EMPLOYEE") .length === 1 &&
    normalizeRoleNames("EMPLOYEE")[0] === "EMPLOYEE",
  'string "EMPLOYEE" → ["EMPLOYEE"]',
);

ts_assert(
  normalizeRoleNames(["ADMIN", "HR"]).length === 2 &&
    normalizeRoleNames(["ADMIN", "HR"])[0] === "ADMIN" &&
    normalizeRoleNames(["ADMIN", "HR"])[1] === "HR",
  'string[] ["ADMIN", "HR"] → ["ADMIN", "HR"]',
);

ts_assert(
  normalizeRoleNames({ roleName: "EMPLOYEE" }).length === 1 &&
    normalizeRoleNames({ roleName: "EMPLOYEE" })[0] === "EMPLOYEE",
  'object { roleName: "EMPLOYEE" } → ["EMPLOYEE"]',
);

ts_assert(
  normalizeRoleNames([
    { roleId: "1", roleName: "EMPLOYEE" },
    { roleId: "2", roleName: "ADMIN" },
  ]).length === 2 &&
    normalizeRoleNames([
      { roleId: "1", roleName: "EMPLOYEE" },
      { roleId: "2", roleName: "ADMIN" },
    ])[0] === "EMPLOYEE" &&
    normalizeRoleNames([
      { roleId: "1", roleName: "EMPLOYEE" },
      { roleId: "2", roleName: "ADMIN" },
    ])[1] === "ADMIN",
  "object[] with roleName → extracted correctly",
);

ts_assert(
  normalizeRoleNames(null).length === 0,
  "null → []",
);

ts_assert(
  normalizeRoleNames(undefined).length === 0,
  "undefined → []",
);

ts_assert(
  normalizeRoleNames([]).length === 0,
  "empty array → []",
);

ts_assert(
  normalizeRoleNames([null, undefined, 42]).length === 0,
  "mixed invalid entries → []",
);

ts_assert(
  normalizeRoleNames([{ roleName: "ADMIN" }, "HR", null, { roleName: "MANAGER" }]).length === 3 &&
    normalizeRoleNames([{ roleName: "ADMIN" }, "HR", null, { roleName: "MANAGER" }])[0] === "ADMIN" &&
    normalizeRoleNames([{ roleName: "ADMIN" }, "HR", null, { roleName: "MANAGER" }])[1] === "HR" &&
    normalizeRoleNames([{ roleName: "ADMIN" }, "HR", null, { roleName: "MANAGER" }])[2] === "MANAGER",
  "mixed strings and objects → all extracted",
);

// ── hasAdminRole ────────────────────────────────────────────────────────────

console.log("\nhasAdminRole:");

ts_assert(
  hasAdminRole("ADMIN") === true,
  'string "ADMIN" → true',
);

ts_assert(
  hasAdminRole("admin") === true,
  'string "admin" (lowercase) → true',
);

ts_assert(
  hasAdminRole("SUPER_ADMIN") === true,
  'string "SUPER_ADMIN" → true',
);

ts_assert(
  hasAdminRole("ORGANIZATION_ADMIN") === true,
  'string "ORGANIZATION_ADMIN" → true',
);

ts_assert(
  hasAdminRole("EMPLOYEE") === false,
  'string "EMPLOYEE" → false',
);

ts_assert(
  hasAdminRole(["EMPLOYEE", "MANAGER"]) === false,
  '["EMPLOYEE", "MANAGER"] → false',
);

ts_assert(
  hasAdminRole(["EMPLOYEE", "ADMIN"]) === true,
  '["EMPLOYEE", "ADMIN"] → true',
);

ts_assert(
  hasAdminRole({ roleId: "1", roleName: "ADMIN" }) === true,
  '{ roleName: "ADMIN" } → true',
);

ts_assert(
  hasAdminRole({ roleId: "1", roleName: "EMPLOYEE" }) === false,
  '{ roleName: "EMPLOYEE" } → false',
);

ts_assert(
  hasAdminRole([
    { roleId: "1", roleName: "EMPLOYEE" },
    { roleId: "2", roleName: "SUPER_ADMIN" },
  ]) === true,
  '[{ roleName: "EMPLOYEE" }, { roleName: "SUPER_ADMIN" }] → true',
);

ts_assert(
  hasAdminRole(null) === false,
  "null → false",
);

ts_assert(
  hasAdminRole(undefined) === false,
  "undefined → false",
);

ts_assert(
  hasAdminRole("") === false,
  'empty string "" → false',
);

ts_assert(
  hasAdminRole([]) === false,
  "empty array → false",
);

// ── Critical regression: role object must not throw ─────────────────────────

console.log("\nRegression — role objects must never throw:");

let threw = false;
try {
  // This is the exact shape returned by the JWT strategy
  const productionRoles = [
    { roleId: "e5b761f6-d557-4d45-b724-aa1b3b2cb95a", roleName: "EMPLOYEE", type: "SYSTEM", description: "Regular employee" },
  ];
  hasAdminRole(productionRoles);
} catch {
  threw = true;
}
ts_assert(!threw, "hasAdminRole([{ roleName: 'EMPLOYEE' }]) does NOT throw TypeError");

let threw2 = false;
try {
  const mixedRoles = [
    { roleId: "a", roleName: "EMPLOYEE" },
    { roleId: "b", roleName: "ADMIN" },
  ];
  hasAdminRole(mixedRoles);
} catch {
  threw2 = true;
}
ts_assert(!threw2, "hasAdminRole([{roleName:'EMPLOYEE'},{roleName:'ADMIN'}]) does NOT throw TypeError");

// ── Critical regression: EMPLOYEE profile initialization ────────────────────

console.log("\nRegression — employee profile initialization completes:");

// Simulates the init() logic from app/user/timesheet/page.tsx
function simulateEmployeeInit(profile: any) {
  let organizationId = "";
  let employeeId = "";
  let isAdmin = false;

  try {
    const orgId = profile.organizationId ?? "";
    const uid = profile.id ?? profile.userId ?? "";

    organizationId = orgId; // setOrganizationId
    isAdmin = hasAdminRole(profile.role ?? profile.roles); // setIsAdmin

    if (uid) {
      // Simulate getEmployeeByUserId returning the employee record
      employeeId = profile.employee?.id ?? "resolved-employee-id";
    }
  } catch {
    // catch block
  }

  return { organizationId, employeeId, isAdmin };
}

// Case 1: Production JWT payload with role objects
const result1 = simulateEmployeeInit({
  userId: "user-uuid-123",
  organizationId: "org-uuid-456",
  roles: [{ roleId: "r1", roleName: "EMPLOYEE", type: "SYSTEM", description: "" }],
  isApprover: false,
  employee: { id: "emp-uuid-789" },
});
ts_assert(result1.organizationId === "org-uuid-456", "EMPLOYEE profile → organizationId is set");
ts_assert(result1.employeeId === "emp-uuid-789", "EMPLOYEE profile → employeeId is set");
ts_assert(result1.isAdmin === false, "EMPLOYEE profile → isAdmin is false");

// Case 2: ADMIN with role objects
const result2 = simulateEmployeeInit({
  userId: "user-uuid-admin",
  organizationId: "org-uuid-456",
  roles: [{ roleId: "r1", roleName: "ADMIN", type: "SYSTEM", description: "" }],
  isApprover: true,
  employee: { id: "emp-admin-001" },
});
ts_assert(result2.organizationId === "org-uuid-456", "ADMIN profile → organizationId is set");
ts_assert(result2.employeeId === "emp-admin-001", "ADMIN profile → employeeId is set");
ts_assert(result2.isAdmin === true, "ADMIN profile → isAdmin is true");

// Case 3: null roles (edge case)
const result3 = simulateEmployeeInit({
  userId: "user-uuid-edge",
  organizationId: "org-uuid-456",
  roles: null,
  isApprover: false,
  employee: { id: "emp-edge-001" },
});
ts_assert(result3.organizationId === "org-uuid-456", "null roles → organizationId is set");
ts_assert(result3.employeeId === "emp-edge-001", "null roles → employeeId is set");
ts_assert(result3.isAdmin === false, "null roles → isAdmin is false");

// Case 4: SUPER_ADMIN with role objects
const result4 = simulateEmployeeInit({
  userId: "user-uuid-super",
  organizationId: "org-uuid-456",
  roles: [{ roleId: "r1", roleName: "SUPER_ADMIN", type: "SYSTEM", description: "" }],
  isApprover: true,
  employee: { id: "emp-super-001" },
});
ts_assert(result4.isAdmin === true, "SUPER_ADMIN profile → isAdmin is true");

// Case 5: ORGANIZATION_ADMIN with role objects
const result5 = simulateEmployeeInit({
  userId: "user-uuid-orgadmin",
  organizationId: "org-uuid-456",
  roles: [{ roleId: "r1", roleName: "ORGANIZATION_ADMIN", type: "SYSTEM", description: "" }],
  isApprover: true,
  employee: { id: "emp-orgadmin-001" },
});
ts_assert(result5.isAdmin === true, "ORGANIZATION_ADMIN profile → isAdmin is true");

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${ts_passed + ts_failed} tests: ${ts_passed} passed, ${ts_failed} failed\n`);
process.exit(ts_failed > 0 ? 1 : 0);
