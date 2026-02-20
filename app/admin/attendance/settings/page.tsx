"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import api, {
  getProfile,
  getWifiLocations,
  createWifiLocation,
  updateWifiLocation,
  deleteWifiLocation,
  getOrganization,
  updateOrganization,
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
} from "@/app/api/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Save, Loader2, MapPin, Clock, Shield, AlertCircle, Wifi, Plus, Pencil, Trash2, Building2 } from "lucide-react";
import { toast } from "sonner";

interface AttendanceSettings {
  id?: string;
  workStartTime: string;
  workEndTime: string;
  graceMinutes: number;
  lateThresholdMinutes: number;
  officeLatitude: number | null;
  officeLongitude: number | null;
  officeLocationName: string | null;
  officeLocationAddress: string | null;
  allowedRadiusMeters: number;
  enableGpsValidation: boolean;
  enableWifiValidation: boolean;
  enableFaceValidation: boolean;
  enableCheckinValidation: boolean;
  enableCheckoutValidation: boolean;
  halfDayCutoffTime: string;
  workingDays: number[];
  weekdayOffRules: Record<string, number[]>;
}

interface WifiNetwork {
  id: string;
  name: string;
  ssid: string;
  bssid: string;
  locationDescription?: string;
  latitude?: number;
  longitude?: number;
  allowedRadiusMeters: number;
  isActive: boolean;
  createdAt: string;
}

interface Branch {
  id: string;
  name: string;
  workStartTime: string;
  workEndTime: string;
  graceMinutes: number;
  lateThresholdMinutes: number;
  isActive: boolean;
  organizationId: string;
  createdAt: string;
}

const defaultSettings: AttendanceSettings = {
  workStartTime: "09:00:00",
  workEndTime: "18:00:00",
  graceMinutes: 15,
  lateThresholdMinutes: 30,
  officeLatitude: null,
  officeLongitude: null,
  officeLocationName: null,
  officeLocationAddress: null,
  allowedRadiusMeters: 100,
  enableGpsValidation: true,
  enableWifiValidation: false,
  enableFaceValidation: true,
  enableCheckinValidation: true,
  enableCheckoutValidation: true,
  halfDayCutoffTime: "14:00:00",
  workingDays: [1, 2, 3, 4, 5, 6],
  weekdayOffRules: {},
};

const defaultWifiForm = {
  name: "",
  ssid: "",
  bssid: "",
  locationDescription: "",
  latitude: "",
  longitude: "",
  allowedRadiusMeters: "50",
};

const defaultBranchForm = {
  name: "",
  workStartTime: "09:00",
  workEndTime: "18:00",
  graceMinutes: "15",
  lateThresholdMinutes: "30",
  isActive: true,
};

const sanitizeIntInput = (value: string) => value.replace(/[^0-9]/g, "");
  const sanitizeFloatInput = (value: string) => value.replace(/[^0-9.-]/g, "");

  const handleBranchSave = async () => {
    if (!organizationId) {
      toast.error("Organization not found. Please login again.");
      return;
    }
    if (!branchForm.name.trim()) {
      toast.error("Branch name is required");
      return;
    }
    setBranchSaving(true);
    try {
      const payload = {
        organizationId,
        name: branchForm.name.trim(),
        workStartTime: branchForm.workStartTime + ":00",
        workEndTime: branchForm.workEndTime + ":00",
        graceMinutes: Number(branchForm.graceMinutes || 0),
        lateThresholdMinutes: Number(branchForm.lateThresholdMinutes || 0),
        isActive: branchForm.isActive,
      };
      if (editingBranch) {
        await updateBranch(editingBranch.id, payload);
        toast.success("Branch updated");
      } else {
        await createBranch(payload);
        toast.success("Branch created");
      }
      setBranchDialogOpen(false);
      setEditingBranch(null);
      setBranchForm(defaultBranchForm);
      fetchBranches(organizationId);
    } catch (error) {
      console.error("Error saving branch:", error);
      toast.error("Failed to save branch");
    } finally {
      setBranchSaving(false);
    }
  };

  const handleBranchEdit = (branch: Branch) => {
    setEditingBranch(branch);
    setBranchForm({
      name: branch.name,
      workStartTime: branch.workStartTime.slice(0, 5),
      workEndTime: branch.workEndTime.slice(0, 5),
      graceMinutes: String(branch.graceMinutes ?? 0),
      lateThresholdMinutes: String(branch.lateThresholdMinutes ?? 0),
      isActive: branch.isActive,
    });
    setBranchDialogOpen(true);
  };

  const handleBranchDelete = async () => {
    if (!branchDeleteId) return;
    try {
      await deleteBranch(branchDeleteId);
      toast.success("Branch deleted");
      fetchBranches(organizationId);
    } catch (error) {
      console.error("Error deleting branch:", error);
      toast.error("Failed to delete branch");
    } finally {
      setBranchDeleteId(null);
    }
  };

export default function AttendanceSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<AttendanceSettings>(defaultSettings);
  const [organizationId, setOrganizationId] = useState<string>("");

  // WiFi state
  const [wifiNetworks, setWifiNetworks] = useState<WifiNetwork[]>([]);
  const [wifiLoading, setWifiLoading] = useState(false);
  const [wifiDialogOpen, setWifiDialogOpen] = useState(false);
  const [wifiSaving, setWifiSaving] = useState(false);
  const [editingWifi, setEditingWifi] = useState<WifiNetwork | null>(null);
  const [wifiForm, setWifiForm] = useState(defaultWifiForm);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Branch state
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchLoading, setBranchLoading] = useState(false);
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [branchSaving, setBranchSaving] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchForm, setBranchForm] = useState(defaultBranchForm);
  const [branchDeleteId, setBranchDeleteId] = useState<string | null>(null);

  useEffect(() => {
    getProfile()
      .then((res) => {
        const orgId = res.data?.organizationId;
        if (orgId) {
          setOrganizationId(orgId);
          fetchSettings(orgId).then(() => fetchOrgValidationSettings(orgId));
          fetchWifiNetworks(orgId);
          fetchBranches(orgId);
        } else {
          setLoading(false);
          toast.error("Organization not found. Please login again.");
        }
      })
      .catch(() => {
        setLoading(false);
        toast.error("Failed to load profile.");
      });
  }, []);

  const fetchSettings = async (orgId: string) => {
    setLoading(true);
    try {
      const response = await api.get("/attendance/settings", {
        params: { organizationId: orgId },
      });
      if (response.data) {
        setSettings({ ...defaultSettings, ...response.data });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgValidationSettings = async (orgId: string) => {
    try {
      const response = await getOrganization(orgId);
      const org = response.data || {};
      setSettings((prev) => ({
        ...prev,
        enableGpsValidation:
          typeof org.enableGpsValidation === "boolean"
            ? org.enableGpsValidation
            : prev.enableGpsValidation,
        enableWifiValidation:
          typeof org.enableWifiValidation === "boolean"
            ? org.enableWifiValidation
            : prev.enableWifiValidation,
      }));
    } catch (error) {
      console.error("Error fetching organization settings:", error);
    }
  };

  const fetchWifiNetworks = async (orgId: string) => {
    setWifiLoading(true);
    try {
      const response = await getWifiLocations(orgId);
      setWifiNetworks(response.data || []);
    } catch (error) {
      console.error("Error fetching WiFi networks:", error);
    } finally {
      setWifiLoading(false);
    }
  };

  const fetchBranches = async (orgId: string) => {
    setBranchLoading(true);
    try {
      const response = await getBranches(orgId);
      setBranches(response.data || []);
    } catch (error) {
      console.error("Error fetching branches:", error);
    } finally {
      setBranchLoading(false);
    }
  };

  const handleSave = async () => {
    if (!organizationId) {
      toast.error("Organization not found. Please login again.");
      return;
    }
    setSaving(true);
    try {
      const raw: Record<string, any> = {
        workStartTime: settings.workStartTime,
        workEndTime: settings.workEndTime,
        graceMinutes: settings.graceMinutes,
        lateThresholdMinutes: settings.lateThresholdMinutes,
        officeLatitude: settings.officeLatitude,
        officeLongitude: settings.officeLongitude,
        officeLocationName: settings.officeLocationName,
        officeLocationAddress: settings.officeLocationAddress,
        allowedRadiusMeters: settings.allowedRadiusMeters,
        enableGpsValidation: settings.enableGpsValidation,
        enableWifiValidation: settings.enableWifiValidation,
        enableFaceValidation: settings.enableFaceValidation,
        enableCheckinValidation: settings.enableCheckinValidation,
        enableCheckoutValidation: settings.enableCheckoutValidation,
        halfDayCutoffTime: settings.halfDayCutoffTime,
        workingDays: settings.workingDays,
        weekdayOffRules: settings.weekdayOffRules,
      };
      const payload = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v != null)
      );
      await api.put(`/attendance/settings?organizationId=${organizationId}`, payload);
      await updateOrganization(organizationId, {
        enableGpsValidation: settings.enableGpsValidation,
        enableWifiValidation: settings.enableWifiValidation,
      });
      toast.success("Settings saved successfully!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof AttendanceSettings, value: any) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  const workingDayOptions = [
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
    { label: "Sun", value: 0 },
  ];

  const saturdayWeekOptions = [
    { label: "1st", value: 1 },
    { label: "2nd", value: 2 },
    { label: "3rd", value: 3 },
    { label: "4th", value: 4 },
    { label: "5th", value: 5 },
  ];

  const weekdayRuleOptions = [
    { label: "Mon", value: 1 },
    { label: "Tue", value: 2 },
    { label: "Wed", value: 3 },
    { label: "Thu", value: 4 },
    { label: "Fri", value: 5 },
    { label: "Sat", value: 6 },
  ];

  const toggleWeekdayOffRule = (day: number, week: number) => {
    setSettings((prev) => {
      const rules = { ...(prev.weekdayOffRules || {}) };
      const set = new Set(rules[String(day)] || []);
      if (set.has(week)) set.delete(week);
      else set.add(week);
      rules[String(day)] = Array.from(set).sort((a, b) => a - b);
      return { ...prev, weekdayOffRules: rules };
    });
  };

  const toggleWorkingDay = (day: number) => {
    setSettings((prev) => {
      const set = new Set(prev.workingDays || []);
      if (set.has(day)) {
        if (set.size === 1) {
          toast.error("At least one working day is required.");
          return prev;
        }
        set.delete(day);
      } else {
        set.add(day);
      }
      const ordered = Array.from(set).sort((a, b) => {
        const aa = a === 0 ? 7 : a;
        const bb = b === 0 ? 7 : b;
        return aa - bb;
      });
      return { ...prev, workingDays: ordered };
    });
  };

  // WiFi CRUD handlers
  const openAddWifi = () => {
    setEditingWifi(null);
    setWifiForm(defaultWifiForm);
    setWifiDialogOpen(true);
  };

  const openEditWifi = (wifi: WifiNetwork) => {
    setEditingWifi(wifi);
    setWifiForm({
      name: wifi.name,
      ssid: wifi.ssid,
      bssid: wifi.bssid,
      locationDescription: wifi.locationDescription || "",
      latitude: wifi.latitude?.toString() || "",
      longitude: wifi.longitude?.toString() || "",
      allowedRadiusMeters: wifi.allowedRadiusMeters?.toString() || "50",
    });
    setWifiDialogOpen(true);
  };

  const handleSaveWifi = async () => {
    if (!wifiForm.name || !wifiForm.ssid || !wifiForm.bssid) {
      toast.error("Name, SSID, and BSSID are required");
      return;
    }
    setWifiSaving(true);
    try {
      const data: Record<string, any> = {
        name: wifiForm.name,
        ssid: wifiForm.ssid,
        bssid: wifiForm.bssid,
      };
      if (wifiForm.locationDescription) data.locationDescription = wifiForm.locationDescription;
      if (wifiForm.latitude) data.latitude = parseFloat(wifiForm.latitude);
      if (wifiForm.longitude) data.longitude = parseFloat(wifiForm.longitude);
      if (wifiForm.allowedRadiusMeters) data.allowedRadiusMeters = parseInt(wifiForm.allowedRadiusMeters);

      if (editingWifi) {
        await updateWifiLocation(editingWifi.id, data);
        toast.success("WiFi network updated!");
      } else {
        await createWifiLocation({ ...data, organizationId });
        toast.success("WiFi network added!");
      }
      setWifiDialogOpen(false);
      fetchWifiNetworks(organizationId);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to save WiFi network");
    } finally {
      setWifiSaving(false);
    }
  };

  const handleDeleteWifi = async (id: string) => {
    try {
      await deleteWifiLocation(id);
      toast.success("WiFi network deleted!");
      setDeleteConfirmId(null);
      fetchWifiNetworks(organizationId);
    } catch (error) {
      toast.error("Failed to delete WiFi network");
    }
  };

  const handleToggleWifiActive = async (wifi: WifiNetwork) => {
    try {
      await updateWifiLocation(wifi.id, { isActive: !wifi.isActive });
      fetchWifiNetworks(organizationId);
    } catch (error) {
      toast.error("Failed to update WiFi network");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Attendance Configuration</h1>
          <p className="text-muted-foreground">Configure office timing, location, and validation settings</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="flex items-center gap-2">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save Changes
        </Button>
      </div>

      <Tabs defaultValue="timing" className="space-y-4">
        <TabsList>
          <TabsTrigger value="timing" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Office Timing
          </TabsTrigger>
          <TabsTrigger value="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Location
          </TabsTrigger>
          <TabsTrigger value="validation" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Validation
          </TabsTrigger>
          <TabsTrigger value="wifi" className="flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            WiFi Networks
          </TabsTrigger>
          <TabsTrigger value="branches" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Branches
          </TabsTrigger>
        </TabsList>

        {/* Office Timing Tab */}
        <TabsContent value="timing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Office Timing Configuration
              </CardTitle>
              <CardDescription>
                Set working hours, grace period, and late threshold for your organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="workStartTime">Work Start Time</Label>
                  <Input
                    id="workStartTime"
                    type="time"
                    value={settings.workStartTime?.slice(0, 5) || "09:00"}
                    onChange={(e) => handleInputChange("workStartTime", e.target.value + ":00")}
                  />
                  <p className="text-xs text-muted-foreground">When the workday begins</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="workEndTime">Work End Time</Label>
                  <Input
                    id="workEndTime"
                    type="time"
                    value={settings.workEndTime?.slice(0, 5) || "18:00"}
                    onChange={(e) => handleInputChange("workEndTime", e.target.value + ":00")}
                  />
                  <p className="text-xs text-muted-foreground">When the workday ends</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="graceMinutes">Grace Minutes</Label>
                  <Input
                    id="graceMinutes"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={String(settings.graceMinutes ?? 15)}
                    onChange={(e) => {
                      const digitsOnly = sanitizeIntInput(e.target.value);
                      handleInputChange("graceMinutes", digitsOnly === "" ? 0 : parseInt(digitsOnly, 10));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Allowed late arrival in minutes</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lateThresholdMinutes">Late Threshold (minutes)</Label>
                  <Input
                    id="lateThresholdMinutes"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={String(settings.lateThresholdMinutes ?? 30)}
                    onChange={(e) => {
                      const digitsOnly = sanitizeIntInput(e.target.value);
                      handleInputChange("lateThresholdMinutes", digitsOnly === "" ? 0 : parseInt(digitsOnly, 10));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Minutes after start time to mark as late</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="halfDayCutoffTime">Half Day Cutoff Time</Label>
                  <Input
                    id="halfDayCutoffTime"
                    type="time"
                    value={settings.halfDayCutoffTime?.slice(0, 5) || "14:00"}
                    onChange={(e) => handleInputChange("halfDayCutoffTime", e.target.value + ":00")}
                  />
                  <p className="text-xs text-muted-foreground">Time after which half day is marked</p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Working Days</Label>
                  <div className="flex flex-wrap gap-4">
                    {workingDayOptions.map((day) => (
                      <label key={day.value} className="flex items-center gap-2">
                        <Checkbox
                          checked={settings.workingDays?.includes(day.value)}
                          onCheckedChange={() => toggleWorkingDay(day.value)}
                        />
                        <span className="text-sm">{day.label}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Days considered working for attendance calculations
                  </p>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Weekday Off Rules (Mon–Sat)</Label>
                  <div className="space-y-3">
                    {weekdayRuleOptions.map((day) => (
                      <div key={day.value} className="flex flex-wrap items-center gap-3">
                        <div className="w-12 text-sm font-medium text-muted-foreground">
                          {day.label}
                        </div>
                        {saturdayWeekOptions.map((week) => (
                          <label key={`${day.value}-${week.value}`} className="flex items-center gap-2">
                            <Checkbox
                              checked={
                                settings.weekdayOffRules?.[String(day.value)]?.includes(week.value) || false
                              }
                              onCheckedChange={() => toggleWeekdayOffRule(day.value, week.value)}
                              disabled={!settings.workingDays?.includes(day.value)}
                            />
                            <span className="text-sm">{week.label}</span>
                          </label>
                        ))}
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Example: select 1st and 3rd for Monday to make those Mondays off
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Location Tab */}
        <TabsContent value="location">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Primary Office Location
              </CardTitle>
              <CardDescription>
                Set the primary office coordinates for GPS-based attendance validation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">Primary Office Location</p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      This location is used for GPS attendance validation. Enable GPS validation in the Validation tab.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="officeLocationName">Location Name</Label>
                  <Input
                    id="officeLocationName"
                    placeholder="e.g., Main Office, Branch 1"
                    value={settings.officeLocationName || ""}
                    onChange={(e) => handleInputChange("officeLocationName", e.target.value)}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="officeLocationAddress">Location Address</Label>
                  <Input
                    id="officeLocationAddress"
                    placeholder="e.g., DLF Cybercity, Bhubaneswar"
                    value={settings.officeLocationAddress || ""}
                    onChange={(e) => handleInputChange("officeLocationAddress", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="officeLatitude">Latitude</Label>
                  <Input
                    id="officeLatitude"
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g., 20.3494624"
                    value={String(settings.officeLatitude ?? "")}
                    onChange={(e) => {
                      const sanitized = sanitizeFloatInput(e.target.value);
                      handleInputChange(
                        "officeLatitude",
                        sanitized === "" ? null : parseFloat(sanitized)
                      );
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="officeLongitude">Longitude</Label>
                  <Input
                    id="officeLongitude"
                    type="text"
                    inputMode="decimal"
                    placeholder="e.g., 85.8078853"
                    value={String(settings.officeLongitude ?? "")}
                    onChange={(e) => {
                      const sanitized = sanitizeFloatInput(e.target.value);
                      handleInputChange(
                        "officeLongitude",
                        sanitized === "" ? null : parseFloat(sanitized)
                      );
                    }}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="allowedRadiusMeters">Allowed Radius (meters)</Label>
                  <Input
                    id="allowedRadiusMeters"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={String(settings.allowedRadiusMeters ?? 100)}
                    onChange={(e) => {
                      const digitsOnly = sanitizeIntInput(e.target.value);
                      handleInputChange(
                        "allowedRadiusMeters",
                        digitsOnly === "" ? 0 : parseInt(digitsOnly, 10)
                      );
                    }}
                  />
                  <p className="text-xs text-muted-foreground">Maximum distance from office for valid check-in</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Validation Tab */}
        <TabsContent value="validation">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Attendance Validation Settings
              </CardTitle>
              <CardDescription>
                Configure which validation methods to use for attendance tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="enableGpsValidation" className="text-base">GPS Location Validation</Label>
                    <p className="text-sm text-muted-foreground">Validate check-in location using GPS coordinates</p>
                  </div>
                  <Switch
                    id="enableGpsValidation"
                    checked={settings.enableGpsValidation ?? true}
                    onCheckedChange={(checked) => handleInputChange("enableGpsValidation", checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="enableWifiValidation" className="text-base">WiFi Validation</Label>
                    <p className="text-sm text-muted-foreground">
                      Validate check-in using office WiFi network. Configure networks in the WiFi Networks tab.
                    </p>
                  </div>
                  <Switch
                    id="enableWifiValidation"
                    checked={settings.enableWifiValidation ?? false}
                    onCheckedChange={(checked) => handleInputChange("enableWifiValidation", checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="enableFaceValidation" className="text-base">Face Recognition</Label>
                    <p className="text-sm text-muted-foreground">Verify employee using facial recognition</p>
                  </div>
                  <Switch
                    id="enableFaceValidation"
                    checked={settings.enableFaceValidation ?? true}
                    onCheckedChange={(checked) => handleInputChange("enableFaceValidation", checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="enableCheckinValidation" className="text-base">Check-in Validation</Label>
                    <p className="text-sm text-muted-foreground">Enable validation for morning check-in</p>
                  </div>
                  <Switch
                    id="enableCheckinValidation"
                    checked={settings.enableCheckinValidation ?? true}
                    onCheckedChange={(checked) => handleInputChange("enableCheckinValidation", checked)}
                  />
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <Label htmlFor="enableCheckoutValidation" className="text-base">Check-out Validation</Label>
                    <p className="text-sm text-muted-foreground">Enable validation for evening check-out</p>
                  </div>
                  <Switch
                    id="enableCheckoutValidation"
                    checked={settings.enableCheckoutValidation ?? true}
                    onCheckedChange={(checked) => handleInputChange("enableCheckoutValidation", checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* WiFi Networks Tab */}
        <TabsContent value="wifi">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wifi className="h-5 w-5" />
                    WiFi Networks
                  </CardTitle>
                  <CardDescription>
                    Configure allowed WiFi networks for attendance validation. Employees must be connected to one of these networks to check in.
                  </CardDescription>
                </div>
                <Button onClick={openAddWifi} className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Add Network
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!settings.enableWifiValidation && (
                <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-900 dark:text-yellow-100">WiFi Validation Disabled</p>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">
                        Enable WiFi validation in the Validation tab for these networks to be used during attendance check-in.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {wifiLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : wifiNetworks.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Wifi className="h-12 w-12 mx-auto mb-3 opacity-30" />
                  <p className="text-lg font-medium">No WiFi networks configured</p>
                  <p className="text-sm mt-1">Add your office WiFi networks to enable WiFi-based attendance validation</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {wifiNetworks.map((wifi) => (
                    <div
                      key={wifi.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start gap-4 flex-1 min-w-0">
                        <div className="mt-1">
                          <Wifi className={`h-5 w-5 ${wifi.isActive ? "text-green-600" : "text-gray-400"}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium truncate">{wifi.name}</p>
                            <Badge variant={wifi.isActive ? "default" : "secondary"} className="text-xs">
                              {wifi.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                            <span>SSID: <span className="font-mono">{wifi.ssid}</span></span>
                            <span>BSSID: <span className="font-mono">{wifi.bssid}</span></span>
                            {wifi.allowedRadiusMeters && (
                              <span>Radius: {wifi.allowedRadiusMeters}m</span>
                            )}
                          </div>
                          {wifi.locationDescription && (
                            <p className="text-xs text-muted-foreground mt-1">{wifi.locationDescription}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Switch
                          checked={wifi.isActive}
                          onCheckedChange={() => handleToggleWifiActive(wifi)}
                        />
                        <Button variant="ghost" size="icon" onClick={() => openEditWifi(wifi)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteConfirmId(wifi.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branches Tab */}
        <TabsContent value="branches">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Branches & Timings
                </CardTitle>
                <CardDescription>Set per-branch working hours. Employees inherit their branch timing.</CardDescription>
              </div>
              <Button
                onClick={() => {
                  setEditingBranch(null);
                  setBranchForm(defaultBranchForm);
                  setBranchDialogOpen(true);
                }}
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Branch
              </Button>
            </CardHeader>
            <CardContent>
              {branchLoading ? (
                <div className="flex items-center justify-center py-10 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Loading branches...
                </div>
              ) : branches.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <Building2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="font-medium">No branches yet</p>
                  <p className="text-sm">Create a branch to set specific timings.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {branches.map((branch) => (
                    <div key={branch.id} className="flex items-center justify-between border rounded-lg p-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{branch.name}</span>
                          <Badge variant={branch.isActive ? "default" : "secondary"}>
                            {branch.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {branch.workStartTime.slice(0, 5)} - {branch.workEndTime.slice(0, 5)} | Grace {branch.graceMinutes}m | Late {branch.lateThresholdMinutes}m
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={() => handleBranchEdit(branch)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setBranchDeleteId(branch.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add/Edit WiFi Dialog */}
      <Dialog open={wifiDialogOpen} onOpenChange={setWifiDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingWifi ? "Edit WiFi Network" : "Add WiFi Network"}</DialogTitle>
            <DialogDescription>
              {editingWifi
                ? "Update the WiFi network details"
                : "Add a new WiFi network for attendance validation"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="wifi-name">Network Name *</Label>
              <Input
                id="wifi-name"
                placeholder="e.g., Main Office WiFi"
                value={wifiForm.name}
                onChange={(e) => setWifiForm({ ...wifiForm, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wifi-ssid">SSID (Network Name) *</Label>
                <Input
                  id="wifi-ssid"
                  placeholder="e.g., Office_5G"
                  value={wifiForm.ssid}
                  onChange={(e) => setWifiForm({ ...wifiForm, ssid: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wifi-bssid">BSSID (MAC Address) *</Label>
                <Input
                  id="wifi-bssid"
                  placeholder="e.g., AA:BB:CC:DD:EE:FF"
                  value={wifiForm.bssid}
                  onChange={(e) => setWifiForm({ ...wifiForm, bssid: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wifi-desc">Description</Label>
              <Input
                id="wifi-desc"
                placeholder="e.g., 2nd Floor Conference Room"
                value={wifiForm.locationDescription}
                onChange={(e) => setWifiForm({ ...wifiForm, locationDescription: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="wifi-lat">Latitude</Label>
                <Input
                  id="wifi-lat"
                  type="text"
                  inputMode="decimal"
                  placeholder="Optional"
                  value={wifiForm.latitude}
                  onChange={(e) =>
                    setWifiForm({
                      ...wifiForm,
                      latitude: sanitizeFloatInput(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wifi-lng">Longitude</Label>
                <Input
                  id="wifi-lng"
                  type="text"
                  inputMode="decimal"
                  placeholder="Optional"
                  value={wifiForm.longitude}
                  onChange={(e) =>
                    setWifiForm({
                      ...wifiForm,
                      longitude: sanitizeFloatInput(e.target.value),
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wifi-radius">Radius (m)</Label>
                <Input
                  id="wifi-radius"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={wifiForm.allowedRadiusMeters}
                  onChange={(e) =>
                    setWifiForm({
                      ...wifiForm,
                      allowedRadiusMeters: sanitizeIntInput(e.target.value),
                    })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWifiDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveWifi} disabled={wifiSaving}>
              {wifiSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingWifi ? "Update" : "Add Network"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete WiFi Network</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this WiFi network? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && handleDeleteWifi(deleteConfirmId)}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Dialog */}
      <Dialog open={branchDialogOpen} onOpenChange={setBranchDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingBranch ? "Edit Branch" : "Add Branch"}</DialogTitle>
            <DialogDescription>Set branch name and working hours.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="branch-name">Branch Name *</Label>
              <Input
                id="branch-name"
                value={branchForm.name}
                onChange={(e) => setBranchForm({ ...branchForm, name: e.target.value })}
                placeholder="e.g., Branch A"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch-start">Work Start *</Label>
                <Input
                  id="branch-start"
                  type="time"
                  value={branchForm.workStartTime}
                  onChange={(e) => setBranchForm({ ...branchForm, workStartTime: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-end">Work End *</Label>
                <Input
                  id="branch-end"
                  type="time"
                  value={branchForm.workEndTime}
                  onChange={(e) => setBranchForm({ ...branchForm, workEndTime: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="branch-grace">Grace Minutes</Label>
                <Input
                  id="branch-grace"
                  type="number"
                  min={0}
                  value={branchForm.graceMinutes}
                  onChange={(e) => setBranchForm({ ...branchForm, graceMinutes: sanitizeIntInput(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branch-late">Late Threshold (minutes)</Label>
                <Input
                  id="branch-late"
                  type="number"
                  min={0}
                  value={branchForm.lateThresholdMinutes}
                  onChange={(e) => setBranchForm({ ...branchForm, lateThresholdMinutes: sanitizeIntInput(e.target.value) })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <p className="font-medium">Active</p>
                <p className="text-sm text-muted-foreground">Inactive branches will be ignored for timing rules.</p>
              </div>
              <Switch
                checked={branchForm.isActive}
                onCheckedChange={(checked) => setBranchForm({ ...branchForm, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleBranchSave} disabled={branchSaving}>
              {branchSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {editingBranch ? "Update" : "Add Branch"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Branch Delete Confirmation */}
      <Dialog open={!!branchDeleteId} onOpenChange={() => setBranchDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Branch</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this branch? Employees assigned to it will fall back to default timing.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBranchDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={handleBranchDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
