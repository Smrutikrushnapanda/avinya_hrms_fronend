"use client";

import { useEffect, useState } from "react";
import api, {
  getDashboardStats,
  getEmployees,
  getDepartments,
  getUserActivities,
  getTodayAnomalies,
  getLeaveTypes,
  getActiveNotices,
  getPolls,
  getActivePoll,
  getPoll,
  getQuestions,
  saveResponse,
  createPoll,
  addQuestion,
  getPendingLeaves,
  getAttendanceByDate,
  getDailyStats,
  getCurrentTime,
  getProfile,
  getNotices,
  getEmployeeBirthdays,
} from "@/app/api/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, isAfter, isBefore, isToday, addDays } from "date-fns";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import {
  Users,
  UserCheck,
  Calendar,
  AlertTriangle,
  TrendingUp,
  Clock,
  Bell,
  Settings,
  Activity,
  PieChart,
  BarChart3,
  Eye,
  EyeOff,
  Vote,
  MessageSquare,
  CheckCircle,
  XCircle,
  Plus,
  Cake,
  Gift,
  PartyPopper,
  X,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";

// Widget Configuration
interface Widget {
  id: string;
  title: string;
  isEnabled: boolean;
  hasAPI: boolean;
  isImportant: boolean;
  category: 'stats' | 'charts' | 'activities' | 'notifications';
}

const DEFAULT_WIDGETS: Widget[] = [
  { id: 'dashboard-stats', title: 'Dashboard Statistics', isEnabled: true, hasAPI: true, isImportant: true, category: 'stats' },
  { id: 'employee-list', title: 'Employee Overview', isEnabled: true, hasAPI: true, isImportant: true, category: 'stats' },
  { id: 'attendance-today', title: 'Today\'s Attendance', isEnabled: true, hasAPI: true, isImportant: true, category: 'stats' },
  { id: 'leave-requests', title: 'Leave Requests', isEnabled: true, hasAPI: true, isImportant: true, category: 'activities' },
  { id: 'active-polls', title: 'Active Polls', isEnabled: true, hasAPI: true, isImportant: true, category: 'notifications' },
  { id: 'company-notices', title: 'Company Notices', isEnabled: true, hasAPI: true, isImportant: true, category: 'notifications' },
  { id: 'birthday-tracker', title: 'Birthday Tracker', isEnabled: true, hasAPI: true, isImportant: false, category: 'notifications' },
  { id: 'department-breakdown', title: 'Department Breakdown', isEnabled: true, hasAPI: true, isImportant: true, category: 'charts' },
  { id: 'attendance-trends', title: 'Attendance Trends', isEnabled: true, hasAPI: true, isImportant: false, category: 'charts' },
  { id: 'user-activities', title: 'Recent Activities', isEnabled: true, hasAPI: true, isImportant: false, category: 'activities' },
  { id: 'attendance-anomalies', title: 'Attendance Anomalies', isEnabled: true, hasAPI: true, isImportant: true, category: 'notifications' },
  { id: 'payroll-summary', title: 'Payroll Summary', isEnabled: false, hasAPI: false, isImportant: true, category: 'stats' },
  { id: 'performance-metrics', title: 'Performance Metrics', isEnabled: false, hasAPI: false, isImportant: false, category: 'charts' },
  { id: 'company-events', title: 'Company Events', isEnabled: false, hasAPI: false, isImportant: false, category: 'notifications' },
];

// Skeleton Components
function StatCardSkeleton() {

  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-6 w-6" />
        </div>
        <Skeleton className="h-3 w-24 mt-1" />
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-4 w-12" />
        </div>
      </CardContent>
    </Card>
  );
}

function WidgetCardSkeleton({ height = "h-48" }: { height?: string }) {
  return (
    <Card className={`${height}`}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-8" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </CardContent>
    </Card>
  );
}

// Components
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue"
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon?: any;
  trend?: number;
  color?: string;
}) {
  return (
    <Card className="h-full transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {Icon && <Icon className="h-6 w-6 opacity-60" />}
        </div>
        <CardDescription className="text-xs opacity-70">{subtitle}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="text-3xl font-bold">{value}</div>
          {trend !== undefined && (
            <div className={`flex items-center text-sm ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp className={`h-4 w-4 mr-1 ${trend < 0 ? 'rotate-180' : ''}`} />
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function WidgetCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <Card className={`transition-all hover:shadow-md ${className}`}>
      {children}
    </Card>
  );
}

// FIXED Poll Management Component
function PollManagement({ onPollCreated, currentUser }: { onPollCreated: () => void; currentUser: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pollData, setPollData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    is_anonymous: false,
  });
  const [questions, setQuestions] = useState<Array<{ text: string; type: string; options: string[] }>>([]);
  const [creating, setCreating] = useState(false);

  const addNewQuestion = () => {
    setQuestions([...questions, { text: '', type: 'single_choice', options: [''] }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], [field]: value };
    setQuestions(updated);
  };

  const addOption = (questionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options.push('');
    setQuestions(updated);
  };

  const updateOption = (questionIndex: number, optionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].options[optionIndex] = value;
    setQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const removeOption = (questionIndex: number, optionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].options = updated[questionIndex].options.filter((_, i) => i !== optionIndex);
    setQuestions(updated);
  };

  // FIXED handleCreatePoll function
  const handleCreatePoll = async () => {
    if (!pollData.title || !pollData.start_time || !pollData.end_time) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!currentUser?.userId) {
      toast.error('User not found. Please login again.');
      return;
    }

    setCreating(true);
    try {
      // Format questions according to CreatePollQuestionDto structure
      const formattedQuestions = questions
        .filter(q => q.text.trim())
        .map(question => ({
          text: question.text.trim(),
          questionType: question.type, // Use exact backend enum values
          options: question.type === 'single_choice' || question.type === 'multiple_choice'
            ? question.options.filter(opt => opt.trim())
            : []
        }));

      // Format poll data according to CreatePollDto structure
      const formattedPollData = {
        title: pollData.title.trim(),
        description: pollData.description.trim() || undefined,
        startTime: new Date(pollData.start_time).toISOString(),
        endTime: new Date(pollData.end_time).toISOString(),
        isAnonymous: pollData.is_anonymous,
        createdBy: currentUser.userId,
        questions: formattedQuestions,
      };

      console.log('Creating poll with formatted data:', formattedPollData);

      const pollResponse = await createPoll(formattedPollData);
      console.log('Poll created successfully:', pollResponse.data);

      toast.success('Poll created successfully!');
      onPollCreated();
      setIsOpen(false);

      // Reset form
      setPollData({ title: '', description: '', start_time: '', end_time: '', is_anonymous: false });
      setQuestions([]);

    } catch (error: any) {
      console.error('Error creating poll:', error);
      const errorMessage = error.response?.data?.message ||
        error.response?.data?.error ||
        'Failed to create poll';
      toast.error(errorMessage);
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Poll
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Poll</DialogTitle>
          <DialogDescription>
            Create a poll for employees to participate in
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="title">Poll Title *</Label>
              <Input
                id="title"
                value={pollData.title}
                onChange={(e) => setPollData({ ...pollData, title: e.target.value })}
                placeholder="Enter poll title"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={pollData.description}
                onChange={(e) => setPollData({ ...pollData, description: e.target.value })}
                placeholder="Enter poll description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time *</Label>
                <Input
                  id="start_time"
                  type="datetime-local"
                  value={pollData.start_time}
                  onChange={(e) => setPollData({ ...pollData, start_time: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="end_time">End Time *</Label>
                <Input
                  id="end_time"
                  type="datetime-local"
                  value={pollData.end_time}
                  onChange={(e) => setPollData({ ...pollData, end_time: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="anonymous"
                checked={pollData.is_anonymous}
                onCheckedChange={(checked) => setPollData({ ...pollData, is_anonymous: checked })}
              />
              <Label htmlFor="anonymous">Anonymous Poll</Label>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">Questions</Label>
              <Button type="button" size="sm" onClick={addNewQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </div>

            <div className="space-y-4">
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Input
                        placeholder="Enter question text"
                        value={question.text}
                        onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => removeQuestion(qIndex)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>

                    <Select
                      value={question.type}
                      onValueChange={(value) => updateQuestion(qIndex, 'type', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select question type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="single_choice">Single Choice</SelectItem>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="text">Text Response</SelectItem>
                        <SelectItem value="rating">Rating</SelectItem>
                      </SelectContent>
                    </Select>

                    {(question.type === 'single_choice' || question.type === 'multiple_choice') && (
                      <div className="ml-4">
                        <div className="flex items-center justify-between mb-2">
                          <Label className="text-sm font-medium">Options</Label>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => addOption(qIndex)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Option
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {question.options.map((option, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2">
                              <Input
                                placeholder={`Option ${oIndex + 1}`}
                                value={option}
                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                                className="flex-1"
                              />
                              {question.options.length > 1 && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => removeOption(qIndex, oIndex)}
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {questions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Vote className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No questions added yet</p>
                <p className="text-sm">Click "Add Question" to get started</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleCreatePoll}
            disabled={creating || !pollData.title || !pollData.start_time || !pollData.end_time}
          >
            {creating ? 'Creating...' : 'Create Poll'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Poll Response Component (FIXED)
function PollWidget({ polls, currentUser, onPollUpdate }: { polls: any[]; currentUser: any; onPollUpdate: () => void }) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [responses, setResponses] = useState<{ [key: string]: string | string[] }>({});
  const [submitting, setSubmitting] = useState(false);

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
      console.error('Error loading poll questions:', error);
      setQuestions([]);
    }
  };

  const handleResponseSubmit = async () => {
    if (!activePoll || !currentUser) return;

    setSubmitting(true);
    try {
      // Format responses according to backend structure
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
      console.error('Error submitting poll response:', error);
      toast.error(error.response?.data?.message || 'Failed to submit response');
    } finally {
      setSubmitting(false);
    }
  };

  return (
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
          <PollManagement onPollCreated={onPollUpdate} currentUser={currentUser} />
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
                      <RadioGroup
                        value={responses[question.id] as string || ''}
                        onValueChange={(value) =>
                          setResponses(prev => ({ ...prev, [question.id]: value }))
                        }
                      >
                        {question.options?.map((option: any, optIndex: number) => (
                          <div key={optIndex} className="flex items-center space-x-2">
                            <RadioGroupItem value={option.id} id={`${question.id}-${optIndex}`} />
                            <Label htmlFor={`${question.id}-${optIndex}`}>{option.option_text}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    ) : question.question_type === 'text' ? (
                      <Textarea
                        placeholder="Enter your response..."
                        value={responses[question.id] as string || ''}
                        onChange={(e) =>
                          setResponses(prev => ({ ...prev, [question.id]: e.target.value }))
                        }
                      />
                    ) : question.question_type === 'rating' ? (
                      <div className="flex items-center space-x-2">
                        {[1, 2, 3, 4, 5].map((rating) => (
                          <Button
                            key={rating}
                            type="button"
                            size="sm"
                            variant={responses[question.id] === rating.toString() ? "default" : "outline"}
                            onClick={() => setResponses(prev => ({ ...prev, [question.id]: rating.toString() }))}
                          >
                            {rating}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}

                <Button
                  onClick={handleResponseSubmit}
                  disabled={submitting || Object.keys(responses).length === 0}
                  className="w-full"
                >
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
                  <div key={poll.id} className="text-xs bg-muted p-2 rounded mb-1">
                    <span className="font-medium">{poll.title}</span>
                    <span className="opacity-60 ml-2">
                      (Ended: {format(new Date(poll.end_time), 'MMM dd')})
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </WidgetCard>
  );
}

// Notice Component
function NoticeWidget({ notices }: { notices: any[] }) {
  const activeNotices = notices.filter(notice => {
    const now = new Date();
    const startTime = new Date(notice.start_at);
    const endTime = new Date(notice.end_at);
    return isAfter(now, startTime) && isBefore(now, endTime);
  });

  const getNoticeIcon = (type: string) => {
    switch (type) {
      case 'wish':
        return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'info':
        return <Bell className="h-4 w-4 text-blue-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <Bell className="h-4 w-4 opacity-60" />;
    }
  };

  return (
    <WidgetCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-500" />
          Company Notices
          {activeNotices.length > 0 && (
            <Badge variant="secondary">
              {activeNotices.length}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {activeNotices.length > 0 ? (
            activeNotices.map((notice) => (
              <div key={notice.id} className="p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  {getNoticeIcon(notice.type)}
                  <div className="flex-1">
                    <h4 className="font-semibold text-sm">{notice.title}</h4>
                    <p className="text-sm opacity-70 mt-1">{notice.message}</p>

                    {notice.bg_image_url && (
                      <div className="mt-3">
                        <img
                          src={notice.bg_image_url}
                          alt={notice.title}
                          className="w-full h-32 object-cover rounded-lg"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-3 text-xs opacity-60">
                      <span>Valid until: {format(new Date(notice.end_at), 'MMM dd, yyyy')}</span>
                      <Badge variant="outline" className="text-xs">
                        {notice.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center opacity-60 py-8">
              <Bell className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">No Active Notices</p>
              <p className="text-sm mt-1">All caught up!</p>

              {notices.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs opacity-60 mb-2">Recent Notices:</p>
                  {notices.slice(0, 2).map((notice) => (
                    <div key={notice.id} className="text-xs bg-muted p-2 rounded mb-1">
                      <span className="font-medium">{notice.title}</span>
                      <span className="opacity-60 ml-2">
                        (Expired: {format(new Date(notice.end_at), 'MMM dd')})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </WidgetCard>
  );
}

// Birthday Widget
function BirthdayWidget({ organizationId }: { organizationId: string }) {
  const [birthdays, setBirthdays] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBirthdays();
  }, [organizationId]);

  const loadBirthdays = async () => {
    try {
      setLoading(true);
      const response = await getEmployeeBirthdays(organizationId);
      setBirthdays(response.data || []);
    } catch (error) {
      console.error('Error loading birthdays:', error);
    } finally {
      setLoading(false);
    }
  };

  const today = new Date();
  const todayBirthdays = birthdays.filter(person => {
    const birthDate = new Date(person.date);
    return (
      birthDate.getDate() === today.getDate() &&
      birthDate.getMonth() === today.getMonth()
    );
  });

  const upcomingBirthdays = birthdays
    .filter(person => {
      const birthDate = new Date(person.date);
      const thisYear = today.getFullYear();
      const birthdayThisYear = new Date(thisYear, birthDate.getMonth(), birthDate.getDate());

      if (birthdayThisYear < today) {
        birthdayThisYear.setFullYear(thisYear + 1);
      }

      const daysDiff = Math.ceil((birthdayThisYear.getTime() - today.getTime()) / (1000 * 3600 * 24));
      return daysDiff > 0 && daysDiff <= 30;
    })
    .slice(0, 5);

  if (loading) {
    return (
      <WidgetCard>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cake className="h-5 w-5 text-pink-500" />
            Birthday Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        </CardContent>
      </WidgetCard>
    );
  }

  return (
    <WidgetCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cake className="h-5 w-5 text-pink-500" />
          Birthday Tracker
          {todayBirthdays.length > 0 && (
            <Badge variant="secondary" className="bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200">
              {todayBirthdays.length} Today
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {todayBirthdays.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
                <PartyPopper className="h-4 w-4 text-pink-500" />
                Today's Birthdays
              </h4>
              <div className="space-y-2">
                {todayBirthdays.map((person) => (
                  <div key={person.id} className="flex items-center gap-3 p-3 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={person.avatar || ''} />
                      <AvatarFallback className="bg-pink-200 text-pink-800">
                        {person.name.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{person.name}</div>
                      <div className="text-xs opacity-70">{person.department}</div>
                    </div>
                    <Cake className="h-4 w-4 text-pink-500" />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Gift className="h-4 w-4 text-blue-500" />
              Upcoming Birthdays
            </h4>
            {upcomingBirthdays.length > 0 ? (
              <div className="space-y-2">
                {upcomingBirthdays.map((person) => {
                  const birthDate = new Date(person.date);
                  const thisYear = new Date().getFullYear();
                  const birthdayThisYear = new Date(thisYear, birthDate.getMonth(), birthDate.getDate());

                  if (birthdayThisYear < new Date()) {
                    birthdayThisYear.setFullYear(thisYear + 1);
                  }

                  return (
                    <div key={person.id} className="flex items-center gap-3 p-2 border rounded-lg">
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={person.avatar || ''} />
                        <AvatarFallback className="text-xs">
                          {person.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{person.name}</div>
                        <div className="text-xs opacity-70">{person.department}</div>
                      </div>
                      <div className="text-right text-xs opacity-70">
                        <div>{format(birthdayThisYear, 'MMM dd')}</div>
                        <div>{format(birthdayThisYear, 'EEE')}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center opacity-60 py-4">
                <Cake className="h-8 w-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No upcoming birthdays</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </WidgetCard>
  );
}

// Main Dashboard Component
export default function HRDashboardPage() {
  const { theme } = useTheme();

  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS);
  const [showWidgetSettings, setShowWidgetSettings] = useState(false);

  const [stats, setStats] = useState<any>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [anomalies, setAnomalies] = useState<any[]>([]);
  const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [attendanceToday, setAttendanceToday] = useState<any>(null);
  const [dailyStats, setDailyStats] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const organizationId = "24facd21-265a-4edd-8fd1-bc69a036f755";

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const results = await Promise.allSettled([
        getDashboardStats(),
        getEmployees(organizationId),
        getDepartments(organizationId),
        getUserActivities({ limit: 10 }),
        getTodayAnomalies(),
        getLeaveTypes(organizationId),
        getNotices(),
        getPolls(),
        getAttendanceByDate({ organizationId, date: format(new Date(), 'yyyy-MM-dd') }),
        getDailyStats({ organizationId }),
        getProfile(),
      ]);

      const [
        statsRes, employeesRes, departmentsRes, activitiesRes,
        anomaliesRes, leaveTypesRes, noticesRes, pollsRes,
        attendanceRes, dailyStatsRes, profileRes
      ] = results;

      setStats(statsRes.status === 'fulfilled' ? statsRes.value.data : null);
      setEmployees(employeesRes.status === 'fulfilled' ? employeesRes.value.data || [] : []);
      setDepartments(departmentsRes.status === 'fulfilled' ? departmentsRes.value.data || [] : []);
      setActivities(activitiesRes.status === 'fulfilled' ? activitiesRes.value.data?.data || [] : []);
      setAnomalies(anomaliesRes.status === 'fulfilled' ? anomaliesRes.value.data || [] : []);
      setLeaveTypes(leaveTypesRes.status === 'fulfilled' ? leaveTypesRes.value.data || [] : []);
      setNotices(noticesRes.status === 'fulfilled' ? noticesRes.value.data || [] : []);
      setPolls(pollsRes.status === 'fulfilled' ? pollsRes.value.data || [] : []);
      setAttendanceToday(attendanceRes.status === 'fulfilled' ? attendanceRes.value.data : null);
      setDailyStats(dailyStatsRes.status === 'fulfilled' ? dailyStatsRes.value.data : null);
      setCurrentUser(profileRes.status === 'fulfilled' ? profileRes.value.data : null);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleWidget = (widgetId: string) => {
    setWidgets(prev => prev.map(widget =>
      widget.id === widgetId
        ? { ...widget, isEnabled: !widget.isEnabled }
        : widget
    ));
  };

  const isWidgetEnabled = (widgetId: string) => {
    return widgets.find(w => w.id === widgetId)?.isEnabled || false;
  };

  const handlePollUpdate = () => {
    getPolls().then(response => {
      setPolls(response.data || []);
    }).catch(console.error);
  };

  const departmentData = departments.map(dept => ({
    name: dept.name,
    employees: employees.filter(emp => emp.departmentId === dept.id).length,
  }));

  const attendanceBreakdown = stats?.attendanceBreakdown || { present: 0, halfDay: 0, absent: 0 };
  const attendanceChartData = [
    { name: 'Present', value: attendanceBreakdown.present, color: '#10b981' },
    { name: 'Half Day', value: attendanceBreakdown.halfDay, color: '#f59e0b' },
    { name: 'Absent', value: attendanceBreakdown.absent, color: '#ef4444' },
  ];

  // const [currentTime, setCurrentTime] = useState(new Date());

  // // useEffect(() => {
  // //   const timer = setInterval(() => {
  // //     setCurrentTime(new Date());
  // //   }, 1000);

  // //   return () => clearInterval(timer);
  // // }, []);

function LiveClock() {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  const tick = () => {
    setCurrentTime(new Date());
    setTimeout(tick, 1000);
  };

  setTimeout(tick, 1000);

  return (
    <div className="text-sm font-medium">
      {format(currentTime, 'MMM dd, yyyy HH:mm:ss')}
    </div>
  );
}



  if (loading) {
    return (
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-3">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-5 w-40" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
          <WidgetCardSkeleton height="h-64" />
          <WidgetCardSkeleton height="h-64" />
          <WidgetCardSkeleton height="h-64" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <WidgetCardSkeleton height="h-80" />
          <WidgetCardSkeleton height="h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Dashboard Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-5">
          <h1 className="text-2xl font-bold border-r pr-5">Dashboard</h1>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <LiveClock />
            </div>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowWidgetSettings(!showWidgetSettings)}
          className="flex items-center gap-2"
        >
          <Settings className="h-4 w-4" />
          Manage Widgets
        </Button>
      </div>

      {/* Widget Settings Panel */}
      {showWidgetSettings && (
        <Card className="mb-6 border-2 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Widget Management
            </CardTitle>
            <CardDescription>
              Enable/disable widgets based on your needs. Widgets marked as "Important" are recommended for HR operations.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {widgets.map((widget) => (
                <div key={widget.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={widget.isEnabled}
                      onCheckedChange={() => toggleWidget(widget.id)}
                      disabled={!widget.hasAPI && widget.isImportant}
                    />
                    <div>
                      <div className="font-medium text-sm">{widget.title}</div>
                      <div className="flex items-center gap-2 mt-1">
                        {widget.hasAPI ? (
                          <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                            API Ready
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            Coming Soon
                          </Badge>
                        )}
                        {widget.isImportant && (
                          <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            Important
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  {widget.isEnabled ? (
                    <Eye className="h-4 w-4 text-green-600" />
                  ) : (
                    <EyeOff className="h-4 w-4 opacity-40" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Key Statistics */}
      {isWidgetEnabled('dashboard-stats') && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Total Employees"
            value={stats.totalEmployees?.value || 0}
            subtitle="Active workforce"
            icon={Users}
            trend={stats.totalEmployees?.change}
            color="blue"
          />
          <StatCard
            title="Present Today"
            value={stats.presentToday?.value || 0}
            subtitle="Currently in office"
            icon={UserCheck}
            trend={stats.presentToday?.change}
            color="green"
          />
          <StatCard
            title="On Leave"
            value={stats.onLeaveToday?.value || 0}
            subtitle="Approved leave today"
            icon={Calendar}
            color="orange"
          />
          <StatCard
            title="Pending Requests"
            value={stats.pendingLeaveRequests?.value || 0}
            subtitle="Awaiting approval"
            icon={Clock}
            color="purple"
          />
        </div>
      )}

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {isWidgetEnabled('attendance-today') && (
          <WidgetCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Today's Attendance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <RechartsPieChart>
                  <Pie
                    data={attendanceChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {attendanceChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </RechartsPieChart>
              </ResponsiveContainer>
            </CardContent>
          </WidgetCard>
        )}

        {isWidgetEnabled('department-breakdown') && (
          <WidgetCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Department Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={departmentData}>
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis allowDecimals={false} fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="employees" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </WidgetCard>
        )}

        {isWidgetEnabled('user-activities') && (
          <WidgetCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activities
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {activities.length > 0 ? activities.slice(0, 5).map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-2 border-b last:border-b-0">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="text-sm font-medium">{activity.action || 'Activity'}</div>
                      <div className="text-xs opacity-70">{activity.details || 'No details available'}</div>
                      <div className="text-xs opacity-50">
                        {activity.timestamp ? format(new Date(activity.timestamp), 'MMM dd, HH:mm') : 'Recently'}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center opacity-60 py-4">No recent activities</div>
                )}
              </div>
            </CardContent>
          </WidgetCard>
        )}
      </div>

      {/* Polls, Notices, and Birthday Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        {isWidgetEnabled('active-polls') && (
          <PollWidget polls={polls} currentUser={currentUser} onPollUpdate={handlePollUpdate} />
        )}

        {isWidgetEnabled('company-notices') && (
          <NoticeWidget notices={notices} />
        )}

        {isWidgetEnabled('birthday-tracker') && (
          <BirthdayWidget organizationId={organizationId} />
        )}
      </div>

      {/* Notifications & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {isWidgetEnabled('attendance-anomalies') && (
          <WidgetCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                Attendance Anomalies
                {anomalies.length > 0 && (
                  <Badge variant="destructive" className="ml-2">{anomalies.length}</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {anomalies.length > 0 ? anomalies.map((anomaly, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-1" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{anomaly.anomalyReason || 'Attendance Anomaly'}</div>
                      <div className="text-xs opacity-70">
                        Employee ID: {anomaly.employeeId || 'Unknown'}
                      </div>
                      <div className="text-xs opacity-50">
                        {format(new Date(anomaly.timestamp), 'MMM dd, HH:mm')}
                      </div>
                    </div>
                  </div>
                )) : (
                  <div className="text-center opacity-60 py-4">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No anomalies detected today
                  </div>
                )}
              </div>
            </CardContent>
          </WidgetCard>
        )}
      </div>

      {/* Quick Actions */}
      <WidgetCard className="mb-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common HR tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Users className="h-6 w-6" />
              <span className="text-xs">Add Employee</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Calendar className="h-6 w-6" />
              <span className="text-xs">Leave Requests</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Clock className="h-6 w-6" />
              <span className="text-xs">Attendance</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Bell className="h-6 w-6" />
              <span className="text-xs">Send Notice</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Vote className="h-6 w-6" />
              <span className="text-xs">Create Poll</span>
            </Button>
            <Button variant="outline" className="h-20 flex flex-col gap-2">
              <Settings className="h-6 w-6" />
              <span className="text-xs">Settings</span>
            </Button>
          </div>
        </CardContent>
      </WidgetCard>
    </div>
  );
}
