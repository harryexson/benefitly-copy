import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Users, Calendar, DollarSign, Settings, CheckCircle } from 'lucide-react';

export default function WelcomeModal({ isOpen, onClose, organizationName }) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-6 w-6 text-blue-600" />
            <DialogTitle className="text-2xl">Welcome to Benefitly!</DialogTitle>
          </div>
          <DialogDescription className="text-base">
            We're excited to help {organizationName || 'your organization'} streamline member management and mutual aid operations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="font-semibold text-lg mb-3">What You Can Do with Benefitly:</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Users className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Manage Members</p>
                  <p className="text-sm text-gray-600">Keep track of your member directory, contact information, and contribution history</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Organize Events</p>
                  <p className="text-sm text-gray-600">Create events that trigger contribution collection from your members</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Process Contributions & Payouts</p>
                  <p className="text-sm text-gray-600">Securely collect contributions and disburse benefit payouts to members</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Settings className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Customize Settings</p>
                  <p className="text-sm text-gray-600">Configure payment processing, financial accounts, and operational preferences</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">Follow the Setup Guide</p>
                <p className="text-sm text-blue-700 mt-1">
                  We've created a step-by-step checklist to help you get up and running quickly. 
                  Look for the "Getting Started" panel on your dashboard.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center pt-4 border-t">
            <p className="text-xs text-gray-500">
              Questions? Contact our support team anytime.
            </p>
            <Button onClick={onClose}>
              Get Started →
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}