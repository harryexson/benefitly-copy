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
import AssociationUsers from './pages/AssociationUsers';
import AutomatedCommunications from './pages/AutomatedCommunications';
import BackOfficeHub from './pages/BackOfficeHub';
import BackOfficeLogin from './pages/BackOfficeLogin';
import BenefitPrograms from './pages/BenefitPrograms';
import Billing from './pages/Billing';
import Community from './pages/Community';
import ContractAcceptance from './pages/ContractAcceptance';
import Dashboard from './pages/Dashboard';
import EmailTemplates from './pages/EmailTemplates';
import EventCalendar from './pages/EventCalendar';
import EventDashboard from './pages/EventDashboard';
import EventTicketSuccess from './pages/EventTicketSuccess';
import Events from './pages/Events';
import Expenses from './pages/Expenses';
import LandingPage from './pages/LandingPage';
import MarketAnalysis from './pages/MarketAnalysis';
import MassCommunication from './pages/MassCommunication';
import MemberFinancialDashboard from './pages/MemberFinancialDashboard';
import MemberPortal from './pages/MemberPortal';
import Members from './pages/Members';
import Messaging from './pages/Messaging';
import OnboardingWizard from './pages/OnboardingWizard';
import Payment from './pages/Payment';
import PayoutApproval from './pages/PayoutApproval';
import PayoutDashboard from './pages/PayoutDashboard';
import PayoutHistory from './pages/PayoutHistory';
import PayoutManagement from './pages/PayoutManagement';
import PayoutReporting from './pages/PayoutReporting';
import Payouts from './pages/Payouts';
import Profile from './pages/Profile';
import Proposals from './pages/Proposals';
import Reports from './pages/Reports';
import RoleManagement from './pages/RoleManagement';
import Settings from './pages/Settings';
import StripeManagement from './pages/StripeManagement';
import SubscriptionRestricted from './pages/SubscriptionRestricted';
import SubscriptionSuccess from './pages/SubscriptionSuccess';
import SubscriptionTiers from './pages/SubscriptionTiers';
import Support from './pages/Support';
import TrialManagement from './pages/TrialManagement';
import UpcomingEvents from './pages/UpcomingEvents';
import UserManagement from './pages/UserManagement';
import VolunteerRegistration from './pages/VolunteerRegistration';
import Volunteers from './pages/Volunteers';
import backoffice from './pages/backoffice';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AssociationUsers": AssociationUsers,
    "AutomatedCommunications": AutomatedCommunications,
    "BackOfficeHub": BackOfficeHub,
    "BackOfficeLogin": BackOfficeLogin,
    "BenefitPrograms": BenefitPrograms,
    "Billing": Billing,
    "Community": Community,
    "ContractAcceptance": ContractAcceptance,
    "Dashboard": Dashboard,
    "EmailTemplates": EmailTemplates,
    "EventCalendar": EventCalendar,
    "EventDashboard": EventDashboard,
    "EventTicketSuccess": EventTicketSuccess,
    "Events": Events,
    "Expenses": Expenses,
    "LandingPage": LandingPage,
    "MarketAnalysis": MarketAnalysis,
    "MassCommunication": MassCommunication,
    "MemberFinancialDashboard": MemberFinancialDashboard,
    "MemberPortal": MemberPortal,
    "Members": Members,
    "Messaging": Messaging,
    "OnboardingWizard": OnboardingWizard,
    "Payment": Payment,
    "PayoutApproval": PayoutApproval,
    "PayoutDashboard": PayoutDashboard,
    "PayoutHistory": PayoutHistory,
    "PayoutManagement": PayoutManagement,
    "PayoutReporting": PayoutReporting,
    "Payouts": Payouts,
    "Profile": Profile,
    "Proposals": Proposals,
    "Reports": Reports,
    "RoleManagement": RoleManagement,
    "Settings": Settings,
    "StripeManagement": StripeManagement,
    "SubscriptionRestricted": SubscriptionRestricted,
    "SubscriptionSuccess": SubscriptionSuccess,
    "SubscriptionTiers": SubscriptionTiers,
    "Support": Support,
    "TrialManagement": TrialManagement,
    "UpcomingEvents": UpcomingEvents,
    "UserManagement": UserManagement,
    "VolunteerRegistration": VolunteerRegistration,
    "Volunteers": Volunteers,
    "backoffice": backoffice,
}

export const pagesConfig = {
    mainPage: "LandingPage",
    Pages: PAGES,
    Layout: __Layout,
};