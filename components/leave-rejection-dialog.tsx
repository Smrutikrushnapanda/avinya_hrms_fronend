"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function LeaveRejectionDialog({
  loading,
  onClose,
  onReject,
}: {
  loading: boolean;
  onClose: () => void;
  onReject: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const trimmedReason = reason.trim();

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !loading) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Leave Request</DialogTitle>
          <DialogDescription>
            Enter a reason to reject this request.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (trimmedReason && !loading) void onReject(trimmedReason);
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="leave-rejection-reason">
              Rejection reason (required)
            </Label>
            <Textarea
              id="leave-rejection-reason"
              required
              disabled={loading}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="destructive"
              loading={loading}
              disabled={!trimmedReason}
            >
              Reject
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
