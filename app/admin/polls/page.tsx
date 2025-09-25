"use client";

import { useState, useEffect } from "react";
import { Vote, Users, Clock, ChevronRight, Calendar, User, MessageCircle, BarChart3, Eye, X, Plus } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isAfter, isBefore, formatDistanceToNow } from "date-fns";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RechartsTooltip } from "recharts";
import { getPollsSummary, getPollAnalytics, getEmployeeByUserId, createPoll } from "@/app/api/api";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

// TypeScript interfaces
interface Poll {
  id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  is_anonymous: boolean;
  total_responses: number;
  is_active: boolean;
  created_by: string;
  created_by_name: string;
  created_at: string;
  questions: number;
}

interface UserResponse {
  user_id: string;
  employee_name: string;
  selected_options: string[];
  response_text?: string;
  response_rating?: number;
  submitted_at: Date;
}

interface OptionBreakdown {
  option_id: string;
  option_text: string;
  count: number;
  percentage: number;
}

interface QuestionAnalytics {
  question_id: string;
  question_text: string;
  question_type: string;
  total_responses: number;
  options_breakdown: OptionBreakdown[];
  user_responses: UserResponse[];
}

interface EmployeeTooltipProps {
  userIds: string[];
  employeeNames: string[];
  children: React.ReactNode;
}

interface RespondentsListModalProps {
  isOpen: boolean;
  onClose: () => void;
  optionText: string;
  respondents: { user_id: string; employee_name: string }[];
}

function RespondentsListModal({ isOpen, onClose, optionText, respondents }: RespondentsListModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-lg font-semibold text-gray-900 pr-6">
            Respondents for "{optionText}"
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden mt-4">
          {respondents.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No respondents for this option</p>
            </div>
          ) : (
            <div className="h-full">
              <div className="text-sm text-gray-600 mb-4">
                Total: {respondents.length} respondent{respondents.length !== 1 ? 's' : ''}
              </div>
              <ScrollArea className="h-full pr-2">
                <div className="space-y-3">
                  {respondents.map((respondent, index) => (
                    <div
                      key={respondent.user_id}
                      className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100 transition-all duration-300 hover:shadow-md hover:scale-[1.02]"
                      style={{
                        animationDelay: `${index * 50}ms`,
                        animation: `slideInFromLeft 0.4s ease-out forwards`
                      }}
                    >
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                        <User className="h-5 w-5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{respondent.employee_name}</p>
                        <p className="text-xs text-gray-500">ID: {respondent.user_id.slice(-8)}</p>
                      </div>
                      <div className="flex-shrink-0">
                        <Badge variant="outline" className="text-xs">
                          #{index + 1}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmployeeTooltip({ userIds, employeeNames, children }: EmployeeTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs">
            <div>
              <div className="font-medium mb-1">Respondents ({userIds.length}):</div>
              <div className="text-sm">
                {employeeNames.slice(0, 3).join(', ')}
                {employeeNames.length > 3 && ` +${employeeNames.length - 3} more`}
              </div>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Loading Skeleton Components
function PollListSkeleton() {
  return (
    <Card className="shadow-sm h-[calc(100vh-150px)] flex flex-col">
      <CardHeader className="pb-4 flex-shrink-0">
        <CardTitle className="flex items-center gap-2">
          <Skeleton className="h-6 w-6 rounded" />
          <Skeleton className="h-7 w-24" />
          <Skeleton className="h-5 w-8 ml-auto rounded-full" />
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="p-5 border border-gray-200 rounded-xl">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="flex items-center gap-6">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-5 w-5" />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function QuestionCardSkeleton() {
  return (
    <Card className="mb-6 shadow-sm border border-gray-200">
      <CardContent className="p-8">
        <Skeleton className="h-6 w-80 mb-8" />
        
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-5 w-16" />
                  <Skeleton className="h-5 w-12" />
                </div>
              </div>
              
              <div className="divide-y divide-gray-100">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="px-6 py-4">
                    <div className="grid grid-cols-2 gap-4 items-center">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-4 h-4 rounded-full" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center">
            <Skeleton className="h-6 w-48 mb-6" />
            <Skeleton className="w-80 h-80 rounded-full" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

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
      const formattedQuestions = questions
        .filter(q => q.text.trim())
        .map(question => ({
          text: question.text.trim(),
          questionType: question.type,
          options: question.type === 'single_choice' || question.type === 'multiple_choice'
            ? question.options.filter(opt => opt.trim())
            : []
        }));

      const formattedPollData = {
        title: pollData.title.trim(),
        description: pollData.description.trim() || undefined,
        startTime: new Date(pollData.start_time).toISOString(),
        endTime: new Date(pollData.end_time).toISOString(),
        isAnonymous: pollData.is_anonymous,
        createdBy: currentUser.userId,
        questions: formattedQuestions,
      };

      await createPoll(formattedPollData);
      toast.success('Poll created successfully!');
      onPollCreated();
      setIsOpen(false);
      setPollData({ title: '', description: '', start_time: '', end_time: '', is_anonymous: false });
      setQuestions([]);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to create poll');
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
          <DialogDescription>Create a poll for employees to participate in</DialogDescription>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="title">Poll Title *</Label>
              <Input id="title" value={pollData.title}
                onChange={(e) => setPollData({ ...pollData, title: e.target.value })}
                placeholder="Enter poll title" />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={pollData.description}
                onChange={(e) => setPollData({ ...pollData, description: e.target.value })}
                placeholder="Enter poll description" rows={3} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start_time">Start Time *</Label>
                <Input id="start_time" type="datetime-local" value={pollData.start_time}
                  onChange={(e) => setPollData({ ...pollData, start_time: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="end_time">End Time *</Label>
                <Input id="end_time" type="datetime-local" value={pollData.end_time}
                  onChange={(e) => setPollData({ ...pollData, end_time: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="anonymous" checked={pollData.is_anonymous}
                onCheckedChange={(checked) => setPollData({ ...pollData, is_anonymous: checked })} />
              <Label htmlFor="anonymous">Anonymous Poll</Label>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-semibold">Questions</Label>
              <Button type="button" size="sm" onClick={addNewQuestion}>
                <Plus className="h-4 w-4 mr-2" />Add Question
              </Button>
            </div>
            <div className="space-y-4">
              {questions.map((question, qIndex) => (
                <div key={qIndex} className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                  <div className="space-y-3">
                    <div className="flex items-start gap-2">
                      <Input placeholder="Enter question text" value={question.text}
                        onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)} className="flex-1" />
                      <Button type="button" size="sm" variant="destructive"
                        onClick={() => removeQuestion(qIndex)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Select value={question.type}
                      onValueChange={(value) => updateQuestion(qIndex, 'type', value)}>
                      <SelectTrigger><SelectValue placeholder="Select question type" /></SelectTrigger>
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
                          <Button type="button" size="sm" variant="outline"
                            onClick={() => addOption(qIndex)}>
                            <Plus className="h-3 w-3 mr-1" />Add Option
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {question.options.map((option, oIndex) => (
                            <div key={oIndex} className="flex items-center gap-2">
                              <Input placeholder={`Option ${oIndex + 1}`} value={option}
                                onChange={(e) => updateOption(qIndex, oIndex, e.target.value)} className="flex-1" />
                              {question.options.length > 1 && (
                                <Button type="button" size="sm" variant="outline"
                                  onClick={() => removeOption(qIndex, oIndex)}>
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
          <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
          <Button onClick={handleCreatePoll}
            disabled={creating || !pollData.title || !pollData.start_time || !pollData.end_time}>
            {creating ? 'Creating...' : 'Create Poll'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PollsPage({ currentUser }: { currentUser: any }) {
  const [allPolls, setAllPolls] = useState<Poll[]>([]);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [pollAnalytics, setPollAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [selectedRespondents, setSelectedRespondents] = useState<{ user_id: string; employee_name: string }[]>([]);
  const [selectedOptionText, setSelectedOptionText] = useState("");
  const [respondentsModalOpen, setRespondentsModalOpen] = useState(false);

  useEffect(() => {
    fetchPolls();
  }, []);

  const fetchPolls = async () => {
    try {
      setLoading(true);
      const response = await getPollsSummary();
      const polls = response.data || [];
      
      // Sort polls: Active first, then by creation date
      const sortedPolls = polls.sort((a: Poll, b: Poll) => {
        if (a.is_active && !b.is_active) return -1;
        if (!a.is_active && b.is_active) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
      
      setAllPolls(sortedPolls);
    } catch (error) {
      console.error('Failed to fetch polls:', error);
      toast.error('Failed to load polls');
    } finally {
      setLoading(false);
    }
  };

  const handlePollClick = async (poll: Poll) => {
    setSelectedPoll(poll);
    setDrawerOpen(true);
    setAnalyticsLoading(true);
    
    try {
      const response = await getPollAnalytics(poll.id);
      setPollAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch poll analytics:', error);
      toast.error('Failed to load poll analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleViewRespondents = (optionText: string, respondents: { user_id: string; employee_name: string }[]) => {
    setSelectedOptionText(optionText);
    setSelectedRespondents(respondents);
    setRespondentsModalOpen(true);
  };

  const getStatusBadge = (poll: Poll) => {
    if (poll.is_active) {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-300">
          Active
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-gray-600 border-gray-300">
          Inactive
        </Badge>
      );
    }
  };

  const renderPollCard = (poll: Poll) => (
    <div
      key={poll.id}
      className="group p-5 border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 cursor-pointer transition-all duration-200 flex items-center"
      onClick={() => handlePollClick(poll)}
    >
      <div className="flex flex-col flex-1 min-w-0">
        <div className="text-base font-semibold text-gray-900 truncate">
          {poll.title}
        </div>

        <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-700">
          {/* Responses */}
          <span className="flex items-center" title="Total responses">
            <Users className="h-4 w-4 mr-1" />
            <span className="font-medium">{poll.total_responses}</span> responses
          </span>

          {/* Questions */}
          <span className="flex items-center" title="Number of questions">
            <MessageCircle className="h-4 w-4 mr-1" />
            {poll.questions || 0} questions
          </span>

          {/* Created By */}
          <span className="flex items-center" title="Created by">
            <User className="h-4 w-4 mr-1" />
            Created by {poll.created_by_name || 'Unknown'}
          </span>

          {/* Start Time */}
          <span className="flex items-center" title="Start time">
            <Calendar className="h-4 w-4 mr-1" />
            {format(new Date(poll.start_time), "MMM dd, yyyy, hh:mm a")}
          </span>

          {/* End Time */}
          <span className="flex items-center" title="End time">
            <Calendar className="h-4 w-4 mr-1" />
            {format(new Date(poll.end_time), "MMM dd, yyyy, hh:mm a")}
          </span>

          {/* Anonymous */}
          <span className="flex items-center" title="Anonymous">
            <span className="font-medium">Anonymous:</span>
            <span className="ml-1">{poll.is_anonymous ? 'Yes' : 'No'}</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end min-w-fit border-l border-dashed border-gray-200 pl-4 h-16 justify-center ml-4">
        <div className="flex flex-col items-center space-y-2">
          {poll.is_active ? (
            <Badge className="bg-green-100 text-green-700 border-green-300">
              Active
            </Badge>
          ) : (
            <Badge variant="outline" className="text-gray-600 border-gray-300">
              Inactive
            </Badge>
          )}
          <ChevronRight className="h-5 w-5 text-gray-400 opacity-80 group-hover:text-blue-600 transition-opacity" />
        </div>
      </div>
    </div>
  );

  const renderQuestionCard = (question: QuestionAnalytics) => {
    if (question.question_type !== 'single_choice' && question.question_type !== 'multiple_choice') {
      return (
        <Card key={question.question_id} className="mb-6 shadow-sm border-l-4 border-l-gray-400">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg text-gray-900 mb-4">{question.question_text}</h3>
            <div className="text-center py-8 text-gray-500">
              <Badge variant="secondary" className="text-base px-3 py-1">
                {question.total_responses} responses
              </Badge>
              <p className="text-sm mt-3">Text/Rating responses - no chart available</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    const chartData = question.options_breakdown?.map((option: OptionBreakdown, index: number) => ({
      name: option.option_text,
      value: option.count,
      color: COLORS[index % COLORS.length]
    })) || [];

    return (
      <Card key={question.question_id} className="mb-6 shadow-sm border border-gray-200">
        <CardContent className="p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-semibold text-xl text-gray-900">{question.question_text}</h3>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                <BarChart3 className="h-3 w-3 mr-1" />
                {question.total_responses} responses
              </Badge>
            </div>
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Left side - Options and Votes */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="font-semibold text-gray-800">Options</div>
                    <div className="font-semibold text-gray-800 text-center">Votes</div>
                    <div className="font-semibold text-gray-800 text-center">Actions</div>
                  </div>
                </div>
                
                <div className="divide-y divide-gray-100">
                  {question.options_breakdown?.map((option: OptionBreakdown, index: number) => {
                    const respondentData: { user_id: string; employee_name: string }[] = question.user_responses
                      ?.filter((response: UserResponse) => response.selected_options?.includes(option.option_id))
                      ?.map((response: UserResponse) => ({
                        user_id: response.user_id,
                        employee_name: response.employee_name
                      })) || [];
                    
                    const respondentIds = respondentData.map((r: { user_id: string; employee_name: string }) => r.user_id);
                    const respondentNames = respondentData.map((r: { user_id: string; employee_name: string }) => r.employee_name);
                    
                    return (
                      <div key={option.option_id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                        <div className="grid grid-cols-3 gap-4 items-center">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-4 h-4 rounded-full flex-shrink-0 border-2 border-white shadow-sm" 
                              style={{ backgroundColor: COLORS[index % COLORS.length] }}
                            />
                            <span className="font-medium text-gray-900">{option.option_text}</span>
                          </div>
                          <div className="flex items-center justify-center gap-2">
                            <EmployeeTooltip userIds={respondentIds} employeeNames={respondentNames}>
                              <span className="cursor-help hover:text-blue-600 transition-colors text-2xl font-bold text-gray-900">
                                {option.count}
                              </span>
                            </EmployeeTooltip>
                            <span className="text-sm text-gray-500 font-medium">
                              ({option.percentage}%)
                            </span>
                          </div>
                          <div className="flex justify-center">
                            {respondentData.length > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewRespondents(option.option_text, respondentData);
                                }}
                                className="h-8 px-3 text-xs hover:bg-blue-50 hover:border-blue-300"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right side - Pie Chart */}
            <div className="flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-700 mb-6">Response Distribution</h4>
              <div className="w-full h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }: { name?: string; percent?: number }) => 
                        `${name || 'Unknown'}: ${percent ? (percent * 100).toFixed(0) : 0}%`
                      }
                      labelLine={false}
                      fontSize={13}
                      fontWeight={500}
                    >
                      {chartData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const activeCount = allPolls.filter(poll => poll.is_active).length;
  const inactiveCount = allPolls.filter(poll => !poll.is_active).length;

  if (loading) {
    return (
      <div className="h-screen flex flex-col p-6">
        <div className="flex items-center gap-3 mb-6 flex-shrink-0">
          <Skeleton className="h-7 w-7" />
          <Skeleton className="h-8 w-20" />
        </div>
        <PollListSkeleton />
      </div>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
      
      <div className="h-screen flex flex-col p-6">
        <div className="flex items-center justify-between mb-6 flex-shrink-0">
          <div className="flex items-center gap-3">
            <Vote className="h-7 w-7 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">All Polls</h1>
          </div>
          <PollManagement onPollCreated={fetchPolls} currentUser={currentUser} />
        </div>

        {/* Single merged section */}
        <Card className="shadow-sm h-[calc(100vh-150px)] flex flex-col flex-1">
          <CardHeader className="pb-4 flex-shrink-0">
            <CardTitle className="flex items-center gap-3 text-lg">
              <Vote className="h-5 w-5 text-blue-600" />
              Polls Overview
              <div className="flex items-center gap-2 ml-auto">
                <Badge className="bg-green-100 text-green-700 border-green-200">
                  {activeCount} Active
                </Badge>
                <Badge variant="outline" className="text-gray-600 border-gray-300">
                  {inactiveCount} Inactive
                </Badge>
                <Badge variant="secondary">{allPolls.length} Total</Badge>
              </div>
            </CardTitle>
          </CardHeader>
          
          <CardContent className="flex-1 overflow-hidden p-0">
            {allPolls.length === 0 ? (
              <div className="text-center py-16 text-gray-500 px-6">
                <Vote className="h-16 w-16 mx-auto mb-4 opacity-30" />
                <h3 className="text-xl font-medium mb-2">No Polls Found</h3>
                <p className="text-sm">Create your first poll to get started</p>
              </div>
            ) : (
              <ScrollArea className="h-full">
                <div className="space-y-4 p-6">
                  {allPolls.map(renderPollCard)}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Analytics Drawer */}
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent 
            className="p-0 max-w-none sm:max-w-none" 
            style={{ width: '85vw' }}
          >
            <div className="flex flex-col h-full">
              <SheetHeader className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <SheetTitle className="flex items-center gap-3 text-xl">
                  <Vote className="h-6 w-6 text-blue-600" />
                  <span className="text-gray-900">{selectedPoll?.title}</span>
                  {selectedPoll && getStatusBadge(selectedPoll)}
                </SheetTitle>
                {selectedPoll?.description && (
                  <p className="text-gray-600 mt-2">{selectedPoll.description}</p>
                )}
                <div className="flex items-center gap-6 text-sm text-gray-500 mt-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span className="font-medium">{selectedPoll?.total_responses}</span> total responses
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {selectedPoll && format(new Date(selectedPoll.end_time), 'MMM dd, yyyy HH:mm')}
                  </div>
                  {selectedPoll?.is_anonymous && (
                    <Badge variant="outline" className="text-xs">
                      <User className="h-3 w-3 mr-1" />
                      Anonymous
                    </Badge>
                  )}
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-hidden bg-gray-50">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    {analyticsLoading ? (
                      <div className="space-y-6">
                        {Array.from({ length: 2 }).map((_, index) => (
                          <QuestionCardSkeleton key={index} />
                        ))}
                      </div>
                    ) : pollAnalytics ? (
                      <div className="space-y-6">
                        {pollAnalytics.questions_analytics?.map((question: QuestionAnalytics) => 
                          renderQuestionCard(question)
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-gray-500">
                        <div className="text-lg font-medium">Failed to load analytics</div>
                        <p className="text-sm mt-1">Please try again</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Respondents List Modal */}
        <RespondentsListModal
          isOpen={respondentsModalOpen}
          onClose={() => setRespondentsModalOpen(false)}
          optionText={selectedOptionText}
          respondents={selectedRespondents}
        />
      </div>
    </>
  );
}