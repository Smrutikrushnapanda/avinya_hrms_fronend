"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { getTodayLogs } from "@/app/api/api";

type AttendanceState = "loading" | "late" | "on-time" | "no-record";

interface AttendanceStatusProps {
  userId?: string;
  organizationId?: string;
}

const WORK_START_TIME = "09:00:00";

export default function AttendanceStatus({ userId, organizationId }: AttendanceStatusProps) {
  const [attendanceState, setAttendanceState] = useState<AttendanceState>("loading");
  const [loginTime, setLoginTime] = useState<string>("");
  const [showBlast, setShowBlast] = useState(false);

  useEffect(() => {
    const fetchAttendance = async () => {
      try {
        let currentUserId = userId;
        let orgId = organizationId;

        if (!currentUserId) {
          const userStr = localStorage.getItem("user");
          if (userStr) {
            const user = JSON.parse(userStr);
            currentUserId = user.id || user.userId;
            orgId = user.organizationId;
          }
        }

        if (!currentUserId) {
          setAttendanceState("no-record");
          return;
        }

        const response = await getTodayLogs({
          userId: currentUserId,
          organizationId: orgId,
        });

        // API returns { logs: [...], punchInTime: Date|null, lastPunch: Date|null }
        const punchInTime: string | null = response.data?.punchInTime ?? null;
        const logs: any[] = response.data?.logs || response.data?.data || response.data?.results || [];

        // Prefer punchInTime (may be timeslip-corrected); fall back to first check-in log
        let firstCheckIn: Date | null = null;
        if (punchInTime) {
          firstCheckIn = new Date(punchInTime);
        } else if (logs.length > 0) {
          const checkInLog = logs.find((log: any) => log.type === "check-in");
          if (checkInLog) firstCheckIn = new Date(checkInLog.timestamp);
        }

        if (firstCheckIn && !isNaN(firstCheckIn.getTime())) {
          const timeStr = firstCheckIn.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          });

          const [hours, minutes] = firstCheckIn.toTimeString().split(":").slice(0, 2);
          const [workHours, workMins] = WORK_START_TIME.split(":");
          const loginMins = parseInt(hours) * 60 + parseInt(minutes);
          const workMinsNum = parseInt(workHours) * 60 + parseInt(workMins);

          setLoginTime(timeStr);

          if (loginMins > workMinsNum) {
            setAttendanceState("late");
          } else {
            setAttendanceState("on-time");
            setTimeout(() => setShowBlast(true), 500);
          }
        } else {
          setAttendanceState("no-record");
        }
      } catch (error) {
        console.error("Error fetching attendance:", error);
        setAttendanceState("no-record");
      }
    };

    fetchAttendance();
  }, [userId, organizationId]);

  const blastVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: {
      scale: [0, 1.2, 0],
      opacity: [0, 1, 0],
      transition: {
        duration: 1.5,
        ease: "easeOut" as const,
      },
    },
  };

  const particleVariants = {
    hidden: { scale: 0, opacity: 0 },
    visible: (i: number) => ({
      scale: [0, 1, 0],
      opacity: [0, 1, 0],
      x: [0, Math.cos(i * 45) * 80],
      y: [0, Math.sin(i * 45) * 80],
      transition: {
        duration: 1.2,
        delay: i * 0.05,
        ease: "easeOut" as const,
      },
    }),
  };

  if (attendanceState === "loading") {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (attendanceState === "no-record") {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500 mb-2" />
        <p className="text-sm font-medium text-foreground">No Check-in Record</p>
        <p className="text-xs text-muted-foreground">You haven&apos;t logged in yet</p>
      </div>
    );
  }

  if (attendanceState === "late") {
    return (
      <div className="flex flex-col items-center">
        <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3">
          <img src="/late.jpg" alt="Late" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <div className="text-center">
              <p className="text-white text-xs font-medium uppercase tracking-wider">Arrived Late</p>
              <p className="text-white text-2xl font-extrabold">{loginTime}</p>
            </div>
          </div>
        </div>
        <div className="w-full bg-rose-50 dark:bg-rose-950/30 rounded-xl p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/50 flex items-center justify-center">
            <Clock className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Check-in Time</p>
            <p className="text-sm font-bold text-foreground">{loginTime}</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className="text-sm font-bold text-rose-500">Late Arrival</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-full h-36 rounded-xl overflow-hidden mb-3">
        <AnimatePresence>
          {showBlast && (
            <>
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={i}
                  custom={i}
                  variants={particleVariants}
                  initial="hidden"
                  animate="visible"
                  className="absolute top-1/2 left-1/2 w-3 h-3 rounded-full"
                  style={{ background: ["#5cc8a8", "#7c6cff", "#e8b86c", "#e87e8e"][i % 4] }}
                />
              ))}
              <motion.div
                variants={blastVariants}
                initial="hidden"
                animate="visible"
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              >
                <Sparkles className="w-16 h-16 text-amber-400" />
              </motion.div>
            </>
          )}
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-br from-teal-500/60 to-emerald-500/60 mix-blend-overlay" />
        <img src="/on_time.jpg" alt="On Time" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1 shadow-lg">
          <CheckCircle className="w-3 h-3" />
          ON TIME
        </div>
        <div className="absolute bottom-3 left-3 right-3 text-center">
          <p className="text-white text-xs font-medium uppercase tracking-wider">Great Job!</p>
          <p className="text-white text-2xl font-extrabold">{loginTime}</p>
        </div>
      </div>
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="w-full bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
          <CheckCircle className="w-5 h-5 text-emerald-500" />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Check-in Time</p>
          <p className="text-sm font-bold text-foreground">{loginTime}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-muted-foreground">Status</p>
          <p className="text-sm font-bold text-emerald-500">On Time! 🎉</p>
        </div>
      </motion.div>
    </div>
  );
}

