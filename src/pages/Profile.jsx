import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Member, EventContribution, Event, NotificationPreference, Payout } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Landmark, AlertTriangle, Lock, Loader2, Shield, Receipt, CreditCard, Target } from 'lucide-react';
import ContributionGoalTracker from '../components/member/ContributionGoalTracker';
import RecurringContributionManager from '../components/member/RecurringContributionManager';
import TaxSummaryGenerator from '../components/member/TaxSummaryGenerator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import QuickExpenseCapture from '../components/expenses/QuickExpenseCapture';
import PayoutSettingsManager from '../components/member/PayoutSettingsManager';

export default function Profile({ user: currentUserProp }) { // Renamed to currentUserProp to avoid conflict with state
  const [user, setUser] = useState(null); // Local state for the user, updated when currentUserProp changes or after user updates profile
  const [member, setMember] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [events, setEvents] = useState([]);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    full_name: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // New state for bank account
  const [isAddingBankAccount, setIsAddingBankAccount] = useState(false);
  const [bankAccountForm, setBankAccountForm] = useState({
    account_holder_name: '',
    routing_number: '',
    account_number: '',
    account_number_confirm: '',
    account_holder_type: 'individual'
  });
  const [isSavingBankAccount, setIsSavingBankAccount] = useState(false);

  // Notification preferences state
  const [notifPrefs, setNotifPrefs] = useState({
    email_contribution_reminders: true,
    email_event_reminders: true,
    email_payout_notifications: true,
    email_forum_activity: false,
    email_proposal_updates: true,
    email_general_announcements: true,
    reminder_days_before: 3
  });
  const [notifPrefsId, setNotifPrefsId] = useState(null);

  useEffect(() => {
    const fetchProfileData = async () => {
        if (!currentUserProp) {
            setIsLoading(false);
            return;
        }
      try {
        setIsLoading(true);
        setUser(currentUserProp);

        // Fetch member data
        const memberResults = await Member.filter({ email: currentUserProp.email });

        if (memberResults.length > 0) {
          const currentMember = memberResults[0];
          setMember(currentMember);
          setFormData({
            full_name: currentUserProp.full_name || '',
          });

          // Load notification preferences
          const prefs = await NotificationPreference.filter({ member_id: currentMember.id });
          if (prefs.length > 0) {
            setNotifPrefs(prefs[0]);
            setNotifPrefsId(prefs[0].id);
          } else {
            // Create default preferences
            const newPrefs = await NotificationPreference.create({
              member_id: currentMember.id,
              ...notifPrefs
            });
            setNotifPrefs(newPrefs); // Ensure state reflects created prefs
            setNotifPrefsId(newPrefs.id);
          }

          // Fetch contributions, payouts and related events
          const [contribs, payoutList, eventList] = await Promise.all([
            EventContribution.filter({ member_id: currentMember.id }, '-created_date'),
            Payout.filter({ payee_member_id: currentMember.id }, '-created_date'),
            Event.list()
          ]);
          setContributions(contribs);
          setPayouts(payoutList);
          setEvents(eventList);

        } else {
            setFormData({ full_name: currentUserProp.full_name || '' });
        }

      } catch (error) {
        if (error.name === 'CanceledError' || (error.message && error.message.includes('aborted'))) {
            console.log('Profile data fetch aborted.');
        } else {
            console.error("Failed to fetch profile data:", error);
            toast.error("Failed to load profile details."); // Changed error message and removed navigation
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfileData();
  }, [currentUserProp]); // Depend on currentUserProp

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      // Update User data
      await User.updateMyUserData({ full_name: formData.full_name });

      // Re-fetch updated user data to ensure local state is fresh
      const updatedUser = await User.me();
      setUser(updatedUser); // Update local user state
      // Member data is updated via specific functions like handleAddBankAccount, not this form.

      setIsEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error("Failed to update profile:", error);
      toast.error("Failed to update profile.");
    }
  };

  const handleAddBankAccount = async (e) => {
    e.preventDefault();

    console.log('=== handleAddBankAccount CALLED ===');
    console.log('Member:', member);
    console.log('Form data:', bankAccountForm);

    if (!member || !member.id) {
      console.error('VALIDATION FAILED: No member or member.id');
      toast.error('Member profile not loaded. Please refresh the page.');
      return;
    }

    // Validate
    if (bankAccountForm.account_number !== bankAccountForm.account_number_confirm) {
      console.error('VALIDATION FAILED: Account numbers do not match');
      toast.error('Account numbers do not match');
      return;
    }

    if (!bankAccountForm.routing_number || bankAccountForm.routing_number.length !== 9) {
      console.error('VALIDATION FAILED: Invalid routing number', bankAccountForm.routing_number);
      toast.error('Routing number must be 9 digits');
      return;
    }

    console.log('=== SUBMITTING BANK ACCOUNT FORM ===');
    console.log('Member object:', member);
    console.log('Form data:', {
      account_holder_name: bankAccountForm.account_holder_name || 'EMPTY',
      routing_number: bankAccountForm.routing_number ? `${bankAccountForm.routing_number.length} digits` : 'EMPTY',
      account_number: bankAccountForm.account_number ? `${bankAccountForm.account_number.length} digits` : 'EMPTY',
      account_holder_type: bankAccountForm.account_holder_type
    });

    // Validate locally before sending
    if (!member || !member.id) {
      console.error('Member not loaded:', member);
      toast.error('Member profile not loaded properly. Please refresh the page.');
      return;
    }

    if (!bankAccountForm.account_holder_name?.trim()) {
      toast.error('Please enter the account holder name');
      return;
    }

    if (!bankAccountForm.routing_number?.trim()) {
      toast.error('Please enter the routing number');
      return;
    }

    if (!bankAccountForm.account_number?.trim()) {
      toast.error('Please enter the account number');
      return;
    }

    setIsSavingBankAccount(true);
    try {
      const payload = {
        member_id: member.id,
        account_holder_name: bankAccountForm.account_holder_name.trim(),
        routing_number: bankAccountForm.routing_number.trim(),
        account_number: bankAccountForm.account_number.trim(),
        account_holder_type: bankAccountForm.account_holder_type || 'individual',
      };

      console.log('Final payload being sent:', {
        member_id: payload.member_id,
        account_holder_name: payload.account_holder_name,
        routing_number: `${payload.routing_number.length} chars`,
        account_number: `${payload.account_number.length} chars`,
        account_holder_type: payload.account_holder_type
      });

      const response = await base44.functions.invoke('setupMemberBankAccount', payload);

      console.log('setupMemberBankAccount response:', response.data);

      if (response.data.success) {
        toast.success('Bank account added successfully!');
        setIsAddingBankAccount(false);
        setBankAccountForm({
          account_holder_name: '',
          routing_number: '',
          account_number: '',
          account_number_confirm: '',
          account_holder_type: 'individual'
        });

        // Reload member data to get updated bank account info
        const updatedMemberResults = await Member.filter({ email: user.email });
        if (updatedMemberResults.length > 0) {
          const updatedMember = updatedMemberResults[0];
          setMember(updatedMember);

          // Force re-render by updating form data
          setFormData({
            full_name: user.full_name || '',
          });
        }
      } else {
        const errorMsg = response.data.error || 'Failed to add bank account';
        console.error('Bank account setup failed:', errorMsg, response.data.debug);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Failed to add bank account - Error:', error);
      console.error('Error response:', error.response);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to add bank account. Please try again.';
      toast.error(errorMessage, { duration: 6000 });
    } finally {
      setIsSavingBankAccount(false);
    }
  };

  const handleUpdateNotificationPrefs = async () => {
    try {
      if (notifPrefsId) {
        await NotificationPreference.update(notifPrefsId, notifPrefs);
      } else if (member) {
        const newPrefs = await NotificationPreference.create({
          member_id: member.id,
          ...notifPrefs
        });
        setNotifPrefsId(newPrefs.id);
      }
      toast.success("Notification preferences updated!");
    } catch (error) {
      console.error("Failed to update notification preferences:", error);
      toast.error("Failed to update preferences.");
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  }

  const getEventTitle = (eventId) => {
    const event = events.find(e => e.id === eventId);
    return event ? event.title : 'Unknown Event';
  };

  const statusColors = {
    Due: 'border-yellow-500 text-yellow-700',
    'Past Due': 'border-red-500 text-red-700 bg-red-50',
    Paid: 'border-green-500 text-green-700 bg-green-50',
  };

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  // If no user after loading (e.g., currentUserProp was null), display a message or nothing
  if (!user) {
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No profile data available. Please log in.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Tabs defaultValue="profile" className="w-full">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="financial">Financial Overview</TabsTrigger>
          <TabsTrigger value="payment-methods">Payment Methods</TabsTrigger>
          <TabsTrigger value="payout-settings">Payout Settings</TabsTrigger>
          <TabsTrigger value="expenses">Add Expense</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Outstanding Contributions Alert */}
          {member && contributions.filter(c => c.status === 'Due' || c.status === 'Past Due').length > 0 && (
            <Alert className="border-yellow-500 bg-yellow-50">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              <div className="ml-2">
                <h3 className="font-semibold text-yellow-900">Outstanding Contributions</h3>
                <p className="text-sm text-yellow-800 mt-1">
                  You have {contributions.filter(c => c.status === 'Due' || c.status === 'Past Due').length} pending contribution(s). 
                  <Link to={createPageUrl('Profile') + '#history'} className="underline ml-1 font-medium">View and pay now</Link>
                </p>
              </div>
            </Alert>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Your Profile</CardTitle>
              <CardDescription>View and manage your account and member details.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleUpdate} className="space-y-8">
                <div className="flex items-center space-x-4">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={user?.profile_picture_url} />
                    <AvatarFallback className="text-2xl">{getInitials(user?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-semibold">{user?.full_name}</h3>
                    <p className="text-sm text-gray-500">{user?.email}</p>
                    <p className="text-sm text-gray-500 capitalize">Role: {user?.role}</p>
                  </div>
                </div>

                {/* Account Info */}
                <div className="space-y-4">
                   <CardTitle className="text-lg">Account Information</CardTitle>
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        disabled={!isEditing}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" value={user?.email || ''} disabled />
                    </div>
                </div>

                {/* Member Payout Info - UPDATED */}
                {member && (
                  <div className="space-y-4 pt-6 border-t">
                    <CardTitle className="text-lg">Benefit Payout Settings</CardTitle>
                    <CardDescription>
                      Set up how you'll receive benefit payouts for qualified events.
                      Bank transfers are secure, encrypted, and processed via Stripe.
                    </CardDescription>

                    {member.stripe_bank_account_id ? (
                      // Bank account already set up
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <Landmark className="h-5 w-5 text-green-600" />
                            </div>
                            <div>
                              <p className="font-medium text-green-900">Bank Account Connected</p>
                              <p className="text-sm text-green-700">
                                {member.bank_name} - ****{member.bank_account_last4}
                              </p>
                              <p className="text-xs text-green-600 mt-1">
                                Ready to receive ACH payouts (3-5 business days)
                              </p>
                            </div>
                          </div>
                          {isEditing && !isAddingBankAccount && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setIsAddingBankAccount(true)}
                            >
                              Change Bank
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : (
                      // No bank account set up yet
                      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                        <div className="flex items-start gap-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium text-yellow-900">No Payout Method Set</p>
                            <p className="text-sm text-yellow-700 mt-1">
                              You need to add your bank account to receive benefit payouts.
                              Your information is encrypted and securely stored with Stripe.
                            </p>
                            {!isAddingBankAccount && (
                              <Button
                                type="button"
                                onClick={() => setIsAddingBankAccount(true)}
                                className="mt-3"
                                size="sm"
                              >
                                <Landmark className="w-4 h-4 mr-2" />
                                Add Bank Account
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Bank Account Form */}
                    {isAddingBankAccount && (
                      <Card className="border-2 border-blue-200 bg-blue-50">
                        <CardHeader>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Lock className="h-4 w-4" />
                            Add Bank Account (Secure)
                          </CardTitle>
                          <CardDescription>
                            Your banking information is encrypted and tokenized by Stripe.
                            We never store your full account number.
                          </CardDescription>
                          {member && (
                            <p className="text-xs text-gray-600 mt-2">
                              Debug: Member ID: {member.id}, Email: {member.email}
                            </p>
                          )}
                        </CardHeader>
                        <CardContent>
                          <form onSubmit={handleAddBankAccount} className="space-y-4">
                            <div className="space-y-2">
                              <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                              <Input
                                id="account_holder_name"
                                value={bankAccountForm.account_holder_name}
                                onChange={(e) => setBankAccountForm({...bankAccountForm, account_holder_name: e.target.value})}
                                placeholder="Full name on account"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="account_holder_type">Account Type *</Label>
                              <Select
                                value={bankAccountForm.account_holder_type}
                                onValueChange={(value) => setBankAccountForm({...bankAccountForm, account_holder_type: value})}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="individual">Personal Account</SelectItem>
                                  <SelectItem value="company">Business Account</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="routing_number">Routing Number *</Label>
                              <Input
                                id="routing_number"
                                value={bankAccountForm.routing_number}
                                onChange={(e) => setBankAccountForm({...bankAccountForm, routing_number: e.target.value.replace(/\D/g, '').slice(0, 9)})}
                                placeholder="9-digit routing number"
                                maxLength={9}
                                required
                              />
                              <p className="text-xs text-gray-500">
                                Found on the bottom left of your check
                              </p>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="account_number">Account Number *</Label>
                              <Input
                                id="account_number"
                                type="password"
                                value={bankAccountForm.account_number}
                                onChange={(e) => setBankAccountForm({...bankAccountForm, account_number: e.target.value.replace(/\D/g, '')})}
                                placeholder="Account number"
                                required
                              />
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="account_number_confirm">Confirm Account Number *</Label>
                              <Input
                                id="account_number_confirm"
                                type="password"
                                value={bankAccountForm.account_number_confirm}
                                onChange={(e) => setBankAccountForm({...bankAccountForm, account_number_confirm: e.target.value.replace(/\D/g, '')})}
                                placeholder="Re-enter account number"
                                required
                              />
                            </div>

                            <Alert className="bg-blue-100 border-blue-300">
                              <Shield className="h-4 w-4 text-blue-600" />
                              <AlertDescription className="text-blue-900 text-xs">
                                <strong>Security:</strong> Your bank details are encrypted in transit and
                                tokenized by Stripe. We only store a reference token, never your full account number.
                              </AlertDescription>
                            </Alert>

                            <div className="flex justify-end gap-2 pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                  setIsAddingBankAccount(false);
                                  setBankAccountForm({
                                    account_holder_name: '',
                                    routing_number: '',
                                    account_number: '',
                                    account_number_confirm: '',
                                    account_holder_type: 'individual'
                                  });
                                }}
                                disabled={isSavingBankAccount}
                              >
                                Cancel
                              </Button>
                              <Button
                                type="submit"
                                disabled={isSavingBankAccount}
                              >
                                {isSavingBankAccount ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving Securely...
                                  </>
                                ) : (
                                  <>
                                    <Lock className="mr-2 h-4 w-4" />
                                    Save Bank Account
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}

                <div className="flex justify-end gap-2">
                  {isEditing && !isAddingBankAccount ? (
                    <>
                      <Button type="button" variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                      <Button type="submit">Save Changes</Button>
                    </>
                  ) : (
                    !isAddingBankAccount && (
                      <Button type="button" onClick={() => setIsEditing(true)}>Edit Profile</Button>
                    )
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="financial" className="space-y-6">
          {member && (
            <>
              {/* Contribution Goal Tracker */}
              <ContributionGoalTracker member={member} contributions={contributions} />

              {/* Recurring Contributions */}
              <RecurringContributionManager 
                member={member} 
                onUpdate={async () => {
                  const updatedMembers = await Member.filter({ email: user.email });
                  if (updatedMembers.length > 0) setMember(updatedMembers[0]);
                }} 
              />

              {/* Tax Summary Generator */}
              <TaxSummaryGenerator member={member} contributions={contributions} />

              {/* Financial Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Total Contributions</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-blue-600">
                      ${contributions.reduce((sum, c) => sum + (c.amount_paid || 0), 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {contributions.filter(c => c.status === 'Paid').length} payments made
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Benefits Received</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-green-600">
                      ${payouts.filter(p => p.status === 'Disbursed').reduce((sum, p) => sum + p.amount, 0).toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {payouts.filter(p => p.status === 'Disbursed').length} payouts received
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardDescription>Net Balance</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold text-gray-900">
                      ${(
                        payouts.filter(p => p.status === 'Disbursed').reduce((sum, p) => sum + p.amount, 0) -
                        contributions.reduce((sum, c) => sum + (c.amount_paid || 0), 0)
                      ).toFixed(2)}
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Benefits - Contributions
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Benefits/Payouts Received */}
              <Card>
                <CardHeader>
                  <CardTitle>Benefits Received</CardTitle>
                  <CardDescription>History of benefit payouts you've received from the association.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payouts.length > 0 ? payouts.map(payout => (
                          <TableRow key={payout.id}>
                            <TableCell className="font-medium">{getEventTitle(payout.event_id)}</TableCell>
                            <TableCell className="font-semibold text-green-600">${payout.amount.toFixed(2)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className={
                                payout.status === 'Disbursed' 
                                  ? 'border-green-500 text-green-700 bg-green-50'
                                  : payout.status === 'Approved'
                                  ? 'border-blue-500 text-blue-700 bg-blue-50'
                                  : 'border-gray-500 text-gray-700'
                              }>
                                {payout.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {payout.paid_at ? format(new Date(payout.paid_at), 'MMM d, yyyy') : 
                               payout.approved_at ? format(new Date(payout.approved_at), 'MMM d, yyyy') :
                               format(new Date(payout.created_date), 'MMM d, yyyy')}
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan="4" className="h-24 text-center text-gray-500">
                              You have not received any benefits yet.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Contributions */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Contributions</CardTitle>
                  <CardDescription>Your latest contribution payments.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {contributions.slice(0, 5).map(c => (
                          <TableRow key={c.id}>
                            <TableCell className="font-medium">{getEventTitle(c.event_id)}</TableCell>
                            <TableCell>${c.amount_due.toFixed(2)}</TableCell>
                            <TableCell>
                              {c.paid_at ? format(new Date(c.paid_at), 'MMM d, yyyy') : 
                               format(new Date(c.due_date), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className={statusColors[c.status] || ''}>
                                {c.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {contributions.length > 5 && (
                    <div className="mt-4 text-center">
                      <Button variant="link" onClick={() => document.querySelector('[value="history"]').click()}>
                        View all contributions →
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Contribution Goals Management */}
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-blue-600" />
                    <CardTitle>Set Contribution Goal</CardTitle>
                  </div>
                  <CardDescription>Set your annual giving target and track your progress</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    const goalAmount = parseFloat(e.target.goal_amount.value);
                    if (goalAmount <= 0) {
                      toast.error('Please enter a valid goal amount');
                      return;
                    }
                    try {
                      await Member.update(member.id, {
                        annual_contribution_goal: goalAmount,
                        contribution_goal_year: new Date().getFullYear()
                      });
                      const updatedMembers = await Member.filter({ email: user.email });
                      if (updatedMembers.length > 0) setMember(updatedMembers[0]);
                      toast.success('Contribution goal updated!');
                    } catch (error) {
                      toast.error('Failed to update goal');
                    }
                  }} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="goal_amount">Annual Goal Amount</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                        <Input
                          id="goal_amount"
                          name="goal_amount"
                          type="number"
                          min="0"
                          step="0.01"
                          defaultValue={member.annual_contribution_goal || 0}
                          className="pl-7"
                          placeholder="0.00"
                        />
                      </div>
                      <p className="text-xs text-gray-500">
                        Set your target for {new Date().getFullYear()} contributions
                      </p>
                    </div>
                    <Button type="submit">Update Goal</Button>
                  </form>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        <TabsContent value="payment-methods" className="space-y-6">
          {member && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Methods</CardTitle>
                <CardDescription>
                  Manage how you make contributions and receive benefit payouts.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Bank Account for Payouts */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Payout Method</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    This is how you'll receive benefit payouts from the association.
                  </p>
                  
                  {member.stripe_bank_account_id ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                            <Landmark className="h-5 w-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-green-900">Bank Account Connected</p>
                            <p className="text-sm text-green-700">
                              {member.bank_name} - ****{member.bank_account_last4}
                            </p>
                            <p className="text-xs text-green-600 mt-1">
                              Ready to receive ACH payouts (3-5 business days)
                            </p>
                          </div>
                        </div>
                        {!isAddingBankAccount && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddingBankAccount(true)}
                          >
                            Change Bank
                          </Button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-yellow-900">No Payout Method Set</p>
                          <p className="text-sm text-yellow-700 mt-1">
                            Add your bank account to receive benefit payouts.
                          </p>
                          {!isAddingBankAccount && (
                            <Button
                              type="button"
                              onClick={() => setIsAddingBankAccount(true)}
                              className="mt-3"
                              size="sm"
                            >
                              <Landmark className="w-4 h-4 mr-2" />
                              Add Bank Account
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bank Account Form */}
                  {isAddingBankAccount && (
                    <Card className="border-2 border-blue-200 bg-blue-50 mt-4">
                      <CardHeader>
                        <CardTitle className="text-base flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Add Bank Account (Secure)
                        </CardTitle>
                        <CardDescription>
                          Your banking information is encrypted and tokenized by Stripe.
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <form onSubmit={handleAddBankAccount} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="account_holder_name">Account Holder Name *</Label>
                            <Input
                              id="account_holder_name"
                              value={bankAccountForm.account_holder_name}
                              onChange={(e) => setBankAccountForm({...bankAccountForm, account_holder_name: e.target.value})}
                              placeholder="Full name on account"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="account_holder_type">Account Type *</Label>
                            <Select
                              value={bankAccountForm.account_holder_type}
                              onValueChange={(value) => setBankAccountForm({...bankAccountForm, account_holder_type: value})}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="individual">Personal Account</SelectItem>
                                <SelectItem value="company">Business Account</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="routing_number">Routing Number *</Label>
                            <Input
                              id="routing_number"
                              value={bankAccountForm.routing_number}
                              onChange={(e) => setBankAccountForm({...bankAccountForm, routing_number: e.target.value.replace(/\D/g, '').slice(0, 9)})}
                              placeholder="9-digit routing number"
                              maxLength={9}
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="account_number">Account Number *</Label>
                            <Input
                              id="account_number"
                              type="password"
                              value={bankAccountForm.account_number}
                              onChange={(e) => setBankAccountForm({...bankAccountForm, account_number: e.target.value.replace(/\D/g, '')})}
                              placeholder="Account number"
                              required
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="account_number_confirm">Confirm Account Number *</Label>
                            <Input
                              id="account_number_confirm"
                              type="password"
                              value={bankAccountForm.account_number_confirm}
                              onChange={(e) => setBankAccountForm({...bankAccountForm, account_number_confirm: e.target.value.replace(/\D/g, '')})}
                              placeholder="Re-enter account number"
                              required
                            />
                          </div>

                          <Alert className="bg-blue-100 border-blue-300">
                            <Shield className="h-4 w-4 text-blue-600" />
                            <AlertDescription className="text-blue-900 text-xs">
                              <strong>Security:</strong> Your bank details are encrypted and tokenized by Stripe.
                            </AlertDescription>
                          </Alert>

                          <div className="flex justify-end gap-2 pt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setIsAddingBankAccount(false);
                                setBankAccountForm({
                                  account_holder_name: '',
                                  routing_number: '',
                                  account_number: '',
                                  account_number_confirm: '',
                                  account_holder_type: 'individual'
                                });
                              }}
                              disabled={isSavingBankAccount}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" disabled={isSavingBankAccount}>
                              {isSavingBankAccount ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Lock className="mr-2 h-4 w-4" />
                                  Save Bank Account
                                </>
                              )}
                            </Button>
                          </div>
                        </form>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Saved Cards Info */}
                <div>
                  <h3 className="text-lg font-semibold mb-3">Payment Cards</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    Manage cards used for making contributions.
                  </p>
                  
                  {member.stripe_payment_method_id ? (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-blue-900">Card on File</p>
                          <p className="text-sm text-blue-700">
                            {member.saved_card_brand} ****{member.saved_card_last4}
                          </p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <p className="text-sm text-gray-600">
                        No saved cards. Cards are saved automatically when you make a contribution.
                      </p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="payout-settings" className="space-y-6">
          {member && (
            <PayoutSettingsManager 
              member={member} 
              onUpdate={async () => {
                const updatedMembers = await Member.filter({ email: user.email });
                if (updatedMembers.length > 0) setMember(updatedMembers[0]);
              }} 
            />
          )}
        </TabsContent>

        <TabsContent value="expenses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="h-5 w-5" />
                Quick Expense Entry
              </CardTitle>
              <CardDescription>
                Snap a photo of your receipt from your phone to quickly add expenses. 
                Our AI will automatically extract vendor, amount, date, and categorize the expense.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <QuickExpenseCapture />
              <p className="text-xs text-gray-500 mt-4 text-center">
                Expenses you add will be submitted for administrator review and approval.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Choose which email notifications you'd like to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Payment Reminders</Label>
                    <p className="text-sm text-gray-500">Get reminders before contribution due dates</p>
                  </div>
                  <Switch
                    checked={notifPrefs.email_contribution_reminders}
                    onCheckedChange={(checked) =>
                      setNotifPrefs({...notifPrefs, email_contribution_reminders: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Event Reminders</Label>
                    <p className="text-sm text-gray-500">Get notified about upcoming events</p>
                  </div>
                  <Switch
                    checked={notifPrefs.email_event_reminders}
                    onCheckedChange={(checked) =>
                      setNotifPrefs({...notifPrefs, email_event_reminders: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Payout Notifications</Label>
                    <p className="text-sm text-gray-500">Get notified when benefits are disbursed</p>
                  </div>
                  <Switch
                    checked={notifPrefs.email_payout_notifications}
                    onCheckedChange={(checked) =>
                      setNotifPrefs({...notifPrefs, email_payout_notifications: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Forum Activity</Label>
                    <p className="text-sm text-gray-500">Get notified about new forum posts</p>
                  </div>
                  <Switch
                    checked={notifPrefs.email_forum_activity}
                    onCheckedChange={(checked) =>
                      setNotifPrefs({...notifPrefs, email_forum_activity: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">Proposal Updates</Label>
                    <p className="text-sm text-gray-500">Get notified about proposal voting</p>
                  </div>
                  <Switch
                    checked={notifPrefs.email_proposal_updates}
                    onCheckedChange={(checked) =>
                      setNotifPrefs({...notifPrefs, email_proposal_updates: checked})
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base">General Announcements</Label>
                    <p className="text-sm text-gray-500">Receive important association updates</p>
                  </div>
                  <Switch
                    checked={notifPrefs.email_general_announcements}
                    onCheckedChange={(checked) =>
                      setNotifPrefs({...notifPrefs, email_general_announcements: checked})
                    }
                  />
                </div>
              </div>

              <div className="pt-4 border-t">
                <Label>Reminder Timing</Label>
                <p className="text-sm text-gray-500 mb-3">
                  How many days before due dates should we send reminders?
                </p>
                <Select
                  value={String(notifPrefs.reminder_days_before)}
                  onValueChange={(value) =>
                    setNotifPrefs({...notifPrefs, reminder_days_before: parseInt(value)})
                  }
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 day before</SelectItem>
                    <SelectItem value="3">3 days before</SelectItem>
                    <SelectItem value="7">7 days before</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleUpdateNotificationPrefs}>
                  Save Preferences
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          {member && (
            <Card>
              <CardHeader>
                <CardTitle>Contribution History</CardTitle>
                <CardDescription>Your history of contributions for member benefit events.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Due Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contributions.length > 0 ? contributions.map(c => (
                        <TableRow key={c.id}>
                          <TableCell className="font-medium">{getEventTitle(c.event_id)}</TableCell>
                          <TableCell>${c.amount_due.toFixed(2)}</TableCell>
                          <TableCell>{format(new Date(c.due_date), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[c.status] || ''}>
                              {c.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {(c.status === 'Due' || c.status === 'Past Due') && (
                              <Button asChild variant="default" size="sm">
                                <Link to={createPageUrl(`Payment?contribution_id=${c.id}`)}>Pay Now</Link>
                              </Button>
                            )}
                            {c.status === 'Paid' && c.paid_at && (
                               <span className="text-sm text-gray-500">Paid on {format(new Date(c.paid_at), 'MMM d, yyyy')}</span>
                            )}
                            {c.status === 'Paid' && !c.paid_at && (
                               <span className="text-sm text-gray-500">Paid</span>
                            )}
                          </TableCell>
                        </TableRow>
                      )) : (
                        <TableRow>
                          <TableCell colSpan="5" className="h-24 text-center text-gray-500">
                            You have no contribution history.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}