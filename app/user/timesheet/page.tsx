"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle } from "lucide-react";

import { getEmployeeByUserId, getEmployeeHierarchy, getProfile } from "@/app/api/api";
import TimesheetSection from "@/components/timesheet/TimesheetSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type DirectReport = {
  id: string;
  userId: string;
  firstName: string;
  middleName?: string;
  lastName?: string;
  employeeCode?: string;
  department?: { name?: string };
  designation?: { name?: string };
};

export default function TimesheetPage() {
  const router = useRouter();
  const [organizationId, setOrganizationId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [isApprover, setIsApprover] = useState(false);
  const [directReports, setDirectReports] = useState<DirectReport[]>([]);
  const [selectedReportUserId, setSelectedReportUserId] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      try {
        const profileRes = await getProfile();
        const profile = profileRes.data || {};
        const orgId = profile.organizationId ?? "";
        const uid = profile.id ?? profile.userId ?? "";
        setOrganizationId(orgId);
        setIsApprover(Boolean(profile.isApprover));

        if (uid) {
          const employeeRes = await getEmployeeByUserId(uid);
          const empId = employeeRes.data?.id ?? "";
          setEmployeeId(empId);

          if (profile.isApprover && orgId && empId) {
            const hierarchyRes = await getEmployeeHierarchy(orgId, empId);
            const reports: DirectReport[] =
              hierarchyRes.data?.directReports ??
              hierarchyRes.data?.data?.directReports ??
              [];
            setDirectReports(reports);
            if (reports.length > 0) {
              setSelectedReportUserId(reports[0].userId);
            }
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

  const selectedReportName = useMemo(() => {
    const report = directReports.find((r) => r.userId === selectedReportUserId);
    if (!report) return "";
    return [report.firstName, report.middleName, report.lastName].filter(Boolean).join(" ");
  }, [directReports, selectedReportUserId]);

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

      {hasTeamAccess ? (
        <Tabs defaultValue="my" className="space-y-6">
          <TabsList>
            <TabsTrigger value="my">My Timesheet</TabsTrigger>
            <TabsTrigger value="team">Team Timesheet</TabsTrigger>
          </TabsList>

          <TabsContent value="my">
            <TimesheetSection
              title="My Timesheet"
              description="Your daily work log for the selected month"
              organizationId={organizationId}
              employeeId={employeeId}
              allowEdit
            />
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <Card>
              <CardContent className="py-5 flex flex-col gap-4">
                <div>
                  <p className="text-sm font-medium text-foreground">Select a team member</p>
                  <p className="text-xs text-muted-foreground">
                    View monthly timesheet details for direct reports
                  </p>
                </div>
                <Select
                  value={selectedReportUserId}
                  onValueChange={(value) => setSelectedReportUserId(value)}
                >
                  <SelectTrigger className="max-w-md">
                    <SelectValue placeholder="Choose an employee" />
                  </SelectTrigger>
                  <SelectContent>
                    {directReports.map((report) => {
                      const name = [report.firstName, report.middleName, report.lastName]
                        .filter(Boolean)
                        .join(" ");
                      const meta = [report.employeeCode, report.designation?.name, report.department?.name]
                        .filter(Boolean)
                        .join(" - ");
                      return (
                        <SelectItem key={report.userId} value={report.userId}>
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{name}</span>
                            {meta ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </CardContent>
            </Card>

            {selectedReportUserId ? (
              <TimesheetSection
                title={selectedReportName ? `${selectedReportName}'s Timesheet` : "Team Timesheet"}
                description="Daily work entries submitted by your team member"
                organizationId={organizationId}
                employeeId={directReports.find((r) => r.userId === selectedReportUserId)?.id || ""}
                canRemark
                managerId={employeeId}
              />
            ) : (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  Select a team member to view their timesheet.
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      ) : (
        <TimesheetSection
          title="My Timesheet"
          description="Your daily work log for the selected month"
          organizationId={organizationId}
          employeeId={employeeId}
          allowEdit
        />
      )}
    </div>
  );
}
