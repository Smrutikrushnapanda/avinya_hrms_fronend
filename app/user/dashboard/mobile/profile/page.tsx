"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  AlertTriangle,
  Briefcase,
  Building2,
  CalendarDays,
  Camera,
  ChevronDown,
  ChevronRight,
  Contact2,
  FileText,
  IdCard,
  Loader2,
  LogOut,
  Mail,
  Moon,
  Phone,
  RefreshCw,
  ShieldCheck,
  Sun,
  User,
  X,
} from "lucide-react";
import { getEmployeeByUserId, getProfile } from "@/app/api/api";
import { resolveAttachmentUrl } from "@/lib/chat-utils";
import MobileTabHeader from "../components/MobileTabHeader";

interface EmployeeProfile {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string;
  personalEmail?: string;
  workEmail?: string;
  contactNumber?: string;
  bloodGroup?: string;
  employeeCode?: string;
  department?: { name?: string };
  designation?: { name?: string };
  dateOfJoining?: string;
  employmentType?: string;
  emergencyContactName?: string;
  emergencyContactRelationship?: string;
  emergencyContactPhone?: string;
  photoUrl?: string;
  aadharPhotoUrl?: string;
  passportPhotoUrl?: string;
  panCardPhotoUrl?: string;
  status?: string;
  user?: { userName?: string; email?: string; mobileNumber?: string };
  manager?: {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    employeeCode?: string;
  };
}

type SectionId = "general" | "personal" | "documents" | "policy" | null;

const DEFAULT_PHOTO =
  "https://cdn-icons-png.flaticon.com/512/9187/9187532.png";
const LOCAL_PHOTO_KEY = "mobile_profile_photo";

const fullName = (a?: string, b?: string, c?: string): string =>
  [a, b, c].filter(Boolean).join(" ").trim() || "Unknown User";

const formatDate = (value?: string): string => {
  if (!value) return "N/A";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "N/A" : date.toLocaleDateString("en-GB");
};

const capitalize = (value?: string): string => {
  if (!value) return "N/A";
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
};

const formatEmploymentType = (value?: string): string => {
  if (!value) return "N/A";
  return value.charAt(0).toUpperCase() + value.slice(1).replace("-", " ");
};

export default function MobileProfilePage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [localPhoto, setLocalPhoto] = useState<string | null>(null);
  const [openSection, setOpenSection] = useState<SectionId>("general");
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [logoutDialog, setLogoutDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadProfile = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const profileRes = await getProfile();
      const authUser = (profileRes.data || {}) as Record<string, unknown>;
      const rawUserId =
        authUser?.userId || authUser?.id || localStorage.getItem("user_id");
      const userId = typeof rawUserId === "string" ? rawUserId : "";
      if (!userId) throw new Error("No user id");

      const employeeRes = await getEmployeeByUserId(userId);
      const data = (employeeRes.data || {}) as EmployeeProfile;
      const authPhoto = typeof authUser?.photoUrl === "string" ? authUser.photoUrl : "";
      const normalized = {
        ...data,
        photoUrl: data.passportPhotoUrl || data.photoUrl || authPhoto,
        passportPhotoUrl: data.passportPhotoUrl || data.photoUrl || authPhoto,
      };
      setProfile(normalized);
    } catch (error) {
      console.error("Profile load failed:", error);
      setProfile(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadProfile();
    try {
      const stored = localStorage.getItem(LOCAL_PHOTO_KEY);
      if (stored) setLocalPhoto(stored);
    } catch { /* ignore */ }
  }, [loadProfile]);

  const handlePickPhoto = () => {
    fileInputRef.current?.click();
  };

  const onPhotoChosen = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || "");
      setLocalPhoto(dataUrl);
      try {
        localStorage.setItem(LOCAL_PHOTO_KEY, dataUrl);
      } catch { /* ignore */ }
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  const photoSrc = localPhoto || profile?.photoUrl || DEFAULT_PHOTO;
  const managerName = fullName(
    profile?.manager?.firstName,
    profile?.manager?.middleName,
    profile?.manager?.lastName,
  );
  const statusColor =
    profile?.status?.toLowerCase() === "active" ? "#10b981" : "#f59e0b";

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileTabHeader title="Profile" backHref="/user/dashboard/mobile" />
        <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col pb-10">
      <MobileTabHeader title="Profile" backHref="/user/dashboard/mobile" />

      <main className="px-4 pt-4 max-w-md w-full mx-auto flex-1 space-y-3">
        {/* ── Profile Card ── */}
        <section className="relative rounded-2xl bg-card border border-border p-4 shadow-sm overflow-hidden">
          <span className="absolute -top-9 -right-9 w-28 h-28 rounded-full bg-blue-400/10 dark:bg-blue-500/15 pointer-events-none" />
          <span className="absolute -bottom-10 -left-10 w-24 h-24 rounded-full bg-blue-500/10 dark:bg-blue-400/15 pointer-events-none" />
          <div className="flex flex-col items-center relative">
            <button
              onClick={() => setLightbox(photoSrc)}
              className="relative rounded-full p-[3px]"
              aria-label="View profile photo"
            >
              <Image
                src={photoSrc}
                alt="Profile"
                width={88}
                height={88}
                unoptimized
                className="w-[88px] h-[88px] rounded-full border-4 border-primary/30 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_PHOTO;
                }}
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                <Camera className="w-3 h-3" />
              </span>
            </button>
            <button
              onClick={handlePickPhoto}
              className="mt-2.5 text-xs font-semibold text-primary border border-primary rounded-full px-3 py-1 flex items-center gap-1.5 hover:bg-primary/10 transition-colors"
            >
              <Camera className="w-3.5 h-3.5" />
              Change Photo
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onPhotoChosen}
            />

            <h2 className="mt-2.5 text-xl font-bold text-foreground text-center">
              {fullName(profile?.firstName, profile?.middleName, profile?.lastName)}
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5 text-center">
              {profile?.designation?.name || profile?.employeeCode || "Employee"}
            </p>
            <span
              className="mt-2.5 px-4 py-1.5 rounded-full text-white text-xs font-semibold"
              style={{ backgroundColor: statusColor }}
            >
              {profile?.status ? capitalize(profile.status) : "Unknown"}
            </span>
          </div>
        </section>

        {/* ── Accordion Sections ── */}
        <Accordion title="General Info" icon={<Briefcase className="w-4.5 h-4.5" />} open={openSection === "general"} onToggle={() => setOpenSection(openSection === "general" ? null : "general")}>
          <InfoItem icon={<IdCard className="w-5 h-5" />} label="Employee Code" value={profile?.employeeCode} />
          <InfoItem icon={<Building2 className="w-5 h-5" />} label="Department" value={profile?.department?.name} />
          <InfoItem icon={<Briefcase className="w-5 h-5" />} label="Designation" value={profile?.designation?.name} />
          <InfoItem icon={<Contact2 className="w-5 h-5" />} label="Reporting Manager" value={managerName} sub={profile?.manager?.employeeCode ? `(${profile.manager.employeeCode})` : undefined} />
          <InfoItem icon={<CalendarDays className="w-5 h-5" />} label="Date of Joining" value={formatDate(profile?.dateOfJoining)} />
          <InfoItem icon={<ShieldCheck className="w-5 h-5" />} label="Employment Type" value={formatEmploymentType(profile?.employmentType)} />
          {profile?.emergencyContactName || profile?.emergencyContactPhone ? (
            <InfoItem icon={<User className="w-5 h-5" />} label="Emergency Contact" value={[profile?.emergencyContactName, profile?.emergencyContactPhone].filter(Boolean).join(" • ")} />
          ) : null}
        </Accordion>

        <Accordion title="Personal Info" icon={<User className="w-4.5 h-4.5" />} open={openSection === "personal"} onToggle={() => setOpenSection(openSection === "personal" ? null : "personal")}>
          <InfoItem icon={<Mail className="w-5 h-5" />} label="Personal Email" value={profile?.personalEmail} />
          <InfoItem icon={<Mail className="w-5 h-5" />} label="Work Email" value={profile?.workEmail || profile?.user?.email} />
          <InfoItem icon={<Phone className="w-5 h-5" />} label="Contact Number" value={profile?.contactNumber || profile?.user?.mobileNumber} />
          <InfoItem icon={<CalendarDays className="w-5 h-5" />} label="Date of Birth" value={formatDate(profile?.dateOfBirth)} />
          <InfoItem icon={<User className="w-5 h-5" />} label="Gender" value={capitalize(profile?.gender)} />
          <InfoItem icon={<Contact2 className="w-5 h-5" />} label="Blood Group" value={profile?.bloodGroup} />
        </Accordion>

        <Accordion title="Documents Center" icon={<FileText className="w-4.5 h-4.5" />} open={openSection === "documents"} onToggle={() => setOpenSection(openSection === "documents" ? null : "documents")}>
          <div className="grid grid-cols-3 gap-2 pt-1 pb-2">
            <DocumentItem label="Aadhar" uri={profile?.aadharPhotoUrl} onOpen={setLightbox} />
            <DocumentItem label="Passport" uri={profile?.passportPhotoUrl} onOpen={setLightbox} />
            <DocumentItem label="PAN Card" uri={profile?.panCardPhotoUrl} onOpen={setLightbox} />
          </div>
        </Accordion>

        <Accordion title="Company Policy" icon={<ShieldCheck className="w-4.5 h-4.5" />} open={openSection === "policy"} onToggle={() => setOpenSection(openSection === "policy" ? null : "policy")}>
          <div className="rounded-xl bg-muted p-3.5 mt-1 mb-2">
            <p className="text-[13px] font-semibold text-foreground leading-relaxed">
              Follow attendance policy, keep profile details updated, and submit
              timeslips within 48 hours of a missed punch.
            </p>
            <p className="text-[11px] text-muted-foreground mt-1.5">
              This section can be updated by HR.
            </p>
          </div>
        </Accordion>

        {/* ── Theme toggle ── */}
        <section className="rounded-2xl bg-card border border-border px-4 py-3 flex items-center justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
              {isDark ? (
                <Moon className="w-4.5 h-4.5 text-primary" />
              ) : (
                <Sun className="w-4.5 h-4.5 text-primary" />
              )}
            </span>
            <div>
              <p className="text-sm font-bold text-foreground">Dark Theme</p>
              <p className="text-xs text-muted-foreground">{isDark ? "On" : "Off"}</p>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={isDark}
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className={`relative w-11 h-6 rounded-full transition-colors ${isDark ? "bg-primary" : "bg-muted"}`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${isDark ? "left-[22px]" : "left-0.5"}`}
            />
          </button>
        </section>

        {/* ── Actions ── */}
        <section className="pt-1 space-y-2.5">
          <button
            onClick={() => setLogoutDialog(true)}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 text-white font-semibold text-sm py-3.5 hover:bg-rose-700 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" />
            Logout
          </button>
          <button
            onClick={() => void loadProfile(true)}
            disabled={refreshing}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary/10 text-primary font-semibold text-sm py-3.5 hover:bg-primary/15 transition-colors disabled:opacity-60"
          >
            <RefreshCw className={`w-4.5 h-4.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh Profile"}
          </button>
        </section>
      </main>

      {/* ── Logout confirm dialog ── */}
      {logoutDialog ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-black/50" onClick={() => setLogoutDialog(false)} />
          <div className="relative bg-card border border-border rounded-2xl p-5 w-full max-w-xs shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mx-auto">
              <LogOut className="w-5 h-5 text-rose-600" />
            </div>
            <h3 className="text-base font-bold text-foreground text-center mt-3">Logout</h3>
            <p className="text-sm text-muted-foreground text-center mt-1">
              Are you sure you want to logout?
            </p>
            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <button
                onClick={() => setLogoutDialog(false)}
                className="rounded-xl bg-muted text-foreground text-sm font-semibold py-2.5 hover:bg-muted/70 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => router.push("/logout")}
                className="rounded-xl bg-rose-600 text-white text-sm font-semibold py-2.5 hover:bg-rose-700 transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Photo lightbox ── */}
      {lightbox ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-6">
          <button
            onClick={() => setLightbox(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <Image
            src={lightbox}
            alt="Preview"
            width={900}
            height={700}
            unoptimized
            className="max-w-full max-h-[80vh] object-contain rounded-lg"
            onError={() => setLightbox(null)}
          />
        </div>
      ) : null}
    </div>
  );
}

function Accordion({
  title,
  icon,
  open,
  onToggle,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-card border border-border px-4 py-2 shadow-sm">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-3"
      >
        <span className="flex items-center gap-2.5 text-sm font-bold text-foreground">
          <span className="text-primary">{icon}</span>
          {title}
        </span>
        {open ? (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        )}
      </button>
      {open ? <div className="pb-3 space-y-2">{children}</div> : null}
    </section>
  );
}

function InfoItem({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-muted/60 px-3 py-2.5">
      <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className="text-sm font-semibold text-foreground truncate">
          {value || "N/A"}
          {sub ? <span className="text-xs text-muted-foreground font-normal"> {sub}</span> : null}
        </p>
      </div>
    </div>
  );
}

function DocumentItem({
  label,
  uri,
  onOpen,
}: {
  label: string;
  uri?: string;
  onOpen: (url: string) => void;
}) {
  return (
    <button
      onClick={() => (uri ? onOpen(resolveAttachmentUrl(uri)) : undefined)}
      className="flex flex-col items-center gap-1.5"
      aria-label={label}
    >
      <div className="w-full aspect-[4/3] rounded-lg bg-muted border border-border overflow-hidden flex items-center justify-center">
        {uri ? (
          <Image
            src={resolveAttachmentUrl(uri)}
            alt={label}
            width={160}
            height={120}
            unoptimized
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <span className="flex flex-col items-center gap-1 text-muted-foreground">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-[10px]">No file</span>
          </span>
        )}
      </div>
      <span className="text-xs font-semibold text-foreground">{label}</span>
    </button>
  );
}