import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent } from '@/components/ui/card';
import { 
  CheckCircle, ArrowRight, ArrowLeft, UserCircle, 
  DollarSign, Calendar, Wallet, Sparkles, X,
  Info, CreditCard, Users, TrendingUp
} from 'lucide-react';
import { MemberOnboarding } from '@/entities/all';
import { toast } from 'sonner';

const STEPS = [
  {
    id: 'welcome',
    title: 'Welcome!',
    icon: Sparkles,
    description: "Let's get you started"
  },
  {
    id: 'profile',
    title: 'Complete Profile',
    icon: UserCircle,
    description: 'Tell us about yourself'
  },
  {
    id: 'bank_account',
    title: 'Payment Setup',
    icon: Wallet,
    description: 'Add payout method'
  },
  {
    id: 'contributions',
    title: 'Contributions',
    icon: DollarSign,
    description: 'How it works'
  },
  {
    id: 'events',
    title: 'Events & Community',
    icon: Calendar,
    description: 'Get involved'
  },
  {
    id: 'complete',
    title: 'All Set!',
    icon: CheckCircle,
    description: 'Ready to go'
  }
];

export default function MemberOnboardingWizard({ 
  isOpen, 
  member, 
  onComplete, 
  onSkip 
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingRecord, setOnboardingRecord] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && member) {
      loadOnboardingProgress();
    }
  }, [isOpen, member]);

  const loadOnboardingProgress = async () => {
    try {
      const records = await MemberOnboarding.filter({ member_id: member.id });
      if (records.length > 0) {
        const record = records[0];
        setOnboardingRecord(record);
        setCurrentStep(record.current_step || 0);
      } else {
        // Create new onboarding record
        const newRecord = await MemberOnboarding.create({
          member_id: member.id,
          current_step: 0
        });
        setOnboardingRecord(newRecord);
      }
    } catch (error) {
      console.error('Failed to load onboarding progress:', error);
    }
  };

  const updateProgress = async (updates) => {
    if (!onboardingRecord) return;
    
    try {
      const updated = await MemberOnboarding.update(onboardingRecord.id, updates);
      setOnboardingRecord(updated);
    } catch (error) {
      console.error('Failed to update onboarding:', error);
    }
  };

  const handleNext = async () => {
    const nextStep = currentStep + 1;
    
    // Update step-specific completion flags
    const updates = { current_step: nextStep };
    
    if (currentStep === 1) updates.profile_completed = true;
    if (currentStep === 2) updates.bank_account_added = true;
    if (currentStep === 3) updates.viewed_contributions = true;
    if (currentStep === 4) updates.viewed_events = true;
    
    await updateProgress(updates);
    setCurrentStep(nextStep);
    
    // Check if we've completed all steps
    if (nextStep === STEPS.length - 1) {
      await updateProgress({
        is_completed: true,
        completed_at: new Date().toISOString()
      });
    }
  };

  const handleBack = () => {
    setCurrentStep(Math.max(0, currentStep - 1));
  };

  const handleSkip = async () => {
    if (onboardingRecord) {
      await updateProgress({ skipped: true });
    }
    onSkip();
  };

  const handleFinish = () => {
    toast.success('Welcome aboard! 🎉');
    onComplete();
  };

  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const CurrentIcon = STEPS[currentStep].icon;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-6 text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
              <Sparkles className="h-10 w-10 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">
                Welcome, {member?.first_name}!
              </h3>
              <p className="text-gray-600">
                We're excited to have you as part of our mutual aid community. 
                This quick tour will help you get started.
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-4 mt-8">
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="pt-6 text-center">
                  <DollarSign className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">Contribute</p>
                  <p className="text-xs text-gray-600 mt-1">Support members in need</p>
                </CardContent>
              </Card>
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6 text-center">
                  <Wallet className="h-8 w-8 text-green-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">Receive</p>
                  <p className="text-xs text-gray-600 mt-1">Get help when needed</p>
                </CardContent>
              </Card>
              <Card className="bg-purple-50 border-purple-200">
                <CardContent className="pt-6 text-center">
                  <Users className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm font-medium">Connect</p>
                  <p className="text-xs text-gray-600 mt-1">Build community bonds</p>
                </CardContent>
              </Card>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-6 py-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Why complete your profile?</p>
                <p className="text-blue-700">
                  A complete profile helps us process payments and communicate with you effectively.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium">Basic information</span>
              </div>
              
              <div className="p-4 border-2 border-dashed rounded-lg">
                <p className="font-medium mb-2">Next: Add your contact details</p>
                <p className="text-sm text-gray-600">
                  Update your phone number, address, and emergency contact in your profile settings.
                </p>
                <Button variant="outline" size="sm" className="mt-3">
                  Go to Profile Settings
                </Button>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-xs text-gray-600">
                💡 <strong>Tip:</strong> Keep your contact information up-to-date to receive important notifications.
              </p>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex gap-3">
              <Wallet className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-green-900">
                <p className="font-medium mb-1">Set up your payout method</p>
                <p className="text-green-700">
                  To receive benefit payouts, you'll need to add your bank account information.
                </p>
              </div>
            </div>

            <Card className="border-2">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <CreditCard className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium">Bank Account Transfer</p>
                    <p className="text-sm text-gray-600">Secure ACH deposits (3-5 days)</p>
                  </div>
                </div>
                
                <div className="bg-blue-50 rounded-lg p-3 text-sm">
                  <p className="text-blue-900">
                    🔒 Your banking information is encrypted and securely stored with Stripe, 
                    a trusted payment processor used by millions.
                  </p>
                </div>

                {member?.stripe_bank_account_id ? (
                  <div className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    <span className="font-medium">Bank account connected</span>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full">
                    Add Bank Account in Profile
                  </Button>
                )}
              </CardContent>
            </Card>

            <p className="text-xs text-gray-500 text-center">
              You can add or update your bank account anytime from your profile settings.
            </p>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <DollarSign className="h-12 w-12 text-green-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">How Contributions Work</h3>
              <p className="text-gray-600">
                Members contribute to a shared fund that helps those in need.
              </p>
            </div>

            <div className="space-y-3">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-blue-600">1</span>
                    </div>
                    <div>
                      <p className="font-medium">Event Triggered</p>
                      <p className="text-sm text-gray-600">
                        When a member experiences a qualifying event (hospitalization, loss, etc.), 
                        a contribution request is created.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-green-600">2</span>
                    </div>
                    <div>
                      <p className="font-medium">Members Contribute</p>
                      <p className="text-sm text-gray-600">
                        All active members contribute a set amount to support the affected member.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex gap-4">
                    <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <span className="font-bold text-purple-600">3</span>
                    </div>
                    <div>
                      <p className="font-medium">Payout Delivered</p>
                      <p className="text-sm text-gray-600">
                        Funds are disbursed directly to the member's bank account.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm text-yellow-900">
                📧 You'll receive email notifications for new contribution requests with payment instructions.
              </p>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <Calendar className="h-12 w-12 text-purple-600 mx-auto mb-3" />
              <h3 className="text-xl font-bold mb-2">Events & Community</h3>
              <p className="text-gray-600">
                Stay connected and participate in community activities.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardContent className="pt-6">
                  <Calendar className="h-8 w-8 text-blue-600 mb-3" />
                  <p className="font-medium mb-1">Community Events</p>
                  <p className="text-sm text-gray-700">
                    Join gatherings, fundraisers, and social events to build connections.
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardContent className="pt-6">
                  <Users className="h-8 w-8 text-purple-600 mb-3" />
                  <p className="font-medium mb-1">Member Forum</p>
                  <p className="text-sm text-gray-700">
                    Connect with other members, share experiences, and participate in discussions.
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3 mb-4">
                  <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Check Upcoming Events</p>
                    <p className="text-sm text-gray-600">
                      View the calendar to see upcoming events and RSVP to attend.
                    </p>
                  </div>
                </div>
                <Button variant="outline" className="w-full">
                  View Event Calendar
                </Button>
              </CardContent>
            </Card>

            <div className="bg-green-50 rounded-lg p-4">
              <p className="text-sm text-green-900">
                ✨ <strong>Pro tip:</strong> Active participation strengthens our community and creates lasting friendships!
              </p>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6 text-center py-8">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="h-10 w-10 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold mb-2">You're All Set!</h3>
              <p className="text-gray-600">
                You've completed the onboarding process. Welcome to the community!
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-8">
              <Card className="text-left">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-blue-600" />
                    Next Steps
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Complete your full profile details</li>
                    <li>• Add your bank account for payouts</li>
                    <li>• Browse upcoming events</li>
                    <li>• Join the community forum</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="text-left">
                <CardContent className="pt-6">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Info className="h-5 w-5 text-purple-600" />
                    Need Help?
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li>• Check FAQs in Community</li>
                    <li>• Contact administrators</li>
                    <li>• Review your member portal</li>
                    <li>• Explore the dashboard</li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mt-6">
              <p className="text-sm text-gray-700">
                🎉 Thank you for joining us! Together, we create a stronger, more supportive community.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleSkip}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <CurrentIcon className="h-5 w-5 text-blue-600" />
              {STEPS[currentStep].title}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-gray-500">
            <span>Step {currentStep + 1} of {STEPS.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="flex justify-between mb-4">
          {STEPS.map((step, index) => {
            const StepIcon = step.icon;
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            
            return (
              <div key={step.id} className="flex flex-col items-center flex-1">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all ${
                  isCompleted ? 'bg-green-100 border-green-500' :
                  isCurrent ? 'bg-blue-100 border-blue-500' :
                  'bg-gray-100 border-gray-300'
                }`}>
                  {isCompleted ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <StepIcon className={`h-5 w-5 ${
                      isCurrent ? 'text-blue-600' : 'text-gray-400'
                    }`} />
                  )}
                </div>
                <p className={`text-xs mt-1 text-center ${
                  isCurrent ? 'font-medium text-gray-900' : 'text-gray-500'
                }`}>
                  {step.title}
                </p>
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[300px]">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>

          <div className="flex gap-2">
            {currentStep < STEPS.length - 1 ? (
              <>
                <Button variant="ghost" onClick={handleSkip}>
                  Skip for now
                </Button>
                <Button onClick={handleNext}>
                  Next
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </>
            ) : (
              <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700">
                <CheckCircle className="h-4 w-4 mr-2" />
                Get Started
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}