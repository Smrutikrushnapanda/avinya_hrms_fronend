"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  ArrowLeft,
  Heart,
  MessageCircle,
  Send,
  Pin,
  Trash2,
  Edit,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getPost,
  likePost,
  unlikePost,
  commentPost,
  deletePost,
  deleteComment,
  getProfile,
} from "@/app/api/api";
import { toast } from "sonner";
import Link from "next/link";

const POST_TYPES = [
  { value: "general", label: "General", color: "bg-gray-100 text-gray-800" },
  { value: "announcement", label: "Announcement", color: "bg-blue-100 text-blue-800" },
  { value: "new_joiner", label: "New Joiner", color: "bg-green-100 text-green-800" },
  { value: "celebration", label: "Celebration", color: "bg-purple-100 text-purple-800" },
  { value: "event", label: "Event", color: "bg-orange-100 text-orange-800" },
];

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
  likes?: Array<{
    id: string;
    userId: string;
    user: {
      firstName?: string;
      lastName?: string;
    };
  }>;
  comments?: Comment[];
  likeCount?: number;
  commentCount?: number;
}

export default function PostDetailPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.id as string;

  const [post, setPost] = useState<Post | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [hasLiked, setHasLiked] = useState(false);

  // Comment state
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [likingPost, setLikingPost] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (postId) {
      loadPost();
    }
  }, [postId]);

  const loadProfile = async () => {
    try {
      const res = await getProfile();
      setCurrentUser(res.data);
    } catch (error) {
      console.error("Failed to load profile", error);
    }
  };

  const loadPost = async () => {
    setLoading(true);
    try {
      const res = await getPost(postId);
      const postData = res.data;
      setPost(postData);

      // Check if current user has liked the post
      if (currentUser && postData.likes) {
        const liked = postData.likes.some(
          (like: any) => like.userId === currentUser.userId
        );
        setHasLiked(liked);
      }
    } catch (error) {
      toast.error("Failed to load post");
      router.push("/admin/posts");
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async () => {
    if (!currentUser) {
      toast.error("Please log in to like posts");
      return;
    }

    // Prevent multiple rapid clicks
    if (likingPost) {
      return;
    }

    setLikingPost(true);
    try {
      if (hasLiked) {
        await unlikePost(postId, currentUser.userId);
        setHasLiked(false);
        setPost((prev) =>
          prev ? { ...prev, likeCount: Math.max(0, (prev.likeCount || 1) - 1) } : null
        );
        toast.success("Like removed");
      } else {
        await likePost(postId, currentUser.userId);
        setHasLiked(true);
        setPost((prev) =>
          prev ? { ...prev, likeCount: (prev.likeCount || 0) + 1 } : null
        );
        toast.success("Post liked!");
      }
    } catch (error: any) {
      // Handle "already liked" error from backend
      if (error.response?.data?.message === 'You have already liked this post' || 
          error.response?.status === 400) {
        toast.error("You have already liked this post");
        loadPost();
      } else {
        toast.error("Failed to update like");
      }
      console.error("Like error:", error);
    } finally {
      setLikingPost(false);
    }
  };

  const handleComment = async () => {
    if (!newComment.trim() || !currentUser) {
      return;
    }

    setSubmittingComment(true);
    try {
      const res = await commentPost(postId, {
        userId: currentUser.userId,
        content: newComment,
      });
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comments: [...(prev.comments || []), res.data],
              commentCount: (prev.commentCount || 0) + 1,
            }
          : null
      );
      setNewComment("");
      toast.success("Comment added!");
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm("Are you sure you want to delete this comment?")) return;

    try {
      await deleteComment(commentId);
      setPost((prev) =>
        prev
          ? {
              ...prev,
              comments: prev.comments?.filter((c) => c.id !== commentId),
              commentCount: (prev.commentCount || 1) - 1,
            }
          : null
      );
      toast.success("Comment deleted!");
    } catch (error) {
      toast.error("Failed to delete comment");
    }
  };

  const handleDeletePost = async () => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      await deletePost(postId);
      toast.success("Post deleted!");
      router.push("/admin/posts");
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  const getTypeBadge = (type: string) => {
    const typeConfig = POST_TYPES.find((t) => t.value === type);
    return typeConfig ? (
      <Badge className={`${typeConfig.color} text-xs`}>{typeConfig.label}</Badge>
    ) : (
      <Badge variant="outline">{type}</Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#184a8c]" />
      </div>
    );
  }

  if (!post) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <p className="text-gray-500 mb-4">Post not found</p>
        <Link href="/admin/posts">
          <Button>Back to Posts</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-2 py-2 md:px-6 md:py-6 max-w-4xl mx-auto">
      {/* Back Button */}
      <div className="mb-6">
        <Link href="/admin/posts">
          <Button variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Posts
          </Button>
        </Link>
      </div>

      {/* Post Card */}
      <Card className={`mb-6 ${post.isPinned ? "border-2 border-yellow-400" : ""}`}>
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
                  {post.isPinned && <Pin className="h-4 w-4 text-yellow-500" />}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>{format(new Date(post.createdAt), "MMMM dd, yyyy 'at' HH:mm")}</span>
                  {getTypeBadge(post.postType)}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleLike} disabled={likingPost}>
                <Heart
                  className={`h-4 w-4 mr-1 ${hasLiked ? "fill-red-500 text-red-500" : ""}`}
                />
                {post.likeCount || 0}
              </Button>
              <Button variant="outline" size="sm">
                <MessageCircle className="h-4 w-4 mr-1" />
                {post.commentCount || 0}
              </Button>
            </div>
          </div>

          {/* Post Content */}
          <div className="mb-6">
            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-lg">
              {post.content}
            </p>
          </div>

          {/* Post Image */}
          {post.imageUrl && (
            <div className="mb-6">
              <img
                src={post.imageUrl}
                alt="Post image"
                className="max-h-[500px] rounded-lg object-contain w-full"
              />
            </div>
          )}

          {/* Admin Actions */}
          {currentUser?.role === "admin" && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" size="sm" onClick={handleDeletePost}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete Post
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments Section */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            Comments ({post.comments?.length || 0})
          </h3>

          {/* Add Comment */}
          <div className="mb-6">
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
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  rows={3}
                  className="mb-2"
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleComment}
                    disabled={submittingComment || !newComment.trim()}
                    className="bg-[#184a8c] hover:bg-[#184a8c]/90"
                  >
                    {submittingComment ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Post Comment
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="space-y-4">
            {post.comments && post.comments.length > 0 ? (
              post.comments.map((comment) => (
                <div
                  key={comment.id}
                  className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={comment.user?.avatar} />
                    <AvatarFallback className="bg-[#00b4db] text-white">
                      {comment.user?.firstName?.[0] || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium">
                        {comment.user?.firstName} {comment.user?.lastName}
                      </span>
                      <span className="text-sm text-gray-500">
                        {format(new Date(comment.createdAt), "MMM dd, yyyy HH:mm")}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">{comment.content}</p>
                    {currentUser?.userId === comment.userId && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-700 mt-2"
                        onClick={() => handleDeleteComment(comment.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <MessageCircle className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p>No comments yet. Be the first to comment!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

