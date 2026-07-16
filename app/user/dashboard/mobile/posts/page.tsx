"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import {
  Heart,
  MessageCircle,
  Send,
  Loader2,
  MessageSquare,
  ArrowLeft,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";
import {
  getLatestPosts,
  likePost,
  unlikePost,
  commentPost,
  getProfile,
} from "@/app/api/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { StaggerReveal, StaggerItem } from "../components/animation-wrappers";
import { MobileEmptyState } from "../components/MobileEmptyState";

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
  user?: { firstName?: string; lastName?: string; avatar?: string; passportPhotoUrl?: string };
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  userId?: string;
  user: { firstName?: string; lastName?: string; avatar?: string };
}

interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  postType: string;
  isPinned: boolean;
  author?: { firstName?: string; lastName?: string; avatar?: string };
  organizationId: string;
  createdAt: string;
  likes?: Like[];
  comments?: Comment[];
  likeCount?: number;
  commentCount?: number;
}

const typeStyles: Record<string, string> = {
  announcement: "bg-blue-100 text-blue-800 border-blue-200",
  new_joiner: "bg-emerald-100 text-emerald-800 border-emerald-200",
  celebration: "bg-purple-100 text-purple-800 border-purple-200",
  event: "bg-orange-100 text-orange-800 border-orange-200",
  general: "bg-slate-100 text-slate-800 border-slate-200",
};

export default function MobilePostsPage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedType, setSelectedType] = useState("all");
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [submittingComments, setSubmittingComments] = useState<Record<string, boolean>>({});
  const [expandedPosts, setExpandedPosts] = useState<Record<string, boolean>>({});
  const [likingPosts, setLikingPosts] = useState<Record<string, boolean>>({});
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = async () => {
    try { const res = await getProfile(); setCurrentUser(res.data); } catch { /* ignore */ }
  };

  const loadPosts = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    try { const res = await getLatestPosts({ limit: 50 }); setPosts(res.data || []); }
    catch { toast.error("Failed to load posts"); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { loadProfile(); loadPosts(); }, []);

  const handleRefresh = useCallback(() => { loadPosts(true); }, []);

  const handleLike = async (postId: string, post: Post) => {
    if (!currentUser) { toast.error("Please log in to like posts"); return; }
    if (likingPosts[postId]) return;
    const hasLiked = post.likes?.some((like) => like.userId === currentUser.userId);
    setLikingPosts((prev) => ({ ...prev, [postId]: true }));
    try {
      if (hasLiked) {
        await unlikePost(postId, currentUser.userId);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, likes: p.likes?.filter((l) => l.userId !== currentUser.userId), likeCount: Math.max(0, (p.likeCount || 1) - 1) }
              : p,
          ),
        );
      } else {
        await likePost(postId, currentUser.userId);
        setPosts((prev) =>
          prev.map((p) =>
            p.id === postId
              ? { ...p, likes: [...(p.likes || []), { id: "", userId: currentUser.userId, user: { firstName: currentUser.firstName, lastName: currentUser.lastName } }], likeCount: (p.likeCount || 0) + 1 }
              : p,
          ),
        );
      }
    } catch (error: any) {
      if (error.response?.status === 400) toast.error("You have already liked this post");
      else toast.error("Failed to update like");
    } finally { setLikingPosts((prev) => ({ ...prev, [postId]: false })); }
  };

  const handleComment = async (postId: string) => {
    const commentText = newComments[postId];
    if (!commentText?.trim() || !currentUser) return;
    setSubmittingComments((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await commentPost(postId, { userId: currentUser.userId, content: commentText });
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, comments: [...(p.comments || []), res.data], commentCount: (p.commentCount || 0) + 1 } : p,
        ),
      );
      setNewComments((prev) => ({ ...prev, [postId]: "" }));
      toast.success("Comment added!");
    } catch { toast.error("Failed to add comment"); }
    finally { setSubmittingComments((prev) => ({ ...prev, [postId]: false })); }
  };

  const toggleExpand = (postId: string) => setExpandedPosts((prev) => ({ ...prev, [postId]: !prev[postId] }));

  const filteredPosts = posts.filter((post) => selectedType === "all" || post.postType === selectedType);

  if (loading && !refreshing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-30 backdrop-blur-md relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute w-[200px] h-[200px] rounded-full bg-blue-400/15 dark:bg-blue-500/20 -top-[90px] -right-[30px]" />
          <div className="absolute w-[140px] h-[140px] rounded-full bg-blue-500/15 dark:bg-blue-400/20 -bottom-[50px] -left-[10px]" />
          {[{s:8,l:"10%",t:10,k:"particle-1",d:"5.2s"},{s:12,l:"28%",t:42,k:"particle-2",d:"6.4s"},{s:6,l:"46%",t:14,k:"particle-3",d:"5.6s"},{s:10,l:"64%",t:28,k:"particle-4",d:"7.0s"},{s:14,l:"82%",t:8,k:"particle-5",d:"7.6s"},{s:7,l:"20%",t:72,k:"particle-6",d:"6.2s"}].map((p,i)=>(
            <div key={i} className="absolute rounded-full bg-blue-400/50 dark:bg-white/35" style={{width:p.s,height:p.s,left:p.l,top:p.t,animation:`${p.k} ${p.d} ease-in-out infinite`,animationDelay:["0s","0.6s","1.2s","0.3s","0.9s","1.5s"][i]}} />
          ))}
        </div>
        <div className="flex items-center gap-3 relative z-10">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push("/user/dashboard/mobile")}
            className="p-1.5 -ml-1.5 rounded-full hover:bg-muted text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>
          <h1 className="text-lg font-bold text-foreground">Posts</h1>
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="h-8 px-2 rounded-lg border border-border bg-muted text-foreground text-sm appearance-none pr-6"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 6px center",
            }}
          >
            {POST_TYPES.map((type) => (
              <option key={type.value} value={type.value} className="text-foreground">
                {type.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {refreshing && (
        <div className="flex items-center justify-center py-2 bg-muted/50">
          <Loader2 className="h-4 w-4 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Refreshing...</span>
        </div>
      )}

      <StaggerReveal className="space-y-4 px-3 py-3" staggerDelay={0.06}>
        {filteredPosts.length > 0 ? (
          filteredPosts.map((post) => {
            const hasLiked = post.likes?.some((like) => like.userId === currentUser?.userId);
            const isExpanded = expandedPosts[post.id];

            return (
              <StaggerItem key={post.id}>
                <motion.div
                  layout
                  className={`rounded-[1.25rem] border ${post.isPinned ? "border-amber-400/60" : "border-slate-200/50"} bg-card shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] p-4 space-y-3`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                        {post.author?.firstName?.[0] || "A"}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">
                            {post.author?.firstName} {post.author?.lastName}
                          </span>
                          {post.isPinned && (
                            <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-800 border-amber-200">
                              Pinned
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                          <span>{format(new Date(post.createdAt), "MMM dd, HH:mm")}</span>
                          {post.postType !== "all" && (
                            <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-semibold border ${typeStyles[post.postType] || typeStyles.general}`}>
                              {POST_TYPES.find((t) => t.value === post.postType)?.label || post.postType}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {isExpanded ? post.content : post.content.slice(0, 200)}
                      {post.content.length > 200 && !isExpanded && (
                        <button
                          onClick={() => toggleExpand(post.id)}
                          className="ml-1 text-primary text-sm font-medium hover:underline"
                        >
                          Read more...
                        </button>
                      )}
                    </p>
                  </div>

                  {post.imageUrl && (
                    <div className="overflow-hidden rounded-xl">
                      <img src={post.imageUrl} alt="" className="max-h-[300px] rounded-xl object-contain w-full" />
                    </div>
                  )}

                  <div className="flex items-center gap-4 py-2 border-t border-b border-border/50">
                    <motion.button
                      whileTap={{ scale: 0.8 }}
                      onClick={() => handleLike(post.id, post)}
                      disabled={likingPosts[post.id]}
                      className={`flex items-center gap-1.5 text-sm ${hasLiked ? "text-rose-500" : "text-muted-foreground"} font-medium`}
                    >
                      <motion.div
                        animate={hasLiked ? { scale: [1, 1.3, 1] } : {}}
                        transition={{ duration: 0.3 }}
                      >
                        <Heart className={`h-4 w-4 ${hasLiked ? "fill-rose-500" : ""}`} />
                      </motion.div>
                      {post.likeCount || 0}
                    </motion.button>
                    <button
                      onClick={() => toggleExpand(post.id)}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground font-medium"
                    >
                      <MessageCircle className="h-4 w-4" />
                      {post.commentCount || 0}
                    </button>
                  </div>

                  {post.likes && post.likes.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex -space-x-1">
                        {post.likes.slice(0, 4).map((like, idx) => (
                          <div
                            key={like.id || idx}
                            className="h-5 w-5 rounded-full bg-primary border-2 border-card flex items-center justify-center text-[8px] text-primary-foreground"
                          >
                            {like.user?.firstName?.[0] || "U"}
                          </div>
                        ))}
                        {post.likes.length > 4 && (
                          <div className="h-5 w-5 rounded-full bg-muted border-2 border-card flex items-center justify-center text-[8px] font-medium text-muted-foreground">
                            +{post.likes.length - 4}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {post.likes.length === 1
                          ? `${post.likes[0].user?.firstName} liked`
                          : `${post.likes[0].user?.firstName} and ${post.likes.length - 1} others`}
                      </span>
                    </div>
                  )}

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 100, damping: 22 }}
                        className="space-y-3 overflow-hidden"
                      >
                        <div className="flex gap-2 pt-1">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm flex-shrink-0">
                            {currentUser?.firstName?.[0] || "U"}
                          </div>
                          <div className="flex-1">
                            <Textarea
                              placeholder="Write a comment..."
                              value={newComments[post.id] || ""}
                              onChange={(e) => setNewComments((prev) => ({ ...prev, [post.id]: e.target.value }))}
                              rows={2}
                              className="mb-2 text-sm bg-muted/50 border-border/50"
                            />
                            <div className="flex justify-end">
                              <Button
                                onClick={() => handleComment(post.id)}
                                disabled={!newComments[post.id]?.trim()}
                                loading={submittingComments[post.id]}
                                size="sm"
                                className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                              >
                                <Send className="h-3 w-3 mr-1" />Post
                              </Button>
                            </div>
                          </div>
                        </div>

                        {post.comments && post.comments.length > 0 && (
                          <div className="space-y-2 pl-2 border-l-2 border-border">
                            {post.comments.map((comment) => (
                              <div key={comment.id} className="flex gap-2">
                                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[10px] flex-shrink-0">
                                  {comment.user?.firstName?.[0] || "U"}
                                </div>
                                <div className="flex-1 bg-muted/50 rounded-xl p-2.5">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-xs text-foreground">
                                      {comment.user?.firstName} {comment.user?.lastName}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">
                                      {format(new Date(comment.createdAt), "MMM dd, HH:mm")}
                                    </span>
                                  </div>
                                  <p className="text-xs text-muted-foreground">{comment.content}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </StaggerItem>
            );
          })
        ) : (
          <MobileEmptyState
            icon={<MessageSquare size={28} />}
            title="No posts found"
            description={selectedType !== "all" ? "Try adjusting your filters" : "Check back later for new posts"}
          />
        )}
      </StaggerReveal>
    </div>
  );
}
