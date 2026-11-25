"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import {
  CheckCircle2,
  Clock,
  Eye,
  Mail,
  Plus,
  RotateCcw,
  Send,
  UserPlus,
  X,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import {
  deleteRequestEmailTemplate,
  getEmployees,
  getOrganization,
  getProfile,
  getRequestEmailConfiguration,
  getRequestEmailDeliveries,
  retryRequestEmailDelivery,
  saveRequestEmailTemplate,
  sendTestRequestEmail,
} from "@/app/api/api";
import type {
  RequestEmailDelivery,
  RequestEmailKind,
  RequestEmailTemplate,
} from "@/types/request-email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RequestEmailDeliveryDetails } from "@/components/request-email-delivery-details";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFullName } from "@/lib/utils";
import {
  DEFAULT_BUSINESS_TIMEZONE,
  formatInTimezone,
  isValidTimezone,
} from "@/utils/timezone";

const ALL_LEAVE_TYPES = "__ALL__";
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PLACEHOLDER_LABELS: Record<string, string> = {
  employee_name: "Employee Name",
  employee_code: "Employee Code",
  employee_email: "Employee Email",
  department: "Department",
  designation: "Designation",
  leave_type: "Leave Type",
  request_type: "Request Type",
  start_date: "Start Date",
  end_date: "End Date",
  duration: "Days (number)",
  total_days: "Total Days",
  reason: "Reason",
  organization_name: "Company Name",
  application_date: "Applied Date",
  manager_name: "Manager Name",
};

const DEFAULT_SUBJECT = "{{request_type}} request — {{employee_name}}";
const DEFAULT_BODY: Record<RequestEmailKind, string> = {
  leave: `Dear Sir/Madam,

I would like to request {{leave_type}} for {{total_days}} from {{start_date}} to {{end_date}} due to {{reason}}.

Kindly consider my request and grant me leave for the mentioned period.

Thank you for your understanding.

Best regards,
{{employee_name}}
{{designation}}
{{department}}`,
  wfh: `Dear Sir/Madam,

I would like to request work from home for {{total_days}} from {{start_date}} to {{end_date}} due to {{reason}}.

I will ensure that all my assigned tasks are completed on time and remain available during working hours for any communication or meetings.

Kindly consider and approve my work-from-home request for the mentioned period.

Thank you for your understanding.

Best regards,
{{employee_name}}
{{designation}}
{{department}}`,
};

const blankForm = (kind: RequestEmailKind, defaultLeaveTypeId: string) => ({
  name: kind === "leave" ? "Leave Application Email" : "WFH Application Email",
  leaveTypeId: defaultLeaveTypeId,
  recipients: "",
  subjectTemplate: DEFAULT_SUBJECT,
  bodyTemplate: DEFAULT_BODY[kind],
  enabled: true,
  isDefault: true,
});

function parseRecipientList(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[,;\n]+/)
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

function renderSampleTemplate(
  template: string,
  context: Record<string, string>,
): string {
  return template.replace(
    /{{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*}}/g,
    (_match, key: string) => {
      const normalized = key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
      return context[normalized] ?? "Not specified";
    },
  );
}

function errorMessage(error: unknown, fallback = "Something went wrong. Please try again.") {
  const message: unknown = isAxiosError(error)
    ? error.response?.data?.message
    : error instanceof Error
      ? error.message
      : null;
  return typeof message === "string"
    ? message
    : Array.isArray(message)
      ? message.join(". ")
      : fallback;
}

interface TeamRecipientOption {
  id: string;
  label: string;
  email: string;
}

export function RequestEmailConfiguration({
  kind,
  leaveTypes = [],
}: {
  kind: RequestEmailKind;
  leaveTypes?: { id: string; name: string }[];
}) {
  const [templates, setTemplates] = useState<RequestEmailTemplate[]>([]);
  const [placeholders, setPlaceholders] = useState<string[]>([]);
  const [deliveries, setDeliveries] = useState<RequestEmailDelivery[]>([]);
  const [viewedDelivery, setViewedDelivery] = useState<RequestEmailDelivery | null>(null);
  const [editing, setEditing] = useState<RequestEmailTemplate | null>(null);
  const [form, setForm] = useState(() =>
    blankForm(kind, kind === "leave" ? ALL_LEAVE_TYPES : ""),
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState("");
  const [deliveryError, setDeliveryError] = useState("");
  const [field, setField] = useState<"subjectTemplate" | "bodyTemplate">(
    "bodyTemplate",
  );
  const [teamOptions, setTeamOptions] = useState<TeamRecipientOption[]>([]);
  const [myEmail, setMyEmail] = useState("");
  const [myName, setMyName] = useState("");
  const [hrEmail, setHrEmail] = useState("");
  const [orgName, setOrgName] = useState("");
  const [timezone, setTimezone] = useState(DEFAULT_BUSINESS_TIMEZONE);
  const [teamPickerKey, setTeamPickerKey] = useState(0);

  const subjectRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const requestRef = useRef(0);
  const bulkSaved = useRef(new Map<string, RequestEmailTemplate>());
  const selectionKey = `request-email-template:${kind}`;

  const openTemplate = useCallback((template: RequestEmailTemplate | null) => {
    bulkSaved.current.clear();
    setEditing(template);
    setForm(template ? {
      name: template.name,
      leaveTypeId: template.leaveTypeId || "",
      recipients: template.recipients.join(", "),
      subjectTemplate: template.subjectTemplate,
      bodyTemplate: template.bodyTemplate,
      enabled: template.enabled,
      isDefault: template.isDefault,
    } : blankForm(kind, kind === "leave" ? ALL_LEAVE_TYPES : ""));
    try {
      if (template) sessionStorage.setItem(selectionKey, template.id);
      else sessionStorage.removeItem(selectionKey);
    } catch {
      // The server still holds all saved templates when browser storage is unavailable.
    }
  }, [kind, selectionKey]);

  useEffect(() => {
    let active = true;
    const loadContext = async () => {
      try {
        const profileRes = await getProfile();
        if (!active) return;
        const p = profileRes.data || {};
        if (p.organizationTimezone && isValidTimezone(p.organizationTimezone)) {
          setTimezone(p.organizationTimezone);
        }
        const userEmail = (p.email || p.employee?.workEmail || "").trim().toLowerCase();
        const fullName = getFullName(p) || p.userName || "";
        if (userEmail) setMyEmail(userEmail);
        if (fullName) setMyName(fullName);

        const orgId = p.organizationId;
        if (!orgId) return;

        const [orgRes, empRes] = await Promise.allSettled([
          getOrganization(orgId),
          getEmployees(orgId),
        ]);
        if (!active) return;

        if (orgRes.status === "fulfilled") {
          const org = orgRes.value.data || {};
          if (org.organizationName) setOrgName(org.organizationName);
          const orgMail = (org.hrMail || org.email || "").trim().toLowerCase();
          if (orgMail && EMAIL_PATTERN.test(orgMail)) setHrEmail(orgMail);
        }

        if (empRes.status === "fulfilled") {
          const list = Array.isArray(empRes.value.data)
            ? empRes.value.data
            : empRes.value.data?.data || [];
          const seen = new Set<string>();
          const options: TeamRecipientOption[] = [];
          for (const emp of list) {
            const addr = (emp.workEmail || emp.user?.email || emp.personalEmail || "")
              .trim()
              .toLowerCase();
            if (!addr || !EMAIL_PATTERN.test(addr) || seen.has(addr)) continue;
            seen.add(addr);
            const name = getFullName(emp) || emp.employeeCode || addr;
            const roleMeta = emp.designation?.name || emp.department?.name || "";
            options.push({
              id: emp.id || addr,
              email: addr,
              label: roleMeta ? `${name} (${roleMeta}) — ${addr}` : `${name} — ${addr}`,
            });
          }
          setTeamOptions(options);
        }
      } catch {
        // non-blocking helper data
      }
    };
    void loadContext();
    return () => {
      active = false;
    };
  }, []);

  const load = useCallback(async (mode: "restore" | "refresh" | "poll" = "refresh") => {
    const silent = mode === "poll";
    const request = ++requestRef.current;
    if (!silent) setLoading(true);
    const [configuration, delivery] = await Promise.allSettled([
      getRequestEmailConfiguration(kind),
      getRequestEmailDeliveries(kind),
    ]);
    if (request !== requestRef.current) return;
    if (configuration.status === "fulfilled") {
      const savedTemplates = configuration.value.data.templates;
      setTemplates(savedTemplates);
      setPlaceholders(configuration.value.data.placeholders);
      setError("");
      if (mode === "restore") {
        let selectedId: string | null = null;
        try {
          selectedId = sessionStorage.getItem(selectionKey);
        } catch {
          // Fall back to the server's default template.
        }
        const selected = savedTemplates.find((template) => template.id === selectedId)
          ?? savedTemplates.find((template) => template.isDefault && template.enabled)
          ?? savedTemplates[0];
        openTemplate(selected ?? null);
      }
    } else {
      setError(
        errorMessage(
          configuration.reason,
          "Email configuration could not be loaded. Refresh to retry.",
        ),
      );
    }
    if (delivery.status === "fulfilled") {
      setDeliveries(delivery.value.data);
      setDeliveryError("");
    } else {
      setDeliveryError(
        "Delivery status could not be loaded. Refresh to retry.",
      );
    }
    if (!silent) setLoading(false);
  }, [kind, openTemplate, selectionKey]);

  useEffect(() => {
    const requests = requestRef;
    void load("restore");
    return () => {
      ++requests.current;
    };
  }, [load]);

  const hasInFlightDeliveries = deliveries.some(
    (d) => d.status === "pending" || d.status === "sending",
  );
  useEffect(() => {
    if (!hasInFlightDeliveries || loading || saving) return;
    const timer = setInterval(() => {
      void load("poll");
    }, 4000);
    return () => clearInterval(timer);
  }, [hasInFlightDeliveries, load, loading, saving]);

  const parsedRecipients = useMemo(
    () => parseRecipientList(form.recipients),
    [form.recipients],
  );
  const invalidRecipients = useMemo(
    () => parsedRecipients.filter((addr) => !EMAIL_PATTERN.test(addr)),
    [parsedRecipients],
  );

  const addRecipientEmail = (address: string) => {
    const normalized = address.trim().toLowerCase();
    if (!normalized || !EMAIL_PATTERN.test(normalized)) return;
    setForm((prev) => ({
      ...prev,
      recipients: [...new Set([...parseRecipientList(prev.recipients), normalized])].join(", "),
    }));
  };

  const removeRecipientEmail = (address: string) => {
    setForm((prev) => ({
      ...prev,
      recipients: parseRecipientList(prev.recipients).filter((entry) => entry !== address).join(", "),
    }));
  };

  const validateDraft = () => {
    if (!form.subjectTemplate.trim() || !form.bodyTemplate.trim()) {
      toast.error("Please enter both an email subject and message body.");
      return null;
    }
    if (!parsedRecipients.length || parsedRecipients.length > 20) {
      toast.error("Please add at least 1 recipient email address (up to 20).");
      return null;
    }
    if (invalidRecipients.length > 0) {
      toast.error(`Please fix invalid email address: ${invalidRecipients[0]}`);
      return null;
    }
    return parsedRecipients;
  };

  const save = async () => {
    if (!form.name.trim()) {
      toast.error("Please enter a template name (e.g., Leave Application Email).");
      return;
    }
    if (kind === "leave" && !form.leaveTypeId) {
      toast.error("Please select which leave type this email applies to.");
      return;
    }
    const recipients = validateDraft();
    if (!recipients) return;

    setSaving(true);
    try {
      const data = {
        name: form.name.trim(),
        recipients,
        subjectTemplate: form.subjectTemplate,
        bodyTemplate: form.bodyTemplate,
        enabled: form.enabled,
        isDefault: form.enabled && form.isDefault,
      };
      if (kind === "leave" && !editing && form.leaveTypeId === ALL_LEAVE_TYPES) {
        if (!leaveTypes.length) {
          toast.error("No leave types found. Add a leave type first.");
          return;
        }
        const results = await Promise.allSettled(
          leaveTypes.map(async (lt) => {
            const previous = bulkSaved.current.get(lt.id);
            const { data: saved } = await saveRequestEmailTemplate(kind, {
              ...data,
              name:
                leaveTypes.length === 1
                  ? data.name
                  : `${data.name} - ${lt.name}`.slice(0, 100),
              leaveTypeId: lt.id,
              ...(previous ? { version: previous.version } : {}),
            }, previous?.id);
            bulkSaved.current.set(lt.id, saved);
            return saved;
          }),
        );
        const succeeded = results.filter((r) => r.status === "fulfilled").length;
        const firstRejected = results.find(
          (r): r is PromiseRejectedResult => r.status === "rejected",
        );
        if (firstRejected) {
          toast.error(
            errorMessage(
              firstRejected.reason,
              "Email configuration could not be saved. Retry to finish saving all leave types.",
            ),
          );
          if (succeeded) await load();
          return;
        }
        const firstSaved = results[0];
        if (firstSaved?.status === "fulfilled") openTemplate(firstSaved.value);
        toast.success(
          `Saved email template for ${succeeded} of ${leaveTypes.length} leave type(s).`,
        );
      } else {
        const { data: saved } = await saveRequestEmailTemplate(
          kind,
          {
            ...data,
            ...(kind === "leave" ? { leaveTypeId: form.leaveTypeId } : {}),
            ...(editing ? { version: editing.version } : {}),
          },
          editing?.id,
        );
        openTemplate(saved);
        toast.success("Email template saved");
      }
      await load();
    } catch (saveError) {
      toast.error(
        errorMessage(saveError, "Email configuration could not be saved. Retry."),
      );
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    const recipients = validateDraft();
    if (!recipients) return;
    setTesting(true);
    try {
      const leaveTypeId =
        kind === "leave" &&
        form.leaveTypeId &&
        form.leaveTypeId !== ALL_LEAVE_TYPES
          ? form.leaveTypeId
          : undefined;
      const res = await sendTestRequestEmail(kind, {
        ...(leaveTypeId ? { leaveTypeId } : {}),
        recipients,
        subjectTemplate: form.subjectTemplate,
        bodyTemplate: form.bodyTemplate,
      });
      toast.success(
        `Test email sent to ${res.data.recipients.join(", ")}. Check your inbox.`,
      );
    } catch (testError) {
      toast.error(
        errorMessage(
          testError,
          "Test email could not be sent. Verify recipients and mail settings.",
        ),
      );
    } finally {
      setTesting(false);
    }
  };

  const remove = async (template: RequestEmailTemplate) => {
    if (!window.confirm(`Delete email template "${template.name}"?`)) return;
    setSaving(true);
    try {
      await deleteRequestEmailTemplate(kind, template.id);
      const removedActiveTemplate = editing?.id === template.id;
      if (removedActiveTemplate) openTemplate(null);
      await load(removedActiveTemplate ? "restore" : "refresh");
      toast.success("Email template deleted");
    } catch (deleteError) {
      toast.error(errorMessage(deleteError));
    } finally {
      setSaving(false);
    }
  };

  const insert = (placeholder: string) => {
    const input =
      field === "subjectTemplate" ? subjectRef.current : bodyRef.current;
    const start = input?.selectionStart ?? form[field].length;
    const end = input?.selectionEnd ?? start;
    const value = `{{${placeholder}}}`;
    setForm((previous) => ({
      ...previous,
      [field]:
        previous[field].slice(0, start) + value + previous[field].slice(end),
    }));
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + value.length, start + value.length);
    });
  };

  const today = formatInTimezone(new Date(), timezone, "dd/MM/yyyy");
  const selectedLeaveTypeName =
    form.leaveTypeId === ALL_LEAVE_TYPES
      ? leaveTypes[0]?.name || "Casual Leave"
      : leaveTypes.find((lt) => lt.id === form.leaveTypeId)?.name ||
        leaveTypes[0]?.name ||
        "Casual Leave";

  const sampleContext: Record<string, string> = {
    employee_name: myName || "Alex Sharma",
    employee_code: "EMP-001",
    employee_email: myEmail || "alex@company.com",
    department: "Engineering",
    designation: "Software Engineer",
    leave_type: kind === "leave" ? selectedLeaveTypeName : "Work from Home",
    request_type: kind === "leave" ? "Leave" : "Work from Home",
    start_date: today,
    end_date: today,
    duration: "1",
    total_days: "1 day",
    reason: "Personal work",
    organization_name: orgName || "Your Company",
    application_date: today,
    manager_name: "Priya Nair",
  };
  const sampleSubject = renderSampleTemplate(
    form.subjectTemplate || "",
    sampleContext,
  );
  const sampleBody = renderSampleTemplate(form.bodyTemplate || "", sampleContext);

  const deliveryStatusBadge = (status: RequestEmailDelivery["status"]) => {
    if (status === "sent") {
      return (
        <Badge className="gap-1 bg-green-100 text-green-800 border-green-300 hover:bg-green-100">
          <CheckCircle2 className="h-3 w-3" />
          Sent
        </Badge>
      );
    }
    if (status === "failed") {
      return (
        <Badge className="gap-1 bg-red-100 text-red-800 border-red-300 hover:bg-red-100">
          <AlertCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    }
    return (
      <Badge className="gap-1 bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-100">
        <Clock className="h-3 w-3" />
        {status === "sending" ? "Sending" : "Pending"}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Existing configured templates */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-primary" />
              Email Configuration
            </CardTitle>
            <CardDescription className="mt-1">
              Automatically email HR or managers whenever an employee submits a{" "}
              {kind === "leave" ? "leave" : "work-from-home"} request.
            </CardDescription>
          </div>
          <Button
            variant="outline"
            onClick={() => void load(editing || !templates.length ? "restore" : "refresh")}
            disabled={loading || saving}
          >
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          {loading ? (
            <p role="status" className="text-sm text-muted-foreground">
              Loading email configuration...
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    {kind === "leave" && <TableHead>Leave type</TableHead>}
                    <TableHead>Recipients</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {templates.map((template) => (
                    <TableRow key={template.id}>
                      <TableCell className="font-medium">
                        {template.name}
                        {template.isDefault && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Default
                          </Badge>
                        )}
                      </TableCell>
                      {kind === "leave" && (
                        <TableCell>
                          {leaveTypes.find(
                            (type) => type.id === template.leaveTypeId,
                          )?.name || "Unavailable leave type"}
                        </TableCell>
                      )}
                      <TableCell className="max-w-xs break-words whitespace-normal text-sm">
                        {template.recipients.join(", ")}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={template.enabled ? "default" : "outline"}
                          className={
                            template.enabled
                              ? "bg-green-100 text-green-800 border-green-300 hover:bg-green-100"
                              : ""
                          }
                        >
                          {template.enabled ? "Enabled" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={saving}
                            onClick={() => openTemplate(template)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            disabled={saving}
                            onClick={() => void remove(template)}
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!templates.length && (
                    <TableRow>
                      <TableCell
                        colSpan={kind === "leave" ? 5 : 4}
                        className="text-center text-muted-foreground py-6"
                      >
                        No email templates set up yet. Use the form below to set
                        up your first automatic email in under a minute.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create / Edit form */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>
              {editing ? "Edit email template" : "Set up automatic email"}
            </CardTitle>
            <CardDescription className="mt-1">
              1. Pick {kind === "leave" ? "a leave type" : "a name"} &bull; 2.
              Choose who gets the email &bull; 3. Send a test email &amp; save.
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={saving || testing}
            onClick={() =>
              setForm((prev) => ({
                ...prev,
                subjectTemplate: DEFAULT_SUBJECT,
                bodyTemplate: DEFAULT_BODY[kind],
              }))
            }
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset to recommended text
          </Button>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {kind === "leave" && (
              <div className="space-y-1.5">
                <Label htmlFor="email-leave-type">
                  Which leave type is this email for?
                </Label>
                <Select
                  value={form.leaveTypeId}
                  onValueChange={(leaveTypeId) => {
                    const selectedName =
                      leaveTypeId === ALL_LEAVE_TYPES
                        ? "Leave Application Email"
                        : `${leaveTypes.find((t) => t.id === leaveTypeId)?.name || "Leave"} Application Email`;
                    setForm((prev) => ({
                      ...prev,
                      leaveTypeId,
                      name:
                        !editing &&
                        (!prev.name.trim() ||
                          prev.name.endsWith("Application Email"))
                          ? selectedName
                          : prev.name,
                    }));
                  }}
                  disabled={saving || loading || Boolean(error)}
                >
                  <SelectTrigger id="email-leave-type" className="w-full">
                    <SelectValue placeholder="Select leave type" />
                  </SelectTrigger>
                  <SelectContent>
                    {!editing && leaveTypes.length > 0 && (
                      <SelectItem value={ALL_LEAVE_TYPES}>
                        All Leave Types (apply to every leave type)
                      </SelectItem>
                    )}
                    {leaveTypes.map((type) => (
                      <SelectItem key={type.id} value={type.id}>
                        {type.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor={`${kind}-template-name`}>Template name</Label>
              <Input
                id={`${kind}-template-name`}
                value={form.name}
                placeholder={
                  kind === "leave"
                    ? "e.g., Leave Application Email"
                    : "e.g., WFH Request Email"
                }
                onChange={(event) =>
                  setForm({ ...form, name: event.target.value })
                }
                maxLength={100}
                disabled={saving || loading || Boolean(error)}
              />
            </div>
          </div>

          {/* Recipients */}
          <div className="space-y-2 rounded-lg border p-4 bg-muted/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label htmlFor={`${kind}-recipients`} className="text-sm font-medium">
                Who should receive this email?
              </Label>
              <div className="flex flex-wrap items-center gap-2">
                {myEmail && !parsedRecipients.includes(myEmail) && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={saving || testing || loading}
                    onClick={() => addRecipientEmail(myEmail)}
                    className="h-7 text-xs gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    Add my email ({myEmail})
                  </Button>
                )}
                {hrEmail &&
                  hrEmail !== myEmail &&
                  !parsedRecipients.includes(hrEmail) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={saving || testing || loading}
                      onClick={() => addRecipientEmail(hrEmail)}
                      className="h-7 text-xs gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      Add HR email ({hrEmail})
                    </Button>
                  )}
              </div>
            </div>

            {teamOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-muted-foreground shrink-0" />
                <Select
                  key={teamPickerKey}
                  value=""
                  onValueChange={(email) => {
                    addRecipientEmail(email);
                    setTeamPickerKey((k) => k + 1);
                  }}
                  disabled={saving || testing || loading}
                >
                  <SelectTrigger className="w-full sm:max-w-md bg-background">
                    <SelectValue placeholder="Pick a team member (HR / Manager) to add..." />
                  </SelectTrigger>
                  <SelectContent className="max-h-60 overflow-y-auto">
                    {teamOptions.map((member) => (
                      <SelectItem key={member.id} value={member.email}>
                        {member.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Textarea
              id={`${kind}-recipients`}
              value={form.recipients}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, recipients: event.target.value }))
              }
              placeholder="Type or paste email addresses (e.g., hr@company.com, manager@company.com)"
              rows={2}
              disabled={saving || testing || loading}
              className="bg-background"
            />

            {parsedRecipients.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {parsedRecipients.map((address) => {
                  const valid = EMAIL_PATTERN.test(address);
                  return (
                    <Badge
                      key={address}
                      variant={valid ? "secondary" : "destructive"}
                      className="gap-1 pr-1"
                    >
                      <span>{address}</span>
                      <button
                        type="button"
                        disabled={saving || testing || loading}
                        onClick={() => removeRecipientEmail(address)}
                        className="rounded-full p-0.5 hover:bg-black/10"
                        aria-label={`Remove ${address}`}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Add up to 20 email addresses separated by commas, semicolons, or
              new lines, or pick them from the list above.
            </p>
          </div>

          {/* Subject + Body + Live Sample Preview */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor={`${kind}-subject-template`}>
                  Subject template
                </Label>
                <Input
                  ref={subjectRef}
                  id={`${kind}-subject-template`}
                  value={form.subjectTemplate}
                  onFocus={() => setField("subjectTemplate")}
                  onChange={(event) =>
                    setForm({ ...form, subjectTemplate: event.target.value })
                  }
                  maxLength={200}
                  disabled={saving || testing}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${kind}-body-template`}>Body template</Label>
                <Textarea
                  ref={bodyRef}
                  id={`${kind}-body-template`}
                  value={form.bodyTemplate}
                  onFocus={() => setField("bodyTemplate")}
                  onChange={(event) =>
                    setForm({ ...form, bodyTemplate: event.target.value })
                  }
                  rows={10}
                  maxLength={20000}
                  disabled={saving || testing}
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Click any button to insert live details into the{" "}
                  <span className="font-medium text-foreground">
                    {field === "subjectTemplate" ? "Subject" : "Body"}
                  </span>{" "}
                  field:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {placeholders.map((placeholder) => (
                    <button
                      key={placeholder}
                      type="button"
                      onClick={() => insert(placeholder)}
                      disabled={saving || testing}
                      title={`Inserts {{${placeholder}}}`}
                      className="rounded-md border bg-background px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors"
                    >
                      + {PLACEHOLDER_LABELS[placeholder] || placeholder}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3 h-fit">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Eye className="h-4 w-4 text-primary" />
                Live Email Preview (Sample)
              </div>
              <div className="rounded-md border bg-background p-3.5 space-y-2.5 text-sm">
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">To:</span>{" "}
                  {parsedRecipients.length
                    ? parsedRecipients.join(", ")
                    : "No recipients added yet"}
                </div>
                <div className="border-t pt-2">
                  <span className="text-xs font-medium text-muted-foreground block">
                    Subject
                  </span>
                  <div className="font-medium">
                    {sampleSubject || "(Empty subject)"}
                  </div>
                </div>
                <div className="border-t pt-2">
                  <span className="text-xs font-medium text-muted-foreground block mb-1">
                    Message
                  </span>
                  <pre className="whitespace-pre-wrap font-sans text-sm text-foreground/90 leading-relaxed">
                    {sampleBody || "(Empty body)"}
                  </pre>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                When an employee submits a request, their real details and leave
                dates automatically replace the sample values above.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-6 pt-1">
            <Label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={form.enabled}
                onCheckedChange={(enabled) =>
                  setForm({
                    ...form,
                    enabled,
                    isDefault: enabled && form.isDefault,
                  })
                }
                disabled={saving || testing}
              />
              Enable automatic email
            </Label>
            <Label className="flex items-center gap-2 cursor-pointer">
              <Switch
                checked={form.isDefault}
                onCheckedChange={(isDefault) => setForm({ ...form, isDefault })}
                disabled={saving || testing || !form.enabled}
              />
              Use as default template
            </Label>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button
              disabled={saving || testing || loading || Boolean(error)}
              onClick={() => void save()}
              className="gap-2"
            >
              {saving ? "Saving..." : "Save template"}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving || testing || loading || Boolean(error)}
              onClick={() => void sendTest()}
              className="gap-2"
            >
              <Send className="h-4 w-4" />
              {testing ? "Sending test..." : "Send Test Email"}
            </Button>
            {editing && (
              <Button
                variant="ghost"
                disabled={saving || testing}
                onClick={() => openTemplate(null)}
              >
                New template
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delivery Log */}
      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Recent email deliveries</CardTitle>
            <CardDescription className="mt-1">
              Track whether submitted application emails were delivered to the
              inbox. Failed emails retry automatically or can be retried
              manually.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {deliveryError && (
            <p role="alert" className="text-sm text-destructive mb-3">
              {deliveryError}
            </p>
          )}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Sent To</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Attempts</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveries.map((delivery) => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-medium">
                      {delivery.employeeName}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {delivery.recipients?.join(", ") || "—"}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate text-xs">
                      {delivery.subject || "—"}
                    </TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {new Date(delivery.createdAt).toLocaleString("en-GB")}
                    </TableCell>
                    <TableCell>{deliveryStatusBadge(delivery.status)}</TableCell>
                    <TableCell>{delivery.attempts}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setViewedDelivery(delivery)}
                        >
                          View email
                        </Button>
                        {delivery.status === "sent" && delivery.sentAt ? (
                          <span className="text-xs text-muted-foreground">
                            Delivered {new Date(delivery.sentAt).toLocaleTimeString()}
                          </span>
                        ) : (
                          delivery.lastError && (
                            <p className="text-xs text-destructive max-w-xs break-words">
                              {delivery.lastError}
                            </p>
                          )
                        )}
                        {delivery.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={saving}
                            onClick={() => {
                              setSaving(true);
                              void retryRequestEmailDelivery(kind, delivery.id)
                                .then(() => {
                                  toast.success("Email queued for retry");
                                  return load();
                                })
                                .catch((retryError: unknown) =>
                                  toast.error(errorMessage(retryError)),
                                )
                                .finally(() => setSaving(false));
                            }}
                          >
                            Retry email
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {!deliveries.length && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center text-muted-foreground py-6"
                    >
                      No application emails queued yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={Boolean(viewedDelivery)} onOpenChange={(open) => {
        if (!open) setViewedDelivery(null);
      }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Application email</DialogTitle>
            <DialogDescription>{viewedDelivery?.employeeName}</DialogDescription>
          </DialogHeader>
          {viewedDelivery && (
            <RequestEmailDeliveryDetails
              key={viewedDelivery.requestId}
              kind={kind}
              requestId={viewedDelivery.requestId}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
