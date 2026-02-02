import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, BarChart3, AlertCircle } from 'lucide-react';

export default function MarketingIntelligence() {
  const competitors = [
    {
      name: 'Wild Apricot',
      pricing: { starter: 60, professional: 120, enterprise: 300 },
      memberLimit: { starter: 100, professional: 500, enterprise: 2000 },
      strengths: ['Established brand', 'Feature-rich', 'Large customer base'],
      weaknesses: ['Expensive', 'Complex UI', 'Poor support'],
      marketShare: '35%',
      rating: 3.8
    },
    {
      name: 'MemberClicks',
      pricing: { basic: 89, plus: 189, enterprise: 'Custom' },
      memberLimit: { basic: 200, plus: 1000, enterprise: 'Unlimited' },
      strengths: ['Good AMS features', 'Event management', 'Certification tracking'],
      weaknesses: ['Higher price point', 'Learning curve', 'Limited automation'],
      marketShare: '18%',
      rating: 4.1
    },
    {
      name: 'GrowthZone',
      pricing: { starter: 125, pro: 250, enterprise: 'Custom' },
      memberLimit: { starter: 250, pro: 750, enterprise: 'Unlimited' },
      strengths: ['CRM integration', 'Marketing automation', 'Mobile app'],
      weaknesses: ['Very expensive', 'Overkill for small orgs', 'Complex setup'],
      marketShare: '12%',
      rating: 4.0
    },
    {
      name: 'Glue Up',
      pricing: { essential: 99, pro: 199, enterprise: 399 },
      memberLimit: { essential: 500, pro: 2000, enterprise: 'Unlimited' },
      strengths: ['Event focus', 'Networking features', 'Modern UI'],
      weaknesses: ['Limited customization', 'Fewer integrations', 'Support issues'],
      marketShare: '8%',
      rating: 3.9
    }
  ];

  const marketInsights = {
    totalMarketSize: '$450M',
    growthRate: '12.5%',
    targetCustomers: '125,000',
    avgDealSize: '$2,400',
    salesCycle: '45 days',
    churnRate: '18%'
  };

  const ourAdvantages = [
    {
      title: '50-90% Lower Pricing',
      description: 'Dramatically undercut competitors while maintaining profitability',
      impact: 'High'
    },
    {
      title: 'Benefit-Focused Design',
      description: 'Purpose-built for mutual aid societies, not general membership',
      impact: 'High'
    },
    {
      title: 'Stripe Direct Integration',
      description: 'Funds go directly to customer accounts, not through us',
      impact: 'Medium'
    },
    {
      title: 'Simple Onboarding',
      description: '5-minute setup vs 2+ hours for competitors',
      impact: 'High'
    },
    {
      title: 'Modern Tech Stack',
      description: 'Built with latest technologies for speed and reliability',
      impact: 'Medium'
    }
  ];

  const marketingStrategy = [
    {
      channel: 'Content Marketing',
      tactics: ['SEO-optimized blog posts', 'Comparison guides', 'Case studies'],
      budget: '$2,000/mo',
      expectedROI: '300%'
    },
    {
      channel: 'Direct Sales',
      tactics: ['LinkedIn outreach', 'Trade shows', 'Referral program'],
      budget: '$5,000/mo',
      expectedROI: '450%'
    },
    {
      channel: 'Paid Advertising',
      tactics: ['Google Ads', 'Facebook targeting', 'Retargeting'],
      budget: '$3,000/mo',
      expectedROI: '250%'
    },
    {
      channel: 'Partnerships',
      tactics: ['Association partnerships', 'Consultant network', 'Integration partners'],
      budget: '$1,000/mo',
      expectedROI: '500%'
    }
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Marketing Intelligence & Competitive Analysis</CardTitle>
          <CardDescription>Market positioning, competitor analysis, and strategic insights</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="market" className="w-full">
            <TabsList>
              <TabsTrigger value="market">Market Overview</TabsTrigger>
              <TabsTrigger value="competitors">Competitors</TabsTrigger>
              <TabsTrigger value="positioning">Our Positioning</TabsTrigger>
              <TabsTrigger value="strategy">Marketing Strategy</TabsTrigger>
              <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            </TabsList>

            <TabsContent value="market" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Market Size</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">{marketInsights.totalMarketSize}</p>
                    <p className="text-sm text-gray-500">Total addressable market</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Growth Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-blue-600">{marketInsights.growthRate}</p>
                    <p className="text-sm text-gray-500">Year-over-year growth</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Target Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-purple-600">{marketInsights.targetCustomers}</p>
                    <p className="text-sm text-gray-500">Potential organizations</p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Market Dynamics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <h4 className="font-semibold">Avg Deal Size</h4>
                      </div>
                      <p className="text-2xl font-bold">{marketInsights.avgDealSize}</p>
                      <p className="text-sm text-gray-500">Per customer annually</p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        <h4 className="font-semibold">Sales Cycle</h4>
                      </div>
                      <p className="text-2xl font-bold">{marketInsights.salesCycle}</p>
                      <p className="text-sm text-gray-500">From lead to close</p>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-5 w-5 text-orange-600" />
                        <h4 className="font-semibold">Industry Churn</h4>
                      </div>
                      <p className="text-2xl font-bold">{marketInsights.churnRate}</p>
                      <p className="text-sm text-gray-500">Annual average</p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-semibold text-blue-900 mb-2">💡 Key Opportunity</h4>
                    <p className="text-sm text-blue-800">
                      The mutual aid society market is underserved with high pricing from legacy providers. 
                      Our value proposition of 50-90% cost savings with modern technology positions us uniquely 
                      to capture market share rapidly.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="competitors" className="space-y-4">
              <div className="space-y-4">
                {competitors.map(comp => (
                  <Card key={comp.name}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{comp.name}</CardTitle>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{comp.marketShare} market share</Badge>
                          <Badge className="bg-yellow-100 text-yellow-800">★ {comp.rating}</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <h4 className="font-semibold mb-2 text-green-700">Pricing</h4>
                          <ul className="space-y-1 text-sm">
                            <li>Starter: ${typeof comp.pricing.starter === 'number' ? comp.pricing.starter : 'Custom'}/mo</li>
                            <li>Professional: ${typeof comp.pricing.professional === 'number' ? comp.pricing.professional : 'Custom'}/mo</li>
                            <li>Enterprise: {typeof comp.pricing.enterprise === 'string' ? comp.pricing.enterprise : `$${comp.pricing.enterprise}/mo`}</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 text-blue-700">Strengths</h4>
                          <ul className="space-y-1 text-sm">
                            {comp.strengths.map((s, i) => (
                              <li key={i}>✓ {s}</li>
                            ))}
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold mb-2 text-red-700">Weaknesses</h4>
                          <ul className="space-y-1 text-sm">
                            {comp.weaknesses.map((w, i) => (
                              <li key={i}>✗ {w}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      <div className="p-3 bg-purple-50 rounded border border-purple-200">
                        <p className="text-sm text-purple-900">
                          <strong>Our Advantage:</strong> We offer {Math.round(((comp.pricing.starter - 33) / comp.pricing.starter) * 100)}% 
                          lower pricing with better UX and faster onboarding.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="positioning" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Competitive Advantages</CardTitle>
                  <CardDescription>What sets us apart in the market</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {ourAdvantages.map((adv, i) => (
                    <div key={i} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-lg">{adv.title}</h4>
                        <Badge className={adv.impact === 'High' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                          {adv.impact} Impact
                        </Badge>
                      </div>
                      <p className="text-gray-600">{adv.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Value Proposition</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border-2 border-blue-200">
                    <h3 className="text-2xl font-bold text-blue-900 mb-4">
                      "The Modern Platform for Mutual Aid Societies"
                    </h3>
                    <p className="text-lg text-blue-800 mb-4">
                      Benefitly delivers enterprise-grade member management and benefit processing at 
                      50-90% lower cost than legacy competitors, with modern technology and 
                      5-minute onboarding.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="bg-white p-3 rounded border border-blue-200">
                        <p className="font-semibold text-blue-900">Price Leader</p>
                        <p className="text-sm text-blue-700">50-90% savings</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-blue-200">
                        <p className="font-semibold text-blue-900">Purpose-Built</p>
                        <p className="text-sm text-blue-700">For mutual aid societies</p>
                      </div>
                      <div className="bg-white p-3 rounded border border-blue-200">
                        <p className="font-semibold text-blue-900">Modern Tech</p>
                        <p className="text-sm text-blue-700">Fast & reliable</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="strategy" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Marketing Strategy & Channel Mix</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {marketingStrategy.map((strategy, i) => (
                    <div key={i} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold text-lg">{strategy.channel}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{strategy.budget}</Badge>
                          <Badge className="bg-green-100 text-green-800">{strategy.expectedROI} ROI</Badge>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-gray-700">Tactics:</p>
                        <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {strategy.tactics.map((tactic, j) => (
                            <li key={j} className="text-sm bg-gray-50 p-2 rounded">• {tactic}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Target Segments</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Primary: Small to Mid-Size Societies</h4>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li>• 50-500 members</li>
                        <li>• Price-sensitive</li>
                        <li>• Currently using spreadsheets or outdated software</li>
                        <li>• Need fast implementation</li>
                      </ul>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <h4 className="font-semibold mb-2">Secondary: New Organizations</h4>
                      <ul className="space-y-1 text-sm text-gray-600">
                        <li>• Just starting out</li>
                        <li>• Limited budget</li>
                        <li>• Tech-savvy leadership</li>
                        <li>• Growth-oriented</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="campaigns" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Active Campaigns</CardTitle>
                    <Button>Create Campaign</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Q1 2026 Launch Campaign</h4>
                        <Badge className="bg-green-100 text-green-800">Active</Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Multi-channel launch campaign targeting small mutual aid societies
                      </p>
                      <div className="grid grid-cols-4 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Leads</p>
                          <p className="font-semibold">247</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Conversions</p>
                          <p className="font-semibold">18</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Spend</p>
                          <p className="font-semibold">$8,450</p>
                        </div>
                        <div>
                          <p className="text-gray-500">ROI</p>
                          <p className="font-semibold text-green-600">285%</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg opacity-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">Competitor Comparison Campaign</h4>
                        <Badge variant="outline">Planned</Badge>
                      </div>
                      <p className="text-sm text-gray-600">
                        SEO-focused content comparing Benefitly vs major competitors
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}