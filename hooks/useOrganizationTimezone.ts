"use client";

import { useEffect } from "react";
import { getProfile } from "@/app/api/api";
import { useOrganizationTimezoneStore } from "@/stores/organizationTimezoneStore";
import {
  DEFAULT_BUSINESS_TIMEZONE,
  formatInTimezone,
  isValidTimezone,
  orgToday,
  toUtcISO,
} from "@/utils/timezone";

/**
 * Central hook for the authenticated organization's business timezone.
 *
 * - Fetches the timezone once (from the authenticated profile endpoint) and
 *   caches it in a Zustand store; every consumer shares the same value.
 * - NEVER accepts an organizationId from the client for business-timezone
 *   resolution — the backend resolves the org from the JWT.
 * - Falls back to DEFAULT_BUSINESS_TIMEZONE only while loading.
 */
export function useOrganizationTimezone() {
  const timezone = useOrganizationTimezoneStore((s) => s.timezone);
  const loaded = useOrganizationTimezoneStore((s) => s.loaded);
  const setTimezone = useOrganizationTimezoneStore((s) => s.setTimezone);

  useEffect(() => {
    if (loaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await getProfile();
        const tz: string = res?.data?.organizationTimezone;
        if (!cancelled && tz && isValidTimezone(tz)) {
          setTimezone(tz);
        } else if (!cancelled) {
          setTimezone(DEFAULT_BUSINESS_TIMEZONE);
        }
      } catch {
        // Keep the default while unauthenticated or on failure — never use the
        // browser timezone as the business timezone.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loaded, setTimezone]);

  return {
    /** IANA timezone of the authenticated organization. */
    timezone,
    loaded,
    /** Business "today" (YYYY-MM-DD) in the organization timezone. */
    today: () => orgToday(timezone),
    /** Convert org-local date + time to UTC ISO (API transport format). */
    toUtcISO: (date: string, time: string) => toUtcISO(date, time, timezone),
    /** Format a UTC instant in the organization timezone. */
    formatOrgDate: (v: Date | string, fmt = "MMM d, yyyy") =>
      formatInTimezone(v, timezone, fmt),
    formatOrgTime: (v: Date | string, fmt = "hh:mm a") =>
      formatInTimezone(v, timezone, fmt),
    formatOrgDateTime: (v: Date | string, fmt = "MMM d, yyyy hh:mm a") =>
      formatInTimezone(v, timezone, fmt),
  };
}
