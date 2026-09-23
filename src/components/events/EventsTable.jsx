
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Eye, DollarSign } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

const statusColors = {
  Draft: 'bg-gray-100 text-gray-800',
  Announced: 'bg-blue-100 text-blue-800',
  Collecting: 'bg-yellow-100 text-yellow-800',
  Closed: 'bg-orange-100 text-orange-800',
  Paid: 'bg-green-100 text-green-800',
  Canceled: 'bg-red-100 text-red-800',
};

const typeColors = {
  Death: 'bg-purple-100 text-purple-800',
  Hospitalization: 'bg-orange-100 text-orange-800',
  'Loss of Loved One': 'bg-blue-100 text-blue-800',
  Other: 'bg-gray-100 text-gray-800',
};

export default function EventsTable({ events, members, onEdit, onView, onCreatePayouts, isLoading }) {
  const getMemberName = (memberId) => {
    const member = members.find(m => m.id === memberId);
    return member ? `${member.first_name} ${member.last_name}` : 'Unknown Member';
  };

  if (isLoading) {
    return (
      <div className="border rounded-lg p-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Title</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Affected Member</TableHead>
            <TableHead>Contribution</TableHead>
            <TableHead>Due Date</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.length > 0 ? (
            events.map((event) => (
              <TableRow key={event.id} className="hover:bg-gray-50">
                <TableCell className="font-medium">{event.title}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={typeColors[event.type]}>
                    {event.type}
                  </Badge>
                </TableCell>
                <TableCell>{getMemberName(event.affected_member_id)}</TableCell>
                <TableCell>${event.contribution_amount}</TableCell>
                <TableCell>
                  {event.contribution_due_date ? format(new Date(event.contribution_due_date), 'MMM d, yyyy') : 'N/A'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[event.status]}>
                    {event.status}
                  </Badge>
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
                      <DropdownMenuItem onClick={() => onView(event)}>
                        <Eye className="mr-2 h-4 w-4" />
                        <span>View Details</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onEdit(event)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit</span>
                      </DropdownMenuItem>
                      {(event.status === 'Closed' || event.status === 'Collecting') && onCreatePayouts && (
                        <DropdownMenuItem onClick={() => onCreatePayouts(event)}>
                          <DollarSign className="mr-2 h-4 w-4" />
                          <span>Create Payouts</span>
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan="7" className="h-24 text-center">
                No events found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
