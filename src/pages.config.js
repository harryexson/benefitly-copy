/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Dashboard from './pages/Dashboard';
import Members from './pages/Members';
import Events from './pages/Events';
import Payouts from './pages/Payouts';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import SubscriptionTiers from './pages/SubscriptionTiers';
import Profile from './pages/Profile';
import Billing from './pages/Billing';
import Support from './pages/Support';
import AssociationUsers from './pages/AssociationUsers';
import UserManagement from './pages/UserManagement';
import LandingPage from './pages/LandingPage';
import Expenses from './pages/Expenses';
import TrialManagement from './pages/TrialManagement';
import Payment from './pages/Payment';
import VolunteerRegistration from './pages/VolunteerRegistration';
import Volunteers from './pages/Volunteers';
import BackOfficeLogin from './pages/BackOfficeLogin';
import backoffice from './pages/backoffice';
import ContractAcceptance from './pages/ContractAcceptance';
import MemberPortal from './pages/MemberPortal';
import Community from './pages/Community';
import Proposals from './pages/Proposals';
import EmailTemplates from './pages/EmailTemplates';
import OnboardingWizard from './pages/OnboardingWizard';
import MarketAnalysis from './pages/MarketAnalysis';
import UpcomingEvents from './pages/UpcomingEvents';
import EventTicketSuccess from './pages/EventTicketSuccess';
import EventCalendar from './pages/EventCalendar';
import SubscriptionRestricted from './pages/SubscriptionRestricted';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import MemberFinancialDashboard from './pages/MemberFinancialDashboard';
import RoleManagement from './pages/RoleManagement';
import EventDashboard from './pages/EventDashboard';
import MassCommunication from './pages/MassCommunication';
import Messaging from './pages/Messaging';
import AutomatedCommunications from './pages/AutomatedCommunications';
import BackOfficeHub from './pages/BackOfficeHub';
import PayoutApproval from './pages/PayoutApproval';
import PayoutReporting from './pages/PayoutReporting';
import PayoutDashboard from './pages/PayoutDashboard';
import StripeManagement from './pages/StripeManagement';
import PayoutHistory from './pages/PayoutHistory';
import PayoutManagement from './pages/PayoutManagement';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Members": Members,
    "Events": Events,
    "Payouts": Payouts,
    "Reports": Reports,
    "Settings": Settings,
    "SubscriptionTiers": SubscriptionTiers,
    "Profile": Profile,
    "Billing": Billing,
    "Support": Support,
    "AssociationUsers": AssociationUsers,
    "UserManagement": UserManagement,
    "LandingPage": LandingPage,
    "Expenses": Expenses,
    "TrialManagement": TrialManagement,
    "Payment": Payment,
    "VolunteerRegistration": VolunteerRegistration,
    "Volunteers": Volunteers,
    "BackOfficeLogin": BackOfficeLogin,
    "backoffice": backoffice,
    "ContractAcceptance": ContractAcceptance,
    "MemberPortal": MemberPortal,
    "Community": Community,
    "Proposals": Proposals,
    "EmailTemplates": EmailTemplates,
    "OnboardingWizard": OnboardingWizard,
    "MarketAnalysis": MarketAnalysis,
    "UpcomingEvents": UpcomingEvents,
    "EventTicketSuccess": EventTicketSuccess,
    "EventCalendar": EventCalendar,
    "SubscriptionRestricted": SubscriptionRestricted,
    "SubscriptionSuccess": SubscriptionSuccess,
    "MemberFinancialDashboard": MemberFinancialDashboard,
    "RoleManagement": RoleManagement,
    "EventDashboard": EventDashboard,
    "MassCommunication": MassCommunication,
    "Messaging": Messaging,
    "AutomatedCommunications": AutomatedCommunications,
    "BackOfficeHub": BackOfficeHub,
    "PayoutApproval": PayoutApproval,
    "PayoutReporting": PayoutReporting,
    "PayoutDashboard": PayoutDashboard,
    "StripeManagement": StripeManagement,
    "PayoutHistory": PayoutHistory,
    "PayoutManagement": PayoutManagement,
}

export const pagesConfig = {
    mainPage: "LandingPage",
    Pages: PAGES,
    Layout: __Layout,
};