import React, { useState, useEffect } from 'react';
import { Payout, Member, AssociationAccount } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  User, 
  Zap, 
  Landmark,
  AlertTriangle,
  Loader2,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function PayoutApproval({ user }) {
  const [pendingPayouts, setPendingPayouts] = useState([]);
  const [members, setMembers] = useState({});
  const [associationAccount, setAssociationAccount] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [rejectDialog, setRejectDialog] = useState({ open: false, payout: null });
  const [rejectionReason, setRejectionReason] = useState('');
  const [approveDialog, setApproveDialog] = useState({ open: false, payout: null });
  const [selectedPayoutSpeed, setSelectedPayoutSpeed] = useState('standard');

  useEffect(() => {
    loadPendingPayouts();
  }, []);

  const loadPendingPayouts = async () => {
    try {
      setIsLoading(true);
      const [payouts, accounts] = await Promise.all([
        Payout.filter({ status: 'Pending Approval' }, '-created_date'),
        AssociationAccount.list()
      ]);

      const userAccount = accounts.find(a => a.id === user.association_account_id);
      setAssociationAccount(userAccount);
      
      // Load member details for all payouts
      const memberIds = [...new Set(payouts.map(p => p.payee_member_id))];
      const memberData = await Promise.all(
        memberIds.map(id => Member.get(id).catch(() => null))
      );
      
      const membersMap = {};
      memberData.forEach(m => {
        if (m) membersMap[m.id] = m;
      });
      
      setMembers(membersMap);
      setPendingPayouts(payouts);
    } catch (error) {
      console.error('Failed to load pending payouts:', error);
      toast.error('Failed to load pending payouts');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateFee = (amount, speed) => {
    if (!associationAccount) return { feeAmount: 0, feePercentage: 0, netAmount: amount };

    const feePercentage = speed === 'instant' 
      ? (associationAccount.instant_payout_fee_percentage || 1.5)
      : (associationAccount.standard_payout_fee_percentage || 0);

    let feeAmount = (amount * feePercentage) / 100;

    if (speed === 'instant' && associationAccount.instant_payout_fee_cap) {
      feeAmount = Math.min(feeAmount, associationAccount.instant_payout_fee_cap);
    }

    const netAmount = amount - feeAmount;

    return { feeAmount, feePercentage, netAmount };
  };

  const handleApproveClick = (payout) => {
    setApproveDialog({ open: true, payout });
    setSelectedPayoutSpeed('standard');
  };

  const handleApprove = async () => {
    const payout = approveDialog.payout;
    if (!payout) return;

    setProcessingId(payout.id);
    try {
      const { feeAmount, feePercentage, netAmount } = calculateFee(payout.amount, selectedPayoutSpeed);

      // Update payout with fee information
      await Payout.update(payout.id, {
        status: 'Approved',
        approved_at: new Date().toISOString(),
        payout_speed: selectedPayoutSpeed,
        fee_amount: feeAmount,
        fee_percentage: feePercentage,
        net_amount: netAmount
      });

      // Call the backend function to process the payout
      const response = await base44.functions.invoke('processPayoutToMember', {
        payout_id: payout.id,
        payout_method: selectedPayoutSpeed
      });

      if (response.data.success) {
        toast.success('Payout approved and processed successfully');
        setApproveDialog({ open: false, payout: null });
        await loadPendingPayouts();
      } else {
        toast.error(response.data.error || 'Failed to process payout');
      }
    } catch (error) {
      console.error('Failed to approve payout:', error);
      toast.error(error.message || 'Failed to approve payout');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    const payout = rejectDialog.payout;
    if (!payout) return;

    setProcessingId(payout.id);
    try {
      await Payout.update(payout.id, {
        status: 'Failed',
        failure_reason: rejectionReason || 'Rejected by administrator',
        stripe_error_message: rejectionReason
      });

      const member = members[payout.payee_member_id];
      if (member) {
        try {
          await base44.integrations.Core.SendEmail({
            from_name: 'Benefitly',
            to: member.email,
            subject: 'Payout Request Update',
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #DC2626;">Payout Request Update</h2>
                <p>Hello ${member.first_name},</p>
                <p>Your payout request for <strong>$${payout.amount.toFixed(2)}</strong> could not be processed at this time.</p>
                ${rejectionReason ? `<div style="background: #FEF2F2; border: 1px solid #FECACA; border-radius: 8px; padding: 16px; margin: 20px 0;">
                  <p style="margin: 0; color: #991B1B;"><strong>Reason:</strong> ${rejectionReason}</p>
                </div>` : ''}
                <p>If you have questions, please contact your association administrator.</p>
              </div>
            `
          });
        } catch (emailError) {
          console.error('Failed to send rejection email:', emailError);
        }
      }

      toast.success('Payout rejected');
      setRejectDialog({ open: false, payout: null });
      setRejectionReason('');
      await loadPendingPayouts();
    } catch (error) {
      console.error('Failed to reject payout:', error);
      toast.error('Failed to reject payout');
    } finally {
      setProcessingId(null);
    }
  };

  const getMemberName = (memberId) => {
    const member = members[memberId];
    if (!member) return 'Unknown Member';
    return `${member.first_name} ${member.last_name}`;
  };

  const getMemberPayoutMethod = (memberId) => {
    const member = members[memberId];
    if (!member) return 'Not Set';
    
    if (member.stripe_bank_account_id && member.bank_account_last4) {
      return `Bank ****${member.bank_account_last4}`;
    }
    if (member.saved_card_last4) {
      return `Card ****${member.saved_card_last4}`;
    }
    return member.payout_method || 'Not Set';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-6 w-6 text-orange-500" />
                Pending Payout Approvals
              </CardTitle>
              <CardDescription>
                Review and approve member payout requests
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {pendingPayouts.length} Pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {pendingPayouts.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                All Caught Up!
              </h3>
              <p className="text-gray-600">
                No pending payout requests to review at this time.
              </p>
            </div>
          ) : (
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Payout Method</TableHead>
                    <TableHead>Requested</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayouts.map((payout) => {
                    const member = members[payout.payee_member_id];
                    const isProcessing = processingId === payout.id;
                    
                    return (
                      <TableRow key={payout.id} className="hover:bg-gray-50">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-5 w-5 text-blue-600" />
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">
                                {getMemberName(payout.payee_member_id)}
                              </p>
                              {member && (
                                <p className="text-xs text-gray-500">{member.email}</p>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-green-600" />
                            <span className="font-bold text-lg text-green-700">
                              ${payout.amount.toFixed(2)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getMemberPayoutMethod(payout.payee_member_id).includes('Bank') ? (
                              <Landmark className="h-4 w-4 text-gray-500" />
                            ) : (
                              <Zap className="h-4 w-4 text-gray-500" />
                            )}
                            <span className="text-sm text-gray-700">
                              {getMemberPayoutMethod(payout.payee_member_id)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-gray-700">
                            {format(new Date(payout.created_date), 'MMM d, yyyy')}
                          </p>
                          <p className="text-xs text-gray-500">
                            {format(new Date(payout.created_date), 'h:mm a')}
                          </p>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectDialog({ open: true, payout })}
                              disabled={isProcessing}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApproveClick(payout)}
                              disabled={isProcessing}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Information Card */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Approval Process:</strong> When you approve a payout, you can choose the speed. Instant payouts have fees, while standard payouts are free but take 1-2 business days.
        </AlertDescription>
      </Alert>

      {/* Approval Dialog */}
      <Dialog open={approveDialog.open} onOpenChange={(open) => {
        if (!open) {
          setApproveDialog({ open: false, payout: null });
          setSelectedPayoutSpeed('standard');
        }
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Approve Payout</DialogTitle>
            <DialogDescription>
              Choose payout speed and review fees before approving
            </DialogDescription>
          </DialogHeader>
          
          {approveDialog.payout && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-sm text-gray-600">Member</p>
                <p className="font-semibold text-gray-900">
                  {getMemberName(approveDialog.payout.payee_member_id)}
                </p>
                <p className="text-sm text-gray-600 mt-2">Requested Amount</p>
                <p className="font-bold text-2xl text-gray-900">
                  ${approveDialog.payout.amount.toFixed(2)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="payout_speed">Payout Speed</Label>
                <Select value={selectedPayoutSpeed} onValueChange={setSelectedPayoutSpeed}>
                  <SelectTrigger id="payout_speed">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">
                      <div className="flex items-center gap-2">
                        <Landmark className="h-4 w-4" />
                        <div>
                          <p className="font-medium">Standard (Free)</p>
                          <p className="text-xs text-gray-500">1-2 business days</p>
                        </div>
                      </div>
                    </SelectItem>
                    <SelectItem value="instant">
                      <div className="flex items-center gap-2">
                        <Zap className="h-4 w-4" />
                        <div>
                          <p className="font-medium">Instant</p>
                          <p className="text-xs text-gray-500">Within 30 minutes</p>
                        </div>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Fee Breakdown */}
              {(() => {
                const { feeAmount, feePercentage, netAmount } = calculateFee(
                  approveDialog.payout.amount,
                  selectedPayoutSpeed
                );

                return (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start gap-2 mb-3">
                      <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                      <p className="text-sm font-semibold text-blue-900">Payout Breakdown</p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-700">Gross Amount:</span>
                        <span className="font-semibold">${approveDialog.payout.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-700">
                          Fee ({feePercentage}%):
                        </span>
                        <span className="font-semibold text-red-600">
                          -${feeAmount.toFixed(2)}
                        </span>
                      </div>
                      <div className="border-t border-blue-300 pt-2 flex justify-between">
                        <span className="font-semibold text-blue-900">Member Receives:</span>
                        <span className="font-bold text-lg text-green-700">
                          ${netAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                    {selectedPayoutSpeed === 'instant' && (
                      <p className="text-xs text-blue-700 mt-2">
                        Instant payout fee: {feePercentage}% (max ${associationAccount?.instant_payout_fee_cap?.toFixed(2) || '10.00'})
                      </p>
                    )}
                  </div>
                );
              })()}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApproveDialog({ open: false, payout: null });
                setSelectedPayoutSpeed('standard');
              }}
              disabled={processingId === approveDialog.payout?.id}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={processingId === approveDialog.payout?.id}
              className="bg-green-600 hover:bg-green-700"
            >
              {processingId === approveDialog.payout?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve & Process
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={rejectDialog.open} onOpenChange={(open) => {
        if (!open) {
          setRejectDialog({ open: false, payout: null });
          setRejectionReason('');
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payout Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this payout. The member will be notified.
            </DialogDescription>
          </DialogHeader>
          
          {rejectDialog.payout && (
            <div className="space-y-4 py-4">
              <div className="bg-gray-50 rounded-lg p-4 border">
                <p className="text-sm text-gray-600">Member</p>
                <p className="font-semibold text-gray-900">
                  {getMemberName(rejectDialog.payout.payee_member_id)}
                </p>
                <p className="text-sm text-gray-600 mt-2">Amount</p>
                <p className="font-bold text-lg text-gray-900">
                  ${rejectDialog.payout.amount.toFixed(2)}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="rejection_reason">Reason for Rejection</Label>
                <Textarea
                  id="rejection_reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g., Insufficient documentation, verification needed..."
                  rows={4}
                />
                <p className="text-xs text-gray-500">
                  This reason will be included in the notification sent to the member.
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialog({ open: false, payout: null });
                setRejectionReason('');
              }}
              disabled={processingId === rejectDialog.payout?.id}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processingId === rejectDialog.payout?.id}
            >
              {processingId === rejectDialog.payout?.id ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Rejecting...
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-2" />
                  Confirm Rejection
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}