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
import { MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

const statusColors = {
  Active: 'bg-green-100 text-green-800 border-green-200',
  Pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  Suspended: 'bg-orange-100 text-orange-800 border-orange-200',
  Removed: 'bg-red-100 text-red-800 border-red-200',
};

const getEngagementColor = (score) => {
  if (!score) return 'bg-gray-100 text-gray-800';
  if (score >= 70) return 'bg-green-100 text-green-800';
  if (score >= 40) return 'bg-yellow-100 text-yellow-800';
  return 'bg-red-100 text-red-800';
};

export default function MembersTable({ members, onEdit, onDelete, onViewDetails }) {
  const formatLocation = (member) => {
    const parts = [];
    if (member.city) parts.push(member.city);
    if (member.state_province) parts.push(member.state_province);
    if (member.postal_code) parts.push(member.postal_code);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Member #</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Engagement</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Joined</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id} className="hover:bg-gray-50">
              <TableCell className="font-mono text-sm">
                {member.member_number || 'N/A'}
              </TableCell>
              <TableCell className="font-medium">
                {`${member.first_name} ${member.last_name}`}
              </TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell className="text-sm text-gray-600">
                {formatLocation(member)}
              </TableCell>
              <TableCell>
                <Badge 
                  variant="outline" 
                  className={getEngagementColor(member.engagement_score)}
                >
                  {member.engagement_score || 0}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className={statusColors[member.status] || 'bg-gray-100'}>
                  {member.status}
                </Badge>
              </TableCell>
              <TableCell className="text-sm">
                {member.joined_at ? format(new Date(member.joined_at), 'MMM d, yyyy') : 'N/A'}
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
                    {onViewDetails && (
                      <DropdownMenuItem onClick={() => onViewDetails(member)}>
                        <Eye className="mr-2 h-4 w-4" />
                        <span>View Details</span>
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => onEdit(member)}>
                      <Edit className="mr-2 h-4 w-4" />
                      <span>Edit</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => onDelete(member.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      <span>Delete</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
           {members.length === 0 && (
            <TableRow>
              <TableCell colSpan="8" className="h-24 text-center">
                No members found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}