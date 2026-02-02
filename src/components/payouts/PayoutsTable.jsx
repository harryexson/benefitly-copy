import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreHorizontal, Edit, CheckCircle, XCircle, RefreshCw, AlertCircle, Zap, Clock } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors = {
  'Pending Approval': 'border-yellow-500 text-yellow-700 bg-yellow-50',
  'Approved': 'border-blue-500 text-blue-700 bg-blue-50',
  'Disbursed': 'border-green-500 text-green-700 bg-green-50',
  'Failed': 'border-red-500 text-red-700 bg-red-50',
  'Reversed': 'border-gray-500 text-gray-700 bg-gray-50',
};

export default function PayoutsTable({ 
  payouts, 
  members, 
  events, 
  onEdit, 
  onApprove, 
  onReject,
  onRetry,
  selectedPayouts = [],
  onSelectionChange,
  isLoading 
}) {
  const getMemberName = (memberId) => {
    const member = members.find(m => m.id === memberId);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown Member';
  };

  const getEventTitle = (eventId) => {
    const event = events.find(e => e.id === eventId);
    return event ? event.title : 'Unknown Event';
  };

  const handleToggleSelect = (payoutId) => {
    if (!onSelectionChange) return;
    
    if (selectedPayouts.includes(payoutId)) {
      onSelectionChange(selectedPayouts.filter(id => id !== payoutId));
    } else {
      onSelectionChange([...selectedPayouts, payoutId]);
    }
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    
    if (selectedPayouts.length === payouts.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(payouts.map(p => p.id));
    }
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            {onSelectionChange && (
              <TableHead className="w-12">
                <Checkbox
                  checked={payouts.length > 0 && selectedPayouts.length === payouts.length}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
            )}
            <TableHead>Member</TableHead>
            <TableHead>Event</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Speed</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Paid Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <TableRow key={index}>
                {onSelectionChange && <TableCell><Skeleton className="h-5 w-5" /></TableCell>}
                <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-8" /></TableCell>
              </TableRow>
            ))
          ) : payouts.length > 0 ? (
            payouts.map((payout) => (
              <TableRow key={payout.id} className="hover:bg-gray-50">
                {onSelectionChange && (
                  <TableCell>
                    <Checkbox
                      checked={selectedPayouts.includes(payout.id)}
                      onCheckedChange={() => handleToggleSelect(payout.id)}
                    />
                  </TableCell>
                )}
                <TableCell className="font-medium">
                  {getMemberName(payout.payee_member_id)}
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {getEventTitle(payout.event_id)}
                </TableCell>
                <TableCell className="font-semibold">
                  ${payout.amount.toFixed(2)}
                </TableCell>
                <TableCell>
                  {payout.payout_speed === 'instant' ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
                            <Zap className="h-3 w-3 mr-1" />
                            Instant
                          </Badge>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>30 min delivery • 1.5% fee</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <Badge variant="outline" className="border-gray-400 text-gray-600">
                      <Clock className="h-3 w-3 mr-1" />
                      Standard
                    </Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={statusColors[payout.status] || ''}>
                      {payout.status}
                    </Badge>
                    {payout.status === 'Failed' && payout.stripe_error_code && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <AlertCircle className="h-4 w-4 text-red-500 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">Error: {payout.stripe_error_code}</p>
                              {payout.stripe_error_message && (
                                <p className="text-sm">{payout.stripe_error_message}</p>
                              )}
                              {payout.retry_count > 0 && (
                                <p className="text-xs text-gray-500">Retried {payout.retry_count} time(s)</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(payout.created_date), 'MMM d, yyyy')}
                </TableCell>
                <TableCell className="text-sm">
                  {payout.paid_at ? format(new Date(payout.paid_at), 'MMM d, yyyy') : '-'}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {payout.status === 'Pending Approval' && (
                        <>
                          <DropdownMenuItem onClick={() => onApprove(payout.id)}>
                            <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                            <span>Approve</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onReject(payout.id)}>
                            <XCircle className="mr-2 h-4 w-4 text-red-600" />
                            <span>Reject</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      {payout.status === 'Failed' && onRetry && (
                        <DropdownMenuItem onClick={() => onRetry(payout.id)} className="text-blue-600">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          <span>Retry Payout</span>
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onEdit(payout)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={onSelectionChange ? 9 : 8} className="h-24 text-center">
                No payouts found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}