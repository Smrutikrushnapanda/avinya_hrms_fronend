"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getPerformanceSettings,
  togglePerformanceEnabled,
  updatePerformanceSettings,
  getPerformanceQuestions,
  createPerformanceQuestion,
  deletePerformanceQuestion,
  getAllReviewsAggregated,
} from "@/app/api/api";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import { ColumnDef } from "@tanstack/react-table";
import {
  Plus,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Star,
  ChevronDown,
  ChevronUp,
  Download,
  ShieldCheck,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  question: string;
  orderIndex: number;
}

interface AggregatedEmployee {
  employeeId: string;
  userId: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  selfReview: {
    rating: number | null;
    remark: string | null;
    answers: { questionId: string; question: string; answer: string }[];
    submittedAt: string;
  } | null;
  managerReview: {
    rating: number | null;
    remark: string | null;
    reviewerEmail: string | null;
    submittedAt: string;
  } | null;
  hrReview: {
    rating: number | null;
    remark: string | null;
    reviewerEmail: string | null;
    submittedAt: string;
  } | null;
  overallRating: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function RatingCell({ rating }: { rating: number | null | undefined }) {
  if (rating == null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-600">
      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
      {rating}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPerformancePage() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [requireHrApproval, setRequireHrApproval] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [aggregated, setAggregated] = useState<AggregatedEmployee[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [addingQ, setAddingQ] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [togglingHr, setTogglingHr] = useState(false);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // Table state for DataTable
  const [tableState, setTableState] = useState({
    page: 0,
    pageSize: 10,
    search: "",
    sorting: [] as any,
  });

  const fetchAll = async () => {
    try {
      const [sRes, qRes, aRes] = await Promise.all([
        getPerformanceSettings(),
        getPerformanceQuestions(),
        getAllReviewsAggregated(),
      ]);
      setIsEnabled(sRes.data?.isEnabled ?? false);
      setRequireHrApproval(sRes.data?.requireHrApproval ?? false);
      setQuestions(Array.isArray(qRes.data) ? qRes.data : []);
      setAggregated(Array.isArray(aRes.data) ? aRes.data : []);
    } catch {
      toast.error("Failed to load performance data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleToggleEnabled = async () => {
    setToggling(true);
    try {
      const res = await togglePerformanceEnabled();
      setIsEnabled(res.data?.isEnabled ?? !isEnabled);
      toast.success(res.data?.isEnabled ? "Performance monitor enabled" : "Performance monitor disabled");
    } catch {
      toast.error("Failed to toggle");
    } finally {
      setToggling(false);
    }
  };

  const handleToggleHrApproval = async () => {
    setTogglingHr(true);
    try {
      const newVal = !requireHrApproval;
      await updatePerformanceSettings({ requireHrApproval: newVal });
      setRequireHrApproval(newVal);
      toast.success(newVal ? "HR approval required for overall rating" : "HR approval not required");
    } catch {
      toast.error("Failed to update HR approval setting");
    } finally {
      setTogglingHr(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.trim()) return;
    setAddingQ(true);
    try {
      const res = await createPerformanceQuestion({
        question: newQuestion.trim(),
        orderIndex: questions.length,
      });
      setQuestions((prev) => [...prev, res.data]);
      setNewQuestion("");
      toast.success("Question added");
    } catch {
      toast.error("Failed to add question");
    } finally {
      setAddingQ(false);
    }
  };

  const handleDeleteQuestion = async (id: string) => {
    if (!confirm("Delete this question?")) return;
    try {
      await deletePerformanceQuestion(id);
      setQuestions((prev) => prev.filter((q) => q.id !== id));
      toast.success("Question deleted");
    } catch {
      toast.error("Failed to delete question");
    }
  };

  const handleDownloadExcel = () => {
    if (aggregated.length === 0) {
      toast.error("No data to download");
      return;
    }
    const rows = aggregated.map((emp) => ({
      "Employee": `${emp.firstName} ${emp.lastName}`,
      "Email": emp.workEmail,
      "Self Rating (/10)": emp.selfReview?.rating ?? "",
      "Self Remark": emp.selfReview?.remark ?? "",
      "Manager Rating (/10)": emp.managerReview?.rating ?? "",
      "Manager Remark": emp.managerReview?.remark ?? "",
      "Manager Reviewer": emp.managerReview?.reviewerEmail ?? "",
      "HR Rating (/10)": emp.hrReview?.rating ?? "",
      "HR Remark": emp.hrReview?.remark ?? "",
      "HR Reviewer": emp.hrReview?.reviewerEmail ?? "",
      "Overall Rating (/10)": emp.overallRating ?? "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const colWidths = [
      { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 30 },
      { wch: 15 }, { wch: 30 }, { wch: 30 },
      { wch: 15 }, { wch: 30 }, { wch: 30 }, { wch: 15 },
    ];
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Performance Reviews");
    XLSX.writeFile(wb, "performance_reviews.xlsx");
    toast.success("Downloaded performance_reviews.xlsx");
  };

  // Filter data based on search
  const filteredData = useMemo(() => {
    const q = tableState.search.toLowerCase().trim();
    if (!q) return aggregated;
    return aggregated.filter((emp) => {
      return (
        emp.firstName.toLowerCase().includes(q) ||
        emp.lastName.toLowerCase().includes(q) ||
        emp.workEmail.toLowerCase().includes(q)
      );
    });
  }, [aggregated, tableState.search]);

  // Paginate data
  const paginatedData = useMemo(() => {
    const start = tableState.page * tableState.pageSize;
    return filteredData.slice(start, start + tableState.pageSize);
  }, [filteredData, tableState.page, tableState.pageSize]);

  const pageCount = Math.max(1, Math.ceil(filteredData.length / tableState.pageSize));

  // Column definitions
  const columns = useMemo<ColumnDef<AggregatedEmployee>[]>(() => {
    return [
      {
        accessorKey: "employee",
        header: "Employee",
        cell: ({ row }) => {
          const emp = row.original;
          const isExpanded = expandedRow === emp.userId;
          return (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {emp.firstName[0]}{emp.lastName?.[0] ?? ""}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {emp.firstName} {emp.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{emp.workEmail}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedRow((p) => (p === emp.userId ? null : emp.userId));
                }}
                className="ml-auto p-1 hover:bg-accent rounded"
              >
                {isExpanded ? (
                  <ChevronUp className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                )}
              </button>
            </div>
          );
        },
      },
      {
        accessorKey: "selfReview",
        header: "Self",
        cell: ({ row }) => <RatingCell rating={row.original.selfReview?.rating} />,
      },
      {
        accessorKey: "managerReview",
        header: "Manager",
        cell: ({ row }) => <RatingCell rating={row.original.managerReview?.rating} />,
      },
      {
        accessorKey: "hrReview",
        header: "HR",
        cell: ({ row }) => <RatingCell rating={row.original.hrReview?.rating} />,
      },
      {
        accessorKey: "overallRating",
        header: "Overall",
        cell: ({ row }) => {
          const rating = row.original.overallRating;
          if (rating != null) {
            return (
              <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">
                <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                {rating}
              </span>
            );
          }
          return <span className="text-xs text-muted-foreground">—</span>;
        },
      },
    ];
  }, [expandedRow]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-48 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Performance Monitor</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure review settings, questions, and view all employee ratings.
        </p>
      </div>

      {/* Settings Panel */}
      <div className="border border-border rounded-xl bg-card divide-y divide-border">
        {/* Enable/Disable */}
        <div className="p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-foreground">Performance Monitor</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              {isEnabled
                ? "Enabled — visible in employee sidebar."
                : "Disabled — hidden from employees."}
            </p>
          </div>
          <Button
            variant={isEnabled ? "default" : "outline"}
            className="flex items-center gap-2"
            onClick={handleToggleEnabled}
            disabled={toggling}
          >
            {isEnabled ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
            {isEnabled ? "Enabled" : "Disabled"}
          </Button>
        </div>

        {/* HR Approval */}
        <div className="p-5 flex items-center justify-between">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold text-foreground">Require HR Approval</p>
              <p className="text-sm text-muted-foreground mt-0.5">
                {requireHrApproval
                  ? "HR rating is included when computing the overall rating."
                  : "Overall rating is based on self + manager ratings only."}
              </p>
            </div>
          </div>
          <Button
            variant={requireHrApproval ? "default" : "outline"}
            className="flex items-center gap-2 flex-shrink-0"
            onClick={handleToggleHrApproval}
            disabled={togglingHr}
          >
            {requireHrApproval ? (
              <ToggleRight className="w-5 h-5" />
            ) : (
              <ToggleLeft className="w-5 h-5" />
            )}
            {requireHrApproval ? "Required" : "Not Required"}
          </Button>
        </div>
      </div>

      {/* Questions */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Review Questions
        </h2>
        <div className="flex gap-2">
          <Input
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="e.g. What were your key achievements this quarter?"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAddQuestion();
            }}
          />
          <Button onClick={handleAddQuestion} disabled={addingQ || !newQuestion.trim()}>
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        {questions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No questions yet. Add some above.</p>
        ) : (
          <div className="space-y-2">
            {questions.map((q, i) => (
              <div
                key={q.id}
                className="flex items-center justify-between border border-border rounded-lg px-3 py-2 bg-card"
              >
                <p className="text-sm text-foreground">
                  <span className="text-muted-foreground mr-2">{i + 1}.</span>
                  {q.question}
                </p>
                <Button
                  size="icon"
                  variant="ghost"
                  className="text-destructive hover:text-destructive flex-shrink-0"
                  onClick={() => handleDeleteQuestion(q.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Reviews Aggregated */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            All Employee Reviews ({filteredData.length})
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={handleDownloadExcel}
          >
            <Download className="w-4 h-4" />
            Download Excel
          </Button>
        </div>

        {aggregated.length === 0 ? (
          <p className="text-sm text-muted-foreground">No reviews submitted yet.</p>
        ) : (
          <>
            <DataTable
              columns={columns}
              data={paginatedData}
              pageCount={pageCount}
              state={tableState}
              setState={(s) => {
                setTableState(s);
                setExpandedRow(null);
              }}
            />
            
            {/* Expanded Row Details */}
            {expandedRow && (
              <div className="border border-border rounded-xl bg-muted/20 p-4 mt-4">
                {(() => {
                  const emp = aggregated.find(e => e.userId === expandedRow);
                  if (!emp) return null;
                  return (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      {/* Self Review detail */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="text-xs">SELF</Badge>
                          <RatingCell rating={emp.selfReview?.rating} />
                        </div>
                        {emp.selfReview ? (
                          <>
                            {emp.selfReview.answers.map((a, i) => (
                              <div key={i} className="space-y-0.5">
                                <p className="text-xs text-muted-foreground">{i + 1}. {a.question}</p>
                                <p className="text-xs text-foreground pl-2 border-l-2 border-primary/30">{a.answer}</p>
                              </div>
                            ))}
                            {emp.selfReview.remark && (
                              <p className="text-xs text-muted-foreground italic">{emp.selfReview.remark}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">Not submitted</p>
                        )}
                      </div>

                      {/* Manager Review detail */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="text-xs">MANAGER</Badge>
                          <RatingCell rating={emp.managerReview?.rating} />
                        </div>
                        {emp.managerReview ? (
                          <>
                            {emp.managerReview.reviewerEmail && (
                              <p className="text-xs text-muted-foreground">
                                By: {emp.managerReview.reviewerEmail}
                              </p>
                            )}
                            {emp.managerReview.remark && (
                              <p className="text-xs text-foreground">{emp.managerReview.remark}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">Not submitted</p>
                        )}
                      </div>

                      {/* HR Review detail */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">HR</Badge>
                          <RatingCell rating={emp.hrReview?.rating} />
                        </div>
                        {emp.hrReview ? (
                          <>
                            {emp.hrReview.reviewerEmail && (
                              <p className="text-xs text-muted-foreground">
                                By: {emp.hrReview.reviewerEmail}
                              </p>
                            )}
                            {emp.hrReview.remark && (
                              <p className="text-xs text-foreground">{emp.hrReview.remark}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-muted-foreground">Not submitted</p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
