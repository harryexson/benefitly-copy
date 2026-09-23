
import React, { useState, useEffect } from 'react';
import { Proposal, ProposalVote, User } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ThumbsUp, ThumbsDown, Minus, Plus, CheckCircle, Clock, XCircle } from 'lucide-react';
import { format, isBefore, isAfter } from 'date-fns';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function Proposals() {
  const [proposals, setProposals] = useState([]);
  const [myVotes, setMyVotes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewProposalOpen, setIsNewProposalOpen] = useState(false);
  const [selectedProposal, setSelectedProposal] = useState(null);
  const [voteComment, setVoteComment] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);

  const [newProposal, setNewProposal] = useState({
    title: '',
    description: '',
    category: 'Other'
  });

  useEffect(() => {
    loadProposals();
  }, []);

  const loadProposals = async () => {
    try {
      setIsLoading(true);
      const user = await User.me();
      setCurrentUser(user);
      setIsAdmin(user.association_role === 'Administrator');

      const [proposalList, voteList] = await Promise.all([
        Proposal.list('-created_date'),
        ProposalVote.filter({ voter_user_id: user.id })
      ]);

      setProposals(proposalList);
      setMyVotes(voteList);
    } catch (error) {
      console.error('Failed to load proposals:', error);
      toast.error('Failed to load proposals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateProposal = async () => {
    if (!newProposal.title || !newProposal.description) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      await Proposal.create({
        ...newProposal,
        proposer_user_id: currentUser.id
      });

      toast.success('Proposal submitted for review!');
      setIsNewProposalOpen(false);
      setNewProposal({ title: '', description: '', category: 'Other' });
      loadProposals();
    } catch (error) {
      console.error('Failed to create proposal:', error);
      toast.error('Failed to submit proposal');
    }
  };

  const handleVote = async (proposalId, vote) => {
    try {
      // Check if already voted
      const existingVote = myVotes.find(v => v.proposal_id === proposalId);
      if (existingVote) {
        toast.error('You have already voted on this proposal');
        return;
      }

      await ProposalVote.create({
        proposal_id: proposalId,
        voter_user_id: currentUser.id,
        vote: vote,
        comment: voteComment
      });

      // Update proposal vote counts
      const proposal = proposals.find(p => p.id === proposalId);
      if (proposal) {
        const updates = {
          votes_for: proposal.votes_for || 0,
          votes_against: proposal.votes_against || 0,
          votes_abstain: proposal.votes_abstain || 0
        };

        if (vote === 'For') updates.votes_for += 1;
        else if (vote === 'Against') updates.votes_against += 1;
        else updates.votes_abstain += 1;

        await Proposal.update(proposalId, updates);
      }

      toast.success('Vote recorded!');
      setVoteComment('');
      setSelectedProposal(null);
      loadProposals();
    } catch (error) {
      console.error('Failed to vote:', error);
      toast.error('Failed to record vote');
    }
  };

  const handleUpdateStatus = async (proposalId, newStatus) => {
    try {
      const oldStatus = proposals.find(p => p.id === proposalId)?.status;
      
      await Proposal.update(proposalId, { status: newStatus });
      toast.success('Proposal status updated');
      loadProposals();

      // Trigger notifications for significant status changes
      const notifiableStatuses = ['Open for Voting', 'Approved', 'Rejected', 'Implemented'];
      if (notifiableStatuses.includes(newStatus) && oldStatus !== newStatus) {
        try {
          base44.functions.invoke('notifyProposalUpdate', {
            proposal_id: proposalId,
            status_change: true
          }).catch(err => console.error('Failed to send proposal notifications:', err));
        } catch (error) {
          console.error('Failed to trigger proposal notifications:', error);
        }
      }
    } catch (error) {
      console.error('Failed to update status:', error);
      toast.error('Failed to update status');
    }
  };

  const hasVoted = (proposalId) => {
    return myVotes.some(v => v.proposal_id === proposalId);
  };

  const canVote = (proposal) => {
    if (proposal.status !== 'Open for Voting') return false;
    if (hasVoted(proposal.id)) return false;
    
    const now = new Date();
    if (proposal.voting_start_date && isBefore(now, new Date(proposal.voting_start_date))) return false;
    if (proposal.voting_end_date && isAfter(now, new Date(proposal.voting_end_date))) return false;
    
    return true;
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Approved': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'Rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'Open for Voting': return <Clock className="h-4 w-4 text-blue-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const statusColors = {
    'Draft': 'bg-gray-100 text-gray-800',
    'Under Review': 'bg-yellow-100 text-yellow-800',
    'Open for Voting': 'bg-blue-100 text-blue-800',
    'Approved': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
    'Implemented': 'bg-purple-100 text-purple-800'
  };

  const activeProposals = proposals.filter(p => 
    p.status === 'Open for Voting' || p.status === 'Under Review'
  );
  
  const completedProposals = proposals.filter(p => 
    p.status === 'Approved' || p.status === 'Rejected' || p.status === 'Implemented'
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Member Proposals</h2>
          <p className="text-gray-500">Participate in democratic decision-making</p>
        </div>
        <Button onClick={() => setIsNewProposalOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Submit Proposal
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList>
          <TabsTrigger value="active">Active ({activeProposals.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completedProposals.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeProposals.map(proposal => {
            const totalVotes = (proposal.votes_for || 0) + (proposal.votes_against || 0) + (proposal.votes_abstain || 0);
            const forPercentage = totalVotes > 0 ? ((proposal.votes_for || 0) / totalVotes) * 100 : 0;

            return (
              <Card key={proposal.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(proposal.status)}
                        <CardTitle className="text-xl">{proposal.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={statusColors[proposal.status]}>
                          {proposal.status}
                        </Badge>
                        <Badge variant="outline">{proposal.category}</Badge>
                        {proposal.voting_end_date && (
                          <span className="text-sm text-gray-500">
                            Ends: {format(new Date(proposal.voting_end_date), 'MMM d, yyyy')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <CardDescription className="mt-3">{proposal.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {proposal.status === 'Open for Voting' && (
                    <>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Voting Progress</span>
                          <span className="font-medium">{totalVotes} votes cast</span>
                        </div>
                        <Progress value={forPercentage} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <ThumbsUp className="h-3 w-3 text-green-500" />
                            {proposal.votes_for || 0} For ({forPercentage.toFixed(0)}%)
                          </span>
                          <span className="flex items-center gap-1">
                            <ThumbsDown className="h-3 w-3 text-red-500" />
                            {proposal.votes_against || 0} Against
                          </span>
                          <span className="flex items-center gap-1">
                            <Minus className="h-3 w-3 text-gray-500" />
                            {proposal.votes_abstain || 0} Abstain
                          </span>
                        </div>
                      </div>

                      {canVote(proposal) && (
                        <div className="flex gap-2 pt-2">
                          <Button 
                            onClick={() => setSelectedProposal(proposal)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            <ThumbsUp className="w-4 h-4 mr-2" />
                            Vote For
                          </Button>
                          <Button 
                            onClick={() => setSelectedProposal(proposal)}
                            variant="outline"
                            className="flex-1"
                          >
                            <ThumbsDown className="w-4 h-4 mr-2" />
                            Vote Against
                          </Button>
                        </div>
                      )}

                      {hasVoted(proposal.id) && (
                        <div className="text-center py-2 bg-blue-50 rounded-lg text-sm text-blue-700">
                          ✓ You have voted on this proposal
                        </div>
                      )}
                    </>
                  )}

                  {isAdmin && (
                    <div className="flex gap-2 pt-2 border-t">
                      <Select 
                        value={proposal.status} 
                        onValueChange={(value) => handleUpdateStatus(proposal.id, value)}
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Under Review">Under Review</SelectItem>
                          <SelectItem value="Open for Voting">Open for Voting</SelectItem>
                          <SelectItem value="Approved">Approved</SelectItem>
                          <SelectItem value="Rejected">Rejected</SelectItem>
                          <SelectItem value="Implemented">Implemented</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}

          {activeProposals.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Proposals</h3>
                <p className="text-gray-600 mb-4">Be the first to submit a proposal!</p>
                <Button onClick={() => setIsNewProposalOpen(true)}>
                  Submit a Proposal
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4">
          {completedProposals.map(proposal => {
            const totalVotes = (proposal.votes_for || 0) + (proposal.votes_against || 0) + (proposal.votes_abstain || 0);
            const forPercentage = totalVotes > 0 ? ((proposal.votes_for || 0) / totalVotes) * 100 : 0;

            return (
              <Card key={proposal.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusIcon(proposal.status)}
                        <CardTitle className="text-xl">{proposal.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={statusColors[proposal.status]}>
                          {proposal.status}
                        </Badge>
                        <Badge variant="outline">{proposal.category}</Badge>
                      </div>
                    </div>
                  </div>
                  <CardDescription className="mt-3">{proposal.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Final Results</span>
                      <span className="font-medium">{totalVotes} total votes</span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{proposal.votes_for || 0}</div>
                        <div className="text-xs text-gray-600">For</div>
                      </div>
                      <div className="text-center p-3 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{proposal.votes_against || 0}</div>
                        <div className="text-xs text-gray-600">Against</div>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <div className="text-2xl font-bold text-gray-600">{proposal.votes_abstain || 0}</div>
                        <div className="text-xs text-gray-600">Abstain</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>

      {/* New Proposal Dialog */}
      <Dialog open={isNewProposalOpen} onOpenChange={setIsNewProposalOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Submit a New Proposal</DialogTitle>
            <DialogDescription>
              Propose a new initiative, benefit change, or policy update for the association to consider.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Select 
                value={newProposal.category} 
                onValueChange={(value) => setNewProposal({...newProposal, category: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Benefit Change">Benefit Change</SelectItem>
                  <SelectItem value="New Initiative">New Initiative</SelectItem>
                  <SelectItem value="Policy Update">Policy Update</SelectItem>
                  <SelectItem value="Event Proposal">Event Proposal</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input
                placeholder="Give your proposal a clear, concise title..."
                value={newProposal.title}
                onChange={(e) => setNewProposal({...newProposal, title: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Describe your proposal in detail. What problem does it solve? What are the benefits?"
                value={newProposal.description}
                onChange={(e) => setNewProposal({...newProposal, description: e.target.value})}
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNewProposalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProposal}>
              Submit for Review
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vote Dialog */}
      <Dialog open={!!selectedProposal} onOpenChange={() => setSelectedProposal(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Cast Your Vote</DialogTitle>
            <DialogDescription>
              {selectedProposal?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Optional: Add a comment explaining your vote..."
              value={voteComment}
              onChange={(e) => setVoteComment(e.target.value)}
              rows={4}
            />
            <div className="flex gap-3">
              <Button 
                onClick={() => handleVote(selectedProposal.id, 'For')}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <ThumbsUp className="w-4 h-4 mr-2" />
                Vote For
              </Button>
              <Button 
                onClick={() => handleVote(selectedProposal.id, 'Against')}
                variant="outline"
                className="flex-1"
              >
                <ThumbsDown className="w-4 h-4 mr-2" />
                Vote Against
              </Button>
              <Button 
                onClick={() => handleVote(selectedProposal.id, 'Abstain')}
                variant="ghost"
              >
                <Minus className="w-4 h-4 mr-2" />
                Abstain
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
