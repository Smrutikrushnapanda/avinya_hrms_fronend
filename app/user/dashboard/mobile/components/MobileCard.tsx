"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode, ComponentProps } from "react";

interface MobileCardProps extends ComponentProps<typeof motion.div> {
  glass?: boolean;
  padded?: boolean;
}

export function MobileCard({
  glass = false,
  padded = true,
  className,
  children,
  ...props
}: MobileCardProps) {
  return (
    <motion.div
      className={cn(
        "rounded-[1.25rem] border border-slate-200/50 bg-card shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)]",
        glass &&
          "bg-white/70 backdrop-blur-xl border-white/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.3)]",
        padded && "p-5",
        className,
      )}
      {...props}
    >
      {children}
    </motion.div>
  );
}

interface MobileStatCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  accent?: string;
}

export function MobileStatCard({ label, value, icon, accent }: MobileStatCardProps) {
  return (
    <MobileCard className="flex flex-col items-center gap-1.5 text-center">
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center"
        style={{ backgroundColor: accent ? `${accent}15` : "var(--primary-15, rgba(29,78,211,0.08))" }}
      >
        <div className="text-[var(--primary)]">{icon}</div>
      </div>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <span className="text-2xl font-bold tracking-tight text-foreground">{value}</span>
    </MobileCard>
  );
}

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "outline";

interface MobileBadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
}

const badgeVariants: Record<BadgeVariant, string> = {
  default: "bg-primary/10 text-primary border-primary/20",
  success: "bg-emerald-50 text-emerald-700 border-emerald-200",
  warning: "bg-amber-50 text-amber-700 border-amber-200",
  danger: "bg-rose-50 text-rose-600 border-rose-200",
  info: "bg-sky-50 text-sky-700 border-sky-200",
  outline: "bg-transparent text-muted-foreground border-border",
};

export function MobileBadge({ variant = "default", children }: MobileBadgeProps) {
  return (
    <motion.span
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 15 }}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border",
        badgeVariants[variant],
      )}
    >
      {children}
    </motion.span>
  );
}
