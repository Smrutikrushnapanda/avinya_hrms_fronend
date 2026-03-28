export type OrganizationPlanType = "BASIC" | "PRO" | "ENTERPRISE" | null;

const PLAN_RESTRICTIONS_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_PLAN_RESTRICTIONS !== "false";

const BASIC_BLOCKED_PREFIXES = [
  "/admin/dashboard",
  "/admin/employees",
  "/admin/timesheets",
  "/admin/wfh-monitor",
  "/admin/meetings",
  "/admin/payroll",
  "/admin/polls",
  "/admin/posts",
  "/admin/projects",
  "/admin/clients-projects",
  "/admin/performance",
  "/admin/policy",
  "/admin/expenses",
  "/admin/reports",
  "/admin/logreport",
  "/admin/messages",
  "/admin/settings",
  "/user/employees",
  "/user/payroll",
  "/user/expenses",
  "/user/messages",
  "/user/polls",
  "/user/notifications",
  "/user/meetings",
  "/user/performance",
  "/user/policy",
  "/user/projects",
  "/user/posts",
  "/user/dashboard/mobile/services",
  "/user/dashboard/mobile/profile",
  "/user/dashboard/mobile/timesheet",
  "/user/dashboard/mobile/payroll",
  "/user/dashboard/mobile/messages",
  "/user/dashboard/mobile/polls",
  "/user/dashboard/mobile/posts",
  "/user/dashboard/mobile/settings",
  "/user/dashboard/mobile/notifications",
];

function matchesPathPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function normalizeOrganizationPlanType(
  planType?: string | null
): OrganizationPlanType {
  if (planType === "BASIC" || planType === "PRO" || planType === "ENTERPRISE") {
    return planType;
  }

  return null;
}

export function isBasicPlanType(
  planType?: OrganizationPlanType | null
): boolean {
  return PLAN_RESTRICTIONS_ENABLED && planType === "BASIC";
}

export function isPathAllowedForPlan(
  pathname: string | null | undefined,
  planType?: OrganizationPlanType | null
): boolean {
  if (!PLAN_RESTRICTIONS_ENABLED) {
    return true;
  }

  if (!pathname || planType !== "BASIC") {
    return true;
  }

  return !BASIC_BLOCKED_PREFIXES.some((prefix) =>
    matchesPathPrefix(pathname, prefix)
  );
}

export function getRestrictedRouteFallback(
  pathname: string | null | undefined
): string {
  if (!pathname) {
    return "/";
  }

  if (pathname.startsWith("/admin")) {
    return "/admin/attendance";
  }

  if (pathname.startsWith("/user/dashboard/mobile")) {
    return "/user/dashboard/mobile";
  }

  if (pathname.startsWith("/user")) {
    return "/user/dashboard";
  }

  return "/";
}
