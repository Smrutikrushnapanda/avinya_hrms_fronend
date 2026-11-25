import { useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { previewRequestEmail } from "@/app/api/api";
import type {
  ApplicationEmailFields,
  RequestEmailDraft,
  RequestEmailKind,
  RequestEmailPreview,
} from "@/types/request-email";

const emptyDraft = {
  key: "",
  scope: "",
  preview: null as RequestEmailPreview | null,
  subject: "",
  body: "",
  error: "",
  refreshed: false,
};

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
  const [revision, setRevision] = useState(0);
  const key = `${scope}:${templateId}:${revision}:${fieldsKey}`;
  const [state, setState] = useState(emptyDraft);
  const [fetchingKey, setFetchingKey] = useState("");
  const canPreview =
    enabled &&
    Boolean(userId) &&
    Boolean(
      kind === "leave"
        ? fields.leaveTypeId && fields.startDate && fields.endDate
        : fields.date,
    );

  useEffect(() => {
    if (!canPreview || !userId) {
      setState(emptyDraft);
      setFetchingKey("");
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setFetchingKey(key);
      void previewRequestEmail(
        kind,
        userId,
        {
          ...(JSON.parse(fieldsKey) as ApplicationEmailFields),
          ...(templateId ? { templateId } : {}),
        },
        controller.signal,
      )
        .then(({ data }) => {
          if (controller.signal.aborted) return;
          setState((previous) => {
            const sameTemplate =
              previous.scope === scope &&
              previous.preview?.configured &&
              data.configured &&
              previous.preview.templateId === data.templateId;
            const keepSubject =
              sameTemplate && previous.subject !== previous.preview?.subject;
            const keepBody =
              sameTemplate && previous.body !== previous.preview?.body;
            return {
              key,
              scope,
              preview: data,
              subject: keepSubject ? previous.subject : data.subject || "",
              body: keepBody ? previous.body : data.body || "",
              error: "",
              refreshed: Boolean(keepSubject || keepBody),
            };
          });
        })
        .catch((error: unknown) => {
          if (controller.signal.aborted) return;
          const message: unknown = isAxiosError(error)
            ? error.response?.data?.message
            : null;
          setState((previous) => ({
            ...previous,
            key,
            error:
              typeof message === "string"
                ? message
                : "Email preview could not be loaded. Retry before submitting.",
          }));
        });
    }, 650);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [canPreview, userId, kind, key, fieldsKey, templateId, scope]);

  const preview =
    state.scope === scope &&
    (!templateId || state.preview?.templateId === templateId)
      ? state.preview
      : null;
  const current = state.key === key;
  const error = current ? state.error : "";
  const ready =
    !canPreview ||
    (current &&
      preview !== null &&
      !error &&
      (!preview.configured ||
        Boolean(state.subject.trim() && state.body.trim())));
  const getDraft = (): RequestEmailDraft | undefined => {
    if (!ready)
      throw new Error(error || "Wait for the email preview before submitting.");
    if (!preview?.configured || !canPreview) return undefined;
    return {
      templateId: preview.templateId!,
      fingerprint: preview.fingerprint!,
      subject: state.subject,
      body: state.body,
    };
  };
  return {
    visible: canPreview,
    ready,
    loading: canPreview && !current && !preview && fetchingKey === key,
    preview,
    error,
    subject: state.subject,
    body: state.body,
    refreshed: state.refreshed,
    setSubject: (subject: string) =>
      setState((previous) => ({ ...previous, subject })),
    setBody: (body: string) => setState((previous) => ({ ...previous, body })),
    selectTemplate: (id: string) => setChoice({ scope, id }),
    retry: () => {
      if (error) setChoice({ scope, id: "" });
      setRevision((value) => value + 1);
    },
    getDraft,
  };
}

export type RequestEmailEditorState = ReturnType<typeof useRequestEmail>;
