"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  MessageSquarePlus,
  Heart,
  MessageCircle,
  Image as ImageIcon,
  Pin,
  Trash2,
  Edit,
  Eye,
  Plus,
  Search,
  X,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  getPosts,
  createPost,
  deletePost,
  updatePost,
  getProfile,
  uploadFile,
} from "@/app/api/api";
import { toast } from "sonner";
import Link from "next/link";

// Post types
const POST_TYPES = [
  { value: "general", label: "General", color: "bg-gray-100 text-gray-800" },
  { value: "announcement", label: "Announcement", color: "bg-blue-100 text-blue-800" },
  { value: "new_joiner", label: "New Joiner", color: "bg-green-100 text-green-800" },
  { value: "celebration", label: "Celebration", color: "bg-purple-100 text-purple-800" },
  { value: "event", label: "Event", color: "bg-orange-100 text-orange-800" },
];

interface Post {
  id: string;
  content: string;
  imageUrl?: string;
  postType: string;
  isPinned: boolean;
  authorId?: string;
  author?: {
    firstName?: string;
    lastName?: string;
    avatar?: string;
  };
  organizationId: string;
  createdAt: string;
  likeCount?: number;
  commentCount?: number;
}

export default function PostsPage() {
  const [activeTab, setActiveTab] = useState("view");
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [organizationId, setOrganizationId] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Create post form state
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostType, setNewPostType] = useState("general");
  const [newPostImage, setNewPostImage] = useState<string>("");
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editType, setEditType] = useState("");
  const [editPinned, setEditPinned] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (organizationId) {
      loadPosts();
    }
  }, [organizationId]);

  const loadProfile = async () => {
    try {
      const res = await getProfile();
      const user = res.data;
      setCurrentUser(user);
      const orgId = user?.organizationId || "4750a13d-c530-4583-aa8b-36733d06ec22";
      setOrganizationId(orgId);
    } catch (error) {
      toast.error("Failed to load profile");
      setOrganizationId("4750a13d-c530-4583-aa8b-36733d06ec22"); // Default org
    }
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await getPosts(organizationId);
      setPosts(res.data || []);
    } catch (error) {
      toast.error("Failed to load posts");
      setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await uploadFile(formData);
      const url = res.data?.url || res.data?.fileUrl;
      if (url) {
        setNewPostImage(url);
        toast.success("Image uploaded successfully");
      }
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setImageUploading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) {
      toast.error("Please enter post content");
      return;
    }

    setIsSubmitting(true);
    try {
      await createPost({
        content: newPostContent,
        imageUrl: newPostImage || undefined,
        postType: newPostType,
        authorId: currentUser?.userId,
        organizationId,
        isPinned,
      });
      toast.success("Post created successfully!");
      setNewPostContent("");
      setNewPostImage("");
      setNewPostType("general");
      setIsPinned(false);
      setActiveTab("view");
      loadPosts();
    } catch (error) {
      toast.error("Failed to create post");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;

    try {
      await deletePost(postId);
      toast.success("Post deleted successfully!");
      loadPosts();
    } catch (error) {
      toast.error("Failed to delete post");
    }
  };

  const openEditDialog = (post: Post) => {
    setEditingPost(post);
    setEditContent(post.content);
    setEditType(post.postType);
    setEditPinned(post.isPinned);
    setEditDialogOpen(true);
  };

  const handleUpdatePost = async () => {
    if (!editingPost || !editContent.trim()) {
      toast.error("Please enter post content");
      return;
    }

    try {
      await updatePost(editingPost.id, {
        content: editContent,
        postType: editType,
        isPinned: editPinned,
      });
      toast.success("Post updated successfully!");
      setEditDialogOpen(false);
      setEditingPost(null);
      loadPosts();
    } catch (error) {
      toast.error("Failed to update post");
    }
  };

  // Filter posts
  const filteredPosts = posts.filter((post) => {
    const matchesSearch =
      searchQuery === "" ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === "all" || post.postType === filterType;
    return matchesSearch && matchesType;
  });

  const getTypeBadge = (type: string) => {
    const typeConfig = POST_TYPES.find((t) => t.value === type);
    return typeConfig ? (
      <Badge className={`${typeConfig.color} text-xs`}>{typeConfig.label}</Badge>
    ) : (
      <Badge variant="outline">{type}</Badge>
    );
  };

  return (
    <div className="px-2 py-2 md:px-6 md:py-6 max-w-[1700px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-[#184a8c] to-[#00b4db] rounded-lg">
            <MessageSquarePlus className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              Community Posts
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Manage company posts and announcements
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="view" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            View Posts
          </TabsTrigger>
          <TabsTrigger value="create" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Post
          </TabsTrigger>
        </TabsList>

        {/* View Posts Tab */}
        <TabsContent value="view">
          {/* Filters */}
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search posts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {POST_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={loadPosts} variant="outline">
                  Refresh
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Posts List */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[#184a8c]" />
            </div>
          ) : filteredPosts.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquarePlus className="h-12 w-12 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">No posts found</p>
                <Button
                  className="mt-4 bg-[#184a8c] hover:bg-[#184a8c]/90"
                  onClick={() => setActiveTab("create")}
                >
                  Create Your First Post
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredPosts.map((post) => (
                <Card
                  key={post.id}
                  className={`overflow-hidden ${
                    post.isPinned ? "border-2 border-yellow-400" : ""
                  }`}
                >
                  <CardContent className="p-6">
                    {/* Post Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={post.author?.avatar} />
                          <AvatarFallback className="bg-[#184a8c] text-white">
                            {post.author?.firstName?.[0] || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {post.author?.firstName} {post.author?.lastName}
                            </span>
                            {post.isPinned && (
                              <Pin className="h-4 w-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>
                              {format(new Date(post.createdAt), "MMM dd, yyyy HH:mm")}
                            </span>
                            {getTypeBadge(post.postType)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(post)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Link href={`/admin/posts/${post.id}`}>
                          <Button variant="outline" size="sm">
                            View Full
                          </Button>
                        </Link>
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="mb-4">
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {post.content}
                      </p>
                    </div>

                    {/* Post Image */}
                    {post.imageUrl && (
                      <div className="mb-4">
                        <img
                          src={post.imageUrl}
                          alt="Post image"
                          className="max-h-96 rounded-lg object-cover"
                        />
                      </div>
                    )}

                    {/* Post Stats */}
                    <div className="flex items-center gap-4 text-sm text-gray-500 pt-4 border-t">
                      <div className="flex items-center gap-1">
                        <Heart className="h-4 w-4" />
                        <span>{post.likeCount || 0} likes</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MessageCircle className="h-4 w-4" />
                        <span>{post.commentCount || 0} comments</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Create Post Tab */}
        <TabsContent value="create">
          <Card>
            <CardHeader>
              <CardTitle>Create New Post</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Post Type */}
              <div className="space-y-2">
                <Label>Post Type</Label>
                <Select value={newPostType} onValueChange={setNewPostType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select post type" />
                  </SelectTrigger>
                  <SelectContent>
                    {POST_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label>Post Content</Label>
                <Textarea
                  placeholder="What's on your mind? Share updates, announcements, or celebrate with your team!"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={6}
                />
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label>Image (Optional)</Label>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      disabled={imageUploading}
                    />
                  </div>
                  {imageUploading && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}
                </div>
                {newPostImage && (
                  <div className="relative mt-4 inline-block">
                    <img
                      src={newPostImage}
                      alt="Preview"
                      className="max-h-48 rounded-lg object-cover"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6"
                      onClick={() => setNewPostImage("")}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Pin Post */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="pinPost"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="pinPost" className="cursor-pointer">
                  Pin this post to the top
                </Label>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewPostContent("");
                    setNewPostImage("");
                    setNewPostType("general");
                    setIsPinned(false);
                  }}
                >
                  Clear
                </Button>
                <Button
                  onClick={handleCreatePost}
                  disabled={isSubmitting || !newPostContent.trim()}
                  className="bg-[#184a8c] hover:bg-[#184a8c]/90"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <MessageSquarePlus className="mr-2 h-4 w-4" />
                      Publish Post
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Post</DialogTitle>
            <DialogDescription>
              Update the post content and settings.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Post Type</Label>
              <Select value={editType} onValueChange={setEditType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select post type" />
                </SelectTrigger>
                <SelectContent>
                  {POST_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={6}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="editPinPost"
                checked={editPinned}
                onChange={(e) => setEditPinned(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="editPinPost" className="cursor-pointer">
                Pin this post to the top
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePost}
              className="bg-[#184a8c] hover:bg-[#184a8c]/90"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

