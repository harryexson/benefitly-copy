import React, { useState, useEffect } from 'react';
import { Event, Member, EventContribution } from '@/entities/all';
import { User } from '@/entities/User'; // Import User
import { SendEmail } from '@/integrations/Core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import EventsTable from '../components/events/EventsTable';
import EventForm from '../components/events/EventForm';
import EventDetails from '../components/events/EventDetails';
import EventPayoutManager from '../components/events/EventPayoutManager'; // New import
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import PageTooltip from '../components/onboarding/PageTooltip';
import { OnboardingProgress } from '@/entities/all';

export default function Events() {
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [viewingEvent, setViewingEvent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [onboardingProgress, setOnboardingProgress] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);
  const [showPayoutManager, setShowPayoutManager] = useState(false); // New state
  const [payoutEvent, setPayoutEvent] = useState(null); // New state

  const loadData = async (signal) => { // Renamed from loadEvents
    try {
      const currentUser = await User.me(); // Ensure user is logged in before fetching and for onboarding
      
      // Load onboarding progress
      if (currentUser && currentUser.association_account_id) {
        const progressRecords = await OnboardingProgress.filter({ 
          association_account_id: currentUser.association_account_id 
        });
        if (progressRecords.length > 0) {
          const progress = progressRecords[0];
          setOnboardingProgress(progress);
          
          // Show tooltip if this is first visit
          if (!progress.events_page_visited) {
            setShowTooltip(true);
            await OnboardingProgress.update(progress.id, { events_page_visited: true });
          }
        }
      }

      setIsLoading(true); // Moved here to be after initial user check and onboarding setup
      
      const [eventsList, membersList] = await Promise.all([
        Event.list('-created_date'),
        Member.list()
      ]);
      setEvents(eventsList);
      setMembers(membersList);
    } catch (error) {
       // Check if the request was aborted by the AbortController
       if (signal && signal.aborted) {
        console.log('Data fetch for Events page aborted by signal.');
      } else if (error.name === 'CanceledError' || (error.message && error.message.includes('aborted'))) {
        // Generic check for abort messages, useful if the signal itself doesn't set name/message consistently
        console.log('Data fetch for Events page aborted (generic abort error).');
      } else {
        console.error("Failed to load events", error);
        toast.error("Failed to load events.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    loadData(abortController.signal); // Pass the signal to the data loading function

    // Cleanup function: abort ongoing requests when the component unmounts or effect re-runs
    return () => {
      abortController.abort();
    };
  }, []);

  const handleOpenForm = (event = null) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingEvent(null);
    setIsFormOpen(false);
  };

  // Renamed from handleSave to handleSaveEvent and updated parameter 'isAnnouncing' to 'announce'
  const handleSaveEvent = async (eventData, announce = false) => {
    console.log('=== handleSaveEvent called ===');
    console.log('Event data:', eventData);
    console.log('Announce:', announce);
    
    let savedEvent;
    try {
      if (eventData.id) {
        // Update existing event
        savedEvent = await Event.update(eventData.id, eventData);
        toast.success('Event updated successfully.');
      } else {
        // Create new event
        console.log('Creating new event...');
        savedEvent = await Event.create(eventData);
        console.log('Event created:', savedEvent);
        toast.success('Event created successfully.');
      }
    } catch (error) {
      console.error('Error saving event:', error);
      toast.error('Failed to save event. ' + error.message);
      return; // Stop if event save fails
    }

    if (announce) { // Use 'announce' as per outline
      console.log('Announcing event and creating contributions...');
      toast.info('Announcing event and creating contributions...');
      try {
        const activeMembers = members.filter(m => m.status === 'Active');
        console.log('Active members found:', activeMembers.length);
        
        if (activeMembers.length === 0) {
          console.warn('No active members found');
          toast.warning("No active members to announce to. Contributions not created.");
        } else {
          // 1. Create contributions
          const contributionRecords = activeMembers.map(member => ({
            event_id: savedEvent.id, // Use the ID from the newly saved/updated event
            member_id: member.id,
            amount_due: savedEvent.contribution_amount,
            due_date: savedEvent.contribution_due_date,
            status: 'Due'
          }));
          console.log('Creating contributions:', contributionRecords);
          await EventContribution.bulkCreate(contributionRecords);
          console.log('Contributions created successfully');
          
          // 2. Send emails only to members who have user accounts
          const allUsers = await User.list();
          const userEmails = new Set(allUsers.map(u => u.email));
          
          let emailsSent = 0;
          let emailsFailed = 0;
          
          for (const member of activeMembers) {
            if (userEmails.has(member.email)) {
              try {
                await SendEmail({
                  to: member.email,
                  subject: `New Contribution Event: ${savedEvent.title}`,
                  body: `
                    <p>Hello ${member.first_name},</p>
                    <p>A new contribution event has been announced for our association.</p>
                    <h3>Event: ${savedEvent.title}</h3>
                    <p><strong>Description:</strong> ${savedEvent.description || 'N/A'}</p>
                    <p><strong>Contribution Amount:</strong> $${savedEvent.contribution_amount.toFixed(2)}</p>
                    <p><strong>Due Date:</strong> ${new Date(savedEvent.contribution_due_date).toLocaleDateString()}</p>
                    <p>Please log in to your profile to make your contribution.</p>
                    <a href="${window.location.origin}${createPageUrl('Dashboard')}">View Event & Pay</a>
                    <br>
                    <p>Thank you for your support.</p>
                  `
                });
                emailsSent++;
              } catch (emailError) {
                console.error(`Failed to send email to ${member.email}:`, emailError);
                emailsFailed++;
              }
            }
          }
          
          const membersWithoutAccounts = activeMembers.length - emailsSent - emailsFailed;
          
          // 3. Update event status to 'Announced'
          await Event.update(savedEvent.id, { status: 'Announced' });

          if (membersWithoutAccounts > 0) {
            toast.success(`Event announced! ${emailsSent} email(s) sent. ${membersWithoutAccounts} member(s) need to create accounts.`, { duration: 6000 });
          } else {
            toast.success(`Event announced to ${emailsSent} member(s)!`);
          }
        }
      } catch (error) {
        toast.error("Failed to announce event or send notifications. " + error.message);
        console.error("Announcement error:", error);
      }
    }
    
    // After saving and potentially announcing, reload data to update the table
    // Since this is a user-initiated action, we can use a new, ephemeral AbortController
    await loadData(new AbortController().signal); 
    handleCloseForm();

    // Update onboarding if first event was created
    if (onboardingProgress && !onboardingProgress.first_event_created) {
      // Re-fetch events to ensure we have the most up-to-date count from the DB
      const allEvents = await Event.list(); 
      if (allEvents.length > 0) {
        await OnboardingProgress.update(onboardingProgress.id, { first_event_created: true });
      }
    }
  };

  const handleSendReminders = async (event) => {
    toast.info("Sending payment reminders...");
    try {
      const dueContributions = await EventContribution.filter({
        event_id: event.id,
        status: { $in: ['Due', 'Past Due'] }
      });

      if (dueContributions.length === 0) {
        toast.success("No outstanding contributions to send reminders for.");
        return;
      }
      
      // Get all users to check which members have accounts
      const allUsers = await User.list();
      const userEmails = new Set(allUsers.map(u => u.email));
      
      let sentCount = 0;
      for (const contrib of dueContributions) {
        const member = members.find(m => m.id === contrib.member_id);
        if (member && userEmails.has(member.email)) {
          try {
            await SendEmail({
              to: member.email,
              subject: `Reminder: Contribution for "${event.title}" is due`,
              body: `
                <p>Hello ${member.first_name},</p>
                <p>This is a reminder that your contribution for the event "${event.title}" is due.
                Your payment of <strong>$${contrib.amount_due.toFixed(2)}</strong> was due on <strong>${new Date(contrib.due_date).toLocaleDateString()}</strong>.</p>
                <p>Please log in to your profile to make your contribution as soon as possible.</p>
                <a href="${window.location.origin}${createPageUrl('Dashboard')}">View Event & Pay</a>
                <br>
                <p>Thank you.</p>
              `
            });
            sentCount++;
          } catch (error) {
            console.error(`Failed to send reminder to ${member.email}:`, error);
          }
        }
      }
      toast.success(`Sent ${sentCount} reminder(s). Members need app accounts to receive emails.`);
    } catch(error) {
      toast.error("Failed to send reminders.");
      console.error(error);
    }
  };

  const handleViewEvent = (event) => {
    setViewingEvent(event);
  };

  const handleOpenPayoutManager = (event) => {
    setPayoutEvent(event);
    setShowPayoutManager(true);
  };

  const handleClosePayoutManager = () => {
    setPayoutEvent(null);
    setShowPayoutManager(false);
  };

  const handlePayoutsCreated = async () => {
    toast.success('Payouts created successfully. Review them in the Payouts page.');
    handleClosePayoutManager();
    await loadData(new AbortController().signal);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || event.status.toLowerCase().replace(' ', '_') === activeTab;
    return matchesSearch && matchesTab;
  });

  const statusCounts = {
    all: events.length,
    draft: events.filter(e => e.status === 'Draft').length,
    announced: events.filter(e => e.status === 'Announced').length,
    collecting: events.filter(e => e.status === 'Collecting').length,
    paid: events.filter(e => e.status === 'Paid').length
  };

  return (
    <div className="space-y-6">
      <PageTooltip
        isVisible={showTooltip}
        onDismiss={() => setShowTooltip(false)}
        title="📅 Welcome to Event Management"
        description="Events are the heart of your mutual aid association. Create events to trigger contribution collection from members and manage benefit payouts."
        actions={[
          {
            label: "Create My First Event",
            onClick: () => {
              setShowTooltip(false);
              handleOpenForm();
            }
          }
        ]}
      />

      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Event Management</h2>
          <p className="text-gray-500">Create and manage benefit events for members.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search events..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => handleOpenForm()} className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            New Event
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="draft">Draft ({statusCounts.draft})</TabsTrigger>
          <TabsTrigger value="announced">Announced ({statusCounts.announced})</TabsTrigger>
          <TabsTrigger value="collecting">Collecting ({statusCounts.collecting})</TabsTrigger>
          <TabsTrigger value="paid">Completed ({statusCounts.paid})</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">
          <EventsTable 
            events={filteredEvents} 
            members={members}
            onEdit={handleOpenForm}
            onView={handleViewEvent}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
          </DialogHeader>
          <EventForm
            event={editingEvent}
            members={members}
            onSave={handleSaveEvent} // Updated prop to use the new function name
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewingEvent} onOpenChange={() => setViewingEvent(null)}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Event Details</DialogTitle>
          </DialogHeader>
          {viewingEvent && (
            <EventDetails event={viewingEvent} />
          )}
        </DialogContent>
      </Dialog>

      {/* Payout Manager Dialog */}
      <Dialog open={showPayoutManager} onOpenChange={setShowPayoutManager}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Event Payouts</DialogTitle>
            <DialogDescription>
              Select members to receive benefit payouts for {payoutEvent?.title}
            </DialogDescription>
          </DialogHeader>
          {payoutEvent && (
            <EventPayoutManager
              event={payoutEvent}
              onComplete={handlePayoutsCreated}
              onCancel={handleClosePayoutManager}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}