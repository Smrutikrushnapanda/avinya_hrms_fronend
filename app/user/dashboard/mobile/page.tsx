"use client";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  X,
  Mail,
  Phone,
  Building2,
  BadgeCheck,
  Briefcase,
  UserCheck,
  Moon,
  Sun,
  CloudMoon,
  LogOut,
  Fingerprint,
  RefreshCw,
  Clock,
  ArrowRight,
  ArrowLeft,
  Coffee,
  CalendarDays,
  Bell,
  Download,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  workingDays?: number[];
  weekdayOffRules?: Record<string, number[]>;
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
    return "--:-- --";
  }
}

function formatCoordinateLocation(latitude: number, longitude: number): string {
  return `Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)}`;
}

const GPS_CACHE_KEY = "hrms_gps_location_cache";
const GPS_CACHE_MAX_AGE_MS = 5 * 60 * 1000;

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
  } catch {}
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
      if (parts.length > 0) return parts.join(", ");
    }
  } catch {}
  try {
    const osmRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`
    );
    if (!osmRes.ok) return null;
    const osmData = await osmRes.json();
    return typeof osmData?.display_name === "string" ? osmData.display_name.trim() : null;
  } catch {
    return null;
  }
}

type PunchCardPeriod = "morning" | "noon" | "afternoon" | "evening" | "night";

interface PunchCardTheme {
  period: PunchCardPeriod;
  gradient: string;
  accentColor: string;
  showStars: boolean;
}

// Mirrors the gradient stops used by the mobile app's HomeCard.tsx
// so both surfaces render the identical time-of-day look.
function getPunchCardTheme(date: Date): PunchCardTheme {
  const hours = date.getHours();

  if (hours >= 5 && hours < 11) {
    return {
      period: "morning",
      gradient: "linear-gradient(135deg, #FFB74D 0%, #FF8A50 55%, #FF6F3C 100%)",
      accentColor: "#E85D25",
      showStars: false,
    };
  }
  if (hours >= 11 && hours < 15) {
    return {
      period: "noon",
      gradient: "linear-gradient(135deg, #FFE47A 0%, #FFC53D 55%, #FFA726 100%)",
      accentColor: "#F59E0B",
      showStars: false,
    };
  }
  if (hours >= 15 && hours < 17) {
    return {
      period: "afternoon",
      gradient: "linear-gradient(135deg, #FF9248 0%, #FB6B2C 55%, #E64A19 100%)",
      accentColor: "#E64A19",
      showStars: false,
    };
  }
  if (hours >= 17 && hours < 20) {
    return {
      period: "evening",
      gradient: "linear-gradient(160deg, #FF8A65 0%, #4A3B6B 40%, #161327 100%)",
      accentColor: "#4A3B6B",
      showStars: false,
    };
  }
  return {
    period: "night",
    gradient: "linear-gradient(160deg, #020617 0%, #0B1120 50%, #1E293B 100%)",
    accentColor: "#0b468c",
    showStars: true,
  };
}

const PUNCH_CARD_STAR_POSITIONS = [
  { top: "14px", left: "20%", size: 3, opacity: 0.9 },
  { top: "30px", left: "48%", size: 2, opacity: 0.6 },
  { top: "10px", left: "68%", size: 3, opacity: 0.8 },
  { top: "46px", left: "82%", size: 2, opacity: 0.5 },
  { top: "56px", left: "15%", size: 2, opacity: 0.7 },
  { top: "22px", left: "88%", size: 3, opacity: 0.7 },
];

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
  const [open, setOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
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

  const userRef = useRef({ organizationId: "", userId: "" });
  const settingsRef = useRef<OrgSettings>(settings);
  const coordsRef = useRef(coords);

  useEffect(() => { userRef.current = { organizationId: user.organizationId, userId: user.userId }; }, [user.organizationId, user.userId]);
  useEffect(() => { settingsRef.current = settings; }, [settings]);
  useEffect(() => { coordsRef.current = coords; }, [coords]);

  // ── Live clock
  useEffect(() => {
    const interval = setInterval(() => setClockTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  // ── Working hours counter
  useEffect(() => {
    if (!isCheckedIn || !punchInTimestamp) return;
    const interval = setInterval(() => {
      setWorkingSeconds(Math.floor((Date.now() - punchInTimestamp.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isCheckedIn, punchInTimestamp]);

  // ── Parse today logs
  const parseTodayLogs = useCallback((payload: any) => {
    const logs: any[] = payload?.logs ?? payload?.data?.logs ?? (Array.isArray(payload) ? payload : []);
    const punchInTime: string | null = payload?.punchInTime ?? payload?.data?.punchInTime ?? null;
    const lastPunch: string | null = payload?.lastPunch ?? payload?.data?.lastPunch ?? null;
    const sorted = [...logs].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const checkIns = sorted.filter((l) => l.type === "check-in");
    const checkOuts = sorted.filter((l) => l.type === "check-out");
    const latestCheckIn = [...sorted].reverse().find((l) => l.type === "check-in");
    const latestCheckOut = [...sorted].reverse().find((l) => l.type === "check-out");

    let checkedIn = Boolean(latestCheckIn) && (!latestCheckOut || new Date(latestCheckIn.timestamp).getTime() > new Date(latestCheckOut.timestamp).getTime());
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
    } catch (e) { console.error("Failed to fetch today logs:", e); }
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

  // ── Fetch monthly calendar
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
            inTime: record.inTime ? new Date(record.inTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : undefined,
            outTime: record.outTime ? new Date(record.outTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : undefined,
          };
        }
      }
      setStatusByDate(map);
    } catch (e) { console.error("Failed to fetch monthly calendar:", e); }
  }, []);

  // ── Request GPS
  const requestGeolocation = useCallback((retryCount = 0): Promise<{ latitude: number; longitude: number } | null> => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setLocationStatus("denied");
      return Promise.resolve(null);
    }
    setLocationStatus("pending");
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const nextCoords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
          setCoords(nextCoords);
          setGpsLocationName("");
          writeCachedLocation({ ...nextCoords, locationName: "", timestamp: Date.now() });
          void reverseGeocodeCoordinates(nextCoords.latitude, nextCoords.longitude).then((placeName) => {
            if (placeName) {
              setGpsLocationName(placeName);
              writeCachedLocation({ ...nextCoords, locationName: placeName, timestamp: Date.now() });
            }
          });
          setLocationStatus("available");
          resolve(nextCoords);
        },
        () => {
          if (retryCount < 2) {
            setTimeout(() => resolve(requestGeolocation(retryCount + 1)), 2000);
          } else {
            setLocationStatus("denied");
            resolve(null);
          }
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: GPS_CACHE_MAX_AGE_MS }
      );
    });
  }, []);

  // ── PWA install detection
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsAppInstalled(
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true
    );
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    const mediaHandler = (e: MediaQueryListEvent) => setIsAppInstalled(e.matches);
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener("change", mediaHandler);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      mq.removeEventListener("change", mediaHandler);
    };
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === "accepted") setIsAppInstalled(true);
      setDeferredPrompt(null);
    }
  };

  // ── Initial data fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await getProfile();
        const data = profileRes.data;
        const orgId: string = data?.organizationId ?? "";
        const userId: string = data?.id ?? data?.userId ?? "";
        const displayName = [data?.firstName, data?.middleName, data?.lastName].filter(Boolean).join(" ").trim() || "User";

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
          managerName: data?.managerName ?? data?.reportingManagerName ?? "",
          location: data?.location ?? data?.branchName ?? "",
          userId,
          organizationId: orgId,
        });

        if (orgId) {
          let fetchedSettings: OrgSettings = { enableWifiValidation: false, enableGpsValidation: true, enableFaceValidation: true };
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

          // GPS is intentionally not fetched here — only a recent cached fix
          // (if any) is reused. A live request only ever fires when the punch
          // dialog opens (see the camera-dialog effect below), not on page load.
          if (fetchedSettings.enableGpsValidation) {
            const cached = readCachedLocation();
            if (cached && Date.now() - cached.timestamp < 60000) {
              setCoords({ latitude: cached.latitude, longitude: cached.longitude });
              setGpsLocationName(cached.locationName);
              setLocationStatus("available");
            }
          }

          if (userId) {
            await fetchTodayLogs(orgId, userId);
          }

          try {
            const hRes = await getHolidays({ organizationId: orgId });
            const hData = hRes.data;
            setHolidays(hData?.holidays ?? (Array.isArray(hData) ? hData : []));
          } catch {}

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
  }, []);

  useEffect(() => {
    if (user.organizationId && user.userId) {
      fetchMonthlyCalendar(user.organizationId, user.userId, currentMonth);
    }
  }, [currentMonth, user.organizationId, user.userId, fetchMonthlyCalendar]);

  useEffect(() => {
    if (!user.organizationId || !user.userId) return;
    const interval = setInterval(() => fetchTodayLogs(user.organizationId, user.userId), 60000);
    return () => clearInterval(interval);
  }, [user.organizationId, user.userId, fetchTodayLogs]);

  const holidayStatusByDate = useMemo(() => {
    const map: Record<string, AttendanceStatus> = {};
    for (const holiday of holidays) {
      if (holiday.date) {
        const key = new Date(holiday.date).toISOString().split("T")[0];
        map[key] = { status: "holiday", holidayName: holiday.name, isOptional: holiday.isOptional ?? false };
      }
    }
    return map;
  }, [holidays]);

  const isOrgOffDay = useCallback((date: Date) => {
    const dow = date.getDay();
    const weekNum = Math.ceil(date.getDate() / 7);
    const working = settings.workingDays;
    const offRules = settings.weekdayOffRules;
    if (Array.isArray(working) && !working.includes(dow)) return true;
    if (offRules && Array.isArray(offRules[dow]) && offRules[dow].includes(weekNum)) return true;
    return dow === 0;
  }, [settings]);

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
      const off = isOrgOffDay(d);
      const isSaturday = dow === 6;
      const defaultSatOff = !settings.workingDays && !settings.weekdayOffRules ? (weekNum === 2 || weekNum === 4) && isSaturday : false;
      const shouldMarkOff = off || defaultSatOff;
      if (!shouldMarkOff) continue;
      if (existing) {
        if (existing.status === "holiday") continue;
        if (keepStatuses.includes(existing.status)) continue;
      }
      merged[key] = { status: "weekend" };
    }
    return merged;
  }, [holidayStatusByDate, statusByDate, currentMonth, isOrgOffDay, settings]);

  // ── Camera dialog - Fixed for proper display and permissions
  useEffect(() => {
    if (open && !capturedImage) {
      // Kick off geolocation the moment the punch dialog opens, in parallel
      // with camera setup, so the fix is usually already resolved by the time
      // the user finishes positioning for the photo — submitPhoto then has
      // nothing left to wait on instead of requesting location cold.
      if (settings.enableGpsValidation && !coordsRef.current) {
        requestGeolocation();
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraStatus("denied");
        toast.error("Camera is not supported in this browser.");
        return;
      }

      // Request camera with specific constraints to ensure mobile compatibility
      navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      })
      .then((stream) => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          // Ensure video plays
          videoRef.current.play().catch(() => {});
        }
        setCameraStatus("available");
      })
      .catch((err) => {
        console.error("Camera error:", err);
        setCameraStatus("denied");
        toast.error("Camera access denied. Please allow camera permissions in browser settings.");
      });
    }
    
    // Cleanup function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, [open, capturedImage]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (ctx) {
      canvasRef.current.width = videoRef.current.videoWidth || 640;
      canvasRef.current.height = videoRef.current.videoHeight || 480;
      ctx.drawImage(videoRef.current, 0, 0);
      // Stop camera immediately
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setCapturedImage(canvasRef.current.toDataURL("image/jpeg", 0.9));
    }
  };

  const submitPhoto = async () => {
    if (!capturedImage || isSubmitting) return;
    setIsSubmitting(true);
    try {
      let activeCoords = coordsRef.current;
      if (settings.enableWifiValidation) {
        toast.warning("WiFi validation isn't supported from the web.");
      }
      if (settings.enableGpsValidation && !activeCoords) {
        activeCoords = await requestGeolocation();
        if (!activeCoords) {
          toast.error("Location permission is required.");
          return;
        }
      }

      let timestamp = new Date().toISOString();
      try {
        const timeRes = await getCurrentTime();
        timestamp = timeRes.data?.isoTime ?? timeRes.data?.datetime ?? timestamp;
      } catch {}

      const formData = new FormData();
      formData.append("organizationId", user.organizationId);
      formData.append("userId", user.userId);
      formData.append("source", "web");
      formData.append("timestamp", timestamp);
      formData.append("deviceInfo", typeof navigator !== "undefined" ? navigator.userAgent : "web");

      if (activeCoords) {
        const resolvedLocationAddress = gpsLocationName || (await reverseGeocodeCoordinates(activeCoords.latitude, activeCoords.longitude)) || formatCoordinateLocation(activeCoords.latitude, activeCoords.longitude);
        formData.append("latitude", activeCoords.latitude.toString());
        formData.append("longitude", activeCoords.longitude.toString());
        formData.append("locationAddress", resolvedLocationAddress);
      }

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
      await fetchTodayLogs(user.organizationId, user.userId);
      await fetchMonthlyCalendar(user.organizationId, user.userId, currentMonth);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? "Failed to record attendance. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Derived values
  const dateDisplay = clockTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const shortDateDisplay = clockTime.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).replace(/ /g, "-");
  const greeting = clockTime.getHours() >= 5 && clockTime.getHours() < 12 ? "Good Morning" : clockTime.getHours() >= 12 && clockTime.getHours() < 17 ? "Good Afternoon" : clockTime.getHours() >= 17 && clockTime.getHours() < 20 ? "Good Evening" : "Good Night";
  const punchCardTheme = getPunchCardTheme(clockTime);
  const PunchCardIcon = punchCardTheme.period === "night" ? Moon : punchCardTheme.period === "evening" ? CloudMoon : Sun;
  // GPS is no longer pre-validated eagerly, so it isn't part of this gate —
  // the punch dialog kicks off a fresh geolocation request as soon as it opens
  // (see the camera-dialog effect), and submitPhoto blocks if that fails.
  const isPunchDisabled = isLoading;
  const clockDisplayNoSeconds = clockTime.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });

  const nextHoliday = useMemo(() => {
    if (!holidays.length) return null;
    const todayStr = new Date().toISOString().split("T")[0];
    const upcoming = holidays.filter((h) => h.date && h.date >= todayStr).sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime());
    return upcoming[0] || null;
  }, [holidays]);

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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-zinc-950 flex flex-col pb-24 text-foreground font-sans">
      
      {/* ── Header ── */}
      <div className="bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 px-5 pt-3 pb-5 flex justify-between items-center sticky top-0 z-30 relative overflow-hidden">
        {/* Animated bg circles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-[240px] h-[240px] rounded-full bg-blue-400/15 dark:bg-blue-500/20 -top-[110px] -right-[40px]" />
          <div className="absolute w-[170px] h-[170px] rounded-full bg-blue-500/15 dark:bg-blue-400/20 -bottom-[60px] -left-[10px]" />
          <div className="absolute h-[120px] left-[-20px] right-[-20px] -bottom-[60px] bg-blue-400/10 dark:bg-blue-500/15 rounded-t-full -rotate-[2deg]" />
          {[
            { s: 8, l: "10%", t: 14, d: "5.2s", k: "particle-1" },
            { s: 12, l: "28%", t: 52, d: "6.4s", k: "particle-2" },
            { s: 6, l: "46%", t: 18, d: "5.6s", k: "particle-3" },
            { s: 10, l: "64%", t: 34, d: "7.0s", k: "particle-4" },
            { s: 14, l: "82%", t: 10, d: "7.6s", k: "particle-5" },
            { s: 7, l: "20%", t: 88, d: "6.2s", k: "particle-6" },
            { s: 11, l: "58%", t: 86, d: "6.8s", k: "particle-1" },
            { s: 9, l: "74%", t: 92, d: "5.9s", k: "particle-4" },
          ].map((p, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-blue-400/50 dark:bg-white/35"
              style={{
                width: p.s,
                height: p.s,
                left: p.l,
                top: p.t,
                animation: `${p.k} ${p.d} ease-in-out infinite`,
                animationDelay: `${["0s", "0.6s", "1.2s", "0.3s", "0.9s", "1.5s", "0.4s", "1.1s"][i]}`,
              }}
            />
          ))}
        </div>
        <div 
          className="flex items-center gap-3 cursor-pointer" 
          onClick={() => setIsSidebarOpen(true)}
        >
          <Avatar className="w-12 h-12 border border-gray-200 dark:border-zinc-700">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">{greeting},</p>
            <h2 className="text-base font-bold leading-tight">{user.name}</h2>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400">{user.role}</p>
          </div>
        </div>
        
        {/* Bell icon - just a visual placeholder (no sidebar toggle) */}
        <div className="flex items-center gap-3">
          {!isAppInstalled && (
            <button
              onClick={handleInstall}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded-full text-white transition active:scale-95"
              title="Install App"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <div className="relative p-2 bg-gray-100 dark:bg-zinc-800 rounded-full">
            <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-600 rounded-full border-2 border-white dark:border-zinc-900"></div>
            <Bell className="w-5 h-5 text-gray-700 dark:text-zinc-300" />
          </div>
        </div>
      </div>

      {/* ── Punch Card ── */}
      <div className="px-4 mt-4">
        <div
          className="relative rounded-3xl p-5 text-white shadow-lg shadow-blue-900/20 overflow-hidden"
          style={{ background: punchCardTheme.gradient }}
        >
          {/* Contrast scrim so white text stays legible on bright gradients */}
          <div className="absolute inset-0 bg-black/10 pointer-events-none" />

          {/* Background glow + time-of-day icon */}
          <div className="absolute right-0 top-0 w-32 h-32 bg-white/5 rounded-full blur-2xl transform translate-x-1/2 -translate-y-1/2"></div>
          <PunchCardIcon className="absolute right-4 top-3 w-7 h-7 text-white/30" />

          {/* Stars, night only */}
          {punchCardTheme.showStars &&
            PUNCH_CARD_STAR_POSITIONS.map((star, index) => (
              <span
                key={index}
                className="absolute rounded-full bg-white"
                style={{ top: star.top, left: star.left, width: star.size, height: star.size, opacity: star.opacity }}
              />
            ))}

          <div className="relative z-10 flex flex-col justify-between min-h-[140px]">
            <div>
              <p className="text-[11px] font-medium text-blue-100/80 tracking-wide">
                {clockTime.toLocaleDateString("en-US", { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <h1 className="text-[32px] font-bold tracking-tight mt-0.5">{clockDisplayNoSeconds}</h1>
              <div className="flex items-center gap-1.5 mt-1 text-blue-100 text-sm">
                <span>👋</span>
                <span>{greeting} {user.name.split(" ")[0]}</span>
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <Button
                onClick={() => setOpen(true)}
                disabled={isPunchDisabled}
                className="bg-white hover:bg-gray-50 rounded-xl px-5 py-2.5 h-auto font-bold text-xs shadow-sm flex items-center gap-2 transition-transform active:scale-95"
                style={{ color: punchCardTheme.accentColor }}
              >
                <Fingerprint className="w-4 h-4" />
                {hasPunchedInToday ? "Punch Out" : "Punch In"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Punch Dialog - FIXED FOR CAMERA DISPLAY ── */}
      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setCapturedImage(null); }}>
        <DialogContent 
          className="max-w-none w-screen h-screen p-0 gap-0 bg-black border-0 rounded-none z-[999]"
          // This prevents pointer-events none on the backdrop effectively
          overlayClassName="bg-black/80 z-[998]"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{hasPunchedInToday ? "Punch Out" : "Punch In"}</DialogTitle>
          </DialogHeader>

          {!capturedImage ? (
            <div className="relative h-full w-full bg-black overflow-hidden">
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                muted 
                className="absolute inset-0 w-full h-full object-cover"
                // Ensures camera starts immediately
                onLoadedMetadata={(e) => e.currentTarget.play()}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />
              
              <div className="absolute top-8 left-0 right-0 flex justify-between px-6 z-10">
                <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-medium">
                  {hasPunchedInToday ? "Punch Out" : "Punch In"}
                </div>
                <button onClick={() => setOpen(false)} className="bg-black/40 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/60 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-6 z-10">
                <p className="text-white/70 text-xs tracking-wider">Position face within frame</p>
                <button 
                  onClick={capturePhoto} 
                  className="w-20 h-20 rounded-full border-4 border-white/80 bg-white/20 backdrop-blur-sm flex items-center justify-center active:scale-95 transition-transform"
                >
                  <div className="w-16 h-16 rounded-full bg-white"></div>
                </button>
              </div>
            </div>
          ) : (
            <div className="relative h-full w-full bg-black overflow-hidden">
              <img src={capturedImage} alt="Captured" className="absolute inset-0 w-full h-full object-contain" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

              <div className="absolute top-8 left-0 right-0 flex justify-between px-6 z-10">
                <div className="bg-black/40 backdrop-blur-md px-4 py-1.5 rounded-full text-white text-xs font-medium">Preview</div>
                <button onClick={() => setCapturedImage(null)} className="bg-black/40 backdrop-blur-md p-2 rounded-full text-white hover:bg-black/60 transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="absolute bottom-8 left-0 right-0 px-6 grid grid-cols-2 gap-4 z-10">
                <Button onClick={() => setCapturedImage(null)} disabled={isSubmitting} variant="outline" className="bg-black/40 border-white/20 text-white hover:bg-black/60 h-12 rounded-xl transition">
                  Retake
                </Button>
                <Button onClick={submitPhoto} disabled={isSubmitting} className={`h-12 rounded-xl text-white font-bold shadow-lg transition ${hasPunchedInToday ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"}`}>
                  {isSubmitting ? "Processing..." : hasPunchedInToday ? "Confirm Punch Out" : "Confirm Punch In"}
                </Button>
              </div>
            </div>
          )}
          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>

      {/* ── Today's Overview ── */}
      <div className="px-4 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Today&apos;s Overview</h3>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 cursor-pointer" onClick={() => router.push("/user/dashboard/mobile/attendance")}>
            View all →
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {/* Punch In */}
          <div className="bg-[#F0F7FF] dark:bg-blue-900/20 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center mb-2">
              <ArrowRight className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Punch In</p>
            <p className="text-lg font-bold text-gray-900 dark:text-zinc-100">{punchInTimeStr}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-gray-400 dark:text-zinc-500">{shortDateDisplay}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${hasPunchedInToday ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"}`}>
                {hasPunchedInToday ? "Done" : "Pending"}
              </span>
            </div>
          </div>

          {/* Last Punch */}
          <div className="bg-[#FFF5F5] dark:bg-red-900/20 p-3.5 rounded-2xl border border-red-200 dark:border-red-800">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/40 flex items-center justify-center mb-2">
              <ArrowLeft className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Last Punch</p>
            <p className="text-lg font-bold text-gray-900 dark:text-zinc-100">{punchOutTimeStr}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-gray-400 dark:text-zinc-500">{shortDateDisplay}</p>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${punchOutTimeStr !== "--:-- --" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"}`}>
                {punchOutTimeStr !== "--:-- --" ? "Done" : "Pending"}
              </span>
            </div>
          </div>

          {/* Working Hours */}
          <div className="bg-[#F2FBF5] dark:bg-emerald-900/20 p-3.5 rounded-2xl border border-emerald-200 dark:border-emerald-800">
            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center mb-2">
              <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Working Hours</p>
            <p className="text-lg font-bold text-gray-900 dark:text-zinc-100">{workingSeconds > 0 ? formatWorkingTime(workingSeconds).replace(" hrs", "") : "00:00:00"} <span className="text-xs font-normal text-gray-400 dark:text-zinc-500">hrs</span></p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] text-gray-400 dark:text-zinc-500">{shortDateDisplay}</p>
              <button onClick={() => fetchTodayLogs(user.organizationId, user.userId)} className="text-emerald-600 dark:text-emerald-400 hover:rotate-90 transition-transform">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Break */}
          <div className={`p-3.5 rounded-2xl border ${isOnBreak ? "bg-[#FFFBEB] dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-[#F2FBF5] dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${isOnBreak ? "bg-amber-100 dark:bg-amber-900/40" : "bg-emerald-100 dark:bg-emerald-900/40"}`}>
              <Coffee className={`w-4 h-4 ${isOnBreak ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"}`} />
            </div>
            <p className="text-[11px] text-gray-500 dark:text-zinc-400 font-medium">Break</p>
            <p className="text-[11px] font-semibold text-gray-900 dark:text-zinc-100 mb-2">{isOnBreak ? "On break" : "Available for work"}</p>
            <button
              onClick={handleBreakToggle}
              disabled={(!isCheckedIn && !isOnBreak) || breakLoading}
              className={`w-full py-1.5 text-[10px] font-bold text-white rounded-lg shadow-sm ${
                !isCheckedIn && !isOnBreak ? "bg-gray-300 dark:bg-zinc-700 cursor-not-allowed" :
                isOnBreak ? "bg-amber-500 hover:bg-amber-600" : "bg-emerald-500 hover:bg-emerald-600"
              }`}
            >
              {breakLoading ? "..." : isOnBreak ? "End Break" : "Start Break"}
            </button>
            {!isCheckedIn && !isOnBreak && <p className="text-[9px] text-gray-400 dark:text-zinc-500 text-center mt-1">Check in first</p>}
          </div>
        </div>
      </div>

      {/* ── Calendar ── */}
      <div className="px-4 mt-6">
        <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100 mb-3">Calendar</h3>
        <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-1">
          <AttendanceCalendar currentMonth={currentMonth} setCurrentMonth={setCurrentMonth} statusByDate={mergedStatusByDate} />
        </div>
      </div>

      {/* ── Upcoming Holiday ── */}
      <div className="px-4 mt-6">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Upcoming Holiday</h3>
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 cursor-pointer" onClick={() => router.push("/user/dashboard/mobile/holidays")}>
            View All →
          </p>
        </div>
        
        {nextHoliday ? (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center w-12 h-12 bg-[#0b468c] text-white rounded-xl shadow-md shrink-0">
                <span className="text-lg font-bold leading-none">{new Date(nextHoliday.date!).getDate()}</span>
                <span className="text-[8px] font-bold uppercase tracking-wider mt-0.5">
                  {new Date(nextHoliday.date!).toLocaleDateString('en-US', { month: 'short' })}
                </span>
              </div>
              <div>
                <h4 className="font-bold text-sm text-gray-900 dark:text-zinc-100">{nextHoliday.name}</h4>
                <div className="flex items-center gap-1 mt-0.5">
                  <CalendarDays className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-[9px] font-semibold text-blue-600 dark:text-blue-400 uppercase">
                    {nextHoliday.holidayType || 'PUBLIC HOLIDAY'}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-zinc-400 font-medium bg-gray-50 dark:bg-zinc-800 px-2 py-1 rounded-full">
              <Clock className="w-3 h-3" />
              <span>{getDaysDiffStr(nextHoliday.date)}</span>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 p-6 text-center">
            <p className="text-xs text-gray-400 dark:text-zinc-500">No upcoming holidays</p>
          </div>
        )}
      </div>

      {/* ── Bottom Spacer ── */}
      <div className="h-20" />

      {/* ── Sidebar Drawer ── */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-[60]">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed left-0 top-0 h-full w-[280px] bg-white dark:bg-zinc-900 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-5 bg-[#0b468c] text-white flex justify-between items-start">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12 border-2 border-white/50">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-lg font-bold truncate">{user.name}</h2>
                  <p className="text-xs text-blue-100 truncate">{user.role}</p>
                </div>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="text-white/70 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 px-4 space-y-4">
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">Employee Details</h3>
                {user.employeeId && (
                  <div className="flex items-start gap-3"><BadgeCheck className="w-4 h-4 text-gray-400 dark:text-zinc-500 mt-0.5" /><div><p className="text-xs text-gray-400 dark:text-zinc-500">Employee ID</p><p className="text-sm font-medium text-gray-900 dark:text-zinc-100">{user.employeeId}</p></div></div>
                )}
                {user.email && (
                  <div className="flex items-start gap-3"><Mail className="w-4 h-4 text-gray-400 dark:text-zinc-500 mt-0.5" /><div><p className="text-xs text-gray-400 dark:text-zinc-500">Email</p><p className="text-sm font-medium text-gray-900 dark:text-zinc-100 break-all">{user.email}</p></div></div>
                )}
                {user.phone && (
                  <div className="flex items-start gap-3"><Phone className="w-4 h-4 text-gray-400 dark:text-zinc-500 mt-0.5" /><div><p className="text-xs text-gray-400 dark:text-zinc-500">Phone</p><p className="text-sm font-medium text-gray-900 dark:text-zinc-100">{user.phone}</p></div></div>
                )}
                {user.department && (
                  <div className="flex items-start gap-3"><Building2 className="w-4 h-4 text-gray-400 dark:text-zinc-500 mt-0.5" /><div><p className="text-xs text-gray-400 dark:text-zinc-500">Department</p><p className="text-sm font-medium text-gray-900 dark:text-zinc-100">{user.department}</p></div></div>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-zinc-800 space-y-2">
              <button onClick={() => setTheme(isDarkTheme ? "light" : "dark")} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 rounded-xl transition">
                {isDarkTheme ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                Theme: {isDarkTheme ? "Dark" : "Light"}
              </button>
              <button onClick={() => router.push("/logout")} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition">
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}