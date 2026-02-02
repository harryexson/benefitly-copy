import React, { useState, useEffect } from 'react';
import { NotificationPreference, Member } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bell, Mail, Calendar, DollarSign, MessageSquare, Vote, Megaphone, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function NotificationSettings({ user }) {
  const [preferences, setPreferences] = useState(null);
  const [member, setMember] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, [user]);

  const loadPreferences = async () => {
    try {
      setIsLoading(true);
      
      // Get member profile
      const members = await Member.filter({ email: user.email });
      const memberProfile = members.length > 0 ? members[0] : null;
      setMember(memberProfile);

      if (!memberProfile) {
        setIsLoading(false);
        return;
      }

      // Get existing preferences or create defaults
      const prefs = await NotificationPreference.filter({ member_id: memberProfile.id });
      
      if (prefs.length > 0) {
        setPreferences(prefs[0]);
      } else {
        // Create default preferences
        const defaultPrefs = {
          member_id: memberProfile.id,
          email_welcome: true,
          email_contribution_reminders: true,
          email_event_reminders: true,
          email_payout_notifications: true,
          email_forum_activity: false,
          email_proposal_updates: true,
          email_general_announcements: true,
          reminder_days_before: 3,
          preferred_contact_time: 'any'
        };
        const created = await NotificationPreference.create(defaultPrefs);
        setPreferences(created);
      }
    } catch (error) {
      console.error('Failed to load notification preferences:', error);
      toast.error('Failed to load notification settings');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!preferences) return;
    
    setIsSaving(true);
    try {
      await NotificationPreference.update(preferences.id, preferences);
      toast.success('Notification settings saved!');
    } catch (error) {
      console.error('Failed to save preferences:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const updatePreference = (key, value) => {
    setPreferences({ ...preferences, [key]: value });
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!member) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Bell className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            You need a member profile to configure notification settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Email Notifications
          </CardTitle>
          <CardDescription>
            Choose which email notifications you want to receive
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Event Notifications */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-500 mt-1" />
                <div>
                  <Label className="text-base">Event Reminders</Label>
                  <p className="text-sm text-gray-500">
                    Get reminders about upcoming events and registration deadlines
                  </p>
                </div>
              </div>
              <Switch
                checked={preferences?.email_event_reminders || false}
                onCheckedChange={(checked) => updatePreference('email_event_reminders', checked)}
              />
            </div>

            {preferences?.email_event_reminders && (
              <div className="ml-8 space-y-2">
                <Label className="text-sm">Reminder timing</Label>
                <Select
                  value={preferences?.reminder_days_before?.toString() || '3'}
                  onValueChange={(val) => updatePreference('reminder_days_before', parseInt(val))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="2">2 days before</SelectItem>
                    <SelectItem value="3">3 days before</SelectItem>
                    <SelectItem value="5">5 days before</SelectItem>
                    <SelectItem value="7">1 week before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="border-t pt-4" />

          {/* Payout Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-green-500 mt-1" />
              <div>
                <Label className="text-base">Payout Notifications</Label>
                <p className="text-sm text-gray-500">
                  Receive notifications when payouts are approved or disbursed
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.email_payout_notifications || false}
              onCheckedChange={(checked) => updatePreference('email_payout_notifications', checked)}
            />
          </div>

          <div className="border-t pt-4" />

          {/* Contribution Reminders */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-orange-500 mt-1" />
              <div>
                <Label className="text-base">Contribution Reminders</Label>
                <p className="text-sm text-gray-500">
                  Payment reminders for upcoming contributions
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.email_contribution_reminders || false}
              onCheckedChange={(checked) => updatePreference('email_contribution_reminders', checked)}
            />
          </div>

          <div className="border-t pt-4" />

          {/* Community Notifications */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <MessageSquare className="h-5 w-5 text-purple-500 mt-1" />
              <div>
                <Label className="text-base">Forum Activity</Label>
                <p className="text-sm text-gray-500">
                  Notifications for replies to your discussions and mentions
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.email_forum_activity || false}
              onCheckedChange={(checked) => updatePreference('email_forum_activity', checked)}
            />
          </div>

          <div className="border-t pt-4" />

          {/* Proposal Updates */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Vote className="h-5 w-5 text-indigo-500 mt-1" />
              <div>
                <Label className="text-base">Proposal Updates</Label>
                <p className="text-sm text-gray-500">
                  New proposals and voting results
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.email_proposal_updates || false}
              onCheckedChange={(checked) => updatePreference('email_proposal_updates', checked)}
            />
          </div>

          <div className="border-t pt-4" />

          {/* General Announcements */}
          <div className="flex items-center justify-between">
            <div className="flex items-start gap-3">
              <Megaphone className="h-5 w-5 text-red-500 mt-1" />
              <div>
                <Label className="text-base">General Announcements</Label>
                <p className="text-sm text-gray-500">
                  Important updates and news from your association
                </p>
              </div>
            </div>
            <Switch
              checked={preferences?.email_general_announcements || false}
              onCheckedChange={(checked) => updatePreference('email_general_announcements', checked)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Communication Preferences</CardTitle>
          <CardDescription>
            Set your preferred time for receiving non-urgent communications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Preferred contact time</Label>
            <Select
              value={preferences?.preferred_contact_time || 'any'}
              onValueChange={(val) => updatePreference('preferred_contact_time', val)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any time</SelectItem>
                <SelectItem value="morning">Morning (8 AM - 12 PM)</SelectItem>
                <SelectItem value="afternoon">Afternoon (12 PM - 5 PM)</SelectItem>
                <SelectItem value="evening">Evening (5 PM - 9 PM)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              This preference is used for newsletters and non-urgent updates only
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}