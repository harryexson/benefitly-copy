import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DollarSign, CheckCircle, Clock, AlertCircle, Ban, ArrowDownRight } from 'lucide-react';
import { format } from 'date-fns';

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

export default function PayoutHistory({ payouts, events, totalReceived }) {
  const getEventTitle = (eventId) => {
    const event = events?.find(e => e.id === eventId);
    return event ? event.title : 'Benefit Payout';
  };

  const getStatusInfo = (status) => statusConfig[status] || statusConfig['Pending Approval'];

  if (!payouts || payouts.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Payouts Yet</h3>
          <p className="text-gray-500">
            When you receive benefit payouts, they will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700 font-medium">Total Benefits Received</p>
              <p className="text-4xl font-bold text-green-600 mt-1">
                ${totalReceived.toFixed(2)}
              </p>
              <p className="text-sm text-green-600 mt-1">
                {payouts.filter(p => p.status === 'Disbursed').length} payouts completed
              </p>
            </div>
            <div className="p-4 bg-green-100 rounded-full">
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payout History Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payout History</CardTitle>
          <CardDescription>
            Complete record of all benefit payments to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {payouts.map((payout) => {
                const statusInfo = getStatusInfo(payout.status);
                const StatusIcon = statusInfo.icon;
                
                return (
                  <TableRow key={payout.id}>
                    <TableCell className="font-medium">
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
                        <span>Processing...</span>
                      )}
                      {payout.status === 'Failed' && payout.failure_reason && (
                        <span className="text-red-600">{payout.failure_reason}</span>
                      )}
                      {payout.status === 'Pending Approval' && (
                        <span>Awaiting approval</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}