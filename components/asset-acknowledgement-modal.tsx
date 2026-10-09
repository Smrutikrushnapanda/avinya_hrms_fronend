"use client";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { PackageCheck, Loader2, ShieldCheck } from "lucide-react";
import { getMyPendingAssets, acknowledgeAsset } from "@/app/api/api";

interface PendingAsset {
  id: string;
  assetType: string;
  assetName: string;
  assetId: string;
  serialNumber?: string | null;
  issueDate?: string | null;
}

export default function AssetAcknowledgementModal() {
  const [assets, setAssets] = useState<PendingAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [done, setDone] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getMyPendingAssets();
      const list = (res.data || []) as PendingAsset[];
      setAssets(list);
      setDone(list.length === 0);
    } catch {
      setDone(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleAcknowledge = async (assetId: string) => {
    setChecking(true);
    try {
      await acknowledgeAsset(assetId);
      const remaining = assets.filter((a) => a.id !== assetId);
      setAssets(remaining);
      if (remaining.length === 0) setDone(true);
    } catch {
      // keep modal open; user can retry
    } finally {
      setChecking(false);
    }
  };

  if (loading || done) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="asset-ack-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-primary/10 p-2.5">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 id="asset-ack-title" className="text-base font-semibold">
              Acknowledge Asset Receipt
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Please confirm that you have received the following assigned
              item(s). This confirmation is sent to your organization
              administration.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {assets.map((asset) => (
            <div
              key={asset.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-border bg-muted/40 p-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <PackageCheck className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm font-medium">
                    {asset.assetName}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted-foreground">
                  {asset.assetType}
                  {asset.assetId ? ` • ${asset.assetId}` : ""}
                  {asset.serialNumber ? ` • SN: ${asset.serialNumber}` : ""}
                </p>
              </div>
              <Button
                size="sm"
                onClick={() => handleAcknowledge(asset.id)}
                disabled={checking}
              >
                {checking && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
                Acknowledge
              </Button>
            </div>
          ))}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          You must acknowledge each assigned asset to continue.
        </p>
      </div>
    </div>
  );
}