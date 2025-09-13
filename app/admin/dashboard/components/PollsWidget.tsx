import { useState, useEffect } from "react";
import { Vote, MessageSquare, Clock, Bell, AlertTriangle, BarChart3, Users, Eye, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { WidgetCard } from "./StatCard";
import { PollManagement } from "./PollManagement";
import { getQuestions, saveResponse, getPollAnalytics, getEmployeeByUserId } from "@/app/api/api";
import { toast } from "sonner";
import { format, isAfter, isBefore } from "date-fns";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, PieChart, Pie, Cell } from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface EnhancedUserResponse {
  user_id: string;
  employee_name?: string;
  department?: string;
  selected_options: string[];
  response_text?: string;
  response_rating?: number;
  submitted_at: string;
}

// Separate component for employee responses to handle async operations
function EmployeeResponsesList({ 
  userResponses, 
  optionsBreakdown = [] 
}: { 
  userResponses: any[]; 
  optionsBreakdown?: any[]; 
}) {
  const [enrichedResponses, setEnrichedResponses] = useState<EnhancedUserResponse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const enrichResponses = async () => {
      if (!userResponses.length) {
        setLoading(false);
        return;
      }

      try {
        const enriched = await Promise.all(
          userResponses.map(async (response) => {
            try {
              const empResponse = await getEmployeeByUserId(response.user_id);
              return {
                ...response,
                employee_name: empResponse.data?.name || empResponse.data?.full_name || 'Unknown Employee',
                department: empResponse.data?.department?.name || 'Unknown Department'
              };
            } catch (error) {
              return {
                ...response,
                employee_name: `User ${response.user_id.slice(-8)}`,
                department: 'Unknown'
              };
            }
          })
        );
        setEnrichedResponses(enriched);
      } catch (error) {
        console.error('Failed to enrich responses:', error);
      } finally {
        setLoading(false);
      }
    };

    enrichResponses();
  }, [userResponses]);

  if (loading) {
    return <div className="text-sm text-gray-500">Loading employee details...</div>;
  }

  if (!enrichedResponses.length) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Individual Employee Responses:</h4>
      <div className="max-h-48 overflow-y-auto space-y-1">
        {enrichedResponses.map((response: EnhancedUserResponse, index: number) => (
          <div key={index} className="text-xs p-2 bg-blue-50 rounded">
            <div className="font-medium text-blue-800">
              {response.employee_name} ({response.department})
            </div>
            {response.selected_options?.length > 0 && (
              <div className="text-gray-700">
                Selected: {response.selected_options.map((optionId: string) => {
                  const option = optionsBreakdown.find((o: any) => o.option_id === optionId);
                  return option?.option_text || optionId;
                }).join(', ')}
              </div>
            )}
            {response.response_text && (
              <div className="text-gray-700 italic">"{response.response_text}"</div>
            )}
            {response.response_rating && (
              <div className="text-gray-700">Rating: {response.response_rating}/5</div>
            )}
            <div className="text-gray-500">
              {format(new Date(response.submitted_at), 'MMM dd, yyyy HH:mm')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Analytics Modal Component
function PollAnalyticsModal({ 
  open, 
  onClose, 
  pollId, 
  pollTitle 
}: { 
  open: boolean; 
  onClose: () => void; 
  pollId: string; 
  pollTitle: string; 
}) {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && pollId) {
      loadAnalytics();
    }
  }, [open, pollId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await getPollAnalytics(pollId);
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to load analytics:', error);
      toast.error('Failed to load poll analytics');
    } finally {
      setLoading(false);
    }
  };

  const renderQuestionAnalytics = (question: any) => {
    if (question.question_type === 'single_choice' || question.question_type === 'multiple_choice') {
      const chartData = question.options_breakdown?.map((option: any) => ({
        name: option.option_text,
        value: option.count,
        percentage: option.percentage
      })) || [];

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Bar Chart */}
            <div className="h-48">
              <h4 className="text-sm font-medium mb-2">Response Distribution</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="h-48">
              <h4 className="text-sm font-medium mb-2">Percentage Breakdown</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={60}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ percentage }) => `${percentage}%`}
                  >
                    {chartData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Options Summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Detailed Breakdown:</h4>
            {question.options_breakdown?.map((option: any) => (
              <div key={option.option_id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <span className="text-sm">{option.option_text}</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{option.count} votes</Badge>
                  <Badge variant="outline">{option.percentage}%</Badge>
                </div>
              </div>
            ))}
          </div>

          {/* Individual Employee Responses */}
          <EmployeeResponsesList 
            userResponses={question.user_responses || []} 
            optionsBreakdown={question.options_breakdown || []} 
          />
        </div>
      );
    }

    // For text/rating questions
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-4">
          <Badge variant="secondary">{question.total_responses} responses</Badge>
        </div>
        <EmployeeResponsesList userResponses={question.user_responses || []} />
      </div>
    );
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Poll Analytics: {pollTitle}
          </DialogTitle>
          <DialogDescription>
            Detailed response analytics and employee feedback
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">
            <div className="text-gray-500">Loading analytics...</div>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="space-y-1">
                <div className="text-2xl font-bold text-blue-600">
                  {analytics.total_responses}
                </div>
                <div className="text-xs text-gray-500">Total Responses</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-green-600">
                  {analytics.questions_analytics?.length || 0}
                </div>
                <div className="text-xs text-gray-500">Questions</div>
              </div>
              <div className="space-y-1">
                <div className="text-2xl font-bold text-orange-600">
                  {analytics.response_rate}%
                </div>
                <div className="text-xs text-gray-500">Response Rate</div>
              </div>
            </div>

            {/* Questions Analytics */}
            {analytics.questions_analytics?.map((question: any) => (
              <div key={question.question_id} className="space-y-3 border-t pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-sm">{question.question_text}</h3>
                  <Badge variant="secondary">
                    {question.total_responses} responses
                  </Badge>
                </div>
                {renderQuestionAnalytics(question)}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            Failed to load analytics
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Main PollWidget Component
export function PollWidget({ polls, currentUser, onPollUpdate }: { polls: any[]; currentUser: any; onPollUpdate: () => void }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [responses, setResponses] = useState<{ [key: string]: string | string[] }>({});
  const [submitting, setSubmitting] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedPollForAnalytics, setSelectedPollForAnalytics] = useState<{id: string, title: string} | null>(null);

  const activePoll = polls.find(poll => {
    const now = new Date();
    const startTime = new Date(poll.start_time);
    const endTime = new Date(poll.end_time);
    return isAfter(now, startTime) && isBefore(now, endTime);
  });

  useEffect(() => {
    if (activePoll) {
      loadPollQuestions(activePoll.id);
    }
  }, [activePoll]);

  const loadPollQuestions = async (pollId: string) => {
    try {
      const response = await getQuestions(pollId);
      setQuestions(response.data || []);
    } catch (error) {
      setQuestions([]);
    }
  };

  const handleResponseSubmit = async () => {
    if (!activePoll || !currentUser) return;
    setSubmitting(true);
    try {
      for (const [questionId, response] of Object.entries(responses)) {
        if (!response) continue;
        const question = questions.find(q => q.id === questionId);
        if (!question) continue;
        const responseData = {
          poll_id: activePoll.id,
          question_id: questionId,
          user_id: currentUser.userId,
          option_ids: Array.isArray(response) ? response : [response],
          response_text: question.question_type === 'text' ? response : undefined,
          response_rating: question.question_type === 'rating' ? parseInt(response as string) : undefined,
        };
        await saveResponse(responseData);
      }
      setResponses({});
      toast.success('Response submitted successfully!');
      onPollUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  const handleShowAnalytics = (poll: any) => {
    setSelectedPollForAnalytics({ id: poll.id, title: poll.title });
    setShowAnalytics(true);
  };

  return (
    <>
      <WidgetCard>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Vote className="h-5 w-5 text-blue-500" />
              Active Polls
              {activePoll && (
                <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  Active
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {activePoll && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShowAnalytics(activePoll)}
                  className="flex items-center gap-1"
                >
                  <BarChart3 className="h-4 w-4" />
                  Analytics
                </Button>
              )}
              <PollManagement onPollCreated={onPollUpdate} currentUser={currentUser} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {activePoll ? (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg">{activePoll.title}</h3>
                <p className="text-sm opacity-70 mt-1">{activePoll.description}</p>
                <div className="flex items-center gap-2 mt-2 text-xs opacity-60">
                  <Clock className="h-3 w-3" />
                  <span>Ends: {format(new Date(activePoll.end_time), 'MMM dd, yyyy HH:mm')}</span>
                </div>
              </div>
              {questions.length > 0 ? (
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <div key={question.id || index} className="border rounded-lg p-3">
                      <p className="font-medium mb-3">{question.question_text}</p>
                      {question.question_type === 'single_choice' ? (
                        <RadioGroup value={responses[question.id] as string || ''}
                          onValueChange={(value) => setResponses(prev => ({ ...prev, [question.id]: value }))}>
                          {question.options?.map((option: any, optIndex: number) => (
                            <div key={optIndex} className="flex items-center space-x-2">
                              <RadioGroupItem value={option.id} id={`${question.id}-${optIndex}`} />
                              <Label htmlFor={`${question.id}-${optIndex}`}>{option.option_text}</Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : question.question_type === 'text' ? (
                        <Textarea placeholder="Enter your response..." value={responses[question.id] as string || ''}
                          onChange={(e) => setResponses(prev => ({ ...prev, [question.id]: e.target.value }))} />
                      ) : question.question_type === 'rating' ? (
                        <div className="flex items-center space-x-2">
                          {[1, 2, 3, 4, 5].map((rating) => (
                            <Button key={rating} type="button" size="sm"
                              variant={responses[question.id] === rating.toString() ? "default" : "outline"}
                              onClick={() => setResponses(prev => ({ ...prev, [question.id]: rating.toString() }))}>
                              {rating}
                            </Button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <Button onClick={handleResponseSubmit}
                    disabled={submitting || Object.keys(responses).length === 0} className="w-full">
                    {submitting ? 'Submitting...' : 'Submit Response'}
                  </Button>
                </div>
              ) : (
                <div className="text-center opacity-60 py-4">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  Loading poll questions...
                </div>
              )}
            </div>
          ) : (
            <div className="text-center opacity-60 py-8">
              <Vote className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No Active Polls</p>
              <p className="text-sm mt-1">Check back later for new polls</p>
              {polls.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs opacity-60 mb-2">Recent Polls:</p>
                  {polls.slice(0, 2).map((poll) => (
                    <div key={poll.id} className="text-xs bg-muted p-2 rounded mb-1 flex items-center justify-between">
                      <div>
                        <span className="font-medium">{poll.title}</span>
                        <span className="opacity-60 ml-2">
                          (Ended: {format(new Date(poll.end_time), 'MMM dd')})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShowAnalytics(poll)}
                        className="flex items-center gap-1 h-6 px-2"
                      >
                        <BarChart3 className="h-3 w-3" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </WidgetCard>

      {/* Analytics Modal */}
      {selectedPollForAnalytics && (
        <PollAnalyticsModal
          open={showAnalytics}
          onClose={() => {
            setShowAnalytics(false);
            setSelectedPollForAnalytics(null);
          }}
          pollId={selectedPollForAnalytics.id}
          pollTitle={selectedPollForAnalytics.title}
        />
      )}
    </>
  );
}
