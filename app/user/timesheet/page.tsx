"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";

import { getEmployeeByUserId, getEmployeeHierarchy, getProfile } from "@/app/api/api";
import TimesheetSection from "@/components/timesheet/TimesheetSection";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DirectReport = {
  id: string;
  userId: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  employeeCode?: string;
};

export default function TimesheetPage() {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [isApprover, setIsApprover] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [directReports, setDirectReports] = useState<DirectReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await getProfile();
        const profile = profileRes.data || {};
        const orgId = profile.organizationId ?? "";
        const uid = profile.id ?? profile.userId ?? "";
        const role = profile.role ?? profile.roles ?? "";
        const userRoles = Array.isArray(role) ? role : role ? [role] : [];
        const isAdminUser = userRoles.some(
          (r: string) =>
            r.toLowerCase() === "admin" ||
            r.toLowerCase() === "super_admin" ||
            r.toLowerCase() === "organization_admin",
        );
        setOrganizationId(orgId);
        setIsApprover(Boolean(profile.isApprover));
        setIsAdmin(isAdminUser);

        if (uid) {
          const employeeRes = await getEmployeeByUserId(uid);
          const empId = employeeRes.data?.id ?? "";
          setEmployeeId(empId);

          if (profile.isApprover && orgId && empId) {
            const hierarchyRes = await getEmployeeHierarchy(orgId, empId);
            const reports: DirectReport[] =
              hierarchyRes.data?.directReports ?? hierarchyRes.data?.data?.directReports ?? [];
            setDirectReports(reports);
          }
        }
      } catch (error) {
        console.error("Failed to load timesheet context:", error);
      } finally {
        setLoading(false);
      }
    };

    init();
  }, []);

  const hasTeamAccess = isApprover && directReports.length > 0;

  const directReportOptions = directReports.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: [r.firstName, r.middleName, r.lastName].filter(Boolean).join(" "),
    employeeCode: r.employeeCode,
  }));

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading timesheet...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-end flex-wrap gap-3">
        <Button
          onClick={() => router.push("/user/timesheet/add")}
          className="gap-2 bg-black text-white hover:bg-black/90"
        >
          <PlusCircle className="h-4 w-4" />
          Add Daily Work
        </Button>
      </div>

      {hasTeamAccess || isAdmin ? (
        <Tabs defaultValue="my" className="space-y-6">
          <TabsList>
            <TabsTrigger value="my">My Timesheet</TabsTrigger>
            {(hasTeamAccess || isAdmin) && <TabsTrigger value="team">Team Timesheet</TabsTrigger>}
            {isAdmin && <TabsTrigger value="project">Project Timesheet</TabsTrigger>}
          </TabsList>

          <TabsContent value="my">
            <TimesheetSection
              title="My Timesheet"
              description="Your daily work log — today's entries are editable, past days are read-only"
              organizationId={organizationId}
              mode="self"
              employeeId={employeeId}
            />
          </TabsContent>

          <TabsContent value="team">
            <TimesheetSection
              title="Team Timesheet"
              description="Review and approve your direct reports' daily work logs"
              organizationId={organizationId}
              mode="team"
              directReports={directReportOptions}
              showEmployee
              allowApproval
            />
          </TabsContent>

          <TabsContent value="project">
            <TimesheetSection
              title="Project Timesheet Board"
              description="View timesheet entries project-wise across employees in your organization"
              organizationId={organizationId}
              mode="project"
              showEmployee
              allowApproval
              projectFilterEnabled
            />
          </TabsContent>
        </Tabs>
      ) : (
        <TimesheetSection
          title="My Timesheet"
          description="Your daily work log — today's entries are editable, past days are read-only"
          organizationId={organizationId}
          mode="self"
          employeeId={employeeId}
        />
      )}
    </div>
  );
}
