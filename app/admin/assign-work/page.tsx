"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "next/navigation";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Plus } from "lucide-react";

type TabKey = "all" | "assigned-by-me" | "assigned-to-me";

export default function AssignWorkPage() {
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState({
    projectValue: "",
    otherProjectName: "",
    assignedToUserIds: [] as string[],
    employeeSearch: "",
    title: "",
    description: "",
    dueDate: "",
    priority: "medium",
    imageUrl: "",
  });

  const openComposer = () => {
    setForm({
      projectValue: "",
      otherProjectName: "",
      assignedToUserIds: [],
      employeeSearch: "",
      title: "",
      description: "",
      dueDate: "",
      priority: "medium",
      imageUrl: "",
    });
    setComposerOpen(true);
  };

  const [activeTab, setActiveTab] = useState<TabKey>("all");
  const [search, setSearch] = useState("");

  const [options, setOptions] = useState<AssignWorkOptions | null>(null);
  const [allAssignments, setAllAssignments] = useState<WorkAssignment[]>([]);
  const [assignedToMe, setAssignedToMe] = useState<WorkAssignment[]>([]);
  const [assignedByMe, setAssignedByMe] = useState<WorkAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [optionsRes, allRes, mineRes, byMeRes] = await Promise.all([
          getAssignWorkOptions(),
          getAllAssignments(),
          getMyAssignments(),
          getAssignmentsByMe(),
        ]);
        setOptions(optionsRes.data);
        setAll(allRes.data || []);
        setAssignedToMe(mineRes.data || []);
        setAssignedByMe(byMeRes.data || []);
      } catch {
      }
    };
    void load();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <ListTodo className="h-5 w-5" />
            Assign Work
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Assign work to employees, track progress and review what they completed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void load()}>            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
          <Button size="sm" onClick={openComposer}>            <Plus className="h-4 w-4 mr-1" />
            Assign New Work
          </Button>
          </div>
        </div>
      <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">Loading assignments...</div>
    </div>
  );
}
