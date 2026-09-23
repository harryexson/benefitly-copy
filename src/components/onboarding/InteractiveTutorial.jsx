import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const tutorialSteps = [
  {
    id: 'welcome',
    title: 'Welcome to Benefitly!',
    description: 'Let\'s take a comprehensive tour of all features to help you get started with your association management.',
    target: null,
    position: 'center'
  },
  {
    id: 'dashboard',
    title: 'Dashboard Overview',
    description: 'Your central hub for viewing key metrics, recent activity, and quick stats about your association.',
    target: '[data-tutorial-target="dashboard"]',
    position: 'right'
  },
  {
    id: 'myportal',
    title: 'My Portal',
    description: 'Your personal member portal where you can view your profile, contributions, and manage your account settings.',
    target: '[data-tutorial-target="memberportal"]',
    position: 'right'
  },
  {
    id: 'members',
    title: 'Manage Members',
    description: 'Add and manage your association members. Track their contributions, engagement, and contact information all in one place.',
    target: '[data-tutorial-target="members"]',
    position: 'right'
  },
  {
    id: 'events',
    title: 'Organize Events',
    description: 'Create mutual aid events, fundraisers, and community gatherings. Set contribution amounts and track RSVPs.',
    target: '[data-tutorial-target="events"]',
    position: 'right'
  },
  {
    id: 'upcomingevents',
    title: 'Upcoming Events',
    description: 'View all upcoming events in a clean, organized list. RSVP and purchase tickets for events.',
    target: '[data-tutorial-target="upcomingevents"]',
    position: 'right'
  },
  {
    id: 'eventcalendar',
    title: 'Event Calendar',
    description: 'Visualize all your events in a monthly calendar view. Quickly see what\'s happening and when.',
    target: '[data-tutorial-target="eventcalendar"]',
    position: 'right'
  },
  {
    id: 'volunteers',
    title: 'Volunteer Management',
    description: 'Coordinate volunteers for your events. Track volunteer sign-ups, assignments, and attendance.',
    target: '[data-tutorial-target="volunteers"]',
    position: 'right'
  },
  {
    id: 'payouts',
    title: 'Process Payouts',
    description: 'Approve and disburse benefit payments to members. Track payout status and integrate with Stripe for seamless transfers.',
    target: '[data-tutorial-target="payouts"]',
    position: 'right'
  },
  {
    id: 'expenses',
    title: 'Track Expenses',
    description: 'Record and categorize association expenses. Upload receipts and manage your operational costs efficiently.',
    target: '[data-tutorial-target="expenses"]',
    position: 'right'
  },
  {
    id: 'reports',
    title: 'Financial Reports',
    description: 'Generate comprehensive financial reports, track contributions vs payouts, and schedule automated reports for your team.',
    target: '[data-tutorial-target="reports"]',
    position: 'right'
  },
  {
    id: 'community',
    title: 'Community Hub',
    description: 'Engage with your members through announcements, discussions, and direct messaging. Build a stronger community.',
    target: '[data-tutorial-target="community"]',
    position: 'right'
  },
  {
    id: 'proposals',
    title: 'Member Proposals',
    description: 'Create and vote on association proposals. Enable democratic decision-making within your organization.',
    target: '[data-tutorial-target="proposals"]',
    position: 'right'
  },
  {
    id: 'myfinances',
    title: 'My Finances',
    description: 'View your personal financial dashboard showing your contributions, payments, and benefit history.',
    target: '[data-tutorial-target="memberfinancialdashboard"]',
    position: 'right'
  },
  {
    id: 'usermanagement',
    title: 'User Management',
    description: 'Invite and manage users who have access to your association\'s admin panel. Assign roles and permissions.',
    target: '[data-tutorial-target="associationusers"]',
    position: 'right'
  },
  {
    id: 'rolemanagement',
    title: 'Role Management',
    description: 'Create custom roles with specific permissions. Control what different users can see and do in your association.',
    target: '[data-tutorial-target="rolemanagement"]',
    position: 'right'
  },
  {
    id: 'settings',
    title: 'Configure Settings',
    description: 'Customize your association settings, manage Stripe integration, and configure payment preferences.',
    target: '[data-tutorial-target="settings"]',
    position: 'right'
  },
  {
    id: 'complete',
    title: 'You\'re All Set!',
    description: 'You now have a complete overview of all features. Start exploring and building your association community!',
    target: null,
    position: 'center'
  }
];

export default function InteractiveTutorial({ isOpen, onClose, onComplete }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [highlightElement, setHighlightElement] = useState(null);

  useEffect(() => {
    if (isOpen && tutorialSteps[currentStep].target) {
      const element = document.querySelector(tutorialSteps[currentStep].target);
      if (element) {
        setHighlightElement(element);
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    } else {
      setHighlightElement(null);
    }
  }, [currentStep, isOpen]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    if (onComplete) onComplete();
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  const step = tutorialSteps[currentStep];
  const isCenter = step.position === 'center';

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-[100]" onClick={handleSkip} />

      {/* Highlight */}
      {highlightElement && (
        <div
          className="fixed z-[101] pointer-events-none"
          style={{
            top: highlightElement.getBoundingClientRect().top - 8,
            left: highlightElement.getBoundingClientRect().left - 8,
            width: highlightElement.getBoundingClientRect().width + 16,
            height: highlightElement.getBoundingClientRect().height + 16,
            border: '3px solid #3b82f6',
            borderRadius: '8px',
            boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.2)',
          }}
        />
      )}

      {/* Tutorial Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className={`fixed z-[102] ${
            isCenter
              ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2'
              : 'top-1/2 left-80 -translate-y-1/2 ml-8'
          }`}
        >
          <Card className="w-96 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Step {currentStep + 1} of {tutorialSteps.length}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleSkip}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <p className="text-gray-700 mb-6">{step.description}</p>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-1.5 mb-6">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep + 1) / tutorialSteps.length) * 100}%` }}
                />
              </div>

              <div className="flex justify-between items-center">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className="text-gray-600"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>

                <div className="flex gap-2">
                  {currentStep < tutorialSteps.length - 1 && (
                    <Button variant="outline" onClick={handleSkip}>
                      Skip Tour
                    </Button>
                  )}
                  <Button onClick={handleNext}>
                    {currentStep === tutorialSteps.length - 1 ? (
                      <>
                        <Check className="h-4 w-4 mr-2" />
                        Finish
                      </>
                    ) : (
                      <>
                        Next
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </>
  );
}