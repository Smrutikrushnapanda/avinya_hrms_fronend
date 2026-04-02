"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getOrganization, getOrganizationPlan, getProfile } from "@/app/api/api";
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

type PlanSource = {
  organizationId?: string | null;
  employee?: { organizationId?: string | null };
  organization?: {
    id?: string | null;
    planType?: string | null;
    pricingTypeId?: string | number | null;
    planName?: string | null;
    pricingTypeName?: string | null;
    pricingType?: {
      typeId?: string | number | null;
      typeName?: string | null;
    };
  };
  planType?: string | null;
  pricingTypeId?: string | number | null;
  planName?: string | null;
  pricingTypeName?: string | null;
  pricingType?: {
    typeId?: string | number | null;
    typeName?: string | null;
  };
};

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

function getStoredPlanHint(): {
  planTypeHint: string | null;
} {
  if (typeof window === "undefined") {
    return { planTypeHint: null };
  }

  try {
    const rawUser = localStorage.getItem("user");
    if (!rawUser) {
      return { planTypeHint: null };
    }

    const parsedUser = JSON.parse(rawUser);
    const planTypeHintRaw =
      parsedUser?.planType ??
      parsedUser?.pricingTypeId ??
      parsedUser?.pricingType?.typeId ??
      parsedUser?.organization?.planType ??
      parsedUser?.organization?.pricingTypeId ??
      parsedUser?.organization?.pricingType?.typeId ??
      null;
    const planTypeHint =
      planTypeHintRaw == null ? null : String(planTypeHintRaw);

    return { planTypeHint };
  } catch {
    return { planTypeHint: null };
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
        let profileData: PlanSource | null = null;
        let resolvedOrgId = getStoredOrganizationId();
        const storedPlanHint = getStoredPlanHint();
        let resolvedPlanType = normalizeOrganizationPlanType(
          storedPlanHint.planTypeHint
        );
        let resolvedPlanName: string | null = null;

        try {
          const profileRes = await getProfile();
          profileData = (profileRes.data || null) as PlanSource | null;
          resolvedOrgId =
            profileData?.organizationId ??
            profileData?.organization?.id ??
            profileData?.employee?.organizationId ??
            resolvedOrgId;

          const profilePlanTypeRaw =
            profileData?.planType ??
            profileData?.pricingTypeId ??
            profileData?.pricingType?.typeId ??
            profileData?.organization?.planType ??
            profileData?.organization?.pricingTypeId ??
            profileData?.organization?.pricingType?.typeId ??
            null;
          const profilePlanType = normalizeOrganizationPlanType(
            profilePlanTypeRaw == null ? null : String(profilePlanTypeRaw)
          );
          if (profilePlanType) {
            resolvedPlanType = profilePlanType;
          }
          resolvedPlanName =
            profileData?.planName ??
            profileData?.organization?.planName ??
            resolvedPlanName;
        } catch {
          // Fall back to local storage hints.
        }

        if (cancelled) {
          return;
        }

        setOrganizationId(resolvedOrgId);

        if (!resolvedOrgId) {
          setPlanType(resolvedPlanType);
          setPlanName(resolvedPlanName);
          return;
        }

        try {
          const planRes = await getOrganizationPlan(resolvedOrgId);
          const plan = planRes.data;

          if (cancelled) {
            return;
          }

          const apiPlanName =
            typeof plan?.name === "string"
              ? plan.name
              : typeof plan?.planName === "string"
                ? plan.planName
                : null;

          const apiPlanType = normalizeOrganizationPlanType(
            plan?.planType ?? plan?.pricingTypeId ?? null
          );

          if (apiPlanType) {
            setPlanType(apiPlanType);
            setPlanName(apiPlanName);
            return;
          }
        } catch {
          // Continue with fallbacks below.
        }

        try {
          const orgRes = await getOrganization(resolvedOrgId);
          const org = orgRes.data;
          const orgPlanName =
            org?.planName ?? resolvedPlanName;
          const orgPlanType = normalizeOrganizationPlanType(
            org?.planType ??
              org?.pricingTypeId ??
              org?.pricingType?.typeId ??
              resolvedPlanType
          );
          if (!cancelled) {
            setPlanType(orgPlanType);
            setPlanName(orgPlanName ?? null);
          }
        } catch {
          if (!cancelled) {
            setPlanType(resolvedPlanType);
            setPlanName(resolvedPlanName);
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
