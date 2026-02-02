import React, { useState } from 'react';
import { Member } from '@/entities/all';
import { SendEmail } from '@/integrations/Core';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { createPageUrl } from '@/utils';
import { Loader2 } from 'lucide-react';

export default function VolunteerRequestDialog({ event, isOpen, onClose }) {
  const [isSending, setIsSending] = useState(false);
  
  if (!event) return null;

  const volunteerUrl = `${window.location.origin}${createPageUrl(`VolunteerRegistration?event_id=${event.id}`)}`;

  const defaultSubject = `Volunteer for: ${event.title}!`;
  const defaultBody = `Hello Benevolent Members,

We have an upcoming event, "${event.title}", and we need your help to make it a success!

Event: ${event.title}
Date: ${format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
Venue: ${event.venue}

${event.publicity_blurb}

If you are available and would like to volunteer, please sign up using the link below.

${volunteerUrl}

Thank you for your support!
  
Best,
The Association Team`;

  const handleSendRequest = async () => {
    setIsSending(true);
    try {
      // Fetch all active members
      const allMembers = await Member.list();
      const activeMembers = allMembers.filter(m => m.status === 'Active');

      if (activeMembers.length === 0) {
        toast.info("There are no active members to send requests to.");
        return;
      }
      
      const emailPromises = activeMembers.map(member => 
        SendEmail({
          to: member.email,
          subject: defaultSubject,
          body: defaultBody.replace(/\n/g, '<br/>')
        })
      );
      
      await Promise.all(emailPromises);

      toast.success(`Volunteer request sent to ${activeMembers.length} members.`);
      onClose();
    } catch (error) {
      console.error("Failed to send volunteer requests:", error);
      toast.error("An error occurred while sending emails.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Send Volunteer Request</DialogTitle>
          <DialogDescription>
            This email will be sent to all active members of the association. The volunteer registration link is automatically included.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Subject</Label>
            <Input value={defaultSubject} disabled />
          </div>
          <div className="space-y-2">
            <Label>Email Body</Label>
            <Textarea value={defaultBody} rows={15} disabled className="bg-gray-50"/>
          </div>
          <div className="space-y-2">
            <Label>Volunteer Sign-up Link (Included in Email)</Label>
            <Input value={volunteerUrl} disabled />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSendRequest} disabled={isSending}>
            {isSending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...</> : `Send to All Members`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}