import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Loader2 } from 'lucide-react';

export default function BackOfficeUserForm({ users, onSave, onCancel }) {
  const [formData, setFormData] = useState({
    user_id: '',
    username: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.user_id || !formData.username || !formData.password) {
      toast.error('Please fill all fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      await base44.functions.invoke('manageBackOfficeAuth', {
        action: 'create',
        ...formData
      });
      toast.success('Back Office user created successfully!');
      onSave();
    } catch (error) {
      console.error('Failed to create Back Office user:', error);
      toast.error(error.response?.data?.error || 'Failed to create user.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 py-4">
      <div className="space-y-2">
        <Label htmlFor="user_id">Platform User Account</Label>
        <Select onValueChange={(value) => setFormData(p => ({...p, user_id: value}))}>
            <SelectTrigger>
                <SelectValue placeholder="Select a user to grant Back Office access" />
            </SelectTrigger>
            <SelectContent>
                {users.filter(u => u.back_office_role !== 'None').map(user => (
                    <SelectItem key={user.id} value={user.id}>
                        {user.full_name} ({user.email})
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="username">Back Office Username</Label>
        <Input id="username" value={formData.username} onChange={e => setFormData(p => ({...p, username: e.target.value}))} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" value={formData.password} onChange={e => setFormData(p => ({...p, password: e.target.value}))} />
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : 'Create User'}
        </Button>
      </div>
    </form>
  );
}