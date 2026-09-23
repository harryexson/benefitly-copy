import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Member } from '@/entities/all';
import { toast } from 'sonner';
import { Repeat, CreditCard, Calendar, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { base44 } from '@/api/base44Client';

export default function RecurringContributionManager({ member, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    enabled: member.recurring_contribution_enabled || false,
    amount: member.recurring_contribution_amount || 0,
    frequency: member.recurring_contribution_frequency || 'monthly'
  });

  const handleSave = async () => {
    if (formData.enabled && formData.amount <= 0) {
      toast.error('Please enter a valid contribution amount');
      return;
    }

    setIsSaving(true);
    try {
      if (formData.enabled && !member.stripe_subscription_id) {
        // Create new subscription
        const response = await base44.functions.invoke('createRecurringPayment', {
          member_id: member.id,
          amount: formData.amount,
          frequency: formData.frequency,
          payment_method_id: member.stripe_payment_method_id
        });

        if (response.data.error) {
          throw new Error(response.data.error);
        }
        
        toast.success('Recurring payment set up successfully!');
      } else if (!formData.enabled && member.stripe_subscription_id) {
        // Cancel subscription
        const response = await base44.functions.invoke('cancelRecurringPayment', {
          member_id: member.id
        });

        if (response.data.error) {
          throw new Error(response.data.error);
        }
        
        toast.success('Recurring payment cancelled');
      } else {
        // Just update settings
        await Member.update(member.id, {
          recurring_contribution_amount: formData.amount,
          recurring_contribution_frequency: formData.frequency
        });
        
        toast.success('Settings updated!');
      }
      
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to update recurring contribution:', error);
      toast.error(error.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  const frequencyLabels = {
    monthly: 'Monthly',
    quarterly: 'Quarterly (every 3 months)',
    annually: 'Annually'
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Repeat className="h-5 w-5 text-purple-600" />
            <CardTitle>Recurring Contributions</CardTitle>
          </div>
          {member.recurring_contribution_enabled && (
            <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded-full font-semibold">
              Active
            </span>
          )}
        </div>
        <CardDescription>
          Set up automatic recurring contributions to support the association
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!member.stripe_payment_method_id && !member.stripe_bank_account_id && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-800 text-sm">
              You need to add a payment method before setting up recurring contributions.
              Visit the Payment Methods tab to add a card or bank account.
            </AlertDescription>
          </Alert>
        )}

        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-medium">Enable Recurring Contributions</Label>
            <p className="text-sm text-gray-500">Automatically contribute at regular intervals</p>
          </div>
          <Switch
            checked={formData.enabled}
            onCheckedChange={(checked) => {
              setFormData({ ...formData, enabled: checked });
              setIsEditing(true);
            }}
            disabled={!member.stripe_payment_method_id && !member.stripe_bank_account_id}
          />
        </div>

        {formData.enabled && (
          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="amount">Contribution Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <Input
                  id="amount"
                  type="number"
                  min="1"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 });
                    setIsEditing(true);
                  }}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="frequency">Frequency</Label>
              <Select
                value={formData.frequency}
                onValueChange={(value) => {
                  setFormData({ ...formData, frequency: value });
                  setIsEditing(true);
                }}
              >
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Monthly
                    </div>
                  </SelectItem>
                  <SelectItem value="quarterly">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Quarterly
                    </div>
                  </SelectItem>
                  <SelectItem value="annually">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Annually
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                {frequencyLabels[formData.frequency]}
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-2">
                <CreditCard className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-900">
                  <p className="font-semibold">Payment Method:</p>
                  <p>
                    {member.stripe_payment_method_id
                      ? `${member.saved_card_brand} ****${member.saved_card_last4}`
                      : member.stripe_bank_account_id
                      ? `${member.bank_name} ****${member.bank_account_last4}`
                      : 'No payment method'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {member.stripe_subscription_id && formData.enabled && (
          <Alert className="bg-green-50 border-green-200">
            <Repeat className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800 text-sm">
              Your recurring contribution of ${formData.amount.toFixed(2)} {formData.frequency} is active.
              Payments will be automatically charged to your saved payment method.
            </AlertDescription>
          </Alert>
        )}

        {isEditing && (
          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setFormData({
                  enabled: member.recurring_contribution_enabled || false,
                  amount: member.recurring_contribution_amount || 0,
                  frequency: member.recurring_contribution_frequency || 'monthly'
                });
                setIsEditing(false);
              }}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}