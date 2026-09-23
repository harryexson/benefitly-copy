import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { EventContribution, Event } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe('pk_test_51QoGwM03LWAzLF0qgw2eOe79iwPOxQqzj3Y3hQMzIUAw0s3Gj0W9pYOzaEbQvPl1MZ8ZfB8q7Z0bC7qzGBGJvE9U00vxH4Hxmt');

export default function Payment() {
  const [contribution, setContribution] = useState(null);
  const [event, setEvent] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const fetchContributionData = async () => {
      const params = new URLSearchParams(location.search);
      const contributionId = params.get('contribution_id');
      
      if (!contributionId) {
        toast.error("No contribution specified.");
        navigate(createPageUrl('Profile'));
        return;
      }

      try {
        const contrib = await EventContribution.get(contributionId);
        if (!contrib) {
          toast.error("Contribution not found.");
          navigate(createPageUrl('Profile'));
          return;
        }
        setContribution(contrib);
        
        const eventData = await Event.get(contrib.event_id);
        setEvent(eventData);

      } catch (error) {
        toast.error("Failed to load payment details.");
        console.error(error);
        navigate(createPageUrl('Profile'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchContributionData();
  }, [location.search, navigate]);

  const handlePayNow = async () => {
    setIsProcessing(true);
    
    try {
      // Create Stripe checkout session
      const response = await base44.functions.invoke('createContributionCheckout', {
        contribution_id: contribution.id,
        amount: contribution.amount_due
      });

      if (response.data.url) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.url;
      } else {
        throw new Error(response.data.error || 'Failed to create checkout session');
      }

    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.error || error.message || 'Failed to start payment. Please try again.');
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-md mx-auto">
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!contribution || !event) {
    return null;
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Complete Your Contribution</CardTitle>
          <CardDescription>
            You are paying for: <strong>{event.title}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <div className="flex justify-between items-center">
              <span className="text-lg font-medium text-gray-700">Amount Due:</span>
              <span className="text-3xl font-bold text-blue-600">
                ${contribution.amount_due.toFixed(2)}
              </span>
            </div>
            {contribution.due_date && (
              <p className="text-sm text-gray-600 mt-2">
                Due: {new Date(contribution.due_date).toLocaleDateString()}
              </p>
            )}
          </div>

          <Alert className="bg-green-50 border-green-200">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Secure Payment:</strong> You'll be redirected to Stripe's secure checkout to complete your payment using credit card or bank account.
            </AlertDescription>
          </Alert>

          <Button 
            onClick={handlePayNow}
            className="w-full" 
            size="lg" 
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Redirecting to Payment...
              </>
            ) : (
              `Pay $${contribution.amount_due.toFixed(2)} Now`
            )}
          </Button>

          <p className="text-xs text-center text-gray-500">
            Powered by Stripe • Your payment information is secure and encrypted
          </p>
        </CardContent>
      </Card>
    </div>
  );
}