"use client";

import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground px-4 py-6 sm:px-8 lg:px-12">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-3xl" />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-44 w-full rounded-3xl" />
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="space-y-3 rounded-3xl border border-border bg-background/60 p-4">
              <Skeleton className="h-6 w-28" />
              <Skeleton className="h-32 w-full rounded-2xl" />
              <div className="flex gap-2">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-10 w-20" />
                <Skeleton className="h-10 w-10" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
