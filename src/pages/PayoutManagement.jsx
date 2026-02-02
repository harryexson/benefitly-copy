import React, { useState, useEffect } from 'react';
import { Payout, Member, Event } from '@/entities/all';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Ban,
  Send,
  RefreshCw,
  Filter,
  Download,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

const statusConfig = {
  'Pending Approval': { 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock
  },
  'Approved': { 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: CheckCircle
  },
  'Disbursed': { 
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: Send
  },
  'Failed': { 
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertCircle
  },
  'Reversed': { 
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Ban
  }
};

const StatCard = ({ icon: Icon, label, value, sublabel, color = 'blue' }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function PayoutManagement({ user }) {
  const [payouts, setPayouts] = useState([]);
  const [members, setMembers] = useState({});
  const [events, setEvents] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [processingPayout, setProcessingPayout] = useState(null);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [allPayouts, memberList, eventList] = await Promise.all([
        Payout.list('-created_date'),
        Member.list(),
        Event.list()
      ]);

      const membersMap = {};
      memberList.forEach(m => membersMap[m.id] = m);

      const eventsMap = {};
      eventList.forEach(e => eventsMap[e.id] = e);

      setPayouts(allPayouts);
      setMembers(membersMap);
      setEvents(eventsMap);
    } catch (error) {
      console.error('Failed to load payout data:', error);
      toast.error('Failed to load payout data');
    } finally {
      setIsLoading(false);
    }
  };

  const getMemberName = (memberId) => {
    const member = members[memberId];
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown';
  };

  const getEventTitle = (eventId) => {
    const event = events[eventId];
    return event ? event.title : 'Benefit Payout';
  };

  const getStatusInfo = (status) => statusConfig[status] || statusConfig['Pending Approval'];

  const handleRetryPayout = async (payout) => {
    setProcessingPayout(payout.id);
    try {
      const response = await base44.functions.invoke('processPayoutToMember', {
        payout_id: payout.id,
        payout_method: payout.payout_speed || 'standard'
      });

      if (response.data.success) {
        toast.success('Payout processed successfully!');
        await loadData();
      } else {
        toast.error(response.data.error || 'Failed to process payout');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to retry payout');
    } finally {
      setProcessingPayout(null);
    }
  };

  const viewDetails = (payout) => {
    setSelectedPayout(payout);
    setShowDetailsDialog(true);
  };

  // Apply filters
  const filteredPayouts = payouts.filter(payout => {
    if (startDate) {
      const payoutDate = new Date(payout.created_date);
      if (payoutDate < new Date(startDate)) return false;
    }
    if (endDate) {
      const payoutDate = new Date(payout.created_date);
      if (payoutDate > new Date(endDate)) return false;
    }
    if (selectedMember !== 'all' && payout.payee_member_id !== selectedMember) {
      return false;
    }
    if (selectedStatus !== 'all' && payout.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  // Calculate statistics
  const stats = {
    pending: filteredPayouts.filter(p => p.status === 'Pending Approval').length,
    approved: filteredPayouts.filter(p => p.status === 'Approved').length,
    disbursed: filteredPayouts.filter(p => p.status === 'Disbursed').length,
    failed: filteredPayouts.filter(p => p.status === 'Failed').length,
    totalDisbursed: filteredPayouts.filter(p => p.status === 'Disbursed').reduce((sum, p) => sum + p.amount, 0),
    totalAmount: filteredPayouts.reduce((sum, p) => sum + p.amount, 0)
  };

  const handleExportCSV = () => {
    try {
      const headers = ['Date', 'Member', 'Event', 'Amount', 'Status', 'Bank Account', 'Stripe ID', 'Failure Reason'];
      const rows = filteredPayouts.map(payout => [
        format(new Date(payout.created_date), 'yyyy-MM-dd'),
        getMemberName(payout.payee_member_id),
        getEventTitle(payout.event_id),
        payout.amount.toFixed(2),
        payout.status,
        members[payout.payee_member_id]?.bank_account_last4 ? `****${members[payout.payee_member_id].bank_account_last4}` : 'N/A',
        payout.stripe_payout_id || '',
        payout.failure_reason || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payout-management-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Payout data exported');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid md:grid-cols-4 gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payout Management</h1>
          <p className="text-gray-600 mt-1">
            Track and manage all member benefit payouts
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button
            onClick={handleExportCSV}
            disabled={filteredPayouts.length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-4 gap-6">
        <StatCard
          icon={Clock}
          label="Pending Approval"
          value={stats.pending}
          sublabel="Awaiting action"
          color="yellow"
        />
        <StatCard
          icon={CheckCircle}
          label="Approved"
          value={stats.approved}
          sublabel="Processing"
          color="blue"
        />
        <StatCard
          icon={Send}
          label="Disbursed"
          value={`$${stats.totalDisbursed.toFixed(2)}`}
          sublabel={`${stats.disbursed} completed`}
          color="green"
        />
        <StatCard
          icon={AlertCircle}
          label="Failed"
          value={stats.failed}
          sublabel="Requires attention"
          color="red"
        />
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            Filter Payouts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="member_filter">Member</Label>
              <Select value={selectedMember} onValueChange={setSelectedMember}>
                <SelectTrigger id="member_filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Members</SelectItem>
                  {Object.values(members).map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status_filter">Status</Label>
              <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                <SelectTrigger id="status_filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Disbursed">Disbursed</SelectItem>
                  <SelectItem value="Failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSelectedMember('all');
                setSelectedStatus('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Different Views */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Payouts ({filteredPayouts.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
          <TabsTrigger value="failed">Failed ({stats.failed})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({stats.disbursed})</TabsTrigger>
        </TabsList>

        {['all', 'pending', 'failed', 'completed'].map(tab => (
          <TabsContent key={tab} value={tab} className="space-y-4">
            <Card>
              <CardContent className="pt-6">
                {filteredPayouts
                  .filter(p => {
                    if (tab === 'pending') return p.status === 'Pending Approval' || p.status === 'Approved';
                    if (tab === 'failed') return p.status === 'Failed';
                    if (tab === 'completed') return p.status === 'Disbursed';
                    return true;
                  })
                  .length > 0 ? (
                  <div className="rounded-lg border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Member</TableHead>
                          <TableHead>Event</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayouts
                          .filter(p => {
                            if (tab === 'pending') return p.status === 'Pending Approval' || p.status === 'Approved';
                            if (tab === 'failed') return p.status === 'Failed';
                            if (tab === 'completed') return p.status === 'Disbursed';
                            return true;
                          })
                          .map((payout) => {
                            const statusInfo = getStatusInfo(payout.status);
                            const StatusIcon = statusInfo.icon;
                            
                            return (
                              <TableRow key={payout.id} className="hover:bg-gray-50">
                                <TableCell className="font-medium whitespace-nowrap">
                                  {format(new Date(payout.created_date), 'MMM d, yyyy')}
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <div className="font-medium">{getMemberName(payout.payee_member_id)}</div>
                                    <div className="text-xs text-gray-500">
                                      {members[payout.payee_member_id]?.email}
                                    </div>
                                  </div>
                                </TableCell>
                                <TableCell>{getEventTitle(payout.event_id)}</TableCell>
                                <TableCell>
                                  <span className="font-bold text-gray-900">
                                    ${payout.amount.toFixed(2)}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={statusInfo.color}>
                                    <StatusIcon className="w-3 h-3 mr-1" />
                                    {payout.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => viewDetails(payout)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                    {payout.status === 'Failed' && (
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRetryPayout(payout)}
                                        disabled={processingPayout === payout.id}
                                      >
                                        {processingPayout === payout.id ? (
                                          <RefreshCw className="h-4 w-4 animate-spin" />
                                        ) : (
                                          <>
                                            <RefreshCw className="h-4 w-4 mr-1" />
                                            Retry
                                          </>
                                        )}
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Payouts Found</h3>
                    <p className="text-gray-500">
                      No payouts match your current filters.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payout Details</DialogTitle>
            <DialogDescription>
              Complete information for this payout
            </DialogDescription>
          </DialogHeader>
          {selectedPayout && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Member</Label>
                  <p className="font-medium">{getMemberName(selectedPayout.payee_member_id)}</p>
                  <p className="text-sm text-gray-500">{members[selectedPayout.payee_member_id]?.email}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Amount</Label>
                  <p className="font-bold text-2xl">${selectedPayout.amount.toFixed(2)}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Status</Label>
                  <div className="mt-1">
                    <Badge variant="outline" className={getStatusInfo(selectedPayout.status).color}>
                      {selectedPayout.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-gray-500">Created</Label>
                  <p>{format(new Date(selectedPayout.created_date), 'MMM d, yyyy h:mm a')}</p>
                </div>
                {selectedPayout.event_id && (
                  <div>
                    <Label className="text-gray-500">Event</Label>
                    <p>{getEventTitle(selectedPayout.event_id)}</p>
                  </div>
                )}
                {selectedPayout.stripe_payout_id && (
                  <div>
                    <Label className="text-gray-500">Stripe Payout ID</Label>
                    <p className="font-mono text-sm">{selectedPayout.stripe_payout_id}</p>
                  </div>
                )}
                {selectedPayout.failure_reason && (
                  <div className="col-span-2">
                    <Label className="text-gray-500">Failure Reason</Label>
                    <Alert className="mt-2 bg-red-50 border-red-200">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        {selectedPayout.failure_reason}
                      </AlertDescription>
                    </Alert>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}