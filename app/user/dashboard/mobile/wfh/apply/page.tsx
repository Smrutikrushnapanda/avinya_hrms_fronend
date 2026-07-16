"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { applyWfh, getProfile } from "@/app/api/api";
import { format } from "date-fns";

export default function MobileApplyWfhPage() {
  const router = useRouter();
  const today = format(new Date(), "yyyy-MM-dd");

  const [profile, setProfile] = useState<any>(null);
  const userId = profile?.userId ?? profile?.id ?? profile?.employee?.userId;
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
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

  const handleSubmit = async () => {
    if (!userId) {
      toast.error("User not found. Please login again.");
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
      await applyWfh(userId, {
        date: form.startDate,
        endDate: form.endDate,
        reason: form.reason.trim(),
      });
      toast.success("WFH request submitted.");
      router.push("/user/dashboard/mobile/wfh");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to submit WFH request.");
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
    <div className="min-h-screen bg-background">
      <div className="bg-primary text-primary-foreground px-4 pt-3 pb-10 flex items-center gap-3 relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-[200px] h-[200px] rounded-full bg-white/15 -top-[90px] -right-[30px]" />
          <div className="absolute w-[140px] h-[140px] rounded-full bg-white/15 -bottom-[50px] -left-[10px]" />
          {[{s:8,l:"10%",t:10,k:"particle-1",d:"5.2s"},{s:12,l:"28%",t:42,k:"particle-2",d:"6.4s"},{s:6,l:"46%",t:14,k:"particle-3",d:"5.6s"},{s:10,l:"64%",t:28,k:"particle-4",d:"7.0s"},{s:14,l:"82%",t:8,k:"particle-5",d:"7.6s"},{s:7,l:"20%",t:72,k:"particle-6",d:"6.2s"}].map((p,i)=>(
            <div key={i} className="absolute rounded-full bg-white/30" style={{width:p.s,height:p.s,left:p.l,top:p.t,animation:`${p.k} ${p.d} ease-in-out infinite`,animationDelay:["0s","0.6s","1.2s","0.3s","0.9s","1.5s"][i]}} />
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-primary-foreground hover:text-primary-foreground/90 hover:bg-white/10"
          onClick={() => router.push("/user/dashboard/mobile/wfh")}
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="bg-primary-foreground/20 rounded-full px-4 py-2">
          <h2 className="text-xl font-bold">WFH</h2>
        </div>
      </div>

      <div className="px-5 -mt-6 z-10 pb-24">
        <div className="bg-card rounded-2xl p-6 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] border border-border">
          <div className="flex flex-col items-center text-center gap-2 mb-6">
            <div className="h-10 w-10 rounded-full bg-primary/8 flex items-center justify-center">
              <Home className="w-5 h-5 text-primary" />
            </div>
            <p className="text-sm font-bold text-primary">Apply Work From Home</p>
            <p className="text-xs text-muted-foreground">Submit a new WFH request</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-sm font-medium text-foreground">Start Date</Label>
                <Input
                  type="date"
                  value={form.startDate}
                  min={today}
                  className="mt-2 border-border bg-muted"
                  onChange={(e) =>
                    setForm((prev) => {
                      const nextStart = e.target.value;
                      const safeEnd = prev.endDate < nextStart ? nextStart : prev.endDate;
                      return { ...prev, startDate: nextStart, endDate: safeEnd };
                    })
                  }
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground">End Date</Label>
                <Input
                  type="date"
                  value={form.endDate}
                  min={form.startDate || today}
                  className="mt-2 border-border bg-muted"
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, endDate: e.target.value }))
                  }
                />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">Reason</Label>
              <Textarea
                rows={4}
                placeholder="Enter reason for WFH...(optional)"
                value={form.reason}
                className="mt-2 border-border bg-muted"
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, reason: e.target.value }))
                }
              />
            </div>

            <Button
              onClick={handleSubmit}
              loading={submitting}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            >
              <Send className="h-4 w-4" />
              Submit Request
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
