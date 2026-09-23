import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { base44 } from '@/api/base44Client';
import { AssociationAccount, Member } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Loader2, 
  CheckCircle, 
  AlertCircle, 
  CreditCard, 
  Building2, 
  Send,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner';

// Stripe publishable key (test mode)
const stripePromise = loadStripe('pk_test_51QoGwM03LWAzLF0qgw2eOe79iwPOxQqzj3Y3hQMzIUAw0s3Gj0W9pYOzaEbQvPl1MZ8ZfB8q7Z0bC7qzGBGJvE9U00vxH4Hxmt');

// Payment Form Component
function MemberPaymentForm() {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!stripe || !elements) {
      toast.error('Payment form is not ready yet');
      return;
    }

    setLoading(true);
    try {
      const { error: submitError } = await elements.submit();
      if (submitError) {
        toast.error(submitError.message);
        setLoading(false);
        return;
      }

      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/Dashboard',
        },
      });

      if (error) {
        console.error('Stripe payment error:', error);
        toast.error(error.message || 'Payment failed');
      }
    } catch (error) {
      console.error('Payment submission error:', error);
      toast.error(error.message || 'Payment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <Button 
        type="submit"
        disabled={loading || !stripe || !elements}
        className="w-full"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          'Submit Contribution'
        )}
      </Button>
    </form>
  );
}

// Admin Onboarding Section
function AdminOnboarding({ user }) {
  const [loading, setLoading] = useState(false);
  const [account, setAccount] = useState(null);

  useEffect(() => {
    loadAccount();
  }, []);

  const loadAccount = async () => {
    try {
      const accounts = await AssociationAccount.list();
      const userAccount = accounts.find(a => a.id === user.association_account_id);
      setAccount(userAccount);
    } catch (error) {
      console.error('Failed to load account:', error);
    }
  };

  const startOnboarding = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('createStripeOnboardingLink');
      if (response.data.url) {
        window.location.href = response.data.url;
      } else {
        toast.error('Failed to create onboarding link');
        setLoading(false);
      }
    } catch (error) {
      toast.error('Failed to start onboarding');
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Association Onboarding
        </CardTitle>
        <CardDescription>
          Connect your bank account and verify your organization with Stripe
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {account?.stripe_account_id ? (
          <div className="space-y-3">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Connected:</strong> Your Stripe account is set up
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Account ID</p>
                <p className="font-mono text-sm">{account.stripe_account_id.slice(-12)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <Badge variant="outline" className="bg-green-100 text-green-800">
                  {account.stripe_payouts_enabled ? 'Active' : 'Pending'}
                </Badge>
              </div>
            </div>
          </div>
        ) : (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Complete Stripe onboarding to accept payments and send payouts
            </AlertDescription>
          </Alert>
        )}
        
        <Button 
          onClick={startOnboarding} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Redirecting...
            </>
          ) : (
            <>
              <Building2 className="mr-2 h-4 w-4" />
              {account?.stripe_account_id ? 'Manage Stripe Account' : 'Start Stripe Onboarding'}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// Member Payment Section
function MemberPaymentUI() {
  const [clientSecret, setClientSecret] = useState(null);
  const [amount, setAmount] = useState('50.00');
  const [loading, setLoading] = useState(false);

  const createPayment = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke('createMemberPaymentIntent', {
        amount: Math.round(parseFloat(amount) * 100)
      });
      
      if (response.data.clientSecret) {
        setClientSecret(response.data.clientSecret);
        toast.success('Payment form ready');
      } else {
        const errorMsg = response.data.error || 'Failed to create payment';
        console.error('Payment creation error:', response.data);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to initialize payment';
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const stripeOptions = React.useMemo(() => {
    if (!clientSecret) return null;
    return { 
      clientSecret,
      appearance: { theme: 'stripe' }
    };
  }, [clientSecret]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Make a Contribution
        </CardTitle>
        <CardDescription>
          Pay your contribution using credit card or bank account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!clientSecret ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="50.00"
              />
            </div>
            <Button 
              onClick={createPayment} 
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                'Continue to Payment'
              )}
            </Button>
          </div>
        ) : stripeOptions ? (
          <Elements stripe={stripePromise} options={stripeOptions}>
            <MemberPaymentForm />
          </Elements>
        ) : null}
      </CardContent>
    </Card>
  );
}

// Payout Approval Section
function PayoutApproval() {
  const [members, setMembers] = useState([]);
  const [selectedMember, setSelectedMember] = useState('');
  const [amount, setAmount] = useState('');
  const [speed, setSpeed] = useState('standard');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const memberList = await Member.list();
      setMembers(memberList.filter(m => m.status === 'Active'));
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  const submit = async () => {
    if (!selectedMember || !amount || parseFloat(amount) <= 0) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    setStatus('');
    try {
      const response = await base44.functions.invoke('processAdminPayout', {
        member_id: selectedMember,
        amount: parseFloat(amount),
        speed: speed
      });

      if (response.data.status === 'success') {
        setStatus('Payout submitted successfully');
        toast.success(response.data.message || 'Payout processed successfully!');
        setSelectedMember('');
        setAmount('');
      } else {
        const errorMsg = response.data.error || 'Payout failed';
        console.error('Payout error:', response.data);
        toast.error(errorMsg, { duration: 5000 });
      }
    } catch (error) {
      console.error('Payout request error:', error);
      // Extract detailed error message from response
      const errorData = error.response?.data;
      const errorMsg = errorData?.error || error.message || 'Failed to process payout';
      
      // Show more detailed error context
      if (errorData?.code || errorData?.type) {
        console.error('Error details:', { code: errorData.code, type: errorData.type });
      }
      
      toast.error(errorMsg, { duration: 6000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Approve Payout
        </CardTitle>
        <CardDescription>
          Send direct payouts to member bank accounts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="member">Select Member</Label>
          <Select value={selectedMember} onValueChange={setSelectedMember}>
            <SelectTrigger id="member">
              <SelectValue placeholder="Choose a member" />
            </SelectTrigger>
            <SelectContent>
              {members.map(member => (
                <SelectItem key={member.id} value={member.id}>
                  {member.first_name} {member.last_name} - {member.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="payout_amount">Amount ($)</Label>
          <Input
            id="payout_amount"
            type="number"
            step="0.01"
            min="1"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="100.00"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="speed">Payout Speed</Label>
          <Select value={speed} onValueChange={setSpeed}>
            <SelectTrigger id="speed">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard (1-2 days, free)</SelectItem>
              <SelectItem value="instant">Instant (30 min, fee applies)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button 
          onClick={submit} 
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <DollarSign className="mr-2 h-4 w-4" />
              Send Payout
            </>
          )}
        </Button>

        {status && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{status}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

// Main Dashboard
export default function StripeManagement({ user }) {
  const isAdmin = user?.association_role === 'Administrator';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Stripe Management</h1>
        <p className="text-gray-600 mt-1">
          Comprehensive Stripe integration for payments and payouts
        </p>
      </div>

      {isAdmin ? (
        <Tabs defaultValue="onboarding" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="onboarding">Account Setup</TabsTrigger>
            <TabsTrigger value="payment">Test Payment</TabsTrigger>
            <TabsTrigger value="payout">Quick Payout</TabsTrigger>
          </TabsList>

          <TabsContent value="onboarding" className="space-y-6">
            <AdminOnboarding user={user} />
          </TabsContent>

          <TabsContent value="payment" className="space-y-6">
            <MemberPaymentUI />
          </TabsContent>

          <TabsContent value="payout" className="space-y-6">
            <PayoutApproval />
          </TabsContent>
        </Tabs>
      ) : (
        <MemberPaymentUI />
      )}
    </div>
  );
}