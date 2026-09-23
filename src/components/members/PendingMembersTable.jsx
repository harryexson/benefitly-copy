import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { CheckCircle, XCircle, Edit, Calendar } from 'lucide-react';
import { format } from 'date-fns';

export default function PendingMembersTable({ 
  members, 
  selectedMembers, 
  onSelectionChange, 
  onApprove, 
  onReject, 
  onEdit 
}) {
  const handleSelectAll = (checked) => {
    if (checked) {
      onSelectionChange(members.map(m => m.id));
    } else {
      onSelectionChange([]);
    }
  };

  const handleSelectMember = (memberId, checked) => {
    if (checked) {
      onSelectionChange([...selectedMembers, memberId]);
    } else {
      onSelectionChange(selectedMembers.filter(id => id !== memberId));
    }
  };

  const formatLocation = (member) => {
    const parts = [];
    if (member.city) parts.push(member.city);
    if (member.state_province) parts.push(member.state_province);
    return parts.length > 0 ? parts.join(', ') : 'N/A';
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={members.length > 0 && selectedMembers.length === members.length}
                onCheckedChange={handleSelectAll}
                indeterminate={selectedMembers.length > 0 && selectedMembers.length < members.length}
              />
            </TableHead>
            <TableHead>Applicant Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>Applied Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id} className="hover:bg-gray-50">
              <TableCell>
                <Checkbox
                  checked={selectedMembers.includes(member.id)}
                  onCheckedChange={(checked) => handleSelectMember(member.id, checked)}
                />
              </TableCell>
              <TableCell className="font-medium">
                <div>
                  <div>{`${member.first_name} ${member.last_name}`}</div>
                  <div className="text-sm text-gray-500">{member.phone || 'No phone'}</div>
                </div>
              </TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell className="text-sm text-gray-600">
                {formatLocation(member)}
              </TableCell>
              <TableCell className="text-sm">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-gray-400" />
                  {member.created_date ? format(new Date(member.created_date), 'MMM d, yyyy') : 'N/A'}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(member)}
                    className="h-8"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onApprove(member.id)}
                    className="h-8 bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onReject(member.id)}
                    className="h-8"
                  >
                    <XCircle className="w-3 h-3 mr-1" />
                    Reject
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
          {members.length === 0 && (
            <TableRow>
              <TableCell colSpan="6" className="h-24 text-center text-gray-500">
                <div className="flex flex-col items-center">
                  <CheckCircle className="w-8 h-8 text-green-500 mb-2" />
                  <div className="font-medium">No pending applications</div>
                  <div className="text-sm">All member applications have been processed.</div>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}