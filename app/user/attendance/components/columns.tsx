"use client";

import { ColumnDef } from "@tanstack/react-table";
import {
  MapPin,
  Camera,
  Clock4,
  Laptop,
  User,
  BadgeCheck,
  ArrowRight,
} from "lucide-react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge"; // Ensure this path is correct
import { isBefore, parse } from "date-fns";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";

export type Attendance = {
  userId: string;
  userName: string;
  email?: string;
  profileImage: string;
  employeeCode: string;
  status: string;
  workingMinutes?: number;
  inTime?: string;
  inPhotoUrl?: string;
  outTime?: string;
  outPhotoUrl?: string;
  inLocationAddress?: string;
  outLocationAddress?: string;
  inDeviceInfo?: string;
  outDeviceInfo?: string;
  inWifiSsid?: string;
  outWifiSsid?: string;
  anomalyFlag?: boolean;
  anomalyReason?: string;
};

export const columns: ColumnDef<Attendance>[] = [
  {
    accessorKey: "userName",
    header: () => (
      <div className="flex items-center gap-1">
        <User className="w-4 h-4" />
        <span>Employee Name</span>
      </div>
    ),
    cell: ({ row }) => {
      const { userName, employeeCode, profileImage } = row.original;
      return (
        <div className="flex items-center gap-3">
          <img
            src={profileImage || "/default-avatar.png"}
            alt={userName}
            className="w-10 h-10 rounded-full object-cover ring-1 ring-muted-foreground/20"
          />
          <div className="flex flex-col">
            <span className="font-semibold">{userName}</span>
            <div className="w-full border-b my-0.5" />
            <span className="text-xs text-muted-foreground font-semibold">
              {employeeCode}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    id: "clockInOut",
    header: () => (
      <div className="flex items-center gap-1">
        <Clock4 className="w-4 h-4" />
        <span>Clock-In & Out</span>
      </div>
    ),
    cell: ({ row }) => {
      const { inTime, outTime, workingMinutes } = row.original;

      const parseTime = (timeStr: string) =>
        parse(timeStr, "hh:mm a", new Date());

      const inDate = parseTime(inTime ?? "00:00");
      const outDate = parseTime(outTime ?? "00:00");

      const getInTimeColor = () => {
        if (isBefore(inDate, parse("10:00 AM", "hh:mm a", new Date())))
          return "text-green-600";
        if (isBefore(inDate, parse("11:00 AM", "hh:mm a", new Date())))
          return "text-orange-600";
        return "text-red-600";
      };

      const getOutTimeColor = () => {
        if (isBefore(outDate, parse("06:30 PM", "hh:mm a", new Date())))
          return "text-orange-600";
        return "text-green-600";
      };

      const getDurationColor = () => {
        if (typeof workingMinutes !== "number") return "text-gray-400";

        if (workingMinutes < 240) return "text-red-500";
        if (workingMinutes < 360) return "text-orange-500";
        if (workingMinutes < 480) return "text-yellow-500";
        if (workingMinutes < 600) return "text-lime-500";
        if (workingMinutes < 720) return "text-green-500";

        return "text-emerald-600";
      };

      const duration =
        workingMinutes !== undefined
          ? `${Math.floor(workingMinutes / 60)}h ${workingMinutes % 60}m`
          : "-";

      return (
        <div className="flex flex-col items-center text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <span className={`${getInTimeColor()} font-bold`}>
              {inTime}
            </span>
            <div className="font-semibold">----<span className={`font-semibold ${getDurationColor()}`}> {duration} </span>----</div>
            <span className={`${getOutTimeColor()} font-bold`}>
              {outTime}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    id: "inPhoto",
    header: () => (
      <div className="flex items-center gap-1">
        <Camera className="w-4 h-4" />
        <span>In Photo</span>
      </div>
    ),
    cell: ({ row }) => {
      const imageUrl = row.original.inPhotoUrl;
  
      if (!imageUrl) return "-";
  
      return (
        <Dialog>
          <DialogTrigger asChild>
            <div className="w-[48px] h-[64px] overflow-hidden rounded-md ring-1 ring-muted cursor-pointer hover:scale-105 transition">
              <Image
                src={imageUrl}
                alt="In Photo"
                width={48}
                height={64}
                className="object-cover w-full h-full"
              />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-2xl p-10">
            <Image
              src={imageUrl}
              alt="Full In Photo"
              width={500}
              height={700}
              className="w-full h-auto object-contain rounded"
            />
          </DialogContent>
        </Dialog>
      );
    },
  },
  {
    id: "outPhoto",
    header: () => (
      <div className="flex items-center gap-1">
        <Camera className="w-4 h-4" />
        <span>Out Photo</span>
      </div>
    ),
    cell: ({ row }) => {
      const url = row.original.outPhotoUrl;
  
      if (!url) return "-";
  
      return (
        <Dialog>
          <DialogTrigger asChild>
            <div className="w-[48px] h-[64px] overflow-hidden rounded-md ring-1 ring-muted cursor-pointer hover:scale-105 transition">
              <Image
                src={url}
                alt="In Photo"
                width={48}
                height={64}
                className="object-cover w-full h-full"
              />
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-2xl p-10">
            <Image
              src={url}
              alt="Full In Photo"
              width={500}
              height={700}
              className="w-full h-auto object-contain rounded"
            />
          </DialogContent>
        </Dialog>
      );
    },
  },  
  {
    id: "location",
    header: () => (
      <div className="flex items-center gap-1 w-[200px]">
        <MapPin className="w-4 h-4" />
        <span>Location</span>
      </div>
    ),
    cell: ({ row }) => (
      <div className="flex flex-col text-blue-600 text-sm">
        {row.original.inLocationAddress && (
          <div className="flex items-center">
            <span className="whitespace-normal break-words">{row.original.inLocationAddress}</span>
          </div>
        )}
      </div>
    ),
  },
  {
    accessorKey: "inDeviceInfo",
    header: () => (
      <div className="flex items-center gap-1">
        <Laptop className="w-4 h-4" />
        <span>Device</span>
      </div>
    ),
    cell: ({ getValue }) => {
      const device = getValue<string>();
      return <div className="text-sm">{device || "-"}</div>;
    },
  },
  {
    accessorKey: "status",
    header: () => (
      <div className="flex items-center gap-1">
        <BadgeCheck className="w-4 h-4" />
        <span>Status</span>
      </div>
    ),
    cell: ({ row }) => {
      const statusGradientMap: Record<string, string> = {
        present: "bg-gradient-to-r from-green-200 to-green-100 text-green-800",
        absent: "bg-gradient-to-r from-red-200 to-red-100 text-red-800",
        "half-day":
          "bg-gradient-to-r from-yellow-200 to-yellow-100 text-yellow-800",
        late: "bg-gradient-to-r from-orange-200 to-orange-100 text-orange-800",
        "on-leave": "bg-gradient-to-r from-blue-200 to-blue-100 text-blue-800",
        holiday:
          "bg-gradient-to-r from-purple-200 to-purple-100 text-purple-800",
        weekend: "bg-gradient-to-r from-gray-200 to-gray-100 text-gray-800",
        "work-from-home":
          "bg-gradient-to-r from-cyan-200 to-cyan-100 text-cyan-800",
      };

      const statusLabelMap: Record<string, string> = {
        present: "Present",
        absent: "Absent",
        "half-day": "Half Day",
        late: "Late",
        "on-leave": "On Leave",
        holiday: "Holiday",
        weekend: "Weekend",
        "work-from-home": "Work From Home",
      };

      const status = row.original.status;
      const label = statusLabelMap[status] || status;
      const gradientClass =
        statusGradientMap[status] ||
        "bg-gradient-to-r from-gray-200 to-gray-100 text-gray-800";

      return (
        <span
          className={`text-xs px-3 py-1 rounded-full font-semibold shadow-sm ${gradientClass}`}
        >
          {label}
        </span>
      );
    },
  },
];
