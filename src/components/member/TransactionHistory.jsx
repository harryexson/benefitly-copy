import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowDownCircle, ArrowUpCircle, Calendar, Download, CreditCard } from 'lucide-react';
import { format } from 'date-fns';

export default function TransactionHistory({ contributions, payouts, events, onPayNow }) {
  const [filter, setFilter] = useState('all');

  const getEventTitle = (eventId) => {
    const event = events.find(e => e.id === eventId);
    return event?.title || 'Unknown Event';
  };

  // Combine and sort all transactions
  const allTransactions = [
    ...contributions.map(c => ({
      id: `contrib-${c.id}`,
      type: 'contribution',
      date: c.paid_at || c.due_date,
      event: getEventTitle(c.event_id),
      amount: c.amount_due,
      status: c.status,
      isPaid: c.status === 'Paid',
      contribution: c
    })),
    ...payouts.map(p => ({
      id: `payout-${p.id}`,
      type: 'payout',
      date: p.paid_at || p.created_date,
      event: getEventTitle(p.event_id),
      amount: p.amount,
      status: p.status,
      isPaid: p.status === 'Disbursed'
    }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const filteredTransactions = filter === 'all' 
    ? allTransactions 
    : allTransactions.filter(t => t.type === filter);

  const statusColors = {
    'Paid': 'bg-green-100 text-green-800 border-green-200',
    'Due': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'Past Due': 'bg-red-100 text-red-800 border-red-200',
    'Disbursed': 'bg-green-100 text-green-800 border-green-200',
    'Approved': 'bg-blue-100 text-blue-800 border-blue-200',
    'Pending Approval': 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Transaction History</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="contribution">Contributions</TabsTrigger>
            <TabsTrigger value="payout">Payouts</TabsTrigger>
          </TabsList>

          <TabsContent value={filter} className="mt-4">
            {filteredTransactions.length > 0 ? (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map(transaction => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm">
                              {format(new Date(transaction.date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {transaction.type === 'contribution' ? (
                              <>
                                <ArrowDownCircle className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium text-blue-700">Contribution</span>
                              </>
                            ) : (
                              <>
                                <ArrowUpCircle className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium text-green-700">Payout</span>
                              </>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{transaction.event}</TableCell>
                        <TableCell className="text-right">
                          <span className={`font-semibold ${transaction.type === 'payout' ? 'text-green-600' : 'text-blue-600'}`}>
                            {transaction.type === 'payout' ? '+' : '-'}${transaction.amount.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant="outline" 
                            className={statusColors[transaction.status] || 'bg-gray-100 text-gray-800'}
                          >
                            {transaction.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {transaction.type === 'contribution' && !transaction.isPaid && (
                            <Button 
                              size="sm" 
                              onClick={() => onPayNow(transaction.contribution)}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Pay Now
                            </Button>
                          )}
                          {transaction.isPaid && (
                            <span className="text-xs text-gray-500">Completed</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No transactions yet</p>
                <p className="text-sm">Your transaction history will appear here</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}