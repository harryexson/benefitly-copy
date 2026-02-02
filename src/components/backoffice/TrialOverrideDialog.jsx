import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TrialUsage } from '@/entities/all';
import { User } from '@/entities/User';
import { AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function TrialOverrideDialog({ isOpen, onClose, emailAddress, organizationName, onComplete }) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a reason for the trial override.');
      return;
    }

    setIsSubmitting(true);
    try {
      const currentUser = await User.me();
      
      // Create a trial usage record with override information
      await TrialUsage.create({
        email_address: emailAddress,
        organization_name: organizationName || '',
        trial_start_date: new Date().toISOString().split('T')[0],
        trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        override_reason: reason,
        overridden_by: currentUser.email
      });

      toast.success('Trial override granted successfully.');
      onComplete();
      onClose();
      setReason('');
    } catch (error) {
      toast.error('Failed to grant trial override.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <AlertTriangle className="h-5 w-5" />
            Grant Trial Override
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
            <p className="text-sm text-orange-800">
              <strong>Override Request:</strong> This email or organization has already used a trial. 
              Granting an override will allow them to start a new 14-day trial period.
            </p>
            <div className="mt-2 text-sm">
              <p><strong>Email:</strong> {emailAddress}</p>
              {organizationName && <p><strong>Organization:</strong> {organizationName}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Override *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Special promotion, customer retention, technical error in previous trial..."
              rows={3}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Granting Override...' : 'Grant Trial Override'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}