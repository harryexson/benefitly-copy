import React, { useState, useEffect, useCallback } from 'react';
import { Member, Event, EventContribution, Payout, AssociationAccount, OnboardingProgress } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, DollarSign, ArrowRight, CreditCard, Ban, Sparkles, TrendingUp, TrendingDown, AlertTriangle, Calendar } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import AssociationSignupForm from '../components/public/AssociationSignupForm';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { format, subDays, startOfMonth, endOfMonth, eachMonthOfInterval, startOfYear, startOfQuarter, endOfQuarter } from 'date-fns';
import DashboardSummaryChart from '../components/dashboard/DashboardSummaryChart';
import OnboardingChecklist from '../components/onboarding/OnboardingChecklist';
import WelcomeModal from '../components/onboarding/WelcomeModal';
import EventDetailsModal from '../components/events/EventDetailsModal';

// COMPETITIVE PRICING - Optimized for market dominance (50-90% cheaper than competitors)
const publicTiers = [
  {
    id: 'community',
    name: 'Community',
    member_limit: 50,
    monthly_price: 35,
    yearly_price: 350,
    features: [
      'Up to 50 members',
      'Member & Event Management',
      'Contribution Collection',
      'Basic Benefit Payouts',
      'Standard Reports',
      'Email Support',
    ],
    is_active: true
  },
  {
    id: 'starter',
    name: 'Starter',
    member_limit: 100,
    monthly_price: 33,
    yearly_price: 330,
    features: [
      'Up to 100 members',
      'All Community features, plus:',
      'Advanced Payout Management',
      'PDF & CSV Reports',
      'Stripe Integration',
      'Email Reminders',
    ],
    is_active: true,
    comparison_text: '45% cheaper than Wild Apricot',
    tagline: 'Best for small associations'
  },
  {
    id: 'growth',
    name: 'Growth',
    member_limit: 300,
    monthly_price: 66,
    yearly_price: 660,
    features: [
      'Up to 300 members',
      'All Starter features, plus:',
      'Volunteer Management',
      'Bulk Payout Processing',
      'Custom Email Templates',
      'Advanced User Roles',
      'Priority Support',
    ],
    is_active: true,
    comparison_text: '45% cheaper than Wild Apricot',
    tagline: 'Growing communities'
  },
  {
    id: 'scale',
    name: 'Scale',
    member_limit: 1000,
    monthly_price: 165,
    yearly_price: 1650,
    features: [
      'Up to 1,000 members',
      'All Growth features, plus:',
      'Automated Report Delivery',
      'White-Glove Onboarding',
      'Dedicated Account Manager',
      'API Access',
      'Phone & Email Support',
    ],
    is_active: true,
    comparison_text: '45% cheaper than Wild Apricot',
    tagline: 'Large associations'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    member_limit: '1000+',
    monthly_price: 'Custom',
    yearly_price: null,
    features: [
      'Over 1,000 members',
      'All Scale features, plus:',
      'Dedicated Infrastructure',
      'Custom Integrations',
      'Custom SSO Integration',
      '24/7 Phone Support',
      'SLA Guarantee',
    ],
    is_active: true,
    is_custom: true
  }
];

const TIME_PERIODS = [
  { value: '30days', label: 'Last 30 Days' },
  { value: '90days', label: 'Last 90 Days' },
  { value: 'currentMonth', label: 'This Month' },
  { value: 'currentQuarter', label: 'This Quarter' },
  { value: 'yearToDate', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' }
];

const StatCard = ({ title, value, icon: Icon, change, changeType, isLoading }) => (
  <Card className="shadow-sm hover:shadow-md transition-shadow">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-gray-500">{title}</CardTitle>
      <Icon className={`h-5 w-5 text-gray-400`} />
    </CardHeader>
    <CardContent>
      {isLoading ? (
        <>
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-16" />
        </>
      ) : (
        <>
          <div className="text-3xl font-bold text-gray-800">{value}</div>
          {change !== undefined && (
            <p className={`text-xs ${changeType === 'increase' ? 'text-green-600' : 'text-red-600'} flex items-center`}>
              {changeType === 'increase' ? <TrendingUp className="w-4 h-4 mr-1"/> : <TrendingDown className="w-4 h-4 mr-1"/>}
              {change} vs previous period
            </p>
          )}
        </>
      )}
    </CardContent>
  </Card>
);

export default function Dashboard({ user: currentUser }) {
  const [stats, setStats] = useState({ revenue: 0, newMembers: 0, payouts: 0, netIncome: 0, totalMembers: 0, pendingMembers: 0, pendingPayouts: 0, pendingContributions: 0 });
  const [chartData, setChartData] = useState([]);
  const [associationAccount, setAssociationAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSignupOpen, setIsSignupOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState(null);
  const [accountSuspended, setAccountSuspended] = useState(false);
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const navigate = useNavigate();

  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Onboarding state
  const [onboardingProgress, setOnboardingProgress] = useState(null);
  const [showWelcomeModal, setShowWelcomeModal] = useState(false); // This will largely be superseded by the wizard redirect
  const [showOnboardingChecklist, setShowOnboardingChecklist] = useState(true);
  const [shouldShowOnboarding, setShouldShowOnboarding] = useState(false); // New state for wizard redirect
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);

  const getDateRange = useCallback(() => {
    const today = new Date();
    let startDate, endDate;

    switch (selectedPeriod) {
      case '30days':
        startDate = subDays(today, 29);
        endDate = today;
        break;
      case '90days':
        startDate = subDays(today, 89);
        endDate = today;
        break;
      case 'currentMonth':
        startDate = startOfMonth(today);
        endDate = endOfMonth(today);
        break;
      case 'currentQuarter':
        startDate = startOfQuarter(today);
        endDate = endOfQuarter(today);
        break;
      case 'yearToDate':
        startDate = startOfYear(today);
        endDate = today;
        break;
      case 'custom':
        // Ensure custom dates are valid, fallback to 30 days if not
        const start = customStartDate ? new Date(customStartDate) : subDays(today, 29);
        const end = customEndDate ? new Date(customEndDate) : today;
        startDate = isNaN(start.getTime()) ? subDays(today, 29) : start;
        endDate = isNaN(end.getTime()) ? today : end;
        break;
      default:
        startDate = subDays(today, 29);
        endDate = today;
    }
    return { startDate, endDate };
  }, [selectedPeriod, customStartDate, customEndDate]);

  const updateOnboardingProgress = useCallback(async (updates) => {
    if (!onboardingProgress) return;
    
    try {
      const updated = await OnboardingProgress.update(onboardingProgress.id, updates);
      setOnboardingProgress(updated);
      
      // Check if all steps are completed
      const allCompleted = 
        updated.profile_completed &&
        updated.stripe_connected &&
        updated.first_member_added &&
        updated.payout_info_set &&
        updated.first_event_created &&
        updated.financial_settings_reviewed;
      
      if (allCompleted && !updated.is_completed) {
        // Mark as completed if all steps are done and it wasn't already marked
        await OnboardingProgress.update(onboardingProgress.id, { is_completed: true });
        setShowOnboardingChecklist(false);
      } else if (!allCompleted && updated.is_completed) {
        // If it was marked completed but now steps are missing, revert to not completed
        await OnboardingProgress.update(onboardingProgress.id, { is_completed: false });
        setShowOnboardingChecklist(true);
      } else if (allCompleted && updated.is_completed) {
        // All completed and already marked completed, hide checklist
        setShowOnboardingChecklist(false);
      } else if (!allCompleted && !updated.is_completed) {
        // Not all completed and not marked completed, show checklist
        setShowOnboardingChecklist(true);
      }

    } catch (error) {
      console.error('Failed to update onboarding progress:', error);
    }
  }, [onboardingProgress]); // Depend on onboardingProgress to ensure latest state is used for ID

  const processOnboardingProgress = async (accountId, existingProgress) => {
    try {
      let progress = existingProgress;

      if (!progress) {
        // Create initial onboarding progress
        progress = await OnboardingProgress.create({
          association_account_id: accountId,
          is_completed: false,
          welcome_modal_seen: false,
          profile_completed: false,
          stripe_connected: false,
          first_member_added: false,
          payout_info_set: false,
          first_event_created: false,
          financial_settings_reviewed: false,
        });
        setOnboardingProgress(progress);
        setShowOnboardingChecklist(true);
      } else {
        setOnboardingProgress(progress);
        setShowOnboardingChecklist(!progress.is_completed);
      }
      return progress;
    } catch (error) {
      console.error('Failed to process onboarding progress:', error);
      return null;
    }
  };

  const loadDashboardData = useCallback(async () => {
    if (!currentUser) {
        setIsLoading(false);
        return;
    }

    try {
      // Check if user already has an association account
      if (currentUser.association_account_id) {
        // User has association - ALWAYS load dashboard, never show signup
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('signup_tier')) {
          // Remove signup_tier parameter - they already have an account
          navigate(createPageUrl('Dashboard'), { replace: true });
        }
        // Continue to load their dashboard data below
      } else {
        // User doesn't have association - handle signup flow OR redirect back office users
        if (currentUser.back_office_role && currentUser.back_office_role !== 'None') {
          // Back office users without association account go to back office
          navigate(createPageUrl('BackOfficeHub'));
          return;
        }
        
        // Regular users without association - check for signup intent
        setIsLoading(false);
        const urlParams = new URLSearchParams(window.location.search);
        const signupTierId = urlParams.get('signup_tier');
        if (signupTierId) {
          const tier = publicTiers.find(t => t.id === signupTierId);
          if (tier) {
            setSelectedTier(tier);
            setIsSignupOpen(true);
          } else {
            navigate(createPageUrl('Dashboard'), { replace: true });
          }
        }
        // If no signup_tier and no association, show plan selection on dashboard
        return;
      }

      // User has association - continue loading dashboard data

      setIsLoading(true);
      
      // Fetch all data in a single parallel call to minimize API requests
      const [accounts, progressRecords, members, contributions, payouts, events] = await Promise.all([
        AssociationAccount.list(),
        OnboardingProgress.filter({ association_account_id: currentUser.association_account_id }),
        Member.list(),
        EventContribution.list(),
        Payout.list(),
        Event.list('-created_date'),
      ]);
      
      const userAccount = accounts.find(a => a.id === currentUser.association_account_id);
      setAssociationAccount(userAccount);

      if (userAccount?.account_status === 'suspended') {
        setAccountSuspended(true);
        setIsLoading(false);
        return;
      }

      // Process onboarding progress from already-fetched data
      const existingProgress = progressRecords.length > 0 ? progressRecords[0] : null;
      const currentOnboardingProgress = await processOnboardingProgress(currentUser.association_account_id, existingProgress);

      // Only redirect to onboarding wizard if user has an association and hasn't completed it
      if (currentOnboardingProgress && !currentOnboardingProgress.is_completed && !currentOnboardingProgress.welcome_modal_seen && userAccount) {
        setShouldShowOnboarding(true);
        setIsLoading(false);
        return;
      }

      const { startDate, endDate } = getDateRange();

      // Check and update onboarding progress based on actual data (deferred to avoid extra API calls)
      if (currentOnboardingProgress) {
        const updates = {};
        
        if (!currentOnboardingProgress.first_member_added && members.length > 0) {
          updates.first_member_added = true;
        }
        
        if (!currentOnboardingProgress.payout_info_set && members.some(m => m.payout_method && m.payout_method !== 'Not Set')) {
          updates.payout_info_set = true;
        }

        if (Object.keys(updates).length > 0) {
          // Update in background, don't await to avoid blocking
          OnboardingProgress.update(currentOnboardingProgress.id, updates).catch(console.error);
        }
      }

      // Calculate stats for the period
      const newMembers = members.filter(m => {
        const joinedDate = m.joined_at ? new Date(m.joined_at) : null;
        return joinedDate && joinedDate >= startDate && joinedDate <= endDate;
      }).length;

      const revenue = contributions
        .filter(c => c.status === 'Paid' && c.paid_at && new Date(c.paid_at) >= startDate && new Date(c.paid_at) <= endDate)
        .reduce((sum, c) => sum + (c.amount_paid || 0), 0);

      const payoutsDisbursed = payouts
        .filter(p => p.status === 'Disbursed' && p.paid_at && new Date(p.paid_at) >= startDate && new Date(p.paid_at) <= endDate)
        .reduce((sum, p) => sum + p.amount, 0);

      // Count pending contributions for current user
      const userMember = members.find(m => m.email === currentUser.email);
      const pendingContributions = userMember 
        ? contributions.filter(c => c.member_id === userMember.id && (c.status === 'Due' || c.status === 'Past Due')).length
        : 0;

      setStats({
        totalMembers: members.length,
        newMembers: newMembers,
        revenue: revenue,
        payouts: payoutsDisbursed,
        netIncome: revenue - payoutsDisbursed,
        pendingMembers: members.filter(m => m.status === 'Pending').length,
        pendingPayouts: payouts.filter(p => p.status === 'Pending Approval').length,
        pendingContributions: pendingContributions,
      });

      // Prepare chart data - currently aggregated by month. Can be adapted for day/week.
      const chartInterval = eachMonthOfInterval({ start: startDate, end: endDate });
      const monthlyData = chartInterval.map(intervalStart => {
        const intervalEnd = endOfMonth(intervalStart); // Assuming monthly intervals for now
        const periodLabel = format(intervalStart, 'MMM yyyy');

        const monthlyRevenue = contributions
          .filter(c => c.status === 'Paid' && c.paid_at && new Date(c.paid_at) >= intervalStart && new Date(c.paid_at) <= intervalEnd)
          .reduce((sum, c) => sum + (c.amount_paid || 0), 0);
        
        const monthlyPayouts = payouts
          .filter(p => p.status === 'Disbursed' && p.paid_at && new Date(p.paid_at) >= intervalStart && new Date(p.paid_at) <= intervalEnd)
          .reduce((sum, p) => sum + p.amount, 0);

        return { period: periodLabel, revenue: monthlyRevenue, payouts: monthlyPayouts };
      });

      setChartData(monthlyData);

      // Find current user's member profile
      const currentMember = members.find(m => m.email === currentUser.email);

      // Define event categories
      const contributionEventTypes = ['Death', 'Hospitalization', 'Loss of Loved One', 'Other'];
      const communityEventTypes = ['Fundraising Dinner', 'Community Fair', 'Family Day', 'Partner Banquet', 'General Meeting', 'Workshop', 'Social Gathering'];

      // Get all upcoming/active events
      const allActiveEvents = events
        .filter(e => (e.status === 'Announced' || e.status === 'Published' || e.status === 'Collecting'))
        .sort((a, b) => new Date(a.event_date) - new Date(b.event_date));

      // Process all events and categorize them
      const processedEvents = allActiveEvents.map((event) => {
        const isContributionEvent = contributionEventTypes.includes(event.type);
        const isCommunityEvent = communityEventTypes.includes(event.type);

        let userContrib = null;
        let requiresPayment = false;

        if (currentMember) {
          // Check for contribution requirement
          if (event.contribution_amount > 0) {
            userContrib = contributions.find(c => 
              c.event_id === event.id && c.member_id === currentMember.id
            );

            if (!userContrib) {
              console.warn(`No contribution record found for member ${currentMember.id} and event ${event.id}`);
            }

            requiresPayment = userContrib && (userContrib.status === 'Due' || userContrib.status === 'Past Due');
          }

          // Check for ticket requirement (paid events)
          if (!requiresPayment && event.is_paid_event && event.ticket_price > 0) {
            // Check if user has already purchased ticket
            const userTicket = contributions.find(c => 
              c.event_id === event.id && c.member_id === currentMember.id && c.status === 'Paid'
            );
            // For paid events, we show them but don't require payment if already paid
            requiresPayment = !userTicket;
          }
        }

        return {
          ...event,
          userContribution: userContrib,
          requiresPayment: requiresPayment,
          isContributionEvent: isContributionEvent,
          isCommunityEvent: isCommunityEvent
        };
      });

      setUpcomingEvents(processedEvents);

      setIsLoading(false);

    } catch (error) {
      if (error.name === 'CanceledError' || (error.message && error.message.includes('aborted'))) {
        console.log('Data fetch aborted, likely due to component unmount or navigation.', error);
      } else {
        console.error("Dashboard fetchData error:", error);
        toast.error("Failed to load dashboard data. Please try again.");
      }
      setIsLoading(false);
    }
  }, [navigate, currentUser]);

  // Load data only once on mount or when currentUser changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchData = async () => {
      if (isMounted) {
        await loadDashboardData();
      }
    };
    
    fetchData();
    
    return () => {
      isMounted = false;
    };
  }, [currentUser?.id, currentUser?.association_account_id, loadDashboardData]);

  // Redirect to onboarding wizard if needed
  useEffect(() => {
    if (shouldShowOnboarding && onboardingProgress && !onboardingProgress.is_completed) {
      navigate(createPageUrl('OnboardingWizard'));
    }
  }, [shouldShowOnboarding, onboardingProgress, navigate]);

  const handleWelcomeModalClose = async () => {
    setShowWelcomeModal(false);
    // If we've made it here and welcome_modal_seen is false, it means we didn't redirect to wizard,
    // so we should mark it as seen now.
    if (onboardingProgress && !onboardingProgress.welcome_modal_seen) {
      await updateOnboardingProgress({ welcome_modal_seen: true });
    }
  };

  const handleDismissChecklist = async () => {
    setShowOnboardingChecklist(false);
    if (onboardingProgress) { // Ensure progress exists before trying to update
      await updateOnboardingProgress({ is_completed: true });
    }
  };

  const handleNavigateFromChecklist = (pageName) => {
    navigate(createPageUrl(pageName));
  };

  const handleSignupComplete = () => {
    setIsSignupOpen(false);
    setSelectedTier(null);
    toast.success("Association account created successfully!");
    navigate(createPageUrl('Dashboard'), { replace: true });
    window.location.reload();
  };

  const handleGoToBilling = () => {
    navigate(createPageUrl('Billing'));
  };

  const handleReviewMembers = () => {
    navigate(createPageUrl('Members', { activeTab: 'pending' }));
  };

  const handleProcessPayouts = () => {
    navigate(createPageUrl('Payouts', { activeTab: 'pending_approval' }));
  };

  // If account is suspended, show suspension notice
  if (accountSuspended && associationAccount) {
    const isAdmin = currentUser?.association_role === 'Administrator';
    
    return (
      <div className="space-y-6">
        <Alert className="border-red-200 bg-red-50">
          <Ban className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-2">
              <div className="font-semibold">Account Suspended</div>
              <div>
                {isAdmin 
                  ? 'Your association account has been suspended.' 
                  : 'Your organization\'s account has been suspended. Please contact your administrator.'}
              </div>
              {isAdmin && associationAccount.suspension_reason && (
                <div><strong>Reason:</strong> {associationAccount.suspension_reason}</div>
              )}
              {isAdmin && associationAccount.suspension_notes && (
                <div><strong>Details:</strong> {associationAccount.suspension_notes}</div>
              )}
              {isAdmin && associationAccount.suspension_reason === 'Non-payment / Overdue Account' && (
                <div className="pt-2">
                  <Button onClick={handleGoToBilling} className="bg-red-600 hover:bg-red-700">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Update Payment Information
                  </Button>
                </div>
              )}
              {!isAdmin && (
                <div className="pt-2">
                  <p className="text-sm">Please reach out to {associationAccount.point_of_contact_name} ({associationAccount.contact_email}) to resolve this issue.</p>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
        
        <Card>
          <CardContent className="p-8 text-center">
            <Ban className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-4">
              {isAdmin 
                ? 'Your account access has been temporarily restricted. Please contact support or resolve any outstanding issues.'
                : 'Your organization\'s account is currently suspended. Please contact your organization\'s administrator for assistance.'}
            </p>
            {isAdmin && associationAccount.suspension_reason === 'Non-payment / Overdue Account' && (
              <p className="text-sm text-gray-500">
                Once payment is processed, your access will be automatically restored within 24 hours.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Check if trial has expired and user needs to choose a subscription
  const isTrialExpired = associationAccount && 
    associationAccount.account_status === 'trial' && 
    associationAccount.trial_end_date && 
    new Date(associationAccount.trial_end_date) < new Date();

  // CRITICAL: Only show paywall to ADMINISTRATORS
  // Regular members see alert to contact admin
  if (!isLoading && isTrialExpired) {
    const isAdmin = currentUser?.association_role === 'Administrator';
    
    if (isAdmin) {
      // Show paywall to admin
      return (
        <Card className="shadow-lg border-2 border-orange-200">
          <CardContent className="p-10 text-center">
            <AlertTriangle className="h-16 w-16 text-orange-500 mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-gray-800 mb-3">Your Trial Has Ended</h2>
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Your 14-day free trial for <strong>{associationAccount.organization_name}</strong> has expired. 
              To continue using Benefitly and access all your data, please choose a subscription plan.
              <br /><br />
              <strong>Don't worry!</strong> All your data and settings are preserved. Simply choose a plan to continue where you left off.
            </p>
            <Button asChild size="lg">
              <Link to={createPageUrl('Billing')}>
                <CreditCard className="w-5 h-5 mr-2" />
                Choose a Plan to Continue
              </Link>
            </Button>
          </CardContent>
        </Card>
      );
    } else {
      // Show message to regular members to contact admin
      return (
        <div className="space-y-6">
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <div className="space-y-2">
                <div className="font-semibold">Organization Subscription Expired</div>
                <div>
                  Your organization's trial period has ended. Please contact your administrator to renew the subscription.
                </div>
                <div className="pt-2">
                  <p className="text-sm">
                    <strong>Contact:</strong> {associationAccount.point_of_contact_name} ({associationAccount.contact_email})
                  </p>
                </div>
              </div>
            </AlertDescription>
          </Alert>
          
          <Card>
            <CardContent className="p-8 text-center">
              <AlertTriangle className="h-16 w-16 text-orange-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Subscription Required</h2>
              <p className="text-gray-600 mb-4">
                Your organization's subscription has expired. Please ask your administrator to renew.
              </p>
            </CardContent>
          </Card>
        </div>
      );
    }
  }

  // Only show plan selection if user truly has no association (not during loading)
  // AND not a back office user
  if (!isLoading && !associationAccount && !isSignupOpen && !currentUser?.back_office_role) {
    const urlParams = new URLSearchParams(window.location.search);
    const signupTierId = urlParams.get('signup_tier');

    // Show plan selection only if no tier param and no association
    if (!signupTierId && !currentUser?.association_account_id) {
      return (
        <div className="space-y-6">
          <Card className="shadow-lg border-2 border-blue-200">
            <CardContent className="p-10 text-center">
              <Sparkles className="h-16 w-16 text-blue-500 mx-auto mb-6 animate-pulse" />
              <h2 className="text-3xl font-bold text-gray-800 mb-3">Welcome to Benefitly!</h2>
              <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
                You're just one step away from managing your mutual aid association with ease. 
                Choose a plan below to create your association account.
              </p>
            </CardContent>
          </Card>

          {/* Plan Selection Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {publicTiers.filter(t => !t.is_custom).map((tier) => (
              <Card key={tier.id} className={`relative ${tier.id === 'starter' ? 'border-2 border-blue-500 shadow-lg' : ''}`}>
                {tier.id === 'starter' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-blue-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    POPULAR
                  </div>
                )}
                <CardHeader>
                  <CardTitle>{tier.name}</CardTitle>
                  <p className="text-sm text-gray-500">{tier.tagline}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <span className="text-3xl font-bold">${tier.monthly_price}</span>
                    <span className="text-gray-500">/month</span>
                    {tier.yearly_price && (
                      <p className="text-sm text-green-600">
                        or ${tier.yearly_price}/year (save {Math.round((1 - tier.yearly_price / (tier.monthly_price * 12)) * 100)}%)
                      </p>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">Up to {tier.member_limit} members</p>
                  <ul className="space-y-1 text-sm">
                    {tier.features?.slice(0, 4).map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-green-500">✓</span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full" 
                    variant={tier.id === 'starter' ? 'default' : 'outline'}
                    onClick={() => {
                      setSelectedTier(tier);
                      setIsSignupOpen(true);
                    }}
                  >
                    Start Free Trial
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <p className="text-center text-gray-500 text-sm">
            All plans include a 14-day free trial. No credit card required.
          </p>
        </div>
      );
    }
  }

  const isAdmin = currentUser?.association_role === 'Administrator';
  const stripeNotConnected = associationAccount && !associationAccount.stripe_account_id;
  const stripeNotVerified = associationAccount && associationAccount.stripe_account_id && !associationAccount.stripe_charges_enabled;

  return (
    <div className="space-y-8">
      {/* Welcome Modal (will generally not open due to wizard redirect for new users) */}
      <WelcomeModal
        isOpen={showWelcomeModal}
        onClose={handleWelcomeModalClose}
        organizationName={associationAccount?.organization_name || 'Your Association'}
      />

      {/* Stripe Connection Warning */}
      {stripeNotConnected && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="flex items-center justify-between">
              <div>
                <strong>Payment Processing Not Set Up:</strong> {isAdmin 
                  ? 'Connect your Stripe account to accept member contributions and process payments.' 
                  : 'Your organization has not set up payment processing yet. Please contact your administrator.'}
              </div>
              {isAdmin && (
                <Button onClick={() => navigate(createPageUrl('Settings'))} variant="outline" size="sm">
                  Connect Stripe
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Stripe Verification Pending */}
      {stripeNotVerified && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <strong>Stripe Account Pending Verification:</strong> Your Stripe account is being verified. Payment processing will be enabled once verification is complete.
              </div>
              {isAdmin && (
                <Button onClick={() => navigate(createPageUrl('Settings'))} variant="outline" size="sm">
                  Check Status
                </Button>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Check for overdue payments */}
      {associationAccount && associationAccount.next_billing_date && (
        new Date(associationAccount.next_billing_date) < new Date() &&
        (associationAccount.account_status === 'active' || associationAccount.account_status === 'trial')
      ) && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <div className="flex items-center justify-between">
              <div>
                <strong>Payment Overdue:</strong> Your account has an overdue payment. Please update your billing information to avoid service interruption.
              </div>
              <Button onClick={handleGoToBilling} variant="outline" size="sm">
                Update Payment
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* SECTION 1: URGENT - EVENTS REQUIRING MEMBER CONTRIBUTIONS */}
      {!isLoading && !stripeNotConnected && upcomingEvents.some(e => e.isContributionEvent && e.requiresPayment) && (
        <div className="relative mb-10">
          {/* Animated glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-orange-500 to-red-500 animate-pulse rounded-3xl blur-2xl opacity-60"></div>

          <Card className="relative shadow-2xl border-[8px] border-red-600 bg-gradient-to-br from-red-100 via-orange-100 to-yellow-100 overflow-hidden">
            {/* Top alert stripe */}
            <div className="h-3 bg-gradient-to-r from-red-600 via-orange-500 to-red-600 animate-pulse"></div>

            <CardHeader className="bg-gradient-to-r from-red-200 via-orange-200 to-red-200 border-b-4 border-red-500 pb-6">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <CardTitle className="flex items-center gap-3 text-red-900 text-3xl md:text-4xl font-black">
                  <DollarSign className="h-12 w-12 animate-bounce text-red-700" />
                  🚨 URGENT CONTRIBUTIONS REQUIRED
                </CardTitle>
                <Badge className="bg-red-700 text-white text-xl px-8 py-3 animate-pulse font-black shadow-xl">
                  {upcomingEvents.filter(e => e.isContributionEvent && e.requiresPayment).length} DUE NOW
                </Badge>
              </div>
              <p className="text-xl text-red-900 font-bold mt-4 bg-red-50 p-4 rounded-xl border-2 border-red-300 shadow-inner">
                ⚠️ <strong>ACTION REQUIRED:</strong> These events require all members to contribute. Your payment is needed to support fellow members in times of need. Click <strong>PAY NOW</strong> to complete your contribution immediately.
              </p>
            </CardHeader>
            <CardContent className="space-y-6 pt-8 pb-8">
              {upcomingEvents.filter(e => e.isContributionEvent && e.requiresPayment).map(event => (
                <div key={event.id} className="relative group">
                  {/* Enhanced glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-orange-500 via-red-500 to-orange-500 rounded-3xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity"></div>

                  <div className="relative p-8 bg-white rounded-3xl border-[6px] border-red-600 shadow-2xl hover:shadow-3xl transition-all">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-8">
                      {/* Event Info */}
                      <div className="flex-1 space-y-5">
                        <div className="flex items-center gap-3 flex-wrap">
                          <Badge className={event.userContribution.status === 'Past Due' 
                            ? 'bg-red-800 text-white border-red-900 font-black text-lg px-8 py-3 animate-pulse shadow-2xl' 
                            : 'bg-orange-600 text-white border-orange-800 font-bold text-lg px-8 py-3 shadow-xl'}>
                            {event.userContribution.status === 'Past Due' ? '🚨 PAST DUE - URGENT' : '⚠️ PAYMENT DUE'}
                          </Badge>
                          {event.userContribution.designated_for && (
                            <Badge className="bg-purple-100 text-purple-800 text-sm px-3 py-1">
                              {event.userContribution.designated_for}
                            </Badge>
                          )}
                        </div>

                        <div>
                          <h3 className="font-black text-red-900 text-3xl mb-2 leading-tight">{event.title}</h3>
                          <p className="text-xl text-red-800 font-bold">{event.type}</p>
                          {event.description && (
                            <p className="text-gray-700 mt-2 text-sm">{event.description}</p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gradient-to-br from-red-50 to-orange-50 p-5 rounded-2xl border-3 border-red-300 shadow-inner">
                          <div>
                            <p className="text-sm font-semibold text-gray-600 mb-2">💵 AMOUNT DUE</p>
                            <p className="text-red-700 font-black text-4xl">${event.userContribution.amount_due.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-600 mb-2">📅 DUE DATE</p>
                            <p className="text-gray-900 font-bold text-xl">{format(new Date(event.userContribution.due_date), 'MMM d, yyyy')}</p>
                            <p className="text-xs text-gray-600 mt-1">
                              {Math.ceil((new Date(event.userContribution.due_date) - new Date()) / (1000 * 60 * 60 * 24))} days remaining
                            </p>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-600 mb-2">🎉 EVENT DATE</p>
                            <p className="text-gray-900 font-bold text-xl">{format(new Date(event.event_date), 'MMM d, yyyy')}</p>
                          </div>
                        </div>
                      </div>

                      {/* Payment Actions */}
                      <div className="flex flex-col gap-4 lg:min-w-[220px]">
                        <Button 
                          variant="outline"
                          size="lg"
                          className="border-2 border-gray-400 hover:bg-gray-50"
                          onClick={() => {
                            setSelectedEvent(event);
                            setIsEventModalOpen(true);
                          }}
                        >
                          📋 View Full Details
                        </Button>
                        <Button 
                          size="lg" 
                          className="bg-gradient-to-r from-green-600 via-green-700 to-green-600 hover:from-green-700 hover:via-green-800 hover:to-green-700 text-white font-black shadow-2xl text-xl px-10 py-10 transform hover:scale-105 active:scale-95 transition-all border-[6px] border-green-800 animate-pulse"
                          onClick={() => {
                            setSelectedEvent(event);
                            setIsEventModalOpen(true);
                          }}
                          disabled={stripeNotConnected || stripeNotVerified}
                        >
                          <CreditCard className="h-8 w-8 mr-3" />
                          {stripeNotConnected || stripeNotVerified ? '⚠️ PAYMENT UNAVAILABLE' : '💳 PAY NOW'}
                        </Button>
                        <p className="text-xs text-center text-gray-600 italic">
                          Secure payment via Stripe
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main dashboard content */}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Dashboard</h2>
              <p className="text-gray-500">Welcome back! Here's a summary of your association's activity.</p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select period" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_PERIODS.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedPeriod === 'custom' && (
                <>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-[150px]"
                    aria-label="Custom Start Date"
                  />
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-[150px]"
                    aria-label="Custom End Date"
                  />
                </>
              )}
            </div>
          </div>
          
          {/* Stat Cards */}
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Revenue" value={`$${stats.revenue?.toFixed(2) || '0.00'}`} icon={DollarSign} isLoading={isLoading} />
            <StatCard title="New Members" value={stats.newMembers || 0} icon={Users} isLoading={isLoading} />
            <StatCard title="Payouts Disbursed" value={`$${stats.payouts?.toFixed(2) || '0.00'}`} icon={DollarSign} isLoading={isLoading} />
            <StatCard title="Net Income" value={`$${stats.netIncome?.toFixed(2) || '0.00'}`} icon={DollarSign} isLoading={isLoading} changeType={stats.netIncome >= 0 ? 'increase' : 'decrease'} />
          </div>

          {/* Summary Chart */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <DashboardSummaryChart data={chartData} isLoading={isLoading} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-1 space-y-6">
          {/* Onboarding Checklist */}
          {!isLoading && showOnboardingChecklist && onboardingProgress && !onboardingProgress.is_completed && (
            <OnboardingChecklist
              progress={onboardingProgress}
              onDismiss={handleDismissChecklist}
              onNavigate={handleNavigateFromChecklist}
              onUpdateProgress={updateOnboardingProgress}
            />
          )}

          {/* Events Requiring Payment - HIGHLIGHTED */}
          {!isLoading && !stripeNotConnected && upcomingEvents.some(e => e.requiresPayment) && (
            <Card className="shadow-xl border-4 border-red-500 bg-gradient-to-br from-red-50 via-orange-50 to-yellow-50">
              <CardHeader className="bg-gradient-to-r from-red-100 to-orange-100 border-b-2 border-red-300">
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <DollarSign className="h-6 w-6 animate-bounce" />
                  💰 Payment Required
                </CardTitle>
                <p className="text-sm text-red-700 font-semibold">You have contributions due for the following events:</p>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {upcomingEvents.filter(e => e.requiresPayment).map(event => (
                  <div key={event.id} className="p-4 bg-white rounded-lg border-2 border-red-300 shadow-lg hover:shadow-xl transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <p className="font-bold text-red-900 text-base">{event.title}</p>
                        <p className="text-sm text-red-700 mt-1 font-semibold">{event.type}</p>
                        <div className="mt-2 space-y-1">
                          <p className="text-sm text-gray-700">
                            <span className="font-semibold">Amount:</span> <span className="text-red-600 font-bold text-lg">${event.userContribution.amount_due.toFixed(2)}</span>
                          </p>
                          <p className="text-xs text-gray-600">
                            <span className="font-semibold">Due:</span> {format(new Date(event.userContribution.due_date), 'MMMM d, yyyy')}
                          </p>
                          <p className="text-xs text-gray-600">
                            <span className="font-semibold">Event:</span> {format(new Date(event.event_date), 'MMMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end">
                        <Badge className={event.userContribution.status === 'Past Due' 
                          ? 'bg-red-600 text-white border-red-700 font-bold text-xs px-3 py-1' 
                          : 'bg-orange-500 text-white border-orange-600 font-semibold text-xs px-3 py-1'}>
                          {event.userContribution.status === 'Past Due' ? '⚠️ PAST DUE' : 'DUE SOON'}
                        </Badge>
                        <Button 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg"
                          onClick={() => {
                            setSelectedEvent(event);
                            setIsEventModalOpen(true);
                          }}
                          disabled={stripeNotConnected || stripeNotVerified}
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          {stripeNotConnected || stripeNotVerified ? 'Unavailable' : 'Pay Now'}
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* SECTION 2: UPCOMING COMMUNITY & ASSOCIATION EVENTS */}
          {!isLoading && upcomingEvents.filter(e => e.isCommunityEvent).length > 0 && (
            <Card className="shadow-xl border-4 border-blue-500 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
              <CardHeader className="bg-gradient-to-r from-blue-100 to-indigo-100 border-b-2 border-blue-300">
                <CardTitle className="flex items-center gap-2 text-blue-900 text-2xl font-bold">
                  <Calendar className="h-7 w-7" />
                  GENERAL EVENTS
                </CardTitle>
                <p className="text-sm text-blue-800 font-semibold mt-2">Upcoming gatherings, fundraisers, and community activities</p>
              </CardHeader>
              <CardContent className="space-y-4 pt-6">
                {upcomingEvents.filter(e => e.isCommunityEvent).slice(0, 5).map(event => {
                  const needsPayment = event.requiresPayment || (event.is_paid_event && event.ticket_price > 0);

                  return (
                    <div key={event.id} className="p-4 bg-white rounded-xl border-2 border-blue-300 shadow-lg hover:shadow-xl transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-bold text-blue-900 text-lg">{event.title}</h3>
                            <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                              {event.type}
                            </Badge>
                          </div>

                          <div className="space-y-1">
                            <p className="text-sm text-gray-700">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              <span className="font-semibold">Date:</span> {format(new Date(event.event_date), 'MMMM d, yyyy')}
                              {event.event_time && ` at ${event.event_time}`}
                            </p>

                            {event.venue && (
                              <p className="text-sm text-gray-600">
                                📍 {event.venue}
                              </p>
                            )}

                            {event.is_paid_event && event.ticket_price > 0 && (
                              <p className="text-sm font-bold text-green-700 mt-2">
                                💵 Ticket Price: ${event.ticket_price.toFixed(2)}
                              </p>
                            )}

                            {event.userContribution?.status === 'Paid' && (
                              <Badge className="mt-2 bg-green-100 text-green-800 text-xs font-semibold">
                                ✓ Payment Completed
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Button 
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEvent(event);
                              setIsEventModalOpen(true);
                            }}
                          >
                            View Details
                          </Button>
                          {needsPayment && event.userContribution?.status !== 'Paid' && (
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg"
                              onClick={() => {
                                setSelectedEvent(event);
                                setIsEventModalOpen(true);
                              }}
                              disabled={stripeNotConnected || stripeNotVerified}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              {stripeNotConnected || stripeNotVerified ? 'Unavailable' : 'Pay Now'}
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                  <Link to={createPageUrl('Events')}>
                    View All Events <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Pending Actions */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle>Pending Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {stats.pendingContributions > 0 && (
                  <li className="flex items-center justify-between p-3 bg-red-50 border-2 border-red-300 rounded-lg">
                    <div>
                      <p className="font-bold text-red-900">💰 Pay Contributions</p>
                      <p className="text-sm text-red-700 font-semibold">{stats.pendingContributions} payment{stats.pendingContributions > 1 ? 's' : ''} required</p>
                    </div>
                    <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white font-bold" asChild>
                      <Link to={createPageUrl('MemberPortal') + '#contributions'}>
                        Pay Now <ArrowRight className='w-4 h-4 ml-2' />
                      </Link>
                    </Button>
                  </li>
                )}
                <li className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Approve New Members</p>
                    <p className="text-sm text-gray-500">{stats.pendingMembers || 0} new applications</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleReviewMembers}>
                    Review <ArrowRight className='w-4 h-4 ml-2' />
                  </Button>
                </li>
                <li className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Process Payouts</p>
                    <p className="text-sm text-gray-500">{stats.pendingPayouts || 0} waiting for approval</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={handleProcessPayouts}>
                    Process <ArrowRight className='w-4 h-4 ml-2' />
                  </Button>
                </li>
                 <li className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Total Members</p>
                    <p className="text-sm text-gray-500">{stats.totalMembers || 0} total active members</p>
                  </div>
                   <Button variant="outline" size="sm" asChild>
                    <Link to={createPageUrl('Members')}>
                      View <ArrowRight className='w-4 h-4 ml-2' />
                    </Link>
                  </Button>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event Details Modal */}
      <EventDetailsModal 
        event={selectedEvent}
        isOpen={isEventModalOpen}
        onClose={() => {
          setIsEventModalOpen(false);
          setSelectedEvent(null);
        }}
        onPaymentInitiated={() => {
          setIsEventModalOpen(false);
        }}
      />

      {/* Signup Modal */}
      <Dialog open={isSignupOpen} onOpenChange={setIsSignupOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Get Started with {selectedTier?.name}</DialogTitle>
            <DialogDescription>
              Create your association account and start your 14-day free trial.
            </DialogDescription>
          </DialogHeader>
          {selectedTier && (
            <AssociationSignupForm 
              tier={selectedTier}
              onComplete={handleSignupComplete}
              onCancel={() => setIsSignupOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}