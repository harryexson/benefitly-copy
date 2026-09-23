import React, { useState, useEffect } from 'react';
import { Payout, Event, Member } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Ban,
  ArrowDownRight,
  TrendingUp,
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const statusConfig = {
  'Pending Approval': { 
    color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    icon: Clock,
    description: 'Awaiting administrator approval'
  },
  'Approved': { 
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: CheckCircle,
    description: 'Approved, processing payment'
  },
  'Disbursed': { 
    color: 'bg-green-100 text-green-800 border-green-200',
    icon: ArrowDownRight,
    description: 'Sent to your bank account'
  },
  'Failed': { 
    color: 'bg-red-100 text-red-800 border-red-200',
    icon: AlertCircle,
    description: 'Payment failed - contact admin'
  },
  'Reversed': { 
    color: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: Ban,
    description: 'Payment was reversed'
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

export default function PayoutHistory({ user }) {
  const [payouts, setPayouts] = useState([]);
  const [events, setEvents] = useState([]);
  const [member, setMember] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user?.email) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const [memberResults, eventList] = await Promise.all([
        Member.filter({ email: user.email }),
        Event.list()
      ]);

      if (memberResults.length > 0) {
        const currentMember = memberResults[0];
        setMember(currentMember);

        const payoutList = await Payout.filter({ 
          payee_member_id: currentMember.id 
        }, '-created_date');

        setPayouts(payoutList);
        setEvents(eventList);
      }
    } catch (error) {
      console.error('Failed to load payout history:', error);
      toast.error('Failed to load payout history');
    } finally {
      setIsLoading(false);
    }
  };

  const getEventTitle = (eventId) => {
    const event = events.find(e => e.id === eventId);
    return event ? event.title : 'Benefit Payout';
  };

  const getStatusInfo = (status) => statusConfig[status] || statusConfig['Pending Approval'];

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
    if (selectedStatus !== 'all' && payout.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  // Calculate statistics
  const stats = {
    total: filteredPayouts.reduce((sum, p) => sum + p.amount, 0),
    disbursed: filteredPayouts.filter(p => p.status === 'Disbursed').reduce((sum, p) => sum + p.amount, 0),
    pending: filteredPayouts.filter(p => p.status === 'Pending Approval' || p.status === 'Approved').length,
    totalCount: filteredPayouts.length
  };

  const handleExportCSV = () => {
    try {
      const headers = ['Date', 'Event', 'Amount', 'Status', 'Bank Account', 'Estimated Arrival'];
      const rows = filteredPayouts.map(payout => [
        format(new Date(payout.created_date), 'yyyy-MM-dd'),
        getEventTitle(payout.event_id),
        payout.amount.toFixed(2),
        payout.status,
        member?.bank_account_last4 ? `****${member.bank_account_last4}` : 'N/A',
        payout.estimated_arrival ? format(new Date(payout.estimated_arrival), 'yyyy-MM-dd') : ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payout-history-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Payout history exported');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export');
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
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
          <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Member Profile Not Found</h3>
          <p className="text-gray-500">
            Please contact your administrator to set up your member profile.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Payout History</h1>
          <p className="text-gray-600 mt-1">
            Track all benefit payouts sent to your account
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          variant="outline"
          disabled={filteredPayouts.length === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Bank Account Status */}
      {member.stripe_bank_account_id ? (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>Bank Account Connected:</strong> {member.bank_name} ****{member.bank_account_last4}
          </AlertDescription>
        </Alert>
      ) : (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Action Required:</strong> Add your bank account in your profile to receive payouts.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Stats */}
      <div className="grid md:grid-cols-3 gap-6">
        <StatCard
          icon={DollarSign}
          label="Total Received"
          value={`$${stats.disbursed.toFixed(2)}`}
          sublabel={`${filteredPayouts.filter(p => p.status === 'Disbursed').length} payouts completed`}
          color="green"
        />
        <StatCard
          icon={TrendingUp}
          label="Total Amount"
          value={`$${stats.total.toFixed(2)}`}
          sublabel={`${stats.totalCount} total payouts`}
          color="blue"
        />
        <StatCard
          icon={Clock}
          label="Pending"
          value={stats.pending}
          sublabel="Awaiting processing"
          color="orange"
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
          <div className="grid md:grid-cols-3 gap-4">
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

          <div className="flex justify-end mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setStartDate('');
                setEndDate('');
                setSelectedStatus('all');
              }}
            >
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payout History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            All Payouts
          </CardTitle>
          <CardDescription>
            Showing {filteredPayouts.length} of {payouts.length} payouts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredPayouts.length > 0 ? (
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map((payout) => {
                    const statusInfo = getStatusInfo(payout.status);
                    const StatusIcon = statusInfo.icon;
                    
                    return (
                      <TableRow key={payout.id} className="hover:bg-gray-50">
                        <TableCell className="font-medium whitespace-nowrap">
                          {payout.paid_at 
                            ? format(new Date(payout.paid_at), 'MMM d, yyyy')
                            : payout.approved_at 
                              ? format(new Date(payout.approved_at), 'MMM d, yyyy')
                              : format(new Date(payout.created_date), 'MMM d, yyyy')
                          }
                        </TableCell>
                        <TableCell>{getEventTitle(payout.event_id)}</TableCell>
                        <TableCell>
                          <span className={`font-bold ${payout.status === 'Disbursed' ? 'text-green-600' : 'text-gray-900'}`}>
                            ${payout.amount.toFixed(2)}
                          </span>
                          {payout.fee_amount > 0 && (
                            <span className="text-xs text-gray-500 block">
                              Fee: ${payout.fee_amount.toFixed(2)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusInfo.color}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {payout.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell text-sm text-gray-500">
                          {payout.status === 'Disbursed' && payout.estimated_arrival && (
                            <span>Arrived {format(new Date(payout.estimated_arrival), 'MMM d')}</span>
                          )}
                          {payout.status === 'Approved' && (
                            <span className="text-blue-600">Processing...</span>
                          )}
                          {payout.status === 'Failed' && payout.failure_reason && (
                            <span className="text-red-600">{payout.failure_reason}</span>
                          )}
                          {payout.status === 'Pending Approval' && (
                            <span className="text-yellow-600">Awaiting approval</span>
                          )}
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
                {payouts.length === 0 
                  ? 'You have not received any payouts yet.'
                  : 'No payouts match your current filters.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}