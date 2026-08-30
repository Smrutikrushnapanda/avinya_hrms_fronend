import { TZDate } from "@date-fns/tz";
import { format as dfFormat } from "date-fns";

/**
 * Default business timezone for backward compatibility / loading state ONLY.
 * The real business timezone is the authenticated organization's configured
 * IANA timezone (organization_settings.timezone), resolved server-side and
 * exposed via useOrganizationTimezone(). This constant must NOT be used as a
 * global runtime assumption in business logic.
 */
export const DEFAULT_BUSINESS_TIMEZONE = "Asia/Kolkata";

export type IanaTimezone = string;

/** Validate an IANA timezone identifier. */
export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Convert a date + time entered in the given business timezone to a UTC ISO string.
 *
 * Input:  date = "2026-08-28", time = "22:00", tz = "Asia/Kolkata"
 * Output: "2026-08-28T16:30:00.000Z"
 *
 * For "America/New_York" the same input yields a different UTC instant (DST-aware).
 */
export function toUtcISO(date: string, time: string, timezone: IanaTimezone = DEFAULT_BUSINESS_TIMEZONE): string {
  if (!date || typeof date !== "string") {
    throw new Error("toUtcISO: date is required and must be a string");
  }
  if (!time || typeof time !== "string") {
    throw new Error("toUtcISO: time is required and must be a string");
  }

  const dateMatch = date.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!dateMatch) {
    throw new Error(`toUtcISO: invalid date format "${date}", expected YYYY-MM-DD`);
  }

  const timeMatch = time.match(/^(\d{2}):(\d{2})$/);
  if (!timeMatch) {
    throw new Error(`toUtcISO: invalid time format "${time}", expected HH:mm`);
  }

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]) - 1; // JS months are 0-indexed
  const day = Number(dateMatch[3]);
  const hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2]);

  if (month < 0 || month > 11) {
    throw new Error(`toUtcISO: invalid month "${dateMatch[2]}"`);
  }
  if (day < 1 || day > 31) {
    throw new Error(`toUtcISO: invalid day "${dateMatch[3]}"`);
  }
  if (hours < 0 || hours > 23) {
    throw new Error(`toUtcISO: invalid hours "${timeMatch[1]}"`);
  }
  if (minutes < 0 || minutes > 59) {
    throw new Error(`toUtcISO: invalid minutes "${timeMatch[2]}"`);
  }

  const tz = isValidTimezone(timezone) ? timezone : DEFAULT_BUSINESS_TIMEZONE;
  const localDate = new TZDate(year, month, day, hours, minutes, 0, tz);
  return new Date(localDate.getTime()).toISOString();
}

/**
 * DEPRECATED — legacy IST-only helper kept for backward compatibility.
 * Use toUtcISO(date, time, organizationTimezone) instead.
 */
export function istToUtcISO(date: string, time: string): string {
  return toUtcISO(date, time, DEFAULT_BUSINESS_TIMEZONE);
}

/** Business "today" (YYYY-MM-DD) in the given timezone — never browser time. */
export function orgToday(timezone: IanaTimezone = DEFAULT_BUSINESS_TIMEZONE): string {
  const tz = isValidTimezone(timezone) ? timezone : DEFAULT_BUSINESS_TIMEZONE;
  const now = new Date();
  return new TZDate(now.getTime(), tz).toISOString().split("T")[0];
}

/** Minutes-of-day (wall clock 0–1439) of a UTC instant, in the given timezone. */
export function getMinutesOfDayInZone(value: Date | string, timezone: IanaTimezone): number {
  const tz = isValidTimezone(timezone) ? timezone : DEFAULT_BUSINESS_TIMEZONE;
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return 0;
  const shifted = new TZDate(date.getTime(), tz);
  return shifted.getHours() * 60 + shifted.getMinutes();
}

/**
 * Format a UTC instant (Date or ISO string) in the organization timezone.
 * Uses date-fns tokens, e.g. "MMM d, yyyy", "hh:mm a".
 */
export function formatInTimezone(
  value: Date | string,
  timezone: IanaTimezone,
  fmt: string = "MMM d, yyyy",
): string {
  const tz = isValidTimezone(timezone) ? timezone : DEFAULT_BUSINESS_TIMEZONE;
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return "";
  return formatTZ(date, tz, fmt);
}

// Format using date-fns on a TZDate shifted into the target zone's wall-clock.
function formatTZ(date: Date, tz: string, fmt: string): string {
  const shifted = new TZDate(date.getTime(), tz);
  return dfFormat(shifted, fmt);
}

export { formatTZ };

export { DEFAULT_BUSINESS_TIMEZONE as BUSINESS_TIMEZONE };
