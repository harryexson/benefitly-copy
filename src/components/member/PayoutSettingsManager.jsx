import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
  Landmark, 
  CreditCard, 
  Zap, 
  Clock, 
  Shield, 
  CheckCircle,
  AlertTriangle,
  Loader2,
  Info,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { Member } from '@/entities/all';

export default function PayoutSettingsManager({ member, onUpdate }) {
  const [addMethodDialog, setAddMethodDialog] = useState(false);
  const [methodType, setMethodType] = useState('bank_account');
  const [isSaving, setIsSaving] = useState(false);
  const [preferredMethod, setPreferredMethod] = useState(
    member.preferred_payout_speed || 'standard'
  );

  const [bankForm, setBankForm] = useState({
    account_holder_name: '',
    routing_number: '',
    account_number: '',
    account_number_confirm: '',
    account_holder_type: 'individual'
  });

  const [cardForm, setCardForm] = useState({
    card_number: '',
    exp_month: '',
    exp_year: '',
    cvc: ''
  });

  const hasBankAccount = member.stripe_bank_account_id && member.bank_account_last4;
  const hasCard = member.saved_card_last4;

  const handleSaveBankAccount = async (e) => {
    e.preventDefault();

    if (bankForm.account_number !== bankForm.account_number_confirm) {
      toast.error('Account numbers do not match');
      return;
    }

    if (!bankForm.routing_number || bankForm.routing_number.length !== 9) {
      toast.error('Routing number must be 9 digits');
      return;
    }

    setIsSaving(true);
    try {
      const response = await base44.functions.invoke('setupMemberBankAccount', {
        member_id: member.id,
        account_holder_name: bankForm.account_holder_name.trim(),
        routing_number: bankForm.routing_number.trim(),
        account_number: bankForm.account_number.trim(),
        account_holder_type: bankForm.account_holder_type
      });

      if (response.data.success) {
        toast.success('Bank account added successfully!');
        setAddMethodDialog(false);
        setBankForm({
          account_holder_name: '',
          routing_number: '',
          account_number: '',
          account_number_confirm: '',
          account_holder_type: 'individual'
        });
        onUpdate();
      } else {
        toast.error(response.data.error || 'Failed to add bank account');
      }
    } catch (error) {
      console.error('Failed to add bank account:', error);
      toast.error(error.message || 'Failed to add bank account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSavePreferredMethod = async (speed) => {
    try {
      await Member.update(member.id, {
        preferred_payout_speed: speed
      });
      setPreferredMethod(speed);
      toast.success('Payout preference updated');
      onUpdate();
    } catch (error) {
      console.error('Failed to update preference:', error);
      toast.error('Failed to update preference');
    }
  };

  return (
    <div className="space-y-6">
      {/* Current Payout Methods */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Landmark className="h-5 w-5 text-blue-600" />
            Linked Payout Methods
          </CardTitle>
          <CardDescription>
            Securely linked payment methods for receiving payouts
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasBankAccount ? (
            <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Landmark className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-900">Bank Account</p>
                  <p className="text-sm text-green-700">
                    {member.bank_name || 'Bank'} - ****{member.bank_account_last4}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    ✓ Verified and ready for payouts
                  </p>
                </div>
              </div>
              <Badge className="bg-green-600 text-white">Primary</Badge>
            </div>
          ) : (
            <Alert className="bg-yellow-50 border-yellow-300">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                <strong>No bank account linked.</strong> Add a bank account to receive payouts.
              </AlertDescription>
            </Alert>
          )}

          {hasCard && (
            <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-blue-900">Debit Card</p>
                  <p className="text-sm text-blue-700">
                    {member.saved_card_brand} ****{member.saved_card_last4}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    For instant payouts
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={() => setAddMethodDialog(true)}
            variant="outline"
            className="w-full"
          >
            {hasBankAccount ? 'Update Bank Account' : 'Add Bank Account'}
          </Button>
        </CardContent>
      </Card>

      {/* Preferred Payout Speed */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-500" />
            Preferred Payout Speed
          </CardTitle>
          <CardDescription>
            Choose your default payout speed for future requests
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={preferredMethod} onValueChange={handleSavePreferredMethod}>
            <label
              className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50"
              style={{
                borderColor: preferredMethod === 'instant' ? '#3b82f6' : '#e5e7eb',
                backgroundColor: preferredMethod === 'instant' ? '#eff6ff' : 'transparent'
              }}
            >
              <RadioGroupItem value="instant" id="instant" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Zap className="h-4 w-4 text-orange-500" />
                  <span className="font-semibold text-gray-900">Instant Payout</span>
                  <Badge variant="outline" className="ml-2 text-xs">Fastest</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Funds arrive within 30 minutes to eligible debit cards
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <DollarSign className="h-3 w-3" />
                  <span>1.5% fee (max $10 per payout)</span>
                </div>
              </div>
            </label>

            <label
              className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50"
              style={{
                borderColor: preferredMethod === 'standard' ? '#3b82f6' : '#e5e7eb',
                backgroundColor: preferredMethod === 'standard' ? '#eff6ff' : 'transparent'
              }}
            >
              <RadioGroupItem value="standard" id="standard" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-blue-500" />
                  <span className="font-semibold text-gray-900">Standard Payout</span>
                  <Badge variant="outline" className="ml-2 text-xs bg-green-50 text-green-700">No Fee</Badge>
                </div>
                <p className="text-sm text-gray-600 mb-2">
                  Funds arrive in 1-2 business days to your bank account
                </p>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  <span>Free - No additional fees</span>
                </div>
              </div>
            </label>
          </RadioGroup>

          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              You can override this preference when requesting individual payouts.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Fee Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-gray-600" />
            Payout Fee Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Standard Bank Payout</p>
                <p className="text-sm text-gray-600">1-2 business days</p>
              </div>
              <Badge className="bg-green-100 text-green-800 border-green-300">
                Free
              </Badge>
            </div>

            <div className="flex items-start justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Instant Debit Card Payout</p>
                <p className="text-sm text-gray-600">Within 30 minutes</p>
              </div>
              <Badge variant="outline">
                1.5% (max $10)
              </Badge>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Note:</strong> Fees are deducted from the payout amount. For example, a $100 instant payout 
              would result in $98.50 deposited to your account.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security Notice */}
      <Alert className="bg-gray-50 border-gray-300">
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Your security matters:</strong> All payment information is encrypted and tokenized by Stripe. 
          We never store your full account numbers or card details.
        </AlertDescription>
      </Alert>

      {/* Add Payment Method Dialog */}
      <Dialog open={addMethodDialog} onOpenChange={setAddMethodDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-600" />
              Add Bank Account (Secure)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveBankAccount} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="account_holder_name">Account Holder Name *</Label>
              <Input
                id="account_holder_name"
                value={bankForm.account_holder_name}
                onChange={(e) => setBankForm({ ...bankForm, account_holder_name: e.target.value })}
                placeholder="Full name on account"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_holder_type">Account Type *</Label>
              <Select
                value={bankForm.account_holder_type}
                onValueChange={(value) => setBankForm({ ...bankForm, account_holder_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="individual">Personal Account</SelectItem>
                  <SelectItem value="company">Business Account</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="routing_number">Routing Number *</Label>
              <Input
                id="routing_number"
                value={bankForm.routing_number}
                onChange={(e) =>
                  setBankForm({ ...bankForm, routing_number: e.target.value.replace(/\D/g, '').slice(0, 9) })
                }
                placeholder="9-digit routing number"
                maxLength={9}
                required
              />
              <p className="text-xs text-gray-500">Found on the bottom left of your check</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number">Account Number *</Label>
              <Input
                id="account_number"
                type="password"
                value={bankForm.account_number}
                onChange={(e) => setBankForm({ ...bankForm, account_number: e.target.value.replace(/\D/g, '') })}
                placeholder="Account number"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="account_number_confirm">Confirm Account Number *</Label>
              <Input
                id="account_number_confirm"
                type="password"
                value={bankForm.account_number_confirm}
                onChange={(e) =>
                  setBankForm({ ...bankForm, account_number_confirm: e.target.value.replace(/\D/g, '') })
                }
                placeholder="Re-enter account number"
                required
              />
            </div>

            <Alert className="bg-blue-50 border-blue-300">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-xs">
                Your bank details are encrypted and tokenized by Stripe. We only store a secure reference token.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddMethodDialog(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Save Securely
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}