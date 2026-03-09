"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Heart,
  MessageCircle,
  Send,
  Loader2,
  Filter,
  MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  getLatestPosts,
  likePost,
  unlikePost,
  commentPost,
  getProfile,
} from "@/app/api/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

const POST_TYPES = [
  { value: "all", label: "All Posts" },
  { value: "announcement", label: "Announcements" },
  { value: "new_joiner", label: "New Joiners" },
  { value: "celebration", label: "Celebrations" },
  { value: "event", label: "Events" },
  { value: "general", label: "General" },
];

interface Like {
  id: string;
  userId: string;
  user?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
    passportPhotoUrl?: string;
  };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId?: string;
  user: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
}

interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  postType: string;
  isPinned: boolean;
  author?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  organizationId: string;
  createdAt: string;
  likes?: Like[];
  comments?: Comment[];
  likeCount?: number;
  commentCount?: number;
}

interface MobilePostsPageProps {
  onSwipeRight?: () => void;
}

export default function MobilePostsPage({ onSwipeRight }: MobilePostsPageProps) {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedType, setSelectedType] = useState("all");

  // New comment state
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [submittingComments, setSubmittingComments] = useState<Record<string, boolean>>({});
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [likingPosts, setLikingPosts] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = async () => {
    try {
      const res = await getProfile();
      setCurrentUser(res.data);
    } catch (error) {
      console.error("Failed to load profile", error);
    }
  };

  const loadPosts = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const res = await getLatestPosts({ limit: 50 });
      setPosts(res.data || []);
    } catch (error) {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadProfile();
    loadPosts();
  }, []);

  const handleRefresh = useCallback(() => {
    loadPosts(true);
  }, []);

  const handleLike = async (postId: string, post: Post) => {
    if (!currentUser) {
      toast.error("Please log in to like posts");
      return;
    }

    if (likingPosts[postId]) {
      return;
    }

    const hasLiked = post.likes?.some((like) => like.userId === currentUser.userId);
    
    setLikingPosts((prev) => ({ ...prev, [postId]: true }));
    
    try {
      if (hasLiked) {
        await unlikePost(postId, currentUser.userId);
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likes: p.likes?.filter((l) => l.userId !== currentUser.userId),
                  likeCount: Math.max(0, (p.likeCount || 1) - 1),
                }
              : p
          )
        );
        toast.success("Like removed");
      } else {
        await likePost(postId, currentUser.userId);
        setPosts((prevPosts) =>
          prevPosts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  likes: [...(p.likes || []), { 
                    id: "", 
                    userId: currentUser.userId,
                    user: {
                      firstName: currentUser.firstName,
                      lastName: currentUser.lastName,
                      avatar: currentUser.avatar
                    }
                  }],
                  likeCount: (p.likeCount || 0) + 1,
                }
              : p
          )
        );
        toast.success("Post liked!");
      }
    } catch (error: any) {
      if (error.response?.data?.message === 'You have already liked this post' || 
          error.response?.status === 400) {
        toast.error("You have already liked this post");
        loadPosts();
      } else {
        toast.error("Failed to update like");
      }
      console.error("Like error:", error);
    } finally {
      setLikingPosts((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const handleComment = async (postId: string) => {
    const commentText = newComments[postId];
    if (!commentText?.trim() || !currentUser) return;

    setSubmittingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await commentPost(postId, {
        userId: currentUser.userId,
        content: commentText,
      });
      setPosts((prevPosts) =>
        prevPosts.map((p) =>
          p.id === postId
            ? {
                ...p,
                comments: [...(p.comments || []), res.data],
                commentCount: (p.commentCount || 0) + 1,
              }
            : p
        )
      );
      setNewComments((prev) => ({ ...prev, [postId]: "" }));
      toast.success("Comment added!");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setSubmittingComments((prev) => ({ ...prev, [postId]: false }));
    }
  };

  const toggleExpand = (postId: string) => {
    setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));
  };

  const filteredPosts = posts.filter((post) => {
    const matchesType = selectedType === "all" || post.postType === selectedType;
    return matchesType;
  });

  const getTypeBadge = (type: string) => {
    const typeConfig = POST_TYPES.find((t) => t.value === type);
    if (!typeConfig || type === "all") return null;
    
    const colors: Record<string, string> = {
      announcement: "bg-blue-100 text-blue-800",
      new_joiner: "bg-green-100 text-green-800",
      celebration: "bg-purple-100 text-purple-800",
      event: "bg-orange-100 text-orange-800",
      general: "bg-gray-100 text-gray-800",
    };
    
    return (
      <Badge className={`${colors[type] || "bg-gray-100"} text-xs`}>
        {typeConfig.label}
      </Badge>
    );
  };

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#184a8c]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-[#005F90] text-white px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button 
            onClick={()=>{router.push("/user/dashboard/mobile")}}
            className="p-2 -ml-2 rounded-full hover:bg-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6"/>
            </svg>
          </button>
          <h1 className="text-xl font-bold">Posts</h1>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-8 px-2 rounded-md border border-white/30 bg-white/10 text-white text-sm appearance-none pr-6"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 6px center"
            }}
          >
            {POST_TYPES.map((type) => (
              <option key={type.value} value={type.value} className="text-black">
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pull to refresh indicator */}
      {refreshing && (
        <div className="flex items-center justify-center py-2 bg-gray-50">
          <Loader2 className="h-4 w-4 animate-spin text-[#184a8c] mr-2" />
          <span className="text-sm text-gray-500">Refreshing...</span>
        </div>
      )}

      {/* Posts Feed */}
      <div className="space-y-4 px-3 py-3">
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => {
            const hasLiked = post.likes?.some(
              (like) => like.userId === currentUser?.userId
            );
            const isExpanded = expandedPosts[post.id];

            return (
              <Card
                key={post.id}
                className={post.isPinned ? "border-2 border-yellow-400" : ""}
              >
                <CardContent className="p-4">
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-[#184a8c] flex items-center justify-center text-white font-semibold">
                        {post.author?.firstName?.[0] || "A"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-base">
                            {post.author?.firstName} {post.author?.lastName}
                          </span>
                          {post.isPinned && (
                            <Badge variant="secondary" className="text-[10px] bg-yellow-100 text-yellow-800">
                              Pinned
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>
                            {format(new Date(post.createdAt), "MMM dd, HH:mm")}
                          </span>
                          {getTypeBadge(post.postType)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="mb-3">
                    <p className="text-gray-700 dark:text-gray-300 text-sm whitespace-pre-wrap">
                      {isExpanded ? post.content : post.content.slice(0, 200)}
                      {post.content.length > 200 && !isExpanded && (
                        <Button
                          variant="link"
                          size="sm"
                          className="ml-1 h-auto p-0 text-[#184a8c] text-sm"
                          onClick={() => toggleExpand(post.id)}
                        >
                          Read more...
                        </Button>
                      )}
                    </p>
                  </div>

                  {/* Post Image */}
                  {post.imageUrl && (
                    <div className="mb-3">
                      <img
                        src={post.imageUrl}
                        alt="Post image"
                        className="max-h-[300px] rounded-lg object-contain w-full"
                      />
                    </div>
                  )}

                  {/* Like/Comment Counts */}
                  <div className="flex items-center gap-4 py-2 border-t border-b mb-3">
                    <button
                      onClick={() => handleLike(post.id, post)}
                      disabled={likingPosts[post.id]}
                      className={`flex items-center gap-1 text-sm ${
                        hasLiked ? "text-red-500" : "text-gray-500"
                      }`}
                    >
                      <Heart
                        className={`h-4 w-4 ${
                          hasLiked ? "fill-current" : ""
                        }`}
                      />
                      {post.likeCount || 0}
                    </button>
                    <button
                      className="flex items-center gap-1 text-sm text-gray-500"
                      onClick={() => toggleExpand(post.id)}
                    >
                      <MessageCircle className="h-4 w-4" />
                      {post.commentCount || 0}
                    </button>
                  </div>

                  {/* Who Liked Section */}
                  {post.likes && post.likes.length > 0 && (
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <div className="flex -space-x-1">
                        {post.likes.slice(0, 4).map((like, idx) => (
                          <div 
                            key={like.id || idx}
                            className="h-5 w-5 rounded-full bg-[#184a8c] border-2 border-white flex items-center justify-center text-[8px] text-white"
                          >
                            {like.user?.firstName?.[0] || "U"}
                          </div>
                        ))}
                        {post.likes.length > 4 && (
                          <div className="h-5 w-5 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[8px] font-medium">
                            +{post.likes.length - 4}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {post.likes.length === 1 
                          ? `${post.likes[0].user?.firstName} liked`
                          : `${post.likes[0].user?.firstName} and ${post.likes.length - 1} others`
                        }
                      </span>
                    </div>
                  )}

                  {/* Comments Section */}
                  {isExpanded && (
                    <div className="space-y-3">
                      {/* Add Comment */}
                      <div className="flex gap-2">
                        <div className="h-8 w-8 rounded-full bg-[#184a8c] flex items-center justify-center text-white text-sm flex-shrink-0">
                          {currentUser?.firstName?.[0] || "U"}
                        </div>
                        <div className="flex-1">
                          <Textarea
                            placeholder="Write a comment..."
                            value={newComments[post.id] || ""}
                            onChange={(e) =>
                              setNewComments((prev) => ({
                                ...prev,
                                [post.id]: e.target.value,
                              }))
                            }
                            rows={2}
                            className="mb-2 text-sm"
                          />
                          <div className="flex justify-end">
                            <Button
                              onClick={() => handleComment(post.id)}
                              disabled={
                                submittingComments[post.id] ||
                                !newComments[post.id]?.trim()
                              }
                              size="sm"
                              className="bg-[#184a8c] hover:bg-[#184a8c]/90 text-sm"
                            >
                              {submittingComments[post.id] ? (
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3 mr-1" />
                              )}
                              Post
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Comments List */}
                      {post.comments && post.comments.length > 0 && (
                        <div className="space-y-2 pl-2 border-l-2 border-gray-200">
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-2">
                              <div className="h-6 w-6 rounded-full bg-[#00b4db] flex items-center justify-center text-white text-[10px] flex-shrink-0">
                                {comment.user?.firstName?.[0] || "U"}
                              </div>
                              <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-2">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-xs">
                                    {comment.user?.firstName} {comment.user?.lastName}
                                  </span>
                                  <span className="text-[10px] text-gray-500">
                                    {format(
                                      new Date(comment.createdAt),
                                      "MMM dd, HH:mm"
                                    )}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-700 dark:text-gray-300">
                                  {comment.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12">
            <MessageSquare className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">No posts found</p>
            <p className="text-sm text-gray-400 mt-1">
              {selectedType !== "all"
                ? "Try adjusting your filters"
                : "Check back later for new posts"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

