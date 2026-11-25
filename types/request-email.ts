export type RequestEmailKind = "leave" | "wfh";
export type ApplicationEmailFields = {
  leaveTypeId?: string;
  startDate?: string;
  date?: string;
  endDate?: string;
  duration?: number;
  reason?: string;
};
export type RequestEmailDraft = {
  templateId: string;
  subject: string;
  body: string;
  fingerprint: string;
};
export type RequestEmailPreview = {
  configured: boolean;
  templates: { id: string; name: string; isDefault: boolean }[];
  templateId?: string;
  recipients?: string[];
  subject?: string;
  body?: string;
  fingerprint?: string;
};
export type RequestEmailTemplate = {
  id: string;
  name: string;
  kind: RequestEmailKind;
  leaveTypeId: string | null;
  recipients: string[];
  subjectTemplate: string;
  bodyTemplate: string;
  enabled: boolean;
  isDefault: boolean;
  version: number;
};
export type SaveRequestEmailTemplate = Omit<
  RequestEmailTemplate,
  "id" | "kind" | "version" | "leaveTypeId"
> & { leaveTypeId?: string; version?: number };
export type RequestEmailDelivery = {
  id: string;
  requestId: string;
  employeeName: string;
  recipients?: string[];
  subject?: string;
  status: "pending" | "sending" | "sent" | "failed";
  attempts: number;
  lastError: string | null;
  createdAt: string;
  sentAt: string | null;
};

export type RequestEmailDeliveryDetail = Pick<
  RequestEmailDelivery,
  "status" | "sentAt"
> & {
  recipients: string[];
  subject: string;
  body: string;
};
