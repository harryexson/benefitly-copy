import React, { useState, useEffect } from 'react';
import { User, Member, EventContribution, Event, Payout, ForumThread, ProposalVote, MemberOnboarding } from '@/entities/all';
import MemberOnboardingWizard from '../components/onboarding/MemberOnboardingWizard';
import MemberPayoutsSection from '../components/member/MemberPayoutsSection';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  DollarSign, Calendar, TrendingUp, Award, MessageSquare, 
  CheckCircle, Clock, AlertCircle, BarChart3, Loader2, CreditCard
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';

const StatCard = ({ icon: Icon, label, value, trend, color = 'blue' }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {trend && (
            <p className="text-xs text-gray-500 mt-1">
              {trend}
            </p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function MemberPortal() {
  const [user, setUser] = useState(null);
  const [member, setMember] = useState(null);
  const [contributions, setContributions] = useState([]);
  const [events, setEvents] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [forumPosts, setForumPosts] = useState([]);
  const [votes, setVotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    // Request notification permissions on component mount
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Check URL hash for direct navigation to contributions
    if (window.location.hash === '#contributions') {
      // Small delay to ensure component is mounted
      setTimeout(() => {
        const contributionsSection = document.querySelector('[data-state="active"][value="contributions"]');
        if (contributionsSection) {
          contributionsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
    }

    const loadPortalData = async () => {
      try {
        setIsLoading(true);
        const currentUser = await User.me();
        setUser(currentUser);

        // Find member record linked to this user
        const memberResults = await Member.filter({ email: currentUser.email });
        if (memberResults.length === 0) {
          setIsLoading(false);
          return;
        }

        const currentMember = memberResults[0];
        setMember(currentMember);

        // Load all member data
        const [
          contributionList,
          eventList,
          payoutList,
          threadList,
          voteList,
          onboardingRecords
        ] = await Promise.all([
          EventContribution.filter({ member_id: currentMember.id }, '-created_date'),
          Event.list(),
          Payout.filter({ payee_member_id: currentMember.id }),
          ForumThread.filter({ author_user_id: currentUser.id }, '-created_date', 5),
          ProposalVote.filter({ voter_user_id: currentUser.id }, '-created_date'),
          MemberOnboarding.filter({ member_id: currentMember.id })
        ]);

        setContributions(contributionList);
        setEvents(eventList);
        setPayouts(payoutList);
        setForumPosts(threadList);
        setVotes(voteList);

        // Check if member needs onboarding
        if (onboardingRecords.length === 0 || (!onboardingRecords[0].is_completed && !onboardingRecords[0].skipped)) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Failed to load member portal data:', error);
        toast.error('Failed to load portal data.');
      } finally {
        setIsLoading(false);
      }
    };

    loadPortalData();
  }, []);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    setShowOnboarding(false);
  };

  const getInitials = (name) => {
    if (!name) return 'M';
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const getEventTitle = (eventId) => {
    const event = events.find(e => e.id === eventId);
    return event ? event.title : 'Unknown Event';
  };

  const handlePayContribution = async (contribution) => {
    try {
      setIsProcessing(true);
      
      // Create Stripe Checkout session
      const response = await base44.functions.invoke('createContributionCheckout', {
        contribution_id: contribution.id
      });

      if (response.data.checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = response.data.checkoutUrl;
      } else {
        toast.error('Failed to create payment session');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Failed to initiate payment. Please try again.');
      setIsProcessing(false);
    }
  };

  // Calculate statistics
  const stats = {
    totalContributions: contributions.filter(c => c.status === 'Paid').length,
    totalAmountPaid: contributions
      .filter(c => c.status === 'Paid')
      .reduce((sum, c) => sum + (c.amount_paid || 0), 0),
    totalPayoutsReceived: payouts
      .filter(p => p.status === 'Disbursed')
      .reduce((sum, p) => sum + p.amount, 0),
    upcomingDues: contributions.filter(c => 
      c.status === 'Due' || c.status === 'Past Due'
    ).length,
    forumActivity: forumPosts.length,
    proposalsVoted: votes.length
  };

  const upcomingContributions = contributions
    .filter(c => c.status === 'Due' || c.status === 'Past Due')
    .sort((a, b) => new Date(a.due_date) - new Date(b.due_date))
    .slice(0, 5);

  const recentContributions = contributions
    .filter(c => c.status === 'Paid')
    .sort((a, b) => new Date(b.paid_at) - new Date(a.paid_at))
    .slice(0, 5);

  const upcomingEvents = events
    .filter(e => new Date(e.event_date) >= new Date() && (e.status === 'Announced' || e.status === 'Published'))
    .sort((a, b) => new Date(a.event_date) - new Date(b.event_date))
    .slice(0, 3);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-48 w-full" />
        <div className="grid md:grid-cols-3 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!member) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Member Profile Found</h3>
          <p className="text-gray-600 mb-4">
            Your account ({user?.email}) is not yet linked to a member profile.
          </p>
          <p className="text-sm text-gray-500">
            Please contact your association administrator to ensure your member record uses the same email address as your login account.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Member Onboarding Wizard */}
      <MemberOnboardingWizard
        isOpen={showOnboarding}
        member={member}
        onComplete={handleOnboardingComplete}
        onSkip={handleOnboardingSkip}
      />

      {/* Member Profile Header */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
              <AvatarImage src={member.profile_picture_url} />
              <AvatarFallback className="text-2xl">
                {getInitials(`${member.first_name} ${member.last_name}`)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900">
                {member.first_name} {member.last_name}
              </h1>
              <p className="text-gray-600 mt-1">Member #{member.member_number}</p>
              <div className="flex flex-wrap gap-2 mt-3 justify-center md:justify-start">
                <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">
                  {member.status}
                </Badge>
                <Badge variant="outline">
                  Joined {format(new Date(member.joined_at), 'MMM yyyy')}
                </Badge>
                {member.engagement_score > 0 && (
                  <Badge variant="outline" className="bg-purple-100 text-purple-800">
                    <Award className="w-3 h-3 mr-1" />
                    Engagement: {member.engagement_score}
                  </Badge>
                )}
              </div>
              {member.bio && (
                <p className="text-sm text-gray-600 mt-3 max-w-2xl">{member.bio}</p>
              )}
            </div>
            <Button asChild>
              <Link to={createPageUrl('Profile')}>Edit Profile</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <StatCard
          icon={DollarSign}
          label="Total Contributions"
          value={`$${stats.totalAmountPaid.toFixed(2)}`}
          trend={`${stats.totalContributions} payments made`}
          color="green"
        />
        <StatCard
          icon={Calendar}
          label="Upcoming Dues"
          value={stats.upcomingDues}
          trend={upcomingContributions.length > 0 ? 
            `Next due: ${format(new Date(upcomingContributions[0].due_date), 'MMM d')}` : 
            'All caught up!'
          }
          color="orange"
        />
        <StatCard
          icon={TrendingUp}
          label="Community Activity"
          value={stats.forumActivity + stats.proposalsVoted}
          trend={`${stats.forumActivity} posts, ${stats.proposalsVoted} votes`}
          color="blue"
        />
      </div>

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              Upcoming Events
            </CardTitle>
            <CardDescription>New events announced by your association</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {upcomingEvents.map(event => (
                <div key={event.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-purple-200">
                  <div className="flex-1">
                    <p className="font-semibold text-purple-900">{event.title}</p>
                    <p className="text-sm text-purple-700">{event.type}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {format(new Date(event.event_date), 'EEEE, MMMM d, yyyy')}
                      {event.event_time && ` at ${event.event_time}`}
                    </p>
                  </div>
                  <Badge variant="outline" className="bg-purple-100 text-purple-800 border-purple-300">
                    {event.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="contributions" className="w-full" id="member-tabs">
        <TabsList>
          <TabsTrigger value="contributions" data-tab="contributions">My Contributions</TabsTrigger>
          <TabsTrigger value="payouts">Payouts Received</TabsTrigger>
          <TabsTrigger value="activity">My Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="contributions" className="space-y-6">
          {/* Upcoming Payments */}
          {upcomingContributions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-orange-500" />
                  Upcoming & Overdue Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingContributions.map(contrib => (
                    <div key={contrib.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{getEventTitle(contrib.event_id)}</p>
                        <p className="text-sm text-gray-600">
                          Due: {format(new Date(contrib.due_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${contrib.amount_due.toFixed(2)}</p>
                        <Badge 
                          variant="outline" 
                          className={contrib.status === 'Past Due' ? 
                            'border-red-500 text-red-700 bg-red-50' : 
                            'border-orange-500 text-orange-700 bg-orange-50'
                          }
                        >
                          {contrib.status}
                        </Badge>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => handlePayContribution(contrib)}
                        disabled={isProcessing}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        {isProcessing ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Pay Now
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Payments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                Recent Payments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recentContributions.length > 0 ? (
                <div className="space-y-3">
                  {recentContributions.map(contrib => (
                    <div key={contrib.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{getEventTitle(contrib.event_id)}</p>
                        <p className="text-sm text-gray-600">
                          Paid: {format(new Date(contrib.paid_at), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${contrib.amount_paid.toFixed(2)}</p>
                        <Badge className="bg-green-100 text-green-800 border-green-200">
                          Paid
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No payment history yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          <MemberPayoutsSection 
            member={member}
            payouts={payouts}
            onPayoutRequested={() => null}
          />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Forum Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Forum Posts
                </CardTitle>
              </CardHeader>
              <CardContent>
                {forumPosts.length > 0 ? (
                  <div className="space-y-3">
                    {forumPosts.map(post => (
                      <div key={post.id} className="p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                        <p className="font-medium text-sm line-clamp-2">{post.title}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(post.created_date), 'MMM d, yyyy')} • {post.reply_count} replies
                        </p>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to={createPageUrl('Community')}>View All Posts</Link>
                    </Button>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8 text-sm">
                    No forum posts yet. Join the conversation!
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Voting Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Proposal Votes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {votes.length > 0 ? (
                  <div className="space-y-3">
                    {votes.slice(0, 5).map(vote => (
                      <div key={vote.id} className="p-3 border rounded-lg">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">Proposal #{vote.proposal_id.slice(-6)}</p>
                          <Badge variant="outline" className={
                            vote.vote === 'For' ? 'bg-green-100 text-green-800' :
                            vote.vote === 'Against' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {vote.vote}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {format(new Date(vote.created_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" className="w-full" asChild>
                      <Link to={createPageUrl('Proposals')}>View All Proposals</Link>
                    </Button>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8 text-sm">
                    No votes cast yet. Participate in governance!
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Engagement Score */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Engagement Level
              </CardTitle>
              <CardDescription>
                Your participation helps make our community stronger
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Current Score</span>
                    <span className="text-2xl font-bold">{member.engagement_score || 0}</span>
                  </div>
                  <Progress value={(member.engagement_score || 0) % 100} className="h-2" />
                </div>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">{stats.totalContributions}</p>
                    <p className="text-xs text-gray-600 mt-1">Contributions</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">{stats.forumActivity}</p>
                    <p className="text-xs text-gray-600 mt-1">Forum Posts</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">{stats.proposalsVoted}</p>
                    <p className="text-xs text-gray-600 mt-1">Votes Cast</p>
                  </div>
                  <div className="text-center p-3 bg-orange-50 rounded-lg">
                    <p className="text-2xl font-bold text-orange-600">{member.events_attended || 0}</p>
                    <p className="text-xs text-gray-600 mt-1">Events Attended</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}