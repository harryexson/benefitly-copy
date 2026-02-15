import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Zap, CheckCircle, Wallet, CreditCard, Gift, Globe } from 'lucide-react';

export default function TremendousPayoutGuide({ associationAccount }) {
  const isTremendousEnabled = associationAccount?.tremendous_connected;

  if (!isTremendousEnabled) {
    return null;
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-purple-600" />
          Flexible Payout Options Available
        </CardTitle>
        <CardDescription>
          Your association uses Tremendous for benefit payouts - giving you multiple ways to receive your funds
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-white border-purple-200">
          <CheckCircle className="h-4 w-4 text-purple-600" />
          <AlertDescription>
            <strong className="text-purple-900">How it works:</strong>
            <p className="text-sm text-gray-700 mt-1">
              When your association approves a benefit payout, you'll receive an email with instructions to claim your funds through your preferred method.
            </p>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <h4 className="font-semibold text-sm text-gray-900">Available Payment Methods:</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-purple-200">
              <Wallet className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Bank Transfer (ACH)</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-purple-200">
              <CreditCard className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">PayPal</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-purple-200">
              <CreditCard className="h-4 w-4 text-blue-400" />
              <span className="text-sm font-medium">Venmo</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-purple-200">
              <Gift className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Prepaid Card</span>
            </div>
            <div className="flex items-center gap-2 p-3 bg-white rounded-lg border border-purple-200 col-span-2">
              <Globe className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium">Gift Cards (Amazon, Visa, etc.)</span>
            </div>
          </div>
        </div>

        <div className="p-3 bg-purple-100 border border-purple-300 rounded-lg">
          <p className="text-xs text-purple-900">
            💡 <strong>Pro Tip:</strong> You can choose your preferred payment method when you receive each payout notification.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}