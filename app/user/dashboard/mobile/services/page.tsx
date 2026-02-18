"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Bell, BadgeDollarSign, MessageSquare, Vote, FileText } from "lucide-react";
import { useRouter } from "next/navigation";

interface ServiceItem {
  name: string;
  icon: any;
  href: string;
  description: string;
}

const services: ServiceItem[] = [
  { name: "Timesheet", icon: FileText, href: "/user/dashboard/mobile/timesheet", description: "View your timesheet" },
  { name: "Salary Slip", icon: BadgeDollarSign, href: "/user/dashboard/mobile/payroll", description: "View salary slips" },
  { name: "Messages", icon: MessageSquare, href: "/user/dashboard/mobile/messages", description: "Check your messages" },
  { name: "Polls", icon: Vote, href: "/user/dashboard/mobile/polls", description: "Active polls" },
];

export default function MobileServicesPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#005F90] text-white px-4 pt-5 pb-16 flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-white/20 rounded-full px-4 py-2">
            <h2 className="text-xl font-bold">Services</h2>
          </div>
        </div>
        <Bell className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="px-5 -mt-12 z-10 pb-24">
        <div className="grid grid-cols-2 gap-4">
          {services.map((service) => (
            <Card 
              key={service.name}
              className="cursor-pointer hover:shadow-md transition-shadow border-none shadow-sm"
              onClick={() => router.push(service.href)}
            >
              <CardContent className="p-5 flex flex-col items-center text-center">
                <div className="w-14 h-14 bg-[#E1F4FF] rounded-full flex items-center justify-center mb-3">
                  <service.icon className="w-7 h-7 text-[#005F90]" />
                </div>
                <h3 className="font-semibold text-sm text-gray-800">{service.name}</h3>
                <p className="text-xs text-gray-500 mt-1">{service.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
