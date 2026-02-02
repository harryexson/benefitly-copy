import React, { useState, useEffect } from 'react';
import { DirectMessage, Member } from '@/entities/all';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Send, Mail, Search, Plus, Inbox, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function Messaging() {
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isComposing, setIsComposing] = useState(false);

  // New message state
  const [newRecipient, setNewRecipient] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const currentUser = await User.me();
      setUser(currentUser);

      const [memberList, messageList] = await Promise.all([
        Member.list(),
        DirectMessage.filter({
          $or: [
            { sender_user_id: currentUser.id },
            { recipient_user_id: currentUser.id }
          ]
        }, '-created_date')
      ]);

      setMembers(memberList);
      setMessages(messageList);

      // Find current user's member profile
      const memberProfile = memberList.find(m => m.email === currentUser.email);
      setMember(memberProfile);

      // Group messages into conversations
      const convos = groupIntoConversations(messageList, currentUser.id);
      setConversations(convos);
    } catch (error) {
      console.error('Failed to load messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setIsLoading(false);
    }
  };

  const groupIntoConversations = (messageList, currentUserId) => {
    const convoMap = new Map();

    messageList.forEach(msg => {
      const otherUserId = msg.sender_user_id === currentUserId 
        ? msg.recipient_user_id 
        : msg.sender_user_id;
      
      if (!convoMap.has(otherUserId)) {
        convoMap.set(otherUserId, {
          userId: otherUserId,
          messages: [],
          lastMessage: msg,
          unreadCount: 0
        });
      }

      const convo = convoMap.get(otherUserId);
      convo.messages.push(msg);
      
      if (msg.recipient_user_id === currentUserId && !msg.is_read) {
        convo.unreadCount++;
      }

      if (new Date(msg.created_date) > new Date(convo.lastMessage.created_date)) {
        convo.lastMessage = msg;
      }
    });

    return Array.from(convoMap.values()).sort((a, b) => 
      new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date)
    );
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!newRecipient || !newSubject.trim() || !newMessage.trim()) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      setIsSending(true);

      await DirectMessage.create({
        sender_user_id: user.id,
        recipient_user_id: newRecipient,
        subject: newSubject,
        message_body: newMessage,
        is_read: false,
        is_from_admin: user.role === 'admin'
      });

      toast.success('Message sent successfully');
      setNewRecipient('');
      setNewSubject('');
      setNewMessage('');
      setIsComposing(false);

      // Reload messages
      await loadData();
    } catch (error) {
      console.error('Failed to send message:', error);
      toast.error('Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleReply = async (originalMessage) => {
    try {
      const replyBody = document.getElementById('reply-body')?.value;
      if (!replyBody || !replyBody.trim()) {
        toast.error('Please enter a message');
        return;
      }

      await DirectMessage.create({
        sender_user_id: user.id,
        recipient_user_id: originalMessage.sender_user_id,
        subject: `Re: ${originalMessage.subject}`,
        message_body: replyBody,
        is_read: false,
        is_from_admin: user.role === 'admin'
      });

      toast.success('Reply sent');
      document.getElementById('reply-body').value = '';
      await loadData();
    } catch (error) {
      console.error('Failed to send reply:', error);
      toast.error('Failed to send reply');
    }
  };

  const markAsRead = async (messageId) => {
    try {
      await DirectMessage.update(messageId, { is_read: true });
      await loadData();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const getUserName = (userId) => {
    const userMember = members.find(m => m.email === userId);
    if (userMember) {
      return `${userMember.first_name} ${userMember.last_name}`;
    }
    return 'Unknown User';
  };

  const getInitials = (name) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const filteredConversations = conversations.filter(convo => {
    const userName = getUserName(convo.userId);
    return userName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Messages</h2>
          <p className="text-gray-500">Private conversations with other members</p>
        </div>
        <Dialog open={isComposing} onOpenChange={setIsComposing}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              New Message
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>New Message</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSendMessage} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">To:</label>
                <Select value={newRecipient} onValueChange={setNewRecipient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select recipient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members.filter(m => m.email !== user?.email).map(m => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.first_name} {m.last_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Subject:</label>
                <Input
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  placeholder="Message subject..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message:</label>
                <Textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  rows={8}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsComposing(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isSending}>
                  {isSending ? 'Sending...' : 'Send Message'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Conversations List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Inbox className="h-5 w-5" />
              Conversations
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search conversations..."
                className="pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {filteredConversations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No conversations yet</p>
                </div>
              ) : (
                filteredConversations.map(convo => (
                  <div
                    key={convo.userId}
                    onClick={() => {
                      setSelectedConversation(convo);
                      // Mark unread messages as read
                      convo.messages
                        .filter(m => m.recipient_user_id === user.id && !m.is_read)
                        .forEach(m => markAsRead(m.id));
                    }}
                    className={`p-4 border-b cursor-pointer transition-colors ${
                      selectedConversation?.userId === convo.userId
                        ? 'bg-blue-50 border-l-4 border-l-blue-600'
                        : 'hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <Avatar>
                        <AvatarFallback>
                          {getInitials(getUserName(convo.userId))}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-semibold text-sm truncate">
                            {getUserName(convo.userId)}
                          </p>
                          {convo.unreadCount > 0 && (
                            <Badge className="bg-blue-600 text-xs">{convo.unreadCount}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 truncate">
                          {convo.lastMessage.subject}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {format(new Date(convo.lastMessage.created_date), 'MMM d, h:mm a')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Message Thread */}
        <Card className="md:col-span-2">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setSelectedConversation(null)}
                    className="md:hidden"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Avatar>
                    <AvatarFallback>
                      {getInitials(getUserName(selectedConversation.userId))}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">{getUserName(selectedConversation.userId)}</p>
                    <p className="text-xs text-gray-500">{selectedConversation.messages.length} messages</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[500px] p-4">
                  <div className="space-y-4">
                    {selectedConversation.messages
                      .sort((a, b) => new Date(a.created_date) - new Date(b.created_date))
                      .map(msg => {
                        const isFromMe = msg.sender_user_id === user.id;
                        return (
                          <div
                            key={msg.id}
                            className={`flex ${isFromMe ? 'justify-end' : 'justify-start'}`}
                          >
                            <div className={`max-w-[80%] ${isFromMe ? 'order-2' : 'order-1'}`}>
                              <div
                                className={`rounded-lg p-3 ${
                                  isFromMe
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 text-gray-900'
                                }`}
                              >
                                <p className="font-semibold text-sm mb-1">{msg.subject}</p>
                                <p className="text-sm whitespace-pre-wrap">{msg.message_body}</p>
                                <p className={`text-xs mt-2 ${isFromMe ? 'text-blue-100' : 'text-gray-500'}`}>
                                  {format(new Date(msg.created_date), 'MMM d, h:mm a')}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </ScrollArea>

                {/* Reply Box */}
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      id="reply-body"
                      placeholder="Type your reply..."
                      rows={3}
                      className="flex-1"
                    />
                    <Button
                      onClick={() => handleReply(selectedConversation.lastMessage)}
                      className="self-end"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </>
          ) : (
            <CardContent className="flex items-center justify-center h-[600px]">
              <div className="text-center text-gray-400">
                <Mail className="h-16 w-16 mx-auto mb-4" />
                <p>Select a conversation to view messages</p>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}