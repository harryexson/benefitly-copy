import React, { useState, useEffect } from 'react';
import { Member } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export default function EventForm({ event, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'Death',
    status: 'Draft',
    event_date: '',
    event_time: '',
    event_end_time: '',
    contribution_amount: 0,
    contribution_due_date: '',
    affected_member_id: '',
    venue: '',
    venue_details: '',
    is_paid_event: false,
    requires_rsvp: false,
    rsvp_deadline: '',
    max_attendees: 0,
    publicity_blurb: '',
    ticket_price: 0,
    tickets_available: 0,
    early_bird_price: 0,
    early_bird_deadline: '',
    waitlist_enabled: false,
    check_in_enabled: false,
    recurring_pattern: 'none',
    recurring_end_date: '',
    image_url: '',
    reminders_enabled: true,
    reminder_schedule: [3, 1],
  });

  const [members, setMembers] = useState([]);

  useEffect(() => {
    Member.list().then(setMembers);
    if (event) {
      setFormData({
        id: event.id,
        title: event.title || '',
        description: event.description || '',
        type: event.type || 'Death',
        status: event.status || 'Draft',
        event_date: event.event_date ? new Date(event.event_date).toISOString().split('T')[0] : '',
        event_time: event.event_time || '',
        event_end_time: event.event_end_time || '',
        contribution_amount: event.contribution_amount || 0,
        contribution_due_date: event.contribution_due_date ? new Date(event.contribution_due_date).toISOString().split('T')[0] : '',
        affected_member_id: event.affected_member_id || '',
        venue: event.venue || '',
        venue_details: event.venue_details || '',
        is_paid_event: event.is_paid_event || false,
        requires_rsvp: event.requires_rsvp || false,
        rsvp_deadline: event.rsvp_deadline ? new Date(event.rsvp_deadline).toISOString().split('T')[0] : '',
        max_attendees: event.max_attendees || 0,
        publicity_blurb: event.publicity_blurb || '',
        ticket_price: event.ticket_price || 0,
        tickets_available: event.tickets_available || 0,
        early_bird_price: event.early_bird_price || 0,
        early_bird_deadline: event.early_bird_deadline ? new Date(event.early_bird_deadline).toISOString().split('T')[0] : '',
        waitlist_enabled: event.waitlist_enabled || false,
        check_in_enabled: event.check_in_enabled || false,
        recurring_pattern: event.recurring_pattern || 'none',
        recurring_end_date: event.recurring_end_date ? new Date(event.recurring_end_date).toISOString().split('T')[0] : '',
        image_url: event.image_url || '',
        reminders_enabled: event.reminders_enabled !== undefined ? event.reminders_enabled : true,
        reminder_schedule: event.reminder_schedule || [3, 1],
      });
    } else {
      setFormData({
        title: '',
        description: '',
        type: 'Death',
        status: 'Draft',
        event_date: '',
        event_time: '',
        event_end_time: '',
        contribution_amount: 0,
        contribution_due_date: '',
        affected_member_id: '',
        venue: '',
        venue_details: '',
        is_paid_event: false,
        requires_rsvp: false,
        rsvp_deadline: '',
        max_attendees: 0,
        publicity_blurb: '',
        ticket_price: 0,
        tickets_available: 0,
        early_bird_price: 0,
        early_bird_deadline: '',
        waitlist_enabled: false,
        check_in_enabled: false,
        recurring_pattern: 'none',
        recurring_end_date: '',
        image_url: '',
        reminders_enabled: true,
        reminder_schedule: [3, 1],
      });
    }
  }, [event]);

  const handleChange = (e) => {
    const { id, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: type === 'checkbox' ? checked : (type === 'number' ? Number(value) : value),
    }));
  };

  const toggleReminderDay = (day) => {
    setFormData((prev) => {
      const schedule = prev.reminder_schedule || [];
      const hasDay = schedule.includes(day);
      return {
        ...prev,
        reminder_schedule: hasDay 
          ? schedule.filter(d => d !== day) 
          : [...schedule, day].sort((a, b) => b - a)
      };
    });
  };

  const handleSelectChange = (id, value) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (isAnnouncing = false) => {
    // The onSave prop now expects two arguments: event data and the announce flag
    onSave(formData, isAnnouncing);
  };

  return (
    <form onSubmit={(e) => { e.preventDefault(); handleSubmit(false); }} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Event Title</Label>
        <Input id="title" value={formData.title} onChange={handleChange} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={formData.description} onChange={handleChange} />
      </div>
       <div className="space-y-2">
        <Label htmlFor="publicity_blurb">Public Announcement Blurb</Label>
        <Textarea id="publicity_blurb" value={formData.publicity_blurb} onChange={handleChange} placeholder="A short, public-facing summary for emails and announcements."/>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="type">Event Type</Label>
          <Select value={formData.type} onValueChange={(value) => handleSelectChange('type', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Death">Member Death</SelectItem>
              <SelectItem value="Hospitalization">Member Hospitalization</SelectItem>
              <SelectItem value="Loss of Loved One">Loss of Loved One</SelectItem>
              <SelectItem value="Fundraising Dinner">Fundraising Dinner</SelectItem>
              <SelectItem value="Community Fair">Community Fair</SelectItem>
              <SelectItem value="Family Day">Family Day</SelectItem>
              <SelectItem value="Partner Banquet">Partner Banquet</SelectItem>
              <SelectItem value="General Meeting">General Meeting</SelectItem>
              <SelectItem value="Workshop">Workshop</SelectItem>
              <SelectItem value="Social Gathering">Social Gathering</SelectItem>
              <SelectItem value="Other">Other Community Event</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor="venue">Venue / Location</Label>
            <Input id="venue" value={formData.venue} onChange={handleChange} placeholder="e.g., Online, Community Hall" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Published">Published</SelectItem>
              <SelectItem value="Announced">Announced</SelectItem>
              <SelectItem value="Collecting">Collecting</SelectItem>
              <SelectItem value="Closed">Closed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="affected_member_id">Affected Member (if applicable)</Label>
          <Select value={formData.affected_member_id} onValueChange={(value) => handleSelectChange('affected_member_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a member..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={null}>None</SelectItem>
              {members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.first_name} {member.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="event_date">Event Date</Label>
          <Input id="event_date" type="date" value={formData.event_date} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event_time">Start Time</Label>
          <Input id="event_time" type="time" value={formData.event_time} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="event_end_time">End Time</Label>
          <Input id="event_end_time" type="time" value={formData.event_end_time} onChange={handleChange} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="venue_details">Venue Details / Instructions</Label>
        <Input id="venue_details" value={formData.venue_details} onChange={handleChange} placeholder="Parking info, room number, etc." />
      </div>

      <div className="pt-4 border-t">
        <h3 className="font-medium mb-4">RSVP Settings</h3>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="requires_rsvp"
            checked={formData.requires_rsvp}
            onChange={handleChange}
            className="rounded"
          />
          <Label htmlFor="requires_rsvp">Require RSVP for this event</Label>
        </div>
        
        {formData.requires_rsvp && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="rsvp_deadline">RSVP Deadline</Label>
              <Input id="rsvp_deadline" type="date" value={formData.rsvp_deadline} onChange={handleChange} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_attendees">Max Attendees (0 = unlimited)</Label>
              <Input id="max_attendees" type="number" value={formData.max_attendees} onChange={handleChange} min="0" />
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t">
        <h3 className="font-medium mb-4">Contribution Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="contribution_amount">Contribution Amount ($)</Label>
            <Input id="contribution_amount" type="number" value={formData.contribution_amount} onChange={handleChange} min="0" step="0.01" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="contribution_due_date">Contribution Due Date</Label>
            <Input id="contribution_due_date" type="date" value={formData.contribution_due_date} onChange={handleChange} />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t">
        <h3 className="font-medium mb-4">Ticketing</h3>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="is_paid_event"
            checked={formData.is_paid_event}
            onChange={handleChange}
            className="rounded"
          />
          <Label htmlFor="is_paid_event">This is a ticketed/paid event</Label>
        </div>
        
        {formData.is_paid_event && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ticket_price">Ticket Price ($)</Label>
                <Input id="ticket_price" type="number" value={formData.ticket_price} onChange={handleChange} min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tickets_available">Total Tickets Available</Label>
                <Input id="tickets_available" type="number" value={formData.tickets_available} onChange={handleChange} min="0" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="early_bird_price">Early Bird Price ($)</Label>
                <Input id="early_bird_price" type="number" value={formData.early_bird_price} onChange={handleChange} min="0" step="0.01" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="early_bird_deadline">Early Bird Deadline</Label>
                <Input id="early_bird_deadline" type="date" value={formData.early_bird_deadline} onChange={handleChange} />
              </div>
            </div>

            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="waitlist_enabled"
                  checked={formData.waitlist_enabled}
                  onChange={handleChange}
                  className="rounded"
                />
                <Label htmlFor="waitlist_enabled">Enable waitlist when sold out</Label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="check_in_enabled"
                  checked={formData.check_in_enabled}
                  onChange={handleChange}
                  className="rounded"
                />
                <Label htmlFor="check_in_enabled">Enable check-in at event</Label>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t">
        <h3 className="font-medium mb-4">Recurring Event</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="recurring_pattern">Repeat</Label>
            <Select value={formData.recurring_pattern} onValueChange={(value) => handleSelectChange('recurring_pattern', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Does not repeat</SelectItem>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="biweekly">Bi-weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {formData.recurring_pattern !== 'none' && (
            <div className="space-y-2">
              <Label htmlFor="recurring_end_date">Repeat Until</Label>
              <Input id="recurring_end_date" type="date" value={formData.recurring_end_date} onChange={handleChange} />
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 border-t">
        <h3 className="font-medium mb-4">Event Image</h3>
        <div className="space-y-2">
          <Label htmlFor="image_url">Image URL (optional)</Label>
          <Input id="image_url" value={formData.image_url} onChange={handleChange} placeholder="https://example.com/image.jpg" />
        </div>
      </div>

      <div className="pt-4 border-t">
        <h3 className="font-medium mb-4">Event Reminders</h3>
        <div className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            id="reminders_enabled"
            checked={formData.reminders_enabled}
            onChange={handleChange}
            className="rounded"
          />
          <Label htmlFor="reminders_enabled">Send automated reminders to all members</Label>
        </div>
        
        {formData.reminders_enabled && (
          <div className="space-y-3">
            <Label>Send reminders on:</Label>
            <div className="flex flex-wrap gap-3">
              {[7, 5, 3, 2, 1, 0].map(day => (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleReminderDay(day)}
                  className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                    formData.reminder_schedule?.includes(day)
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                  }`}
                >
                  {day === 0 ? 'Day of event' : `${day} day${day > 1 ? 's' : ''} before`}
                </button>
              ))}
            </div>
            <p className="text-sm text-gray-500">
              Selected: {formData.reminder_schedule?.length > 0 
                ? formData.reminder_schedule
                    .sort((a, b) => b - a)
                    .map(d => d === 0 ? 'day of event' : `${d} day${d > 1 ? 's' : ''} before`)
                    .join(', ')
                : 'None'}
            </p>
          </div>
        )}
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit">
          {event ? 'Update Event' : 'Save as Draft'}
        </Button>
        <Button type="button" onClick={() => handleSubmit(true)} className="bg-blue-600 hover:bg-blue-700">
          Save & Announce
        </Button>
      </div>
    </form>
  );
}