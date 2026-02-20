"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Camera,
  LogIn,
  LogOut,
  Timer,
  X,
  Mail,
  Phone,
  Building2,
  BadgeCheck,
  Briefcase,
  Loader2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import MobileHomeHeader from "./components/MobileHomeHeader";
import {
  getProfile,
  getHolidays,
  getTodayLogs,
  logAttendance,
  getCurrentTime,
  getMonthlyAttendance,
  getAttendanceSettings,
} from "@/app/api/api";
import { useRouter } from "next/navigation";
import AttendanceCalendar from "@/components/AttendanceCalendar";
import { startOfMonth } from "date-fns";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceStatus {
  status:
    | "present"
    | "absent"
    | "half-day"
    | "holiday"
    | "pending"
    | "leave"
    | "half-leave";
  holidayName?: string;
  inTime?: string;
  outTime?: string;
  isOptional?: boolean;
}

interface Holiday {
  id?: number;
  date?: string;
  name?: string;
  holidayType?: string;
  isOptional?: boolean;
}

interface OrgSettings {
  enableWifiValidation: boolean;
  enableGpsValidation: boolean;
  enableFaceValidation: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWorkingTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")} hrs`;
}

function formatTime12h(isoStr: string): string {
  try {
    return new Date(isoStr).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "--";
  }
}

function mapApiStatus(status: string): AttendanceStatus["status"] {
  switch (status?.toLowerCase()) {
    case "present": return "present";
    case "absent": return "absent";
    case "half-day":
    case "half_day": return "half-day";
    case "holiday": return "holiday";
    case "on-leave":
    case "leave": return "leave";
    default: return "pending";
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MobileDashboardPage() {
  const router = useRouter();

  // ── User
  const [user, setUser] = useState({
    name: "",
    role: "",
    avatar: "",
    email: "",
    phone: "",
    department: "",
    employeeId: "",
    designation: "",
    userId: "",
    organizationId: "",
  });

  // ── UI
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // ── Admin settings
  const [settings, setSettings] = useState<OrgSettings>({
    enableWifiValidation: false,
    enableGpsValidation: true,
    enableFaceValidation: true,
  });

  // ── Today attendance
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [hasPunchedInToday, setHasPunchedInToday] = useState(false);
  const [punchInTimeStr, setPunchInTimeStr] = useState("--:-- --");
  const [punchOutTimeStr, setPunchOutTimeStr] = useState("--:-- --");
  const [punchInTimestamp, setPunchInTimestamp] = useState<Date | null>(null);
  const [workingSeconds, setWorkingSeconds] = useState(0);

  // ── Device signals
  const [wifiConnected, setWifiConnected] = useState(true);
  const [locationStatus, setLocationStatus] = useState<"pending" | "available" | "denied">("pending");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  // ── Clock
  const [clockTime, setClockTime] = useState(new Date());

  // ── Calendar
  const [statusByDate, setStatusByDate] = useState<Record<string, AttendanceStatus>>({});
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));
  const [holidays, setHolidays] = useState<Holiday[]>([]);

  // Store user refs for use in callbacks
  const userRef = useRef({ organizationId: "", userId: "" });
  const settingsRef = useRef<OrgSettings>(settings);
  const coordsRef = useRef(coords);

  useEffect(() => { userRef.current = { organizationId: user.organizationId, userId: user.userId }; }, [user.organizationId, user.userId]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { coordsRef.current = coords; }, [coords]);

  // ── Live clock (every second)
  useEffect(() => {
    const interval = setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Working hours counter (every second when checked in)
  useEffect(() => {
    if (!isCheckedIn || !punchInTimestamp) return;
    const interval = setInterval(() => {
      setWorkingSeconds(Math.floor((Date.now() - punchInTimestamp.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isCheckedIn, punchInTimestamp]);

  // ── WiFi online/offline monitor
  useEffect(() => {
    setWifiConnected(navigator.onLine);
    const onOnline = () => setWifiConnected(true);
    const onOffline = () => setWifiConnected(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ── Parse today logs and update state
  const parseTodayLogs = useCallback((logs: any[]) => {
    const sorted = [...logs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const checkIns = sorted.filter((l) => l.type === "check-in");
    const checkOuts = sorted.filter((l) => l.type === "check-out");
    const lastEvent = sorted[sorted.length - 1];
    const checkedIn = !!lastEvent && lastEvent.type === "check-in";

    setIsCheckedIn(checkedIn);

    const firstIn = checkIns[0];
    const lastOut = checkOuts[checkOuts.length - 1];
    setHasPunchedInToday(!!firstIn);

    if (firstIn?.timestamp) {
      const inDate = new Date(firstIn.timestamp);
      setPunchInTimeStr(formatTime12h(firstIn.timestamp));
      setPunchInTimestamp(inDate);

      if (!checkedIn && lastOut?.timestamp) {
        const workedMs = new Date(lastOut.timestamp).getTime() - inDate.getTime();
        setWorkingSeconds(Math.floor(workedMs / 1000));
      } else if (checkedIn) {
        setWorkingSeconds(Math.floor((Date.now() - inDate.getTime()) / 1000));
      }
    } else {
      setPunchInTimeStr("--:-- --");
      setPunchInTimestamp(null);
      setWorkingSeconds(0);
    }

    setPunchOutTimeStr(lastOut?.timestamp ? formatTime12h(lastOut.timestamp) : "--:-- --");
  }, []);

  // ── Fetch today's logs
  const fetchTodayLogs = useCallback(async (orgId: string, userId: string) => {
    try {
      const res = await getTodayLogs({ organizationId: orgId, userId });
      const logs: any[] = res.data?.logs ?? res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
      parseTodayLogs(logs);
    } catch (e) {
      console.error("Failed to fetch today logs:", e);
    }
  }, [parseTodayLogs]);

  // ── Fetch monthly attendance for calendar
  const fetchMonthlyCalendar = useCallback(async (orgId: string, userId: string, month: Date) => {
    try {
      const res = await getMonthlyAttendance({
        organizationId: orgId,
        userId,
        month: month.getMonth() + 1,
        year: month.getFullYear(),
      });
      const records: any[] = res.data?.attendance ?? res.data?.data ?? (Array.isArray(res.data) ? res.data : []);
      const map: Record<string, AttendanceStatus> = {};
      for (const record of records) {
        const dateStr: string = record.attendanceDate ?? record.date ?? "";
        if (dateStr) {
          const key = dateStr.split("T")[0];
          map[key] = {
            status: mapApiStatus(record.status),
            inTime: record.inTime
              ? new Date(record.inTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
              : undefined,
            outTime: record.outTime
              ? new Date(record.outTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false })
              : undefined,
          };
        }
      }
      setStatusByDate(map);
    } catch (e) {
      console.error("Failed to fetch monthly calendar:", e);
    }
  }, []);

  // ── Request GPS location
  const requestGeolocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationStatus("denied");
      return;
    }
    setLocationStatus("pending");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        setLocationStatus("available");
      },
      () => setLocationStatus("denied"),
      { timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  // ── Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await getProfile();
        const data = profileRes.data;
        const orgId: string = data?.organizationId ?? "";
        const userId: string = data?.id ?? data?.userId ?? "";

        setUser({
          name: [data?.firstName, data?.middleName, data?.lastName].filter(Boolean).join(" ") || "User",
          role: data?.roles?.[0]?.roleName ?? "Employee",
          avatar: data?.avatar ?? "/avatar.jpg",
          email: data?.email ?? "",
          phone: data?.phone ?? "",
          department: data?.department ?? "",
          employeeId: data?.employeeId ?? "",
          designation: data?.designation ?? "",
          userId,
          organizationId: orgId,
        });

        if (orgId) {
          // Fetch admin attendance settings
          let fetchedSettings: OrgSettings = { enableWifiValidation: false, enableGpsValidation: true, enableFaceValidation: true };
          try {
            const sRes = await getAttendanceSettings(orgId);
            const s = sRes.data;
            fetchedSettings = {
              enableWifiValidation: s?.enableWifiValidation ?? false,
              enableGpsValidation: s?.enableGpsValidation ?? true,
              enableFaceValidation: s?.enableFaceValidation ?? true,
            };
            setSettings(fetchedSettings);
          } catch {
            setSettings(fetchedSettings);
          }

          // Request location only if GPS validation is enabled
          if (fetchedSettings.enableGpsValidation) {
            requestGeolocation();
          }

          // Fetch today's logs
          if (userId) {
            await fetchTodayLogs(orgId, userId);
          }

          // Fetch holidays
          try {
            const hRes = await getHolidays({ organizationId: orgId });
            const hData = hRes.data;
            setHolidays(hData?.holidays ?? (Array.isArray(hData) ? hData : []));
          } catch {
            // ignore holiday errors
          }

          // Fetch monthly calendar
          if (userId) {
            await fetchMonthlyCalendar(orgId, userId, startOfMonth(new Date()));
          }
        }
      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      }
    };

    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Re-fetch calendar on month change
  useEffect(() => {
    if (user.organizationId && user.userId) {
      fetchMonthlyCalendar(user.organizationId, user.userId, currentMonth);
    }
  }, [currentMonth, user.organizationId, user.userId, fetchMonthlyCalendar]);

  // ── Auto-refresh today's logs every 60 seconds
  useEffect(() => {
    if (!user.organizationId || !user.userId) return;
    const interval = setInterval(() => {
      fetchTodayLogs(user.organizationId, user.userId);
    }, 60000);
    return () => clearInterval(interval);
  }, [user.organizationId, user.userId, fetchTodayLogs]);

  // ── Merge holidays into statusByDate
  const holidayStatusByDate = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    for (const holiday of holidays) {
      if (holiday.date) {
        const key = new Date(holiday.date).toISOString().split("T")[0];
        map[key] = {
          status: "holiday",
          holidayName: holiday.name,
          isOptional: holiday.isOptional ?? false,
        };
      }
    }
    return map;
  }, [holidays]);

  const mergedStatusByDate = useMemo(
    () => ({ ...holidayStatusByDate, ...statusByDate }),
    [holidayStatusByDate, statusByDate]
  );

  // ── Camera: start stream; cleanup stops it when dialog closes or photo is captured
  useEffect(() => {
    if (open && !capturedImage) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: "user", aspectRatio: 3 / 4 } })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
        })
        .catch(() => toast.error("Camera access denied. Please allow camera in browser settings."));
    }
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [open, capturedImage]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
      ctx.drawImage(videoRef.current, 0, 0);
      // Stop camera immediately so the indicator light turns off right away
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setCapturedImage(canvasRef.current.toDataURL("image/jpeg", 0.8));
    }
  };

  // ── Submit punch to backend
  const submitPhoto = async () => {
    if (!capturedImage || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // Get server timestamp
      let timestamp = new Date().toISOString();
      try {
        const timeRes = await getCurrentTime();
        timestamp =
          timeRes.data?.datetime ??
          timeRes.data?.now ??
          timeRes.data?.time ??
          timestamp;
      } catch {
        // fall back to local time
      }

      const formData = new FormData();
      formData.append("organizationId", user.organizationId);
      formData.append("userId", user.userId);
      formData.append("source", "web");
      formData.append("timestamp", timestamp);
      formData.append("enableFaceValidation", String(settings.enableFaceValidation));
      formData.append("enableWifiValidation", String(settings.enableWifiValidation));
      formData.append("enableGPSValidation", String(settings.enableGpsValidation));

      if (coords) {
        formData.append("latitude", coords.latitude.toString());
        formData.append("longitude", coords.longitude.toString());
      }

      // Convert base64 data URL → Blob
      const blobRes = await fetch(capturedImage);
      const blob = await blobRes.blob();
      formData.append("photo", blob, "punch.jpg");

      const punchRes = await logAttendance(formData);
      const actionText = hasPunchedInToday ? "Last punch recorded" : "Punched in";

      if (punchRes.data?.status === "anomaly") {
        toast.warning(`${actionText} with flag: ${punchRes.data?.anomalyReason ?? "Anomaly detected"}`);
      } else {
        toast.success(`${actionText} successfully!`);
      }

      setOpen(false);
      setCapturedImage(null);

      // Refresh today's attendance
      await fetchTodayLogs(user.organizationId, user.userId);
      // Refresh current month calendar
      await fetchMonthlyCalendar(user.organizationId, user.userId, currentMonth);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message ?? "Failed to record attendance. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived clock values
  const clockDisplay = clockTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  const dateDisplay = clockTime.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const sessionText =
    clockTime.getHours() < 12 ? "Morning" : clockTime.getHours() < 17 ? "Afternoon" : "Evening";
  const greeting =
    clockTime.getHours() < 12
      ? "Good Morning"
      : clockTime.getHours() < 17
      ? "Good Afternoon"
      : "Good Evening";

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* ── Header ── */}
      <MobileHomeHeader
        user={user}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />

      {/* ── Date + Time + Punch Card ── */}
      <Card className="mx-4 -mt-10 h-38 shadow-lg">
        <CardContent className="p-4 -mt-7">
          {/* Clock row */}
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">{dateDisplay}</p>
              <p className="text-xs text-gray-500">
                {greeting} {user.name.split(" ")[0]}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{clockDisplay}</p>
              <p className="text-xs text-gray-500">{sessionText}</p>
            </div>
          </div>

          {/* Status badges — only show if admin has enabled them */}
          {(settings.enableWifiValidation || settings.enableGpsValidation) && (
            <div className="flex justify-between items-center mt-3 text-xs">
              {settings.enableWifiValidation && (
                <p className={wifiConnected ? "text-green-600" : "text-red-500"}>
                  {wifiConnected ? "✅ WiFi: Connected" : "❌ WiFi: Offline"}
                </p>
              )}
              {settings.enableGpsValidation && (
                <p
                  className={
                    locationStatus === "available"
                      ? "text-green-600"
                      : locationStatus === "denied"
                      ? "text-red-500"
                      : "text-yellow-500"
                  }
                >
                  {locationStatus === "available"
                    ? "📍 Location: Available"
                    : locationStatus === "denied"
                    ? "📍 Location: Denied"
                    : "📍 Location: Fetching…"}
                </p>
              )}
            </div>
          )}

          {/* Punch button */}
          <Button
            onClick={() => setOpen(true)}
            className={`w-full mt-4 ${
              hasPunchedInToday
                ? "bg-red-500 hover:bg-red-600"
                : "bg-green-500 hover:bg-green-600"
            } text-white flex items-center justify-center gap-2`}
          >
            <Camera className="w-4 h-4" />
            {hasPunchedInToday ? "Last Punch" : "Punch In"}
          </Button>
        </CardContent>
      </Card>

      {/* ── Punch Dialog ── */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setCapturedImage(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{hasPunchedInToday ? "Last Punch" : "Punch In"}</DialogTitle>
          </DialogHeader>

          {!capturedImage ? (
            <div className="flex flex-col items-center gap-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full aspect-[3/4] rounded-lg bg-black"
              />
              <Button onClick={capturePhoto} className="w-full bg-blue-600 text-white">
                Capture Photo
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full aspect-[3/4] rounded-lg border object-cover"
              />
              <div className="flex gap-2 w-full">
                <Button
                  onClick={submitPhoto}
                  disabled={isSubmitting}
                  className={`flex-1 ${
                    hasPunchedInToday ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"
                  } text-white`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting…
                    </>
                  ) : hasPunchedInToday ? (
                    "Confirm Last Punch"
                  ) : (
                    "Confirm Punch In"
                  )}
                </Button>
                <Button
                  onClick={() => setCapturedImage(null)}
                  disabled={isSubmitting}
                  variant="outline"
                  className="flex-1"
                >
                  Retake
                </Button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>

      {/* ── Today Attendance ── */}
      <div className="px-4 mt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-base">Today Attendance</h3>
          <p
            className="text-sm text-blue-500 cursor-pointer"
            onClick={() => router.push("/user/dashboard/mobile/attendance")}
          >
            View all
          </p>
        </div>

        <div className="space-y-2">
          <Card>
            <CardContent className="flex justify-between items-center ">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 rounded-full p-1">
                  <LogIn className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm">Punch In</p>
              </div>
              <p className="text-sm font-medium text-gray-700">{punchInTimeStr}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex justify-between items-center ">
              <div className="flex items-center gap-2">
                <div className="bg-red-100 rounded-full p-1">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-sm">Last Punch</p>
              </div>
              <p className="text-sm font-medium text-gray-700">{punchOutTimeStr}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex justify-between items-center ">
              <div className="flex items-center gap-2">
                <div className="bg-green-100 rounded-full p-1">
                  <Timer className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm">Working Hours</p>
              </div>
              <p className="text-sm font-medium text-gray-700">
                {workingSeconds > 0 ? formatWorkingTime(workingSeconds) : "0:00:00 hrs"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── Calendar ── */}
      <div className="px-4 mt-4 mb-20">
        <h3 className="font-semibold text-base mb-2">Calendar</h3>
        <Card>
          <CardContent>
            <AttendanceCalendar
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              statusByDate={mergedStatusByDate}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Sidebar Drawer ── */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div
            className="fixed inset-0 bg-black/50 transition-opacity animate-in fade-in duration-200"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="relative bg-white w-72 h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out animate-in slide-in-from-left">
            {/* Sidebar Header */}
            <div className="p-5 bg-[#0077b6] text-white">
              <div className="flex justify-between items-start mb-4">
                <Avatar className="w-14 h-14 border-2 border-white">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="text-white/80 hover:text-white p-1"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              <h2 className="text-xl font-bold truncate">{user.name}</h2>
              <p className="text-sm text-blue-100 truncate">{user.role}</p>
            </div>

            {/* Employee Details */}
            <div className="flex-1 overflow-y-auto py-4">
              <div className="px-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                  Employee Details
                </h3>

                {user.employeeId && (
                  <div className="flex items-center gap-3">
                    <BadgeCheck className="w-5 h-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Employee ID</p>
                      <p className="text-sm text-gray-700">{user.employeeId}</p>
                    </div>
                  </div>
                )}

                {user.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Email</p>
                      <p className="text-sm text-gray-700 break-all">{user.email}</p>
                    </div>
                  </div>
                )}

                {user.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Phone</p>
                      <p className="text-sm text-gray-700">{user.phone}</p>
                    </div>
                  </div>
                )}

                {user.department && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Department</p>
                      <p className="text-sm text-gray-700">{user.department}</p>
                    </div>
                  </div>
                )}

                {user.designation && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-400">Designation</p>
                      <p className="text-sm text-gray-700">{user.designation}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar Footer */}
            <div className="p-4 border-t border-gray-100">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 h-12"
                onClick={() => router.push("/logout")}
              >
                <LogOut className="w-5 h-5 mr-3" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
