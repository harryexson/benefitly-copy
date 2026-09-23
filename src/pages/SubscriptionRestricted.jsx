import React, { useState, useEffect } from 'react';
import { User, AssociationAccount } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Mail, Phone, LogOut, Building2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Skeleton } from '@/components/ui/skeleton';

export default function SubscriptionRestricted() {
  const [isLoading, setIsLoading] = useState(true);
  const [account, setAccount] = useState(null);
  const [statusMessage, setStatusMessage] = useState({ title: '', description: '' });

  useEffect(() => {
    const loadData = async () => {
      try {
        const currentUser = await User.me();
        if (currentUser?.association_account_id) {
          const accounts = await AssociationAccount.list();
          const userAccount = accounts.find(a => a.id === currentUser.association_account_id);
          setAccount(userAccount);

          // Determine the status message
          if (userAccount) {
            const isTrialExpired = userAccount.account_status === 'trial' && 
              userAccount.trial_end_date && 
              new Date(userAccount.trial_end_date) < new Date();

            if (isTrialExpired) {
              setStatusMessage({
                title: 'Trial Period Expired',
                description: 'Your organization\'s free trial has ended. Please contact your administrator to subscribe to a plan.'
              });
            } else if (userAccount.account_status === 'suspended') {
              setStatusMessage({
                title: 'Account Suspended',
                description: userAccount.suspension_reason === 'Non-payment / Overdue Account' 
                  ? 'Your organization\'s account has been suspended due to payment issues. Please contact your administrator.'
                  : 'Your organization\'s account has been suspended. Please contact your administrator for more information.'
              });
            } else if (userAccount.account_status === 'cancelled') {
              setStatusMessage({
                title: 'Subscription Cancelled',
                description: 'Your organization\'s subscription has been cancelled. Please contact your administrator.'
              });
            } else {
              setStatusMessage({
                title: 'Subscription Required',
                description: 'Your organization needs an active subscription to access this platform. Please contact your administrator.'
              });
            }
          }
        }
      } catch (error) {
        console.error('Failed to load account data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
    } catch (error) {
      console.error('Logout failed:', error);
      window.location.href = '/';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
        <Skeleton className="h-96 w-full max-w-lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
      <Card className="w-full max-w-lg shadow-xl">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-orange-100 flex items-center justify-center">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
          <CardTitle className="text-2xl text-gray-900">
            {statusMessage.title}
          </CardTitle>
          <CardDescription className="text-base mt-2">
            {statusMessage.description}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {account && (
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Building2 className="h-5 w-5 text-gray-500" />
                <span className="font-medium text-gray-900">{account.organization_name}</span>
              </div>
              <p className="text-sm text-gray-600">
                Your organization's administrators have been notified about this issue. 
                If you need immediate assistance, please reach out using the contact information below.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="font-medium text-gray-900">Contact Your Administrator</h4>
            {account?.contact_email && (
              <div className="flex items-center gap-3 text-sm">
                <Mail className="h-4 w-4 text-gray-400" />
                <a href={`mailto:${account.contact_email}`} className="text-blue-600 hover:underline">
                  {account.contact_email}
                </a>
              </div>
            )}
            {account?.contact_phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="h-4 w-4 text-gray-400" />
                <a href={`tel:${account.contact_phone}`} className="text-blue-600 hover:underline">
                  {account.contact_phone}
                </a>
              </div>
            )}
          </div>

          {account?.account_status === 'suspended' && account?.suspension_reason === 'Non-payment / Overdue Account' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <p className="text-sm text-blue-900 font-medium mb-2">
                Administrator Access Available
              </p>
              <p className="text-xs text-blue-700">
                If you are an administrator, you can resolve this by updating your payment information through the Billing page.
              </p>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-xs text-gray-500 text-center mb-4">
              If you believe this is an error, please contact Benefitly support at support@benefitly.com
            </p>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}