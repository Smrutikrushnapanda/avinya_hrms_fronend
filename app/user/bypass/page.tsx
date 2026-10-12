"use client";

import { useEffect, useState, useMemo } from "react";
import { format, addDays, subDays, startOfDay, endOfDay, parseISO } from "date-fns";
import { ColumnDef, SortingState } from "@tanstack/react-table";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SelectTrigger, SelectContent, SelectItem, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import api, { getProfile, getAttendanceSettings, logAttendanceBypass } from "@/app/api/api";
import { usePlanAccess } from "@/components/plan-access-provider";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, Clock } from "lucide-react";

type FormValues = {
  userId: string;
  organizationId: string;
  date: Date;
  time: string;
  type: "check-in" | "check-out";
  latitude: number;
  longitude: number;
  locationAddress: string;
  photo: File | null;
  reason?: string;
};

const validateCoordinate = (value: number): boolean => {
  return Number.isFinite(value) && Math.abs(value) <= 90;
};

export default function EmployeeBypassPage() {
  const { isPathAllowed } = usePlanAccess();
  const [profile, setProfile] = useState<any>(null);
  const [form, setForm] = useState<FormValues>({
    userId: "",
    organizationId: "",
    date: new Date(),
    time: "",
    type: "check-in",
    latitude: 0,
    longitude: 0,
    locationAddress: "",
    photo: null,
    reason: "",
  });
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const profileRes = await getProfile();
        setProfile(profileRes.data);
        if (profileRes.data) {
          setForm({
            userId: profileRes.data.userId || "",
            organizationId: profileRes.data.organizationId || "",
            date: new Date(),
            time: "",
            type: "check-in",
            latitude: 0,
            longitude: 0,
            locationAddress: "",
            photo: null,
            reason: "",
          });
        }
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    };

    loadData();
  }, []);

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, time: e.target.value }));
  };

  const handleLatitudeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && Math.abs(val) <= 90) {
      setForm((prev) => ({ ...prev, latitude: val }));
    }
  };

  const handleLongitudeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val) && Math.abs(val) <= 180) {
      setForm((prev) => ({ ...prev, longitude: val }));
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setForm((prev) => ({ ...prev, photo: file }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      if (!form.time) {
        throw new Error("Please select a time");
      }
      if (!form.latitude || !validateCoordinate(form.latitude)) {
        throw new Error("Please enter a valid latitude (-90 to 90)");
      }
      if (!form.longitude || !validateCoordinate(form.longitude)) {
        throw new Error("Please enter a valid longitude (-180 to 180)");
      }
      if (!form.photo) {
        throw new Error("Please upload a photo");
      }

      const [hour, minute] = form.time.split(":");
      const selectedDate = form.date;
      // Use local time instead of UTC to preserve timezone (IST = UTC+5:30)
      const punchDateTime = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth(),
        selectedDate.getDate(),
        parseInt(hour, 10),
        parseInt(minute, 10),
        0
      );

      const formData = new FormData();
      // Auto-populate from profile - these are validated server-side
      formData.append("organizationId", form.organizationId);
      formData.append("userId", form.userId);
      formData.append("type", form.type);
      formData.append("source", "manual");
      formData.append("timestamp", punchDateTime.toISOString());
      formData.append("latitude", form.latitude.toString());
      formData.append("longitude", form.longitude.toString());
      formData.append("locationAddress", form.locationAddress);
      formData.append("photo", form.photo);

      if (form.reason) {
        formData.append("reason", form.reason);
      }

      const res: any = await logAttendanceBypass(formData);

      if ("success" === String(res.data.status)) {
        setSuccess("Attendance record submitted successfully!");
        setForm({
          userId: "",
          organizationId: "",
          date: new Date(),
          time: "",
          type: "check-in",
          latitude: 0,
          longitude: 0,
          locationAddress: "",
          photo: null,
          reason: "",
        });
      } else if (String(res.data.status) === "anomaly") {
        throw new Error(
          `Attendance recorded with anomaly: ${res.reasons?.join(", ") || "Unknown anomaly"}`
        );
      } else {
        throw new Error("Unknown error from backend");
      }
    } catch (err: any) {
      console.error("Bypass submission error:", err);
      toast.error(err?.message || "Failed to submit attendance record");
      setError(err?.message || "Failed to submit attendance record");
    } finally {
      setSubmitting(false);
    }
  };

  const formatDateDisplay = (d: Date): string => format(d, "yyyy-MM-dd");

  const employeeOptions = useMemo(() => {
    return [];
  }, []);

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Attendance Bypass</h1>
            <p className="text-muted-foreground text-sm">
              Manually record attendance for {profile?.firstName || "employee"}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <Clock className="mr-2 h-4 w-4" /> Manual Attendance Entry
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {/* Auto-populated employee info - read-only */}
                <div>
                  <label className="text-sm font-medium">Employee</label>
                  <Input
                    type="text"
                    value={profile?.userName || profile?.userId || ""}
                    readOnly
                    disabled
                    className="w-full"
                  />
                  {profile?.employeeCode && (
                    <p className="text-xs text-muted-foreground">Code: {profile.employeeCode}</p>
                  )}
                </div>

                <Select
                  value={form.type}
                  onValueChange={(val: "check-in" | "check-out") =>
                    setForm((prev) => ({ ...prev, type: val }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select punch type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="check-in">Punch In</SelectItem>
                    <SelectItem value="check-out">Punch Out / Last Punch</SelectItem>
                  </SelectContent>
                </Select>

                <div>
                  <label className="block text-sm font-medium mb-2">Date</label>
                  <Input
                    type="date"
                    value={formatDateDisplay(form.date)}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, date: new Date(e.target.value) }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Time</label>
                  <Input
                    type="time"
                    value={form.time || "09:00"}
                    onChange={handleTimeChange}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Latitude (decimal degrees)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={form.latitude || ""}
                    onChange={handleLatitudeChange}
                    placeholder="e.g. 20.3494624"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for GPS validation. Must be between -90 and 90.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Longitude (decimal degrees)
                  </label>
                  <Input
                    type="number"
                    step="any"
                    value={form.longitude || ""}
                    onChange={handleLongitudeChange}
                    placeholder="e.g. 85.8078853"
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Required for GPS validation. Must be between -180 and 180.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Location Address (optional)
                  </label>
                  <Input
                    value={form.locationAddress || ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, locationAddress: e.target.value }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Reason for Bypass (optional, for audit trail)
                  </label>
                  <Input
                    value={form.reason || ""}
                    onChange={(e) =>
                      setForm((prev) => ({ ...prev, reason: e.target.value }))
                    }
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Photo (required)
                  </label>
                  <Input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handlePhotoChange}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Only JPEG, PNG, or WebP under 2MB. Stored in Cloudinary.
                  </p>
                </div>
              </div>

              <div className="mt-6 flex gap-3">
                <Button
                  type="submit"
                  disabled={submitting}
                  className="flex-1"
                >
                  {submitting ? "Submitting..." : "Submit Bypass Entry"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
