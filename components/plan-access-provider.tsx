"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getOrganizationPlan, getProfile } from "@/app/api/api";
import {
  getRestrictedRouteFallback,
  isBasicPlanType,
  isPathAllowedForPlan,
  normalizeOrganizationPlanType,
  type OrganizationPlanType,
} from "@/lib/plan-access";

type PlanAccessContextValue = {
  loading: boolean;
  organizationId: string | null;
  planType: OrganizationPlanType;
  planName: string | null;
  isBasicPlan: boolean;
  isPathAllowed: (pathname: string | null | undefined) => boolean;
  getFallbackPath: (pathname: string | null | undefined) => string;
};

const PlanAccessContext = createContext<PlanAccessContextValue | null>(null);

function getStoredOrganizationId(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) {
      return null;
    }

    const parsedUser = JSON.parse(rawUser);
    return (
      parsedUser?.organizationId ??
      parsedUser?.organization?.id ??
      parsedUser?.employee?.organizationId ??
      null
    );
  } catch {
    return null;
  }
}

export function PlanAccessProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [planType, setPlanType] = useState<OrganizationPlanType>(null);
  const [planName, setPlanName] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadPlanAccess = async () => {
      try {
        let resolvedOrgId = getStoredOrganizationId();

        if (!resolvedOrgId) {
          try {
            const profileRes = await getProfile();
            resolvedOrgId =
              profileRes.data?.organizationId ??
              profileRes.data?.organization?.id ??
              profileRes.data?.employee?.organizationId ??
              null;
          } catch {
            resolvedOrgId = null;
          }
        }

        if (cancelled) {
          return;
        }

        setOrganizationId(resolvedOrgId);

        if (!resolvedOrgId) {
          setPlanType(null);
          setPlanName(null);
          return;
        }

        try {
          const planRes = await getOrganizationPlan(resolvedOrgId);
          const plan = planRes.data;

          if (cancelled) {
            return;
          }

          setPlanType(normalizeOrganizationPlanType(plan?.planType));
          setPlanName(typeof plan?.name === "string" ? plan.name : null);
        } catch {
          if (!cancelled) {
            setPlanType(null);
            setPlanName(null);
          }
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadPlanAccess();

    return () => {
      cancelled = true;
    };
  }, []);

  const isPathAllowed = useCallback(
    (pathname: string | null | undefined) =>
      isPathAllowedForPlan(pathname, planType),
    [planType]
  );

  const getFallbackPath = useCallback(
    (pathname: string | null | undefined) =>
      getRestrictedRouteFallback(pathname),
    []
  );

  const value = useMemo<PlanAccessContextValue>(
    () => ({
      loading,
      organizationId,
      planType,
      planName,
      isBasicPlan: isBasicPlanType(planType),
      isPathAllowed,
      getFallbackPath,
    }),
    [getFallbackPath, isPathAllowed, loading, organizationId, planName, planType]
  );

  return (
    <PlanAccessContext.Provider value={value}>
      {children}
    </PlanAccessContext.Provider>
  );
}

export function usePlanAccess() {
  const context = useContext(PlanAccessContext);

  if (!context) {
    throw new Error("usePlanAccess must be used within a PlanAccessProvider");
  }

  return context;
}
