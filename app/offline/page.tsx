"use client";

import NetworkErrorView from "@/components/network-error-view";

export default function OfflinePage() {
  return (
    <NetworkErrorView
      statusCode="404"
      title="Network Offline"
      description="You're currently disconnected from the internet. Your cached data is safe — reconnect or click retry to restore your session."
    />
  );
}
