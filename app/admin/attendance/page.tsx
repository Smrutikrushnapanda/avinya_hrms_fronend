"use client";

import { useEffect, useState } from "react";
import { format, isBefore, parse } from "date-fns";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import {
  BadgeCheck,
  Camera,
  ChevronLeft,
  ChevronRight,
  Clock4,
  ClipboardList,
  FileText,
  Laptop,
  MapPin,
  Settings,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import AttendanceReportModal from "./components/AttendanceReportModal";
import api, { getProfile } from "../../api/api";

type Attendance = {
  userId: string;
  userName: string;
  email?: string;
  profileImage: string;
  profileImageSigned?: string;
  employeeCode: string;
  status: string;
  workingMinutes?: number;
  inTime?: string;
  inPhotoUrl?: string;
  inPhotoUrlSigned?: string;
  outTime?: string;
  outPhotoUrl?: string;
  outPhotoUrlSigned?: string;
  inLocationAddress?: string;
  outLocationAddress?: string;
  inLatitude?: number | string;
  inLongitude?: number | string;
  outLatitude?: number | string;
  outLongitude?: number | string;
  inDeviceInfo?: string;
  outDeviceInfo?: string;
  inWifiSsid?: string;
  outWifiSsid?: string;
  anomalyFlag?: boolean;
  anomalyReason?: string;
};

const statusGradientMap: Record<string, string> = {
  present: "bg-gradient-to-r from-green-200 to-green-100 text-green-800",
  absent: "bg-gradient-to-r from-red-200 to-red-100 text-red-800",
  "incomplete-hours":
    "bg-gradient-to-r from-amber-200 to-amber-100 text-amber-900",
  "half-day": "bg-gradient-to-r from-yellow-200 to-yellow-100 text-yellow-800",
  late: "bg-gradient-to-r from-orange-200 to-orange-100 text-orange-800",
  "on-leave": "bg-gradient-to-r from-blue-200 to-blue-100 text-blue-800",
  holiday: "bg-gradient-to-r from-purple-200 to-purple-100 text-purple-800",
  weekend: "bg-gradient-to-r from-gray-200 to-gray-100 text-gray-800",
  "work-from-home": "bg-gradient-to-r from-cyan-200 to-cyan-100 text-cyan-800",
};

const statusLabelMap: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  "incomplete-hours": "Incomplete Hours",
  "half-day": "Half Day",
  late: "Late",
  "on-leave": "On Leave",
  holiday: "Holiday",
  weekend: "Weekend",
  "work-from-home": "Work From Home",
};

const parseTime = (timeStr: string) =>
  parse(timeStr, "hh:mm a", new Date());

const formatCoordinate = (value?: number | string): string | null => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return null;
  return numeric.toFixed(6);
};

const resolveLocationText = (
  locationAddress?: string,
  latitude?: number | string,
  longitude?: number | string
): string | null => {
  const trimmedAddress = locationAddress?.trim();
  if (trimmedAddress) return trimmedAddress;

  const lat = formatCoordinate(latitude);
  const lng = formatCoordinate(longitude);
  if (!lat || !lng) return null;
  return `Lat ${lat}, Lng ${lng}`;
};

function PhotoDialog({
  imageUrl,
  label,
}: {
  imageUrl?: string | null;
  label: string;
}) {
  if (!imageUrl) return "-";

  return (
    <Dialog>
      <DialogTrigger asChild>
        <div className="w-[48px] h-[64px] overflow-hidden rounded-md ring-1 ring-muted cursor-pointer hover:scale-105 transition">
          <Image
            src={imageUrl}
            alt={label}
            width={48}
            height={64}
            className="object-cover w-full h-full"
          />
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-2xl p-10">
        <Image
          src={imageUrl}
          alt={`Full ${label}`}
          width={500}
          height={700}
          className="w-full h-auto object-contain rounded"
        />
      </DialogContent>
    </Dialog>
  );
}

const columns: ColumnDef<Attendance>[] = [
  {
    id: "serial",
    header: () => <span>Sr. No.</span>,
    cell: ({ row }) => row.index + 1,
    enableSorting: false,
    size: 40,
  },
  {
    accessorKey: "userName",
    header: () => (
      <div className="flex items-center gap-1">
        <User className="w-4 h-4" />
        <span>Employee Name</span>
      </div>
    ),
    cell: ({ row }) => {
      const { userName, employeeCode, profileImage, profileImageSigned } =
        row.original;
      const avatarSrc =
        profileImageSigned || profileImage || "/default-avatar.png";
      return (
        <div className="flex items-center gap-3 w-[200px]">
          <img
            src={avatarSrc}
            alt={userName}
            className="w-10 h-10 rounded-full object-cover ring-1 ring-muted-foreground/20"
          />
          <div className="flex flex-col">
            <span className="font-semibold whitespace-normal break-words">
              {userName}
            </span>
            <div className="w-full border-b my-0.5" />
            <span className="text-xs text-muted-foreground font-semibold">
              {employeeCode}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    id: "clockInOut",
    header: () => (
      <div className="flex items-center gap-1">
        <Clock4 className="w-4 h-4" />
        <span>Clock-In & Out</span>
      </div>
    ),
    cell: ({ row }) => {
      const { inTime, outTime, workingMinutes } = row.original;
      const inDate = parseTime(inTime ?? "00:00");
      const outDate = parseTime(outTime ?? "00:00");

      const getInTimeColor = () => {
        if (isBefore(inDate, parse("10:00 AM", "hh:mm a", new Date())))
          return "text-green-600";
        if (isBefore(inDate, parse("11:00 AM", "hh:mm a", new Date())))
          return "text-orange-600";
        return "text-red-600";
      };

      const getOutTimeColor = () => {
        if (isBefore(outDate, parse("06:30 PM", "hh:mm a", new Date())))
          return "text-orange-600";
        return "text-green-600";
      };

      const getDurationColor = () => {
        if (typeof workingMinutes !== "number") return "text-gray-400";
        if (workingMinutes < 240) return "text-red-500";
        if (workingMinutes < 360) return "text-orange-500";
        if (workingMinutes < 480) return "text-yellow-500";
        if (workingMinutes < 600) return "text-lime-500";
        if (workingMinutes < 720) return "text-green-500";
        return "text-emerald-600";
      };

      const duration =
        workingMinutes !== undefined
          ? `${Math.floor(workingMinutes / 60)}h ${workingMinutes % 60}m`
          : "-";

      return (
        <div className="flex flex-col items-center text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <span className={`${getInTimeColor()} font-bold`}>{inTime}</span>
            <div className="font-semibold">
              ----
              <span className={`font-semibold ${getDurationColor()}`}>
                {" "}
                {duration}{" "}
              </span>
              ----
            </div>
            <span className={`${getOutTimeColor()} font-bold`}>{outTime}</span>
          </div>
        </div>
      );
    },
  },
  {
    id: "inPhoto",
    header: () => (
      <div className="flex items-center gap-1">
        <Camera className="w-4 h-4" />
        <span>In Photo</span>
      </div>
    ),
    cell: ({ row }) => {
      const { inPhotoUrlSigned, inPhotoUrl } = row.original;
      const imageUrl = inPhotoUrlSigned || inPhotoUrl;

      return <PhotoDialog imageUrl={imageUrl} label="In Photo" />;
    },
  },
  {
    id: "outPhoto",
    header: () => (
      <div className="flex items-center gap-1">
        <Camera className="w-4 h-4" />
        <span>Out Photo</span>
      </div>
    ),
    cell: ({ row }) => {
      const { outPhotoUrlSigned, outPhotoUrl } = row.original;
      const imageUrl = outPhotoUrlSigned || outPhotoUrl;

      return <PhotoDialog imageUrl={imageUrl} label="Out Photo" />;
    },
  },
  {
    id: "location",
    header: () => (
      <div className="flex items-center gap-1 w-[150px]">
        <MapPin className="w-4 h-4" />
        <span>Location</span>
      </div>
    ),
    cell: ({ row }) => {
      const inLocation = resolveLocationText(
        row.original.inLocationAddress,
        row.original.inLatitude,
        row.original.inLongitude
      );
      const outLocation = resolveLocationText(
        row.original.outLocationAddress,
        row.original.outLatitude,
        row.original.outLongitude
      );

      if (!inLocation && !outLocation) {
        return <div className="text-sm text-muted-foreground">-</div>;
      }

      return (
        <div className="flex flex-col text-blue-600 text-sm gap-1">
          {inLocation && (
            <div className="flex items-center">
              <span className="whitespace-normal break-words">{inLocation}</span>
            </div>
          )}
          {!inLocation && outLocation && (
            <div className="flex items-center">
              <span className="whitespace-normal break-words">{outLocation}</span>
            </div>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "inDeviceInfo",
    header: () => (
      <div className="flex items-center gap-1">
        <Laptop className="w-4 h-4" />
        <span>Device</span>
      </div>
    ),
    cell: ({ getValue }) => {
      const device = getValue<string>();
      return <div className="text-sm">{device || "-"}</div>;
    },
  },
  {
    accessorKey: "status",
    header: () => (
      <div className="flex items-center gap-1">
        <BadgeCheck className="w-4 h-4" />
        <span>Status</span>
      </div>
    ),
    cell: ({ row }) => {
      const status = row.original.status;
      const label = statusLabelMap[status] || status;
      const gradientClass = statusGradientMap[status] || "bg-gradient-to-r from-gray-200 to-gray-100 text-gray-800";

      return (
        <span
          className={`text-xs px-3 py-1 rounded-full font-semibold shadow-sm ${gradientClass}`}
        >
          {label}
        </span>
      );
    },
  },
];

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
              <div className="grid grid-cols-5 divide-x text-center mt-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="h-6 bg-gray-200 rounded mb-2"></div>
                    <div className="h-3 bg-gray-100 rounded mb-1"></div>
                    <div className="h-3 bg-gray-100 rounded"></div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-5 divide-x text-center mt-4">
                <div>
                  <p className="text-xl font-bold text-amber-600">
                    {stats?.notPresentSummary?.incompleteHours ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">Incomplete hours</p>
                  <p className="text-xs text-amber-600">
                    {formatDiff(stats?.notPresentSummary?.incompleteHoursDiff ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xl font-bold text-red-600">
                    {stats?.notPresentSummary?.absent ?? "-"}
                  </p>
                  <p className="text-xs text-muted-foreground">Absent (no punch)</p>
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
