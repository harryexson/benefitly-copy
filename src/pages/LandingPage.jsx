import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Star, Users, CreditCard, Phone, TrendingDown, Shield, Zap, Lock, FileText, AlertTriangle, Globe, CheckCircle, XCircle, Building2 } from 'lucide-react';
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
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-900 p-2 rounded-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Benefitly</h1>
                <p className="text-sm text-gray-600">Benefits Management Platform</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleSignIn} className="text-gray-700 hover:text-gray-900">Sign In</Button>
              <Button className="bg-blue-900 hover:bg-blue-800">Contact Sales</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 px-6 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="mb-6 bg-blue-900 text-white px-4 py-2 text-sm">
            <Shield className="w-4 h-4 mr-2" />
            Enterprise-Grade Benefits Management Platform
          </Badge>
          <h2 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Secure Benefits & Entitlement Management Platform for Mutual Benefit Associations
          </h2>
          <p className="text-xl md:text-2xl text-gray-600 mb-4 leading-relaxed max-w-4xl mx-auto">
            Benefitly is a secure, enterprise-grade SaaS platform that enables mutual benefit associations, membership organizations, and structured groups to manage, distribute, and track member benefits and entitlements in a compliant and transparent manner.
          </p>
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 max-w-3xl mx-auto mb-8">
            <p className="text-yellow-900 font-semibold text-lg">
              ⚠️ We provide administrative technology — not financial services.
            </p>
            <p className="text-yellow-800 text-sm mt-2">
              Benefitly does not operate as a payment processor, remittance service, wallet, gig marketplace, or financial institution.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-4 text-sm mb-12">
            <div className="flex items-center bg-white px-5 py-3 rounded-lg shadow-sm border border-gray-200">
              <Shield className="h-5 w-5 text-blue-900 mr-2" />
              <span className="font-medium text-gray-700">Compliance-First Infrastructure</span>
            </div>
            <div className="flex items-center bg-white px-5 py-3 rounded-lg shadow-sm border border-gray-200">
              <Lock className="h-5 w-5 text-blue-900 mr-2" />
              <span className="font-medium text-gray-700">Bank-Level Security</span>
            </div>
            <div className="flex items-center bg-white px-5 py-3 rounded-lg shadow-sm border border-gray-200">
              <FileText className="h-5 w-5 text-blue-900 mr-2" />
              <span className="font-medium text-gray-700">Audit-Ready Reporting</span>
            </div>
            <div className="flex items-center bg-white px-5 py-3 rounded-lg shadow-sm border border-gray-200">
              <Globe className="h-5 w-5 text-blue-900 mr-2" />
              <span className="font-medium text-gray-700">Global Payout Support</span>
            </div>
          </div>
          <div className="flex gap-4 justify-center">
            <Button size="lg" className="bg-blue-900 hover:bg-blue-800 text-lg px-8" onClick={() => handleSelectPlan(publicTiers[1])}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 border-gray-300 text-gray-700 hover:bg-gray-50">
              View Compliance Overview
            </Button>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
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
              const isEnterprise = tier.id === 'enterprise';
              
              return (
                <Card key={tier.id} className={`relative flex flex-col ${isPopular ? 'ring-2 ring-blue-900 shadow-lg scale-105' : isEnterprise ? 'bg-gray-50 border-gray-300' : 'hover:shadow-lg'} transition-all`}>
                  {isPopular && (
                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-900 text-white px-4 py-1">
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
                        <Button className="w-full bg-gray-700 hover:bg-gray-800 text-white" size="lg" variant="outline">
                          Contact Sales
                        </Button>
                      ) : (
                        <Button 
                          className={`w-full ${isPopular ? 'bg-blue-900 hover:bg-blue-800' : ''}`}
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

      {/* What We Do Section */}
      <section className="py-12 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <Badge className="mb-4" variant="outline">What We Do</Badge>
            <h3 className="text-4xl font-bold text-gray-900 mb-6">
              Administrative Technology for Benefits Management
            </h3>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Benefitly is a multi-tenant SaaS platform that allows verified mutual benefit associations to manage and track member benefits through structured workflows.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <CheckCircle className="h-6 w-6" />
                  What Benefitly Does
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-900 flex-shrink-0 mt-0.5" />
                    <span>Manage member benefits and entitlements</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-900 flex-shrink-0 mt-0.5" />
                    <span>Automate benefit allocation workflows</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-900 flex-shrink-0 mt-0.5" />
                    <span>Maintain structured approval processes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-900 flex-shrink-0 mt-0.5" />
                    <span>Track benefit disbursement records</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-900 flex-shrink-0 mt-0.5" />
                    <span>Maintain audit-ready reporting</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <XCircle className="h-6 w-6" />
                  What Benefitly Does NOT Do
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700">
                  <li className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>Hold consumer deposits</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>Store end-user funds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>Facilitate peer-to-peer transfers</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>Operate wallets</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>Provide lending, credit, or financial tools</span>
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-white rounded border border-red-200">
                  <p className="text-sm font-semibold text-red-900">
                    All financial transactions are processed through regulated third-party providers.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Industries We Serve */}
      <section className="py-12 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Industries We Serve
            </h3>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-8">
              Benefitly exclusively serves structured, verified organizations
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <CheckCircle className="h-6 w-6" />
                  Who We Serve
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-blue-600" />
                    Mutual Benefit Associations
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-blue-600" />
                    Member-based Organizations
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-blue-600" />
                    Structured Associations
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-blue-600" />
                    Faith-based Membership Communities
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-5 w-5 text-blue-600" />
                    Professional Associations
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <XCircle className="h-6 w-6" />
                  Prohibited Industries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Cryptocurrency businesses
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Gambling platforms
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Adult content providers
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Sweepstakes operators
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    High-risk financial services
                  </li>
                  <li className="flex items-center gap-2">
                    <XCircle className="h-5 w-5 text-red-600" />
                    Remittance or money transfer businesses
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Compliance Commitment Section */}
      <section className="py-12 px-6 bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <Badge className="mb-4 bg-white text-blue-900">Our Compliance Commitment</Badge>
            <h3 className="text-4xl font-bold mb-6">
              Built for Regulatory Alignment
            </h3>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Benefitly maintains strong compliance standards aligned with U.S. regulatory expectations
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Building2 className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white text-xl">1. Business Verification</CardTitle>
              </CardHeader>
              <CardContent className="text-blue-100 space-y-2 text-sm">
                <p>We conduct verification and due diligence on all tenant organizations before activation:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Legal entity verification</li>
                  <li>• EIN confirmation</li>
                  <li>• Organizational documentation review</li>
                  <li>• Review of intended platform use</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white text-xl">2. AML & Fraud Prevention</CardTitle>
              </CardHeader>
              <CardContent className="text-blue-100 space-y-2 text-sm">
                <p>Internal controls appropriate for a SaaS infrastructure provider:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Tenant onboarding screening</li>
                  <li>• Prohibited industry filtering</li>
                  <li>• Transaction monitoring via partners</li>
                  <li>• Risk-based review processes</li>
                  <li>• Suspicious activity escalation</li>
                  <li>• Immediate policy violation suspension</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur border-white/20">
              <CardHeader>
                <div className="bg-white/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                  <Lock className="h-6 w-6 text-white" />
                </div>
                <CardTitle className="text-white text-xl">3. No Custody of Funds</CardTitle>
              </CardHeader>
              <CardContent className="text-blue-100 space-y-2 text-sm">
                <p className="font-semibold mb-2">Benefitly does NOT:</p>
                <ul className="space-y-1 ml-4">
                  <li>• Hold customer funds</li>
                  <li>• Pool funds</li>
                  <li>• Maintain stored-value accounts</li>
                  <li>• Operate as a wallet</li>
                </ul>
                <p className="pt-2 border-t border-white/20 mt-4 font-medium">
                  Funds originate from verified organizations and are processed through third-party regulated payment providers.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Risk Statement Section */}
      <section className="py-10 px-6 bg-gradient-to-r from-gray-900 to-gray-800">
        <div className="max-w-5xl mx-auto">
          <div className="bg-yellow-900/20 border-2 border-yellow-500/50 rounded-xl p-8">
            <div className="flex items-start gap-4">
              <AlertTriangle className="h-8 w-8 text-yellow-400 flex-shrink-0" />
              <div className="text-white">
                <h4 className="text-2xl font-bold mb-4">Risk & Regulatory Statement</h4>
                <p className="text-lg text-gray-200 mb-4">
                  <strong>Benefitly operates exclusively as a software service provider.</strong>
                </p>
                <div className="grid md:grid-cols-2 gap-6 text-sm text-gray-300">
                  <div>
                    <p className="font-semibold text-white mb-2">We are NOT:</p>
                    <ul className="space-y-1">
                      <li>• A payment processor</li>
                      <li>• A remittance provider</li>
                      <li>• A money transmitter</li>
                      <li>• A financial institution</li>
                      <li>• A bank</li>
                      <li>• A gig marketplace</li>
                    </ul>
                  </div>
                  <div>
                    <p className="font-semibold text-white mb-2">We provide:</p>
                    <ul className="space-y-1">
                      <li>• Administrative benefit management tools only</li>
                      <li>• Internal risk controls and compliance oversight</li>
                      <li>• Responsible platform usage monitoring</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Enterprise-Grade Platform Features
            </h3>
            <p className="text-lg text-gray-600">
              Built for compliance-forward organizations
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-blue-900" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Secure Member Management</h4>
              <p className="text-gray-600">
                Role-based access controls, encrypted data storage, and audit-ready member tracking.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="h-8 w-8 text-blue-900" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Transparent Documentation</h4>
              <p className="text-gray-600">
                Complete audit trails, transaction records, and compliance-ready reporting infrastructure.
              </p>
            </div>
            
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Globe className="h-8 w-8 text-blue-900" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Third-Party Payment Integration</h4>
              <p className="text-gray-600">
                Secure integrations with regulated payment providers (Stripe, Tremendous) for compliant disbursements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Acceptable Use Policy Section */}
      <section className="py-12 px-6 bg-white border-t-4 border-red-600">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Badge className="mb-4 bg-red-600 text-white">Acceptable Use Policy</Badge>
            <h3 className="text-3xl font-bold text-gray-900 mb-6">
              Platform Usage Restrictions
            </h3>
          </div>

          <Card className="border-2 border-red-200">
            <CardHeader className="bg-red-50">
              <CardTitle className="text-red-900">Benefitly Strictly Prohibits Use For:</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-2 gap-6 text-gray-700">
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>Cryptocurrency transactions</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>Gambling or betting services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>Adult content distribution</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>Sweepstakes or prize schemes</span>
                  </li>
                </ul>
                <ul className="space-y-2">
                  <li className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>High-risk financial instruments</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>Money transmission or remittance services</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <span>Unlicensed financial activity</span>
                  </li>
                </ul>
              </div>
              <div className="mt-6 p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-red-900 font-bold text-center">
                  ⚠️ Violation of this policy results in immediate suspension and termination.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Privacy & Security Section */}
      <section className="py-12 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h3 className="text-3xl font-bold text-gray-900 mb-4">
              Privacy & Data Security
            </h3>
            <p className="text-lg text-gray-600">
              Your data is protected with industry-leading security practices
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-blue-600" />
                  Privacy Commitment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-gray-700 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Collect only necessary administrative information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Do not sell user data</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Encrypt data in transit and at rest</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Use role-based access controls</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Maintain secure cloud infrastructure</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <span>Provide data deletion upon request</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-purple-600" />
                  Terms of Service
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-4 text-sm">
                  By using Benefitly, organizations agree that:
                </p>
                <ul className="space-y-3 text-gray-700 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>They are legally registered entities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>They will not use the platform for restricted activities</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>All benefit distributions are legitimate and lawful</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>They will comply with applicable regulations</span>
                  </li>
                </ul>
                <p className="text-xs text-gray-500 mt-4 pt-4 border-t">
                  Benefitly reserves the right to suspend accounts that violate compliance policies.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Enterprise Positioning Section */}
      <section className="py-12 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto text-center">
          <Badge className="mb-6 bg-blue-900 text-white px-4 py-2">Enterprise Ready</Badge>
          <h3 className="text-4xl font-bold text-gray-900 mb-6">
            Built for Compliance-Forward Organizations
          </h3>
          <p className="text-lg text-gray-700 mb-12 max-w-3xl mx-auto">
            Benefitly is designed for structured associations that require transparent benefit administration, audit-ready documentation, secure entitlement tracking, and compliant third-party payment integrations.
          </p>

          <div className="grid md:grid-cols-4 gap-6 text-center">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <Shield className="h-10 w-10 text-blue-900 mx-auto mb-3" />
              <p className="font-semibold text-gray-900">Regulatory Alignment</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <Lock className="h-10 w-10 text-blue-900 mx-auto mb-3" />
              <p className="font-semibold text-gray-900">Partner Compliance</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <FileText className="h-10 w-10 text-blue-900 mx-auto mb-3" />
              <p className="font-semibold text-gray-900">Risk Mitigation</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <CheckCircle className="h-10 w-10 text-blue-900 mx-auto mb-3" />
              <p className="font-semibold text-gray-900">Best Practices</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 px-6 bg-blue-900 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h3 className="text-3xl font-bold mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-xl mb-8 text-blue-100">
            Join verified mutual benefit associations using Benefitly's compliant administrative platform.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" variant="secondary" className="text-blue-900 text-lg px-8" onClick={() => handleSelectPlan(publicTiers[1])}>
              Start Free Trial
            </Button>
            <Button size="lg" variant="outline" className="border-white text-white hover:bg-white/10 text-lg px-8">
              Contact Sales
            </Button>
          </div>
          <p className="text-sm text-blue-200 mt-6">
            14-day free trial • No credit card required • Full platform access
          </p>
        </div>
      </section>

      {/* Footer - Legal Links */}
      <footer className="py-12 px-6 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h5 className="text-white font-semibold mb-4">Product</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Compliance</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Acceptable Use Policy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">AML & Compliance</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Resources</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">Documentation</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Support Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
              </ul>
            </div>
            <div>
              <h5 className="text-white font-semibold mb-4">Company</h5>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Press Kit</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <p className="text-sm">
                © 2026 Benefitly. All rights reserved.
              </p>
              <p className="text-xs text-gray-500 max-w-2xl text-center">
                Benefitly is a SaaS administrative platform only. We do not transmit money, hold funds, or operate as a financial institution. All payment processing is handled by regulated third-party providers.
              </p>
            </div>
          </div>
        </div>
      </footer>

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