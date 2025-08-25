"use client";

import { useState, useEffect } from "react";
import { format, isAfter, isBefore } from "date-fns";
import { 
  Vote, MessageSquare, Clock, Bell, AlertTriangle, Cake, Gift, PartyPopper,
  Users, Activity, PieChart, BarChart3, UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WidgetCard } from "./StatCard";
import { PollManagement } from "./PollManagement";
import { getQuestions, saveResponse } from "@/app/api/api";
import { toast } from "sonner";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  PieChart as RechartsPieChart, Pie, Cell
} from "recharts";

// Poll Widget
export function PollWidget({ polls, currentUser, onPollUpdate }: { polls: any[]; currentUser: any; onPollUpdate: () => void }) {
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

// Notice Widget
export function NoticeWidget({ notices }: { notices: any[] }) {
  const activeNotices = notices.filter(notice => {
    const now = new Date();
    const startTime = new Date(notice.start_at);
    const endTime = new Date(notice.end_at);
    return isAfter(now, startTime) && isBefore(now, endTime);
  });

  const getNoticeIcon = (type: string) => {
    switch (type) {
      case 'wish': return <MessageSquare className="h-4 w-4 text-purple-500" />;
      case 'info': return <Bell className="h-4 w-4 text-blue-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default: return <Bell className="h-4 w-4 opacity-60" />;
    }
  };

  return (
    <WidgetCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-500" />
          Company Notices
          {activeNotices.length > 0 && (
            <Badge variant="secondary">{activeNotices.length}</Badge>
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
                      <div className="mt-3"><img
                        src={notice.bg_image_url}
                        alt={notice.title}
                        className="w-full h-32 object-cover rounded-lg"
                        onError={e => ((e.target as HTMLImageElement).style.display = 'none')}
                      /></div>
                    )}
                    <div className="flex items-center justify-between mt-3 text-xs opacity-60">
                      <span>Valid until: {format(new Date(notice.end_at), 'MMM dd, yyyy')}</span>
                      <Badge variant="outline" className="text-xs">{notice.type}</Badge>
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
            </div>
          )}
        </div>
      </CardContent>
    </WidgetCard>
  );
}

// Birthday Widget
export function BirthdayWidget({ upcomingBirthdays }: { upcomingBirthdays: any[] }) {
  const today = new Date();
  const todayBirthdays = upcomingBirthdays.filter(person => {
    const birthDate = new Date(person.dateOfBirth);
    return birthDate.getDate() === today.getDate() && birthDate.getMonth() === today.getMonth();
  });
  const nextBirthdays = upcomingBirthdays.filter(person => {
    const birthDate = new Date(person.dateOfBirth);
    const isToday = birthDate.getDate() === today.getDate() && birthDate.getMonth() === today.getMonth();
    return !isToday;
  });

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
                <PartyPopper className="h-4 w-4 text-pink-500" />Today's Birthdays
              </h4>
              <div className="space-y-2">
                {todayBirthdays.map((person) => (
                  <div key={person.id} className="flex items-center gap-3 p-3 bg-pink-50 dark:bg-pink-900/20 border border-pink-200 dark:border-pink-800 rounded-lg">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={person.photoUrl || ''} />
                      <AvatarFallback className="bg-pink-200 text-pink-800">
                        {`${person.firstName} ${person.lastName || ''}`.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{`${person.firstName} ${person.lastName || ''}`.trim()}</div>
                      <div className="text-xs opacity-70">{person.department?.name || 'Unknown Department'}</div>
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
            {nextBirthdays.length > 0 ? (
              <div className="space-y-2">
                {nextBirthdays.map((person) => (
                  <div key={person.id} className="flex items-center gap-3 p-2 border rounded-lg">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={person.photoUrl || ''} />
                      <AvatarFallback className="text-xs">
                        {`${person.firstName} ${person.lastName || ''}`.split(' ').map((n: string) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{`${person.firstName} ${person.lastName || ''}`.trim()}</div>
                      <div className="text-xs opacity-70">{person.department?.name || 'Unknown Department'}</div>
                    </div>
                    <div className="text-right text-xs opacity-70">
                      <div>{format(new Date(person.dateOfBirth), 'MMM dd')}</div>
                      <div>{format(new Date(person.dateOfBirth), 'EEE')}</div>
                      {person.daysUntilBirthday && (
                        <div className="text-xs text-blue-600 font-medium">
                          {person.daysUntilBirthday} days
                        </div>
                      )}
                    </div>
                  </div>
                ))}
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

// Charts Widget
export function AttendanceChart({ attendanceChartData }: { attendanceChartData: any[] }) {
  return (
    <WidgetCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PieChart className="h-5 w-5" />
          Today's Attendance
        </CardTitle>
      </CardHeader>
      <CardContent>
        {attendanceChartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <PieChart className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-sm font-medium">No attendance data</p>
            <p className="text-xs opacity-70">Data will appear once employees check in</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <RechartsPieChart>
              <Pie data={attendanceChartData} cx="50%" cy="50%"
                innerRadius={40} outerRadius={80} dataKey="value">
                {attendanceChartData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip /><Legend />
            </RechartsPieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </WidgetCard>
  );
}

export function DepartmentChart({ departmentData }: { departmentData: any[] }) {
  return (
    <WidgetCard>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Department Distribution
        </CardTitle>
      </CardHeader>
      <CardContent>
        {departmentData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-500">
            <BarChart3 className="h-16 w-16 mb-4 opacity-30" />
            <p className="text-sm font-medium">No department data</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={departmentData}>
              <XAxis dataKey="name" fontSize={12} angle={-45} textAnchor="end" height={60} />
              <YAxis allowDecimals={false} fontSize={12} />
              <Tooltip formatter={(value, name) => [value, 'Active Employees']}
                labelFormatter={(label) => `Department: ${label}`} />
              <Bar dataKey="employees" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Active Employees" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </WidgetCard>
  );
}

export function UserActivitiesWidget({ activities }: { activities: any[] }) {
  return (
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
                <div className="text-xs opacity-50">{activity.timestamp ? format(new Date(activity.timestamp), 'MMM dd, HH:mm') : 'Recently'}</div>
              </div>
            </div>
          )) : (
            <div className="text-center opacity-60 py-4">No recent activities</div>
          )}
        </div>
      </CardContent>
    </WidgetCard>
  );
}
