"use client";

import { cn } from "@/lib/utils";

function Pulse({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700/50", className)} />
  );
}

export function MobileSkeleton() {
  return (
    <div className="space-y-4 p-4 pb-24">
      <Pulse className="h-5 w-2/3" />
      <Pulse className="h-4 w-1/3" />
      <div className="grid grid-cols-3 gap-3 pt-2">
        <Pulse className="h-28 rounded-[1.25rem]" />
        <Pulse className="h-28 rounded-[1.25rem]" />
        <Pulse className="h-28 rounded-[1.25rem]" />
      </div>
      <Pulse className="h-40 w-full rounded-[1.25rem]" />
      <div className="space-y-3 pt-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Pulse key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}

export function MobileCardSkeleton() {
  return (
    <div className="rounded-[1.25rem] border border-slate-200/50 bg-card p-5 space-y-4">
      <Pulse className="h-5 w-1/3" />
      <div className="grid grid-cols-2 gap-3">
        <Pulse className="h-20 rounded-xl" />
        <Pulse className="h-20 rounded-xl" />
      </div>
      <Pulse className="h-3 w-full" />
      <Pulse className="h-3 w-2/3" />
    </div>
  );
}
