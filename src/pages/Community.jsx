import React, { useState, useEffect } from 'react';
import { ForumCategory, ForumThread, ForumReply, User, Announcement } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Plus, Pin, Lock, Eye, Send, Search, Megaphone, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import AnnouncementCard from '../components/community/AnnouncementCard';
import AnnouncementForm from '../components/community/AnnouncementForm';
import MessageInbox from '../components/community/MessageInbox';

export default function Community() {
  const [categories, setCategories] = useState([]);
  const [threads, setThreads] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedThread, setSelectedThread] = useState(null);
  const [replies, setReplies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewThreadOpen, setIsNewThreadOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [replyContent, setReplyContent] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('discussions');
  
  // Announcements
  const [isAnnouncementFormOpen, setIsAnnouncementFormOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);

  const [newThread, setNewThread] = useState({
    category_id: '',
    title: '',
    content: ''
  });

  const isAdmin = currentUser?.association_role === 'Administrator';

  useEffect(() => {
    loadForumData();
  }, []);

  const loadForumData = async () => {
    try {
      setIsLoading(true);
      const user = await User.me();
      setCurrentUser(user);

      const [categoryList, threadList, announcementList] = await Promise.all([
        ForumCategory.list(),
        ForumThread.list('-last_activity_at'),
        Announcement.filter({ is_published: true }, '-created_date')
      ]);

      setCategories(categoryList);
      setThreads(threadList);
      
      // Filter out expired announcements
      const validAnnouncements = announcementList.filter(a => 
        !a.expires_at || new Date(a.expires_at) >= new Date()
      );
      setAnnouncements(validAnnouncements);
    } catch (error) {
      console.error('Failed to load forum data:', error);
      toast.error('Failed to load forum');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAnnouncement = async (formData) => {
    setIsSavingAnnouncement(true);
    try {
      if (editingAnnouncement) {
        await Announcement.update(editingAnnouncement.id, formData);
        toast.success('Announcement updated!');
      } else {
        const newAnnouncement = await Announcement.create({
          ...formData,
          author_user_id: currentUser.id,
          publish_date: formData.is_published ? new Date().toISOString() : null
        });

        // Send email notification if requested
        if (formData.send_email_notification && formData.is_published) {
          try {
            await base44.functions.invoke('sendAnnouncementNotification', {
              announcement_id: newAnnouncement.id
            });
          } catch (emailError) {
            console.error('Failed to send announcement notifications:', emailError);
          }
        }
        toast.success('Announcement published!');
      }
      
      setIsAnnouncementFormOpen(false);
      setEditingAnnouncement(null);
      loadForumData();
    } catch (error) {
      console.error('Failed to save announcement:', error);
      toast.error('Failed to save announcement');
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (announcement) => {
    if (!confirm('Are you sure you want to delete this announcement?')) return;
    
    try {
      await Announcement.delete(announcement.id);
      toast.success('Announcement deleted');
      loadForumData();
    } catch (error) {
      console.error('Failed to delete announcement:', error);
      toast.error('Failed to delete announcement');
    }
  };

  const handleViewAnnouncement = async (announcement) => {
    setSelectedAnnouncement(announcement);
    // Update view count
    await Announcement.update(announcement.id, {
      view_count: (announcement.view_count || 0) + 1
    });
  };

  const loadThreadReplies = async (threadId) => {
    try {
      const replyList = await ForumReply.filter({ thread_id: threadId }, 'created_date');
      setReplies(replyList);

      // Update view count
      const thread = threads.find(t => t.id === threadId);
      if (thread) {
        await ForumThread.update(threadId, { view_count: (thread.view_count || 0) + 1 });
      }
    } catch (error) {
      console.error('Failed to load replies:', error);
    }
  };

  const handleCreateThread = async () => {
    if (!newThread.title || !newThread.content || !newThread.category_id) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const createdThread = await ForumThread.create({
        ...newThread,
        author_user_id: currentUser.id,
        last_activity_at: new Date().toISOString()
      });

      toast.success('Thread created successfully!');
      setIsNewThreadOpen(false);
      setNewThread({ category_id: '', title: '', content: '' });
      loadForumData();

      // Trigger notifications for new thread (async, don't wait)
      try {
        base44.functions.invoke('notifyForumActivity', {
          thread_id: createdThread.id,
          category_id: newThread.category_id,
          is_new_thread: true
        }).catch(err => console.error('Failed to send forum notifications:', err));
      } catch (error) {
        console.error('Failed to trigger forum notifications:', error);
      }
    } catch (error) {
      console.error('Failed to create thread:', error);
      toast.error('Failed to create thread');
    }
  };

  const handleReplyToThread = async () => {
    if (!replyContent.trim()) {
      toast.error('Reply cannot be empty');
      return;
    }

    try {
      await ForumReply.create({
        thread_id: selectedThread.id,
        content: replyContent,
        author_user_id: currentUser.id
      });

      // Update thread reply count and last activity
      await ForumThread.update(selectedThread.id, {
        reply_count: (selectedThread.reply_count || 0) + 1,
        last_activity_at: new Date().toISOString()
      });

      toast.success('Reply posted!');
      setReplyContent('');
      loadThreadReplies(selectedThread.id);
      loadForumData();
    } catch (error) {
      console.error('Failed to post reply:', error);
      toast.error('Failed to post reply');
    }
  };

  const openThread = (thread) => {
    setSelectedThread(thread);
    loadThreadReplies(thread.id);
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : 'Unknown';
  };

  const getCategoryColor = (categoryId) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.color || '#6B7280';
  };

  const filteredThreads = threads.filter(thread => {
    const matchesCategory = selectedCategory === 'all' || thread.category_id === selectedCategory;
    const matchesSearch = thread.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         thread.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  // Sort announcements with pinned first
  const sortedAnnouncements = [...announcements].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    if (a.priority === 'urgent' && b.priority !== 'urgent') return -1;
    if (a.priority !== 'urgent' && b.priority === 'urgent') return 1;
    return new Date(b.created_date) - new Date(a.created_date);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Community</h2>
          <p className="text-gray-500">Announcements, discussions, and member communication</p>
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" onClick={() => {
              setEditingAnnouncement(null);
              setIsAnnouncementFormOpen(true);
            }}>
              <Megaphone className="w-4 h-4 mr-2" />
              New Announcement
            </Button>
          )}
          <Button onClick={() => setIsNewThreadOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Discussion
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="announcements" className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Announcements
            {announcements.length > 0 && (
              <Badge variant="secondary" className="ml-1">{announcements.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="discussions" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Discussions
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Messages
          </TabsTrigger>
        </TabsList>

        {/* Announcements Tab */}
        <TabsContent value="announcements" className="space-y-4 mt-6">
          {sortedAnnouncements.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Announcements</h3>
                <p className="text-gray-600 mb-4">
                  {isAdmin 
                    ? 'Create your first announcement to share important updates with members.'
                    : 'Check back later for updates from your association.'}
                </p>
                {isAdmin && (
                  <Button onClick={() => setIsAnnouncementFormOpen(true)}>
                    Create Announcement
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sortedAnnouncements.map(announcement => (
                <AnnouncementCard
                  key={announcement.id}
                  announcement={announcement}
                  isAdmin={isAdmin}
                  onView={handleViewAnnouncement}
                  onEdit={(a) => {
                    setEditingAnnouncement(a);
                    setIsAnnouncementFormOpen(true);
                  }}
                  onDelete={handleDeleteAnnouncement}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Discussions Tab */}
        <TabsContent value="discussions" className="space-y-4 mt-6">
          {/* Categories & Search */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search discussions..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Thread List */}
          <div className="space-y-3">
            {filteredThreads.map(thread => (
              <Card 
                key={thread.id} 
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => openThread(thread)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar>
                      <AvatarFallback>{getInitials(currentUser?.full_name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        {thread.is_pinned && <Pin className="h-4 w-4 text-blue-500" />}
                        {thread.is_locked && <Lock className="h-4 w-4 text-gray-500" />}
                        <h3 className="font-semibold text-lg line-clamp-1">{thread.title}</h3>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{thread.content}</p>
                      <div className="flex items-center gap-3 mt-3 text-xs text-gray-500">
                        <Badge 
                          variant="outline" 
                          style={{ 
                            backgroundColor: getCategoryColor(thread.category_id) + '20',
                            borderColor: getCategoryColor(thread.category_id)
                          }}
                        >
                          {getCategoryName(thread.category_id)}
                        </Badge>
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {thread.reply_count || 0} replies
                        </span>
                        <span className="flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {thread.view_count || 0} views
                        </span>
                        <span>
                          {format(new Date(thread.last_activity_at || thread.created_date), 'MMM d, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredThreads.length === 0 && (
              <Card>
                <CardContent className="py-12 text-center">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Discussions Yet</h3>
                  <p className="text-gray-600 mb-4">Be the first to start a conversation!</p>
                  <Button onClick={() => setIsNewThreadOpen(true)}>
                    Start a Discussion
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* Messages Tab */}
        <TabsContent value="messages" className="mt-6">
          <MessageInbox currentUser={currentUser} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>

      {/* New Thread Dialog */}
      <Dialog open={isNewThreadOpen} onOpenChange={setIsNewThreadOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Start a New Discussion</DialogTitle>
            <DialogDescription>
              Share your thoughts, ask questions, or start a conversation with the community.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select 
                value={newThread.category_id} 
                onValueChange={(value) => setNewThread({...newThread, category_id: value})}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Give your discussion a clear title..."
                value={newThread.title}
                onChange={(e) => setNewThread({...newThread, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="What would you like to discuss?"
                value={newThread.content}
                onChange={(e) => setNewThread({...newThread, content: e.target.value})}
                rows={6}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewThreadOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateThread}>
              Post Discussion
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Announcement Form */}
      <AnnouncementForm
        isOpen={isAnnouncementFormOpen}
        onClose={() => {
          setIsAnnouncementFormOpen(false);
          setEditingAnnouncement(null);
        }}
        onSave={handleSaveAnnouncement}
        announcement={editingAnnouncement}
        isSaving={isSavingAnnouncement}
      />

      {/* Announcement Detail Dialog */}
      <Dialog open={!!selectedAnnouncement} onOpenChange={() => setSelectedAnnouncement(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedAnnouncement && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  {selectedAnnouncement.is_pinned && <Pin className="h-4 w-4 text-blue-500" />}
                  <DialogTitle>{selectedAnnouncement.title}</DialogTitle>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge className={
                    selectedAnnouncement.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    selectedAnnouncement.priority === 'important' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }>
                    {selectedAnnouncement.priority}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {format(new Date(selectedAnnouncement.publish_date || selectedAnnouncement.created_date), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              </DialogHeader>
              <div className="py-4">
                <p className="text-gray-700 whitespace-pre-wrap">{selectedAnnouncement.content}</p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Thread Detail Dialog */}
      <Dialog open={!!selectedThread} onOpenChange={() => setSelectedThread(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
          {selectedThread && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  {selectedThread.is_pinned && <Pin className="h-4 w-4 text-blue-500" />}
                  <DialogTitle className="text-xl">{selectedThread.title}</DialogTitle>
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <Badge 
                    variant="outline"
                    style={{ 
                      backgroundColor: getCategoryColor(selectedThread.category_id) + '20',
                      borderColor: getCategoryColor(selectedThread.category_id)
                    }}
                  >
                    {getCategoryName(selectedThread.category_id)}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {format(new Date(selectedThread.created_date), 'MMM d, yyyy')}
                  </span>
                </div>
              </DialogHeader>

              <div className="space-y-4 py-4">
                {/* Original Post */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-gray-700 whitespace-pre-wrap">{selectedThread.content}</p>
                </div>

                {/* Replies */}
                <div className="space-y-3">
                  {replies.map(reply => (
                    <div key={reply.id} className="flex gap-3 p-4 border rounded-lg">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {getInitials(currentUser?.full_name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">Member</span>
                          <span className="text-xs text-gray-500">
                            {format(new Date(reply.created_date), 'MMM d, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{reply.content}</p>
                        {reply.is_solution && (
                          <Badge className="mt-2 bg-green-100 text-green-800">
                            ✓ Solution
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Reply Form */}
                {!selectedThread.is_locked && (
                  <div className="space-y-3 pt-4 border-t">
                    <Textarea
                      placeholder="Write your reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      rows={4}
                    />
                    <div className="flex justify-end">
                      <Button onClick={handleReplyToThread}>
                        <Send className="w-4 h-4 mr-2" />
                        Post Reply
                      </Button>
                    </div>
                  </div>
                )}

                {selectedThread.is_locked && (
                  <div className="text-center py-4 text-gray-500">
                    <Lock className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">This discussion has been locked</p>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}