import React, { useState, useEffect } from 'react';
import { DirectMessage, User, Member } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Mail, Send, Reply, Inbox, SendHorizontal, Trash2, Check, Circle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function MessageInbox({ currentUser, isAdmin = false }) {
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('inbox');
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  
  const [composeData, setComposeData] = useState({
    recipient_user_id: '',
    subject: '',
    content: ''
  });

  useEffect(() => {
    loadMessages();
  }, [currentUser]);

  const loadMessages = async () => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      const [messageList, memberList, userList] = await Promise.all([
        DirectMessage.list('-created_date'),
        Member.list(),
        User.list()
      ]);

      setMessages(messageList);
      setMembers(memberList);
      setUsers(userList);
    } catch (error) {
      console.error('Failed to load messages:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const inboxMessages = messages.filter(m => 
    m.recipient_user_id === currentUser?.id || 
    (m.recipient_user_id === null && m.sender_user_id !== currentUser?.id)
  );

  const sentMessages = messages.filter(m => m.sender_user_id === currentUser?.id);

  const unreadCount = inboxMessages.filter(m => !m.is_read).length;

  const getSenderName = (userId) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Unknown';
  };

  const getRecipientName = (userId) => {
    if (!userId) return 'All Members';
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Unknown';
  };

  const handleOpenMessage = async (message) => {
    setSelectedMessage(message);
    
    // Mark as read
    if (!message.is_read && message.recipient_user_id === currentUser?.id) {
      await DirectMessage.update(message.id, { 
        is_read: true, 
        read_at: new Date().toISOString() 
      });
      loadMessages();
    }
  };

  const handleSendMessage = async () => {
    if (!composeData.subject.trim() || !composeData.content.trim()) {
      toast.error('Please fill in subject and message');
      return;
    }

    try {
      await DirectMessage.create({
        sender_user_id: currentUser.id,
        recipient_user_id: composeData.recipient_user_id || null,
        subject: composeData.subject,
        content: composeData.content,
        is_from_admin: isAdmin,
        parent_message_id: isReplying && selectedMessage ? selectedMessage.id : null
      });

      toast.success('Message sent!');
      setIsComposeOpen(false);
      setIsReplying(false);
      setComposeData({ recipient_user_id: '', subject: '', content: '' });
      loadMessages();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    }
  };

  const handleReply = (message) => {
    setIsReplying(true);
    setComposeData({
      recipient_user_id: message.sender_user_id,
      subject: `Re: ${message.subject}`,
      content: ''
    });
    setIsComposeOpen(true);
  };

  const handleDelete = async (message) => {
    if (!confirm('Delete this message?')) return;
    
    try {
      await DirectMessage.delete(message.id);
      toast.success('Message deleted');
      setSelectedMessage(null);
      loadMessages();
    } catch (error) {
      console.error('Failed to delete message:', error);
      toast.error('Failed to delete message');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Mail className="h-5 w-5" />
          <h3 className="font-semibold">Messages</h3>
          {unreadCount > 0 && (
            <Badge className="bg-blue-500">{unreadCount}</Badge>
          )}
        </div>
        <Button size="sm" onClick={() => {
          setIsReplying(false);
          setComposeData({ recipient_user_id: '', subject: '', content: '' });
          setIsComposeOpen(true);
        }}>
          <Send className="h-4 w-4 mr-2" />
          Compose
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inbox" className="flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            Inbox ({inboxMessages.length})
          </TabsTrigger>
          <TabsTrigger value="sent" className="flex items-center gap-2">
            <SendHorizontal className="h-4 w-4" />
            Sent ({sentMessages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="space-y-2 mt-4">
          {inboxMessages.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No messages in inbox</p>
          ) : (
            inboxMessages.map(message => (
              <div
                key={message.id}
                className={`p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${!message.is_read ? 'bg-blue-50 border-blue-200' : ''}`}
                onClick={() => handleOpenMessage(message)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(getSenderName(message.sender_user_id))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {!message.is_read && <Circle className="h-2 w-2 fill-blue-500 text-blue-500" />}
                        <span className={`font-medium text-sm ${!message.is_read ? 'font-semibold' : ''}`}>
                          {getSenderName(message.sender_user_id)}
                        </span>
                        {message.is_from_admin && (
                          <Badge variant="outline" className="text-xs">Admin</Badge>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">
                        {format(new Date(message.created_date), 'MMM d')}
                      </span>
                    </div>
                    <p className={`text-sm truncate ${!message.is_read ? 'font-medium' : 'text-gray-600'}`}>
                      {message.subject}
                    </p>
                    <p className="text-xs text-gray-500 truncate">{message.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="sent" className="space-y-2 mt-4">
          {sentMessages.length === 0 ? (
            <p className="text-center text-gray-500 py-8">No sent messages</p>
          ) : (
            sentMessages.map(message => (
              <div
                key={message.id}
                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleOpenMessage(message)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {getInitials(getRecipientName(message.recipient_user_id))}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">
                        To: {getRecipientName(message.recipient_user_id)}
                      </span>
                      <div className="flex items-center gap-2">
                        {message.is_read && <Check className="h-3 w-3 text-green-500" />}
                        <span className="text-xs text-gray-500">
                          {format(new Date(message.created_date), 'MMM d')}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 truncate">{message.subject}</p>
                    <p className="text-xs text-gray-500 truncate">{message.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Message Detail Dialog */}
      <Dialog open={!!selectedMessage} onOpenChange={() => setSelectedMessage(null)}>
        <DialogContent className="sm:max-w-[600px]">
          {selectedMessage && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedMessage.subject}</DialogTitle>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <span>
                    {selectedMessage.sender_user_id === currentUser?.id ? 'To' : 'From'}: {' '}
                    {selectedMessage.sender_user_id === currentUser?.id 
                      ? getRecipientName(selectedMessage.recipient_user_id)
                      : getSenderName(selectedMessage.sender_user_id)
                    }
                  </span>
                  <span>•</span>
                  <span>{format(new Date(selectedMessage.created_date), 'MMM d, yyyy h:mm a')}</span>
                </div>
              </DialogHeader>
              
              <div className="py-4">
                <p className="text-gray-700 whitespace-pre-wrap">{selectedMessage.content}</p>
              </div>

              <DialogFooter>
                <Button variant="outline" size="sm" onClick={() => handleDelete(selectedMessage)}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
                {selectedMessage.sender_user_id !== currentUser?.id && (
                  <Button size="sm" onClick={() => handleReply(selectedMessage)}>
                    <Reply className="h-4 w-4 mr-2" />
                    Reply
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Compose Dialog */}
      <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isReplying ? 'Reply' : 'New Message'}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">To</label>
              <Select 
                value={composeData.recipient_user_id} 
                onValueChange={(value) => setComposeData({ ...composeData, recipient_user_id: value })}
                disabled={isReplying}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select recipient..." />
                </SelectTrigger>
                <SelectContent>
                  {isAdmin && <SelectItem value={null}>All Members (Broadcast)</SelectItem>}
                  {users.filter(u => u.id !== currentUser?.id).map(user => (
                    <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={composeData.subject}
                onChange={(e) => setComposeData({ ...composeData, subject: e.target.value })}
                placeholder="Message subject..."
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={composeData.content}
                onChange={(e) => setComposeData({ ...composeData, content: e.target.value })}
                placeholder="Write your message..."
                rows={6}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsComposeOpen(false)}>Cancel</Button>
            <Button onClick={handleSendMessage}>
              <Send className="h-4 w-4 mr-2" />
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}