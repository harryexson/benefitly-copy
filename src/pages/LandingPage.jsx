import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Users, CreditCard, Phone, TrendingDown, Shield, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AssociationSignupForm from '../components/public/AssociationSignupForm';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';

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
    is_active: true,
    tagline: 'Perfect for new associations'
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
    tagline: 'Most popular for small associations',
    comparison: '45% cheaper than Wild Apricot & Bloomerang'
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
    tagline: 'Best value for growing organizations',
    comparison: '45% cheaper than Wild Apricot & Bloomerang'
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
    tagline: 'For large associations',
    comparison: '45% cheaper than Wild Apricot & Bloomerang'
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
    is_custom: true,
    tagline: 'Tailored for your needs'
  }
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [selectedTier, setSelectedTier] = useState(null);
  const [isSignupOpen, setIsSignupOpen] = useState(false);

  const handleSelectPlan = async (tier) => {
    // Check if user is already authenticated
    try {
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (isAuthenticated) {
        const currentUser = await base44.auth.me();
        if (currentUser && currentUser.association_account_id) {
          // They already have an association account with active subscription - redirect to Dashboard
          navigate(createPageUrl('Dashboard'));
          toast.info('You already have an active association account');
          return;
        } else if (currentUser) {
          // Logged in but no association - go to dashboard with tier selection
          navigate(createPageUrl(`Dashboard?signup_tier=${tier.id}`));
          return;
        }
      }
    } catch (e) {
      // Ignore aborted requests - user is navigating away
      if (e.name === 'CanceledError' || e.name === 'AbortError' || e.message?.includes('aborted')) {
        return;
      }
      console.log('Not authenticated, redirecting to dashboard for login flow');
    }
    
    // Not logged in - redirect to the dashboard to handle authentication and signup.
    navigate(createPageUrl(`Dashboard?signup_tier=${tier.id}`));
  };

  const handleSignupComplete = () => {
    setIsSignupOpen(false);
    setSelectedTier(null);
    navigate(createPageUrl('Dashboard'));
    window.location.reload(); // Reload to apply new user roles to layout
  };

  const handleSignIn = async () => {
    try {
      // Check if already authenticated
      const isAuthenticated = await base44.auth.isAuthenticated();
      if (isAuthenticated) {
        // Already logged in, go straight to dashboard
        navigate(createPageUrl('Dashboard'));
      } else {
        // Not logged in, trigger login flow that will redirect to Dashboard after
        base44.auth.redirectToLogin(createPageUrl('Dashboard'));
      }
    } catch (error) {
      // Ignore aborted requests - user is navigating away
      if (error.name === 'CanceledError' || error.name === 'AbortError' || error.message?.includes('aborted')) {
        return;
      }
      console.error('Failed to initiate login:', error);
      // Fallback: navigate to dashboard which will handle auth
      navigate(createPageUrl('Dashboard'));
    }
  };

  const getPriceDisplay = (tier) => {
    if (tier.yearly_price && tier.yearly_price < tier.monthly_price * 12) {
      const savings = (tier.monthly_price * 12 - tier.yearly_price).toFixed(0);
      return {
        monthly: tier.monthly_price,
        yearly: tier.yearly_price,
        savings: savings
      };
    }
    return {
      monthly: tier.monthly_price,
      yearly: tier.yearly_price || tier.monthly_price * 12,
      savings: 0
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-600 p-2 rounded-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Benefitly</h1>
                <p className="text-sm text-gray-500">Mutual Aid Association Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleSignIn}>Sign In</Button>
              <Button>Contact Sales</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Badge className="mb-4 bg-green-100 text-green-800 border-green-300">
            <TrendingDown className="w-3 h-3 mr-1" />
            50-90% cheaper than competitors
          </Badge>
          <h2 className="text-5xl font-bold text-gray-900 mb-6">
            The Only Platform Built for Mutual Aid Associations
          </h2>
          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Stop overpaying for generic software. Benefitly is purpose-built for the contribution→event→payout 
            workflow your association needs. From $35/month.
          </p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500 mb-12">
            <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
              <Shield className="h-5 w-5 text-blue-500 mr-2" />
              Secure Member Management
            </div>
            <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
              <Zap className="h-5 w-5 text-yellow-500 mr-2" />
              Automated Contributions
            </div>
            <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm">
              <CreditCard className="h-5 w-5 text-green-500 mr-2" />
              Integrated Bank Payouts
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-2xl mx-auto">
            <p className="text-blue-800 font-medium">
              🎯 <strong>Unique Feature:</strong> We're the ONLY platform with integrated benefit payouts directly to member bank accounts.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <Badge className="mb-4" variant="outline">Simple, Transparent Pricing</Badge>
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Pricing That Makes Sense for Your Budget
            </h3>
            <p className="text-lg text-gray-600 mb-4">
              45% cheaper than Wild Apricot and Bloomerang
            </p>
            <div className="flex justify-center gap-8 text-sm">
              <div className="text-center">
                <p className="font-bold text-2xl text-red-500 line-through">$60</p>
                <p className="text-gray-500">Wild Apricot (100 members)</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-2xl text-red-500 line-through">$120</p>
                <p className="text-gray-500">Bloomerang (300 members)</p>
              </div>
              <div className="text-center">
                <p className="font-bold text-2xl text-green-600">$33-$165</p>
                <p className="text-gray-500">Benefitly (45% cheaper)</p>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {publicTiers.map((tier, index) => {
              const pricing = getPriceDisplay(tier);
              const isPopular = tier.id === 'starter'; // Set 'Starter' as popular - best entry point
              
              return (
                <Card key={tier.id} className={`relative flex flex-col ${isPopular ? 'ring-2 ring-blue-500 shadow-lg scale-105' : 'hover:shadow-lg'} transition-all`}>
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-500 text-white px-4 py-1">
                        <Star className="w-3 h-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  
                  <CardHeader className="text-center pb-8">
                    <CardTitle className="text-2xl font-bold text-gray-900">
                      {tier.name}
                    </CardTitle>
                    {tier.tagline && (
                      <p className="text-sm text-gray-500 mt-1">{tier.tagline}</p>
                    )}
                    <div className="mt-4">
                      {tier.is_custom ? (
                        <span className="text-4xl font-bold text-gray-900">Custom</span>
                      ) : (
                        <>
                          <span className="text-4xl font-bold text-gray-900">
                            ${pricing.monthly}
                          </span>
                          <span className="text-gray-500">/month</span>
                        </>
                      )}
                    </div>
                    {pricing.savings > 0 && !tier.is_custom && (
                      <p className="text-sm text-green-600 mt-2">
                        Save ${pricing.savings} with annual billing
                      </p>
                    )}
                    {tier.comparison && (
                      <div className="mt-2">
                        <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          {tier.comparison}
                        </Badge>
                      </div>
                    )}
                    <p className="text-gray-600 mt-4">
                      {tier.member_limit === '1000+' ? 'Over 1,000 members' : `Up to ${tier.member_limit} members`}
                    </p>
                  </CardHeader>
                  
                  <CardContent className="flex flex-col flex-grow">
                    <ul className="space-y-3 mb-8">
                      {tier.features && tier.features.map((feature, idx) => (
                        <li key={idx} className="flex items-center">
                          <Check className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                          <span className="text-gray-700">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <div className="mt-auto">
                      {tier.is_custom ? (
                        <Button className="w-full bg-gray-800 hover:bg-gray-900" size="lg">
                          Contact Sales
                        </Button>
                      ) : (
                        <Button 
                          className={`w-full ${isPopular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
                          variant={isPopular ? 'default' : 'outline'}
                          size="lg"
                          onClick={() => handleSelectPlan(tier)}
                        >
                          Start Free Trial
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          
          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              All plans include a 14-day free trial. No credit card required.
            </p>
            <p className="text-sm text-gray-500">
              Need more members? <Button variant="link" className="p-0 h-auto text-blue-600">Contact us</Button> for custom enterprise pricing.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Everything You Need to Run Your Association
            </h3>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Member Management</h4>
              <p className="text-gray-600">
                Easily manage member profiles, track contributions, and handle membership status changes.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <CreditCard className="h-8 w-8 text-green-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Automated Collections</h4>
              <p className="text-gray-600">
                Streamline contribution collection with automated reminders and payment tracking.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-purple-600" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">24/7 Support</h4>
              <p className="text-gray-600">
                Get help when you need it with our dedicated customer support team.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 bg-blue-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4">
            Ready to Transform Your Association?
          </h3>
          <p className="text-xl mb-8 text-blue-100">
            Join hundreds of associations already using Benefitly to better serve their members.
          </p>
          <Button size="lg" variant="secondary" className="text-blue-900" onClick={() => handleSelectPlan(publicTiers[1])}>
            Start Your Free Trial Today
          </Button>
        </div>
      </section>

      {/* Signup Modal - This is now triggered from the Dashboard */}
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