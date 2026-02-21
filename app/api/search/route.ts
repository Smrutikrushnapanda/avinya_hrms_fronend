"use server";

import { NextRequest, NextResponse } from "next/server";

type UserRole = "ADMIN" | "EMPLOYEE";

type SearchTarget = {
  label: string;
  href: string;
  keywords?: string[];
};

// Central catalog of searchable pages. Keep in sync with UI menus.
const searchCatalog: Record<UserRole, SearchTarget[]> = {
  ADMIN: [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      keywords: [
        "home",
        "overview",
        "widgets",
        "stats",
        "summary",
        "attendance summary",
        "present today",
        "absent",
        "late",
        "on leave",
        "department summary",
        "headcount",
        "polls",
        "recent polls",
        "announcements",
        "alerts",
        "birthdays",
        "anniversaries",
        "attendance chart",
        "reports snapshot",
        "timesheet summary",
      ],
    },
    {
      label: "Employees",
      href: "/admin/employees",
      keywords: [
        "staff",
        "people",
        "team",
        "directory",
        "profile",
        "designation",
      ],
    },
    {
      label: "Attendance",
      href: "/admin/attendance",
      keywords: [
        "calendar",
        "presence",
        "check in",
        "check out",
        "punch",
        "shift",
      ],
    },
    {
      label: "Timesheet",
      href: "/admin/timesheets",
      keywords: ["hours", "time sheet", "logs", "tasks", "projects", "billable"],
    },
    {
      label: "Time Slips",
      href: "/admin/timeslips",
      keywords: ["timeslip", "manual slip", "correction", "retro"],
    },
    {
      label: "Clients & Projects",
      href: "/admin/clients-projects",
      keywords: ["clients", "projects", "engagements", "accounts"],
    },
    {
      label: "Leave",
      href: "/admin/leave",
      keywords: ["vacation", "holiday", "leave balance", "approve leave", "requests"],
    },
    {
      label: "WFH",
      href: "/admin/wfh",
      keywords: ["work from home", "remote", "flex", "home office"],
    },
    {
      label: "Payroll",
      href: "/admin/payroll",
      keywords: ["salary", "payslip", "ctc", "compensation", "deductions"],
    },
    {
      label: "Reports",
      href: "/admin/reports",
      keywords: ["reporting", "analytics", "export", "download", "csv"],
    },
    {
      label: "Polls",
      href: "/admin/polls",
      keywords: ["survey", "vote", "question", "opinion"],
    },
    {
      label: "Settings",
      href: "/admin/settings",
      keywords: ["preferences", "configuration", "company settings", "policy"],
    },
    {
      label: "Log Report",
      href: "/admin/logreport",
      keywords: ["logs", "activity", "audit", "history"],
    },
    {
      label: "Messages",
      href: "/admin/messages",
      keywords: ["chat", "inbox", "conversations", "dm"],
    },
    {
      label: "Notifications",
      href: "/user/notifications",
      keywords: ["alerts", "bell", "reminders"],
    },
  ],
  EMPLOYEE: [
    {
      label: "Dashboard",
      href: "/user/dashboard",
      keywords: [
        "home",
        "overview",
        "widgets",
        "stats",
        "summary",
        "attendance statistics",
        "today's attendance",
        "present",
        "absent",
        "late",
        "check in",
        "check out",
        "attendance donut chart",
        "leave balance",
        "leave used",
        "leave remaining",
        "upcoming holidays",
        "holiday calendar",
        "upcoming meetings",
        "meeting schedule",
        "employee award list",
        "awards",
        "recognition",
        "work anniversaries",
        "birthdays",
        "leaderboard",
        "announcements",
        "company news",
      ],
    },
    {
      label: "Employees",
      href: "/user/employees",
      keywords: ["staff", "people", "team", "directory", "profile", "contact"],
    },
    {
      label: "Attendance",
      href: "/user/attendance",
      keywords: [
        "calendar",
        "presence",
        "check in",
        "check out",
        "punch",
        "shift",
      ],
    },
    {
      label: "Timesheet",
      href: "/user/timesheet",
      keywords: ["hours", "time sheet", "logs", "tasks", "projects", "billable"],
    },
    {
      label: "Add Timesheet",
      href: "/user/timesheet/add",
      keywords: ["add time", "new log", "entry", "submit time"],
    },
    {
      label: "Leave",
      href: "/user/leave",
      keywords: ["vacation", "holiday", "leave balance", "apply leave", "request"],
    },
    {
      label: "Time Slips",
      href: "/user/timeslips",
      keywords: ["timeslip", "manual slip", "correction", "retro"],
    },
    {
      label: "Salary Slips",
      href: "/user/payroll",
      keywords: ["payroll", "payslip", "salary slip", "download payslip", "ctc"],
    },
    {
      label: "Messages",
      href: "/user/messages",
      keywords: ["chat", "inbox", "conversations", "dm"],
    },
    {
      label: "Polls",
      href: "/user/polls",
      keywords: ["survey", "vote", "question", "opinion"],
    },
    {
      label: "Notifications",
      href: "/user/notifications",
      keywords: ["alerts", "bell", "reminders"],
    },
  ],
};

function scoreItem(query: string, item: SearchTarget): number {
  const tokens = query.split(/\s+/).filter(Boolean);
  const haystack = [item.label, item.href, ...(item.keywords || [])].map((t) =>
    t.toLowerCase()
  );

  const matchesAllTokens = tokens.every((tk) => haystack.some((text) => text.includes(tk)));
  const directMatch = haystack.some((text) => text.includes(query) || query.includes(text));
  const startsWith = haystack.some((text) => text.startsWith(query));

  return (matchesAllTokens ? 3 : 0) + (directMatch ? 2 : 0) + (startsWith ? 1 : 0);
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const role = (searchParams.get("role") || "EMPLOYEE").toUpperCase() as UserRole;

  if (!q) {
    return NextResponse.json({ results: [] });
  }

  const catalog = searchCatalog[role] || [];
  const results = catalog
    .map((item) => ({ ...item, score: scoreItem(q, item) }))
    .filter((i) => i.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
    .slice(0, 8)
    .map(({ score, ...item }) => item);

  return NextResponse.json({ results });
}
