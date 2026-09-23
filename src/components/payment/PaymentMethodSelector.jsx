import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Landmark, CreditCard, Plus, ChevronRight } from 'lucide-react';

export default function PaymentMethodSelector({ 
  member, 
  amount, 
  onSelectMethod,
  onAddNewMethod 
}) {
  const [selectedMethod, setSelectedMethod] = useState('new_card');
  
  const hasSavedCard = member?.stripe_payment_method_id;
  const hasSavedBank = member?.stripe_bank_account_id;
  const hasAnyMethod = hasSavedCard || hasSavedBank;

  const handleContinue = () => {
    onSelectMethod(selectedMethod);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Choose Payment Method</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <RadioGroup value={selectedMethod} onValueChange={setSelectedMethod}>
          {/* Saved Card */}
          {hasSavedCard && (
            <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedMethod === 'saved_card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
              onClick={() => setSelectedMethod('saved_card')}
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="saved_card" id="saved_card" />
                <Label htmlFor="saved_card" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-5 w-5 text-gray-600" />
                      <div>
                        <div className="font-medium">
                          {member.saved_card_brand} •••• {member.saved_card_last4}
                        </div>
                        <div className="text-xs text-gray-500">Saved payment card</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                      Instant
                    </Badge>
                  </div>
                </Label>
              </div>
            </div>
          )}

          {/* Saved Bank Account */}
          {hasSavedBank && (
            <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
              selectedMethod === 'saved_bank' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
            }`}
              onClick={() => setSelectedMethod('saved_bank')}
            >
              <div className="flex items-center space-x-3">
                <RadioGroupItem value="saved_bank" id="saved_bank" />
                <Label htmlFor="saved_bank" className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Landmark className="h-5 w-5 text-gray-600" />
                      <div>
                        <div className="font-medium">
                          {member.bank_name} •••• {member.bank_account_last4}
                        </div>
                        <div className="text-xs text-gray-500">Bank account (ACH)</div>
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
                      Lower fees
                    </Badge>
                  </div>
                </Label>
              </div>
            </div>
          )}

          {/* New Card */}
          <div className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
            selectedMethod === 'new_card' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
          }`}
            onClick={() => setSelectedMethod('new_card')}
          >
            <div className="flex items-center space-x-3">
              <RadioGroupItem value="new_card" id="new_card" />
              <Label htmlFor="new_card" className="flex-1 cursor-pointer">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium">Pay with Credit/Debit Card</div>
                    <div className="text-xs text-gray-500">Enter card details at checkout</div>
                  </div>
                </div>
              </Label>
            </div>
          </div>

          {/* Add New Payment Method */}
          {hasAnyMethod && (
            <div 
              className="border-2 border-dashed border-gray-300 rounded-lg p-4 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all"
              onClick={() => onAddNewMethod && onAddNewMethod()}
            >
              <div className="flex items-center gap-3 text-blue-600">
                <Plus className="h-5 w-5" />
                <div>
                  <div className="font-medium">Add New Payment Method</div>
                  <div className="text-xs text-gray-500">Save a new card or bank account</div>
                </div>
              </div>
            </div>
          )}
        </RadioGroup>

        <div className="pt-4 border-t">
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleContinue}
          >
            Continue to Pay ${amount.toFixed(2)}
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>

        <p className="text-xs text-center text-gray-500">
          🔒 All payment information is securely encrypted and processed by Stripe
        </p>
      </CardContent>
    </Card>
  );
}