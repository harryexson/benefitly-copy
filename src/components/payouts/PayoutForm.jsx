import React, { useState, useEffect } from 'react';
import { Payout } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function PayoutForm({ payout, events, members, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    event_id: '',
    payee_member_id: '',
    amount: '',
    currency: 'USD',
    status: 'Pending Approval',
    payout_speed: 'standard'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (payout) {
      setFormData({
        event_id: payout.event_id || '',
        payee_member_id: payout.payee_member_id || '',
        amount: payout.amount || '',
        currency: payout.currency || 'USD',
        status: payout.status || 'Pending Approval',
        payout_speed: payout.payout_speed || 'standard'
      });
    }
  }, [payout]);

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
      const dataToSave = {
        ...formData,
        amount: parseFloat(formData.amount)
      };

      if (payout && payout.id) {
        await Payout.update(payout.id, dataToSave);
      } else {
        await Payout.create(dataToSave);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save payout:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="event_id">Related Event</Label>
        <Select value={formData.event_id} onValueChange={(value) => handleSelectChange('event_id', value)} required>
          <SelectTrigger>
            <SelectValue placeholder="Select an event" />
          </SelectTrigger>
          <SelectContent>
            {events.map((event) => (
              <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="payee_member_id">Payee Member</Label>
        <Select value={formData.payee_member_id} onValueChange={(value) => handleSelectChange('payee_member_id', value)} required>
          <SelectTrigger>
            <SelectValue placeholder="Select a member" />
          </SelectTrigger>
          <SelectContent>
            {members.map((member) => (
              <SelectItem key={member.id} value={member.id}>
                {member.first_name} {member.last_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="amount">Amount</Label>
        <Input id="amount" type="number" step="0.01" value={formData.amount} onChange={handleChange} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="payout_speed">Payout Speed</Label>
        <Select value={formData.payout_speed} onValueChange={(value) => handleSelectChange('payout_speed', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="standard">
              <div className="flex flex-col items-start">
                <span className="font-medium">Standard (1-2 days)</span>
                <span className="text-xs text-gray-500">Free</span>
              </div>
            </SelectItem>
            <SelectItem value="instant">
              <div className="flex flex-col items-start">
                <span className="font-medium">Instant (30 min)</span>
                <span className="text-xs text-gray-500">1.5% fee, max $10</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
        {formData.payout_speed === 'instant' && (
          <p className="text-xs text-amber-600">⚡ Instant payouts incur a 1.5% fee (capped at $10)</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="status">Status</Label>
        <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Pending Approval">Pending Approval</SelectItem>
            <SelectItem value="Approved">Approved</SelectItem>
            <SelectItem value="Disbursed">Disbursed</SelectItem>
            <SelectItem value="Failed">Failed</SelectItem>
            <SelectItem value="Reversed">Reversed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Payout'}
        </Button>
      </div>
    </form>
  );
}