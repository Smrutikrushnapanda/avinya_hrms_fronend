"use client";

import { useEffect } from "react";
import NetworkErrorView from "@/components/network-error-view";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime or network error
    console.error("Route error captured:", error);
  }, [error]);

  return (
    <NetworkErrorView
      statusCode="Error"
      title="Connection Interrupted"
      description={
        error?.message?.includes("fetch") || error?.message?.includes("Network")
          ? "A network communication error interrupted the operation. Please retry."
          : "An unexpected error occurred while loading this page. Click retry to attempt recovery."
      }
      onRetry={reset}
    />
  );
}
