import React, { useEffect, useState } from 'react';
import { DirectMessage, Announcement, EventContribution, NotificationPreference, Member } from '@/entities/all';
import { toast } from 'sonner';
import { Mail, Megaphone, DollarSign, Calendar } from 'lucide-react';

// Play notification sound
const playNotificationSound = () => {
  try {
    // Create audio context for notification sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Configure sound - loud and attention-grabbing
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.value = 0.3;
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
    
    // Second beep
    setTimeout(() => {
      const osc2 = audioContext.createOscillator();
      const gain2 = audioContext.createGain();
      osc2.connect(gain2);
      gain2.connect(audioContext.destination);
      osc2.frequency.value = 1000;
      osc2.type = 'sine';
      gain2.gain.value = 0.3;
      osc2.start(audioContext.currentTime);
      osc2.stop(audioContext.currentTime + 0.2);
    }, 300);
  } catch (error) {
    console.error('Failed to play notification sound:', error);
  }
};

// Component to check for new notifications periodically and show toasts
export default function NotificationToast({ user }) {
  const [lastCheck, setLastCheck] = useState(new Date());
  const [prefs, setPrefs] = useState(null);
  const [member, setMember] = useState(null);
  const [hasCheckedOnLogin, setHasCheckedOnLogin] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [user]);

  useEffect(() => {
    if (!user || !prefs) return;

    // Check immediately on login if not yet checked
    if (!hasCheckedOnLogin) {
      setHasCheckedOnLogin(true);
      setTimeout(() => checkForNewNotifications(true), 2000);
    }

    // Check for new notifications every 3 minutes (reduced from 30s to avoid rate limits)
    const interval = setInterval(() => {
      checkForNewNotifications();
    }, 180000);

    return () => clearInterval(interval);
  }, [user, prefs, member, lastCheck, hasCheckedOnLogin]);

  const loadPreferences = async () => {
    if (!user?.id || !user?.association_account_id) {
      setPrefs(null);
      setMember(null);
      return;
    }
    
    try {
      const members = await Member.filter({ email: user.email });
      const memberProfile = members.length > 0 ? members[0] : null;
      setMember(memberProfile);

      if (memberProfile) {
        try {
          const prefsList = await NotificationPreference.filter({ member_id: memberProfile.id });
          setPrefs(prefsList.length > 0 ? prefsList[0] : null);
        } catch (error) {
          // NotificationPreference entity may not exist yet - use defaults
          setPrefs({ 
            email_general_announcements: true, 
            email_event_reminders: true, 
            email_contribution_reminders: true 
          });
        }
      }
    } catch (error) {
      // Silently ignore - notification system is non-critical
      console.warn('Failed to load notification preferences:', error);
    }
  };

  const checkForNewNotifications = async (isLoginCheck = false) => {
    if (!user || !prefs || !user.id || !user.association_account_id) return;

    try {
      const now = new Date();
      const checkTime = isLoginCheck ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) : lastCheck; // Check last 7 days on login
      let hasNewAlerts = false;

      // Check for new unread messages (skip if entity doesn't exist)
      if (prefs.email_general_announcements !== false && user.id) {
        try {
          const newMessages = await DirectMessage.filter({ 
            recipient_user_id: user.id,
            is_read: false 
          });
        
          const recentMessages = newMessages.filter(msg => 
            new Date(msg.created_date) > checkTime
          );

          recentMessages.forEach(msg => {
            toast.info(msg.subject, {
              description: `New message from ${msg.is_from_admin ? 'Administrator' : 'a member'}`,
              icon: <Mail className="h-4 w-4" />,
              duration: 5000
            });
          });
        } catch (error) {
          // Silently ignore - DirectMessage entity may not exist or user lacks permissions
        }
      }

      // Check for new urgent announcements
      if (prefs.email_general_announcements !== false) {
        const announcements = await Announcement.filter({ 
          is_published: true,
          priority: 'urgent'
        }, '-created_date', 3);
        
        const recentAnnouncements = announcements.filter(ann => 
          new Date(ann.created_date) > checkTime
        );

        if (recentAnnouncements.length > 0) {
          hasNewAlerts = true;
        }

        recentAnnouncements.forEach(ann => {
          toast.warning(ann.title, {
            description: '⚠️ URGENT ANNOUNCEMENT from your association',
            icon: <Megaphone className="h-4 w-4" />,
            duration: 8000
          });
        });
      }

      // Check for new events
      let newEvents = [];
      if (prefs.email_event_reminders !== false) {
        const Event = await import('@/entities/all').then(m => m.Event);
        const recentEvents = await Event.filter({
          status: { $in: ['Announced', 'Published'] }
        }, '-created_date', 5);
        
        newEvents = recentEvents.filter(event => 
          new Date(event.created_date) > checkTime
        );

        if (newEvents.length > 0) {
          hasNewAlerts = true;
        }

        newEvents.forEach(async (event) => {
          const requiresContribution = event.contribution_amount && event.contribution_amount > 0;
          
          toast.success(event.title, {
            description: requiresContribution 
              ? `🎉 NEW EVENT: ${event.type} • Contribution: $${event.contribution_amount.toFixed(2)} due ${new Date(event.contribution_due_date).toLocaleDateString()}`
              : `🎉 NEW EVENT: ${event.type} on ${new Date(event.event_date).toLocaleDateString()}`,
            icon: <Calendar className="h-4 w-4" />,
            duration: 15000,
            action: requiresContribution ? {
              label: 'Pay Now',
              onClick: () => window.location.href = '/MemberPortal#contributions'
            } : {
              label: 'View Event',
              onClick: () => window.location.href = '/MemberPortal'
            }
          });

          // Browser notification for extra visibility
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔔 New Event: ' + event.title, {
              body: `${event.type} - ${new Date(event.event_date).toLocaleDateString()}`,
              icon: '/icon.png',
              tag: 'event-' + event.id,
              requireInteraction: true
            });
          }
        });
      }

      // Check for contributions due soon (within 3 days)
      if (member && prefs.email_contribution_reminders !== false) {
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const contributions = await EventContribution.filter({ 
          member_id: member.id 
        });
        
        const dueSoon = contributions.filter(c => 
          (c.status === 'Due' || c.status === 'Past Due') &&
          new Date(c.due_date) <= threeDaysFromNow &&
          new Date(c.due_date) > checkTime
        );

        dueSoon.forEach(contrib => {
          if (contrib.status === 'Past Due') {
            toast.error('Payment Overdue', {
              description: `$${contrib.amount_due.toFixed(2)} payment is past due`,
              icon: <DollarSign className="h-4 w-4" />,
              duration: 8000
            });
          } else {
            toast.info('Payment Due Soon', {
              description: `$${contrib.amount_due.toFixed(2)} due soon`,
              icon: <DollarSign className="h-4 w-4" />,
              duration: 5000
            });
          }
        });
      }

      // Play sound if there are new alerts
      if (hasNewAlerts) {
        playNotificationSound();
      }

      setLastCheck(now);
      } catch (error) {
      // Silently ignore - notification system is non-critical
      }
      };

  // This component doesn't render anything visible
  return null;
}