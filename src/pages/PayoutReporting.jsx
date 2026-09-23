import React, { useState, useEffect } from 'react';
import { Payout, Member } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  Download,
  Filter,
  BarChart3,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const StatCard = ({ icon: Icon, label, value, color = 'blue', sublabel }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {sublabel && (
            <p className="text-xs text-gray-500 mt-1">{sublabel}</p>
          )}
        </div>
        <div className={`p-3 rounded-full bg-${color}-100`}>
          <Icon className={`h-6 w-6 text-${color}-600`} />
        </div>
      </div>
    </CardContent>
  </Card>
);

export default function PayoutReporting({ user }) {
  const [payouts, setPayouts] = useState([]);
  const [members, setMembers] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMember, setSelectedMember] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  useEffect(() => {
    loadPayoutData();
  }, []);

  const loadPayoutData = async () => {
    try {
      setIsLoading(true);
      const allPayouts = await Payout.list('-created_date');
      const memberIds = [...new Set(allPayouts.map(p => p.payee_member_id).filter(Boolean))];
      const memberData = await Promise.all(
        memberIds.map(id => Member.get(id).catch(err => {
          console.warn(`Member ${id} not found, skipping`);
          return null;
        }))
      );

      const membersMap = {};
      memberData.forEach(m => {
        if (m) membersMap[m.id] = m;
      });

      setMembers(membersMap);
      setPayouts(allPayouts);
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

  // Apply filters
  const filteredPayouts = payouts.filter(payout => {
    // Date filter
    if (startDate) {
      const payoutDate = new Date(payout.created_date);
      if (payoutDate < new Date(startDate)) return false;
    }
    if (endDate) {
      const payoutDate = new Date(payout.created_date);
      if (payoutDate > new Date(endDate)) return false;
    }

    // Member filter
    if (selectedMember !== 'all' && payout.payee_member_id !== selectedMember) {
      return false;
    }

    // Status filter
    if (selectedStatus !== 'all' && payout.status !== selectedStatus) {
      return false;
    }

    return true;
  });

  // Calculate statistics
  const stats = {
    totalPayouts: filteredPayouts.length,
    totalAmount: filteredPayouts.reduce((sum, p) => sum + p.amount, 0),
    averageAmount: filteredPayouts.length > 0
      ? filteredPayouts.reduce((sum, p) => sum + p.amount, 0) / filteredPayouts.length
      : 0,
    byStatus: {
      pending: filteredPayouts.filter(p => p.status === 'Pending Approval').length,
      approved: filteredPayouts.filter(p => p.status === 'Approved').length,
      disbursed: filteredPayouts.filter(p => p.status === 'Disbursed').length,
      failed: filteredPayouts.filter(p => p.status === 'Failed').length
    },
    totalDisbursed: filteredPayouts
      .filter(p => p.status === 'Disbursed')
      .reduce((sum, p) => sum + p.amount, 0),
    totalFees: filteredPayouts.reduce((sum, p) => sum + (p.fee_amount || 0), 0),
    instantPayouts: filteredPayouts.filter(p => p.payout_speed === 'instant').length,
    standardPayouts: filteredPayouts.filter(p => p.payout_speed === 'standard').length
  };

  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      // Create CSV content
      const headers = [
        'Date',
        'Member',
        'Member Email',
        'Amount',
        'Status',
        'Payout Speed',
        'Fee Amount',
        'Net Amount',
        'Approved Date',
        'Disbursed Date',
        'Stripe Payout ID',
        'Failure Reason'
      ];

      const rows = filteredPayouts.map(payout => {
        const member = members[payout.payee_member_id];
        return [
          format(new Date(payout.created_date), 'yyyy-MM-dd HH:mm:ss'),
          getMemberName(payout.payee_member_id),
          member?.email || '',
          payout.amount.toFixed(2),
          payout.status,
          payout.payout_speed || 'standard',
          (payout.fee_amount || 0).toFixed(2),
          (payout.net_amount || payout.amount).toFixed(2),
          payout.approved_at ? format(new Date(payout.approved_at), 'yyyy-MM-dd') : '',
          payout.paid_at ? format(new Date(payout.paid_at), 'yyyy-MM-dd') : '',
          payout.stripe_payout_id || '',
          payout.failure_reason || ''
        ];
      });

      // Convert to CSV
      const csvContent = [
        headers.join(','),
        ...rows.map(row => 
          row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        )
      ].join('\n');

      // Download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `payout-report-${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Disbursed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'Approved':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Pending Approval':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'Failed':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
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
          <h1 className="text-3xl font-bold text-gray-900">Payout Reports</h1>
          <p className="text-gray-600 mt-1">
            Comprehensive analytics and reporting for all member payouts
          </p>
        </div>
        <Button
          onClick={handleExportCSV}
          disabled={isExporting || filteredPayouts.length === 0}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {isExporting ? (
            <>Exporting...</>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </>
          )}
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid md:grid-cols-5 gap-6">
        <StatCard
          icon={DollarSign}
          label="Total Payouts"
          value={stats.totalPayouts}
          sublabel={`$${stats.totalAmount.toFixed(2)} total`}
          color="blue"
        />
        <StatCard
          icon={TrendingUp}
          label="Average Amount"
          value={`$${stats.averageAmount.toFixed(2)}`}
          sublabel="Per payout"
          color="green"
        />
        <StatCard
          icon={CheckCircle}
          label="Disbursed"
          value={`$${stats.totalDisbursed.toFixed(2)}`}
          sublabel={`${stats.byStatus.disbursed} payouts completed`}
          color="green"
        />
        <StatCard
          icon={Clock}
          label="Total Fees"
          value={`$${stats.totalFees.toFixed(2)}`}
          sublabel="Platform fees collected"
          color="purple"
        />
        <StatCard
          icon={AlertCircle}
          label="Pending"
          value={stats.byStatus.pending}
          sublabel="Awaiting approval"
          color="orange"
        />
      </div>

      {/* Status & Speed Breakdown */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Payout Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-sm text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{stats.byStatus.pending}</p>
              </div>
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold text-blue-600">{stats.byStatus.approved}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-gray-600">Disbursed</p>
                <p className="text-2xl font-bold text-green-600">{stats.byStatus.disbursed}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{stats.byStatus.failed}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-600" />
              Fee Analytics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-gray-600">Total Fees Collected</p>
                <p className="text-3xl font-bold text-purple-700">${stats.totalFees.toFixed(2)}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600">Instant Payouts</p>
                  <p className="text-xl font-bold text-gray-700">{stats.instantPayouts}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-600">Standard Payouts</p>
                  <p className="text-xl font-bold text-gray-700">{stats.standardPayouts}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-gray-600" />
            Filter Reports
          </CardTitle>
          <CardDescription>
            Narrow down payouts by date range, member, or status
          </CardDescription>
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

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-600" />
            Detailed Payout Records
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
                    <TableHead>Member</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Speed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayouts.map(payout => (
                    <TableRow key={payout.id} className="hover:bg-gray-50">
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm">
                          {format(new Date(payout.created_date), 'MMM d, yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {format(new Date(payout.created_date), 'h:mm a')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{getMemberName(payout.payee_member_id)}</div>
                        <div className="text-xs text-gray-500">
                          {members[payout.payee_member_id]?.email}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-gray-700">
                          ${payout.amount.toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className={`text-sm ${(payout.fee_amount || 0) > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                          ${(payout.fee_amount || 0).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-bold text-green-700">
                          ${(payout.net_amount || payout.amount).toFixed(2)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(payout.status)}>
                          {payout.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={payout.payout_speed === 'instant' ? 'border-orange-400 text-orange-700' : 'border-gray-400 text-gray-700'}>
                          {payout.payout_speed === 'instant' ? 'Instant' : 'Standard'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No payouts found matching your filters</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}