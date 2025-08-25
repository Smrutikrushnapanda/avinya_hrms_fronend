"use client";

import { useState } from "react";
import { Plus, X, Vote } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";
import { createPoll } from "@/app/api/api";

export function PollManagement({ onPollCreated, currentUser }: { onPollCreated: () => void; currentUser: any }) {
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
