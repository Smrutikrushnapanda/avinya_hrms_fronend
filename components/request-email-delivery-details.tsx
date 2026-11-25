"use client";

import { useEffect, useState } from "react";
import { getRequestEmailDeliveryForRequest } from "@/app/api/api";
import { Button } from "@/components/ui/button";
import type { RequestEmailDeliveryDetail, RequestEmailKind } from "@/types/request-email";

const statusLabels: Record<RequestEmailDeliveryDetail["status"], string> = {
  pending: "Queued",
  sending: "Sending",
  sent: "Sent",
  failed: "Failed",
};

export function RequestEmailDeliveryDetails({
  kind,
  requestId,
}: {
  kind: RequestEmailKind;
  requestId: string;
}) {
  const [delivery, setDelivery] = useState<RequestEmailDeliveryDetail | null>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void getRequestEmailDeliveryForRequest(kind, requestId, controller.signal)
      .then(({ data }) => {
        if (!controller.signal.aborted) setDelivery(data.delivery);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, [attempt, kind, requestId]);

  if (failed) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <p role="alert" className="text-sm text-destructive">
          Could not load the application email.
        </p>
        <Button size="sm" variant="outline" onClick={() => {
          setFailed(false);
          setAttempt((value) => value + 1);
        }}>
          Retry
        </Button>
      </div>
    );
  }
  if (delivery === undefined) {
    return <p role="status" className="text-sm text-muted-foreground">Loading email…</p>;
  }
  if (delivery === null) {
    return <p className="text-sm text-muted-foreground">No email was recorded for this request.</p>;
  }

  return (
    <div className="min-w-0 space-y-3 rounded-md border p-3 text-sm">
      <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-1.5">
        <dt className="text-muted-foreground">Status</dt>
        <dd>
          {statusLabels[delivery.status]}
          {delivery.sentAt && ` · ${new Date(delivery.sentAt).toLocaleString()}`}
        </dd>
        <dt className="text-muted-foreground">To</dt>
        <dd className="break-words">{delivery.recipients.join(", ")}</dd>
        <dt className="text-muted-foreground">Subject</dt>
        <dd className="break-words font-medium">{delivery.subject}</dd>
      </dl>
      <p className="whitespace-pre-wrap break-words border-t pt-3">{delivery.body}</p>
    </div>
  );
}
