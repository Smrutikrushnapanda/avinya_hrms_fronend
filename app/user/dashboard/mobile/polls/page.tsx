"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Vote, CheckCircle2 } from "lucide-react";
import { getProfile, getActivePoll, saveResponse } from "@/app/api/api";
import MobileTabHeader from "../components/MobileTabHeader";
import { MobileCard } from "../components/MobileCard";
import { MobileEmptyState } from "../components/MobileEmptyState";
import { MobileSkeleton } from "../components/MobileSkeleton";
import { StaggerReveal, StaggerItem, SlideUp } from "../components/animation-wrappers";
import { toast } from "sonner";
import { motion } from "framer-motion";

type PollOption = {
  id: string;
  option_text?: string;
  optionText?: string;
  voteCount?: number;
};

type PollQuestion = {
  id: string;
  question_text?: string;
  questionText?: string;
  question_type?: "single_choice" | "multiple_choice" | "text" | "rating";
  is_required?: boolean;
  isRequired?: boolean;
  options?: PollOption[];
};

type ActivePoll = {
  id: string;
  title: string;
  description?: string;
  end_time?: string;
  endDate?: string;
  is_active?: boolean;
  isActive?: boolean;
  totalVotes?: number;
  options?: PollOption[];
  questions?: PollQuestion[];
};

type ExistingResponse = {
  question_id: string;
  option_ids: string[];
};

type HttpError = {
  response?: {
    status?: number;
    data?: { message?: string };
  };
};

const formatDate = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const normalizeQuestions = (poll: ActivePoll): PollQuestion[] => {
  if (Array.isArray(poll.questions) && poll.questions.length > 0) {
    return poll.questions.map((q) => ({
      ...q,
      question_text: q.question_text || q.questionText || "Question",
      is_required: Boolean(q.is_required ?? q.isRequired),
      options: Array.isArray(q.options)
        ? q.options.map((o) => ({
            ...o,
            option_text: o.option_text || o.optionText || "Option",
          }))
        : [],
    }));
  }
  if (Array.isArray(poll.options) && poll.options.length > 0) {
    return [
      {
        id: `${poll.id}-legacy-question`,
        question_text: "Select an option",
        question_type: "single_choice",
        is_required: true,
        options: poll.options.map((o) => ({
          ...o,
          option_text: o.option_text || o.optionText || "Option",
        })),
      },
    ];
  }
  return [];
};

export default function MobilePollsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState("");
  const [poll, setPoll] = useState<ActivePoll | null>(null);
  const [questions, setQuestions] = useState<PollQuestion[]>([]);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<string>>(new Set());

  const loadData = useCallback(
    async (currentUserId?: string) => {
      setLoading(true);
      try {
        let resolvedUserId = currentUserId || userId;
        if (!resolvedUserId) {
          const profileRes = await getProfile();
          resolvedUserId = profileRes.data?.id || profileRes.data?.userId || "";
        }
        if (!resolvedUserId) throw new Error("User not found");
        setUserId(resolvedUserId);

        const pollRes = await getActivePoll(resolvedUserId);
        const activePoll = (pollRes.data?.poll || pollRes.data || null) as ActivePoll | null;
        const responses = Array.isArray(pollRes.data?.responses)
          ? (pollRes.data.responses as ExistingResponse[])
          : [];

        setPoll(activePoll);
        if (!activePoll) {
          setQuestions([]);
          setSelectedAnswers({});
          setAnsweredQuestionIds(new Set());
          return;
        }

        const normalizedQuestions = normalizeQuestions(activePoll);
        setQuestions(normalizedQuestions);

        const answered = new Set<string>(responses.map((r) => r.question_id));
        setAnsweredQuestionIds(answered);

        const initialAnswers: Record<string, string> = {};
        responses.forEach((r) => {
          if (r.option_ids?.length > 0) initialAnswers[r.question_id] = r.option_ids[0];
        });
        setSelectedAnswers(initialAnswers);
      } catch (error) {
        console.error("Error fetching poll:", error);
        toast.error("Failed to load poll");
        setPoll(null);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    },
    [userId],
  );

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const unresolvedRequired = useMemo(
    () =>
      questions.filter(
        (q) => Boolean(q.is_required) && !answeredQuestionIds.has(q.id) && !selectedAnswers[q.id],
      ),
    [answeredQuestionIds, questions, selectedAnswers],
  );

  const handleAnswerChange = (questionId: string, optionId: string) => {
    if (answeredQuestionIds.has(questionId)) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (!poll || !userId) return;
    if (unresolvedRequired.length > 0) {
      toast.error("Please answer all required questions");
      return;
    }
    const pending = questions.filter(
      (q) => !answeredQuestionIds.has(q.id) && selectedAnswers[q.id],
    );
    if (pending.length === 0) {
      toast.message("You already submitted this poll");
      return;
    }
    try {
      setSubmitting(true);
      await Promise.all(
        pending.map((q) =>
          saveResponse({
            poll_id: poll.id,
            question_id: q.id,
            user_id: userId,
            option_ids: [selectedAnswers[q.id]],
          }),
        ),
      );
      toast.success("Poll response submitted");
      await loadData(userId);
    } catch (error: unknown) {
      const httpError = error as HttpError;
      if (httpError.response?.status === 409) {
        toast.message("You have already submitted this poll");
      } else {
        toast.error(httpError.response?.data?.message || "Failed to submit response");
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <MobileTabHeader title="Polls" backHref="/user/dashboard/mobile" compact />
        <MobileSkeleton />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <MobileTabHeader title="Polls" backHref="/user/dashboard/mobile" compact />

      <div className="p-4 pb-24">
        {!poll ? (
          <MobileEmptyState
            icon={<Vote size={28} />}
            title="No active polls"
            description="There are no active polls at the moment."
            action={
              <Button variant="outline" size="sm" onClick={() => void loadData(userId)}>
                Refresh
              </Button>
            }
          />
        ) : (
          <SlideUp>
            <MobileCard className="space-y-5">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-lg text-foreground truncate">{poll.title}</h3>
                  {(poll.is_active || poll.isActive) && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Active
                    </span>
                  )}
                </div>
                {poll.description && (
                  <p className="text-sm text-muted-foreground">{poll.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Ends: {formatDate(poll.end_time || poll.endDate)}
                  {typeof poll.totalVotes === "number" ? ` \u2022 ${poll.totalVotes} votes` : ""}
                </p>
              </div>

              <StaggerReveal className="space-y-3">
                {questions.map((question, index) => {
                  const alreadyAnswered = answeredQuestionIds.has(question.id);
                  const selected = selectedAnswers[question.id];
                  const optionList = Array.isArray(question.options) ? question.options : [];
                  const totalVotes = optionList.reduce((sum, o) => sum + (o.voteCount || 0), 0) || 1;

                  return (
                    <StaggerItem key={question.id}>
                      <div className="rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-foreground">
                            {index + 1}. {question.question_text || question.questionText || "Question"}
                          </p>
                          {alreadyAnswered ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3" />
                              Answered
                            </span>
                          ) : question.is_required ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-muted text-muted-foreground border border-border whitespace-nowrap">
                              Required
                            </span>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          {optionList.map((option) => {
                            const isSelected = selected === option.id;
                            const voteCount = option.voteCount || 0;
                            const percentage = Math.round((voteCount / totalVotes) * 100);

                            return (
                              <motion.button
                                key={option.id}
                                type="button"
                                onClick={() => handleAnswerChange(question.id, option.id)}
                                disabled={alreadyAnswered}
                                whileTap={alreadyAnswered ? undefined : { scale: 0.98 }}
                                className={`w-full text-left rounded-xl border px-4 py-3 text-sm transition-all relative overflow-hidden ${
                                  isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-slate-200 dark:border-slate-700 hover:bg-muted/50"
                                } ${alreadyAnswered ? "opacity-80 cursor-default" : ""}`}
                              >
                                {alreadyAnswered && voteCount > 0 && (
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    transition={{ type: "spring", stiffness: 60, damping: 15, delay: 0.2 }}
                                    className="absolute inset-y-0 left-0 bg-primary/8 rounded-xl"
                                  />
                                )}
                                <div className="relative z-10 flex items-center justify-between">
                                  <span className="font-medium text-foreground">
                                    {option.option_text || option.optionText || "Option"}
                                  </span>
                                  {alreadyAnswered && (
                                    <span className="text-xs font-semibold text-muted-foreground tabular-nums">
                                      {percentage}%
                                    </span>
                                  )}
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </StaggerItem>
                  );
                })}
              </StaggerReveal>

              {questions.length > 0 && (
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                    onClick={() => void handleSubmit()}
                    loading={submitting}
                  >
                    Submit Response
                  </Button>
                </motion.div>
              )}
            </MobileCard>
          </SlideUp>
        )}
      </div>
    </div>
  );
}
