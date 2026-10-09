"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Laptop, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { acknowledgeAsset, getMyPendingAssets } from "@/app/api/api";

type PendingAsset = {
  id: string;
  assetId?: string | null;
  assetType?: string;
  assetName?: string;
  serialNumber?: string | null;
  issueDate?: string | null;
  condition?: string;
};

export default function AssetAcknowledgementModal() {
  const [pending, setPending] = useState<PendingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await getMyPendingAssets();
        if (active) {
          setPending(Array.isArray(res.data) ? res.data : []);
        }
      } catch {
        if (active) setPending([]);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const handleAcknowledge = useCallback(async (assetId: string) => {
    setAcknowledgingId(assetId);
    try {
      await acknowledgeAsset(assetId);
      toast.success("Asset acknowledged. Thank you!");
      setPending((prev) => prev.filter((a) => a.id !== assetId));
    } catch {
      toast.error("Failed to acknowledge asset. Please try again.");
    } finally {
      setAcknowledgingId(null);
    }
  }, []);

  const handleAcknowledgeAll = useCallback(async () => {
    const ids = pending.map((a) => a.id);
    for (const id of ids) {
      await handleAcknowledge(id);
    }
  }, [pending, handleAcknowledge]);

  if (loading || pending.length === 0) return null;

  return (
    <Dialog open={pending.length > 0}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Laptop className="h-5 w-5 text-primary" />
            Asset Acknowledgment Required
          </DialogTitle>
          <DialogDescription>
            Please confirm receipt of the following asset(s) assigned to you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {pending.map((asset) => (
            <div
              key={asset.id}
              className="flex items-center justify-between gap-4 rounded-lg border border-border p-3"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">
                  {asset.assetName || asset.assetType || "Asset"}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {[asset.assetId, asset.serialNumber].filter(Boolean).join(" • ") ||
                    asset.assetType ||
                    "—"}
                </p>
              </div>
              <Button
                size="sm"
                className="shrink-0"
                onClick={() => handleAcknowledge(asset.id)}
                loading={acknowledgingId === asset.id}
              >
                <ShieldCheck className="h-4 w-4 mr-1" />
                Acknowledge
              </Button>
            </div>
          ))}
        </div>

        {pending.length > 1 && (
          <Button
            variant="outline"
            className="w-full"
            onClick={handleAcknowledgeAll}
            loading={acknowledgingId !== null}
          >
            {acknowledgingId !== null ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Acknowledge All
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}