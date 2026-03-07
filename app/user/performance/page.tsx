"use client";

import { useEffect, useState } from "react";
import {
  getPerformanceQuestions,
  submitSelfReview,
  getMyPerformanceReviews,
  checkIsManager,
  checkIsHr,
  getTeamWithReviews,
  submitManagerReview,
  getAllEmployeesForHr,
  submitHrReview,
} from "@/app/api/api";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Plus,
  Star,
  ChevronDown,
  ChevronUp,
  Users,
  UserCheck,
  ClipboardList,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Question {
  id: string;
  question: string;
  orderIndex: number;
}

interface ReviewAnswer {
  questionId: string;
  question: string;
  answer: string;
}

interface Review {
  id: string;
  reviewType: string;
  period: string;
  answers: ReviewAnswer[];
  overallRating: number | null;
  comments: string | null;
  createdAt: string;
  reviewer: { id: string; email: string } | null;
}

interface TeamMember {
  employeeId: string;
  userId: string;
  firstName: string;
  lastName: string;
  workEmail: string;
  selfReview: {
    answers: ReviewAnswer[];
    overallRating: number | null;
    comments: string | null;
    submittedAt: string;
  } | null;
  managerReview: {
    id: string;
    overallRating: number | null;
    comments: string | null;
    submittedAt: string;
  } | null;
  hrReview?: {
    id: string;
    overallRating: number | null;
    comments: string | null;
    submittedAt: string;
  } | null;
}

// ─── Rating input (1-10 boxes) ────────────────────────────────────────────────

function RatingInput({
  value,
  onChange,
}: {
  value: number | "";
  onChange: (v: number | "") => void;
}) {
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(value === n ? "" : n)}
          className={`w-8 h-8 rounded-md text-sm font-semibold transition-colors border ${
            value !== "" && n <= (value as number)
              ? "bg-amber-500 border-amber-500 text-white"
              : "border-border text-muted-foreground hover:border-amber-400 hover:text-amber-500"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}

function RatingBadge({ rating }: { rating: number | null | undefined }) {
  if (rating == null) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
      {rating}/10
    </span>
  );
}

// ─── Self Review Section ──────────────────────────────────────────────────────

function SelfReviewSection({
  questions,
  reviews,
  onNewReview,
}: {
  questions: Question[];
  reviews: Review[];
  onNewReview: (r: Review) => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [period, setPeriod] = useState("");
  const [rating, setRating] = useState<number | "">("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    const incomplete = questions.some((q) => !answers[q.id]?.trim());
    if (incomplete) {
      toast.error("Please answer all questions before submitting");
      return;
    }
    if (rating === "") {
      toast.error("Please provide a self-rating (1–10)");
      return;
    }
    setSubmitting(true);
    try {
      const res = await submitSelfReview({
        period: period || undefined,
        answers: questions.map((q) => ({
          questionId: q.id,
          question: q.question,
          answer: answers[q.id],
        })),
        overallRating: Number(rating),
        comments: comments || undefined,
      });
      onNewReview(res.data);
      setDialogOpen(false);
      setAnswers({});
      setPeriod("");
      setRating("");
      setComments("");
      toast.success("Self-review submitted!");
    } catch {
      toast.error("Failed to submit review");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          My Self-Reviews
        </h2>
        {questions.length > 0 && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="flex items-center gap-2">
                <Plus className="w-4 h-4" />
                New Self-Review
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Self Performance Review
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-5 mt-2">
                <div className="space-y-1">
                  <Label>Review Period (optional)</Label>
                  <Input
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    placeholder="e.g. Q1 2026, January 2026"
                  />
                </div>
                {questions.map((q, i) => (
                  <div key={q.id} className="space-y-1">
                    <Label>
                      {i + 1}. {q.question}
                    </Label>
                    <Textarea
                      value={answers[q.id] ?? ""}
                      onChange={(e) =>
                        setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                      }
                      placeholder="Your answer..."
                      rows={3}
                    />
                  </div>
                ))}
                <div className="space-y-2">
                  <Label>Self-Rating (1–10)</Label>
                  <RatingInput value={rating} onChange={setRating} />
                </div>
                <div className="space-y-1">
                  <Label>Remark (optional)</Label>
                  <Textarea
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Any additional notes..."
                    rows={3}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? "Submitting..." : "Submit Review"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {questions.length === 0 && (
        <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          No performance questions have been set up yet. Check back later.
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews submitted yet.</p>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-border rounded-xl bg-card overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-accent/50 transition-colors"
        onClick={() => setExpanded((p) => !p)}
      >
        <div className="flex items-center gap-3">
          <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">
              {review.reviewType === "SELF"
                ? "Self Review"
                : review.reviewType === "MANAGER"
                ? "Manager Review"
                : "HR Review"}
              {review.period && ` — ${review.period}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(review.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              review.reviewType === "SELF"
                ? "secondary"
                : review.reviewType === "MANAGER"
                ? "default"
                : "outline"
            }
          >
            {review.reviewType}
          </Badge>
          <RatingBadge rating={review.overallRating} />
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 border-t border-border space-y-3 pt-3">
          {review.answers.map((a, i) => (
            <div key={i} className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                {i + 1}. {a.question}
              </p>
              <p className="text-sm text-foreground pl-3 border-l-2 border-primary/30">
                {a.answer}
              </p>
            </div>
          ))}
          {review.comments && (
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Remark</p>
              <p className="text-sm text-foreground">{review.comments}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Team Review Section (Manager) ───────────────────────────────────────────

function TeamReviewSection({
  teamMembers,
  onRated,
}: {
  teamMembers: TeamMember[];
  onRated: (userId: string, rating: number, comments: string) => void;
}) {
  const [ratingDialogFor, setRatingDialogFor] = useState<TeamMember | null>(null);
  const [expandedSelf, setExpandedSelf] = useState<string | null>(null);
  const [rating, setRating] = useState<number | "">("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openDialog = (member: TeamMember) => {
    setRatingDialogFor(member);
    setRating(member.managerReview?.overallRating ?? "");
    setComments(member.managerReview?.comments ?? "");
  };

  const handleSubmit = async () => {
    if (!ratingDialogFor) return;
    if (rating === "") {
      toast.error("Please provide a rating (1–10)");
      return;
    }
    setSubmitting(true);
    try {
      await submitManagerReview({
        employeeId: ratingDialogFor.userId,
        overallRating: Number(rating),
        comments: comments || undefined,
        answers: [],
      });
      onRated(ratingDialogFor.userId, Number(rating), comments);
      setRatingDialogFor(null);
      setRating("");
      setComments("");
      toast.success(`Rating submitted for ${ratingDialogFor.firstName}`);
    } catch {
      toast.error("Failed to submit rating");
    } finally {
      setSubmitting(false);
    }
  };

  if (teamMembers.length === 0) {
    return <p className="text-sm text-muted-foreground">No direct reports found.</p>;
  }

  return (
    <div className="space-y-3">
      {teamMembers.map((member) => (
        <div
          key={member.userId}
          className="border border-border rounded-xl bg-card overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {member.firstName[0]}
                {member.lastName?.[0] ?? ""}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {member.firstName} {member.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{member.workEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Self</p>
                <RatingBadge rating={member.selfReview?.overallRating} />
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">My Rating</p>
                <RatingBadge rating={member.managerReview?.overallRating} />
              </div>
              {member.selfReview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setExpandedSelf((p) => (p === member.userId ? null : member.userId))
                  }
                >
                  {expandedSelf === member.userId ? "Hide" : "View"} Answers
                </Button>
              )}
              <Button size="sm" onClick={() => openDialog(member)}>
                {member.managerReview ? "Update Rating" : "Rate"}
              </Button>
            </div>
          </div>

          {expandedSelf === member.userId && member.selfReview && (
            <div className="px-4 pb-4 border-t border-border space-y-3 pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Self-Review Answers
              </p>
              {member.selfReview.answers.map((a, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {i + 1}. {a.question}
                  </p>
                  <p className="text-sm text-foreground pl-3 border-l-2 border-primary/30">
                    {a.answer}
                  </p>
                </div>
              ))}
              {member.selfReview.comments && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Remark</p>
                  <p className="text-sm text-foreground">{member.selfReview.comments}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <Dialog
        open={!!ratingDialogFor}
        onOpenChange={(o) => {
          if (!o) setRatingDialogFor(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Rate — {ratingDialogFor?.firstName} {ratingDialogFor?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Rating (1–10)</Label>
              <RatingInput value={rating} onChange={setRating} />
            </div>
            <div className="space-y-1">
              <Label>Remark (optional)</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Feedback for this employee..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRatingDialogFor(null)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Rating"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── HR Rate Employees Section ────────────────────────────────────────────────

function HrRateSection({
  employees,
  onRated,
}: {
  employees: TeamMember[];
  onRated: (userId: string, rating: number, comments: string) => void;
}) {
  const [ratingDialogFor, setRatingDialogFor] = useState<TeamMember | null>(null);
  const [expandedSelf, setExpandedSelf] = useState<string | null>(null);
  const [rating, setRating] = useState<number | "">("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const openDialog = (member: TeamMember) => {
    setRatingDialogFor(member);
    setRating(member.hrReview?.overallRating ?? "");
    setComments(member.hrReview?.comments ?? "");
  };

  const handleSubmit = async () => {
    if (!ratingDialogFor) return;
    if (rating === "") {
      toast.error("Please provide a rating (1–10)");
      return;
    }
    setSubmitting(true);
    try {
      await submitHrReview({
        employeeId: ratingDialogFor.userId,
        overallRating: Number(rating),
        comments: comments || undefined,
        answers: [],
      });
      onRated(ratingDialogFor.userId, Number(rating), comments);
      setRatingDialogFor(null);
      setRating("");
      setComments("");
      toast.success(`HR rating submitted for ${ratingDialogFor.firstName}`);
    } catch {
      toast.error("Failed to submit HR rating");
    } finally {
      setSubmitting(false);
    }
  };

  if (employees.length === 0) {
    return <p className="text-sm text-muted-foreground">No employees found.</p>;
  }

  return (
    <div className="space-y-3">
      {employees.map((emp) => (
        <div
          key={emp.userId}
          className="border border-border rounded-xl bg-card overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
                {emp.firstName[0]}
                {emp.lastName?.[0] ?? ""}
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {emp.firstName} {emp.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{emp.workEmail}</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Self</p>
                <RatingBadge rating={emp.selfReview?.overallRating} />
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">HR Rating</p>
                <RatingBadge rating={emp.hrReview?.overallRating} />
              </div>
              {emp.selfReview && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    setExpandedSelf((p) => (p === emp.userId ? null : emp.userId))
                  }
                >
                  {expandedSelf === emp.userId ? "Hide" : "View"} Answers
                </Button>
              )}
              <Button size="sm" onClick={() => openDialog(emp)}>
                {emp.hrReview ? "Update Rating" : "Rate"}
              </Button>
            </div>
          </div>

          {expandedSelf === emp.userId && emp.selfReview && (
            <div className="px-4 pb-4 border-t border-border space-y-3 pt-3">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Self-Review Answers
              </p>
              {emp.selfReview.answers.map((a, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">
                    {i + 1}. {a.question}
                  </p>
                  <p className="text-sm text-foreground pl-3 border-l-2 border-primary/30">
                    {a.answer}
                  </p>
                </div>
              ))}
              {emp.selfReview.comments && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Remark</p>
                  <p className="text-sm text-foreground">{emp.selfReview.comments}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      <Dialog
        open={!!ratingDialogFor}
        onOpenChange={(o) => {
          if (!o) setRatingDialogFor(null);
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              HR Rating — {ratingDialogFor?.firstName} {ratingDialogFor?.lastName}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Rating (1–10)</Label>
              <RatingInput value={rating} onChange={setRating} />
            </div>
            <div className="space-y-1">
              <Label>Remark (optional)</Label>
              <Textarea
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="HR feedback..."
                rows={4}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setRatingDialogFor(null)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit HR Rating"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PerformancePage() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [hrEmployees, setHrEmployees] = useState<TeamMember[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [isHR, setIsHR] = useState(false);
  const [activeTab, setActiveTab] = useState<"self" | "team" | "hr">("self");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetches: Promise<unknown>[] = [
      getPerformanceQuestions().then((r) =>
        setQuestions(Array.isArray(r.data) ? r.data : [])
      ),
      getMyPerformanceReviews().then((r) =>
        setReviews(Array.isArray(r.data) ? r.data : [])
      ),
      checkIsManager().then((r) => {
        if (r.data?.isManager) {
          setIsManager(true);
          return getTeamWithReviews().then((t) =>
            setTeamMembers(Array.isArray(t.data) ? t.data : [])
          );
        }
      }),
      checkIsHr().then((r) => {
        if (r.data?.isHr) {
          setIsHR(true);
          return getAllEmployeesForHr().then((e) =>
            setHrEmployees(Array.isArray(e.data) ? e.data : [])
          );
        }
      }),
    ];

    Promise.allSettled(fetches).finally(() => setLoading(false));
  }, []);

  const tabs = [
    { key: "self" as const, label: "My Review", icon: ClipboardList },
    ...(isManager ? [{ key: "team" as const, label: "Team Reviews", icon: Users }] : []),
    ...(isHR ? [{ key: "hr" as const, label: "Rate Employees", icon: UserCheck }] : []),
  ];

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-48 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Performance</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {isManager
            ? "Review your own performance and rate your team members."
            : "Share your self-assessment with your manager and HR."}
        </p>
      </div>

      {/* Tabs — shown only if manager or HR */}
      {tabs.length > 1 && (
        <div className="flex border-b border-border">
          {tabs.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      )}

      {activeTab === "self" && (
        <SelfReviewSection
          questions={questions}
          reviews={reviews.filter((r) => r.reviewType === "SELF")}
          onNewReview={(r) => setReviews((prev) => [r, ...prev])}
        />
      )}

      {activeTab === "team" && isManager && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Team Members ({teamMembers.length})
          </h2>
          <TeamReviewSection
            teamMembers={teamMembers}
            onRated={(userId, r, c) =>
              setTeamMembers((prev) =>
                prev.map((m) =>
                  m.userId === userId
                    ? {
                        ...m,
                        managerReview: {
                          id: "",
                          overallRating: r,
                          comments: c,
                          submittedAt: new Date().toISOString(),
                        },
                      }
                    : m
                )
              )
            }
          />
        </div>
      )}

      {activeTab === "hr" && isHR && (
        <div className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            All Employees ({hrEmployees.length})
          </h2>
          <HrRateSection
            employees={hrEmployees}
            onRated={(userId, r, c) =>
              setHrEmployees((prev) =>
                prev.map((e) =>
                  e.userId === userId
                    ? {
                        ...e,
                        hrReview: {
                          id: "",
                          overallRating: r,
                          comments: c,
                          submittedAt: new Date().toISOString(),
                        },
                      }
                    : e
                )
              )
            }
          />
        </div>
      )}
    </div>
  );
}
