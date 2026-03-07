"use client";

import { type ComponentType, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  FileText,
  IdCard,
  Link2,
  Loader2,
  Mail,
  Phone,
  Send,
  UserRound,
  XCircle,
  Hash,
  Clock,
  Shield,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  createResignationRequest,
  getEmployeeByUserId,
  getMyResignationRequests,
  getOrganization,
  getProfile,
} from "@/app/api/api";

type Role = {
  roleName?: string;
};

type ProfileData = {
  id?: string;
  userId?: string;
  user_id?: string;
  organizationId?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  email?: string;
  userName?: string;
  avatar?: string;
  phone?: string;
  phoneNumber?: string;
  roles?: Role[];
};

type EmployeeData = {
  employeeCode?: string;
  employee_code?: string;
  phone?: string;
  mobile?: string;
  joiningDate?: string;
  dateOfJoining?: string;
  joining_date?: string;
  department?: { name?: string } | string;
  designation?: { name?: string } | string;
  departmentName?: string;
  designationName?: string;
  aadharPhotoUrl?: string;
  panCardPhotoUrl?: string;
  passportPhotoUrl?: string;
};

type OrganizationSettings = {
  hrMail?: string;
  resignationPolicy?: string;
  resignationNoticePeriodDays?: number;
  allowEarlyRelievingByAdmin?: boolean;
};

type ResignationRequest = {
  id: string;
  message: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  proposedLastWorkingDay?: string | null;
  approvedLastWorkingDay?: string | null;
  allowEarlyRelieving?: boolean;
  hrRemarks?: string | null;
  createdAt: string;
};

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 group">
      <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 p-4 rounded-2xl bg-muted/50 border border-border/50 hover:bg-muted/80 transition-colors">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <p className="text-base font-bold text-foreground leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground text-center leading-tight">{label}</p>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getTenure(value?: string) {
  if (!value) return "—";
  const start = new Date(value);
  if (Number.isNaN(start.getTime())) return "—";
  const now = new Date();
  const months =
    (now.getFullYear() - start.getFullYear()) * 12 +
    (now.getMonth() - start.getMonth());
  if (months < 1) return "< 1 month";
  if (months < 12) return `${months} mo`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem > 0 ? `${years}y ${rem}mo` : `${years} yr${years > 1 ? "s" : ""}`;
}

function isImageUrl(url?: string) {
  if (!url) return false;
  const normalized = url.toLowerCase();
  if (/\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)(\?|#|$)/.test(normalized)) {
    return true;
  }
  return normalized.includes("image/") || normalized.includes("cloudinary.com");
}

function getFileLabel(url?: string) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    const lastSegment = parsed.pathname.split("/").filter(Boolean).pop();
    return decodeURIComponent(lastSegment || parsed.hostname);
  } catch {
    const lastSegment = url.split("?")[0].split("/").filter(Boolean).pop();
    return lastSegment || url;
  }
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: "bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700",
  EMPLOYEE: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-700",
  MANAGER: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700",
};

const RESIGNATION_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-100 text-rose-700 border-rose-200",
};

export default function UserProfilePage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [employee, setEmployee] = useState<EmployeeData | null>(null);
  const [organization, setOrganization] = useState<OrganizationSettings | null>(null);
  const [resignationRequests, setResignationRequests] = useState<ResignationRequest[]>([]);
  const [resignationForm, setResignationForm] = useState({
    message: "",
    proposedLastWorkingDay: "",
  });
  const [sendingResignation, setSendingResignation] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        setError("");
        const profileRes = await getProfile();
        const profileData = (profileRes.data || null) as ProfileData | null;
        setProfile(profileData);
        const userId = profileData?.id || profileData?.userId || profileData?.user_id;
        const orgId = profileData?.organizationId;
        if (userId) {
          try {
            const employeeRes = await getEmployeeByUserId(userId);
            setEmployee((employeeRes.data || null) as EmployeeData | null);
          } catch {
            setEmployee(null);
          }
        }
        if (orgId) {
          try {
            const orgRes = await getOrganization(orgId);
            setOrganization((orgRes.data || null) as OrganizationSettings | null);
          } catch {
            setOrganization(null);
          }
        }
        try {
          const resignationRes = await getMyResignationRequests();
          setResignationRequests((resignationRes.data || []) as ResignationRequest[]);
        } catch {
          setResignationRequests([]);
        }
      } catch {
        setError("Unable to load profile details.");
      } finally {
        setLoading(false);
      }
    };
    loadProfile();
  }, []);

  const fullName = useMemo(
    () =>
      [profile?.firstName, profile?.middleName, profile?.lastName]
        .filter(Boolean)
        .join(" ") || "User",
    [profile]
  );

  const primaryRole = useMemo(() => {
    const roles = (profile?.roles || [])
      .map((r) => r?.roleName?.trim().toUpperCase())
      .filter((r): r is string => Boolean(r));

    if (roles.includes("EMPLOYEE")) return "EMPLOYEE";
    if (roles.includes("ADMIN")) return "ADMIN";
    if (roles.includes("MANAGER")) return "MANAGER";
    return roles[0] || "EMPLOYEE";
  }, [profile]);

  const initials = useMemo(
    () =>
      [profile?.firstName?.[0], profile?.lastName?.[0]]
        .filter(Boolean)
        .join("")
        .toUpperCase() || "U",
    [profile]
  );

  const employeeCode = employee?.employeeCode || employee?.employee_code || "—";
  const department =
    (typeof employee?.department === "string"
      ? employee.department
      : employee?.department?.name) ||
    employee?.departmentName ||
    "—";
  const designation =
    (typeof employee?.designation === "string"
      ? employee.designation
      : employee?.designation?.name) ||
    employee?.designationName ||
    "—";
  const rawJoining = employee?.joiningDate || employee?.dateOfJoining || employee?.joining_date;
  const joiningDate = formatDate(rawJoining);
  const tenure = getTenure(rawJoining);
  const phone =
    employee?.phone || employee?.mobile || profile?.phone || profile?.phoneNumber || "—";

  const roleColorClass =
    ROLE_COLORS[primaryRole] || ROLE_COLORS["EMPLOYEE"];
  const documentLinks = [
    { label: "Aadhaar", url: employee?.aadharPhotoUrl || "" },
    { label: "PAN Card", url: employee?.panCardPhotoUrl || "" },
    { label: "Passport", url: employee?.passportPhotoUrl || "" },
  ];

  const handleSendResignation = async () => {
    if (!resignationForm.message.trim()) {
      toast.error("Please enter your resignation message.");
      return;
    }
    setSendingResignation(true);
    try {
      await createResignationRequest({
        message: resignationForm.message.trim(),
        proposedLastWorkingDay:
          resignationForm.proposedLastWorkingDay || undefined,
      });
      toast.success("Resignation message sent to HR.");
      setResignationForm({ message: "", proposedLastWorkingDay: "" });
      const resignationRes = await getMyResignationRequests();
      setResignationRequests((resignationRes.data || []) as ResignationRequest[]);
    } catch (err: unknown) {
      const maybeAxiosError = err as { response?: { data?: { message?: string } } };
      const message =
        maybeAxiosError?.response?.data?.message ||
        "Failed to send resignation request. Please try again.";
      toast.error(message);
    } finally {
      setSendingResignation(false);
    }
  };

  const openDocument = async (url?: string, label?: string) => {
    if (!url) return;

    const previewTab = window.open("", "_blank");
    if (previewTab) {
      previewTab.opener = null;
    }

    try {
      if (/^data:/i.test(url)) {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        if (previewTab && !previewTab.closed) {
          previewTab.location.href = blobUrl;
        } else {
          window.location.href = blobUrl;
        }

        // Give browser enough time to load before cleanup.
        window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
        return;
      }

      if (previewTab && !previewTab.closed) {
        previewTab.location.href = url;
      } else {
        window.location.href = url;
      }
    } catch {
      if (previewTab && !previewTab.closed) {
        previewTab.close();
      }
      toast.error(`Unable to open ${label || "document"}.`);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="mx-auto w-full max-w-3xl">
        <Card className="border-red-200 bg-red-50/60 dark:border-red-900/40 dark:bg-red-900/10">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4" />
            <span>{error || "Profile details are unavailable."}</span>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      {/* Hero Card */}
      <Card className="overflow-hidden border-0 shadow-md">
        {/* Banner */}
        <div className="h-32 w-full bg-gradient-to-br from-primary/80 via-primary/60 to-primary/30 relative">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent" />
        </div>

        <CardContent className="px-6 pb-6">
          {/* Avatar row */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 -mt-12 mb-5">
            <div className="flex items-end gap-4">
              <Avatar className="h-24 w-24 border-4 border-background shadow-xl ring-2 ring-primary/20">
                <AvatarImage src={profile.avatar || "/avatar.jpg"} alt={fullName} />
                <AvatarFallback className="text-2xl font-bold bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="mb-1">
                <h1 className="text-2xl font-bold text-foreground leading-tight">{fullName}</h1>
                <p className="text-sm text-muted-foreground">{designation !== "—" ? designation : profile.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${roleColorClass}`}>
                <Shield className="w-3 h-3" />
                {primaryRole}
              </span>
              {employeeCode !== "—" && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
                  <Hash className="w-3 h-3" />
                  {employeeCode}
                </span>
              )}
            </div>
          </div>

          <Separator className="mb-5" />

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Department" value={department} icon={Building2} />
            <StatCard label="Designation" value={designation} icon={BriefcaseBusiness} />
            <StatCard label="Tenure" value={tenure} icon={Clock} />
            <StatCard label="Joined" value={rawJoining ? new Date(rawJoining).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "—"} icon={CalendarDays} />
          </div>
        </CardContent>
      </Card>

      {/* Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Contact */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={Mail} label="Email Address" value={profile.email || "—"} />
            <Separator />
            <InfoRow icon={Phone} label="Phone Number" value={phone} />
            <Separator />
            <InfoRow icon={UserRound} label="Username" value={profile.userName || "—"} />
          </CardContent>
        </Card>

        {/* Employment */}
        <Card className="shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Employment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoRow icon={IdCard} label="Employee Code" value={employeeCode} />
            <Separator />
            <InfoRow icon={Building2} label="Department" value={department} />
            <Separator />
            <InfoRow icon={BriefcaseBusiness} label="Designation" value={designation} />
            <Separator />
            <InfoRow icon={CalendarDays} label="Joining Date" value={joiningDate} />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="shadow-sm lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {documentLinks.map((doc) => {
              const fileLabel = getFileLabel(doc.url);
              const showImagePreview = isImageUrl(doc.url);

              return (
                <div
                  key={doc.label}
                  className="rounded-lg border border-border p-3 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{doc.label}</span>
                  </div>

                  {doc.url ? (
                    <>
                      <button
                        type="button"
                        onClick={() => void openDocument(doc.url, doc.label)}
                        className="block w-full rounded-lg border border-border overflow-hidden bg-muted/30 text-left"
                      >
                        {showImagePreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={doc.url}
                            alt={`${doc.label} preview`}
                            className="h-32 w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="h-32 w-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <FileText className="h-7 w-7" />
                            <span className="text-xs font-medium uppercase tracking-wide">
                              Document Preview
                            </span>
                          </div>
                        )}
                      </button>

                      <div className="flex items-center justify-between gap-2">
                        <p className="min-w-0 truncate text-xs text-muted-foreground">
                          {fileLabel || "Uploaded document"}
                        </p>
                        <button
                          type="button"
                          onClick={() => void openDocument(doc.url, doc.label)}
                          className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline whitespace-nowrap"
                        >
                          <Link2 className="h-3 w-3" />
                          Open
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="h-20 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">
                      Not uploaded
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              Resignation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                Policy
              </p>
              <p className="mt-1 text-sm text-blue-900 whitespace-pre-line">
                {organization?.resignationPolicy ||
                  `Standard notice period is ${
                    organization?.resignationNoticePeriodDays || 30
                  } days. Please coordinate handover and asset return.`}
              </p>
              <p className="mt-2 text-xs text-blue-700">
                HR Mail: {organization?.hrMail || "Not configured by admin"}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Resignation Message
                </Label>
                <Textarea
                  rows={4}
                  value={resignationForm.message}
                  onChange={(e) =>
                    setResignationForm((prev) => ({ ...prev, message: e.target.value }))
                  }
                  placeholder="Write your resignation reason and handover plan..."
                />
              </div>
              <div>
                <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Proposed Last Working Day
                </Label>
                <Input
                  type="date"
                  value={resignationForm.proposedLastWorkingDay}
                  onChange={(e) =>
                    setResignationForm((prev) => ({
                      ...prev,
                      proposedLastWorkingDay: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="flex items-end">
                <Button
                  className="w-full"
                  onClick={handleSendResignation}
                  disabled={sendingResignation || !organization?.hrMail}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {sendingResignation ? "Sending..." : "Send To HR"}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Request History
              </p>
              {resignationRequests.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No resignation requests yet.
                </p>
              )}
              {resignationRequests.map((req) => (
                <div
                  key={req.id}
                  className="rounded-lg border border-border p-3 space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                        RESIGNATION_STATUS_COLORS[req.status] ||
                        "bg-muted text-muted-foreground border-border"
                      }`}
                    >
                      {req.status === "PENDING" && <Clock3 className="h-3 w-3" />}
                      {req.status === "APPROVED" && <CheckCircle2 className="h-3 w-3" />}
                      {req.status === "REJECTED" && <XCircle className="h-3 w-3" />}
                      {req.status}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(req.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm whitespace-pre-line">{req.message}</p>
                  <p className="text-xs text-muted-foreground">
                    Requested LWD: {req.proposedLastWorkingDay || "Not set"}
                  </p>
                  {req.status === "APPROVED" && (
                    <p className="text-xs text-emerald-700">
                      Approved LWD: {req.approvedLastWorkingDay || "Not set"}{" "}
                      {req.allowEarlyRelieving ? "(Early relieving allowed)" : ""}
                    </p>
                  )}
                  {req.hrRemarks && (
                    <p className="text-xs text-muted-foreground">
                      HR Remarks: {req.hrRemarks}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
