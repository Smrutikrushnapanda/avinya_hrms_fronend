"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground p-6">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
        <WifiOff className="w-10 h-10 text-muted-foreground" />
      </div>
      <h1 className="text-xl font-bold text-center">You&apos;re Offline</h1>
      <p className="text-sm text-muted-foreground text-center mt-2 max-w-xs">
        Don&apos;t worry — your cached data is still available. We&apos;ll sync when you&apos;re back online.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="mt-6 flex items-center gap-2 bg-[#026D94] text-white px-6 py-3 rounded-xl font-semibold shadow-lg"
      >
        <RefreshCw className="w-4 h-4" />
        Try Again
      </button>
    </div>
  );
}
