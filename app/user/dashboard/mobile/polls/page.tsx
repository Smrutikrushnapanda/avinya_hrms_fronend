"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckCircle2, Loader2, Vote } from "lucide-react";
import { getProfile, getActivePoll, saveResponse } from "@/app/api/api";
import MobileTabHeader from "../components/MobileTabHeader";
import { toast } from "sonner";

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
    data?: {
      message?: string;
    };
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
    return poll.questions.map((question) => ({
      ...question,
      question_text: question.question_text || question.questionText || "Question",
      is_required: Boolean(question.is_required ?? question.isRequired),
      options: Array.isArray(question.options)
        ? question.options.map((option) => ({
            ...option,
            option_text: option.option_text || option.optionText || "Option",
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
        options: poll.options.map((option) => ({
          ...option,
          option_text: option.option_text || option.optionText || "Option",
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

  const loadData = useCallback(async (currentUserId?: string) => {
    setLoading(true);
    try {
      let resolvedUserId = currentUserId || userId;
      if (!resolvedUserId) {
        const profileRes = await getProfile();
        resolvedUserId = profileRes.data?.id || profileRes.data?.userId || "";
      }

      if (!resolvedUserId) {
        throw new Error("User not found");
      }

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

      const answered = new Set<string>(responses.map((response) => response.question_id));
      setAnsweredQuestionIds(answered);

      const initialAnswers: Record<string, string> = {};
      responses.forEach((response) => {
        if (response.option_ids?.length > 0) {
          initialAnswers[response.question_id] = response.option_ids[0];
        }
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
  }, [userId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const unresolvedRequired = useMemo(
    () =>
      questions.filter(
        (question) =>
          Boolean(question.is_required) &&
          !answeredQuestionIds.has(question.id) &&
          !selectedAnswers[question.id],
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
      (question) => !answeredQuestionIds.has(question.id) && selectedAnswers[question.id],
    );

    if (pending.length === 0) {
      toast.message("You already submitted this poll");
      return;
    }

    try {
      setSubmitting(true);

      await Promise.all(
        pending.map((question) =>
          saveResponse({
            poll_id: poll.id,
            question_id: question.id,
            user_id: userId,
            option_ids: [selectedAnswers[question.id]],
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

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MobileTabHeader title="Polls" backHref="/user/dashboard/mobile" className="bg-[#0077b6]" />

      <div className="p-4 pb-20">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active Poll</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : !poll ? (
              <div className="text-center py-8">
                <Vote className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No active polls at the moment.</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => void loadData(userId)}
                >
                  Refresh
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <h3 className="font-semibold text-lg truncate">{poll.title}</h3>
                    {(poll.is_active || poll.isActive) && <Badge className="bg-green-500">Active</Badge>}
                  </div>
                  {poll.description ? (
                    <p className="text-sm text-gray-600">{poll.description}</p>
                  ) : null}
                  <p className="text-xs text-gray-500 mt-2">
                    Ends: {formatDate(poll.end_time || poll.endDate)}
                    {typeof poll.totalVotes === "number" ? ` • ${poll.totalVotes} votes` : ""}
                  </p>
                </div>

                <div className="space-y-3">
                  {questions.length === 0 ? (
                    <p className="text-sm text-gray-500">No questions available for this poll.</p>
                  ) : (
                    questions.map((question, index) => {
                      const alreadyAnswered = answeredQuestionIds.has(question.id);
                      const selected = selectedAnswers[question.id];
                      const optionList = Array.isArray(question.options) ? question.options : [];

                      return (
                        <div key={question.id} className="rounded-lg border p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-900">
                              {index + 1}. {question.question_text || question.questionText || "Question"}
                            </p>
                            {alreadyAnswered ? (
                              <Badge className="bg-green-100 text-green-700 border-green-200 whitespace-nowrap">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Answered
                              </Badge>
                            ) : question.is_required ? (
                              <Badge variant="outline" className="whitespace-nowrap">Required</Badge>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            {optionList.map((option) => {
                              const isSelected = selected === option.id;
                              return (
                                <button
                                  key={option.id}
                                  type="button"
                                  onClick={() => handleAnswerChange(question.id, option.id)}
                                  disabled={alreadyAnswered}
                                  className={`w-full text-left rounded-md border px-3 py-2 text-sm transition ${
                                    isSelected
                                      ? "border-[#0077b6] bg-[#e6f4fa]"
                                      : "border-gray-200 hover:bg-gray-50"
                                  } ${alreadyAnswered ? "opacity-75 cursor-not-allowed" : ""}`}
                                >
                                  {option.option_text || option.optionText || "Option"}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {questions.length > 0 ? (
                  <Button
                    className="w-full bg-[#0077b6] hover:bg-[#006494]"
                    onClick={() => void handleSubmit()}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Response"
                    )}
                  </Button>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
