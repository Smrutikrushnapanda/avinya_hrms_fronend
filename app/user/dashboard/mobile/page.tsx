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
  Coffee,
  X,
  Mail,
  Phone,
  Building2,
  BadgeCheck,
  Briefcase,
  Loader2,
  MapPin,
  Moon,
  Sun,
  UserCheck,
  Wifi,
  WifiOff,
  Newspaper,
  Home,
  Fingerprint,
  RefreshCw,
  CalendarDays,
  CalendarIcon,
  ArrowRight,
  ArrowLeft,
  Clock,
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
  toggleBreakStatus,
} from "@/app/api/api";
import { useRouter } from "next/navigation";
import AttendanceCalendar from "@/components/AttendanceCalendar";
import { startOfMonth, endOfMonth, addDays } from "date-fns";
import { useTheme } from "next-themes";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AttendanceStatus {
  status:
    | "present"
    | "absent"
    | "half-day"
    | "holiday"
    | "weekend"
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
  workingDays?: number[]; // 0=Sun ... 6=Sat
  weekdayOffRules?: Record<string, number[]>; // key=weekday (0-6), value=array of week numbers (1-5) that are off
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

function formatCoordinateLocation(latitude: number, longitude: number): string {
  return `Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)}`;
}

// ── GPS cache: avoid re-acquiring a fresh fix every time the Home tab remounts
const GPS_CACHE_KEY = "hrms_gps_location_cache";
const GPS_CACHE_MAX_AGE_MS = 5 * 60 * 1000; // 5 minutes

interface CachedLocation {
  latitude: number;
  longitude: number;
  locationName: string;
  timestamp: number;
}

function readCachedLocation(): CachedLocation | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(GPS_CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedLocation = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > GPS_CACHE_MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedLocation(entry: CachedLocation) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(GPS_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // ignore storage errors (private mode, quota, etc.)
  }
}

async function reverseGeocodeCoordinates(
  latitude: number,
  longitude: number
): Promise<string | null> {
  try {
    const bdcRes = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`
    );
    if (bdcRes.ok) {
      const bdcData = await bdcRes.json();
      const parts = [
        bdcData?.locality || bdcData?.city,
        bdcData?.principalSubdivision,
        bdcData?.countryName,
      ].filter(Boolean);
      if (parts.length > 0) {
        return parts.join(", ");
      }
    }
  } catch {
    // Fallback below
  }

  try {
    const osmRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    );
    if (!osmRes.ok) return null;
    const osmData = await osmRes.json();
    const displayName = typeof osmData?.display_name === "string" ? osmData.display_name.trim() : "";
    return displayName || null;
  } catch {
    return null;
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
  const { theme, setTheme } = useTheme();
  const isDarkTheme = theme === "dark";

  // ── User
  const [user, setUser] = useState({
    name: "",
    role: "",
    avatar: "",
    email: "",
    workEmail: "",
    phone: "",
    department: "",
    employeeId: "",
    designation: "",
    managerName: "",
    location: "",
    userId: "",
    organizationId: "",
  });

  // ── UI
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasCustomHeaderBranding, setHasCustomHeaderBranding] = useState(false);
  const [open, setOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
  const [isOnBreak, setIsOnBreak] = useState(false);
  const [activeBreakSince, setActiveBreakSince] = useState<string | null>(null);
  const [breakLoading, setBreakLoading] = useState(false);

  // ── Device signals
  const [locationStatus, setLocationStatus] = useState<"pending" | "available" | "denied">("pending");
  const [cameraStatus, setCameraStatus] = useState<"pending" | "available" | "denied">("pending");
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [gpsLocationName, setGpsLocationName] = useState("");

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

  // ── Parse today logs and update state
  const parseTodayLogs = useCallback((payload: any) => {
    const logs: any[] =
      payload?.logs ??
      payload?.data?.logs ??
      (Array.isArray(payload) ? payload : []);
    const punchInTime: string | null =
      payload?.punchInTime ?? payload?.data?.punchInTime ?? null;
    const lastPunch: string | null =
      payload?.lastPunch ?? payload?.data?.lastPunch ?? null;
    const sorted = [...logs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const checkIns = sorted.filter((l) => l.type === "check-in");
    const checkOuts = sorted.filter((l) => l.type === "check-out");
    const latestCheckIn = [...sorted].reverse().find((l) => l.type === "check-in");
    const latestCheckOut = [...sorted].reverse().find((l) => l.type === "check-out");
    let checkedIn =
      Boolean(latestCheckIn) &&
      (!latestCheckOut ||
        new Date(latestCheckIn.timestamp).getTime() >
          new Date(latestCheckOut.timestamp).getTime());
    if (!latestCheckIn && punchInTime) {
      const punchInMs = new Date(punchInTime).getTime();
      const lastPunchMs = lastPunch ? new Date(lastPunch).getTime() : NaN;
      checkedIn = !lastPunch || punchInMs > lastPunchMs;
    }

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

    const apiIsOnBreak = payload?.isOnBreak ?? payload?.data?.isOnBreak;
    const apiBreakSince = payload?.activeBreakSince ?? payload?.data?.activeBreakSince;
    if (typeof apiIsOnBreak === "boolean") {
      setIsOnBreak(apiIsOnBreak);
      setActiveBreakSince(apiBreakSince ?? null);
      return;
    }

    let breakState = false;
    let breakSince: string | null = null;
    for (const log of sorted) {
      if (log.type === "check-out" || log.type === "break-end") {
        breakState = false;
        breakSince = null;
      } else if (log.type === "break-start") {
        breakState = true;
        breakSince = log.timestamp ?? null;
      }
    }
    setIsOnBreak(breakState);
    setActiveBreakSince(breakSince);
  }, []);

  // ── Fetch today's logs
  const fetchTodayLogs = useCallback(async (orgId: string, userId: string) => {
    try {
      const res = await getTodayLogs({ organizationId: orgId, userId });
      parseTodayLogs(res.data);
    } catch (e) {
      console.error("Failed to fetch today logs:", e);
    }
  }, [parseTodayLogs]);

  const handleBreakToggle = async () => {
    if (!user.organizationId || !user.userId || breakLoading) return;
    if (!isCheckedIn && !isOnBreak) {
      toast.error("Please punch in before using break.");
      return;
    }
    try {
      setBreakLoading(true);
      const res = await toggleBreakStatus({
        organizationId: user.organizationId,
        userId: user.userId,
        source: "web",
        timestamp: new Date().toISOString(),
      });
      setIsOnBreak(Boolean(res.data?.isOnBreak));
      setActiveBreakSince(res.data?.activeBreakSince ?? null);
      await fetchTodayLogs(user.organizationId, user.userId);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Failed to update break status");
    } finally {
      setBreakLoading(false);
    }
  };

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
  const requestGeolocation = useCallback((): Promise<{ latitude: number; longitude: number } | null> => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationStatus("denied");
      return Promise.resolve(null);
    }

    setLocationStatus("pending");
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const nextCoords = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          };
          setCoords(nextCoords);
          setGpsLocationName("");
          writeCachedLocation({ ...nextCoords, locationName: "", timestamp: Date.now() });
          void reverseGeocodeCoordinates(
            nextCoords.latitude,
            nextCoords.longitude
          ).then((placeName) => {
            if (placeName) {
              setGpsLocationName(placeName);
              writeCachedLocation({ ...nextCoords, locationName: placeName, timestamp: Date.now() });
            }
          });
          setLocationStatus("available");
          resolve(nextCoords);
        },
        () => {
          setLocationStatus("denied");
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: GPS_CACHE_MAX_AGE_MS }
      );
    });
  }, []);

  const requestCameraAccess = useCallback(async (showErrorToast = true): Promise<boolean> => {
    if (typeof window === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("denied");
      if (showErrorToast) {
        toast.error("Camera is not supported in this browser.");
      }
      return false;
    }

    setCameraStatus("pending");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "user" },
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
      });
      stream.getTracks().forEach((track) => track.stop());
      setCameraStatus("available");
      return true;
    } catch {
      setCameraStatus("denied");
      if (showErrorToast) {
        toast.error("Camera access denied. Please allow camera permission.");
      }
      return false;
    }
  }, []);

  // ── Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await getProfile();
        const data = profileRes.data;
        const orgId: string = data?.organizationId ?? "";
        const userId: string = data?.id ?? data?.userId ?? "";
        const displayName =
          [data?.firstName, data?.middleName, data?.lastName].filter(Boolean).join(" ").trim() ||
          [data?.employee?.firstName, data?.employee?.middleName, data?.employee?.lastName]
            .filter(Boolean)
            .join(" ")
            .trim() ||
          data?.userName ||
          "User";

        setUser({
          name: displayName,
          role: "Employee",
          avatar: data?.avatar ?? "/avatar.jpg",
          email: data?.email ?? "",
          workEmail: data?.workEmail ?? data?.employee?.workEmail ?? "",
          phone: data?.phone ?? "",
          department: data?.department ?? "",
          employeeId: data?.employeeId ?? "",
          designation: data?.designation ?? "",
          managerName:
            data?.managerName ??
            data?.reportingManagerName ??
            data?.reportingToName ??
            "",
          location: data?.location ?? data?.branchName ?? data?.officeLocation ?? "",
          userId,
          organizationId: orgId,
        });

        if (orgId) {
          // Fetch admin attendance settings
          let fetchedSettings: OrgSettings = {
            enableWifiValidation: false,
            enableGpsValidation: true,
            enableFaceValidation: true,
          };
          try {
            const sRes = await getAttendanceSettings(orgId);
            const s = sRes.data;
            fetchedSettings = {
              enableWifiValidation: s?.enableWifiValidation ?? false,
              enableGpsValidation: s?.enableGpsValidation ?? true,
              enableFaceValidation: s?.enableFaceValidation ?? true,
              workingDays: s?.workingDays ?? undefined,
              weekdayOffRules: s?.weekdayOffRules ?? undefined,
            };
            setSettings(fetchedSettings);
          } catch {
            setSettings(fetchedSettings);
          }

          // Request location only if GPS validation is enabled.
          // Reuse a recent fix from cache first so returning to this tab
          // doesn't flash "Fetching..." and re-request GPS every time.
          if (fetchedSettings.enableGpsValidation) {
            const cached = readCachedLocation();
            if (cached && Date.now() - cached.timestamp < 60000) {
              setCoords({ latitude: cached.latitude, longitude: cached.longitude });
              setGpsLocationName(cached.locationName);
              setLocationStatus("available");
            } else {
              requestGeolocation();
            }
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
      } finally {
        setIsLoading(false);
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

  const isOrgOffDay = useCallback(
    (date: Date) => {
      const dow = date.getDay(); // 0=Sun
      const weekNum = Math.ceil(date.getDate() / 7); // 1-5
      const working = settings.workingDays;
      const offRules = settings.weekdayOffRules;

      // If workingDays provided and does NOT include this weekday, it is off
      if (Array.isArray(working) && !working.includes(dow)) return true;

      // If off rules provided, and this week number is listed for the weekday, it's off
      if (offRules && Array.isArray(offRules[dow])) {
        if (offRules[dow].includes(weekNum)) return true;
      }

      // Default: Sundays are off
      return dow === 0;
    },
    [settings]
  );

  const mergedStatusByDate = useMemo(() => {
    const merged = { ...holidayStatusByDate, ...statusByDate };

    const startMonth = startOfMonth(currentMonth);
    const endMonth = endOfMonth(currentMonth);
    for (let d = startMonth; d <= endMonth; d = addDays(d, 1)) {
      const key = d.toISOString().split("T")[0];
      const dow = d.getDay();
      const weekNum = Math.ceil(d.getDate() / 7);

      const existing = merged[key];
      const keepStatuses = ["present", "half-day", "leave", "half-leave"];

      // Decide if this day is an org off-day
      const off = isOrgOffDay(d);

      // Special: 2nd/4th Saturday default when no settings provided
      const isSaturday = dow === 6;
      const defaultSatOff =
        !settings.workingDays && !settings.weekdayOffRules
          ? (weekNum === 2 || weekNum === 4) && isSaturday
          : false;

      const shouldMarkOff = off || defaultSatOff;

      if (!shouldMarkOff) continue;

      if (existing) {
        if (existing.status === "holiday") continue; // holiday wins
        if (keepStatuses.includes(existing.status)) continue; // keep worked days
      }

      merged[key] = { status: "weekend" };
    }

    return merged;
  }, [holidayStatusByDate, statusByDate, currentMonth, isOrgOffDay, settings]);

  // ── Camera: start stream; cleanup stops it when dialog closes or photo is captured
  useEffect(() => {
    if (open && !capturedImage) {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("denied");
        toast.error("Camera is not supported in this browser.");
        return;
      }

      navigator.mediaDevices
        .getUserMedia({
          video: {
            facingMode: { ideal: "user" },
            width: { ideal: 1080 },
            height: { ideal: 1920 },
          },
        })
        .then((stream) => {
          streamRef.current = stream;
          if (videoRef.current) videoRef.current.srcObject = stream;
          setCameraStatus("available");
        })
        .catch(() => {
          setCameraStatus("denied");
          toast.error("Camera access denied. Please allow camera in browser settings.");
        });
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
      let activeCoords = coordsRef.current;
      if (settings.enableWifiValidation) {
        toast.warning(
          "WiFi validation isn't supported from the web. Your attendance will be marked as anomaly and requires admin review."
        );
      }
      if (settings.enableGpsValidation && !activeCoords) {
        activeCoords = await requestGeolocation();
        if (!activeCoords) {
          toast.error("Location permission is required because admin GPS validation is enabled.");
          return;
        }
      }

      // Get server timestamp (IST)
      let timestamp = new Date().toISOString();
      try {
        const timeRes = await getCurrentTime();
        timestamp =
          timeRes.data?.isoTime ??
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
      // These validation fields are deprecated by the server (ignored).
      // Validation is always enforced using the org's stored AttendanceSettings.
      formData.append(
        "deviceInfo",
        typeof navigator !== "undefined" ? navigator.userAgent : "web"
      );

      if (activeCoords) {
        const resolvedLocationAddress =
          gpsLocationName ||
          (await reverseGeocodeCoordinates(
            activeCoords.latitude,
            activeCoords.longitude
          )) ||
          formatCoordinateLocation(activeCoords.latitude, activeCoords.longitude);

        formData.append("latitude", activeCoords.latitude.toString());
        formData.append("longitude", activeCoords.longitude.toString());
        formData.append("locationAddress", resolvedLocationAddress);
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
  const shortDateDisplay = clockTime
    .toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    .replace(/ /g, "-");
  const greeting =
    clockTime.getHours() >= 5 && clockTime.getHours() < 12
      ? "Good Morning"
      : clockTime.getHours() < 17
      ? "Good Afternoon"
      : clockTime.getHours() < 20
      ? "Good Evening"
      : "Good Night";
  const isPunchDisabled =
    isLoading ||
    settings.enableWifiValidation ||
    (settings.enableGpsValidation && locationStatus !== "available");

  // ─── Render ────────────────────────────────────────────────────────────────

  // Calculate next holiday
  const nextHoliday = useMemo(() => {
    if (!holidays.length) return null;
    const todayStr = new Date().toISOString().split("T")[0];
    const upcoming = holidays
      .filter((h) => h.date && h.date >= todayStr)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    return upcoming[0] || null;
  }, [holidays]);

  // Format time without seconds
  const clockDisplayNoSeconds = clockTime.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const getDaysDiffStr = (dateStr?: string) => {
    if (!dateStr) return "";
    const diffTime = new Date(dateStr).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays <= 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} Days`;
    return `In ${Math.floor(diffDays / 7)} Weeks`;
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24 text-foreground">
      {/* ── Header ── */}
      <MobileHomeHeader
        user={user}
        onOpenSidebar={() => setIsSidebarOpen(true)}
        onBrandingChange={setHasCustomHeaderBranding}
      />

      {/* ── Punch Card ── */}
      <div className="px-5 mt-2">
        <div className="rounded-3xl bg-primary p-5 text-white shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-white/80 uppercase tracking-wide">
                {clockTime.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
              <span className="text-[28px] font-black block tracking-tight mt-0.5">{clockDisplayNoSeconds}</span>
              <span className="text-xs font-medium text-white/85 block mt-1">
                👋 {greeting} {user.name.split(" ")[0]}
              </span>
            </div>
            <button
              onClick={() => setOpen(true)}
              disabled={isPunchDisabled}
              className="rounded-2xl bg-white text-primary px-5 py-3.5 font-extrabold text-xs tracking-wide shadow-md flex items-center gap-1.5 disabled:opacity-60 active:scale-95 transition-transform"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  {hasPunchedInToday ? "Punch Out" : "Punch In"}
                </>
              )}
            </button>
          </div>
          {settings.enableWifiValidation && (
            <div className="mt-3.5 pt-2.5 border-t border-white/20 flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 text-white/70" />
              <span className="text-[10px] font-semibold text-white/70">WiFi validation is required by your organization — punch in from the mobile app.</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Punch Dialog ── */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setCapturedImage(null); }}>
        <DialogContent
          showCloseButton={false}
          className="!fixed !inset-0 !translate-x-0 !translate-y-0 !w-screen !h-[100svh] !min-h-[100dvh] !max-w-none !rounded-none !border-0 !p-0 !gap-0 bg-black overflow-hidden"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{hasPunchedInToday ? "Punch Out" : "Punch In"}</DialogTitle>
          </DialogHeader>

          {!capturedImage ? (
            <div className="relative h-full w-full overflow-hidden bg-black touch-none">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="absolute inset-0 h-full w-full object-contain bg-black"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/70" />

              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)]">
                <div className="rounded-full bg-black/45 px-3 py-1 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-sm">
                  {hasPunchedInToday ? "Punch Out" : "Punch In"}
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/55 text-white hover:bg-black/75"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 flex flex-col items-center gap-3 px-6 pb-[max(env(safe-area-inset-bottom),1.25rem)] pt-6">
                <p className="text-center text-xs font-medium tracking-wide text-white/85">
                  Tap capture
                </p>
                <button
                  type="button"
                  onClick={capturePhoto}
                  className="relative flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white/20 backdrop-blur-sm transition active:scale-95"
                >
                  <span className="h-14 w-14 rounded-full bg-white" />
                </button>
              </div>
            </div>
          ) : (
            <div className="relative h-full w-full overflow-hidden bg-black">
              <img
                src={capturedImage}
                alt="Captured"
                className="absolute inset-0 h-full w-full object-contain bg-black"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/70" />

              <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),1rem)]">
                <div className="rounded-full bg-black/45 px-3 py-1 text-xs font-semibold tracking-wide text-white/90 backdrop-blur-sm">
                  Preview
                </div>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/55 text-white hover:bg-black/75"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="absolute inset-x-0 bottom-0 z-10 grid grid-cols-2 gap-3 px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-6">
                <Button
                  onClick={() => setCapturedImage(null)}
                  disabled={isSubmitting}
                  variant="outline"
                  className="h-12 border-white/50 bg-black/35 text-white hover:bg-black/55"
                >
                  Retake
                </Button>
                <Button
                  onClick={submitPhoto}
                  disabled={isSubmitting}
                  className={`h-12 ${
                    hasPunchedInToday ? "bg-red-500 hover:bg-red-600" : "bg-green-600 hover:bg-green-700"
                  } text-white`}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting…
                    </>
                  ) : hasPunchedInToday ? (
                    "Confirm Punch Out"
                  ) : (
                    "Confirm Punch In"
                  )}
                </Button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>

      {/* ── Today's Overview ── */}
      <div className="px-5 mt-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-extrabold text-foreground">Today&apos;s Overview</h3>
          <p
            className="text-sm font-semibold text-primary cursor-pointer"
            onClick={() => router.push("/user/dashboard/mobile/attendance")}
          >
            View all
          </p>
        </div>

        <div className="flex flex-row flex-wrap justify-between gap-3">
          {/* Punch In Card */}
          <div className="w-[47%] rounded-2xl p-3.5 bg-blue-50 dark:bg-blue-500/10">
            <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-500/25 flex items-center justify-center mb-2.5">
              <ArrowRight className="w-4 h-4 text-primary" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground">Punch In</p>
            <p className="text-lg font-bold text-foreground mt-1 mb-2">{punchInTimeStr}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{shortDateDisplay}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-xl ${hasPunchedInToday ? "bg-emerald-100 text-emerald-700" : "bg-blue-100 text-primary"}`}>
                {hasPunchedInToday ? "Completed" : "Not done"}
              </span>
            </div>
          </div>

          {/* Last Punch Card */}
          <div className="w-[47%] rounded-2xl p-3.5 bg-red-50 dark:bg-red-500/10">
            <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-500/25 flex items-center justify-center mb-2.5">
              <ArrowLeft className="w-4 h-4 text-destructive" />
            </div>
            <p className="text-xs font-semibold text-muted-foreground">Last Punch</p>
            <p className="text-lg font-bold text-foreground mt-1 mb-2">{punchOutTimeStr}</p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{shortDateDisplay}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-xl ${punchOutTimeStr !== "--:-- --" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-destructive"}`}>
                {punchOutTimeStr !== "--:-- --" ? "Completed" : "Not done"}
              </span>
            </div>
          </div>

          {/* Working Hours Card */}
          <div className="w-[47%] rounded-2xl p-3.5 bg-emerald-50 dark:bg-emerald-500/10">
            <div className="flex items-center justify-between mb-2.5">
              <div className="w-9 h-9 rounded-full bg-emerald-100 dark:bg-emerald-500/25 flex items-center justify-center">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
            <p className="text-xs font-semibold text-muted-foreground">Working Hours</p>
            <p className="text-lg font-bold text-foreground mt-1 mb-2">
              {workingSeconds > 0 ? formatWorkingTime(workingSeconds).replace(" hrs", "") : "0:00:00"}
              <span className="text-xs text-muted-foreground font-semibold ml-1">hrs</span>
            </p>
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{shortDateDisplay}</p>
              <button onClick={() => fetchTodayLogs(user.organizationId, user.userId)} className="text-emerald-600 active:scale-90 transition-transform">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Break Card */}
          <div className={`w-[47%] rounded-2xl p-3.5 ${isOnBreak ? "bg-amber-50 dark:bg-amber-500/10" : "bg-emerald-50 dark:bg-emerald-500/10"}`}>
            <div className={`w-9 h-9 rounded-full flex items-center justify-center mb-2.5 ${isOnBreak ? "bg-amber-100 dark:bg-amber-500/25" : "bg-emerald-100 dark:bg-emerald-500/25"}`}>
              <Coffee className={`w-4 h-4 ${isOnBreak ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`} />
            </div>
            <p className="text-xs font-semibold text-muted-foreground">Break</p>
            <p className="text-xs font-semibold text-foreground mt-1 mb-2.5">
              {isOnBreak ? "On break" : "Available for work"}
            </p>
            <button
              onClick={handleBreakToggle}
              disabled={(!isCheckedIn && !isOnBreak) || breakLoading}
              className={`w-full py-2 text-xs font-bold text-white rounded-lg ${
                !isCheckedIn && !isOnBreak
                  ? "bg-muted-foreground/30 cursor-not-allowed"
                  : isOnBreak
                  ? "bg-amber-500 active:bg-amber-600"
                  : "bg-emerald-500 active:bg-emerald-600"
              }`}
            >
              {breakLoading ? "..." : isOnBreak ? "End Break" : "Start Break"}
            </button>
            {!isCheckedIn && !isOnBreak && (
              <p className="text-[10px] text-muted-foreground mt-1 text-center">Check in first</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Calendar ── */}
      <div className="px-5 mt-5">
        <h3 className="text-lg font-extrabold text-foreground mb-3">Calendar</h3>
        <Card className="border border-border rounded-2xl overflow-hidden">
          <CardContent className="p-4">
            <AttendanceCalendar
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              statusByDate={mergedStatusByDate}
            />
          </CardContent>
        </Card>
      </div>

      {/* ── Upcoming Holiday ── */}
      <div className="px-5 mt-5">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-extrabold text-foreground">Upcoming Holiday</h3>
          <p
            className="text-sm font-semibold text-primary cursor-pointer"
            onClick={() => router.push("/user/dashboard/mobile/holidays")}
          >
            View All
          </p>
        </div>
        {nextHoliday ? (
          <div className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl">
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center justify-center w-14 h-14 bg-primary text-white rounded-2xl shrink-0">
                <span className="text-xl font-extrabold leading-none">{new Date(nextHoliday.date!).getDate()}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider mt-1">
                  {new Date(nextHoliday.date!).toLocaleDateString('en-US', { month: 'short' })}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">{nextHoliday.name}</h4>
                <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold text-primary mt-1 uppercase">
                  {nextHoliday.holidayType || 'PUBLIC HOLIDAY'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-semibold bg-muted px-2 py-1 rounded-xl">
              <Clock className="w-3.5 h-3.5" />
              <span>{getDaysDiffStr(nextHoliday.date)}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-10 border border-dashed rounded-2xl text-muted-foreground text-xs">
            No upcoming holidays listed
          </div>
        )}
      </div>

      {/* ── Bottom Spacer (nav is in layout) ── */}
      <div className="h-20" />

      {/* ── Sidebar Drawer ── */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[60] flex">
          <div
            className="fixed inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setIsSidebarOpen(false)}
          />
          <div className="relative bg-card w-72 h-full shadow-2xl flex flex-col">
            <div className="p-5 bg-gradient-to-br from-primary to-indigo-700 text-white">
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
              <p className="text-sm text-white/75 truncate">{user.role}</p>
            </div>

            <div className="flex-1 overflow-y-auto py-4">
              <div className="px-4 space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Employee Details
                </h3>

                {user.employeeId && (
                  <div className="flex items-center gap-3">
                    <BadgeCheck className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Employee ID</p>
                      <p className="text-sm text-foreground">{user.employeeId}</p>
                    </div>
                  </div>
                )}

                {user.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Email</p>
                      <p className="text-sm text-foreground break-all">{user.email}</p>
                    </div>
                  </div>
                )}

                {user.workEmail && user.workEmail !== user.email && (
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Work Email</p>
                      <p className="text-sm text-foreground break-all">{user.workEmail}</p>
                    </div>
                  </div>
                )}

                {user.phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Phone</p>
                      <p className="text-sm text-foreground">{user.phone}</p>
                    </div>
                  </div>
                )}

                {user.department && (
                  <div className="flex items-center gap-3">
                    <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="text-sm text-foreground">{user.department}</p>
                    </div>
                  </div>
                )}

                {user.designation && (
                  <div className="flex items-center gap-3">
                    <Briefcase className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Designation</p>
                      <p className="text-sm text-foreground">{user.designation}</p>
                    </div>
                  </div>
                )}

                {user.managerName && (
                  <div className="flex items-center gap-3">
                    <UserCheck className="w-5 h-5 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">Reporting Manager</p>
                      <p className="text-sm text-foreground">{user.managerName}</p>
                    </div>
                  </div>
                )}

              </div>
            </div>

            <div className="p-4 border-t border-border">
              <Button
                variant="ghost"
                className="w-full justify-start text-foreground hover:bg-muted h-12 mb-2"
                onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
              >
                {isDarkTheme ? <Sun className="w-5 h-5 mr-3" /> : <Moon className="w-5 h-5 mr-3" />}
                Theme: {isDarkTheme ? "Dark" : "Light"}
              </Button>
              
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 h-12"
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
