import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Landmark, CreditCard, Plus, Shield, AlertTriangle, Loader2, CheckCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function PaymentMethodManager({ member, onUpdate }) {
  const [isAddingBank, setIsAddingBank] = useState(false);
  const [isAddingCard, setIsAddingCard] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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
    cvc: '',
    name_on_card: ''
  });

  const handleAddBankAccount = async (e) => {
    e.preventDefault();

    if (!member || !member.id) {
      toast.error('Member profile not loaded. Please refresh.');
      return;
    }

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
        account_holder_type: bankForm.account_holder_type || 'individual',
      });

      if (response.data.success) {
        toast.success('Bank account added successfully!');
        setIsAddingBank(false);
        setBankForm({
          account_holder_name: '',
          routing_number: '',
          account_number: '',
          account_number_confirm: '',
          account_holder_type: 'individual'
        });
        onUpdate();
      } else {
        const errorMsg = response.data.error || 'Failed to add bank account';
        console.error('Bank account error:', response.data);
        toast.error(errorMsg, { duration: 5000 });
      }
    } catch (error) {
      console.error('Failed to add bank account:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to add bank account. Please check your information and try again.';
      toast.error(errorMsg, { duration: 5000 });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Payment Methods
        </CardTitle>
        <CardDescription>
          Manage how you pay for events and receive benefit payouts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Saved Payment Card */}
        {member?.stripe_payment_method_id && (
          <div className="p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                  <CreditCard className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-purple-900">Saved Payment Card</p>
                  <p className="text-sm text-purple-700">
                    {member.saved_card_brand} •••• {member.saved_card_last4}
                  </p>
                  <Badge className="mt-2 bg-purple-100 text-purple-800 text-xs">
                    For contributions & tickets
                  </Badge>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingCard(true)}
              >
                Update
              </Button>
            </div>
          </div>
        )}

        {/* Current Bank Account */}
        {member?.stripe_bank_account_id ? (
          <div className="p-4 bg-green-50 border-2 border-green-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Landmark className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-semibold text-green-900">Bank Account Connected</p>
                  <p className="text-sm text-green-700">
                    {member.bank_name} - ****{member.bank_account_last4}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-xs text-green-600">
                      Ready for ACH payments & payouts (1-3 business days)
                    </span>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingBank(true)}
              >
                Change
              </Button>
            </div>
          </div>
        ) : (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>No Payment Method Set</strong>
              <p className="text-sm mt-1">
                Add a bank account to pay for events and receive benefit payouts.
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Add Payment Method Buttons */}
        {!member?.stripe_payment_method_id && !isAddingCard && (
          <Button 
            onClick={() => setIsAddingCard(true)}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Payment Card
          </Button>
        )}

        {!isAddingBank && !member?.stripe_bank_account_id && (
          <Button 
            onClick={() => setIsAddingBank(true)}
            variant="outline"
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Bank Account (ACH)
          </Button>
        )}

        {/* Add Bank Account Form */}
        {isAddingBank && (
          <div className="border-2 border-blue-200 rounded-lg p-4 bg-blue-50 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-blue-900 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Add Bank Account (Secure)
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsAddingBank(false);
                  setBankForm({
                    account_holder_name: '',
                    routing_number: '',
                    account_number: '',
                    account_number_confirm: '',
                    account_holder_type: 'individual'
                  });
                }}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>

            <Alert className="bg-blue-100 border-blue-300">
              <Shield className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-xs">
                Your bank details are encrypted in transit and tokenized by Stripe.
                We never store your full account number.
              </AlertDescription>
            </Alert>

            <form onSubmit={handleAddBankAccount} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                <Input
                  id="account_holder_name"
                  value={bankForm.account_holder_name}
                  onChange={(e) => setBankForm({...bankForm, account_holder_name: e.target.value})}
                  placeholder="Full name on account"
                  required
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_holder_type">Account Type *</Label>
                <Select
                  value={bankForm.account_holder_type}
                  onValueChange={(value) => setBankForm({...bankForm, account_holder_type: value})}
                  disabled={isSaving}
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
                  onChange={(e) => setBankForm({...bankForm, routing_number: e.target.value.replace(/\D/g, '').slice(0, 9)})}
                  placeholder="9-digit routing number"
                  maxLength={9}
                  required
                  disabled={isSaving}
                />
                <p className="text-xs text-gray-500">
                  Found on the bottom left of your check
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number">Account Number *</Label>
                <Input
                  id="account_number"
                  type="password"
                  value={bankForm.account_number}
                  onChange={(e) => setBankForm({...bankForm, account_number: e.target.value.replace(/\D/g, '')})}
                  placeholder="Account number"
                  required
                  disabled={isSaving}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="account_number_confirm">Confirm Account Number *</Label>
                <Input
                  id="account_number_confirm"
                  type="password"
                  value={bankForm.account_number_confirm}
                  onChange={(e) => setBankForm({...bankForm, account_number_confirm: e.target.value.replace(/\D/g, '')})}
                  placeholder="Re-enter account number"
                  required
                  disabled={isSaving}
                />
              </div>

              <Button
                type="submit"
                disabled={isSaving}
                className="w-full"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving Securely...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Save Bank Account
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Add Card Form */}
        {isAddingCard && (
          <div className="border-2 border-purple-200 rounded-lg p-4 bg-purple-50 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-purple-900 flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Save Payment Card
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsAddingCard(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
            </div>

            <Alert className="bg-purple-100 border-purple-300">
              <Shield className="h-4 w-4 text-purple-600" />
              <AlertDescription className="text-purple-900 text-xs">
                Your card will be securely saved for future payments. We use Stripe to tokenize your card - we never store your full card number.
              </AlertDescription>
            </Alert>

            <p className="text-sm text-purple-800 font-medium">
              Note: To save a card, make your first payment and select "Save card for future use" during checkout. The card will be automatically saved to your profile.
            </p>

            <Button
              variant="outline"
              onClick={() => setIsAddingCard(false)}
              className="w-full"
            >
              Got It
            </Button>
          </div>
        )}

        {/* Information */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Payment Methods</h4>
          <ul className="text-sm text-gray-600 space-y-1">
            <li>✓ <strong>Saved Card:</strong> Instant payments for contributions</li>
            <li>✓ <strong>Bank Account (ACH):</strong> Lower fees, 1-3 day processing</li>
            <li>✓ Receive benefit payouts directly to your bank account</li>
            <li>✓ All payment data is securely encrypted by Stripe</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}