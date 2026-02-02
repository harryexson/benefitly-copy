import React, { useState, useEffect } from 'react';
import { Member, EventContribution, Payout } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  DollarSign, Users, CheckCircle2, AlertTriangle, 
  Loader2, Info, Calculator 
} from 'lucide-react';
import { toast } from 'sonner';

export default function EventPayoutManager({ event, onComplete, onCancel }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [members, setMembers] = useState([]);
  const [contributions, setContributions] = useState([]);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [affectedMember, setAffectedMember] = useState(null);

  useEffect(() => {
    loadEventData();
  }, [event]);

  const loadEventData = async () => {
    try {
      setIsLoading(true);
      
      // Load all members and contributions for this event
      const [allMembers, eventContributions] = await Promise.all([
        Member.list(),
        EventContribution.filter({ event_id: event.id })
      ]);

      setMembers(allMembers);
      setContributions(eventContributions);

      // Pre-select affected member if specified
      if (event.affected_member_id) {
        setSelectedMembers([event.affected_member_id]);
        const affected = allMembers.find(m => m.id === event.affected_member_id);
        setAffectedMember(affected);
      }

      // Calculate total collected amount as suggested payout
      const totalCollected = eventContributions
        .filter(c => c.status === 'Paid')
        .reduce((sum, c) => sum + (c.amount_paid || 0), 0);
      
      setPayoutAmount(totalCollected.toFixed(2));

    } catch (error) {
      console.error('Failed to load event data:', error);
      toast.error('Failed to load event data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleMember = (memberId) => {
    setSelectedMembers(prev => 
      prev.includes(memberId)
        ? prev.filter(id => id !== memberId)
        : [...prev, memberId]
    );
  };

  const handleSelectAll = (eligible) => {
    if (selectedMembers.length === eligible.length) {
      setSelectedMembers([]);
    } else {
      setSelectedMembers(eligible.map(m => m.id));
    }
  };

  const handleCreatePayouts = async () => {
    if (selectedMembers.length === 0) {
      toast.error('Please select at least one member to receive a payout');
      return;
    }

    if (!payoutAmount || parseFloat(payoutAmount) <= 0) {
      toast.error('Please enter a valid payout amount');
      return;
    }

    setIsSaving(true);
    try {
      const amount = parseFloat(payoutAmount);
      const amountPerMember = selectedMembers.length > 1 
        ? amount / selectedMembers.length 
        : amount;

      // Create payout records for each selected member
      const payoutPromises = selectedMembers.map(memberId => 
        Payout.create({
          event_id: event.id,
          payee_member_id: memberId,
          amount: amountPerMember,
          currency: event.currency || 'USD',
          status: 'Pending Approval',
        })
      );

      await Promise.all(payoutPromises);

      toast.success(`Created ${selectedMembers.length} payout record(s) for approval`);
      onComplete();
    } catch (error) {
      console.error('Failed to create payouts:', error);
      toast.error('Failed to create payout records');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Get members who contributed
  const contributingMemberIds = contributions
    .filter(c => c.status === 'Paid')
    .map(c => c.member_id);

  const eligibleMembers = members.filter(m => 
    m.status === 'Active' && 
    (event.type === 'Death' || 
     event.type === 'Hospitalization' || 
     event.type === 'Loss of Loved One' ||
     contributingMemberIds.includes(m.id))
  );

  const totalCollected = contributions
    .filter(c => c.status === 'Paid')
    .reduce((sum, c) => sum + (c.amount_paid || 0), 0);

  const totalContributors = contributions.filter(c => c.status === 'Paid').length;
  const totalMembers = contributions.length;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Collected</p>
                <p className="text-2xl font-bold text-green-600">
                  ${totalCollected.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Contributors</p>
                <p className="text-2xl font-bold text-blue-600">
                  {totalContributors}/{totalMembers}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Calculator className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Payout Amount</p>
                <p className="text-2xl font-bold text-purple-600">
                  ${payoutAmount || '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Affected Member Highlight */}
      {affectedMember && (
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Affected Member:</strong> {affectedMember.first_name} {affectedMember.last_name}
            {selectedMembers.includes(affectedMember.id) && ' (Selected for payout)'}
          </AlertDescription>
        </Alert>
      )}

      {/* Payout Amount Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Payout Configuration</CardTitle>
          <CardDescription>
            Set the total payout amount. It will be split equally among selected members.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="payoutAmount">Total Payout Amount ($)</Label>
              <Input
                id="payoutAmount"
                type="number"
                step="0.01"
                min="0"
                value={payoutAmount}
                onChange={(e) => setPayoutAmount(e.target.value)}
                placeholder="Enter total payout amount"
              />
              <p className="text-xs text-gray-500">
                Suggested: ${totalCollected.toFixed(2)} (total contributions collected)
              </p>
            </div>

            {selectedMembers.length > 0 && payoutAmount && (
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-1">
                  Payout Distribution:
                </p>
                <p className="text-lg font-bold text-gray-900">
                  ${(parseFloat(payoutAmount) / selectedMembers.length).toFixed(2)} per member
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  × {selectedMembers.length} selected member{selectedMembers.length !== 1 ? 's' : ''}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Member Selection */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Select Payout Recipients</CardTitle>
              <CardDescription>
                Choose which members should receive benefit payouts for this event
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectAll(eligibleMembers)}
            >
              {selectedMembers.length === eligibleMembers.length ? 'Deselect All' : 'Select All'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {eligibleMembers.length === 0 ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                No eligible members found. Members must be active and have paid their contributions.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {eligibleMembers.map(member => {
                const contribution = contributions.find(c => c.member_id === member.id);
                const hasPaid = contribution?.status === 'Paid';
                const isSelected = selectedMembers.includes(member.id);
                const isAffected = member.id === event.affected_member_id;

                return (
                  <div
                    key={member.id}
                    className={`
                      flex items-center justify-between p-3 rounded-lg border-2 transition-all
                      ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}
                      ${isAffected ? 'ring-2 ring-purple-300' : ''}
                    `}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => handleToggleMember(member.id)}
                      />
                      <div>
                        <p className="font-medium text-gray-900">
                          {member.first_name} {member.last_name}
                          {isAffected && (
                            <Badge variant="outline" className="ml-2 text-purple-700 border-purple-300">
                              Affected Member
                            </Badge>
                          )}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-sm text-gray-600">{member.email}</p>
                          {hasPaid && (
                            <Badge variant="outline" className="text-green-700 border-green-300">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Paid ${contribution.amount_paid.toFixed(2)}
                            </Badge>
                          )}
                          {member.stripe_bank_account_id && (
                            <Badge variant="outline" className="text-blue-700 border-blue-300">
                              Bank Connected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {!member.stripe_bank_account_id && (
                      <AlertTriangle className="h-5 w-5 text-yellow-500" title="No bank account set up" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warnings */}
      {selectedMembers.some(id => {
        const member = members.find(m => m.id === id);
        return !member?.stripe_bank_account_id;
      }) && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Warning:</strong> Some selected members have not set up their bank accounts. 
            They will need to add their banking information before payouts can be processed.
          </AlertDescription>
        </Alert>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isSaving}>
          Cancel
        </Button>
        
        <div className="flex items-center gap-3">
          <p className="text-sm text-gray-600">
            {selectedMembers.length} member{selectedMembers.length !== 1 ? 's' : ''} selected
          </p>
          <Button 
            onClick={handleCreatePayouts}
            disabled={isSaving || selectedMembers.length === 0 || !payoutAmount}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating Payouts...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Create Payout Records
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}