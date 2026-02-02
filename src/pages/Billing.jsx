import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { AssociationAccount, SubscriptionTier } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, CheckCircle, Loader2, Check, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';

export default function Billing() {
  const [account, setAccount] = useState(null);
  const [tier, setTier] = useState(null);
  const [allTiers, setAllTiers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTierId, setSelectedTierId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const abortController = new AbortController();
    const signal = abortController.signal;

    const loadBillingData = async () => {
      setIsLoading(true);
      try {
        // Load tiers first - always needed
        const tierList = await SubscriptionTier.list();
        const activeTiers = tierList.filter(t => t.is_active);
        const sortedTiers = activeTiers.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
        setAllTiers(sortedTiers);

        const currentUser = await User.me();
        if (!currentUser || !currentUser.association_account_id) {
          // User exists but no association account - show tiers anyway
          setIsLoading(false);
          return;
        }

        const accountList = await AssociationAccount.list();
        const userAccount = accountList.find(a => a.id === currentUser.association_account_id);
        const userTier = userAccount ? tierList.find(t => t.id === userAccount.subscription_tier_id) : null;
        
        setAccount(userAccount);
        setTier(userTier);

      } catch (error) {
        if (error.name === 'CanceledError' || (error.message && error.message.includes('aborted'))) {
          console.log('Data fetch for Billing page aborted.');
        } else {
          console.error("Billing load error:", error);
          toast.error("Failed to load billing information.");
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadBillingData();

    return () => {
      abortController.abort();
    };
  }, [navigate]);

  const isOverdue = account && account.next_billing_date && new Date(account.next_billing_date) < new Date();
  const overdueAmount = isOverdue ? (account.billing_cycle === 'monthly' ? tier?.monthly_price : tier?.yearly_price) : 0;
  
  // Check if trial has expired
  const isTrialExpired = account && 
    account.account_status === 'trial' && 
    account.trial_end_date && 
    new Date(account.trial_end_date) < new Date();

  const handleSelectPlan = async (selectedTier, billingCycle = 'monthly') => {
    if (!selectedTier) return;
    setIsProcessing(true);
    setSelectedTierId(selectedTier.id);
    
    try {
      // If no account exists, we need to handle this differently
      if (!account) {
        toast.error('Please complete your account setup first');
        navigate(createPageUrl('Dashboard'));
        return;
      }

      // Update the association account with the selected tier
      const nextBillingDate = new Date();
      if (billingCycle === 'monthly') {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      } else {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      }

      await AssociationAccount.update(account.id, {
        subscription_tier_id: selectedTier.id,
        billing_cycle: billingCycle,
        account_status: 'active',
        next_billing_date: nextBillingDate.toISOString().split('T')[0],
        trial_end_date: null // Clear trial end date
      });
      
      toast.success(`Successfully subscribed to ${selectedTier.name} plan!`);
      
      // Redirect to dashboard after subscription
      setTimeout(() => {
        navigate(createPageUrl('Dashboard'));
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      toast.error('Failed to update subscription. Please try again.');
      console.error(error);
      setIsProcessing(false);
      setSelectedTierId(null);
    }
  };

  const handleMakePayment = async () => {
    if (!account) return;
    setIsProcessing(true);
    
    try {
      const nextBillingDate = new Date();
      if (account.billing_cycle === 'monthly') {
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);
      } else {
        nextBillingDate.setFullYear(nextBillingDate.getFullYear() + 1);
      }

      const updatePayload = {
        ...account,
        account_status: 'active',
        suspension_reason: null,
        suspension_notes: null,
        suspended_at: null,
        next_billing_date: nextBillingDate.toISOString().split('T')[0],
      };
      
      await AssociationAccount.update(account.id, updatePayload);
      
      toast.success('Payment successful! Your account has been reactivated.');
      
      // Simulate redirection after successful payment
      setTimeout(() => {
          navigate(createPageUrl('Dashboard'));
          window.location.reload();
      }, 2000);
      
    } catch(error) {
      toast.error('Payment failed. Please try again or contact support.');
      console.error(error);
      setIsProcessing(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!account) {
    return (
      <div className="space-y-6">
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-800">Account Setup Required</AlertTitle>
          <AlertDescription className="text-yellow-700">
            We couldn't find your association account. Please try refreshing the page or contact support if the issue persists.
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Subscription Plan</CardTitle>
            <CardDescription>Select a plan to get started</CardDescription>
          </CardHeader>
          <CardContent>
            {!allTiers || allTiers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Loading subscription plans...</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allTiers.map((planTier) => (
                  <Card key={planTier.id} className={`relative ${planTier.name === 'Growth' ? 'border-2 border-blue-500 shadow-lg' : ''}`}>
                    {planTier.name === 'Growth' && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        POPULAR
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle>{planTier.name}</CardTitle>
                      <CardDescription>{planTier.tagline || `Up to ${planTier.member_limit} members`}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <span className="text-3xl font-bold">${planTier.monthly_price}</span>
                        <span className="text-gray-500">/month</span>
                        {planTier.yearly_price && (
                          <p className="text-sm text-green-600">
                            or ${planTier.yearly_price}/year (save {Math.round((1 - planTier.yearly_price / (planTier.monthly_price * 12)) * 100)}%)
                          </p>
                        )}
                      </div>
                      
                      <ul className="space-y-2 text-sm">
                        {planTier.features?.slice(0, 5).map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <Button className="w-full" disabled>
                        Contact Support
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show subscription selection when trial expired or no tier selected
  if (!tier || isTrialExpired) {
    return (
      <div className="space-y-6">
        {isTrialExpired && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertTitle className="text-orange-800">Your Trial Has Ended</AlertTitle>
            <AlertDescription className="text-orange-700">
              Your 14-day free trial has expired. Choose a subscription plan below to continue using Benefitly. 
              <strong> All your data has been preserved!</strong>
            </AlertDescription>
          </Alert>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Choose Your Subscription Plan</CardTitle>
            <CardDescription>
              {account?.organization_name ? `Select a plan for ${account.organization_name}` : 'Select a plan to continue'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {allTiers.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">No subscription plans available. Please contact support.</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allTiers.map((planTier) => (
                  <Card key={planTier.id} className={`relative ${planTier.name === 'Growth' ? 'border-2 border-blue-500 shadow-lg' : ''}`}>
                    {planTier.name === 'Growth' && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                        POPULAR
                      </div>
                    )}
                    <CardHeader>
                      <CardTitle>{planTier.name}</CardTitle>
                      <CardDescription>{planTier.tagline || `Up to ${planTier.member_limit} members`}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <span className="text-3xl font-bold">${planTier.monthly_price}</span>
                        <span className="text-gray-500">/month</span>
                        {planTier.yearly_price && (
                          <p className="text-sm text-green-600">
                            or ${planTier.yearly_price}/year (save {Math.round((1 - planTier.yearly_price / (planTier.monthly_price * 12)) * 100)}%)
                          </p>
                        )}
                      </div>
                      
                      <ul className="space-y-2 text-sm">
                        {planTier.features?.slice(0, 5).map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <div className="space-y-2 pt-4">
                        <Button 
                          className="w-full" 
                          onClick={() => handleSelectPlan(planTier, 'monthly')}
                          disabled={isProcessing}
                        >
                          {isProcessing && selectedTierId === planTier.id ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Processing...
                            </>
                          ) : (
                            `Choose ${planTier.name}`
                          )}
                        </Button>
                        {planTier.yearly_price && (
                          <Button 
                            variant="outline" 
                            className="w-full" 
                            onClick={() => handleSelectPlan(planTier, 'yearly')}
                            disabled={isProcessing}
                          >
                            Pay Yearly & Save
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isOverdue && account.account_status === 'suspended' && (
        <Alert variant="destructive">
          <CreditCard className="h-4 w-4" />
          <AlertTitle>Account Suspended Due to Non-Payment</AlertTitle>
          <AlertDescription>
            Your account is currently suspended. Please make a payment of <strong>${overdueAmount.toFixed(2)}</strong> to reactivate your account and restore access.
          </AlertDescription>
        </Alert>
      )}

      {isOverdue && account.account_status !== 'suspended' && (
        <Alert variant="destructive">
          <CreditCard className="h-4 w-4" />
          <AlertTitle>Payment Overdue</AlertTitle>
          <AlertDescription>
            Your payment is past due. Please make a payment to avoid account suspension.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Billing & Subscriptions</CardTitle>
          <CardDescription>Manage your billing information and subscription plans.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="p-6 border rounded-lg grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <h4 className="font-medium text-gray-500">Current Plan</h4>
              <p className="text-xl font-bold">{tier.name}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-500">Billing Cycle</h4>
              <p className="text-xl font-bold capitalize">{account.billing_cycle}</p>
            </div>
            <div>
              <h4 className="font-medium text-gray-500">Next Billing Date</h4>
              <p className={`text-xl font-bold ${isOverdue ? 'text-red-600' : ''}`}>
                {format(new Date(account.next_billing_date), 'MMM d, yyyy')}
              </p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Make a Payment</CardTitle>
            </CardHeader>
            <CardContent>
              {isOverdue ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
                    <span className="font-medium text-red-800">Amount Due:</span>
                    <span className="text-2xl font-bold text-red-800">${overdueAmount.toFixed(2)}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    Click the button below to process your payment. This is a simulation. In a real application, this would integrate with a payment processor like Stripe.
                  </p>
                  <Button 
                    onClick={handleMakePayment} 
                    disabled={isProcessing} 
                    className="w-full" 
                    size="lg"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <CreditCard className="mr-2 h-4 w-4" />
                        Pay ${overdueAmount.toFixed(2)} Now
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-green-700 bg-green-50 rounded-lg">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                  <h3 className="mt-2 text-lg font-medium">You are all caught up!</h3>
                  <p className="mt-1 text-sm">
                    No payment is due at this time.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}