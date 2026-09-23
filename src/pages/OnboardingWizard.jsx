import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { User, AssociationAccount, OnboardingProgress } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, ArrowRight, ArrowLeft, Sparkles, Users, 
  CreditCard, Mail, Settings, Loader2, Building2, Link as LinkIcon 
} from 'lucide-react';
import { toast } from 'sonner';

const STEPS = [
  { id: 'welcome', title: 'Welcome', icon: Sparkles },
  { id: 'profile', title: 'Organization Profile', icon: Building2 },
  { id: 'members', title: 'Add Members', icon: Users },
  { id: 'stripe', title: 'Payment Setup', icon: CreditCard },
  { id: 'templates', title: 'Email Templates', icon: Mail },
  { id: 'preferences', title: 'Preferences', icon: Settings },
  { id: 'complete', title: 'Complete', icon: CheckCircle2 }
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [associationAccount, setAssociationAccount] = useState(null);
  const [onboardingProgress, setOnboardingProgress] = useState(null);

  // Form data
  const [associationType, setAssociationType] = useState('');
  const [organizationDescription, setOrganizationDescription] = useState('');
  const [expectedMemberCount, setExpectedMemberCount] = useState('');
  const [primaryGoals, setPrimaryGoals] = useState([]);
  
  // Extended profile data
  const [organizationName, setOrganizationName] = useState('');
  const [pocName, setPocName] = useState('');
  const [pocEmail, setPocEmail] = useState('');
  const [pocPhone, setPocPhone] = useState('');
  const [streetAddress, setStreetAddress] = useState('');
  const [city, setCity] = useState('');
  const [stateProvince, setStateProvince] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [country, setCountry] = useState('United States');
  const [accountantName, setAccountantName] = useState('');
  const [accountantEmail, setAccountantEmail] = useState('');
  const [accountantPhone, setAccountantPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [stripeConnecting, setStripeConnecting] = useState(false);
  const [stripeConnected, setStripeConnected] = useState(false);
  const [templatePreferences, setTemplatePreferences] = useState({
    tone: 'professional',
    includeOrganizationInfo: true,
    autoSendWelcome: true
  });
  const [inviteEmails, setInviteEmails] = useState(['', '', '']);
  const [invitingMembers, setInvitingMembers] = useState(false);

  useEffect(() => {
    loadOnboardingData();
  }, []);

  const loadOnboardingData = async () => {
    try {
      setIsLoading(true);
      const currentUser = await User.me();
      
      if (!currentUser?.association_account_id) {
        navigate(createPageUrl('Dashboard'));
        return;
      }

      // Load accounts first
      const accounts = await AssociationAccount.list();
      const account = accounts.find(a => a.id === currentUser.association_account_id);
      setAssociationAccount(account);
      setStripeConnected(!!account?.stripe_account_id);
      
      // Pre-fill form data from existing account
      if (account) {
        setOrganizationName(account.organization_name || '');
        setPocName(account.point_of_contact_name || '');
        setPocEmail(account.contact_email || '');
        setPocPhone(account.contact_phone || '');
        setStreetAddress(account.street_address || '');
        setCity(account.city || '');
        setStateProvince(account.state_province || '');
        setPostalCode(account.postal_code || '');
        setCountry(account.country || 'United States');
      }

      // Try to load onboarding progress, but handle 403 gracefully
      try {
        const progressRecords = await OnboardingProgress.filter({ 
          association_account_id: currentUser.association_account_id 
        });

        if (progressRecords.length > 0) {
          const progress = progressRecords[0];
          setOnboardingProgress(progress);
          
          // If already completed, redirect to dashboard
          if (progress.is_completed) {
            navigate(createPageUrl('Dashboard'));
            return;
          }
        } else {
          // Create new onboarding progress if none exists
          const newProgress = await OnboardingProgress.create({
            association_account_id: currentUser.association_account_id,
            is_completed: false,
            welcome_modal_seen: true
          });
          setOnboardingProgress(newProgress);
        }
      } catch (progressError) {
        console.warn('Could not load onboarding progress, creating new:', progressError);
        // If we can't access existing progress, create a new one
        try {
          const newProgress = await OnboardingProgress.create({
            association_account_id: currentUser.association_account_id,
            is_completed: false,
            welcome_modal_seen: true
          });
          setOnboardingProgress(newProgress);
        } catch (createError) {
          console.error('Failed to create onboarding progress:', createError);
          // Continue without onboarding progress - user can still complete wizard
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load onboarding data:', error);
      toast.error('Failed to load onboarding data');
      navigate(createPageUrl('Dashboard'));
      setIsLoading(false);
    }
  };

  const saveProgress = async (updates) => {
    // Skip if no progress record exists - this is fine, we'll just continue without saving
    if (!onboardingProgress?.id) {
      console.log('No onboarding progress record to update, skipping save');
      return;
    }
    try {
      const updated = await OnboardingProgress.update(onboardingProgress.id, updates);
      setOnboardingProgress(updated);
    } catch (error) {
      // Log but don't block the user - allow them to proceed
      console.warn('Failed to save progress (non-blocking):', error);
    }
  };

  const handleNext = async () => {
    // Validate current step before proceeding
    if (currentStep === 0) {
      // Mark welcome as seen
      await saveProgress({ welcome_modal_seen: true });
    }

    if (currentStep === 1) {
      // Validate required fields
      if (!organizationName || !associationType || !pocName || !pocEmail || !pocPhone || 
          !streetAddress || !city || !stateProvince || !postalCode) {
        toast.error('Please fill in all required fields marked with *');
        return;
      }
      await saveProfileData();
    }

    if (currentStep === 2) {
      await inviteInitialMembers();
    }

    if (currentStep === 3) {
      // Save stripe connection status even if skipped
      await saveProgress({ stripe_connected: stripeConnected });
    }

    if (currentStep === 4) {
      await setupEmailTemplates();
    }

    if (currentStep === 5) {
      await completeOnboarding();
    }

    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = async () => {
    // Auto-save progress when skipping
    if (currentStep === 2) {
      // Skip member invites
      await saveProgress({ first_member_added: false });
    }
    if (currentStep === 3) {
      await saveProgress({ stripe_connected: false });
    }
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const inviteInitialMembers = async () => {
    const validEmails = inviteEmails.filter(email => email && email.includes('@'));
    
    if (validEmails.length === 0) {
      // Skip if no emails provided
      await saveProgress({ first_member_added: false });
      return;
    }

    try {
      setInvitingMembers(true);
      
      // Invite each member
      for (const email of validEmails) {
        await base44.functions.invoke('inviteUser', {
          email: email,
          role: 'Member',
          permissions: {}
        });
      }

      await saveProgress({ first_member_added: true });
      toast.success(`${validEmails.length} member invitation(s) sent!`);
    } catch (error) {
      console.error('Failed to invite members:', error);
      toast.error('Some invitations failed to send');
    } finally {
      setInvitingMembers(false);
    }
  };

  const updateInviteEmail = (index, value) => {
    const newEmails = [...inviteEmails];
    newEmails[index] = value;
    setInviteEmails(newEmails);
  };

  const addMoreInvites = () => {
    setInviteEmails([...inviteEmails, '', '', '']);
  };

  const saveProfileData = async () => {
    try {
      setIsSaving(true);
      
      // Update association account with complete profile data
      if (associationAccount?.id) {
        await AssociationAccount.update(associationAccount.id, {
          organization_name: organizationName,
          point_of_contact_name: pocName,
          contact_email: pocEmail,
          contact_phone: pocPhone,
          street_address: streetAddress,
          city: city,
          state_province: stateProvince,
          postal_code: postalCode,
          country: country,
          // Store additional data in a notes field or custom metadata
          // For now, we can use existing fields or add these to AssociationAccount entity later
        });
        
        // Reload account with updated data
        const accounts = await AssociationAccount.list();
        const updatedAccount = accounts.find(a => a.id === associationAccount.id);
        setAssociationAccount(updatedAccount);
      }

      // Update onboarding progress
      await saveProgress({ profile_completed: true });

      toast.success('Profile information saved');
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error('Failed to save profile information');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectStripe = async () => {
    try {
      setStripeConnecting(true);
      
      // Call the Stripe onboarding function with pre-filled data
      const response = await base44.functions.invoke('initiateStripeOnboarding');
      
      if (response.data.url) {
        // Save state before redirecting
        sessionStorage.setItem('onboarding_step', currentStep.toString());
        window.location.href = response.data.url;
      }
    } catch (error) {
      console.error('Failed to connect Stripe:', error);
      
      // Check if it's a Stripe Connect not enabled error
      if (error.response?.data?.details === 'connect_not_enabled') {
        toast.error(
          'Stripe Connect needs to be enabled first. Please visit your Stripe Dashboard (Settings > Connect) to enable it, then try again.',
          { duration: 8000 }
        );
      } else {
        toast.error(error.response?.data?.error || 'Failed to initiate Stripe connection');
      }
      
      setStripeConnecting(false);
    }
  };

  const setupEmailTemplates = async () => {
    try {
      setIsSaving(true);
      
      // Call function to create default email templates
      await base44.functions.invoke('setupDefaultEmailTemplates', {
        association_account_id: associationAccount.id,
        association_type: associationType,
        tone: templatePreferences.tone,
        organization_name: associationAccount.organization_name
      });

      toast.success('Email templates configured');
    } catch (error) {
      console.error('Failed to setup templates:', error);
      toast.error('Failed to setup email templates');
    } finally {
      setIsSaving(false);
    }
  };

  const completeOnboarding = async () => {
    try {
      setIsSaving(true);

      // Mark onboarding as complete if progress record exists
      if (onboardingProgress?.id) {
        try {
          await OnboardingProgress.update(onboardingProgress.id, {
            is_completed: true,
            financial_settings_reviewed: true
          });
        } catch (error) {
          console.warn('Could not update onboarding progress, continuing anyway:', error);
        }
      }

      toast.success('Onboarding completed! Welcome to Benefitly.');
      
      // Navigate to dashboard
      setTimeout(() => {
        navigate(createPageUrl('Dashboard'));
      }, 1500);
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      // Still navigate to dashboard even if there was an error
      toast.info('Proceeding to dashboard...');
      setTimeout(() => {
        navigate(createPageUrl('Dashboard'));
      }, 1000);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGoal = (goal) => {
    setPrimaryGoals(prev => 
      prev.includes(goal) 
        ? prev.filter(g => g !== goal)
        : [...prev, goal]
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  const progressPercentage = ((currentStep + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Benefitly</h1>
          <p className="text-gray-600">Let's get your association set up in just a few minutes</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {STEPS.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progressPercentage)}% Complete
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          
          {/* Step Indicators */}
          <div className="flex justify-between mt-4">
            {STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isActive = index === currentStep;
              const isComplete = index < currentStep;
              
              return (
                <div 
                  key={step.id}
                  className={`flex flex-col items-center ${index <= currentStep ? 'opacity-100' : 'opacity-30'}`}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all
                    ${isActive ? 'bg-blue-600 text-white scale-110' : ''}
                    ${isComplete ? 'bg-green-500 text-white' : ''}
                    ${!isActive && !isComplete ? 'bg-gray-200 text-gray-500' : ''}
                  `}>
                    {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                  </div>
                  <span className="text-xs text-center hidden md:block">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Card */}
        <Card className="shadow-xl">
          <CardContent className="p-8">
            {/* Step 0: Welcome */}
            {currentStep === 0 && (
              <div className="text-center space-y-6">
                <Sparkles className="h-16 w-16 text-blue-600 mx-auto" />
                <div>
                  <h2 className="text-2xl font-bold mb-3">
                    Welcome, {associationAccount?.organization_name}!
                  </h2>
                  <p className="text-gray-600 max-w-2xl mx-auto">
                    We're excited to help you manage your mutual aid association. This quick setup wizard will guide you through:
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4 max-w-2xl mx-auto text-left">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <Building2 className="h-6 w-6 text-blue-600 mb-2" />
                    <h3 className="font-semibold mb-1">Organization Profile</h3>
                    <p className="text-sm text-gray-600">Tell us about your association</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <CreditCard className="h-6 w-6 text-green-600 mb-2" />
                    <h3 className="font-semibold mb-1">Payment Setup</h3>
                    <p className="text-sm text-gray-600">Connect your Stripe account</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <Mail className="h-6 w-6 text-purple-600 mb-2" />
                    <h3 className="font-semibold mb-1">Email Templates</h3>
                    <p className="text-sm text-gray-600">Customize your communications</p>
                  </div>
                  <div className="p-4 bg-orange-50 rounded-lg">
                    <Settings className="h-6 w-6 text-orange-600 mb-2" />
                    <h3 className="font-semibold mb-1">Preferences</h3>
                    <p className="text-sm text-gray-600">Configure your settings</p>
                  </div>
                </div>

                <Alert className="bg-blue-50 border-blue-200 max-w-2xl mx-auto">
                  <AlertDescription className="text-blue-800">
                    ⏱️ This should take about <strong>5-10 minutes</strong> to complete. You can skip steps and return later if needed.
                  </AlertDescription>
                </Alert>
              </div>
            )}

            {/* Step 1: Organization Profile */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Complete Your Association Profile</h2>
                  <p className="text-gray-600">Help us set up your organization's information</p>
                </div>

                <div className="space-y-4">
                  {/* Organization Basic Info */}
                  <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold text-blue-900">Organization Details</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="organizationName">Association Name *</Label>
                      <Input
                        id="organizationName"
                        value={organizationName}
                        onChange={(e) => setOrganizationName(e.target.value)}
                        placeholder="Enter your organization name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="associationType">Association Type *</Label>
                      <Select value={associationType} onValueChange={setAssociationType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mutual_aid">Mutual Aid Society</SelectItem>
                          <SelectItem value="burial_society">Burial Society</SelectItem>
                          <SelectItem value="community_fund">Community Fund</SelectItem>
                          <SelectItem value="cooperative">Cooperative</SelectItem>
                          <SelectItem value="religious_org">Religious Organization</SelectItem>
                          <SelectItem value="ethnic_society">Ethnic/Cultural Society</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Mission Statement</Label>
                      <Textarea
                        id="description"
                        value={organizationDescription}
                        onChange={(e) => setOrganizationDescription(e.target.value)}
                        placeholder="Describe your mission and who you serve..."
                        rows={3}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="taxId">Tax ID / EIN (Optional)</Label>
                      <Input
                        id="taxId"
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        placeholder="XX-XXXXXXX"
                      />
                    </div>
                  </div>

                  {/* Point of Contact */}
                  <div className="space-y-4 p-4 bg-green-50 rounded-lg">
                    <h3 className="font-semibold text-green-900">Point of Contact</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="pocName">Full Name *</Label>
                      <Input
                        id="pocName"
                        value={pocName}
                        onChange={(e) => setPocName(e.target.value)}
                        placeholder="John Doe"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="pocEmail">Email *</Label>
                        <Input
                          id="pocEmail"
                          type="email"
                          value={pocEmail}
                          onChange={(e) => setPocEmail(e.target.value)}
                          placeholder="contact@association.org"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="pocPhone">Phone *</Label>
                        <Input
                          id="pocPhone"
                          type="tel"
                          value={pocPhone}
                          onChange={(e) => setPocPhone(e.target.value)}
                          placeholder="(555) 123-4567"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Organization Address */}
                  <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
                    <h3 className="font-semibold text-purple-900">Organization Address</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="streetAddress">Street Address *</Label>
                      <Input
                        id="streetAddress"
                        value={streetAddress}
                        onChange={(e) => setStreetAddress(e.target.value)}
                        placeholder="123 Main Street"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="city">City *</Label>
                        <Input
                          id="city"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          placeholder="Your City"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="stateProvince">State/Province *</Label>
                        <Input
                          id="stateProvince"
                          value={stateProvince}
                          onChange={(e) => setStateProvince(e.target.value)}
                          placeholder="State"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code *</Label>
                        <Input
                          id="postalCode"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          placeholder="12345"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="country">Country</Label>
                        <Select value={country} onValueChange={setCountry}>
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
                  </div>

                  {/* Accountant Info (Optional) */}
                  <div className="space-y-4 p-4 bg-orange-50 rounded-lg">
                    <h3 className="font-semibold text-orange-900">Accountant / Financial Contact (Optional)</h3>
                    
                    <div className="space-y-2">
                      <Label htmlFor="accountantName">Name</Label>
                      <Input
                        id="accountantName"
                        value={accountantName}
                        onChange={(e) => setAccountantName(e.target.value)}
                        placeholder="Jane Smith, CPA"
                      />
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountantEmail">Email</Label>
                        <Input
                          id="accountantEmail"
                          type="email"
                          value={accountantEmail}
                          onChange={(e) => setAccountantEmail(e.target.value)}
                          placeholder="accountant@firm.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accountantPhone">Phone</Label>
                        <Input
                          id="accountantPhone"
                          type="tel"
                          value={accountantPhone}
                          onChange={(e) => setAccountantPhone(e.target.value)}
                          placeholder="(555) 987-6543"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Settings */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="expectedMembers">Expected Member Count</Label>
                      <Input
                        id="expectedMembers"
                        type="number"
                        value={expectedMemberCount}
                        onChange={(e) => setExpectedMemberCount(e.target.value)}
                        placeholder="Approximate number of members"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Primary Goals (Select all that apply)</Label>
                      <div className="grid md:grid-cols-2 gap-3">
                        {[
                          'Manage member contributions',
                          'Process benefit payouts',
                          'Track event attendance',
                          'Community engagement',
                          'Financial reporting',
                          'Volunteer coordination'
                        ].map((goal) => (
                          <div
                            key={goal}
                            onClick={() => toggleGoal(goal)}
                            className={`
                              p-3 border-2 rounded-lg cursor-pointer transition-all
                              ${primaryGoals.includes(goal) 
                                ? 'border-blue-500 bg-blue-50' 
                                : 'border-gray-200 hover:border-gray-300'}
                            `}
                          >
                            <div className="flex items-center gap-2">
                              <div className={`
                                w-5 h-5 rounded border-2 flex items-center justify-center
                                ${primaryGoals.includes(goal) ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}
                              `}>
                                {primaryGoals.includes(goal) && <CheckCircle2 className="h-4 w-4 text-white" />}
                              </div>
                              <span className="text-sm">{goal}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Invite Members */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Invite Your First Members</h2>
                  <p className="text-gray-600">
                    Start building your community by inviting initial members
                  </p>
                </div>

                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-800">
                    Don't worry if you don't have all emails ready. You can skip this step and add members later from the Members page.
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  {inviteEmails.map((email, index) => (
                    <div key={index} className="space-y-2">
                      <Label htmlFor={`email-${index}`}>
                        Member Email {index + 1} {index < 3 && '*'}
                      </Label>
                      <Input
                        id={`email-${index}`}
                        type="email"
                        value={email}
                        onChange={(e) => updateInviteEmail(index, e.target.value)}
                        placeholder="member@example.com"
                      />
                    </div>
                  ))}
                </div>

                <Button
                  variant="outline"
                  onClick={addMoreInvites}
                  className="w-full"
                >
                  + Add More Members
                </Button>

                <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                  <h3 className="font-semibold mb-3">What happens next?</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>Invited members receive an email with signup instructions</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>They create their account and gain access to the member portal</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>You can manage their permissions from the User Management page</span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Step 3: Stripe Connection */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Connect Your Payment Account</h2>
                  <p className="text-gray-600">
                    Connect your Stripe account to accept contributions and process payouts
                  </p>
                </div>

                {stripeConnected ? (
                  <div className="text-center py-12">
                    <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-green-900 mb-2">
                      Stripe Account Connected!
                    </h3>
                    <p className="text-gray-600 mb-4">
                      Your payment processing is set up and ready to go.
                    </p>
                    {associationAccount?.stripe_charges_enabled && associationAccount?.stripe_payouts_enabled ? (
                      <p className="text-sm text-green-600">
                        ✓ Verified and ready to accept payments and make payouts
                      </p>
                    ) : (
                      <p className="text-sm text-yellow-600">
                        ⏳ Verification in progress - you can continue setup
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <Alert className="bg-blue-50 border-blue-200">
                      <AlertDescription className="text-blue-800">
                        <strong>Why Stripe?</strong> Your money goes directly to YOUR account. We never touch your funds. 
                        This is the same system used by Uber, Airbnb, and thousands of other platforms.
                      </AlertDescription>
                    </Alert>

                    <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                      <h3 className="font-semibold mb-4">What you'll need:</h3>
                      <ul className="space-y-2 text-sm text-gray-600">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>Business information (EIN or Tax ID)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>Bank account details for payouts</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                          <span>Personal identification (for verification)</span>
                        </li>
                      </ul>
                    </div>

                    <div className="text-center">
                      <Button
                        size="lg"
                        onClick={handleConnectStripe}
                        disabled={stripeConnecting}
                        className="gap-2"
                      >
                        {stripeConnecting ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Connecting...
                          </>
                        ) : (
                          <>
                            <LinkIcon className="h-5 w-5" />
                            Connect with Stripe
                          </>
                        )}
                      </Button>
                      <p className="text-xs text-gray-500 mt-2">
                        You'll be redirected to Stripe's secure platform
                      </p>
                    </div>

                    <div className="text-center">
                      <button
                        onClick={handleSkip}
                        className="text-sm text-gray-500 hover:text-gray-700 underline"
                      >
                        Skip for now (you can connect later in Settings)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Email Templates */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Configure Email Templates</h2>
                  <p className="text-gray-600">
                    We'll create default email templates for common communications
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Email Tone</Label>
                    <Select 
                      value={templatePreferences.tone} 
                      onValueChange={(value) => setTemplatePreferences({...templatePreferences, tone: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional & Formal</SelectItem>
                        <SelectItem value="friendly">Friendly & Warm</SelectItem>
                        <SelectItem value="casual">Casual & Conversational</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="includeOrg"
                        checked={templatePreferences.includeOrganizationInfo}
                        onChange={(e) => setTemplatePreferences({
                          ...templatePreferences, 
                          includeOrganizationInfo: e.target.checked
                        })}
                        className="rounded"
                      />
                      <Label htmlFor="includeOrg">Include organization info in email footer</Label>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="autoWelcome"
                        checked={templatePreferences.autoSendWelcome}
                        onChange={(e) => setTemplatePreferences({
                          ...templatePreferences, 
                          autoSendWelcome: e.target.checked
                        })}
                        className="rounded"
                      />
                      <Label htmlFor="autoWelcome">Automatically send welcome emails to new members</Label>
                    </div>
                  </div>

                  <Alert className="bg-purple-50 border-purple-200">
                    <AlertDescription className="text-purple-800">
                      <strong>Templates we'll create:</strong> Welcome emails, payment reminders, 
                      event notifications, payout confirmations, and more. You can customize these anytime.
                    </AlertDescription>
                  </Alert>

                  <div className="bg-white border-2 border-gray-200 rounded-lg p-6">
                    <h3 className="font-semibold mb-3">Preview: Welcome Email</h3>
                    <div className="text-sm text-gray-600 space-y-2">
                      <p><strong>Subject:</strong> Welcome to {associationAccount?.organization_name}!</p>
                      <p className="italic text-gray-500">
                        {templatePreferences.tone === 'professional' && "Dear [Member Name], We are pleased to welcome you..."}
                        {templatePreferences.tone === 'friendly' && "Hi [Member Name]! We're so happy to have you join us..."}
                        {templatePreferences.tone === 'casual' && "Hey [Member Name]! Welcome aboard..."}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Preferences */}
            {currentStep === 5 && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Final Preferences</h2>
                  <p className="text-gray-600">
                    Set your default preferences (you can change these anytime)
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-3">✓ Profile Set Up</h3>
                    <p className="text-sm text-gray-600">
                      Type: {associationType || 'Not specified'}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-3">
                      {stripeConnected ? '✓ Stripe Connected' : '⏭️ Stripe (Skipped)'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {stripeConnected 
                        ? 'Payment processing is ready' 
                        : 'You can connect Stripe later in Settings'}
                    </p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold mb-3">✓ Email Templates Ready</h3>
                    <p className="text-sm text-gray-600">
                      Tone: {templatePreferences.tone}
                    </p>
                  </div>

                  <Alert className="bg-green-50 border-green-200">
                    <AlertDescription className="text-green-800">
                      <strong>You're all set!</strong> Click "Complete Setup" to finish and access your dashboard.
                    </AlertDescription>
                  </Alert>
                </div>
              </div>
            )}

            {/* Step 6: Complete */}
            {currentStep === 6 && (
              <div className="text-center py-12 space-y-6">
                <CheckCircle2 className="h-24 w-24 text-green-500 mx-auto animate-bounce" />
                <div>
                  <h2 className="text-3xl font-bold mb-3">All Set!</h2>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Your Benefitly account is configured and ready to use. 
                    You can now start adding members, creating events, and managing your association.
                  </p>
                </div>

                <div className="grid md:grid-cols-3 gap-4 max-w-2xl mx-auto">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Add Members</h3>
                    <p className="text-xs text-gray-600">Build your member directory</p>
                  </div>
                  <div className="p-4 bg-green-50 rounded-lg">
                    <CreditCard className="h-8 w-8 text-green-600 mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Create Events</h3>
                    <p className="text-xs text-gray-600">Start collecting contributions</p>
                  </div>
                  <div className="p-4 bg-purple-50 rounded-lg">
                    <Settings className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                    <h3 className="font-semibold mb-1">Customize Settings</h3>
                    <p className="text-xs text-gray-600">Fine-tune your preferences</p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>

          {/* Navigation */}
          <div className="border-t px-8 py-4 flex items-center justify-between bg-gray-50">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={currentStep === 0 || isSaving}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <div className="flex gap-3">
              {currentStep > 0 && currentStep < STEPS.length - 2 && (
                <Button
                  variant="outline"
                  onClick={handleSkip}
                  disabled={isSaving}
                >
                  Skip
                </Button>
              )}

              <Button
                onClick={handleNext}
                disabled={isSaving || (currentStep === 2 && !stripeConnected && stripeConnecting)}
                className="gap-2"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : currentStep === STEPS.length - 1 ? (
                  'Go to Dashboard'
                ) : currentStep === STEPS.length - 2 ? (
                  'Complete Setup'
                ) : (
                  <>
                    Next
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>

        {/* Help Link */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Need help? <a href="#" className="text-blue-600 hover:underline">Contact Support</a>
          </p>
        </div>
      </div>
    </div>
  );
}