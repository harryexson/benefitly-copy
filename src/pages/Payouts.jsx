import React, { useState, useEffect } from 'react';
import { Payout, Event, Member, AssociationAccount } from '@/entities/all';
import { User } from '@/entities/User';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Zap, CheckCircle2, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PayoutsTable from '../components/payouts/PayoutsTable';
import PayoutForm from '../components/payouts/PayoutForm';
import PayoutSummaryDashboard from '../components/payouts/PayoutSummaryDashboard';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';


export default function Payouts() {
  const [payouts, setPayouts] = useState([]);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPayout, setEditingPayout] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [selectedPayouts, setSelectedPayouts] = useState([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const loadData = async () => {
    try {
      // Ensure user is logged in before fetching
      await User.me();
      setIsLoading(true);
      const [payoutList, eventList, memberList] = await Promise.all([
        Payout.list('-created_date'),
        Event.list(),
        Member.list()
      ]);
      setPayouts(payoutList);
      setEvents(eventList);
      setMembers(memberList);
    } catch (e) {
      if (e.name === 'CanceledError' || (e.message && e.message.includes('aborted'))) {
        console.log('Data fetch for Payouts page aborted.');
      } else {
        console.error("Not authenticated, cannot load payouts.", e);
        toast.error("Failed to load data.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenForm = (payout = null) => {
    setEditingPayout(payout);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setEditingPayout(null);
    setIsFormOpen(false);
  };

  const handleSave = async () => {
    await loadData();
    handleCloseForm();
  };

  const handleApprove = async (payoutId) => {
    try {
      // First approve the payout
      await Payout.update(payoutId, { 
        status: 'Approved',
        approved_at: new Date().toISOString()
      });
      
      toast.success('Payout approved. Processing disbursement...');
      
      // Automatically trigger disbursement after approval
      try {
        // Get the payout to check its configured speed
        const payout = payouts.find(p => p.id === payoutId);
        const response = await base44.functions.invoke('orchestratePayoutToMember', {
          payout_id: payoutId,
          // Use payout's configured speed if available
          payout_method: payout?.payout_speed || 'standard',
        });
        
        if (response.data.success) {
          toast.success(`Payout disbursed! ${response.data.estimated_arrival}`);
        } else {
          toast.warning('Payout approved but disbursement pending. Check member bank details.');
        }
      } catch (disbursementError) {
        console.error('Auto-disbursement failed:', disbursementError);
        toast.warning('Payout approved. Manual disbursement may be required.');
      }
      
      await loadData();
    } catch (error) {
      console.error('Failed to approve payout:', error);
      toast.error('Failed to approve payout.');
    }
  };

  const handleReject = async (payoutId) => {
    try {
      await Payout.update(payoutId, { 
        status: 'Failed'
      });
      toast.success('Payout marked as failed.');
      await loadData();
    } catch (error) {
      console.error('Failed to reject payout:', error);
      toast.error('Failed to mark payout as failed.');
    }
  };

  const handleRetry = async (payoutId) => {
    try {
      // First, reset the payout to Approved status and clear error info
      await Payout.update(payoutId, {
        status: 'Approved',
        failure_reason: null,
        stripe_error_code: null,
        stripe_error_message: null
      });

      toast.loading('Retrying payout...');

      // Attempt to process the payout again
      const payout = payouts.find(p => p.id === payoutId);
      const response = await base44.functions.invoke('orchestratePayoutToMember', {
        payout_id: payoutId,
        // Use payout's configured speed if available
        payout_method: payout?.payout_speed || 'standard',
      });

      toast.dismiss();

      if (response.data.success) {
        toast.success('Payout processed successfully!');
      } else {
        toast.error(response.data.error || 'Payout retry failed');
      }

      await loadData();
    } catch (error) {
      toast.dismiss();
      console.error('Failed to retry payout:', error);
      const errorMsg = error.response?.data?.error || error.message || 'Failed to retry payout';
      toast.error(errorMsg);
      await loadData();
    }
  };

  const handleBulkApprove = async () => {
    if (selectedPayouts.length === 0) {
      toast.warning('Please select payouts to approve');
      return;
    }

    try {
      const promises = selectedPayouts.map(payoutId => 
        Payout.update(payoutId, { status: 'Approved', approved_at: new Date().toISOString() })
      );
      await Promise.all(promises);
      
      toast.success(`Approved ${selectedPayouts.length} payout(s)`);
      setSelectedPayouts([]);
      await loadData();
    } catch (error) {
      console.error('Failed to approve payouts:', error);
      toast.error('Failed to approve some payouts');
    }
  };

  const handleBulkProcess = async () => {
    if (selectedPayouts.length === 0) {
      toast.warning('Please select approved payouts to process');
      return;
    }

    // Verify all selected payouts are approved
    const selectedPayoutObjects = payouts.filter(p => selectedPayouts.includes(p.id));
    const notApproved = selectedPayoutObjects.filter(p => p.status !== 'Approved');
    
    if (notApproved.length > 0) {
      toast.error(`${notApproved.length} selected payout(s) are not approved. Please approve them first.`);
      return;
    }

    setIsBulkProcessing(true);
    try {
      // Check association's payout provider and call appropriate bulk function
      const user = await User.me();
      const accounts = await AssociationAccount.list();
      const assocAccount = accounts.find(a => a.id === user.association_account_id);
      
      const functionName = (assocAccount?.payout_provider === 'tremendous' || assocAccount?.payout_provider === 'both')
        ? 'bulkProcessTremendousPayouts'
        : 'bulkProcessPayouts';
      
      const response = await base44.functions.invoke(functionName, {
        payout_ids: selectedPayouts,
        payout_method: 'standard',
        payment_method: 'ACH',
        delivery_method: 'EMAIL'
      });

      if (response.data.success) {
        toast.success(response.data.message);
      } else {
        if (response.data.successful === 0 && response.data.failed > 0) {
          toast.error(`Failed to process ${response.data.failed} payout(s).`);
        } else if (response.data.successful > 0 || response.data.failed > 0) {
          toast.warning(`${response.data.successful} of ${response.data.total} payout(s) processed successfully. ${response.data.failed} failed.`);
        } else {
          toast.error('Failed to process payouts due to an unexpected issue.');
        }
      }

      setSelectedPayouts([]);
      await loadData();
    } catch (error) {
      console.error('Failed to process payouts:', error);
      toast.error('Failed to process payouts');
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const filteredPayouts = payouts.filter(payout => {
    const member = members.find(m => m.id === payout.payee_member_id);
    const memberName = member ? `${member.first_name} ${member.last_name}` : '';
    
    const matchesSearch = memberName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTab = activeTab === 'all' || payout.status.toLowerCase().replace(' ', '_') === activeTab;
    return matchesSearch && matchesTab;
  });

  const statusCounts = {
    all: payouts.length,
    pending_approval: payouts.filter(p => p.status === 'Pending Approval').length,
    approved: payouts.filter(p => p.status === 'Approved').length,
    disbursed: payouts.filter(p => p.status === 'Disbursed').length,
    failed: payouts.filter(p => p.status === 'Failed').length
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Payout Management</h2>
          <p className="text-gray-500">Process and track benefit payouts to members.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by member name..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button onClick={() => handleOpenForm()} className="flex items-center gap-2">
            <PlusCircle className="h-5 w-5" />
            New Payout
          </Button>
        </div>
      </div>

      {/* Summary Dashboard */}
      <PayoutSummaryDashboard 
        payouts={payouts}
        onTabChange={setActiveTab}
        onSelectPayouts={setSelectedPayouts}
      />

      {/* Bulk Actions Bar */}
      {selectedPayouts.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {selectedPayouts.length} payout{selectedPayouts.length !== 1 ? 's' : ''} selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPayouts([])}
              >
                Clear Selection
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleBulkApprove}
              >
                Approve Selected
              </Button>
              <Button
                size="sm"
                onClick={handleBulkProcess}
                disabled={isBulkProcessing}
                className="bg-green-600 hover:bg-green-700"
              >
                {isBulkProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Process Selected Payouts
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList>
          <TabsTrigger value="all">All ({statusCounts.all})</TabsTrigger>
          <TabsTrigger value="pending_approval">Pending ({statusCounts.pending_approval})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({statusCounts.approved})</TabsTrigger>
          <TabsTrigger value="disbursed">Disbursed ({statusCounts.disbursed})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({statusCounts.failed})</TabsTrigger>
        </TabsList>
        <TabsContent value={activeTab} className="mt-6">
          <PayoutsTable 
            payouts={filteredPayouts} 
            members={members}
            events={events}
            onEdit={handleOpenForm}
            onApprove={handleApprove}
            onReject={handleReject}
            onRetry={handleRetry}
            selectedPayouts={selectedPayouts}
            onSelectionChange={setSelectedPayouts}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingPayout ? 'Edit Payout' : 'Create New Payout'}</DialogTitle>
          </DialogHeader>
          <PayoutForm
            payout={editingPayout}
            events={events}
            members={members}
            onSave={handleSave}
            onCancel={handleCloseForm}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}