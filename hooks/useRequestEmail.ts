import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { previewRequestEmail } from "@/app/api/api";
import type {
  ApplicationEmailFields,
  RequestEmailDraft,
  RequestEmailKind,
  RequestEmailPreview,
} from "@/types/request-email";

export function useRequestEmail(
  kind: RequestEmailKind,
  userId: string | undefined,
  fields: ApplicationEmailFields,
  enabled = true,
) {
  const scope = `${kind}:${userId || ""}:${fields.leaveTypeId || ""}`;
  const [choice, setChoice] = useState({ scope: "", id: "" });
  const templateId = choice.scope === scope ? choice.id : "";
  const fieldsKey = JSON.stringify(fields);
  const key = `${scope}:${templateId}:${fieldsKey}`;
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<{
    key: string;
    preview: RequestEmailPreview | null;
    subject: string;
    body: string;
    loading: boolean;
    error: string;
    edited: boolean;
    refreshed: boolean;
  }>({
    key: "",
    preview: null,
    subject: "",
    body: "",
    loading: false,
    error: "",
    edited: false,
    refreshed: false,
  });
  const canPreview =
    enabled &&
    Boolean(userId) &&
    Boolean(
      kind === "leave"
        ? fields.leaveTypeId && fields.startDate && fields.endDate
        : fields.date,
    );

  useEffect(() => {
    if (!canPreview || !userId) return;
    let active = true;
    setState((previous) => ({
      ...previous,
      loading: true,
      error: "",
      refreshed: previous.edited && previous.key !== key,
    }));
    const timer = setTimeout(() => {
      void previewRequestEmail(kind, userId, {
        ...(JSON.parse(fieldsKey) as ApplicationEmailFields),
        ...(templateId ? { templateId } : {}),
      })
        .then(({ data }) => {
          if (!active) return;
          setState((previous) => ({
            key,
            preview: data,
            subject: data.subject || "",
            body: data.body || "",
            loading: false,
            error: "",
            edited: false,
            refreshed: previous.refreshed,
          }));
        })
        .catch((error: unknown) => {
          if (!active) return;
          const message: unknown = isAxiosError(error)
            ? error.response?.data?.message
            : null;
          setState((previous) => ({
            ...previous,
            key,
            loading: false,
            preview: null,
            error:
              typeof message === "string"
                ? message
                : "Email preview could not be loaded. Retry before submitting.",
          }));
        });
    }, 300);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [canPreview, userId, kind, key, fieldsKey, templateId, revision]);

  const ready =
    !canPreview ||
    (state.key === key &&
      state.preview !== null &&
      !state.loading &&
      !state.error &&
      (!state.preview.configured ||
        Boolean(state.subject.trim() && state.body.trim())));
  const getDraft = (): RequestEmailDraft | undefined => {
    if (!ready)
      throw new Error(
        state.error || "Wait for the email preview before submitting.",
      );
    if (!state.preview?.configured || !canPreview) return undefined;
    return {
      templateId: state.preview.templateId!,
      fingerprint: state.preview.fingerprint!,
      subject: state.subject,
      body: state.body,
    };
  };
  return {
    visible: canPreview,
    ready,
    loading: canPreview && (state.loading || state.key !== key),
    preview: state.preview,
    error: state.error,
    subject: state.subject,
    body: state.body,
    refreshed: state.refreshed,
    setSubject: (subject: string) =>
      setState((previous) => ({ ...previous, subject, edited: true })),
    setBody: (body: string) =>
      setState((previous) => ({ ...previous, body, edited: true })),
    selectTemplate: (id: string) => setChoice({ scope, id }),
    retry: () => {
      setChoice({ scope, id: "" });
      setRevision((value) => value + 1);
    },
    getDraft,
  };
}

export type RequestEmailEditorState = ReturnType<typeof useRequestEmail>;
