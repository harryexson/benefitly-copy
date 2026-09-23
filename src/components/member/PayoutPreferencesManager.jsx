import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Landmark, Smartphone, DollarSign, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Member, Payout } from '@/entities/all';
import { format } from 'date-fns';

export default function PayoutPreferencesManager({ member, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [payouts, setPayouts] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Bank account form
  const [bankForm, setBankForm] = useState({
    accountHolderName: '',
    routingNumber: '',
    accountNumber: '',
    accountNumberConfirm: '',
    accountType: 'individual',
  });

  // Zelle form
  const [zelleForm, setZelleForm] = useState({
    emailOrPhone: '',
  });

  // CashApp form
  const [cashAppForm, setCashAppForm] = useState({
    cashtag: '',
  });

  const [selectedMethod, setSelectedMethod] = useState(member?.payout_method || 'Not Set');

  useEffect(() => {
    loadPayoutHistory();
  }, [member?.id]);

  const loadPayoutHistory = async () => {
    if (!member?.id) return;
    
    try {
      setLoadingHistory(true);
      const memberPayouts = await Payout.filter({ payee_member_id: member.id });
      setPayouts(memberPayouts.sort((a, b) => new Date(b.created_date) - new Date(a.created_date)));
    } catch (error) {
      console.error('Failed to load payout history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleBankAccountSubmit = async (e) => {
    e.preventDefault();
    
    if (bankForm.accountNumber !== bankForm.accountNumberConfirm) {
      toast.error('Account numbers do not match');
      return;
    }

    if (bankForm.routingNumber.length !== 9) {
      toast.error('Routing number must be 9 digits');
      return;
    }

    setIsSaving(true);
    try {
      const response = await base44.functions.invoke('setupMemberBankAccount', {
        member_id: member.id,
        account_holder_name: bankForm.accountHolderName,
        routing_number: bankForm.routingNumber,
        account_number: bankForm.accountNumber,
        account_holder_type: bankForm.accountType,
      });

      if (response.data.success) {
        toast.success('Bank account added successfully!');
        setBankForm({
          accountHolderName: '',
          routingNumber: '',
          accountNumber: '',
          accountNumberConfirm: '',
          accountType: 'individual',
        });
        setIsEditing(false);
        if (onUpdate) onUpdate();
      } else {
        toast.error(response.data.error || 'Failed to add bank account');
      }
    } catch (error) {
      console.error('Failed to setup bank account:', error);
      toast.error(error.response?.data?.error || 'Failed to add bank account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleZelleSubmit = async (e) => {
    e.preventDefault();
    
    setIsSaving(true);
    try {
      await Member.update(member.id, {
        payout_method: 'Zelle',
        payout_details: zelleForm.emailOrPhone,
      });

      toast.success('Zelle account added successfully!');
      setZelleForm({ emailOrPhone: '' });
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to save Zelle:', error);
      toast.error('Failed to add Zelle account');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCashAppSubmit = async (e) => {
    e.preventDefault();
    
    if (!cashAppForm.cashtag.startsWith('$')) {
      toast.error('CashApp cashtag must start with $');
      return;
    }

    setIsSaving(true);
    try {
      await Member.update(member.id, {
        payout_method: 'CashApp',
        payout_details: cashAppForm.cashtag,
      });

      toast.success('CashApp account added successfully!');
      setCashAppForm({ cashtag: '' });
      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (error) {
      console.error('Failed to save CashApp:', error);
      toast.error('Failed to add CashApp account');
    } finally {
      setIsSaving(false);
    }
  };

  const statusColors = {
    'Pending Approval': 'border-yellow-500 text-yellow-700 bg-yellow-50',
    'Approved': 'border-blue-500 text-blue-700 bg-blue-50',
    'Disbursed': 'border-green-500 text-green-700 bg-green-50',
    'Failed': 'border-red-500 text-red-700 bg-red-50',
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="methods" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="methods">Payout Methods</TabsTrigger>
          <TabsTrigger value="history">Payout History</TabsTrigger>
        </TabsList>

        <TabsContent value="methods" className="space-y-6 mt-6">
          {/* Current Payout Method */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Current Payout Method
              </CardTitle>
              <CardDescription>
                This is how you'll receive benefit payouts from your association
              </CardDescription>
            </CardHeader>
            <CardContent>
              {member?.payout_method === 'Bank Account' && member.stripe_bank_account_id ? (
                <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <Landmark className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-900">Bank Account</p>
                      <p className="text-sm text-green-700">
                        {member.bank_name || 'Bank Account'} ••••{member.bank_account_last4 || '****'}
                      </p>
                    </div>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              ) : member?.payout_method === 'Zelle' ? (
                <div className="flex items-center justify-between p-4 bg-purple-50 border-2 border-purple-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center">
                      <Smartphone className="h-6 w-6 text-purple-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-purple-900">Zelle</p>
                      <p className="text-sm text-purple-700">{member.payout_details}</p>
                    </div>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-purple-600" />
                </div>
              ) : member?.payout_method === 'CashApp' ? (
                <div className="flex items-center justify-between p-4 bg-green-50 border-2 border-green-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                      <DollarSign className="h-6 w-6 text-green-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-green-900">CashApp</p>
                      <p className="text-sm text-green-700">{member.payout_details}</p>
                    </div>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No payout method configured. Add a payout method below to receive benefit payouts.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Add/Update Payout Method */}
          {!isEditing ? (
            <Card>
              <CardHeader>
                <CardTitle>Add or Update Payout Method</CardTitle>
                <CardDescription>
                  Choose how you want to receive your benefit payouts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setIsEditing(true)} className="w-full">
                  {member?.payout_method !== 'Not Set' ? 'Update' : 'Add'} Payout Method
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Select Payout Method</CardTitle>
                <CardDescription>Choose your preferred way to receive payouts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Payout Method</Label>
                  <Select value={selectedMethod} onValueChange={setSelectedMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bank Account">Bank Account (Recommended)</SelectItem>
                      <SelectItem value="Zelle">Zelle</SelectItem>
                      <SelectItem value="CashApp">CashApp</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Bank Account Form */}
                {selectedMethod === 'Bank Account' && (
                  <form onSubmit={handleBankAccountSubmit} className="space-y-4">
                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="h-4 w-4 text-blue-600" />
                      <AlertDescription className="text-blue-900">
                        Your bank account details are securely encrypted and stored via Stripe. We never see your full account number.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="accountHolderName">Account Holder Name</Label>
                      <Input
                        id="accountHolderName"
                        value={bankForm.accountHolderName}
                        onChange={(e) => setBankForm({...bankForm, accountHolderName: e.target.value})}
                        placeholder="John Doe"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountType">Account Type</Label>
                      <Select 
                        value={bankForm.accountType}
                        onValueChange={(value) => setBankForm({...bankForm, accountType: value})}
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
                      <Label htmlFor="routingNumber">Routing Number</Label>
                      <Input
                        id="routingNumber"
                        value={bankForm.routingNumber}
                        onChange={(e) => setBankForm({...bankForm, routingNumber: e.target.value.replace(/\D/g, '').slice(0, 9)})}
                        placeholder="123456789"
                        maxLength={9}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountNumber">Account Number</Label>
                      <Input
                        id="accountNumber"
                        type="password"
                        value={bankForm.accountNumber}
                        onChange={(e) => setBankForm({...bankForm, accountNumber: e.target.value.replace(/\D/g, '')})}
                        placeholder="••••••••••"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="accountNumberConfirm">Confirm Account Number</Label>
                      <Input
                        id="accountNumberConfirm"
                        type="password"
                        value={bankForm.accountNumberConfirm}
                        onChange={(e) => setBankForm({...bankForm, accountNumberConfirm: e.target.value.replace(/\D/g, '')})}
                        placeholder="••••••••••"
                        required
                      />
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSaving} className="flex-1">
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Bank Account'
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                {/* Zelle Form */}
                {selectedMethod === 'Zelle' && (
                  <form onSubmit={handleZelleSubmit} className="space-y-4">
                    <Alert className="bg-purple-50 border-purple-200">
                      <Info className="h-4 w-4 text-purple-600" />
                      <AlertDescription className="text-purple-900">
                        Zelle payouts are processed manually. Provide the email or phone number registered with your Zelle account.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="zelleContact">Zelle Email or Phone Number</Label>
                      <Input
                        id="zelleContact"
                        value={zelleForm.emailOrPhone}
                        onChange={(e) => setZelleForm({emailOrPhone: e.target.value})}
                        placeholder="email@example.com or (555) 123-4567"
                        required
                      />
                      <p className="text-sm text-gray-500">
                        This must match the email or phone number registered with your Zelle account
                      </p>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSaving} className="flex-1">
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Zelle Account'
                        )}
                      </Button>
                    </div>
                  </form>
                )}

                {/* CashApp Form */}
                {selectedMethod === 'CashApp' && (
                  <form onSubmit={handleCashAppSubmit} className="space-y-4">
                    <Alert className="bg-green-50 border-green-200">
                      <Info className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-900">
                        CashApp payouts are processed manually. Provide your $cashtag exactly as it appears in your CashApp.
                      </AlertDescription>
                    </Alert>

                    <div className="space-y-2">
                      <Label htmlFor="cashtag">CashApp $Cashtag</Label>
                      <Input
                        id="cashtag"
                        value={cashAppForm.cashtag}
                        onChange={(e) => setCashAppForm({cashtag: e.target.value})}
                        placeholder="$YourCashtag"
                        required
                      />
                      <p className="text-sm text-gray-500">
                        Include the $ symbol (e.g., $JohnDoe)
                      </p>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsEditing(false)} className="flex-1">
                        Cancel
                      </Button>
                      <Button type="submit" disabled={isSaving} className="flex-1">
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save CashApp'
                        )}
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Payout History</CardTitle>
              <CardDescription>
                View all benefit payouts you've received
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingHistory ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : payouts.length > 0 ? (
                <div className="space-y-3">
                  {payouts.map((payout) => (
                    <div key={payout.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-lg">${payout.amount.toFixed(2)}</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(payout.created_date), 'MMMM d, yyyy')}
                          </p>
                          {payout.paid_at && (
                            <p className="text-xs text-gray-500">
                              Disbursed: {format(new Date(payout.paid_at), 'MMM d, yyyy')}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className={statusColors[payout.status] || ''}>
                          {payout.status}
                        </Badge>
                      </div>
                      {payout.status === 'Failed' && payout.failure_reason && (
                        <Alert className="mt-3 bg-red-50 border-red-200">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800 text-sm">
                            {payout.failure_reason}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p>No payouts yet</p>
                  <p className="text-sm mt-1">Your payout history will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}