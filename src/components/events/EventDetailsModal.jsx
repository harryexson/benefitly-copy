import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, DollarSign, CreditCard, Users, Clock, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Member } from '@/entities/all';
import PaymentMethodSelector from '../payment/PaymentMethodSelector';

export default function EventDetailsModal({ event, isOpen, onClose, onPaymentInitiated }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMethodSelector, setShowMethodSelector] = useState(false);
  const [currentMember, setCurrentMember] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [loadingMember, setLoadingMember] = useState(false);

  useEffect(() => {
    const loadMemberData = async () => {
      if (!isOpen || !event) return;
      
      try {
        setLoadingMember(true);
        const user = await base44.auth.me();
        setCurrentUser(user);
        const members = await Member.filter({ email: user.email });
        if (members.length > 0) {
          setCurrentMember(members[0]);
        }
      } catch (error) {
        console.error('Failed to load member data:', error);
      } finally {
        setLoadingMember(false);
      }
    };

    loadMemberData();
  }, [isOpen, event]);

  if (!event) return null;

  const handlePayNow = async () => {
    // Check if member has saved payment methods
    const hasSavedMethods = currentMember?.stripe_payment_method_id || currentMember?.stripe_bank_account_id;
    
    if (hasSavedMethods && !event.is_paid_event) {
      // Show payment method selector for contributions
      setShowMethodSelector(true);
    } else {
      // Go directly to Stripe checkout for new card or ticket purchases
      processPayment('new_card');
    }
  };

  const processPayment = async (paymentMethod) => {
    try {
      setIsProcessing(true);
      toast.loading('Processing payment...');
      
      let response;
      
      if (event.is_paid_event && event.ticket_price > 0) {
        // For ticket purchases - always use new card checkout
        response = await base44.functions.invoke('createEventTicketCheckout', {
          event_id: event.id
        });
      } else if (event.userContribution) {
        // For contributions - use selected payment method
        if (paymentMethod === 'saved_card' || paymentMethod === 'saved_bank') {
          // Process with saved method
          response = await base44.functions.invoke('createContributionCheckoutWithMethod', {
            contribution_id: event.userContribution.id,
            payment_method: paymentMethod
          });
        } else {
          // Process with new card via checkout
          response = await base44.functions.invoke('createContributionCheckout', {
            contribution_id: event.userContribution.id
          });
        }
      }
      
      toast.dismiss();
      
      if (response?.data?.success) {
        // Payment completed with saved method
        toast.success(response.data.message || 'Payment completed successfully!');
        if (onPaymentInitiated) onPaymentInitiated();
        setTimeout(() => {
          onClose();
          window.location.reload();
        }, 1500);
      } else if (response?.data?.checkoutUrl) {
        // Redirect to Stripe checkout for new card
        if (onPaymentInitiated) onPaymentInitiated();
        window.location.href = response.data.checkoutUrl;
      } else if (response?.data?.error) {
        const errorMsg = response.data.error;
        console.error('Payment error from backend:', response.data);
        
        // Check if it's a Stripe account setup issue
        if (errorMsg.includes('not connected') || errorMsg.includes('payment setup') || errorMsg.includes('Stripe account')) {
          toast.error(
            <div className="space-y-2">
              <div className="font-semibold">⚠️ Payment Setup Required</div>
              <div className="text-sm">{errorMsg}</div>
              <button
                onClick={() => {
                  window.location.href = '/Settings';
                }}
                className="text-blue-600 underline text-sm font-medium mt-2"
              >
                Go to Settings to Connect Stripe →
              </button>
            </div>,
            { duration: 10000 }
          );
        } else {
          toast.error(errorMsg, { duration: 6000 });
        }
        setIsProcessing(false);
        setShowMethodSelector(false);
      } else {
        console.error('Unexpected response format:', response);
        toast.error('Failed to process payment');
        setIsProcessing(false);
        setShowMethodSelector(false);
      }
    } catch (error) {
    console.error('=== FRONTEND PAYMENT ERROR ===');
    console.error('Full error object:', JSON.stringify(error, null, 2));
    console.error('Error.response:', JSON.stringify(error?.response, null, 2));
    console.error('Error.response.data:', JSON.stringify(error?.response?.data, null, 2));
    console.error('Error.data:', JSON.stringify(error?.data, null, 2));
    console.error('Error.message:', error?.message);
    console.error('Error.status:', error?.response?.status);
    console.error('Request ID:', error?.response?.data?.requestId || error?.data?.requestId);
    console.error('=== END FRONTEND ERROR ===');

    toast.dismiss();

    let errorMessage = 'Failed to process payment';
    let errorDetails = '';
    let errorType = '';

    // Extract detailed error information
    if (error?.response?.data?.error) {
      errorMessage = error.response.data.error;
      errorDetails = error.response.data.details || '';
      errorType = error.response.data.type || '';
    } else if (error?.data?.error) {
      errorMessage = error.data.error;
      errorDetails = error.data.details || '';
      errorType = error.data.type || '';
    } else if (error?.message) {
      errorMessage = error.message;
    }

    console.error('Parsed error:', { errorMessage, errorDetails, errorType, status: error?.response?.status });

    // Check if it's a Stripe setup issue
    if (errorMessage.includes('not connected') || errorMessage.includes('payment setup') || errorMessage.includes('Payment processing is not set up')) {
      const isAdmin = currentUser?.association_role === 'Administrator';
      
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold">⚠️ Payment Setup Required</div>
          <div className="text-sm">
            {isAdmin 
              ? 'Your association needs to connect a Stripe account to accept payments.' 
              : 'Your organization has not set up payment processing yet. Please contact your administrator.'}
          </div>
          {errorDetails && <div className="text-xs text-gray-600 mt-1">{errorDetails}</div>}
          {isAdmin && (
            <button
              onClick={() => {
                window.location.href = '/Settings';
              }}
              className="text-blue-600 underline text-sm font-medium mt-2 block"
            >
              Go to Settings to Connect Stripe →
            </button>
          )}
        </div>,
        { duration: 10000 }
      );
    } else if (errorMessage.includes('not available') || errorMessage.includes('not found') || errorMessage.includes('no longer valid')) {
      // If it's a saved payment method error, suggest using new card
      toast.error(
        <div className="space-y-2">
          <div className="font-semibold">Payment Method Issue</div>
          <div className="text-sm">{errorMessage}</div>
          <button
            onClick={() => {
              setShowMethodSelector(false);
              setTimeout(() => processPayment('new_card'), 100);
            }}
            className="text-blue-600 underline text-sm font-medium mt-2 block"
          >
            Try with New Card →
          </button>
        </div>,
        { 
          duration: 10000
        }
      );
    } else {
      toast.error(
        <div className="space-y-1">
          <div className="font-semibold">Payment Failed</div>
          <div className="text-sm">{errorMessage}</div>
          {errorDetails && <div className="text-xs text-gray-600">{errorDetails}</div>}
        </div>, 
        { duration: 8000 }
      );
    }

    setIsProcessing(false);
    setShowMethodSelector(false);
    }
  };

  const needsPayment = event.requiresPayment || 
    (event.is_paid_event && event.ticket_price > 0 && event.userContribution?.status !== 'Paid');

  const isContributionEvent = event.isContributionEvent;
  const paymentAmount = event.userContribution?.amount_due || event.ticket_price || 0;

  if (showMethodSelector && currentMember) {
    return (
      <Dialog open={isOpen} onOpenChange={() => {
        setShowMethodSelector(false);
        onClose();
      }}>
        <DialogContent className="max-w-lg">
          <PaymentMethodSelector
            member={currentMember}
            amount={event.userContribution?.amount_due || 0}
            onSelectMethod={(method) => processPayment(method)}
            onAddNewMethod={() => {
              setShowMethodSelector(false);
              toast.info('Redirecting to profile to add payment method...');
              setTimeout(() => window.location.href = '/Profile#payment-methods', 1000);
            }}
          />
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-gray-900">
            {event.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 pt-4">
          {/* Event Type Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={isContributionEvent 
              ? "bg-red-100 text-red-800 border-red-300 text-sm px-4 py-1" 
              : "bg-blue-100 text-blue-800 border-blue-300 text-sm px-4 py-1"}>
              {event.type}
            </Badge>
            <Badge variant="outline" className="text-sm">
              {event.status}
            </Badge>
            {event.userContribution?.status === 'Paid' && (
              <Badge className="bg-green-100 text-green-800 text-sm">
                ✓ Paid
              </Badge>
            )}
          </div>

          {/* Event Details */}
          <div className="space-y-4 bg-gray-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-gray-600 mt-0.5" />
              <div>
                <p className="font-semibold text-gray-700">Date & Time</p>
                <p className="text-gray-900">
                  {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
                  {event.event_time && ` at ${event.event_time}`}
                </p>
                {event.event_end_time && (
                  <p className="text-sm text-gray-600">Until {event.event_end_time}</p>
                )}
              </div>
            </div>

            {event.venue && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-700">Location</p>
                  <p className="text-gray-900">{event.venue}</p>
                  {event.venue_details && (
                    <p className="text-sm text-gray-600 mt-1">{event.venue_details}</p>
                  )}
                </div>
              </div>
            )}

            {event.description && (
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-gray-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-700">Description</p>
                  <p className="text-gray-900">{event.description}</p>
                </div>
              </div>
            )}

            {event.publicity_blurb && (
              <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                <p className="text-sm text-blue-900">{event.publicity_blurb}</p>
              </div>
            )}
          </div>

          {/* Payment Information */}
          {needsPayment && (
            <div className={`p-5 rounded-lg border-2 ${
              isContributionEvent 
                ? 'bg-gradient-to-br from-red-50 to-orange-50 border-red-300' 
                : 'bg-gradient-to-br from-green-50 to-blue-50 border-green-300'
            }`}>
              <div className="flex items-center gap-2 mb-3">
                <DollarSign className={`h-6 w-6 ${isContributionEvent ? 'text-red-600' : 'text-green-600'}`} />
                <h3 className="text-lg font-bold text-gray-900">
                  {isContributionEvent ? 'Contribution Required' : 'Payment Required'}
                </h3>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-700 font-semibold">Amount:</span>
                  <span className="text-2xl font-black text-gray-900">
                    ${paymentAmount.toFixed(2)}
                  </span>
                </div>

                {event.userContribution?.due_date && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Due Date:</span>
                    <span className="font-semibold text-gray-900">
                      {format(new Date(event.userContribution.due_date), 'MMMM d, yyyy')}
                    </span>
                  </div>
                )}

                {event.userContribution?.status && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-600">Status:</span>
                    <Badge className={
                      event.userContribution.status === 'Past Due' 
                        ? 'bg-red-600 text-white' 
                        : event.userContribution.status === 'Due'
                        ? 'bg-orange-500 text-white'
                        : 'bg-gray-500 text-white'
                    }>
                      {event.userContribution.status}
                    </Badge>
                  </div>
                )}

                {isContributionEvent && (
                  <div className="mt-3 p-3 bg-white rounded border border-red-200">
                    <p className="text-sm text-gray-700">
                      This contribution helps support a fellow member in their time of need. 
                      Your timely payment ensures we can provide assistance when it matters most.
                    </p>
                  </div>
                )}

                {event.is_paid_event && event.tickets_available > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    <span>{event.tickets_available - (event.tickets_sold || 0)} tickets remaining</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Paid Status */}
          {event.userContribution?.status === 'Paid' && (
            <div className="p-5 bg-green-50 rounded-lg border-2 border-green-300">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-green-500 flex items-center justify-center">
                  <span className="text-white text-xl">✓</span>
                </div>
                <h3 className="text-lg font-bold text-green-900">Payment Completed</h3>
              </div>
              <p className="text-sm text-green-800">
                You paid ${event.userContribution.amount_paid.toFixed(2)} on{' '}
                {format(new Date(event.userContribution.paid_at), 'MMMM d, yyyy')}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1"
            >
              Close
            </Button>
            {needsPayment && event.userContribution?.status !== 'Paid' && (
              <Button 
                onClick={handlePayNow}
                disabled={isProcessing}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-5 w-5" />
                    Pay Now - ${paymentAmount.toFixed(2)}
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}