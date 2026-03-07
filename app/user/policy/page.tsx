"use client";

import { useEffect, useState } from "react";
import { getPolicies } from "@/app/api/api";
import { toast } from "sonner";
import { FileText, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Policy {
  id: string;
  title: string;
  content: string;
  category: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Returns parsed bullet array if content is a JSON array, otherwise null */
function parseBullets(content: string): string[] | null {
  try {
    const p = JSON.parse(content);
    if (Array.isArray(p)) return p.map(String).filter((s) => s.trim());
  } catch {
    // plain text
  }
  return null;
}

function PolicyContent({ content }: { content: string }) {
  const bullets = parseBullets(content);

  if (bullets) {
    return (
      <ol className="space-y-2 mt-1">
        {bullets.map((point, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-foreground/80">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center mt-0.5">
              {i + 1}
            </span>
            <span className="leading-relaxed">{point}</span>
          </li>
        ))}
      </ol>
    );
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-foreground/80 whitespace-pre-wrap text-sm leading-relaxed">
      {content}
    </div>
  );
}

export default function PolicyPage() {
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

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-48 text-muted-foreground">
        Loading policies...
      </div>
    );
  }

  if (policies.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
        <BookOpen className="w-12 h-12 opacity-30" />
        <p className="text-sm">No company policies have been published yet.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Company Policy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Read and understand the policies that guide our workplace.
        </p>
      </div>

      {Object.entries(grouped).map(([category, items]) => (
        <div key={category} className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {category}
          </h2>
          {items.map((policy) => (
            <div
              key={policy.id}
              className="border border-border rounded-xl overflow-hidden bg-card"
            >
              <button
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
                onClick={() => setExpanded((prev) => (prev === policy.id ? null : policy.id))}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground text-left">
                    {policy.title}
                  </span>
                  {policy.category && (
                    <Badge variant="secondary" className="text-[10px] hidden sm:flex">
                      {policy.category}
                    </Badge>
                  )}
                </div>
                {expanded === policy.id ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                )}
              </button>
              {expanded === policy.id && (
                <div className="px-4 pb-4 pt-3 border-t border-border">
                  <PolicyContent content={policy.content} />
                  <p className="text-[11px] text-muted-foreground mt-3">
                    Last updated:{" "}
                    {new Date(policy.updatedAt).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
