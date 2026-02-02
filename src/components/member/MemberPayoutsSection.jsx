import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DollarSign,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  CreditCard,
  Landmark,
} from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function MemberPayoutsSection({
  member,
  payouts,
  onPayoutRequested,
}) {
  const [loading, setLoading] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [stripeBalance, setStripeBalance] = useState(0);
  const [selectedMethod, setSelectedMethod] = useState('standard');

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const response = await base44.functions.invoke('getMemberStripeBalance', {
          member_id: member.id,
        });
        if (response.data.balance !== undefined) {
          setStripeBalance(response.data.balance / 100);
        }
      } catch (error) {
        console.error('Failed to fetch Stripe balance:', error);
        toast.error('Could not load available balance');
      }
    };

    if (member?.id) {
      fetchBalance();
    }
  }, [member?.id]);

  const handleRequestPayout = async () => {
    if (stripeBalance <= 0) {
      toast.error('No available balance to request payout');
      return;
    }

    if (!member.payout_method || member.payout_method === 'Not Set') {
      toast.error('Please set up a payout method in your profile first');
      return;
    }

    setLoading(true);
    try {
      const response = await base44.functions.invoke('requestMemberPayout', {
        member_id: member.id,
        amount: Math.round(stripeBalance * 100),
        payout_method: selectedMethod,
      });

      if (response.data.success) {
        toast.success('Payout request submitted');
        setRequestDialogOpen(false);
        onPayoutRequested();
      } else {
        toast.error(response.data.error || 'Failed to request payout');
      }
    } catch (error) {
      console.error('Payout request error:', error);
      toast.error(error.message || 'Failed to request payout');
    } finally {
      setLoading(false);
    }
  };

  const recentPayouts = payouts
    .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
    .slice(0, 5);

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Disbursed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'Processing':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      case 'Failed':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'Pending Approval':
        return <Clock className="w-5 h-5 text-orange-500" />;
      default:
        return <DollarSign className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Disbursed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Processing':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Failed':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'Pending Approval':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const isPayoutMethodSet = member.payout_method && member.payout_method !== 'Not Set';

  return (
    <div className="space-y-6">
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-6 w-6 text-green-600" />
            Available Balance
          </CardTitle>
          <CardDescription>Funds available for payout</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-5xl font-bold text-green-700">
            ${stripeBalance.toFixed(2)}
          </div>

          {!isPayoutMethodSet && (
            <Alert className="bg-orange-50 border-orange-300">
              <AlertCircle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Set up a payout method</strong> in your profile to request payouts
              </AlertDescription>
            </Alert>
          )}

          <Button
            onClick={() => setRequestDialogOpen(true)}
            disabled={loading || stripeBalance <= 0 || !isPayoutMethodSet}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-6 rounded-lg shadow-lg disabled:opacity-50"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <CreditCard className="mr-2 h-5 w-5" />
                Request Payout
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {isPayoutMethodSet && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Landmark className="h-4 w-4" />
              Your Payout Method
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">{member.payout_method}</p>
                {member.bank_account_last4 && (
                  <p className="font-semibold">****{member.bank_account_last4}</p>
                )}
                {member.saved_card_last4 && (
                  <p className="font-semibold">Card ending in {member.saved_card_last4}</p>
                )}
              </div>
              <Badge variant="outline" className="bg-green-100 text-green-800">
                Set up
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            Payout History
          </CardTitle>
          <CardDescription>Recent payouts and their status</CardDescription>
        </CardHeader>
        <CardContent>
          {recentPayouts.length > 0 ? (
            <div className="space-y-3">
              {recentPayouts.map((payout) => (
                <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(payout.status)}
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">
                        ${payout.amount.toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(payout.created_date), 'MMM d, yyyy')}
                      </div>
                      {payout.estimated_arrival && (
                        <div className="text-xs text-gray-500 mt-1">
                          Expected: {format(new Date(payout.estimated_arrival), 'MMM d')}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    <Badge className={`border ${getStatusColor(payout.status)}`}>
                      {payout.status}
                    </Badge>
                    {payout.stripe_payout_id && (
                      <span className="text-xs text-gray-400 font-mono">
                        {payout.stripe_payout_id.slice(-8)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No payouts yet</p>
              <p className="text-sm text-gray-500 mt-1">
                When you receive benefits, they will appear here
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Payout</DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <p className="text-sm text-gray-600 mb-1">Amount to request</p>
              <p className="text-3xl font-bold text-green-700">
                ${stripeBalance.toFixed(2)}
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold text-gray-900">Choose payout speed</p>

              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50"
                style={{
                  borderColor: selectedMethod === 'instant' ? '#3b82f6' : '#e5e7eb',
                  backgroundColor: selectedMethod === 'instant' ? '#eff6ff' : 'transparent',
                }}>
                <input
                  type="radio"
                  name="payout_method"
                  value="instant"
                  checked={selectedMethod === 'instant'}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <Zap className="h-4 w-4 text-orange-500" />
                    Instant Payout
                  </p>
                  <p className="text-sm text-gray-600">
                    Debit card or Instant Bank Payment - within 30 minutes
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all hover:bg-blue-50"
                style={{
                  borderColor: selectedMethod === 'standard' ? '#3b82f6' : '#e5e7eb',
                  backgroundColor: selectedMethod === 'standard' ? '#eff6ff' : 'transparent',
                }}>
                <input
                  type="radio"
                  name="payout_method"
                  value="standard"
                  checked={selectedMethod === 'standard'}
                  onChange={(e) => setSelectedMethod(e.target.value)}
                  className="w-5 h-5"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 flex items-center gap-2">
                    <Landmark className="h-4 w-4 text-blue-500" />
                    Standard Payout
                  </p>
                  <p className="text-sm text-gray-600">
                    Bank account - 1 to 2 business days
                  </p>
                </div>
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setRequestDialogOpen(false)}
                disabled={loading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRequestPayout}
                disabled={loading}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Requesting...
                  </>
                ) : (
                  <>
                    <ArrowRight className="mr-2 h-4 w-4" />
                    Confirm Payout
                  </>
                )}
              </Button>
            </div>

            <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
              <p className="text-xs text-blue-800">
                Instant payouts to debit cards are fastest. Standard payouts to bank accounts are more reliable for larger amounts.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}