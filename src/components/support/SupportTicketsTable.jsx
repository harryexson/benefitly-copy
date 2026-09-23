import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  in_progress: 'bg-yellow-100 text-yellow-800',
  waiting_customer: 'bg-orange-100 text-orange-800',
  resolved: 'bg-green-100 text-green-800',
  closed: 'bg-gray-100 text-gray-800',
};

const priorityColors = {
    low: 'bg-gray-100 text-gray-800',
    medium: 'bg-blue-100 text-blue-800',
    high: 'bg-yellow-100 text-yellow-800',
    urgent: 'bg-red-100 text-red-800',
}

export default function SupportTicketsTable({ tickets, accounts, onEdit, isLoading }) {
    const getAccountName = (accountId) => {
        const account = accounts.find(a => a.id === accountId);
        return account ? account.organization_name : 'N/A';
    }

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4 space-y-3">
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-full" />
        <Skeleton className="h-6 w-3/4" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Ticket #</TableHead>
            <TableHead>Subject</TableHead>
            <TableHead>Account</TableHead>
            <TableHead>Priority</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tickets.map((ticket) => (
            <TableRow key={ticket.id}>
              <TableCell className="font-mono text-sm">{ticket.ticket_number}</TableCell>
              <TableCell className="font-medium">{ticket.subject}</TableCell>
              <TableCell>{getAccountName(ticket.association_account_id)}</TableCell>
              <TableCell>
                <Badge variant="outline" className={priorityColors[ticket.priority]}>{ticket.priority}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColors[ticket.status]}>{ticket.status}</Badge>
              </TableCell>
              <TableCell>{format(new Date(ticket.created_date), 'MMM d, yyyy')}</TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(ticket)}>
                      <Edit className="mr-2 h-4 w-4" />
                      View/Edit
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {tickets.length === 0 && (
            <TableRow>
              <TableCell colSpan="7" className="h-24 text-center">
                No tickets found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}