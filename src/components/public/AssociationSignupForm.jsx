import React, { useState, useEffect } from 'react';
import { AssociationAccount, TrialUsage } from '@/entities/all';
import { User } from '@/entities/User';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Loader2, CreditCard, Lock, AlertTriangle, ExternalLink } from 'lucide-react';

export default function AssociationSignupForm({ tier, onComplete, onCancel }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [trialEligible, setTrialEligible] = useState(true);
  const [checkingTrial, setCheckingTrial] = useState(false);
  const [formData, setFormData] = useState({
    // Organization Info
    organization_name: '',
    point_of_contact_name: '',
    contact_email: '',
    contact_phone: '',
    street_address: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'United States',
    current_member_count: 0,
    
    // Billing Info
    billing_cycle: 'monthly',
    billing_name: '',
    billing_email: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_postal_code: '',
    billing_country: 'United States',
    
    // Payment Info
    card_number: '',
    expiry_month: '',
    expiry_year: '',
    cvv: '',
    
    // Account Setup
    subscription_tier_id: tier.id,
    account_status: 'trial', // Default to trial, will be updated by useEffect
    trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default
    next_billing_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default
    total_revenue: 0
  });
  const [sameBillingAddress, setSameBillingAddress] = useState(true);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const monthlyPrice = tier.monthly_price;
  const yearlyPrice = tier.yearly_price || tier.monthly_price * 12;
  const savings = monthlyPrice * 12 - yearlyPrice;
  const totalPrice = formData.billing_cycle === 'monthly' ? monthlyPrice : yearlyPrice;

  // Check trial eligibility when contact email or organization name changes
  useEffect(() => {
    const checkTrialEligibility = async () => {
      // Only proceed if a valid email is entered or organization name is available
      if (!formData.contact_email && !formData.organization_name) {
          // If neither is present, assume eligible for trial by default
          setTrialEligible(true);
          setFormData(prev => ({
            ...prev,
            account_status: 'trial',
            trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            next_billing_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }));
          return;
      }
      
      setCheckingTrial(true);
      try {
        let hasUsedTrial = false;
        // Check if email has been used for trial before, if email is provided and valid
        if (formData.contact_email && formData.contact_email.includes('@')) {
          const emailTrials = await TrialUsage.filter({ email_address: formData.contact_email });
          if (emailTrials.length > 0) hasUsedTrial = true;
        }
        
        // Also check if organization name has been used, if provided and no trial found by email yet
        if (!hasUsedTrial && formData.organization_name) {
          const orgTrials = await TrialUsage.filter({ organization_name: formData.organization_name });
          if (orgTrials.length > 0) hasUsedTrial = true;
        }
        
        setTrialEligible(!hasUsedTrial);
        
        if (hasUsedTrial) {
          // Set account status to active (no trial) and billing date to immediate
          setFormData(prev => ({
            ...prev,
            account_status: 'active',
            trial_end_date: null, // No trial end date if no trial
            next_billing_date: new Date().toISOString().split('T')[0] // Billing starts today
          }));
        } else {
          // Reset to trial status if eligible (e.g., user changed email/org name)
          setFormData(prev => ({
            ...prev,
            account_status: 'trial',
            trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            next_billing_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          }));
        }
      } catch (error) {
        console.error('Error checking trial eligibility:', error);
        // On error, assume trial is not eligible to be safe
        setTrialEligible(false);
        setFormData(prev => ({
          ...prev,
          account_status: 'active',
          trial_end_date: null,
          next_billing_date: new Date().toISOString().split('T')[0]
        }));
      } finally {
        setCheckingTrial(false);
      }
    };

    const debounceTimeout = setTimeout(() => {
        if (formData.contact_email || formData.organization_name) { // Only check if one of them is provided
            checkTrialEligibility();
        } else {
            // If both are empty, reset to default trial state
            setTrialEligible(true);
            setFormData(prev => ({
                ...prev,
                account_status: 'trial',
                trial_end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                next_billing_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            }));
        }
    }, 500); // Debounce for 500ms

    return () => clearTimeout(debounceTimeout);
  }, [formData.contact_email, formData.organization_name]); // Dependencies to re-run effect

  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSelectChange = (id, value) => {
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const copyBillingAddress = () => {
    if (sameBillingAddress) {
      setFormData(prev => ({
        ...prev,
        billing_name: `${prev.organization_name} - Finance Department`,
        billing_email: prev.contact_email,
        billing_address: prev.street_address,
        billing_city: prev.city,
        billing_state: prev.state_province,
        billing_postal_code: prev.postal_code,
        billing_country: prev.country
      }));
    }
  };

  const handleNext = () => {
    if (currentStep === 1) {
      const requiredFields = [
        'organization_name',
        'point_of_contact_name',
        'contact_email',
        'contact_phone',
        'street_address',
        'city',
        'state_province',
        'postal_code',
      ];
      const missingField = requiredFields.find(field => !formData[field]);

      if (missingField) {
        toast.error(`Please fill in all required fields. '${missingField.replace(/_/g, ' ')}' is missing.`);
        return;
      }
      copyBillingAddress();
      setCurrentStep(2);
    }
  };

  const handleBack = () => {
    if (currentStep === 2) {
      setCurrentStep(1);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!acceptedTerms) {
      toast.error('Please accept the terms and conditions');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const currentUser = await User.me();
      if (!currentUser) {
        toast.error("You must be signed in to create an association.");
        setIsSubmitting(false);
        return;
      }

      // Create the association account first
      const newAccount = await AssociationAccount.create({
        organization_name: formData.organization_name,
        point_of_contact_name: formData.point_of_contact_name,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        street_address: formData.street_address,
        city: formData.city,
        state_province: formData.state_province,
        postal_code: formData.postal_code,
        country: formData.country,
        subscription_tier_id: formData.subscription_tier_id,
        billing_cycle: formData.billing_cycle,
        current_member_count: formData.current_member_count,
        account_status: 'pending', // Will be updated after Stripe checkout
        trial_end_date: formData.trial_end_date,
        next_billing_date: formData.next_billing_date,
        total_revenue: formData.total_revenue,
        owner_user_id: currentUser.id,
      });

      // If this is a trial signup, record the trial usage
      if (trialEligible && formData.account_status === 'trial') {
        try {
          await TrialUsage.create({
            email_address: formData.contact_email,
            organization_name: formData.organization_name,
            association_account_id: newAccount.id,
            trial_start_date: new Date().toISOString().split('T')[0],
            trial_end_date: formData.trial_end_date
          });
        } catch (error) {
          console.error('Failed to record trial usage, but account was created:', error);
        }
      }

      // CRITICAL: Link user to association account immediately
      await base44.auth.updateMe({
        association_account_id: newAccount.id,
        association_role: 'Administrator',
      });

      // Note: Member record will be created through onboarding wizard
      // after subscription setup completes

      // Create Stripe checkout session
      const checkoutResponse = await base44.functions.invoke('createSubscriptionCheckout', {
        tierName: tier.name,
        billingCycle: formData.billing_cycle,
        organizationName: formData.organization_name,
        contactEmail: formData.contact_email,
        trialEligible: trialEligible,
        associationAccountId: newAccount.id
      });

      if (checkoutResponse.data?.url) {
        // Redirect to Stripe Checkout
        window.location.href = checkoutResponse.data.url;
      } else {
        // Fallback if no Stripe URL (shouldn't happen)
        toast.success('Account created successfully!');
        onComplete();
      }
    } catch (error) {
      console.error('Failed to create account:', error);
      toast.error('Failed to create account. Please try again.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Indicator */}
      <div className="flex items-center space-x-4 mb-6">
        <div className={`flex items-center space-x-2 ${currentStep >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 1 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>1</div>
          <span className="text-sm font-medium">Organization</span>
        </div>
        <div className="flex-1 h-px bg-gray-200"></div>
        <div className={`flex items-center space-x-2 ${currentStep >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentStep >= 2 ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>2</div>
          <span className="text-sm font-medium">Billing & Payment</span>
        </div>
      </div>

      {/* Plan Summary */}
      <div className={`p-4 rounded-lg ${trialEligible ? 'bg-blue-50' : 'bg-orange-50'}`}>
        <h4 className={`font-semibold ${trialEligible ? 'text-blue-900' : 'text-orange-900'}`}>
          {tier.name} Plan
        </h4>
        <p className={`text-sm ${trialEligible ? 'text-blue-700' : 'text-orange-700'}`}>
          Up to {tier.member_limit} members • 
          {formData.billing_cycle === 'monthly' 
            ? ` $${monthlyPrice}/month` 
            : ` $${yearlyPrice}/year (Save $${savings})`
          }
        </p>
        {trialEligible ? (
          <p className="text-xs text-blue-600 mt-1">
            14-day free trial included
          </p>
        ) : (
          <p className="text-xs text-orange-600 mt-1">
            No trial available - this email/organization has already used a trial
          </p>
        )}
      </div>

      {/* Trial Ineligibility Warning */}
      {!trialEligible && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>No Trial Available:</strong> This email address or organization has already used a free trial. 
            Your subscription will begin immediately upon signup and you will be charged {formData.billing_cycle === 'monthly' ? 'monthly' : 'annually'}.
          </AlertDescription>
        </Alert>
      )}

      {/* Step 1: Organization Information */}
      {currentStep === 1 && (
        <form className="space-y-4">
          <h3 className="text-lg font-semibold">Organization Information</h3>
          
          <div className="space-y-2">
            <Label htmlFor="organization_name">Association Name *</Label>
            <Input
              id="organization_name"
              value={formData.organization_name}
              onChange={handleChange}
              placeholder="e.g., Community Mutual Aid Society"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="point_of_contact_name">Point of Contact Name *</Label>
            <Input
              id="point_of_contact_name"
              value={formData.point_of_contact_name}
              onChange={handleChange}
              placeholder="e.g., Jane Doe"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contact_email">Contact Email *</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={handleChange}
                placeholder="admin@yourorganization.org"
                required
              />
              {checkingTrial && (
                <p className="text-xs text-gray-500">Checking trial eligibility...</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">Contact Phone *</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={formData.contact_phone}
                onChange={handleChange}
                placeholder="(555) 123-4567"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="street_address">Street Address *</Label>
            <Input
              id="street_address"
              value={formData.street_address}
              onChange={handleChange}
              placeholder="123 Main St"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Your City"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state_province">State/Province *</Label>
              <Input
                id="state_province"
                value={formData.state_province}
                onChange={handleChange}
                placeholder="State"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="postal_code">Postal Code *</Label>
              <Input
                id="postal_code"
                value={formData.postal_code}
                onChange={handleChange}
                placeholder="12345"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Select value={formData.country} onValueChange={(value) => handleSelectChange('country', value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="United States">United States</SelectItem>
                  <SelectItem value="Canada">Canada</SelectItem>
                  <SelectItem value="United Kingdom">United Kingdom</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="current_member_count">Current Member Count</Label>
            <Input
              id="current_member_count"
              type="number"
              value={formData.current_member_count}
              onChange={handleChange}
              placeholder="0"
              min="0"
              max={tier.member_limit}
            />
            <p className="text-xs text-gray-500">
              You can add up to {tier.member_limit} members with this plan
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="button" onClick={handleNext}>
              Next: Billing & Payment
            </Button>
          </div>
        </form>
      )}

      {/* Step 2: Billing & Payment */}
      {currentStep === 2 && (
        <form onSubmit={handleSubmit} className="space-y-6">
          <h3 className="text-lg font-semibold">Billing & Payment</h3>
          
          {/* Billing Cycle */}
          <div className="space-y-3">
            <Label>Billing Cycle</Label>
            <RadioGroup value={formData.billing_cycle} onValueChange={(value) => handleSelectChange('billing_cycle', value)}>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="monthly" id="monthly" />
                <Label htmlFor="monthly" className="flex-1">
                  <div className="font-medium">Monthly - ${monthlyPrice}/month</div>
                  <div className="text-sm text-gray-500">Billed monthly, cancel anytime</div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg">
                <RadioGroupItem value="yearly" id="yearly" />
                <Label htmlFor="yearly" className="flex-1">
                  <div className="font-medium">Yearly - ${yearlyPrice}/year</div>
                  <div className="text-sm text-green-600">Save ${savings} per year!</div>
                </Label>
              </div>
            </RadioGroup>
          </div>

          <Separator />

          {/* Billing Information */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="same-address" 
                checked={sameBillingAddress} 
                onCheckedChange={setSameBillingAddress}
              />
              <Label htmlFor="same-address">Use organization address for billing</Label>
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_name">Billing Contact Name</Label>
              <Input
                id="billing_name"
                value={formData.billing_name}
                onChange={handleChange}
                placeholder="John Doe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_email">Billing Email</Label>
              <Input
                id="billing_email"
                type="email"
                value={formData.billing_email}
                onChange={handleChange}
                placeholder="billing@yourorganization.org"
              />
            </div>

            {!sameBillingAddress && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="billing_address">Billing Address</Label>
                  <Input
                    id="billing_address"
                    value={formData.billing_address}
                    onChange={handleChange}
                    placeholder="123 Billing St"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="billing_city">City</Label>
                    <Input
                      id="billing_city"
                      value={formData.billing_city}
                      onChange={handleChange}
                      placeholder="City"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billing_state">State</Label>
                    <Input
                      id="billing_state"
                      value={formData.billing_state}
                      onChange={handleChange}
                      placeholder="State"
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <Separator />

          {/* Payment Information - Stripe Checkout */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-5 w-5 text-gray-400" />
              <h4 className="font-medium">Payment</h4>
              <Lock className="h-4 w-4 text-green-500" />
            </div>

            <div className="p-4 bg-gray-50 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="bg-white p-2 rounded border">
                  <svg className="h-6 w-6" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path fillRule="evenodd" clipRule="evenodd" d="M32 16C32 24.8366 24.8366 32 16 32C7.16344 32 0 24.8366 0 16C0 7.16344 7.16344 0 16 0C24.8366 0 32 7.16344 32 16Z" fill="#635BFF"/>
                    <path fillRule="evenodd" clipRule="evenodd" d="M14.7 11.2C14.7 10.4 15.4 10 16.5 10C18.1 10 20.1 10.5 21.7 11.4V7.3C19.9 6.6 18.2 6.3 16.5 6.3C12.5 6.3 10 8.4 10 11.5C10 16.2 16.4 15.4 16.4 17.4C16.4 18.3 15.5 18.7 14.3 18.7C12.5 18.7 10.3 18 8.5 16.9V21.1C10.5 22 12.5 22.5 14.3 22.5C18.4 22.5 21.1 20.5 21.1 17.3C21 12.3 14.7 13.3 14.7 11.2Z" fill="white"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">Secure checkout with Stripe</p>
                  <p className="text-sm text-gray-500">You'll be redirected to complete payment</p>
                </div>
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2">Order Summary</h4>
            <div className="flex justify-between text-sm">
              <span>{tier.name} Plan ({formData.billing_cycle})</span>
              <span>${totalPrice}</span>
            </div>
            {trialEligible ? (
              <>
                <div className="flex justify-between text-sm text-green-600">
                  <span>14-day free trial</span>
                  <span>-${totalPrice}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium">
                  <span>Due Today</span>
                  <span>$0.00</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  You will be charged ${totalPrice} after your 14-day trial ends.
                </p>
              </>
            ) : (
              <>
                <Separator className="my-2" />
                <div className="flex justify-between font-medium text-orange-600">
                  <span>Due Today</span>
                  <span>${totalPrice}</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Your subscription begins immediately. Next billing: {formData.billing_cycle === 'monthly' ? '1 month' : '1 year'} from today.
                </p>
              </>
            )}
          </div>

          {/* Terms and Conditions */}
          <div className="flex items-start space-x-2">
            <Checkbox 
              id="terms" 
              checked={acceptedTerms} 
              onCheckedChange={setAcceptedTerms}
            />
            <Label htmlFor="terms" className="text-sm">
              I agree to the <a href="#" className="text-blue-600 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>
            </Label>
          </div>

          <div className="flex justify-between gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              Back
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || !acceptedTerms} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    {trialEligible ? 'Start Free Trial' : 'Subscribe Now'}
                    <ExternalLink className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      )}

      <div className="text-xs text-gray-500 space-y-1 border-t pt-4">
        <p>🔒 Your payment information is secure and encrypted</p>
        <p>📞 Need help? Contact our support team</p>
        {trialEligible && <p>✅ Cancel anytime during your trial period</p>}
      </div>
    </div>
  );
}