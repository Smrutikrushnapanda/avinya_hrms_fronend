"use client";

import {
  FileText,
  DollarSign,
  MessageSquare,
  BarChart2,
  Home,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { usePlanAccess } from "@/components/plan-access-provider";
import MobileTabHeader from "../components/MobileTabHeader";
import { MobileCard } from "../components/MobileCard";
import { StaggerReveal, StaggerItem } from "../components/animation-wrappers";

interface ServiceItem {
  name: string;
  icon: any;
  href: string;
  description: string;
}

const baseServices: ServiceItem[] = [
  { name: "Timesheet", icon: FileText, href: "/user/dashboard/mobile/timesheet", description: "View your timesheet" },
  { name: "Salary Slip", icon: DollarSign, href: "/user/dashboard/mobile/payroll", description: "View salary slips" },
  { name: "Messages", icon: MessageSquare, href: "/user/dashboard/mobile/messages", description: "Check your messages" },
  { name: "Polls", icon: BarChart2, href: "/user/dashboard/mobile/polls", description: "Active polls" },
];

export default function MobileServicesPage() {
  const router = useRouter();
  const { isBasicPlan } = usePlanAccess();
  const services: ServiceItem[] = isBasicPlan
    ? baseServices
    : [
        baseServices[0],
        { name: "WFH", icon: Home, href: "/user/dashboard/mobile/wfh", description: "Work from home requests" },
        ...baseServices.slice(1),
      ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileTabHeader title="Services" />

      <div className="px-4 -mt-6 z-10 pb-24">
        <StaggerReveal className="grid grid-cols-4 gap-3">
          {services.map((service, i) => {
            const isLarge = i === 0;
            const Icon = service.icon;
            return (
              <StaggerItem
                key={service.name}
                className={isLarge ? "col-span-4" : "col-span-2"}
              >
                <MobileCard
                  className={`cursor-pointer border-primary/5 hover:border-primary/20 transition-colors ${
                    isLarge ? "" : ""
                  }`}
                  onClick={() => router.push(service.href)}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`rounded-full flex items-center justify-center flex-shrink-0 ${
                        isLarge ? "w-14 h-14" : "w-12 h-12"
                      }`}
                      style={{ backgroundColor: "var(--primary-15, rgba(29,78,211,0.08))" }}
                    >
                      <Icon
                        className="text-[var(--primary)]"
                        size={isLarge ? 28 : 24}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm text-foreground">
                        {service.name}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {service.description}
                      </p>
                    </div>
                  </div>
                </MobileCard>
              </StaggerItem>
            );
          })}
        </StaggerReveal>
      </div>
    </div>
  );
}
