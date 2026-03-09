"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import {
  Heart,
  MessageCircle,
  Send,
  Loader2,
  Search,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getLatestPosts,
  likePost,
  unlikePost,
  commentPost,
  getProfile,
} from "@/app/api/api";
import { toast } from "sonner";

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

export default function EmployeePostsPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");

  // New comment state
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [submittingComments, setSubmittingComments] = useState<Record<string, boolean>>({});
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [likingPosts, setLikingPosts] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadProfile();
    loadPosts();
  }, []);

  const loadProfile = async () => {
    try {
      const res = await getProfile();
      setCurrentUser(res.data);
    } catch (error) {
      console.error("Failed to load profile", error);
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await getLatestPosts({ limit: 50 });
      setPosts(res.data || []);
    } catch (error) {
      toast.error("Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (postId: string, post: Post) => {
    if (!currentUser) {
      toast.error("Please log in to like posts");
      return;
    }

    // Prevent multiple rapid clicks - check if already liking this post
    if (likingPosts[postId]) {
      return;
    }

    const hasLiked = post.likes?.some((like) => like.userId === currentUser.userId);
    
    // Optimistically update UI - disable button first
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
      // Handle "already liked" error from backend
      if (error.response?.data?.message === 'You have already liked this post' || 
          error.response?.status === 400) {
        toast.error("You have already liked this post");
        // Refresh posts to sync with server state
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
    const matchesSearch =
      searchQuery === "" ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author?.lastName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType =
      selectedType === "all" || post.postType === selectedType;

    return matchesSearch && matchesType;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#184a8c]" />
      </div>
    );
  }

  return (
    <div className="px-2 py-2 md:px-6 md:py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-[#184a8c] to-[#00b4db] bg-clip-text text-transparent">
          Community Posts
        </h1>
        <p className="text-gray-500 mt-1">
          Stay updated with the latest company news and updates
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            {POST_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-6">
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
                <CardContent className="p-6">
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={post.author?.avatar} />
                        <AvatarFallback className="bg-[#184a8c] text-white text-lg">
                          {post.author?.firstName?.[0] || "A"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">
                            {post.author?.firstName} {post.author?.lastName}
                          </span>
                          {post.isPinned && (
                            <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-800">
                              Pinned
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>
                            {format(new Date(post.createdAt), "MMM dd, yyyy 'at' HH:mm")}
                          </span>
                          {getTypeBadge(post.postType)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Post Content */}
                  <div className="mb-4">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {isExpanded ? post.content : post.content.slice(0, 300)}
                      {post.content.length > 300 && !isExpanded && (
                        <Button
                          variant="link"
                          size="sm"
                          className="ml-1 h-auto p-0 text-[#184a8c]"
                          onClick={() => toggleExpand(post.id)}
                        >
                          Read more...
                        </Button>
                      )}
                    </p>
                  </div>

                  {/* Post Image */}
                  {post.imageUrl && (
                    <div className="mb-4">
                      <img
                        src={post.imageUrl}
                        alt="Post image"
                        className="max-h-[400px] rounded-lg object-contain w-full"
                      />
                    </div>
                  )}

                  {/* Like/Comment Counts */}
                  <div className="flex items-center gap-4 py-3 border-t border-b mb-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleLike(post.id, post)}
                      disabled={likingPosts[post.id]}
                      className={hasLiked ? "text-red-500" : "text-gray-500"}
                    >
                      <Heart
                        className={`h-4 w-4 mr-1 ${
                          hasLiked ? "fill-current" : ""
                        }`}
                      />
                      {post.likeCount || 0}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-500"
                      onClick={() => toggleExpand(post.id)}
                    >
                      <MessageCircle className="h-4 w-4 mr-1" />
                      {post.commentCount || 0} Comments
                    </Button>
                  </div>

                  {/* Who Liked Section */}
                  {post.likes && post.likes.length > 0 && (
                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                      <div className="flex -space-x-2">
                        {post.likes.slice(0, 5).map((like) => (
                          <Avatar key={like.id} className="h-6 w-6 border-2 border-white">
                            <AvatarImage src={like.user?.passportPhotoUrl || like.user?.avatar} />
                            <AvatarFallback className="text-[10px] bg-[#184a8c] text-white">
                              {like.user?.firstName?.[0] || "U"}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                        {post.likes.length > 5 && (
                          <div className="h-6 w-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center text-[10px] font-medium">
                            +{post.likes.length - 5}
                          </div>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">
                        {post.likes.length === 1 
                          ? `${post.likes[0].user?.firstName} ${post.likes[0].user?.lastName} liked`
                          : post.likes.length === 2
                          ? `${post.likes[0].user?.firstName} and ${post.likes[1].user?.firstName} liked`
                          : `${post.likes[0].user?.firstName} and ${post.likes.length - 1} others liked`
                        }
                      </span>
                    </div>
                  )}

                  {/* Comments Section */}
                  {isExpanded && (
                    <div className="space-y-4">
                      {/* Add Comment */}
                      <div className="flex gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={currentUser?.avatar} />
                          <AvatarFallback className="bg-[#184a8c] text-white">
                            {currentUser?.firstName?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
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
                            className="mb-2"
                          />
                          <div className="flex justify-end">
                            <Button
                              onClick={() => handleComment(post.id)}
                              disabled={
                                submittingComments[post.id] ||
                                !newComments[post.id]?.trim()
                              }
                              size="sm"
                              className="bg-[#184a8c] hover:bg-[#184a8c]/90"
                            >
                              {submittingComments[post.id] ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <Send className="h-4 w-4 mr-2" />
                              )}
                              Post
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Comments List */}
                      {post.comments && post.comments.length > 0 && (
                        <div className="space-y-3 pl-3 border-l-2 border-gray-200">
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarImage src={comment.user?.passportPhotoUrl || comment.user?.avatar} />
                                <AvatarFallback className="bg-[#00b4db] text-white text-xs">
                                  {comment.user?.firstName?.[0] || "U"}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm">
                                    {comment.user?.firstName} {comment.user?.lastName}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    {format(
                                      new Date(comment.createdAt),
                                      "MMM dd, HH:mm"
                                    )}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-700 dark:text-gray-300">
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
            <MessageCircle className="h-16 w-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium text-gray-500">No posts found</p>
            <p className="text-sm text-gray-400 mt-1">
              {searchQuery || selectedType !== "all"
                ? "Try adjusting your search or filters"
                : "Check back later for new posts"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

