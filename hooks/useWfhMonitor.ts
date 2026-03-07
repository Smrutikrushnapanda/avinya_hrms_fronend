"use client";

import { useEffect, useRef, useCallback } from "react";
import { wfhHeartbeat } from "@/app/api/api";

const HEARTBEAT_INTERVAL_MS = 30_000; // send every 30s
const INACTIVITY_THRESHOLD_MS = 5 * 60_000; // alert after 5 min of no activity

interface UseWfhMonitorOptions {
  enabled: boolean;
  onInactive?: () => void; // called when inactivity detected
}

export function useWfhMonitor({ enabled, onInactive }: UseWfhMonitorOptions) {
  const mouseRef = useRef(0);
  const keyRef = useRef(0);
  const tabRef = useRef(0);
  const lastActivityRef = useRef(Date.now());
  const inactivityFiredRef = useRef(false);

  const resetCounters = useCallback(() => {
    mouseRef.current = 0;
    keyRef.current = 0;
    tabRef.current = 0;
  }, []);

  const markActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    inactivityFiredRef.current = false;
  }, []);

  useEffect(() => {
    if (!enabled) return;

    // Request push notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const onMouseMove = () => {
      mouseRef.current += 1;
      markActivity();
    };
    const onKeyDown = () => {
      keyRef.current += 1;
      markActivity();
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        tabRef.current += 1;
      }
      markActivity();
    };

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mousedown", onMouseMove);
    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Heartbeat: send accumulated counts every 30s
    const heartbeatTimer = setInterval(async () => {
      const counts = {
        mouseEvents: mouseRef.current,
        keyboardEvents: keyRef.current,
        tabSwitches: tabRef.current,
      };
      resetCounters();

      // Check inactivity
      const idleMs = Date.now() - lastActivityRef.current;
      if (idleMs >= INACTIVITY_THRESHOLD_MS && !inactivityFiredRef.current) {
        inactivityFiredRef.current = true;
        onInactive?.();

        // Browser push notification
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification("Are you still there?", {
            body: "No activity detected for 5 minutes. Please interact to confirm you're working.",
            icon: "/favicon.ico",
          });
        }
      }

      // Only send if there was any activity today
      if (counts.mouseEvents > 0 || counts.keyboardEvents > 0 || counts.tabSwitches > 0) {
        try {
          await wfhHeartbeat(counts);
        } catch {
          // silent — don't interrupt the employee
        }
      }
    }, HEARTBEAT_INTERVAL_MS);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mousedown", onMouseMove);
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      clearInterval(heartbeatTimer);
    };
  }, [enabled, markActivity, onInactive, resetCounters]);
}
