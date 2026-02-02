
import React from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, ToggleLeft, ToggleRight, Users, Trash2 } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

export default function SubscriptionTiersTable({ tiers, onEdit, onToggleActive, onDelete, isLoading }) {
  if (isLoading) {
    return (
      <div className="border rounded-lg p-4 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  const calculateSavings = (monthly, yearly) => {
    return (monthly * 12) - yearly;
  };

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tier Name</TableHead>
            <TableHead>Member Limit</TableHead>
            <TableHead>Monthly Price</TableHead>
            <TableHead>Yearly Price</TableHead>
            <TableHead>Yearly Savings</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Features</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tiers.map((tier) => (
            <TableRow key={tier.id}>
              <TableCell className="font-medium">{tier.name}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-gray-400" />
                  {tier.member_limit === 99999 ? 'Unlimited' : tier.member_limit.toLocaleString()}
                </div>
              </TableCell>
              <TableCell>
                <span className="font-semibold text-green-600">${tier.monthly_price}</span>
              </TableCell>
              <TableCell>
                <span className="font-semibold text-blue-600">${tier.yearly_price}</span>
              </TableCell>
              <TableCell>
                <span className="font-semibold text-orange-600">
                  ${calculateSavings(tier.monthly_price, tier.yearly_price)}
                </span>
              </TableCell>
              <TableCell>
                <Badge variant={tier.is_active ? 'default' : 'secondary'}>
                  {tier.is_active ? 'Active' : 'Inactive'}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="max-w-xs">
                  <span className="text-sm text-gray-600">
                    {tier.features?.length || 0} features
                  </span>
                </div>
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(tier)}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onToggleActive(tier.id, tier.is_active)}
                      className={tier.is_active ? "text-red-600" : "text-green-600"}
                    >
                      {tier.is_active ? (
                        <>
                          <ToggleLeft className="mr-2 h-4 w-4" />
                          Deactivate
                        </>
                      ) : (
                        <>
                          <ToggleRight className="mr-2 h-4 w-4" />
                          Activate
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onDelete(tier.id)} className="text-red-600">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
          {tiers.length === 0 && (
            <TableRow>
              <TableCell colSpan="8" className="h-24 text-center">
                No subscription tiers found.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
