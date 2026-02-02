
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
import { MoreHorizontal, Edit, Trash2, Ban, CheckCircle, AlertTriangle, FileText } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';

const statusColors = {
  active: 'bg-green-100 text-green-800 border-green-200',
  trial: 'bg-blue-100 text-blue-800 border-blue-200',
  suspended: 'bg-red-100 text-red-800 border-red-200',
  cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
};

export default function ClientAccountsTable({ 
  accounts, 
  tiers, 
  onEdit, 
  onSuspend, 
  onReactivate, 
  onDelete, 
  onManageEnterprise, // New prop
  isLoading 
}) {
  if (isLoading) {
    return (
      <div className="border rounded-lg p-8 text-center">
        <p>Loading accounts...</p>
      </div>
    );
  }

  const getTierName = (tierId) => {
    const tier = tiers.find(t => t.id === tierId);
    return tier?.name || 'Unknown';
  };

  const isOverdue = (account) => {
    if (!account.next_billing_date) return false;
    const billingDate = new Date(account.next_billing_date);
    const today = new Date();
    return billingDate < today && (account.account_status === 'active' || account.account_status === 'trial');
  };

  const getDaysOverdue = (account) => {
    if (!isOverdue(account)) return 0;
    const billingDate = new Date(account.next_billing_date);
    const today = new Date();
    return Math.floor((today - billingDate) / (1000 * 60 * 60 * 24));
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Organization</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Tier</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Members</TableHead>
            <TableHead>Next Billing</TableHead>
            <TableHead>Revenue</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accounts.map((account) => {
            const overdue = isOverdue(account);
            const daysOverdue = getDaysOverdue(account);
            
            return (
              <TableRow key={account.id} className={overdue ? "bg-red-50" : ""}>
                <TableCell className="font-medium">
                  <div>
                    <div className="font-medium">{account.organization_name}</div>
                    <div className="text-sm text-gray-500">{account.point_of_contact_name}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div>
                    <div className="text-sm">{account.contact_email}</div>
                    <div className="text-xs text-gray-500">{account.contact_phone}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {getTierName(account.subscription_tier_id)}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge 
                      variant="outline" 
                      className={statusColors[account.account_status] || 'bg-gray-100'}
                    >
                      {account.account_status}
                    </Badge>
                    {overdue && (
                      <Badge variant="outline" className="bg-red-100 text-red-800 text-xs">
                        {daysOverdue} days overdue
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {account.current_member_count || 0}
                </TableCell>
                <TableCell>
                  {account.next_billing_date ? (
                    <div className={overdue ? "text-red-600 font-medium" : ""}>
                      {format(new Date(account.next_billing_date), 'MMM d, yyyy')}
                      {overdue && (
                        <div className="text-xs">
                          <AlertTriangle className="h-3 w-3 inline mr-1" />
                          Overdue
                        </div>
                      )}
                    </div>
                  ) : 'N/A'}
                </TableCell>
                <TableCell>
                  ${(account.total_revenue || 0).toLocaleString()}
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
                      <DropdownMenuItem onClick={() => onEdit(account)}>
                        <Edit className="mr-2 h-4 w-4" />
                        <span>Edit Account</span>
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onManageEnterprise(account)}>
                        <FileText className="mr-2 h-4 w-4" />
                        <span>Manage Enterprise Contract</span>
                      </DropdownMenuItem>
                      
                      <DropdownMenuSeparator />
                      
                      {account.account_status === 'suspended' ? (
                        <DropdownMenuItem onClick={() => onReactivate(account.id)}>
                          <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                          <span>Reactivate Account</span>
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem onClick={() => onSuspend(account)}>
                          <Ban className="mr-2 h-4 w-4 text-orange-600" />
                          <span>Suspend Account</span>
                        </DropdownMenuItem>
                      )}
                      
                      <DropdownMenuSeparator />
                      
                      <DropdownMenuItem 
                        className="text-red-600 focus:bg-red-50 focus:text-red-700" 
                        onClick={() => onDelete(account.id, account.organization_name)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        <span>Delete Account</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            );
          })}
          {accounts.length === 0 && (
            <TableRow>
              <TableCell colSpan="8" className="h-24 text-center">
                No accounts found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
