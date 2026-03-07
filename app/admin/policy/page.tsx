"use client";

import { useEffect, useState } from "react";
import {
  getPolicies,
  createPolicy,
  updatePolicy,
  deletePolicy,
} from "@/app/api/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  X,
  GripVertical,
  AlignLeft,
  List,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Policy {
  id: string;
  title: string;
  content: string;
  category: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

type ContentMode = "text" | "bullets";

interface PolicyForm {
  title: string;
  mode: ContentMode;
  text: string;
  bullets: string[];
  category: string;
}

const emptyForm: PolicyForm = {
  title: "",
  mode: "text",
  text: "",
  bullets: [""],
  category: "",
};

/** Detect if content is a JSON bullet array */
function isBulletContent(content: string): boolean {
  try {
    const p = JSON.parse(content);
    return Array.isArray(p);
  } catch {
    return false;
  }
}

function parseBullets(content: string): string[] {
  try {
    const p = JSON.parse(content);
    if (Array.isArray(p)) return p.map(String);
  } catch {
    // ignore
  }
  return [""];
}

/** One-line preview for the card list */
function previewContent(content: string): string {
  if (isBulletContent(content)) {
    const bullets = parseBullets(content).filter((b) => b.trim());
    return bullets.slice(0, 2).join("  •  ");
  }
  return content;
}

export default function AdminPolicyPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Policy | null>(null);
  const [form, setForm] = useState<PolicyForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchPolicies = async () => {
    try {
      const res = await getPolicies();
      setPolicies(Array.isArray(res.data) ? res.data : []);
    } catch {
      toast.error("Failed to load policies");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (policy: Policy) => {
    setEditTarget(policy);
    const isBullets = isBulletContent(policy.content);
    setForm({
      title: policy.title,
      mode: isBullets ? "bullets" : "text",
      text: isBullets ? "" : policy.content,
      bullets: isBullets ? parseBullets(policy.content) : [""],
      category: policy.category ?? "",
    });
    setDialogOpen(true);
  };

  // ── Bullet helpers ──────────────────────────────────────────────────────────

  const setBullet = (index: number, value: string) =>
    setForm((f) => {
      const bullets = [...f.bullets];
      bullets[index] = value;
      return { ...f, bullets };
    });

  const addBullet = () =>
    setForm((f) => ({ ...f, bullets: [...f.bullets, ""] }));

  const removeBullet = (index: number) =>
    setForm((f) => {
      const bullets = f.bullets.filter((_, i) => i !== index);
      return { ...f, bullets: bullets.length > 0 ? bullets : [""] };
    });

  // ── Save ────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    let content: string;
    if (form.mode === "bullets") {
      const clean = form.bullets.map((b) => b.trim()).filter(Boolean);
      if (clean.length === 0) {
        toast.error("Add at least one bullet point");
        return;
      }
      content = JSON.stringify(clean);
    } else {
      if (!form.text.trim()) {
        toast.error("Content is required");
        return;
      }
      content = form.text;
    }

    setSaving(true);
    try {
      if (editTarget) {
        await updatePolicy(editTarget.id, {
          title: form.title,
          content,
          category: form.category || undefined,
        });
        toast.success("Policy updated");
      } else {
        await createPolicy({
          title: form.title,
          content,
          category: form.category || undefined,
        });
        toast.success("Policy created");
      }
      setDialogOpen(false);
      fetchPolicies();
    } catch {
      toast.error("Failed to save policy");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this policy? It will be hidden from employees.")) return;
    try {
      await deletePolicy(id);
      toast.success("Policy deleted");
      fetchPolicies();
    } catch {
      toast.error("Failed to delete policy");
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Company Policies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage and publish policies visible to all employees.
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Policy
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-muted-foreground">
          Loading...
        </div>
      ) : policies.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-3">
          <BookOpen className="w-12 h-12 opacity-30" />
          <p className="text-sm">No policies yet. Create your first one.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {policies.map((policy) => (
            <div
              key={policy.id}
              className="border border-border rounded-xl p-4 bg-card flex items-start justify-between gap-4"
            >
              <div className="flex items-start gap-3 min-w-0">
                <FileText className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-foreground text-sm">{policy.title}</p>
                    {policy.category && (
                      <Badge variant="secondary" className="text-[10px]">
                        {policy.category}
                      </Badge>
                    )}
                    {isBulletContent(policy.content) && (
                      <Badge variant="outline" className="text-[10px] gap-1">
                        <List className="w-2.5 h-2.5" />
                        Bullets
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {previewContent(policy.content)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Updated {new Date(policy.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button size="icon" variant="ghost" onClick={() => openEdit(policy)}>
                  <Pencil className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => handleDelete(policy.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editTarget ? "Edit Policy" : "Create Policy"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Code of Conduct"
              />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. HR, IT, Finance"
              />
            </div>

            {/* ── Content mode toggle ── */}
            <div className="space-y-2">
              <Label>Content Type *</Label>
              <div className="flex rounded-lg border border-border overflow-hidden w-fit">
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, mode: "text" }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                    form.mode === "text"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                  Plain Text
                </button>
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, mode: "bullets" }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                    form.mode === "bullets"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  }`}
                >
                  <List className="w-3.5 h-3.5" />
                  Bullet Points
                </button>
              </div>
            </div>

            {/* ── Plain text ── */}
            {form.mode === "text" && (
              <div className="space-y-1">
                <Textarea
                  value={form.text}
                  onChange={(e) => setForm((f) => ({ ...f, text: e.target.value }))}
                  placeholder="Write the policy content here..."
                  rows={8}
                />
              </div>
            )}

            {/* ── Bullet point editor ── */}
            {form.mode === "bullets" && (
              <div className="space-y-2">
                <div className="space-y-2">
                  {form.bullets.map((bullet, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <GripVertical className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm text-muted-foreground w-5 text-right flex-shrink-0">
                        {i + 1}.
                      </span>
                      <Input
                        value={bullet}
                        onChange={(e) => setBullet(i, e.target.value)}
                        placeholder={`Point ${i + 1}`}
                        className="flex-1"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            setForm((f) => {
                              const bullets = [...f.bullets];
                              bullets.splice(i + 1, 0, "");
                              return { ...f, bullets };
                            });
                          }
                          if (
                            e.key === "Backspace" &&
                            bullet === "" &&
                            form.bullets.length > 1
                          ) {
                            e.preventDefault();
                            removeBullet(i);
                          }
                        }}
                      />
                      {form.bullets.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeBullet(i)}
                          className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addBullet}
                  className="flex items-center gap-1.5 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add point
                </Button>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? "Saving..." : editTarget ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
