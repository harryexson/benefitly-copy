import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';

export default function SuspensionDialog({ isOpen, onClose, account, onConfirm }) {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    if (!reason) {
      alert('Please select a reason for suspension.');
      return;
    }
    onConfirm(reason, notes);
    setReason('');
    setNotes('');
  };

  const suspensionReasons = [
    'Non-payment / Overdue Account',
    'Terms of Use Violation',
    'Code Distribution / Piracy',
    'Fraudulent Activity',
    'Excessive Support Burden',
    'Other Policy Violation'
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Suspend Account: {account?.organization_name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">
              <strong>Warning:</strong> This will immediately suspend the account and prevent all access to the platform.
              The account holder will be notified via email.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Suspension Reason *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger>
                <SelectValue placeholder="Select a reason for suspension" />
              </SelectTrigger>
              <SelectContent>
                {suspensionReasons.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide additional details about the suspension..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleConfirm}>
              Confirm Suspension
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}