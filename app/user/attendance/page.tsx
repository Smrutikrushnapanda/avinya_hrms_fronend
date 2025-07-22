"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { columns } from "./components/columns";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import AxiosInstance from "../../api/api";

export default function AttendancePage() {
  const [date, setDate] = useState(new Date());
  const [data, setData] = useState([]);
  const [search, setSearch] = useState(""); 
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const fetchData = async () => {
      const formattedDate = format(date, "yyyy-MM-dd");
      const res = await AxiosInstance.get("/attendance/by-date", {
        params: {
          organizationId: "24facd21-265a-4edd-8fd1-bc69a036f755",
          date: formattedDate,
          page,
          limit: 50,
          search,
          status: "present",
        },
      });
      setData(res.data.results || []);
      setTotalPages(res.data.pagination?.totalPages || 1);
    };
    fetchData();
  }, [date, search, page]);

  const handlePrevDate = () =>
    setDate((prev) => new Date(prev.setDate(prev.getDate() - 1)));
  const handleNextDate = () =>
    setDate((prev) => new Date(prev.setDate(prev.getDate() + 1)));

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

      {/* Search and Pagination Controls */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <Input
          className="w-full md:w-1/3"
          placeholder="Search employee"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
        />
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Prev
          </Button>
          <Button
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <DataTable columns={columns} data={data} />
    </div>
  );
}
