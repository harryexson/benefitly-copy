import React, { useState, useEffect } from 'react';
import { Member, Event, EventContribution } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Send, Filter, Users, Mail, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { MessageSquare } from 'lucide-react';

export default function MassCommunication() {
  const [members, setMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Filter state
  const [filterType, setFilterType] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [contributionStatus, setContributionStatus] = useState('all');
  const [memberStatus, setMemberStatus] = useState('Active');

  // Message state
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [smsMessage, setSmsMessage] = useState('');
  const [communicationChannel, setCommunicationChannel] = useState('email');
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [isTwilioConfigured, setIsTwilioConfigured] = useState(false);

  useEffect(() => {
    loadData();
    checkTwilioConfig();
  }, []);

  const checkTwilioConfig = async () => {
    try {
      const response = await base44.functions.invoke('checkTwilioConfig');
      setIsTwilioConfigured(response.data.configured);
    } catch (error) {
      setIsTwilioConfigured(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [filterType, selectedEvent, contributionStatus, memberStatus, members, contributions]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [memberList, eventList, contributionList] = await Promise.all([
        Member.list(),
        Event.list('-created_date'),
        EventContribution.list()
      ]);
      setMembers(memberList);
      setEvents(eventList);
      setContributions(contributionList);
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load member data');
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = members.filter(m => m.status === memberStatus);

    if (filterType === 'event_specific' && selectedEvent) {
      const eventContribs = contributions.filter(c => c.event_id === selectedEvent);
      
      if (contributionStatus === 'paid') {
        const paidMemberIds = eventContribs.filter(c => c.status === 'Paid').map(c => c.member_id);
        filtered = filtered.filter(m => paidMemberIds.includes(m.id));
      } else if (contributionStatus === 'unpaid') {
        const unpaidMemberIds = eventContribs.filter(c => c.status === 'Due' || c.status === 'Past Due').map(c => c.member_id);
        filtered = filtered.filter(m => unpaidMemberIds.includes(m.id));
      } else if (contributionStatus === 'overdue') {
        const overdueMemberIds = eventContribs.filter(c => c.status === 'Past Due').map(c => c.member_id);
        filtered = filtered.filter(m => overdueMemberIds.includes(m.id));
      }
    } else if (filterType === 'all_overdue') {
      const overdueMemberIds = contributions.filter(c => c.status === 'Past Due').map(c => c.member_id);
      filtered = filtered.filter(m => overdueMemberIds.includes(m.id));
    }

    setFilteredMembers(filtered);
  };

  const handleSendCommunication = async () => {
    // Validation
    if (communicationChannel === 'email' || communicationChannel === 'both') {
      if (!subject.trim() || !message.trim()) {
        toast.error('Please enter both subject and message for email');
        return;
      }
    }
    
    if (communicationChannel === 'sms' || communicationChannel === 'both') {
      if (!smsMessage.trim()) {
        toast.error('Please enter SMS message');
        return;
      }
    }

    if (filteredMembers.length === 0) {
      toast.error('No members match the selected filters');
      return;
    }

    try {
      setIsSending(true);
      let emailsSent = 0;
      let smsSent = 0;
      
      for (const member of filteredMembers) {
        // Send Email
        if (communicationChannel === 'email' || communicationChannel === 'both') {
          try {
            await base44.integrations.Core.SendEmail({
              to: member.email,
              subject: subject,
              body: `
                <p>Dear ${member.first_name} ${member.last_name},</p>
                ${message.replace(/\n/g, '<br>')}
                <br><br>
                <p>Best regards,<br>Your Association</p>
              `
            });
            emailsSent++;
          } catch (emailError) {
            console.error(`Failed to send email to ${member.email}:`, emailError);
          }
        }
        
        // Send SMS
        if ((communicationChannel === 'sms' || communicationChannel === 'both') && member.phone) {
          try {
            await base44.functions.invoke('sendSMS', {
              to: member.phone,
              message: smsMessage.replace('{name}', member.first_name)
            });
            smsSent++;
          } catch (smsError) {
            console.error(`Failed to send SMS to ${member.phone}:`, smsError);
          }
        }
      }

      const results = [];
      if (emailsSent > 0) results.push(`${emailsSent} email(s)`);
      if (smsSent > 0) results.push(`${smsSent} SMS`);
      
      toast.success(`Sent ${results.join(' and ')} to members`);
      setSubject('');
      setMessage('');
      setSmsMessage('');
    } catch (error) {
      console.error('Failed to send communications:', error);
      toast.error('Failed to send some messages');
    } finally {
      setIsSending(false);
    }
  };

  const getEventTitle = (eventId) => {
    const event = events.find(e => e.id === eventId);
    return event ? event.title : 'Unknown Event';
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Mass Communication</h2>
        <p className="text-gray-500">Send targeted emails to members based on filters</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Filters Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Recipient Filters
            </CardTitle>
            <CardDescription>Select who should receive the message</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Filter Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Active Members</SelectItem>
                  <SelectItem value="event_specific">Event-Specific</SelectItem>
                  <SelectItem value="all_overdue">All Overdue Payments</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filterType === 'event_specific' && (
              <>
                <div className="space-y-2">
                  <Label>Select Event</Label>
                  <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose an event..." />
                    </SelectTrigger>
                    <SelectContent>
                      {events.map(event => (
                        <SelectItem key={event.id} value={event.id}>
                          {event.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Contribution Status</Label>
                  <Select value={contributionStatus} onValueChange={setContributionStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Contributors</SelectItem>
                      <SelectItem value="paid">Paid Only</SelectItem>
                      <SelectItem value="unpaid">Unpaid Only</SelectItem>
                      <SelectItem value="overdue">Overdue Only</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Member Status</Label>
              <Select value={memberStatus} onValueChange={setMemberStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Recipients:</span>
                <Badge className="bg-blue-600">{filteredMembers.length} members</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Message Composer */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Compose Message
            </CardTitle>
            <CardDescription>Write your message to selected members</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Communication Channel</Label>
              <Select value={communicationChannel} onValueChange={setCommunicationChannel}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="email">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Email Only
                    </div>
                  </SelectItem>
                  <SelectItem value="sms" disabled={!isTwilioConfigured}>
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      SMS Only {!isTwilioConfigured && '(Not configured)'}
                    </div>
                  </SelectItem>
                  <SelectItem value="both" disabled={!isTwilioConfigured}>
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <MessageSquare className="h-4 w-4" />
                      Email & SMS {!isTwilioConfigured && '(SMS not configured)'}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              {!isTwilioConfigured && (
                <Alert>
                  <AlertDescription className="text-xs">
                    SMS not available. Contact support to configure Twilio for SMS messaging.
                  </AlertDescription>
                </Alert>
              )}
            </div>
            {(communicationChannel === 'email' || communicationChannel === 'both') && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="subject">Email Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Enter email subject..."
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Email Body</Label>
                  <Textarea
                    id="message"
                    placeholder="Enter your message..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={8}
                  />
                  <p className="text-xs text-gray-500">
                    This will be sent as an HTML email. Use line breaks for paragraphs.
                  </p>
                </div>
              </>
            )}

            {(communicationChannel === 'sms' || communicationChannel === 'both') && (
              <div className="space-y-2">
                <Label htmlFor="sms">SMS Message</Label>
                <Textarea
                  id="sms"
                  placeholder="Enter SMS message (max 160 chars)... Use {name} for personalization."
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value.slice(0, 160))}
                  rows={3}
                  maxLength={160}
                />
                <p className="text-xs text-gray-500">
                  {smsMessage.length}/160 characters • Only members with phone numbers will receive SMS
                </p>
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              <div className="text-sm text-gray-600">
                <Users className="h-4 w-4 inline mr-1" />
                Sending to {filteredMembers.length} recipient(s)
              </div>
              <Button
                onClick={handleSendCommunication}
                disabled={isSending || filteredMembers.length === 0}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send {communicationChannel === 'both' ? 'Messages' : communicationChannel === 'sms' ? 'SMS' : 'Email'}
                  </>
                )}
              </Button>
            </div>

            {/* Preview Recipients */}
            {filteredMembers.length > 0 && (
              <div className="pt-4 border-t">
                <p className="text-sm font-medium mb-2">Preview Recipients:</p>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {filteredMembers.slice(0, 20).map(member => (
                    <div key={member.id} className="text-sm text-gray-600 py-1 px-2 bg-gray-50 rounded">
                      {member.first_name} {member.last_name} ({member.email})
                    </div>
                  ))}
                  {filteredMembers.length > 20 && (
                    <p className="text-xs text-gray-500 pt-2">
                      ... and {filteredMembers.length - 20} more
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Templates */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Message Templates</CardTitle>
          <CardDescription>Click to use a pre-written template</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start"
              onClick={() => {
                setSubject('Payment Reminder - Contribution Due');
                setMessage(`We hope this message finds you well.\n\nThis is a friendly reminder that your contribution for the recent event is due. Please log in to your member portal to complete your payment at your earliest convenience.\n\nThank you for your continued support.`);
              }}
            >
              <span className="font-semibold">Payment Reminder</span>
              <span className="text-xs text-gray-500 mt-1">For unpaid contributions</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start"
              onClick={() => {
                setSubject('Thank You - Payment Received');
                setMessage(`Thank you for your timely contribution!\n\nWe have received your payment and truly appreciate your support. Your contribution helps us continue to serve our community effectively.\n\nThank you for being a valued member of our association.`);
              }}
            >
              <span className="font-semibold">Thank You</span>
              <span className="text-xs text-gray-500 mt-1">For paid members</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-start"
              onClick={() => {
                setSubject('Urgent: Overdue Payment Notice');
                setMessage(`We notice that your contribution payment is now overdue.\n\nPlease make your payment as soon as possible to maintain your good standing with the association. If you're experiencing difficulties, please contact us to discuss payment arrangements.\n\nThank you for your immediate attention to this matter.`);
              }}
            >
              <span className="font-semibold">Overdue Notice</span>
              <span className="text-xs text-gray-500 mt-1">For overdue payments</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}