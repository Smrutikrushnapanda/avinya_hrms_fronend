"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, ArrowLeft, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createTimeslip, getEmployeeByUserId, getProfile } from "@/app/api/api";
import { format } from "date-fns";

interface FormState {
  date: string;
  missing_type: "IN" | "OUT" | "BOTH" | "";
  corrected_in_time: string;
  corrected_out_time: string;
  reason: string;
}

export default function MobileAddTimeslipPage() {
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [form, setForm] = useState<FormState>({
    date: today,
    missing_type: "",
    corrected_in_time: "",
    corrected_out_time: "",
    reason: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const profileRes = await getProfile();
        const profile = profileRes.data || {};
        const userId = profile.userId ?? profile.id ?? "";
        const orgId = profile.organizationId ?? profile.employee?.organizationId ?? "";
        setOrganizationId(orgId);

        let resolvedEmployeeId = profile.employee?.id ?? "";
        if (!resolvedEmployeeId && userId) {
          const empRes = await getEmployeeByUserId(userId);
          resolvedEmployeeId = empRes.data?.id || empRes.data?.data?.id || "";
        }

        if (!resolvedEmployeeId) {
          toast.error("Employee profile not found");
        }
        setEmployeeId(resolvedEmployeeId);
      } catch (error) {
        console.error("Failed to load profile:", error);
        toast.error("Failed to load profile");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const handleSubmit = async () => {
    if (!employeeId || !organizationId) {
      toast.error("Missing employee or organization details");
      return;
    }
    if (!form.date) {
      toast.error("Please select the date for the correction");
      return;
    }
    if (!form.missing_type) {
      toast.error("Please select what is missing");
      return;
    }
    if (
      (form.missing_type === "IN" || form.missing_type === "BOTH") &&
      !form.corrected_in_time
    ) {
      toast.error("Please enter the corrected check-in time");
      return;
    }
    if (
      (form.missing_type === "OUT" || form.missing_type === "BOTH") &&
      !form.corrected_out_time
    ) {
      toast.error("Please enter the corrected check-out time");
      return;
    }
    if (!form.reason.trim()) {
      toast.error("Please provide a reason for the correction");
      return;
    }

    const toISO = (date: string, time: string) =>
      new Date(`${date}T${time}:00`).toISOString();

    setSubmitting(true);
    try {
      await createTimeslip({
        employeeId,
        organizationId,
        date: new Date(form.date).toISOString(),
        missingType: form.missing_type,
        correctedIn:
          form.missing_type === "IN" || form.missing_type === "BOTH"
            ? toISO(form.date, form.corrected_in_time)
            : undefined,
        correctedOut:
          form.missing_type === "OUT" || form.missing_type === "BOTH"
            ? toISO(form.date, form.corrected_out_time)
            : undefined,
        reason: form.reason.trim(),
      });
      toast.success("Correction request submitted successfully");
      router.push("/user/dashboard/mobile/timeslip");
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to submit correction request"
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="h-24 rounded-2xl bg-muted animate-pulse" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-[#005F90] text-white px-4 pt-5 pb-16 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:text-white/90 hover:bg-white/10"
          onClick={() => router.push("/user/dashboard/mobile/timeslip")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="bg-white/20 rounded-full px-4 py-2">
          <h2 className="text-xl font-bold">Time Slip</h2>
        </div>
      </div>

      <div className="px-5 -mt-12 z-10 pb-24">
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <div className="flex flex-col items-center text-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-full bg-[#E6F4FA] flex items-center justify-center">
              <Clock className="w-5 h-5 text-[#0077B6]" />
            </div>
            <p className="text-sm font-bold text-[#0077B6]">Add Time Slip</p>
            <p className="text-xs text-gray-500">Submit a correction request</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Date</Label>
              <Input
                type="date"
                value={form.date}
                max={today}
                className="mt-2 border-gray-300 bg-[#F1F8FB]"
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, date: e.target.value }))
                }
              />
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Missing</Label>
              <div className="mt-2 rounded-lg border border-gray-300 bg-[#F1F8FB]">
                <Select
                  value={form.missing_type}
                  onValueChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      missing_type: value as FormState["missing_type"],
                      corrected_in_time: "",
                      corrected_out_time: "",
                    }))
                  }
                >
                  <SelectTrigger className="border-0 bg-transparent">
                    <SelectValue placeholder="Select missing type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Check In</SelectItem>
                    <SelectItem value="OUT">Check Out</SelectItem>
                    <SelectItem value="BOTH">Both</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {(form.missing_type === "IN" || form.missing_type === "BOTH") && (
              <div>
                <Label className="text-sm font-medium text-gray-700">Corrected Check In</Label>
                <Input
                  type="time"
                  value={form.corrected_in_time}
                  className="mt-2 border-gray-300 bg-[#F1F8FB]"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, corrected_in_time: e.target.value }))
                  }
                />
              </div>
            )}

            {(form.missing_type === "OUT" || form.missing_type === "BOTH") && (
              <div>
                <Label className="text-sm font-medium text-gray-700">Corrected Check Out</Label>
                <Input
                  type="time"
                  value={form.corrected_out_time}
                  className="mt-2 border-gray-300 bg-[#F1F8FB]"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, corrected_out_time: e.target.value }))
                  }
                />
              </div>
            )}

            <div>
              <Label className="text-sm font-medium text-gray-700">Reason</Label>
              <Textarea
                rows={4}
                placeholder="Enter reason for correction"
                value={form.reason}
                className="mt-2 border-gray-300 bg-[#F1F8FB]"
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, reason: e.target.value }))
                }
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full bg-[#0077B6] hover:bg-[#006494] text-white gap-2"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
