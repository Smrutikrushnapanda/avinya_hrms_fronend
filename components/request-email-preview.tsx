"use client";

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
import type { RequestEmailEditorState } from "@/hooks/useRequestEmail";
import { useId } from "react";

export function RequestEmailPreview({
  email,
  disabled = false,
}: {
  email: RequestEmailEditorState;
  disabled?: boolean;
}) {
  const id = useId();
  if (!email.visible) return null;
  return (
    <section
      className="space-y-3 rounded-lg border p-4"
      aria-label="Application email preview"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Email preview</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || email.loading}
          onClick={email.retry}
        >
          Refresh preview
        </Button>
      </div>
      {email.error && (
        <div role="alert" className="space-y-2 text-sm text-destructive">
          <p>{email.error}</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={email.retry}
          >
            Retry preview
          </Button>
        </div>
      )}
      {email.loading && (
        <p role="status" className="text-sm text-muted-foreground">
          Preparing email preview...
        </p>
      )}
      {!email.error && email.preview && !email.preview.configured && (
        <p className="text-sm text-muted-foreground">
          No application email is configured. Your request can still be
          submitted.
        </p>
      )}
      {email.preview?.configured && (
        <>
          {email.refreshed && (
            <p role="status" className="text-sm text-amber-700">
              Preview updated. Review your edits before submitting.
            </p>
          )}
          {email.preview.templates.length > 1 && (
            <div className="space-y-1">
              <Label htmlFor={`${id}-template`}>Template</Label>
              <Select
                value={email.preview.templateId}
                onValueChange={email.selectTemplate}
                disabled={disabled}
              >
                <SelectTrigger id={`${id}-template`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {email.preview.templates.map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <p className="break-words text-sm text-muted-foreground">
            To: {email.preview.recipients?.join(", ")}
          </p>
          <div className="space-y-1">
            <Label htmlFor={`${id}-subject`}>Email subject</Label>
            <Input
              id={`${id}-subject`}
              value={email.subject}
              onChange={(event) => email.setSubject(event.target.value)}
              disabled={disabled}
              maxLength={200}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-body`}>Email body</Label>
            <Textarea
              id={`${id}-body`}
              value={email.body}
              onChange={(event) => email.setBody(event.target.value)}
              disabled={disabled}
              maxLength={20000}
              rows={7}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Review or edit this email. It will be queued for the recipients
            above after your request is submitted.
          </p>
        </>
      )}
    </section>
  );
}
