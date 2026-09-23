import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, Building2, CreditCard, Zap, Users, DollarSign, Calendar, ArrowRight, Check, Loader2, LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { AssociationAccount, SubscriptionTier, OnboardingProgress, Member } from '@/entities/all';

const STEPS = [
  { id: 1, title: 'Organization Details', icon: Building2 },
  { id: 2, title: 'Select Your Plan', icon: CreditCard },
  { id: 3, title: 'Connect Stripe', icon: LinkIcon },
  { id: 4, title: 'Feature Overview', icon: Zap }
];

export default function AssociationOnboardingFlow({ isOpen, onComplete, user }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [tiers, setTiers] = useState([]);
  const [associationAccount, setAssociationAccount] = useState(null);
  
  // Step 1: Organization details
  const [orgForm, setOrgForm] = useState({
    organization_name: '',
    point_of_contact_name: user?.full_name || '',
    contact_email: user?.email || '',
    contact_phone: '',
    street_address: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: 'United States'
  });

  // Step 2: Selected tier
  const [selectedTier, setSelectedTier] = useState(null);
  const [billingCycle, setBillingCycle] = useState('monthly');

  useEffect(() => {
    const loadTiers = async () => {
      const tiersList = await SubscriptionTier.list();
      setTiers(tiersList.filter(t => t.is_active && t.name !== 'Enterprise').sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
    };
    if (isOpen) {
      loadTiers();
    }
  }, [isOpen]);

  const handleOrgDetailsNext = async () => {
    if (!orgForm.organization_name || !orgForm.contact_phone || !orgForm.street_address || !orgForm.city || !orgForm.state_province || !orgForm.postal_code) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    try {
      // Create association account
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 14);

      const account = await AssociationAccount.create({
        owner_user_id: user.id,
        ...orgForm,
        account_status: 'trial',
        trial_end_date: trialEndDate.toISOString().split('T')[0],
        current_member_count: 0,
        total_revenue: 0
      });

      setAssociationAccount(account);

      // Update user with association ID and role
      await base44.auth.updateMe({ 
        association_account_id: account.id,
        association_role: 'Administrator'
      });

      // Create a Member record for the administrator
      const memberNumber = `M${Date.now().toString().slice(-8)}`;
      await Member.create({
        member_number: memberNumber,
        first_name: user.full_name.split(' ')[0] || 'Admin',
        last_name: user.full_name.split(' ').slice(1).join(' ') || user.full_name.split(' ')[0],
        email: user.email,
        status: 'Active',
        joined_at: new Date().toISOString().split('T')[0]
      });

      // Create onboarding progress
      await OnboardingProgress.create({
        association_account_id: account.id,
        step_completed: 1,
        organization_details_completed: true
      });

      setCurrentStep(2);
    } catch (error) {
      toast.error('Failed to create organization: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTierSelect = async () => {
    if (!selectedTier) {
      toast.error('Please select a subscription plan');
      return;
    }

    setIsLoading(true);
    try {
      // Update association with selected tier
      await AssociationAccount.update(associationAccount.id, {
        subscription_tier_id: selectedTier.id,
        billing_cycle: billingCycle
      });

      // Update onboarding progress
      const progress = await OnboardingProgress.filter({ association_account_id: associationAccount.id });
      if (progress.length > 0) {
        await OnboardingProgress.update(progress[0].id, {
          step_completed: 2,
          subscription_selected: true
        });
      }

      setCurrentStep(3);
    } catch (error) {
      toast.error('Failed to save subscription: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStripeConnect = async () => {
    setIsLoading(true);
    try {
      const response = await base44.functions.invoke('initiateStripeOnboarding');
      if (response.data.url) {
        // Save progress before redirect
        const progress = await OnboardingProgress.filter({ association_account_id: associationAccount.id });
        if (progress.length > 0) {
          await OnboardingProgress.update(progress[0].id, {
            step_completed: 3,
            stripe_connection_initiated: true
          });
        }
        window.location.href = response.data.url;
      } else {
        toast.error('Could not connect to Stripe');
      }
    } catch (error) {
      toast.error('Failed to connect Stripe: ' + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipStripe = async () => {
    const progress = await OnboardingProgress.filter({ association_account_id: associationAccount.id });
    if (progress.length > 0) {
      await OnboardingProgress.update(progress[0].id, {
        step_completed: 4
      });
    }
    setCurrentStep(4);
  };

  const handleComplete = async () => {
    const progress = await OnboardingProgress.filter({ association_account_id: associationAccount.id });
    if (progress.length > 0) {
      await OnboardingProgress.update(progress[0].id, {
        step_completed: 4,
        onboarding_completed: true
      });
    }
    onComplete();
  };

  const progressPercent = (currentStep / STEPS.length) * 100;

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Welcome to Benefitly! 🎉</DialogTitle>
          <p className="text-sm text-gray-500">Let's get your association set up in just a few steps</p>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-4">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between">
            {STEPS.map((step) => (
              <div key={step.id} className={`flex flex-col items-center ${currentStep >= step.id ? 'text-blue-600' : 'text-gray-400'}`}>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${currentStep >= step.id ? 'bg-blue-100' : 'bg-gray-100'}`}>
                  {currentStep > step.id ? <CheckCircle className="w-5 h-5" /> : <step.icon className="w-5 h-5" />}
                </div>
                <span className="text-xs text-center">{step.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="mt-8">
          {/* Step 1: Organization Details */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Building2 className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h3 className="text-xl font-semibold">Tell us about your organization</h3>
                <p className="text-sm text-gray-500">This information helps us customize your experience</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Organization Name *</Label>
                  <Input
                    value={orgForm.organization_name}
                    onChange={(e) => setOrgForm({...orgForm, organization_name: e.target.value})}
                    placeholder="Enter organization name"
                  />
                </div>

                <div>
                  <Label>Contact Name *</Label>
                  <Input
                    value={orgForm.point_of_contact_name}
                    onChange={(e) => setOrgForm({...orgForm, point_of_contact_name: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Email *</Label>
                  <Input
                    value={orgForm.contact_email}
                    onChange={(e) => setOrgForm({...orgForm, contact_email: e.target.value})}
                    type="email"
                  />
                </div>

                <div>
                  <Label>Phone *</Label>
                  <Input
                    value={orgForm.contact_phone}
                    onChange={(e) => setOrgForm({...orgForm, contact_phone: e.target.value})}
                    placeholder="(555) 123-4567"
                  />
                </div>

                <div>
                  <Label>Street Address *</Label>
                  <Input
                    value={orgForm.street_address}
                    onChange={(e) => setOrgForm({...orgForm, street_address: e.target.value})}
                  />
                </div>

                <div>
                  <Label>City *</Label>
                  <Input
                    value={orgForm.city}
                    onChange={(e) => setOrgForm({...orgForm, city: e.target.value})}
                  />
                </div>

                <div>
                  <Label>State/Province *</Label>
                  <Input
                    value={orgForm.state_province}
                    onChange={(e) => setOrgForm({...orgForm, state_province: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Postal Code *</Label>
                  <Input
                    value={orgForm.postal_code}
                    onChange={(e) => setOrgForm({...orgForm, postal_code: e.target.value})}
                  />
                </div>

                <div>
                  <Label>Country</Label>
                  <Input value={orgForm.country} disabled />
                </div>
              </div>

              <Button onClick={handleOrgDetailsNext} className="w-full" size="lg" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 2: Select Plan */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <CreditCard className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h3 className="text-xl font-semibold">Choose your subscription plan</h3>
                <p className="text-sm text-gray-500">Start with a 14-day free trial. No credit card required.</p>
              </div>

              <div className="flex justify-center gap-4 mb-6">
                <Button
                  variant={billingCycle === 'monthly' ? 'default' : 'outline'}
                  onClick={() => setBillingCycle('monthly')}
                >
                  Monthly
                </Button>
                <Button
                  variant={billingCycle === 'yearly' ? 'default' : 'outline'}
                  onClick={() => setBillingCycle('yearly')}
                >
                  Yearly <Badge className="ml-2 bg-green-500">Save 15%</Badge>
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-4 max-h-[400px] overflow-y-auto">
                {tiers.map((tier) => (
                  <Card
                    key={tier.id}
                    className={`cursor-pointer transition-all ${selectedTier?.id === tier.id ? 'ring-2 ring-blue-500 shadow-lg' : 'hover:shadow-md'}`}
                    onClick={() => setSelectedTier(tier)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{tier.name}</CardTitle>
                          <CardDescription className="text-xs">{tier.tagline}</CardDescription>
                        </div>
                        {selectedTier?.id === tier.id && <CheckCircle className="w-5 h-5 text-blue-500" />}
                      </div>
                      <div className="mt-4">
                        <span className="text-3xl font-bold">${billingCycle === 'monthly' ? tier.monthly_price : tier.yearly_price}</span>
                        <span className="text-gray-500">/{billingCycle === 'monthly' ? 'mo' : 'yr'}</span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-3">Up to {tier.member_limit} members</p>
                      <ul className="space-y-2">
                        {tier.features?.slice(0, 4).map((feature, idx) => (
                          <li key={idx} className="flex items-start text-xs">
                            <Check className="w-3 h-3 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Button onClick={handleTierSelect} className="w-full" size="lg" disabled={isLoading || !selectedTier}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continue with {selectedTier?.name || 'Selected'} Plan <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Step 3: Connect Stripe */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <LinkIcon className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h3 className="text-xl font-semibold">Connect your Stripe account</h3>
                <p className="text-sm text-gray-500">Connect Stripe to collect member contributions and process payouts</p>
              </div>

              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <DollarSign className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">Collect Contributions</p>
                        <p className="text-sm text-blue-700">Accept payments from members via credit card or bank transfer</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Users className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">Payout Benefits</p>
                        <p className="text-sm text-blue-700">Send money directly to members' bank accounts for covered events</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-blue-900">Secure & Compliant</p>
                        <p className="text-sm text-blue-700">All transactions are encrypted and PCI-compliant</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-3">
                <Button onClick={handleStripeConnect} className="w-full" size="lg" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LinkIcon className="mr-2 h-4 w-4" />}
                  Connect Stripe Account
                </Button>
                <Button onClick={handleSkipStripe} variant="outline" className="w-full">
                  Skip for Now (can connect later)
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Feature Overview */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="text-center mb-6">
                <Zap className="w-12 h-12 text-blue-500 mx-auto mb-3" />
                <h3 className="text-xl font-semibold">You're all set! 🎉</h3>
                <p className="text-sm text-gray-500">Here's what you can do with your {selectedTier?.name} plan</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <Users className="w-8 h-8 text-blue-500 mb-2" />
                    <CardTitle className="text-base">Manage Members</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-600">
                    Add and manage up to {selectedTier?.member_limit} members. Track their status, contributions, and engagement.
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <Calendar className="w-8 h-8 text-purple-500 mb-2" />
                    <CardTitle className="text-base">Create Events</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-600">
                    Set up benefit events for deaths, hospitalizations, and community gatherings.
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <DollarSign className="w-8 h-8 text-green-500 mb-2" />
                    <CardTitle className="text-base">Collect Contributions</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-600">
                    Automatically collect member contributions with automated reminders and payment tracking.
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CheckCircle className="w-8 h-8 text-orange-500 mb-2" />
                    <CardTitle className="text-base">Process Payouts</CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-600">
                    Send benefit payouts directly to members' bank accounts with full tracking and reporting.
                  </CardContent>
                </Card>
              </div>

              <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-lg text-center">
                <p className="font-semibold mb-2">Your 14-day free trial starts now!</p>
                <p className="text-sm opacity-90">Explore all features with no credit card required. We'll remind you before your trial ends.</p>
              </div>

              <Button onClick={handleComplete} className="w-full" size="lg">
                Go to Dashboard <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}