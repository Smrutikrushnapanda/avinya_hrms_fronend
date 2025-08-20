"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { columns } from "./components/columns";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ClipboardList } from "lucide-react";
import AxiosInstance from "../../api/api";
import { SortingState } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AttendancePage() {
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState([]);
  const [stats, setStats] = useState<any>(null);
  const [totalPages, setTotalPages] = useState(1);
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
    const fetchData = async () => {
      const formattedDate = format(date, "yyyy-MM-dd");

      // Fetch table data
      const res = await AxiosInstance.get("/attendance/by-date", {
        params: {
          organizationId: "24facd21-265a-4edd-8fd1-bc69a036f755",
          date: formattedDate,
          page: state.page + 1,
          limit: state.pageSize,
          search: state.search,
          status: "all",
          sortBy: state.sorting[0]?.id,
          sortOrder: state.sorting[0]?.desc ? "desc" : "asc",
        },
      });

      setData(res.data.results || []);
      setTotalPages(res.data.pagination?.totalPages || 1);

      // Fetch daily stats
      const statsRes = await AxiosInstance.get("/attendance/daily-stats", {
        params: {
          organizationId: "24facd21-265a-4edd-8fd1-bc69a036f755",
          date: formattedDate,
        },
      });

      setStats(statsRes.data);
    };

    fetchData();
  }, [date, state]);

  const handlePrevDate = () =>
    setDate((prev) => new Date(prev.setDate(prev.getDate() - 1)));
  const handleNextDate = () =>
    setDate((prev) => new Date(prev.setDate(prev.getDate() + 1)));

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
              {format(date, "EEEE, dd MMMM")}
            </span>
            <Button variant="outline" size="icon" onClick={handleNextDate}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
        <Button>Attendance Report</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
        {/* Present Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              <ClipboardList className="w-5 h-5 text-foreground" />
              Present Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 divide-x text-center mt-4">
              <div>
                <p className="text-xl font-bold">
                  {stats?.presentSummary?.total_present ?? "-"}
                </p>
                <p className="text-xs text-muted-foreground">Total Present</p>
                <p className="text-xs text-green-600">
                  {formatDiff(stats?.presentSummary?.total_presentDiff ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xl font-bold">0</p>
                <p className="text-xs text-muted-foreground">On Time</p>
                <p className="text-xs text-green-500">0 vs yesterday</p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {stats?.presentSummary?.earlyClockIn ?? "-"}
                </p>
                <p className="text-xs text-muted-foreground">Early clock-in</p>
                <p className="text-xs text-green-600">
                  {formatDiff(stats?.presentSummary?.earlyClockInDiff ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {stats?.presentSummary?.lateClockIn ?? "-"}
                </p>
                <p className="text-xs text-muted-foreground">Late clock-in</p>
                <p className="text-xs text-red-600">
                  {formatDiff(stats?.presentSummary?.lateClockInDiff ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Not Present Summary */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1">
              <ClipboardList className="w-5 h-5 text-foreground" />
              Not Present Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 divide-x text-center mt-4">
              <div>
                <p className="text-xl font-bold">
                  {stats?.notPresentSummary?.absent ?? "-"}
                </p>
                <p className="text-xs text-muted-foreground">Absent</p>
                <p className="text-xs text-green-600">
                  {formatDiff(stats?.notPresentSummary?.absentDiff ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {stats?.notPresentSummary?.noClockIn ?? "-"}
                </p>
                <p className="text-xs text-muted-foreground">No clock-in</p>
                <p className="text-xs text-orange-500">
                  {formatDiff(stats?.notPresentSummary?.noClockInDiff ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {stats?.notPresentSummary?.noClockOut ?? "-"}
                </p>
                <p className="text-xs text-muted-foreground">No clock-out</p>
                <p className="text-xs text-muted-foreground">
                  {formatDiff(stats?.notPresentSummary?.noClockOutDiff ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xl font-bold">
                  {stats?.notPresentSummary?.invalid ?? "-"}
                </p>
                <p className="text-xs text-muted-foreground">Invalid</p>
                <p className="text-xs text-muted-foreground">
                  {formatDiff(stats?.notPresentSummary?.invalidDiff ?? 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Table */}
      <Card>
        <CardContent>
          <DataTable
            columns={columns}
            data={data}
            pageCount={totalPages}
            state={state}
            setState={setState}
          />
        </CardContent>
      </Card>
    </div>
  );
}
