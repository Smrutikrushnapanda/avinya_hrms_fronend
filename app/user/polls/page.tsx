"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Vote, CalendarClock, History, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  getProfile,
  getActivePoll,
  saveResponse,
  getPollsSummary,
  getPollAnalytics,
} from "@/app/api/api";

interface PollOption {
  id: string;
  option_text: string;
}

interface PollQuestion {
  id: string;
  question_text: string;
  question_type: "single_choice" | "multiple_choice" | "text" | "rating";
  is_required: boolean;
  options: PollOption[];
}

interface ActivePoll {
  id: string;
  title: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  questions: PollQuestion[];
}

interface ExistingResponse {
  question_id: string;
  option_ids: string[];
  response_text?: string;
  response_rating?: number;
}

interface PollSummary {
  id: string;
  title: string;
  created_at?: string;
  end_time?: string;
}

interface PollHistoryItem {
  pollId: string;
  title: string;
  answeredQuestions: number;
  submittedAt?: string;
}

interface AnalyticsUserResponse {
  user_id?: string;
  submitted_at?: string;
}

interface AnalyticsQuestion {
  user_responses?: AnalyticsUserResponse[];
}

interface PollAnalytics {
  questions_analytics?: AnalyticsQuestion[];
}

interface HttpError {
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
}

const formatDateTime = (value?: string) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function PollsPage() {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState("");
  const [activePoll, setActivePoll] = useState<ActivePoll | null>(null);
  const [answeredQuestionIds, setAnsweredQuestionIds] = useState<Set<string>>(new Set());
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<PollHistoryItem[]>([]);

  const loadPollData = useCallback(async (currentUserId: string) => {
    const activeRes = await getActivePoll(currentUserId);
    const activePollData = activeRes.data?.poll || null;
    const existingResponses: ExistingResponse[] = Array.isArray(activeRes.data?.responses)
      ? activeRes.data.responses
      : [];

    setActivePoll(activePollData);

    const answered = new Set(existingResponses.map((response) => response.question_id));
    setAnsweredQuestionIds(answered);

    const initialAnswers: Record<string, string> = {};
    existingResponses.forEach((response) => {
      if (response.option_ids?.length) {
        initialAnswers[response.question_id] = response.option_ids[0];
      }
    });
    setSelectedAnswers(initialAnswers);

    const summariesRes = await getPollsSummary();
    const summaries: PollSummary[] = Array.isArray(summariesRes.data) ? summariesRes.data : [];

    const historyResults = await Promise.all(
      summaries.map(async (poll) => {
        try {
          const analyticsRes = await getPollAnalytics(poll.id);
          const analytics = analyticsRes.data as PollAnalytics;
          const userResponses = (analytics.questions_analytics || []).flatMap((question) =>
            (question.user_responses || []).filter((response) => response.user_id === currentUserId)
          );

          if (!userResponses.length) return null;

          const latestSubmittedAt = userResponses
            .map((entry) => entry.submitted_at)
            .filter(Boolean)
            .sort((a: string, b: string) => new Date(b).getTime() - new Date(a).getTime())[0];

          return {
            pollId: poll.id,
            title: poll.title,
            answeredQuestions: userResponses.length,
            submittedAt: latestSubmittedAt,
          } as PollHistoryItem;
        } catch {
          return null;
        }
      })
    );

    setHistory(historyResults.filter((item): item is PollHistoryItem => Boolean(item)));
  }, []);

  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        const profileRes = await getProfile();
        const currentUserId = profileRes.data?.id || profileRes.data?.userId;

        if (!currentUserId) {
          throw new Error("User ID not found");
        }

        setUserId(currentUserId);
        await loadPollData(currentUserId);
      } catch {
        toast.error("Failed to load polls");
      } finally {
        setLoading(false);
      }
    };

    init();
  }, [loadPollData]);

  const unansweredRequiredQuestions = useMemo(() => {
    if (!activePoll) return [];
    return activePoll.questions.filter(
      (question) =>
        question.is_required &&
        !answeredQuestionIds.has(question.id) &&
        !selectedAnswers[question.id]
    );
  }, [activePoll, answeredQuestionIds, selectedAnswers]);

  const handleAnswerChange = (questionId: string, optionId: string) => {
    if (answeredQuestionIds.has(questionId)) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleSubmit = async () => {
    if (!activePoll || !userId) return;

    if (unansweredRequiredQuestions.length > 0) {
      toast.error("Please answer all required questions");
      return;
    }

    const questionsToSubmit = activePoll.questions.filter(
      (question) => !answeredQuestionIds.has(question.id) && selectedAnswers[question.id]
    );

    if (!questionsToSubmit.length) {
      toast.message("You already submitted this poll");
      return;
    }

    try {
      setSubmitting(true);

      await Promise.all(
        questionsToSubmit.map((question) =>
          saveResponse({
            poll_id: activePoll.id,
            question_id: question.id,
            user_id: userId,
            option_ids: [selectedAnswers[question.id]],
          })
        )
      );

      toast.success("Poll response submitted successfully");
      await loadPollData(userId);
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
      <div className="p-6 flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>Loading polls...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <Card className="border-0 shadow-sm bg-gradient-to-r from-emerald-50 to-teal-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Vote className="h-6 w-6 text-emerald-600" />
            Polls
          </CardTitle>
          <CardDescription>
            Answer active polls and view your response history.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="h-5 w-5" />
            Active Poll
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!activePoll ? (
            <div className="text-muted-foreground">No active poll available right now.</div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold">{activePoll.title}</h2>
                {activePoll.description ? (
                  <p className="text-sm text-muted-foreground mt-1">{activePoll.description}</p>
                ) : null}
                <p className="text-xs text-muted-foreground mt-2">
                  Ends on: {formatDateTime(activePoll.end_time)}
                </p>
              </div>

              <div className="space-y-4">
                {activePoll.questions.map((question, index) => {
                  const alreadyAnswered = answeredQuestionIds.has(question.id);
                  const selected = selectedAnswers[question.id];

                  return (
                    <Card key={question.id} className="border">
                      <CardContent className="pt-5 space-y-3">
                        <div className="flex items-start gap-2">
                          <p className="font-medium">
                            {index + 1}. {question.question_text}
                          </p>
                          {question.is_required ? (
                            <Badge variant="outline" className="text-xs">
                              Required
                            </Badge>
                          ) : null}
                          {alreadyAnswered ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Answered
                            </Badge>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          {question.options?.map((option) => {
                            const isSelected = selected === option.id;
                            return (
                              <button
                                key={option.id}
                                type="button"
                                onClick={() => handleAnswerChange(question.id, option.id)}
                                disabled={alreadyAnswered}
                                className={`w-full text-left px-4 py-2 rounded-md border transition ${
                                  isSelected
                                    ? "border-emerald-500 bg-emerald-50"
                                    : "border-slate-200 hover:border-slate-300"
                                } ${alreadyAnswered ? "opacity-75 cursor-not-allowed" : ""}`}
                              >
                                {option.option_text}
                              </button>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Response"
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Your Poll History
          </CardTitle>
          <CardDescription>
            Polls you have answered.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <p className="text-sm text-muted-foreground">No poll history found yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="py-2 pr-4">Poll</th>
                    <th className="py-2 pr-4">Answered Questions</th>
                    <th className="py-2 pr-4">Submitted On</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.pollId} className="border-b last:border-b-0">
                      <td className="py-3 pr-4 font-medium">{item.title}</td>
                      <td className="py-3 pr-4">{item.answeredQuestions}</td>
                      <td className="py-3 pr-4">{formatDateTime(item.submittedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
