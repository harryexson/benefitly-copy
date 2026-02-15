import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { base44 } from '@/api/base44Client';
import { AssociationAccount } from '@/entities/all';
import { CreditCard, Landmark, Settings2, Loader2, CheckCircle, Link as LinkIcon, DollarSign, Users, AlertTriangle, Zap } from 'lucide-react';
import { toast } from 'sonner';
import PageTooltip from '../components/onboarding/PageTooltip';
import { OnboardingProgress } from '@/entities/all';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Placeholder for a real settings entity
const AppSettings = {
  async get(key) {
    return JSON.parse(localStorage.getItem(key) || 'null');
  },
  async set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }
};

export default function Settings({ user }) {
  const [collectionAccount, setCollectionAccount] = useState({
    accountType: 'checking',
    bankName: '',
    accountHolderName: '',
    routingNumber: '',
    accountNumber: '',
    paymentProcessorType: 'stripe'
  });
  
  const [fundingAccount, setFundingAccount] = useState({
    accountHolder: '',
    routingNumber: '',
    accountNumber: '',
  });
  
  const [paymentSettings, setPaymentSettings] = useState({
    acceptCreditCards: true,
    acceptBankTransfers: true,
    acceptZelle: false,
    processingFeeHandling: 'absorbed', // 'absorbed' or 'passed_to_member'
    reminderSchedule: 'three_days', // 'one_day', 'three_days', 'weekly'
    gracePeriodDays: 5
  });

  const [isEditingCollection, setIsEditingCollection] = useState(false);
  const [isEditingFunding, setIsEditingFunding] = useState(false);
  const [isEditingPayment, setIsEditingPayment] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [associationAccount, setAssociationAccount] = useState(null);
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);
  const [isConnectingTremendous, setIsConnectingTremendous] = useState(false);
  const [onboardingProgress, setOnboardingProgress] = useState(null);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      
      let currentOnboardingProgress = null;
      // Load onboarding progress
      if (user?.association_account_id) {
        const progressRecords = await OnboardingProgress.filter({ 
          association_account_id: user.association_account_id 
        });
        if (progressRecords.length > 0) {
          const progress = progressRecords[0];
          setOnboardingProgress(progress);
          currentOnboardingProgress = progress;
          
          // Show tooltip if this is first visit and hasn't been reviewed
          if (!progress.financial_settings_reviewed) {
            setShowTooltip(true);
            await OnboardingProgress.update(progress.id, { 
              financial_settings_reviewed: true,
              profile_completed: true  // Visiting settings indicates profile is being set up
            });
          }
        }
      }
      
      const [savedCollection, savedFunding, savedPayment, assocAccounts] = await Promise.all([
        AppSettings.get('collectionAccount'),
        AppSettings.get('fundingAccount'),
        AppSettings.get('paymentSettings'),
        user?.association_account_id ? AssociationAccount.list() : Promise.resolve([])
      ]);
      
      if (user?.association_account_id && assocAccounts) {
          const currentAccount = assocAccounts.find(a => a.id === user.association_account_id);
          setAssociationAccount(currentAccount);
          
          // Check if Stripe is connected and update onboarding
          if (currentAccount?.stripe_account_id && currentOnboardingProgress && !currentOnboardingProgress.stripe_connected) {
            await OnboardingProgress.update(currentOnboardingProgress.id, { stripe_connected: true });
            setOnboardingProgress(prev => ({ ...prev, stripe_connected: true })); // Update local state too
          }
          
          // Check if Tremendous is connected and update onboarding
          if (currentAccount?.tremendous_connected && currentOnboardingProgress && !currentOnboardingProgress.tremendous_connected) {
            await OnboardingProgress.update(currentOnboardingProgress.id, { tremendous_connected: true });
            setOnboardingProgress(prev => ({ ...prev, tremendous_connected: true }));
          }
      }

      if (savedCollection) setCollectionAccount(savedCollection);
      if (savedFunding) setFundingAccount(savedFunding);
      if (savedPayment) setPaymentSettings(savedPayment);
      
      setIsLoading(false);
    };
    loadSettings();
  }, [user]);

  const handleInitiateStripeOnboarding = async () => {
      setIsConnectingStripe(true);
      try {
          const response = await base44.functions.invoke('initiateStripeOnboarding');
          if (response.data.url) {
              // Open in new window to avoid iframe blocking issues
              window.open(response.data.url, '_blank', 'noopener,noreferrer');
              toast.success("Stripe setup opened in new window. Complete the setup and return here.");
              setIsConnectingStripe(false);
          } else {
              toast.error("Could not retrieve Stripe connection link. Please try again.");
              setIsConnectingStripe(false);
          }
      } catch (error) {
          console.error("Failed to initiate Stripe onboarding:", error);
          console.error("Error response data:", error.response?.data);
          
          // Check for Stripe Connect setup errors
          if (error.response?.data?.details === 'platform_profile_incomplete') {
              toast.error(
                  <div className="space-y-2">
                      <div className="font-semibold">⚠️ Stripe Platform Profile Required</div>
                      <div className="text-sm">{error.response.data.message}</div>
                      <a 
                          href={error.response.data.helpUrl || "https://dashboard.stripe.com/settings/connect/platform-profile"} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 underline text-sm block mt-2 font-medium"
                      >
                          Complete Platform Profile in Stripe →
                      </a>
                  </div>,
                  { duration: 15000 }
              );
          } else if (error.response?.data?.details === 'connect_not_enabled') {
              toast.error(
                  <div className="space-y-2">
                      <div className="font-semibold">⚠️ Stripe Connect Not Enabled</div>
                      <div className="text-sm">{error.response.data.message}</div>
                      <a 
                          href="https://dashboard.stripe.com/settings/connect" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 underline text-sm block mt-2 font-medium"
                      >
                          Open Stripe Dashboard to Enable Connect →
                      </a>
                  </div>,
                  { duration: 15000 }
              );
          } else {
              const errorMessage = error.response?.data?.fullError || error.response?.data?.error || error.message || "Failed to connect to Stripe";
              toast.error(
                  <div className="space-y-2">
                      <div className="font-semibold">Connection Error</div>
                      <div className="text-sm">{errorMessage}</div>
                      {error.response?.data?.helpUrl && (
                          <a 
                              href={error.response.data.helpUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 underline text-sm block"
                          >
                              Get Help →
                          </a>
                      )}
                  </div>,
                  { duration: 8000 }
              );
          }
          
          setIsConnectingStripe(false);
      }
  };

  const handleConnectTremendous = async () => {
    setIsConnectingTremendous(true);
    try {
      const redirectUri = `${window.location.origin}/api/functions/tremendousOAuthCallback`;
      const response = await base44.functions.invoke('initiateTremendousConnect', {
        redirect_uri: redirectUri
      });

      if (response.data.success && response.data.authorization_url) {
        window.location.href = response.data.authorization_url;
      } else {
        toast.error('Failed to initiate Tremendous connection');
        setIsConnectingTremendous(false);
      }
    } catch (error) {
      console.error('Failed to connect Tremendous:', error);
      toast.error(error.message || 'Failed to connect Tremendous');
      setIsConnectingTremendous(false);
    }
  };

  const handleSaveCollection = async (e) => {
    e.preventDefault();
    await AppSettings.set('collectionAccount', collectionAccount);
    setIsEditingCollection(false);
    toast.success('Collection account details saved!');
  };

  const handleSaveFunding = async (e) => {
    e.preventDefault();
    await AppSettings.set('fundingAccount', fundingAccount);
    setIsEditingFunding(false);
    toast.success('Funding account details saved!');
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    await AppSettings.set('paymentSettings', paymentSettings);
    
    // Also save fee handling to association account for backend use
    if (associationAccount) {
      try {
        await AssociationAccount.update(associationAccount.id, {
          processing_fee_handling: paymentSettings.processingFeeHandling
        });
      } catch (err) {
        console.error('Failed to save fee handling to account:', err);
      }
    }
    
    setIsEditingPayment(false);
    toast.success('Payment settings saved!');
  };

  if (isLoading) {
    return <p>Loading settings...</p>;
  }

  return (
    <div className="space-y-8">
      <PageTooltip
        isVisible={showTooltip}
        onDismiss={() => setShowTooltip(false)}
        title="⚙️ Welcome to Settings & Financial Configuration"
        description="This is where you'll connect your Stripe account, configure payment collection, and set up member payout options. Start by connecting Stripe to begin processing payments."
        actions={[
          {
            label: "Got It",
            variant: "outline",
            onClick: () => setShowTooltip(false)
          }
        ]}
      />
      
      <Tabs defaultValue="collection" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="financials">Stripe Account</TabsTrigger>
          <TabsTrigger value="collection">Payment Collection</TabsTrigger>
          <TabsTrigger value="funding">Member Payouts</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
        </TabsList>
        
        <TabsContent value="collection" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Payment Collection Account
              </CardTitle>
              <CardDescription>
                Configure where member contributions and subscription payments will be deposited.
                This is the account that receives money FROM your members.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveCollection} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="paymentProcessorType">Payment Processor</Label>
                    <Select 
                      value={collectionAccount.paymentProcessorType}
                      onValueChange={(value) => setCollectionAccount({...collectionAccount, paymentProcessorType: value})}
                      disabled={!isEditingCollection}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="stripe">Stripe</SelectItem>
                        <SelectItem value="square">Square</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="direct_bank">Direct Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Account Type</Label>
                    <Select 
                      value={collectionAccount.accountType}
                      onValueChange={(value) => setCollectionAccount({...collectionAccount, accountType: value})}
                      disabled={!isEditingCollection}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="checking">Business Checking</SelectItem>
                        <SelectItem value="savings">Business Savings</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={collectionAccount.bankName}
                    onChange={(e) => setCollectionAccount({...collectionAccount, bankName: e.target.value})}
                    disabled={!isEditingCollection}
                    placeholder="e.g., Chase Bank, Wells Fargo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accountHolderName">Account Holder Name</Label>
                  <Input
                    id="accountHolderName"
                    value={collectionAccount.accountHolderName}
                    onChange={(e) => setCollectionAccount({...collectionAccount, accountHolderName: e.target.value})}
                    disabled={!isEditingCollection}
                    placeholder="Your Organization Name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="routingNumber">Routing Number</Label>
                    <Input
                      id="routingNumber"
                      value={collectionAccount.routingNumber}
                      onChange={(e) => setCollectionAccount({...collectionAccount, routingNumber: e.target.value})}
                      disabled={!isEditingCollection}
                      placeholder="9-digit routing number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number</Label>
                    <Input
                      id="accountNumber"
                      type="password"
                      value={collectionAccount.accountNumber}
                      onChange={(e) => setCollectionAccount({...collectionAccount, accountNumber: e.target.value})}
                      disabled={!isEditingCollection}
                      placeholder="Account number"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  {isEditingCollection ? (
                    <>
                      <Button type="button" variant="ghost" onClick={() => setIsEditingCollection(false)}>Cancel</Button>
                      <Button type="submit">Save Account Details</Button>
                    </>
                  ) : (
                    <Button type="button" onClick={() => setIsEditingCollection(true)}>Edit Account Details</Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Member Benefit Payout Platform
              </CardTitle>
              <CardDescription>
                Choose how you send benefit payouts to members globally. Connect Tremendous for flexible payment options including bank transfers, PayPal, Venmo, and gift cards.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {associationAccount ? (
                <>
                  {/* Payout Provider Selection */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      associationAccount.payout_provider === 'stripe' || associationAccount.payout_provider === 'both'
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Landmark className="h-5 w-5 text-blue-600" />
                          <h4 className="font-semibold">Stripe Payouts</h4>
                        </div>
                        {associationAccount.stripe_payouts_enabled && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Direct bank transfers to US members via Stripe Connect
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1">
                        <li>• US bank accounts only</li>
                        <li>• Standard (free) or instant payouts</li>
                        <li>• 1-2 day delivery</li>
                      </ul>
                    </div>

                    <div className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                      associationAccount.payout_provider === 'tremendous' || associationAccount.payout_provider === 'both'
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Zap className="h-5 w-5 text-purple-600" />
                          <h4 className="font-semibold">Tremendous Payouts</h4>
                        </div>
                        {associationAccount.tremendous_connected && (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Global payouts with multiple payment options
                      </p>
                      <ul className="text-xs text-gray-500 space-y-1">
                        <li>• Bank transfer, PayPal, Venmo, cards</li>
                        <li>• 200+ countries supported</li>
                        <li>• $0.75 per payout + optional % fee</li>
                      </ul>
                    </div>
                  </div>

                  {/* Tremendous Connection Section */}
                  {associationAccount.tremendous_connected ? (
                    <Alert className="bg-purple-50 border-purple-200">
                      <CheckCircle className="h-4 w-4 text-purple-600" />
                      <AlertDescription className="text-purple-800">
                        <div className="space-y-2">
                          <div className="font-semibold">Tremendous Account Connected</div>
                          <div className="text-sm">Organization ID: {associationAccount.tremendous_organization_id}</div>
                          <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                            <div>
                              <span className="font-medium">KYB Status:</span>{' '}
                              <span className={
                                associationAccount.tremendous_kyb_status === 'approved' ? 'text-green-600' :
                                associationAccount.tremendous_kyb_status === 'pending' ? 'text-orange-600' :
                                'text-red-600'
                              }>
                                {associationAccount.tremendous_kyb_status === 'approved' ? '✓ Approved' :
                                 associationAccount.tremendous_kyb_status === 'pending' ? '⏳ Pending' :
                                 '⚠️ ' + (associationAccount.tremendous_kyb_status || 'Unknown')}
                              </span>
                            </div>
                            <div>
                              <span className="font-medium">Connected:</span>{' '}
                              <span className="text-purple-600">
                                {new Date(associationAccount.tremendous_connected_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4 p-3 bg-white rounded border border-purple-200">
                            <h5 className="font-semibold text-purple-900 mb-2 text-sm">Transaction Fees</h5>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>Fixed fee per payout:</span>
                                <span className="font-mono">${(associationAccount.tremendous_transaction_fee || 0.75).toFixed(2)}</span>
                              </div>
                              {associationAccount.tremendous_percentage_fee > 0 && (
                                <div className="flex justify-between">
                                  <span>Enterprise percentage fee:</span>
                                  <span className="font-mono">{associationAccount.tremendous_percentage_fee}%</span>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="mt-4 p-3 bg-white rounded border border-purple-200">
                            <h5 className="font-semibold text-purple-900 mb-2 text-sm">Usage Statistics</h5>
                            <div className="space-y-1 text-xs">
                              <div className="flex justify-between">
                                <span>Total payouts:</span>
                                <span className="font-mono">{associationAccount.total_tremendous_payouts || 0}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total volume:</span>
                                <span className="font-mono">${(associationAccount.total_tremendous_volume || 0).toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Platform fees collected:</span>
                                <span className="font-mono">${(associationAccount.total_tremendous_fees_collected || 0).toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <div className="space-y-6">
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800">
                          <strong>Tremendous Not Connected</strong>
                          <p className="mt-1 text-sm">Connect Tremendous to enable global payouts with multiple payment options.</p>
                        </AlertDescription>
                      </Alert>

                      <div className="p-4 bg-gray-50 rounded-lg">
                        <h4 className="font-semibold mb-3">Why connect Tremendous?</h4>
                        <ul className="space-y-2 text-sm text-gray-600">
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Global reach:</strong> Send payouts to 200+ countries</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Flexible options:</strong> Bank, PayPal, Venmo, prepaid cards, gift cards</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Compliance built-in:</strong> KYB verification and tax reporting handled</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span><strong>Simple pricing:</strong> $0.75 per payout (no hidden fees)</span>
                          </li>
                        </ul>
                      </div>

                      <div className="flex justify-center">
                        <Button
                          size="lg"
                          onClick={handleConnectTremendous}
                          disabled={isConnectingTremendous}
                          className="gap-2 bg-purple-600 hover:bg-purple-700"
                        >
                          {isConnectingTremendous ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Connecting to Tremendous...
                            </>
                          ) : (
                            <>
                              <Zap className="h-5 w-5" />
                              Connect Tremendous Account
                            </>
                          )}
                        </Button>
                      </div>

                      <p className="text-xs text-center text-gray-500">
                        You'll be redirected to Tremendous to complete the secure OAuth connection
                      </p>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-500">Loading association details...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="financials" className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5" />
                        Connect Your Association's Stripe Account
                    </CardTitle>
                    <CardDescription>
                        Connect your own Stripe account to receive member contributions directly and disburse benefit payouts to members' bank accounts. All funds go directly to YOUR account.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {associationAccount ? (
                        associationAccount.stripe_account_id ? (
                             <div className="space-y-4">
                                <Alert className="bg-green-50 border-green-200">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-800">
                                        <div className="space-y-2">
                                            <div className="font-semibold">Stripe Account Connected</div>
                                            <div>Account ID: {associationAccount.stripe_account_id}</div>
                                            <div className="grid grid-cols-2 gap-4 mt-3">
                                                <div>
                                                    <span className="text-sm font-medium">Charges:</span>{' '}
                                                    <span className={associationAccount.stripe_charges_enabled ? 'text-green-600' : 'text-orange-600'}>
                                                        {associationAccount.stripe_charges_enabled ? '✓ Enabled' : '⏳ Pending Verification'}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-sm font-medium">Payouts:</span>{' '}
                                                    <span className={associationAccount.stripe_payouts_enabled ? 'text-green-600' : 'text-orange-600'}>
                                                        {associationAccount.stripe_payouts_enabled ? '✓ Enabled' : '⏳ Pending Verification'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </AlertDescription>
                                </Alert>

                                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <h4 className="font-semibold text-blue-900 mb-2">What you can do:</h4>
                                    <ul className="space-y-1 text-sm text-blue-800">
                                        <li>• Accept member contributions via credit/debit cards</li>
                                        <li>• Process benefit payouts directly to members' bank accounts</li>
                                        <li>• All funds go directly to YOUR bank account</li>
                                        <li>• Track all transactions in your Stripe dashboard</li>
                                    </ul>
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={handleInitiateStripeOnboarding}
                                    disabled={isConnectingStripe}
                                >
                                    {isConnectingStripe ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Connecting...
                                        </>
                                    ) : (
                                        <>
                                            <Settings2 className="mr-2 h-4 w-4" />
                                            Update Stripe Settings
                                        </>
                                    )}
                                </Button>
                             </div>
                        ) : (
                             <div className="space-y-6">
                                <Alert className="bg-yellow-50 border-yellow-200">
                                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                    <AlertDescription className="text-yellow-800">
                                        <strong>Stripe Account Not Connected</strong>
                                        <p className="mt-1">You need to connect your Stripe account to accept payments and process payouts.</p>
                                    </AlertDescription>
                                </Alert>

                                <div className="space-y-4">
                                    <div className="p-4 bg-gray-50 rounded-lg">
                                        <h4 className="font-semibold mb-3">Why connect Stripe?</h4>
                                        <ul className="space-y-2 text-sm text-gray-600">
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                <span><strong>Direct deposits:</strong> All contributions go straight to your bank account</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                <span><strong>Secure:</strong> Bank-level security for all transactions</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                <span><strong>Easy payouts:</strong> Send benefits directly to members' bank accounts</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                                                <span><strong>Transparent:</strong> Track every transaction in your Stripe dashboard</span>
                                            </li>
                                        </ul>
                                    </div>

                                    <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                                        <h4 className="font-semibold text-blue-900 mb-2">What you'll need:</h4>
                                        <ul className="space-y-1 text-sm text-blue-800">
                                            <li>• Business information (EIN or Tax ID)</li>
                                            <li>• Bank account details for deposits</li>
                                            <li>• Personal identification for verification</li>
                                            <li>• Takes about 5-10 minutes to complete</li>
                                        </ul>
                                    </div>
                                </div>

                                <div className="flex justify-center">
                                    <Button
                                        size="lg"
                                        onClick={handleInitiateStripeOnboarding}
                                        disabled={isConnectingStripe}
                                        className="gap-2"
                                    >
                                        {isConnectingStripe ? (
                                            <>
                                                <Loader2 className="h-5 w-5 animate-spin" />
                                                Connecting to Stripe...
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard className="h-5 w-5" />
                                                Connect Stripe Account
                                            </>
                                        )}
                                    </Button>
                                </div>

                                <p className="text-xs text-center text-gray-500">
                                    You'll be redirected to Stripe's secure platform to complete the setup
                                </p>
                             </div>
                        )
                    ) : (
                        <p className="text-sm text-gray-500">Loading association details...</p>
                    )}
                </CardContent>
            </Card>

            {/* Payment & Funding Accounts */}
            {associationAccount?.stripe_account_id && (
                <Card>
                    <CardHeader>
                        <CardTitle>Account Configuration</CardTitle>
                        <CardDescription>
                            Configure how contributions are collected and benefits are funded
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-4 border rounded-lg space-y-3">
                                <div className="flex items-center gap-2 text-green-700">
                                    <DollarSign className="h-5 w-5" />
                                    <h4 className="font-semibold">Payment Collection Account</h4>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Member contributions are collected through Stripe and deposited directly into your connected bank account.
                                </p>
                                <div className="text-sm bg-green-50 p-3 rounded">
                                    <div className="font-medium text-green-900">Connected Bank Account</div>
                                    <div className="text-green-700">Deposits via Stripe Connect</div>
                                </div>
                            </div>

                            <div className="p-4 border rounded-lg space-y-3">
                                <div className="flex items-center gap-2 text-blue-700">
                                    <Users className="h-5 w-5" />
                                    <h4 className="font-semibold">Member Benefit Funding Account</h4>
                                </div>
                                <p className="text-sm text-gray-600">
                                    Benefit payouts are disbursed from your connected bank account directly to members' accounts via Stripe.
                                </p>
                                <div className="text-sm bg-blue-50 p-3 rounded">
                                    <div className="font-medium text-blue-900">Connected Bank Account</div>
                                    <div className="text-blue-700">Payouts via Stripe Connect</div>
                                </div>
                            </div>
                        </div>

                        <Alert className="bg-blue-50 border-blue-200">
                            <AlertDescription className="text-blue-800">
                                <strong>Note:</strong> Your Stripe account manages both incoming contributions and outgoing benefit payouts. 
                                All transactions are processed through your connected bank account with full transparency and tracking.
                            </AlertDescription>
                        </Alert>
                    </CardContent>
                </Card>
            )}
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings2 className="h-5 w-5" />
                Payment Processing Preferences
              </CardTitle>
              <CardDescription>
                Configure how payments are processed and member notification settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePayment} className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-base font-medium">Accepted Payment Methods</Label>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="acceptCreditCards"
                        checked={paymentSettings.acceptCreditCards}
                        onChange={(e) => setPaymentSettings({...paymentSettings, acceptCreditCards: e.target.checked})}
                        disabled={!isEditingPayment}
                        className="rounded"
                      />
                      <Label htmlFor="acceptCreditCards">Credit & Debit Cards</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="acceptBankTransfers"
                        checked={paymentSettings.acceptBankTransfers}
                        onChange={(e) => setPaymentSettings({...paymentSettings, acceptBankTransfers: e.target.checked})}
                        disabled={!isEditingPayment}
                        className="rounded"
                      />
                      <Label htmlFor="acceptBankTransfers">ACH Bank Transfers</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="acceptZelle"
                        checked={paymentSettings.acceptZelle}
                        onChange={(e) => setPaymentSettings({...paymentSettings, acceptZelle: e.target.checked})}
                        disabled={!isEditingPayment}
                        className="rounded"
                      />
                      <Label htmlFor="acceptZelle">Zelle Payments</Label>
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-base font-medium">Processing Fee Handling</Label>
                  <Select 
                    value={paymentSettings.processingFeeHandling}
                    onValueChange={(value) => setPaymentSettings({...paymentSettings, processingFeeHandling: value})}
                    disabled={!isEditingPayment}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="absorbed">Organization absorbs fees</SelectItem>
                      <SelectItem value="passed_to_member">Pass fees to members</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-gray-500">
                    {paymentSettings.processingFeeHandling === 'absorbed' 
                      ? 'Your organization will cover the 2.9% + $0.30 Stripe processing fee on each transaction.'
                      : 'Members will see the processing fee (2.9% + $0.30) added to their contribution amount at checkout.'}
                  </p>
                </div>

                <Separator />

                <div className="space-y-4">
                  <Label className="text-base font-medium">Payment Reminder Schedule</Label>
                  <Select 
                    value={paymentSettings.reminderSchedule}
                    onValueChange={(value) => setPaymentSettings({...paymentSettings, reminderSchedule: value})}
                    disabled={!isEditingPayment}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="one_day">1 day before due date</SelectItem>
                      <SelectItem value="three_days">3 days before due date</SelectItem>
                      <SelectItem value="weekly">1 week before due date</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-4">
                  <Label htmlFor="gracePeriodDays" className="text-base font-medium">Grace Period (days after due date)</Label>
                  <Input
                    id="gracePeriodDays"
                    type="number"
                    min="0"
                    max="30"
                    value={paymentSettings.gracePeriodDays}
                    onChange={(e) => setPaymentSettings({...paymentSettings, gracePeriodDays: parseInt(e.target.value)})}
                    disabled={!isEditingPayment}
                  />
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  {isEditingPayment ? (
                    <>
                      <Button type="button" variant="ghost" onClick={() => setIsEditingPayment(false)}>Cancel</Button>
                      <Button type="submit">Save Preferences</Button>
                    </>
                  ) : (
                    <Button type="button" onClick={() => setIsEditingPayment(true)}>Edit Preferences</Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}