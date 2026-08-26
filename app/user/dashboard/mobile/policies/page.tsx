"use client";

import { useEffect, useState } from "react";
import { getPolicies } from "@/app/api/api";
import { toast } from "sonner";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  BookOpen,
  Tag,
  CalendarDays,
  Hash,
} from "lucide-react";
import MobileTabHeader from "../components/MobileTabHeader";
import { motion, AnimatePresence } from "framer-motion";

interface Policy {
  id: string;
  title: string;
  content: string;
  category: string | null;
  updatedAt: string;
}

function parseBullets(content: string): string[] | null {
  try {
    const p = JSON.parse(content);
    if (Array.isArray(p)) return p.map(String).filter((s) => s.trim());
  } catch {}
  return null;
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  General:   { bg: "bg-blue-50 dark:bg-blue-950/30",   text: "text-blue-700 dark:text-blue-300",   border: "border-blue-200 dark:border-blue-800" },
  HR:        { bg: "bg-violet-50 dark:bg-violet-950/30", text: "text-violet-700 dark:text-violet-300", border: "border-violet-200 dark:border-violet-800" },
  Finance:   { bg: "bg-emerald-50 dark:bg-emerald-950/30", text: "text-emerald-700 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-800" },
  IT:        { bg: "bg-sky-50 dark:bg-sky-950/30",     text: "text-sky-700 dark:text-sky-300",     border: "border-sky-200 dark:border-sky-800" },
  Legal:     { bg: "bg-amber-50 dark:bg-amber-950/30", text: "text-amber-700 dark:text-amber-300", border: "border-amber-200 dark:border-amber-800" },
  Operations:{ bg: "bg-rose-50 dark:bg-rose-950/30",   text: "text-rose-700 dark:text-rose-300",   border: "border-rose-200 dark:border-rose-800" },
};

function getCategoryStyle(cat: string) {
  return CATEGORY_COLORS[cat] ?? { bg: "bg-primary/10", text: "text-primary", border: "border-primary/20" };
}

function PolicyContent({ content }: { content: string }) {
  const bullets = parseBullets(content);
  if (bullets) {
    return (
      <ol className="space-y-2.5 mt-1">
        {bullets.map((point, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span className="leading-relaxed">{point}</span>
          </li>
        ))}
      </ol>
    );
  }
  return (
    <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
      {content}
    </p>
  );
}

function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-muted rounded-full w-3/4" />
          <div className="h-2.5 bg-muted rounded-full w-1/3" />
        </div>
      </div>
    </div>
  );
}

export default function MobilePoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    getPolicies()
      .then((res) => setPolicies(Array.isArray(res.data) ? res.data : []))
      .catch(() => toast.error("Failed to load company policies"))
      .finally(() => setLoading(false));
  }, []);

  const grouped = policies.reduce<Record<string, Policy[]>>((acc, p) => {
    const cat = p.category ?? "General";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const totalPolicies = policies.length;
  const totalCategories = Object.keys(grouped).length;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileTabHeader
        title="Policies"
        backHref="/user/dashboard/mobile/services"
        showBackLabel
        backLabel="Services"
        showBell={false}
      />

      <div className="px-4 pb-28 space-y-5 mt-4">
        {/* Stats banner */}
        <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Company Policies</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Workplace rules &amp; internal guidelines
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Hash className="w-3 h-3" />
              <span className="font-semibold text-foreground">{totalPolicies}</span>
              <span>policies</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Tag className="w-3 h-3" />
              <span className="font-semibold text-foreground">{totalCategories}</span>
              <span>categories</span>
            </div>
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty */}
        {!loading && policies.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <BookOpen className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">No policies yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Company policies will appear here once published.
              </p>
            </div>
          </div>
        )}

        {/* Policy groups */}
        {!loading &&
          Object.entries(grouped).map(([category, items]) => {
            const style = getCategoryStyle(category);
            return (
              <div key={category} className="space-y-2.5">
                {/* Category header */}
                <div className="flex items-center gap-2 px-1">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${style.bg} ${style.text} ${style.border}`}
                  >
                    <Tag className="w-3 h-3" />
                    {category}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {items.length} {items.length === 1 ? "policy" : "policies"}
                  </span>
                </div>

                {/* Policy cards */}
                {items.map((policy, idx) => {
                  const isOpen = expanded === policy.id;
                  return (
                    <motion.div
                      key={policy.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.04 }}
                      className={`rounded-2xl border bg-card overflow-hidden transition-shadow ${
                        isOpen
                          ? "border-primary/30 shadow-md shadow-primary/5"
                          : "border-border shadow-sm"
                      }`}
                    >
                      {/* Header row */}
                      <button
                        className="w-full flex items-center gap-3 px-4 py-3.5 text-left"
                        onClick={() =>
                          setExpanded((prev) => (prev === policy.id ? null : policy.id))
                        }
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${style.bg}`}
                        >
                          <FileText className={`w-4 h-4 ${style.text}`} />
                        </div>
                        <span className="flex-1 text-sm font-semibold text-foreground leading-snug">
                          {policy.title}
                        </span>
                        <motion.div
                          animate={{ rotate: isOpen ? 180 : 0 }}
                          transition={{ type: "spring", stiffness: 200, damping: 20 }}
                          className="flex-shrink-0"
                        >
                          <ChevronDown className="w-4 h-4 text-muted-foreground" />
                        </motion.div>
                      </button>

                      {/* Expanded body */}
                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            key="body"
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 200, damping: 25 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pt-1 border-t border-border space-y-3">
                              <PolicyContent content={policy.content} />
                              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground pt-1">
                                <CalendarDays className="w-3 h-3" />
                                <span>
                                  Updated{" "}
                                  {new Date(policy.updatedAt).toLocaleDateString("en-US", {
                                    year: "numeric",
                                    month: "short",
                                    day: "numeric",
                                  })}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            );
          })}
      </div>
    </div>
  );
}
