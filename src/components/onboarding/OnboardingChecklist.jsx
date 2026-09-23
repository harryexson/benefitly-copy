import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles, ExternalLink, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { cn } from '@/lib/utils';

const OnboardingStep = ({ step, isCompleted, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-3 p-3 rounded-lg transition-all text-left w-full hover:bg-gray-50",
        isCompleted && "opacity-60"
      )}
    >
      {isCompleted ? (
        <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
      ) : (
        <Circle className="h-5 w-5 text-gray-300 flex-shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <p className={cn("font-medium text-sm", isCompleted && "line-through text-gray-500")}>
            {step.title}
          </p>
          {step.optional && !isCompleted && (
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">Optional</span>
          )}
        </div>
        {!isCompleted && (
          <p className="text-xs text-gray-500 mt-1">{step.description}</p>
        )}
      </div>
    </button>
  );
};

export default function OnboardingChecklist({ progress, onDismiss, onNavigate }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const steps = [
    {
      id: 'profile_completed',
      title: 'Complete Organization Profile',
      description: 'Add your organization details and contact information',
      action: () => onNavigate('Settings'),
      completed: progress?.profile_completed
    },
    {
      id: 'stripe_connected',
      title: 'Connect Stripe Account',
      description: 'Set up payment processing to collect contributions',
      action: () => onNavigate('Settings'),
      completed: progress?.stripe_connected
    },
    {
      id: 'tremendous_connected',
      title: 'Connect Tremendous for Global Payouts',
      description: 'Enable flexible payout options (bank, PayPal, Venmo, cards)',
      action: () => onNavigate('Settings'),
      completed: progress?.tremendous_connected,
      optional: true
    },
    {
      id: 'first_member_added',
      title: 'Add Your First Member',
      description: 'Start building your member directory',
      action: () => onNavigate('Members'),
      completed: progress?.first_member_added
    },
    {
      id: 'payout_info_set',
      title: 'Set Up Member Payout Info',
      description: 'Configure how members will receive benefit payouts',
      action: () => onNavigate('Members'),
      completed: progress?.payout_info_set
    },
    {
      id: 'first_event_created',
      title: 'Create Your First Event',
      description: 'Set up an event to start collecting contributions',
      action: () => onNavigate('Events'),
      completed: progress?.first_event_created
    },
    {
      id: 'financial_settings_reviewed',
      title: 'Review Financial Settings',
      description: 'Configure payment collection and payout preferences',
      action: () => onNavigate('Settings'),
      completed: progress?.financial_settings_reviewed
    }
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const totalSteps = steps.length;
  const progressPercentage = (completedSteps / totalSteps) * 100;
  const isFullyCompleted = completedSteps === totalSteps;

  if (!isExpanded) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <button
            onClick={() => setIsExpanded(true)}
            className="flex items-center justify-between w-full"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Getting Started Guide</span>
              <span className="text-xs text-gray-500">({completedSteps}/{totalSteps})</span>
            </div>
            <ChevronDown className="h-4 w-4" />
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-lg">Getting Started</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
        <div className="space-y-2 mt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              {isFullyCompleted ? 'Setup Complete! 🎉' : `${completedSteps} of ${totalSteps} steps completed`}
            </span>
            <span className="font-semibold text-blue-600">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      </CardHeader>
      <CardContent className="space-y-1">
        {!isFullyCompleted && completedSteps === 0 && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Zap className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-900">Quick Start Available</p>
                <p className="text-xs text-yellow-700 mt-1">
                  Use our guided onboarding wizard for a streamlined setup experience
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 border-yellow-300 hover:bg-yellow-100"
                  asChild
                >
                  <Link to={createPageUrl('OnboardingWizard')}>
                    Start Wizard
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        )}

        {steps.map((step) => (
          <OnboardingStep
            key={step.id}
            step={step}
            isCompleted={step.completed}
            onClick={step.action}
          />
        ))}

        {isFullyCompleted && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm font-medium text-green-900 mb-2">
              🎉 Congratulations! You've completed the setup.
            </p>
            <p className="text-xs text-green-700 mb-3">
              Your association is now ready to manage members, events, and contributions.
            </p>
            <Button
              onClick={onDismiss}
              variant="outline"
              size="sm"
              className="w-full border-green-300 hover:bg-green-100"
            >
              Dismiss Guide
            </Button>
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
            <ExternalLink className="h-3 w-3" />
            Need Help?
          </p>
          <div className="space-y-1">
            <a href="#" className="text-xs text-blue-600 hover:underline block">
              📖 View Documentation
            </a>
            <a href="#" className="text-xs text-blue-600 hover:underline block">
              💬 Contact Support
            </a>
            <a href="#" className="text-xs text-blue-600 hover:underline block">
              🎥 Watch Video Tutorials
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}