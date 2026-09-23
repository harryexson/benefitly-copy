import React, { useState, useEffect } from 'react';
import { Member } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const generateMemberNumber = () => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `MEM${timestamp.slice(-6)}${random}`;
};

const MemberForm = ({ member, onSave, onCancel }) => {
  const [formData, setFormData] = useState({
    member_number: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    street_address: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'United States',
    status: 'Pending',
    joined_at: new Date().toISOString().split('T')[0],
    payout_method: 'Not Set',
    payout_details: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (member) {
      setFormData({
        member_number: member.member_number || '',
        first_name: member.first_name || '',
        last_name: member.last_name || '',
        email: member.email || '',
        phone: member.phone || '',
        street_address: member.street_address || '',
        city: member.city || '',
        state_province: member.state_province || '',
        postal_code: member.postal_code || '',
        country: member.country || 'United States',
        status: member.status || 'Pending',
        joined_at: member.joined_at || new Date().toISOString().split('T')[0],
        payout_method: member.payout_method || 'Not Set',
        payout_details: member.payout_details || ''
      });
    } else {
        setFormData({
            member_number: '',
            first_name: '',
            last_name: '',
            email: '',
            phone: '',
            street_address: '',
            city: '',
            state_province: '',
            postal_code: '',
            country: 'United States',
            status: 'Pending',
            joined_at: new Date().toISOString().split('T')[0],
            payout_method: 'Not Set',
            payout_details: ''
        });
    }
  }, [member]);

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      let dataToSave = { ...formData };
      
      // If this is a new member being created directly as Active, assign member number
      if (!member && formData.status === 'Active' && !formData.member_number) {
        dataToSave.member_number = generateMemberNumber();
      }
      
      let savedMember;
      if (member && member.id) {
        await Member.update(member.id, dataToSave);
        savedMember = { ...member, ...dataToSave };
      } else {
        savedMember = await Member.create(dataToSave);
        
        // Trigger welcome email workflow for new members
        try {
          await base44.functions.invoke('triggerMemberWelcome', {
            member_id: savedMember.id
          });
          toast.success('Member created and welcome email sent!');
        } catch (error) {
          console.error('Failed to send welcome email:', error);
          toast.success('Member created (welcome email pending)');
        }
      }
      
      onSave();
    } catch (error) {
      console.error('Failed to save member:', error);
      toast.error('Failed to save member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="member_number">Member Number</Label>
        <Input 
          id="member_number" 
          value={formData.member_number} 
          onChange={handleChange} 
          placeholder={formData.status === 'Pending' ? 'Assigned upon approval' : 'Enter member number or leave blank to auto-generate'}
        />
        <p className="text-xs text-gray-500">
          Administrators can edit member numbers. Leave blank for auto-generation.
        </p>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name</Label>
          <Input id="first_name" value={formData.first_name} onChange={handleChange} required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name</Label>
          <Input id="last_name" value={formData.last_name} onChange={handleChange} required />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={formData.email} onChange={handleChange} required />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" type="tel" value={formData.phone} onChange={handleChange} />
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium text-gray-900">Address Information</h4>
        
        <div className="space-y-2">
          <Label htmlFor="street_address">Street Address</Label>
          <Input id="street_address" value={formData.street_address} onChange={handleChange} />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input id="city" value={formData.city} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="state_province">State/Province</Label>
            <Input id="state_province" value={formData.state_province} onChange={handleChange} />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="postal_code">Postal/Zip Code</Label>
            <Input id="postal_code" value={formData.postal_code} onChange={handleChange} />
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
                <SelectItem value="Australia">Australia</SelectItem>
                <SelectItem value="Germany">Germany</SelectItem>
                <SelectItem value="France">France</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t">
        <h4 className="font-medium text-gray-900">Payout Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="payout_method">Payout Method</Label>
            <Select value={formData.payout_method} onValueChange={(value) => handleSelectChange('payout_method', value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Not Set">Not Set</SelectItem>
                <SelectItem value="Bank Account">Bank Account</SelectItem>
                <SelectItem value="Zelle">Zelle</SelectItem>
                <SelectItem value="CashApp">CashApp</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="payout_details">Payout Details</Label>
            <Input 
              id="payout_details" 
              value={formData.payout_details} 
              onChange={handleChange}
              placeholder={
                formData.payout_method === 'Bank Account' ? 'Acct # / Routing #' :
                formData.payout_method === 'Zelle' ? 'Email or Phone' :
                formData.payout_method === 'CashApp' ? '$Cashtag' : 'N/A'
              }
            />
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4 pt-4 border-t">
        <div className="space-y-2">
            <Label htmlFor="joined_at">Joined Date</Label>
            <Input id="joined_at" type="date" value={formData.joined_at} onChange={handleChange} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => handleSelectChange('status', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
              <SelectItem value="Removed">Removed</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Member'
          )}
        </Button>
      </div>
    </form>
  );
};

export default MemberForm;