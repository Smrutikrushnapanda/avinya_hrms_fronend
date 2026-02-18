"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, ArrowLeft, Vote } from "lucide-react";
import { useRouter } from "next/navigation";
import { getProfile, getActivePoll } from "@/app/api/api";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface PollOption {
  id: string;
  optionText: string;
  voteCount: number;
}

interface Poll {
  id: string;
  title: string;
  description: string;
  options: PollOption[];
  totalVotes: number;
  isActive: boolean;
  endDate: string;
}

export default function MobilePollsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [poll, setPoll] = useState<Poll | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profileRes = await getProfile();
        const userId = profileRes.data.id;

        const pollRes = await getActivePoll(userId);
        if (pollRes.data) {
          setPoll(pollRes.data);
        }
      } catch (error) {
        console.error("Error fetching poll:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-[#0077b6] text-white px-4 pt-5 pb-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" size="icon" onClick={() => router.push("/user/dashboard/mobile")}>
            <ArrowLeft className="w-5 h-5 text-white" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">Polls</h2>
          </div>
        </div>
        <Bell className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="p-4 pb-20">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Active Poll</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-32 w-full" />
              </div>
            ) : !poll ? (
              <div className="text-center py-8">
                <Vote className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-sm text-gray-500">No active polls at the moment.</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-lg">{poll.title}</h3>
                    {poll.isActive && (
                      <Badge className="bg-green-500">Active</Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{poll.description}</p>
                  <p className="text-xs text-gray-500 mt-2">
                    Ends: {formatDate(poll.endDate)} • {poll.totalVotes} votes
                  </p>
                </div>

                <div className="space-y-2">
                  {poll.options.map((option, index) => {
                    const percentage = poll.totalVotes > 0 
                      ? Math.round((option.voteCount / poll.totalVotes) * 100) 
                      : 0;
                    
                    return (
                      <div 
                        key={option.id} 
                        className="border rounded-lg p-3 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium">{option.optionText}</span>
                          <span className="text-sm text-gray-500">{percentage}%</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-[#0077b6] h-2 rounded-full" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{option.voteCount} votes</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

