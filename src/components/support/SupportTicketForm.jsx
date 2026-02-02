import React, { useState, useEffect } from 'react';
import { SupportTicket } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const generateTicketNumber = () => {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `TKT-${timestamp}-${random}`;
}

export default function SupportTicketForm({ ticket, accounts, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    ticket_number: '',
    association_account_id: '',
    subject: '',
    description: '',
    priority: 'medium',
    status: 'open',
    category: 'general',
    assigned_to: '',
    resolution_notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (ticket) {
      setFormData({
        ticket_number: ticket.ticket_number || '',
        association_account_id: ticket.association_account_id || '',
        subject: ticket.subject || '',
        description: ticket.description || '',
        priority: ticket.priority || 'medium',
        status: ticket.status || 'open',
        category: ticket.category || 'general',
        assigned_to: ticket.assigned_to || '',
        resolution_notes: ticket.resolution_notes || ''
      });
    } else {
        setFormData(prev => ({ ...prev, ticket_number: generateTicketNumber() }));
    }
  }, [ticket]);
  
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (ticket && ticket.id) {
        await SupportTicket.update(ticket.id, formData);
      } else {
        await SupportTicket.create(formData);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save support ticket:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-2">
      <div className="space-y-2">
        <Label htmlFor="ticket_number">Ticket Number</Label>
        <Input id="ticket_number" value={formData.ticket_number} disabled className="bg-gray-100" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="association_account_id">Client Account</Label>
        <Select value={formData.association_account_id} onValueChange={(value) => handleSelectChange('association_account_id', value)} required>
          <SelectTrigger>
            <SelectValue placeholder="Select a client account" />
          </SelectTrigger>
          <SelectContent>
            {accounts.map((acc) => (
              <SelectItem key={acc.id} value={acc.id}>{acc.organization_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">Subject</Label>
        <Input id="subject" value={formData.subject} onChange={handleChange} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" value={formData.description} onChange={handleChange} required rows={5} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => handleSelectChange('category', value)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="billing">Billing</SelectItem>
                    <SelectItem value="technical">Technical</SelectItem>
                    <SelectItem value="feature_request">Feature Request</SelectItem>
                    <SelectItem value="bug_report">Bug Report</SelectItem>
                    <SelectItem value="general">General</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <Select value={formData.priority} onValueChange={(value) => handleSelectChange('priority', value)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
            </Select>
        </div>
        <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="waiting_customer">Waiting for Customer</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
            </Select>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="resolution_notes">Resolution Notes</Label>
        <Textarea id="resolution_notes" value={formData.resolution_notes} onChange={handleChange} rows={4} />
      </div>

      <div className="flex justify-end gap-2 pt-4 border-t sticky bottom-0 bg-white py-3">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Ticket'}
        </Button>
      </div>
    </form>
  );
}