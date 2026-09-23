import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, Users, Calendar, DollarSign, Settings, Bell, BarChart3, HelpingHand, CreditCard, HeadphonesIcon, Building2, UserCog, Wallet, Clock, HandHeart, MessageSquare, Vote, UserCircle, Mail, TrendingUp, Shield, CheckCircle, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { User, AssociationAccount, SubscriptionTier, DirectMessage } from '@/entities/all';
import { Skeleton } from '@/components/ui/skeleton';
import InteractiveTutorial from './components/onboarding/InteractiveTutorial';
import NotificationCenter from './components/notifications/NotificationCenter';
import NotificationToast from './components/notifications/NotificationToast';

const associationNavItems = (tier, user) => {
  const isStarter = tier?.name === 'Starter';
  const isGrowth = tier?.name === 'Growth';
  const isScale = tier?.name === 'Scale';
  const isAdmin = user?.association_role === 'Administrator';

  const allItems = [
    { title: 'Dashboard', href: 'Dashboard', icon: Home, tier: 'all' },
    { title: 'My Portal', href: 'MemberPortal', icon: UserCircle, memberOnly: true, tier: 'all' },
    { title: 'Messages', href: 'Messaging', icon: MessageSquare, tier: 'all' },
    { title: 'Members', href: 'Members', icon: Users, tier: 'all' },
    { title: 'Events', href: 'Events', icon: Calendar, tier: 'all' },
    { title: 'Event Dashboard', href: 'EventDashboard', icon: BarChart3, tier: 'all' },
    { title: 'Upcoming Events', href: 'UpcomingEvents', icon: Calendar, tier: 'all' },
    { title: 'Event Calendar', href: 'EventCalendar', icon: Calendar, tier: 'all' },
    { title: 'Volunteers', href: 'Volunteers', icon: HandHeart, tier: 'growth+', badge: 'Growth+' },
    { title: 'Stripe Management', href: 'StripeManagement', icon: CreditCard, adminOnly: true, tier: 'all' },
    { title: 'Payout Dashboard', href: 'PayoutDashboard', icon: BarChart3, adminOnly: true, tier: 'all' },
    { title: 'Payout Approval', href: 'PayoutApproval', icon: CheckCircle, adminOnly: true, tier: 'all' },
    { title: 'Payout Reports', href: 'PayoutReporting', icon: FileText, adminOnly: true, tier: 'all' },
    { title: 'Payouts', href: 'Payouts', icon: DollarSign, tier: 'all' },
    { title: 'Expenses', href: 'Expenses', icon: Wallet, tier: 'all' },
    { title: 'Reports', href: 'Reports', icon: BarChart3, tier: 'all' },
    { title: 'Community', href: 'Community', icon: MessageSquare, tier: 'all' },
    { title: 'Proposals', href: 'Proposals', icon: Vote, tier: 'all' },
    { title: 'My Finances', href: 'MemberFinancialDashboard', icon: Wallet, memberOnly: true, tier: 'all' },
    { title: 'Bulk Messaging', href: 'MassCommunication', icon: Mail, adminOnly: true, tier: 'all' },
    { title: 'Automated Messages', href: 'AutomatedCommunications', icon: MessageSquare, adminOnly: true, tier: 'all' },
    { title: 'Email Templates', href: 'EmailTemplates', icon: Mail, adminOnly: true, tier: 'all' },
  ];

  return allItems.filter(item => {
    // Admin-only filter
    if (item.adminOnly && !isAdmin) return false;
    
    // Tier-based filtering
    if (item.tier === 'growth+' && isStarter) return false;
    if (item.tier === 'scale+' && (isStarter || isGrowth)) return false;
    
    return true;
  });
};

const adminNavItems = (user) => {
    if (user?.association_role === 'Administrator') {
        return [
          { title: 'User Management', href: 'AssociationUsers', icon: UserCog },
          { title: 'Role Management', href: 'RoleManagement', icon: Shield }
        ];
    }
    return [];
};

const backOfficeNavItems = (user) => {
    const allItems = [
      { title: 'Back Office Hub', href: 'BackOfficeHub', icon: Building2, role: ['Super Admin', 'Billing', 'Customer Support', 'Marketing', 'Developer'] },
      { title: 'Client Accounts', href: 'backoffice', icon: Building2, role: ['Super Admin', 'Billing', 'Customer Support'] },
      { title: 'Subscription Tiers', href: 'SubscriptionTiers', icon: CreditCard, role: ['Super Admin', 'Billing'] },
      { title: 'Trial Management', href: 'TrialManagement', icon: Clock, role: ['Super Admin', 'Billing'] },
      { title: 'Support Center', href: 'Support', icon: HeadphonesIcon, role: ['Super Admin', 'Customer Support'] },
      { title: 'Market Analysis', href: 'MarketAnalysis', icon: TrendingUp, role: ['Super Admin', 'Marketing'] },
      { title: 'User Management', href: 'UserManagement', icon: UserCog, role: ['Super Admin'] }
    ];

    if (user?.back_office_role === 'Super Admin') {
        return allItems;
    }
    return allItems.filter(item => item.role.includes(user?.back_office_role));
};

const NavLink = ({ item, tier, currentPage }) => {
  const location = useLocation();
  const currentPath = location.pathname.replace(/\/$/, '');
  const itemPath = createPageUrl(item.href).replace(/\/$/, '');
  const isActive = currentPath === itemPath || currentPage === item.href;
  const isRestricted = item.badge && item.tier !== 'all';

  return (
    <Link
      to={createPageUrl(item.href)}
      data-tutorial-target={item.href.toLowerCase()}
      className={`flex items-center justify-between px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${
        isActive
          ? 'bg-blue-600 text-white shadow-sm'
          : 'text-gray-300 hover:bg-blue-800 hover:text-white'
      }`}
    >
      <div className="flex items-center">
        <item.icon className="w-5 h-5 mr-3" />
        {item.title}
      </div>
      {isRestricted && (
        <Badge variant="outline" className="ml-2 text-xs border-blue-300 text-blue-300">
          {item.badge}
        </Badge>
      )}
    </Link>
  );
};

export default function Layout({ children, currentPageName }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);
  const [subscriptionTier, setSubscriptionTier] = useState(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const publicPages = ['/LandingPage', '/', '/BackOfficeLogin', '/EventTicketSuccess', '/VolunteerRegistration', '/ContractAcceptance', '/SubscriptionRestricted', '/SubscriptionSuccess'];
  const isPublicPage = publicPages.includes(location.pathname) || currentPageName === 'LandingPage' || currentPageName === 'BackOfficeLogin' || currentPageName === 'EventTicketSuccess' || currentPageName === 'VolunteerRegistration' || currentPageName === 'ContractAcceptance' || currentPageName === 'SubscriptionRestricted' || currentPageName === 'SubscriptionSuccess';

  const backOfficePages = ['backoffice', 'SubscriptionTiers', 'TrialManagement', 'Support', 'UserManagement'];

  // Load notification count
  useEffect(() => {
    let isMounted = true;
    
    const loadNotificationCount = async () => {
      // Only load if user has association account and component is mounted
      if (!isMounted || !user?.id || !user?.association_account_id) {
        if (isMounted) setNotificationCount(0);
        return;
      }

      try {
        // Wrap in try-catch to handle any entity access issues
        if (typeof DirectMessage?.filter === 'function') {
          const messages = await DirectMessage.filter({ 
            recipient_user_id: user.id,
            is_read: false 
          });
          if (isMounted) {
            setNotificationCount(messages?.length || 0);
          }
        } else {
          if (isMounted) setNotificationCount(0);
        }
      } catch (error) {
        // Silently handle all errors - entity may not exist, network issues, or component unmounted
        if (isMounted) {
          setNotificationCount(0);
        }
      }
    };

    // Skip notification loading for users without association accounts
    if (user?.id && user?.association_account_id && !isLoadingUser) {
      loadNotificationCount();
      // Refresh count every 30 seconds
      const interval = setInterval(loadNotificationCount, 30000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    } else {
      setNotificationCount(0);
    }
    
    return () => {
      isMounted = false;
    };
  }, [user?.id, user?.association_account_id, isLoadingUser]);

  useEffect(() => {
      const fetchUserAndSubscription = async () => {
      // For public pages, skip user fetch entirely
      if (isPublicPage) {
        setIsLoadingUser(false);
        return;
      }

      try {
        const currentUser = await User.me();
        setUser(currentUser);

        // Show tutorial for new users (only once)
        const tutorialShown = localStorage.getItem('tutorial_completed');
        if (!tutorialShown && currentUser?.association_account_id) {
          setShowTutorial(true);
        }

        // Check if user has association
        if (currentUser && currentUser.association_account_id) {
            const [accounts, tiers] = await Promise.all([
                AssociationAccount.list(),
                SubscriptionTier.list(),
            ]);
            const userAccount = accounts.find(a => a.id === currentUser.association_account_id);

            if (userAccount) {
                const userTier = tiers.find(t => t.id === userAccount.subscription_tier_id);
                setSubscriptionTier(userTier);

                // CRITICAL: Only administrators should handle subscription issues
                // Regular members use their association's subscription and should NEVER be redirected
                const isAssociationAdmin = currentUser.association_role === 'Administrator';
                
                if (isAssociationAdmin) {
                    const isSubscriptionRestrictedPage = currentPageName === 'SubscriptionRestricted';
                    const isBillingPage = currentPageName === 'Billing';
                    const isDashboardPage = currentPageName === 'Dashboard';

                    // Determine if subscription is invalid
                    const isTrialExpired = userAccount.account_status === 'trial' && 
                      userAccount.trial_end_date && 
                      new Date(userAccount.trial_end_date) < new Date();

                    const isAccountSuspended = userAccount.account_status === 'suspended';
                    const isAccountCancelled = userAccount.account_status === 'cancelled';
                    const hasNoTier = !userAccount.subscription_tier_id && userAccount.account_status !== 'trial';

                    const subscriptionInvalid = isTrialExpired || isAccountSuspended || isAccountCancelled || hasNoTier;

                    // Only redirect admin when subscription is invalid
                    if (subscriptionInvalid && !isSubscriptionRestrictedPage && !isBillingPage && !isDashboardPage) {
                      navigate(createPageUrl('SubscriptionRestricted'));
                      return;
                    }
                }
                // Regular members: no subscription checks, they use association's subscription
            }
        } else if (currentUser && !currentUser.association_account_id) {
            // User exists but has no association - allow them to access Dashboard to sign up
            // Don't redirect anywhere, let Dashboard handle the signup flow
            console.log('User has no association, allowing access to Dashboard for signup');
        }

        const isCurrentPageBackOffice = backOfficePages.includes(currentPageName);
        const hasBackOfficeRole = currentUser?.back_office_role && currentUser.back_office_role !== 'None';
        const isBackOfficeAuthenticated = sessionStorage.getItem('backOfficeAuthenticated') === 'true';

        if (isCurrentPageBackOffice) {
          if (!hasBackOfficeRole) {
            navigate(createPageUrl('Dashboard'));
            return;
          }
          if (!isBackOfficeAuthenticated) {
            navigate(createPageUrl('BackOfficeLogin'));
            return;
          }
        }

        } catch (e) {
        // Ignore aborted requests - user is navigating away
        if (e.name === 'CanceledError' || e.name === 'AbortError' || (e.message && e.message.includes('aborted'))) {
          console.log('Request aborted - user navigating away');
          setIsLoadingUser(false);
          return;
        }

        console.error("Failed to fetch user:", e);
        setUser(null);
        setSubscriptionTier(null);

        // Only redirect to login if not on public page
        if (!isPublicPage) {
          // Preserve the current URL for redirect after login
          const currentPath = location.pathname + location.search;
          base44.auth.redirectToLogin(currentPath);
        }
        } finally {
        setIsLoadingUser(false);
        }
        };

        fetchUserAndSubscription();
        }, [navigate, isPublicPage, currentPageName, location.pathname]);

  const handleLogout = async () => {
    try {
      await User.logout();
      sessionStorage.removeItem('backOfficeAuthenticated');
      navigate(createPageUrl('LandingPage'));
      window.location.reload();
    } catch (e) {
      console.error("Logout failed:", e);
    }
  };
  
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return parts.map(n => n[0]).join('').toUpperCase();
  }

  if (isPublicPage) {
    return (
      <div className="min-h-screen w-full bg-gray-50 font-sans">
        <main className="w-full">
          {children}
        </main>
      </div>
    );
  }

  const isBackOfficeUser = user?.back_office_role && user.back_office_role !== 'None';
  const isAssociationUser = user?.association_account_id;

  const visibleAssociationNav = isAssociationUser ? associationNavItems(subscriptionTier, user) : [];
  const visibleAdminNav = isAssociationUser ? adminNavItems(user) : [];
  const visibleBackOfficeNav = isBackOfficeUser && !isAssociationUser ? backOfficeNavItems(user) : [];

  return (
    <div className="min-h-screen w-full flex bg-gray-50 font-sans">
      {/* Interactive Tutorial */}
      <InteractiveTutorial
        isOpen={showTutorial}
        onClose={() => setShowTutorial(false)}
        onComplete={() => {
          localStorage.setItem('tutorial_completed', 'true');
          setShowTutorial(false);
        }}
      />

      <aside className="w-64 bg-blue-900 text-white flex flex-col fixed h-full">
        <div className="flex items-center justify-center h-20 border-b border-blue-800">
          <HelpingHand className="h-8 w-8 text-blue-300" />
          <h1 className="ml-3 text-xl font-bold tracking-wider">Benefitly</h1>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
          {visibleAssociationNav.length > 0 && (
            <div>
              <h3 className="px-4 text-xs font-semibold text-blue-300 uppercase tracking-wider mb-3">
                Association Management
              </h3>
              <div className="space-y-2">
                {visibleAssociationNav.map((item) => <NavLink key={item.title} item={item} tier={subscriptionTier} currentPage={currentPageName} />)}
              </div>
            </div>
          )}

          {visibleAdminNav.length > 0 && (
              <div className="pt-4">
                  <div className="space-y-2">
                    {visibleAdminNav.map((item) => <NavLink key={item.title} item={item} tier={subscriptionTier} currentPage={currentPageName} />)}
                    <NavLink item={{ title: 'Settings', href: 'Settings', icon: Settings }} tier={subscriptionTier} currentPage={currentPageName} />
                  </div>
              </div>
          )}
          
          {(visibleAssociationNav.length > 0 || visibleAdminNav.length > 0) && visibleBackOfficeNav.length > 0 && <Separator className="border-blue-800" />}
          
          {visibleBackOfficeNav.length > 0 && (
            <div>
              <h3 className="px-4 text-xs font-semibold text-blue-300 uppercase tracking-wider mb-3">
                Back Office
              </h3>
              <div className="space-y-2">
                {visibleBackOfficeNav.map((item) => <NavLink key={item.title} item={item} tier={subscriptionTier} currentPage={currentPageName} />)}
              </div>
            </div>
          )}
        </nav>
        
        <div className="p-4 border-t border-blue-800">
          {subscriptionTier && (
            <div className="mb-3 px-3 py-2 bg-blue-800 rounded-lg">
              <p className="text-xs text-blue-300 mb-1">Current Plan</p>
              <p className="font-semibold">{subscriptionTier.name}</p>
              <p className="text-xs text-blue-300 mt-1">
                {subscriptionTier.member_limit} members
              </p>
            </div>
          )}
          <p className='text-xs text-blue-300'>© 2024 Benefitly Platform</p>
        </div>
      </aside>

      <div className="flex-1 flex flex-col ml-64">
        <header className="h-20 flex items-center justify-between px-8 bg-white border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">{currentPageName}</h2>
          <div className="flex items-center space-x-6">
            <div className="relative">
              <button 
                className="relative p-2 hover:bg-gray-100 rounded-full transition-colors"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-6 w-6 text-gray-500 hover:text-gray-800" />
                {notificationCount > 0 && (
                  <span className="absolute top-0 right-0 h-5 w-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-semibold">
                    {notificationCount > 9 ? '9+' : notificationCount}
                  </span>
                )}
              </button>
              <NotificationCenter 
                user={user}
                isOpen={showNotifications}
                onClose={() => setShowNotifications(false)}
              />
            </div>
            {isLoadingUser ? (
              <Skeleton className="h-10 w-10 rounded-full" />
            ) : user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar className="h-10 w-10 cursor-pointer">
                    <AvatarImage src={user.profile_picture_url} alt={user.full_name || "User Avatar"} />
                    <AvatarFallback>{getInitials(user.full_name)}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="font-semibold">{user.full_name}</div>
                    <div className="text-xs text-gray-500 font-normal">{user.email}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Profile')}>Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Billing')}>Billing</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link to={createPageUrl('Settings')}>Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={handleLogout} className="text-red-600 focus:bg-red-50 focus:text-red-700">
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        </header>

        <main className="flex-1 p-8 overflow-y-auto">
              {!isLoadingUser && user && <NotificationToast user={user} />}
              {isLoadingUser ? (
                <div className="space-y-6">
                  <Skeleton className="h-24 w-full" />
                  <div className="grid grid-cols-2 gap-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-48 w-full" />
                  </div>
                </div>
              ) : (
                 React.cloneElement(children, { user, subscriptionTier })
              )}
            </main>
      </div>
    </div>
  );
}