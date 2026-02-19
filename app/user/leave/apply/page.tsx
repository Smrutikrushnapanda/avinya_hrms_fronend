"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Send, ArrowLeft } from "lucide-react";
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
import { getProfile, getLeaveTypes, applyLeave } from "@/app/api/api";
import { format } from "date-fns";

interface LeaveType {
  id: string;
  name: string;
}

export default function ApplyLeavePage() {
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");

  const [profile, setProfile] = useState<any>(null);
  const userId = profile?.userId ?? profile?.id ?? profile?.employee?.userId;
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    leaveTypeId: "",
    startDate: today,
    endDate: today,
    reason: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await getProfile();
        setProfile(res.data);
      } catch {
        toast.error("Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  useEffect(() => {
    const loadLeaveTypes = async () => {
      if (!profile?.organizationId) return;
      try {
        const res = await getLeaveTypes(profile.organizationId);
        const data = res.data || [];
        setLeaveTypes(Array.isArray(data) ? data : []);
      } catch {
        toast.error("Failed to load leave types");
      }
    };
    loadLeaveTypes();
  }, [profile?.organizationId]);

  const handleSubmit = async () => {
    if (!userId) {
      toast.error("User not found. Please login again.");
      return;
    }
    if (!form.leaveTypeId) {
      toast.error("Please select a leave type.");
      return;
    }
    if (!form.startDate || !form.endDate) {
      toast.error("Please select start and end dates.");
      return;
    }
    if (new Date(form.endDate) < new Date(form.startDate)) {
      toast.error("End date must be after start date.");
      return;
    }

    setSubmitting(true);
    try {
      await applyLeave(userId, {
        leaveTypeId: form.leaveTypeId,
        startDate: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
      });
      toast.success("Leave request submitted.");
      router.push("/user/leave");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to submit leave request.");
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
          onClick={() => router.push("/user/leave")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="bg-white/20 rounded-full px-4 py-2">
          <h2 className="text-xl font-bold">Leave</h2>
        </div>
      </div>

      <div className="px-5 -mt-12 z-10 pb-10">
        <div className="bg-white rounded-2xl p-6 shadow-md border border-gray-100">
          <div className="flex flex-col items-center text-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-full bg-[#E6F4FA] flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#0077B6]" />
            </div>
            <p className="text-sm font-bold text-[#0077B6]">Apply for Leave</p>
            <p className="text-xs text-gray-500">Submit a new leave request</p>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-gray-700">Leave Type</Label>
              <div className="mt-2 rounded-lg border border-gray-300 bg-[#F1F8FB]">
                <Select
                  value={form.leaveTypeId}
                  onValueChange={(value) =>
                    setForm((prev) => ({ ...prev, leaveTypeId: value }))
                  }
                >
                  <SelectTrigger className="border-0 bg-transparent">
                    <SelectValue placeholder="Select Leave Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {leaveTypes.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        No leave types available
                      </SelectItem>
                    ) : (
                      leaveTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-gray-700">Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  min={today}
                  className="mt-2 border-gray-300 bg-[#F1F8FB]"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, startDate: e.target.value }))
                  }
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-gray-700">End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  min={form.startDate || today}
                  className="mt-2 border-gray-300 bg-[#F1F8FB]"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-gray-700">Reason</Label>
              <Textarea
                rows={4}
                placeholder="Enter reason for leave...(optional)"
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
                  Submit Application
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
