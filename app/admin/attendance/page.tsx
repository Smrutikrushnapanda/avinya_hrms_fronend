"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { columns } from "./components/columns";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ClipboardList, FileText, Settings } from "lucide-react";
import api, { getProfile } from "../../api/api";
import { SortingState } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AttendanceReportModal from "./components/AttendanceReportModal";
import Link from "next/link";

export default function AttendancePage() {
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [organizationId, setOrganizationId] = useState<string>("");
  const [state, setState] = useState<{
    page: number;
    pageSize: number;
    search: string;
    sorting: SortingState;
  }>({
    page: 0,
    pageSize: 50,
    search: "",
    sorting: [],
  });

  useEffect(() => {
    getProfile()
      .then((res) => {
        const orgId = res.data?.organizationId;
        if (orgId) setOrganizationId(orgId);
      })
      .catch((err) => console.error("Failed to fetch profile:", err));
  }, []);

  useEffect(() => {
    if (!organizationId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const formattedDate = format(date, "yyyy-MM-dd");

        // Fetch table data
        const res = await api.get("/attendance/by-date", {
          params: {
            organizationId,
            date: formattedDate,
            page: state.page + 1,
            limit: state.pageSize,
            search: state.search,
            status: "all",
            sortBy: state.sorting[0]?.id,
            sortOrder: state.sorting[0]?.desc ? "desc" : "asc",
          },
        });

        const rows = res.data.results || [];

        // Hydrate signed URLs for private Supabase keys
        const hydrated = await Promise.all(
          rows.map(async (row: any) => {
            const profileSigned =
              row.profileImage && !row.profileImage.startsWith("http")
                ? await api
                    .get("/attendance/photo-url", { params: { key: row.profileImage } })
                    .then((r) => r.data.signedUrl)
                    .catch(() => null)
                : row.profileImage;

            const [inSigned, outSigned] = await Promise.all([
              row.inPhotoUrl
                ? api
                    .get("/attendance/photo-url", {
                      params: { key: row.inPhotoUrl },
                    })
                    .then((r) => r.data.signedUrl)
                    .catch(() => null)
                : null,
              row.outPhotoUrl
                ? api
                    .get("/attendance/photo-url", {
                      params: { key: row.outPhotoUrl },
                    })
                    .then((r) => r.data.signedUrl)
                    .catch(() => null)
                : null,
            ]);

            return {
              ...row,
              profileImageSigned: profileSigned,
              inPhotoUrlSigned: inSigned,
              outPhotoUrlSigned: outSigned,
            };
          }),
        );

        setData(hydrated);
        setTotalPages(res.data.pagination?.totalPages || 1);

        // Fetch daily stats
        const statsRes = await api.get("/attendance/daily-stats", {
          params: {
            organizationId,
            date: formattedDate,
          },
        });

        setStats(statsRes.data);
      } catch (error) {
        console.error("Error fetching attendance data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [date, state, organizationId]);

  const handlePrevDate = () => {
    setDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() - 1);
      return newDate;
    });
  };

  const handleNextDate = () => {
    setDate((prev) => {
      const newDate = new Date(prev);
      newDate.setDate(newDate.getDate() + 1);
      return newDate;
    });
  };

  const formatDiff = (value: number) =>
    `${value >= 0 ? "+" : ""}${value ?? 0} vs yesterday`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <h1 className="text-2xl font-bold border-r pr-5">Attendance</h1>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={handlePrevDate}>
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm font-medium">
              {format(date, "EEEE, dd MMMM yyyy")}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextDate}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/attendance/settings">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
          <Button 
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2"
          >
            <FileText className="h-4 w-4" />
            Attendance Report
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Present Summary */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-green-600" />
              Present Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-4 divide-x text-center mt-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded mb-1"></div>
                    <div className="h-3 bg-gray-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 divide-x text-center mt-4">
                <div>
                  <p className="text-xl font-bold text-green-600">
                    {stats?.presentSummary?.total_present ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Present</p>
                  <p className="text-xs text-green-600">
                    {formatDiff(stats?.presentSummary?.total_presentDiff ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold text-blue-600">0</p>
                  <p className="text-xs text-muted-foreground">On Time</p>
                  <p className="text-xs text-green-500">0 vs yesterday</p>
                </div>
                <div>
                  <p className="text-xl font-bold text-blue-600">
                    {stats?.presentSummary?.earlyClockIn ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">Early clock-in</p>
                  <p className="text-xs text-green-600">
                    {formatDiff(stats?.presentSummary?.earlyClockInDiff ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold text-orange-600">
                    {stats?.presentSummary?.lateClockIn ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">Late clock-in</p>
                  <p className="text-xs text-red-600">
                    {formatDiff(stats?.presentSummary?.lateClockInDiff ?? 0)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Not Present Summary */}
        <Card className="transition-all hover:shadow-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-red-600" />
              Not Present Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="grid grid-cols-4 divide-x text-center mt-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded mb-1"></div>
                    <div className="h-3 bg-gray-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-4 divide-x text-center mt-4">
                <div>
                  <p className="text-xl font-bold text-red-600">
                    {stats?.notPresentSummary?.absent ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">Absent</p>
                  <p className="text-xs text-green-600">
                    {formatDiff(stats?.notPresentSummary?.absentDiff ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold text-orange-600">
                    {stats?.notPresentSummary?.noClockIn ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">No clock-in</p>
                  <p className="text-xs text-orange-500">
                    {formatDiff(stats?.notPresentSummary?.noClockInDiff ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold text-orange-600">
                    {stats?.notPresentSummary?.noClockOut ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">No clock-out</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDiff(stats?.notPresentSummary?.noClockOutDiff ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold text-purple-600">
                    {stats?.notPresentSummary?.invalid ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">Invalid</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDiff(stats?.notPresentSummary?.invalidDiff ?? 0)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card className="transition-all hover:shadow-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Attendance Records</CardTitle>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Search employees..."
                value={state.search}
                onChange={(e) =>
                  setState((prev) => ({ ...prev, search: e.target.value, page: 0 }))
                }
                className="w-64"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <div className="h-10 bg-gray-100 rounded animate-pulse"></div>
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-50 rounded animate-pulse"></div>
              ))}
            </div>
          ) : (
            <DataTable
              columns={columns}
              data={data}
              pageCount={totalPages}
              state={state}
              setState={setState}
            />
          )}
        </CardContent>
      </Card>

      {/* Additional Info */}
      {!loading && data.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <ClipboardList className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Attendance Records</h3>
            <p className="text-gray-500">
              No attendance records found for {format(date, "MMMM dd, yyyy")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Attendance Report Modal */}
      <AttendanceReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        organizationId={organizationId}
      />
    </div>
  );
}
