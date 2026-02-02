import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2, ArrowRight } from 'lucide-react';
import { User, AssociationAccount } from '@/entities/all';

export default function SubscriptionSuccess() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [accountInfo, setAccountInfo] = useState(null);

  useEffect(() => {
    const verifySubscription = async () => {
      try {
        // Get session ID from URL
        const urlParams = new URLSearchParams(window.location.search);
        const sessionId = urlParams.get('session_id');

        // Load user and account info
        const currentUser = await User.me();
        if (currentUser?.association_account_id) {
          const accounts = await AssociationAccount.list();
          const account = accounts.find(a => a.id === currentUser.association_account_id);
          setAccountInfo(account);
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error verifying subscription:', error);
        setIsLoading(false);
      }
    };

    verifySubscription();
  }, []);

  const handleContinue = () => {
    navigate(createPageUrl('Dashboard'));
    window.location.reload();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <Card className="max-w-md w-full mx-4">
          <CardContent className="p-8 text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Confirming your subscription...</h2>
            <p className="text-gray-600">Please wait while we set up your account.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
      <Card className="max-w-lg w-full">
        <CardContent className="p-8 text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Subscription Activated!
          </h1>
          
          <p className="text-gray-600 mb-6">
            {accountInfo ? (
              <>Welcome to Benefitly, <strong>{accountInfo.organization_name}</strong>! Your subscription is now active.</>
            ) : (
              <>Your subscription has been successfully activated. Welcome to Benefitly!</>
            )}
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium mb-3">What's next?</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Complete your organization profile</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Add your first members</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Connect your Stripe account for payments</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                <span>Create your first event</span>
              </li>
            </ul>
          </div>

          <Button onClick={handleContinue} size="lg" className="w-full gap-2">
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>

          <p className="text-xs text-gray-500 mt-4">
            Need help getting started? Check out our onboarding guide or contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}