import { create } from "zustand";
import { DEFAULT_BUSINESS_TIMEZONE } from "@/utils/timezone";

/**
 * Central store for the authenticated organization's business timezone.
 *
 * Source of truth: the backend (organization_settings.timezone), delivered via
 * the authenticated user's profile response (`/auth/profile` →
 * `organizationTimezone`). The frontend NEVER supplies an organizationId for
 * timezone resolution — the backend derives the org from the JWT.
 *
 * DEFAULT_BUSINESS_TIMEZONE is used ONLY while loading / for backward
 * compatibility. It is not a browser or server timezone assumption.
 */
interface OrganizationTimezoneState {
  timezone: string;
  loaded: boolean;
  setTimezone: (tz: string) => void;
  setLoaded: (loaded: boolean) => void;
  reset: () => void;
}

export const useOrganizationTimezoneStore = create<OrganizationTimezoneState>(
  (set) => ({
    timezone: DEFAULT_BUSINESS_TIMEZONE,
    loaded: false,
    setTimezone: (timezone) => set({ timezone, loaded: true }),
    setLoaded: (loaded) => set({ loaded }),
    reset: () =>
      set({ timezone: DEFAULT_BUSINESS_TIMEZONE, loaded: false }),
  }),
);
