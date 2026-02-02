
import React, { useState, useEffect } from 'react';
import { AssociationAccount } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function ClientAccountForm({ account, tiers, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    organization_name: '',
    point_of_contact_name: '',
    contact_email: '',
    contact_phone: '',
    street_address: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'United States',
    subscription_tier_id: '',
    billing_cycle: 'monthly',
    account_status: 'trial',
    current_member_count: 0,
    trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 14-day trial
    next_billing_date: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (account) {
      setFormData({
        organization_name: account.organization_name || '',
        point_of_contact_name: account.point_of_contact_name || '',
        contact_email: account.contact_email || '',
        contact_phone: account.contact_phone || '',
        street_address: account.street_address || '',
        city: account.city || '',
        state_province: account.state_province || '',
        postal_code: account.postal_code || '',
        country: account.country || 'United States',
        subscription_tier_id: account.subscription_tier_id || '',
        billing_cycle: account.billing_cycle || 'monthly',
        account_status: account.account_status || 'trial',
        current_member_count: account.current_member_count || 0,
        trial_end_date: account.trial_end_date || '',
        next_billing_date: account.next_billing_date || ''
      });
    }
  }, [account]);

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
        current_member_count: parseInt(formData.current_member_count, 10),
        total_revenue: account?.total_revenue || 0 // Preserve existing revenue
      };
      
      if (account && account.id) {
        await AssociationAccount.update(account.id, dataToSave);
      } else {
        await AssociationAccount.create(dataToSave);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save account:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="organization_name">Organization Name *</Label>
        <Input id="organization_name" value={formData.organization_name} onChange={handleChange} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="point_of_contact_name">Point of Contact Name *</Label>
        <Input id="point_of_contact_name" value={formData.point_of_contact_name} onChange={handleChange} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="contact_email">Contact Email *</Label>
          <Input id="contact_email" type="email" value={formData.contact_email} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="contact_phone">Contact Phone *</Label>
          <Input id="contact_phone" type="tel" value={formData.contact_phone} onChange={handleChange} required />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="street_address">Street Address *</Label>
        <Input id="street_address" value={formData.street_address} onChange={handleChange} required />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">City *</Label>
          <Input id="city" value={formData.city} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state_province">State/Province *</Label>
          <Input id="state_province" value={formData.state_province} onChange={handleChange} required />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="postal_code">Postal Code *</Label>
          <Input id="postal_code" value={formData.postal_code} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Select value={formData.country} onValueChange={(value) => handleSelectChange('country', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="United States">United States</SelectItem>
              <SelectItem value="Canada">Canada</SelectItem>
              <SelectItem value="United Kingdom">United Kingdom</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subscription_tier_id">Subscription Tier</Label>
          <Select value={formData.subscription_tier_id} onValueChange={(value) => handleSelectChange('subscription_tier_id', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select a tier" />
            </SelectTrigger>
            <SelectContent>
              {tiers.map(tier => (
                <SelectItem key={tier.id} value={tier.id}>{tier.name} ({tier.member_limit} members)</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="billing_cycle">Billing Cycle</Label>
          <Select value={formData.billing_cycle} onValueChange={(value) => handleSelectChange('billing_cycle', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="account_status">Account Status</Label>
          <Select value={formData.account_status} onValueChange={(value) => handleSelectChange('account_status', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="trial">Trial</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="current_member_count">Member Count</Label>
          <Input id="current_member_count" type="number" value={formData.current_member_count} onChange={handleChange} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="trial_end_date">Trial End Date</Label>
          <Input id="trial_end_date" type="date" value={formData.trial_end_date} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="next_billing_date">Next Billing Date</Label>
          <Input id="next_billing_date" type="date" value={formData.next_billing_date} onChange={handleChange} />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : 'Save Account'}
        </Button>
      </div>
    </form>
  );
}
