"use client";

import { useEffect, useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell,
  CalendarDays,
  Camera,
  Clock,
  FileText,
  Home,
  LogIn,
  LogOut,
  Timer,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getProfile } from "@/app/api/api";
import { usePathname, useRouter } from "next/navigation";
import AttendanceCalendar from "@/components/AttendanceCalendar"; // ✅ imported
import { startOfMonth } from "date-fns";

interface AttendanceStatus {
  status:
    | "present"
    | "absent"
    | "half-day"
    | "holiday"
    | "pending"
    | "leave"
    | "half-leave";
  holidayName?: string;
  inTime?: string;
  outTime?: string;
  isOptional?: boolean;
}

export default function AttendancePage() {
  const [user, setUser] = useState({ name: "", role: "", avatar: "" });
  const [open, setOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ✅ calendar state
  const [statusByDate, setStatusByDate] = useState<Record<string, AttendanceStatus>>({});
  const [currentMonth, setCurrentMonth] = useState<Date>(startOfMonth(new Date()));

  const pathname = usePathname();
  const router = useRouter();

  const tabs = [
    { name: "Home", href: "/user/dashboard/mobile", icon: Home },
    { name: "Attendance", href: "/user/dashboard/mobile/attendance", icon: CalendarDays },
    { name: "Leave", href: "/user/dashboard/mobile/leave", icon: FileText },
    { name: "Time Slip", href: "/user/dashboard/mobile/timeslip", icon: Clock },
  ];

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await getProfile();
        const data = response.data;

        setUser({
          name:
            [data?.firstName, data?.middleName, data?.lastName]
              .filter(Boolean)
              .join(" ") || "User",
          role: data?.roles?.[0]?.roleName || "Role",
          avatar: data?.avatar || "/avatar.jpg",
        });
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };

    fetchUser();

    // ✅ mock attendance data
    setStatusByDate({
      "2025-09-01": { status: "present", inTime: "09:00", outTime: "18:00" },
      "2025-09-02": { status: "absent" },
      "2025-09-03": { status: "holiday", holidayName: "Ganesh Chaturthi" },
    });
  }, []);

  // Camera logic
  useEffect(() => {
    if (open && !capturedImage) {
      navigator.mediaDevices
        .getUserMedia({ video: { aspectRatio: 3 / 4 } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.error("Camera error:", err));
    } else {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((track) => track.stop());
      }
    }
  }, [open, capturedImage]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext("2d");
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const dataUrl = canvasRef.current.toDataURL("image/png");
        setCapturedImage(dataUrl);
      }
    }
  };

  const submitPhoto = () => {
    console.log("Submitting photo:", capturedImage);
    setOpen(false);
    setCapturedImage(null);
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#0077b6] text-white px-4 pt-5 pb-15 flex items-center justify-between ">
        <div className="flex items-center space-x-2 ">
          <Avatar className="w-12 h-12 border-2 border-white">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback>{user.name?.[0] || "U"}</AvatarFallback>
          </Avatar>
          <div>
            <h2 className="text-l font-semibold">{user.name}</h2>
            <p className="text-sm opacity-90">{user.role}</p>
          </div>
        </div>
        <Bell className="w-6 h-6" />
      </div>

      {/* Date + Greeting */}
      <Card className="mx-4 -mt-10 h-38 shadow-lg">
        <CardContent className="p-4 -mt-7">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-medium">Monday, September 15, 2025</p>
              <p className="text-xs text-gray-500">
                Good Morning {user.name.split(" ")[0]}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">11:04:55 AM</p>
              <p className="text-xs text-gray-500">Morning</p>
            </div>
          </div>

          <div className="flex justify-between items-center mt-3 text-xs">
            <p className="text-green-600">✅ WiFi: Connected</p>
            <p className="text-green-600">📍 Location: Available</p>
          </div>

          <Button
            onClick={() => setOpen(true)}
            className="w-full mt-4 bg-green-500 hover:bg-green-600 text-white flex items-center justify-center gap-2"
          >
            <Camera className="w-4 h-4" /> Punch In
          </Button>
        </CardContent>
      </Card>

      {/* Punch In Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Punch In</DialogTitle>
          </DialogHeader>

          {!capturedImage ? (
            <div className="flex flex-col items-center gap-4">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full aspect-[3/4] rounded-lg"
              />
              <Button onClick={capturePhoto} className="w-full bg-blue-600 text-white">
                Capture
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <img
                src={capturedImage}
                alt="Captured"
                className="w-full aspect-[3/4] rounded-lg border object-cover"
              />
              <div className="flex gap-2 w-full">
                <Button
                  onClick={submitPhoto}
                  className="flex-1 bg-green-600 text-white"
                >
                  Submit
                </Button>
                <Button
                  onClick={() => setCapturedImage(null)}
                  variant="outline"
                  className="flex-1"
                >
                  Recapture
                </Button>
              </div>
            </div>
          )}

          <canvas ref={canvasRef} className="hidden" />
        </DialogContent>
      </Dialog>

      {/* Today Attendance */}
      <div className="px-4 mt-4">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-semibold text-base">Today Attendance</h3>
          <p className="text-sm text-blue-500 cursor-pointer">View all</p>
        </div>

        <div className="space-y-2">
          <Card>
            <CardContent className="flex justify-between items-center px-3">
              <div className="flex items-center gap-2">
                <div className="bg-blue-100 rounded-full p-1">
                  <LogIn className="w-5 h-5 text-blue-600" />
                </div>
                <p className="text-sm">Punch In</p>
              </div>
              <p className="text-sm text-gray-500">00:00 AM</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex justify-between items-center px-3">
              <div className="flex items-center gap-2">
                <div className="bg-red-100 rounded-full p-1">
                  <LogOut className="w-5 h-5 text-red-600" />
                </div>
                <p className="text-sm">Punch Out</p>
              </div>
              <p className="text-sm text-gray-500">00:00 AM</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex justify-between items-center px-3">
              <div className="flex items-center gap-2">
                <div className="bg-green-100 rounded-full p-1">
                  <Timer className="w-5 h-5 text-green-600" />
                </div>
                <p className="text-sm">Working Hours</p>
              </div>
              <p className="text-sm text-gray-500">0:00:00 hrs</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ✅ Calendar replaced with AttendanceCalendar */}
      <div className="px-4 mt-4 mb-20">
        <h3 className="font-semibold text-base mb-2">Calendar</h3>
        <Card>
          <CardContent>
            <AttendanceCalendar
              currentMonth={currentMonth}
              setCurrentMonth={setCurrentMonth}
              statusByDate={statusByDate}
            />
          </CardContent>
        </Card>
      </div>

      {/* Bottom Navbar */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t shadow-lg z-50">
        <div className="flex justify-around items-center py-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;

            return (
              <Button
                key={tab.name}
                variant="ghost"
                onClick={() => router.push(tab.href)}
                className={`flex flex-col items-center justify-center flex-1 py-2 ${
                  isActive ? "text-blue-600" : "text-gray-500"
                }`}
              >
                <Icon
                  className={`w-6 h-6 ${
                    isActive ? "stroke-blue-600" : "stroke-gray-500"
                  }`}
                />
                <span className="text-xs">{tab.name}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
