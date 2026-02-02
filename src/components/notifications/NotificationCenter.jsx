import React, { useState, useEffect } from 'react';
import { DirectMessage, Announcement, EventContribution, Payout, NotificationPreference, Member } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Mail, Megaphone, DollarSign, CheckCircle, X, Eye, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function NotificationCenter({ user, isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen, user]);

  const loadNotifications = async () => {
    if (!user || !user.id || !user.association_account_id) {
      setIsLoading(false);
      setNotifications([]);
      return;
    }
    
    try {
      setIsLoading(true);
      const allNotifications = [];

      // Get member profile
      const members = await Member.filter({ email: user.email });
      const member = members.length > 0 ? members[0] : null;

      // Check notification preferences
      let prefs = null;
      if (member) {
        const prefsList = await NotificationPreference.filter({ member_id: member.id });
        prefs = prefsList.length > 0 ? prefsList[0] : null;
      }

      // Load unread direct messages
      if (prefs?.email_general_announcements !== false) {
        try {
          const messages = await DirectMessage.filter({ 
            recipient_user_id: user.id,
            is_read: false 
          }, '-created_date', 10);
          
          messages.forEach(msg => {
            allNotifications.push({
              id: `msg-${msg.id}`,
              type: 'message',
              title: 'New Message',
              description: msg.subject,
              time: msg.created_date,
              icon: Mail,
              color: 'blue',
              action: () => {
                navigate(createPageUrl('Community'));
                onClose();
              },
              markRead: async () => {
                await DirectMessage.update(msg.id, { is_read: true });
              }
            });
          });
        } catch (error) {
          console.warn('Could not load direct messages:', error);
        }
      }

      // Load recent announcements (last 7 days, not yet expired)
      if (prefs?.email_general_announcements !== false) {
        try {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          
          const announcements = await Announcement.filter({ 
            is_published: true 
          }, '-created_date', 5);
          
          announcements
            .filter(a => new Date(a.created_date) > sevenDaysAgo)
            .filter(a => !a.expires_at || new Date(a.expires_at) >= new Date())
            .forEach(ann => {
              allNotifications.push({
                id: `ann-${ann.id}`,
                type: 'announcement',
                title: ann.priority === 'urgent' ? '🚨 Urgent Announcement' : 'New Announcement',
                description: ann.title,
                time: ann.created_date,
                icon: Megaphone,
                color: ann.priority === 'urgent' ? 'red' : ann.priority === 'important' ? 'orange' : 'purple',
                action: () => {
                  navigate(createPageUrl('Community'));
                  onClose();
                }
              });
            });
        } catch (error) {
          console.warn('Could not load announcements:', error);
        }
      }

      if (member) {
        // Load pending contributions (Due/Past Due)
        if (prefs?.email_contribution_reminders !== false) {
          try {
            const contributions = await EventContribution.filter({ 
              member_id: member.id 
            }, '-due_date', 5);
            
            contributions
              .filter(c => c.status === 'Due' || c.status === 'Past Due')
              .forEach(contrib => {
                allNotifications.push({
                  id: `contrib-${contrib.id}`,
                  type: 'contribution',
                  title: contrib.status === 'Past Due' ? 'Payment Overdue' : 'Payment Due Soon',
                  description: `$${contrib.amount_due.toFixed(2)} due on ${format(new Date(contrib.due_date), 'MMM d')}`,
                  time: contrib.due_date,
                  icon: DollarSign,
                  color: contrib.status === 'Past Due' ? 'red' : 'yellow',
                  contributionId: contrib.id,
                  hasActions: true
                });
              });
          } catch (error) {
            console.warn('Could not load contributions:', error);
          }
        }

        // Load recent payouts (last 30 days)
        if (prefs?.email_payout_notifications !== false) {
          try {
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            
            const payouts = await Payout.filter({ 
              payee_member_id: member.id 
            }, '-created_date', 5);
            
            payouts
              .filter(p => new Date(p.created_date) > thirtyDaysAgo)
              .forEach(payout => {
                allNotifications.push({
                  id: `payout-${payout.id}`,
                  type: 'payout',
                  title: payout.status === 'Disbursed' ? 'Payout Received' : 'Payout Pending',
                  description: `$${payout.amount.toFixed(2)} - ${payout.status}`,
                  time: payout.paid_at || payout.created_date,
                  icon: CheckCircle,
                  color: payout.status === 'Disbursed' ? 'green' : 'blue',
                  action: () => {
                    navigate(createPageUrl('MemberPortal'));
                    onClose();
                  }
                });
              });
          } catch (error) {
            console.warn('Could not load payouts:', error);
          }
        }
      }

      // Sort by time (most recent first)
      allNotifications.sort((a, b) => new Date(b.time) - new Date(a.time));
      
      setNotifications(allNotifications.slice(0, 15)); // Limit to 15 most recent
    } catch (error) {
      console.warn('Failed to load notifications:', error);
      setNotifications([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const messageNotifs = notifications.filter(n => n.type === 'message' && n.markRead);
      await Promise.all(messageNotifs.map(n => n.markRead()));
      toast.success('All messages marked as read');
      loadNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
      toast.error('Failed to mark messages as read');
    }
  };

  const getIconColor = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-600',
      red: 'bg-red-100 text-red-600',
      green: 'bg-green-100 text-green-600',
      yellow: 'bg-yellow-100 text-yellow-600',
      orange: 'bg-orange-100 text-orange-600',
      purple: 'bg-purple-100 text-purple-600'
    };
    return colors[color] || colors.blue;
  };

  const getTimeAgo = (date) => {
    const now = new Date();
    const then = new Date(date);
    const diffMs = now - then;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return format(then, 'MMM d');
  };

  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-14 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50">
      <div className="flex items-center justify-between p-4 border-b">
        <div>
          <h3 className="font-semibold text-lg">Notifications</h3>
          <p className="text-xs text-gray-500">Stay up to date with your association</p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {notifications.length > 0 && (
        <div className="px-4 py-2 border-b flex justify-end">
          <Button variant="link" size="sm" onClick={handleMarkAllRead}>
            Mark all as read
          </Button>
        </div>
      )}

      <ScrollArea className="h-[500px]">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-8 w-8 mx-auto mb-2 animate-pulse" />
            <p className="text-sm">Loading notifications...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Bell className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">All caught up!</p>
            <p className="text-sm">No new notifications</p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => {
              const Icon = notification.icon;
              return (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${!notification.hasActions ? 'cursor-pointer' : ''}`}
                  onClick={!notification.hasActions && notification.action ? notification.action : undefined}
                >
                  <div className="flex gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${getIconColor(notification.color)}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm">{notification.title}</p>
                        <span className="text-xs text-gray-500 whitespace-nowrap">
                          {getTimeAgo(notification.time)}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {notification.description}
                      </p>
                      
                      {/* Action Buttons for Contributions */}
                      {notification.hasActions && notification.contributionId && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(createPageUrl('MemberPortal#contributions'));
                              onClose();
                            }}
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View Details
                          </Button>
                          <Button
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const { base44 } = await import('@/api/base44Client');
                                const response = await base44.functions.invoke('createContributionCheckout', {
                                  contribution_id: notification.contributionId
                                });
                                if (response.data.checkoutUrl) {
                                  window.location.href = response.data.checkoutUrl;
                                } else {
                                  toast.error('Failed to create payment session');
                                }
                              } catch (error) {
                                console.error('Payment error:', error);
                                toast.error('Failed to start payment process');
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CreditCard className="h-3 w-3 mr-1" />
                            Pay Now
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      <div className="p-3 border-t bg-gray-50">
        <Button 
          variant="link" 
          className="w-full text-sm"
          onClick={() => {
            navigate(createPageUrl('Community'));
            onClose();
          }}
        >
          View all activity →
        </Button>
      </div>
    </div>
  );
}