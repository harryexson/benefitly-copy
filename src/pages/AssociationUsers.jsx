import React, { useState, useEffect } from 'react';
import { User } from '@/entities/User';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { UserPlus, Shield, Mail, Trash2, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import UserInviteForm from '../components/users/UserInviteForm';
import UserRoleAssignment from '../components/users/UserRoleAssignment';
import { base44 } from '@/api/base44Client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function AssociationUsers() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [isRoleAssignmentOpen, setIsRoleAssignmentOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const me = await User.me();
      setCurrentUser(me);

      // Load all users in this association
      if (me.association_account_id) {
        const allUsers = await base44.asServiceRole.entities.User.filter({
          association_account_id: me.association_account_id
        });
        setUsers(allUsers);
      }
    } catch(e) {
      toast.error("Could not load user data.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    try {
      await base44.asServiceRole.entities.User.delete(userToDelete.id);
      toast.success('User removed successfully');
      setUserToDelete(null);
      loadData();
    } catch (error) {
      toast.error('Failed to remove user');
    }
  };

  const handleResendInvitation = async (user) => {
    try {
      await base44.functions.invoke('inviteUser', {
        email: user.email,
        role: user.association_role,
        permissions: user.permissions,
        member_id: user.member_id
      });
      toast.success('Invitation resent successfully');
    } catch (error) {
      toast.error('Failed to resend invitation');
    }
  };

  const getInitials = (name, email) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email[0].toUpperCase();
  };

  const roleColors = {
    'Administrator': 'bg-purple-100 text-purple-800',
    'Manager': 'bg-blue-100 text-blue-800',
    'Member': 'bg-green-100 text-green-800'
  };

  const statusColors = {
    'Pending': 'bg-yellow-100 text-yellow-800',
    'Accepted': 'bg-green-100 text-green-800',
    'Declined': 'bg-red-100 text-red-800'
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">User Management</h2>
          <p className="text-gray-500">Manage roles and permissions for users in your association</p>
        </div>
        <Button onClick={() => setShowInviteForm(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* User Stats */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{users.length}</p>
              <p className="text-sm text-gray-500">Total Users</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{users.filter(u => u.association_role === 'Administrator').length}</p>
              <p className="text-sm text-gray-500">Administrators</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{users.filter(u => u.association_role === 'Manager').length}</p>
              <p className="text-sm text-gray-500">Managers</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-3xl font-bold">{users.filter(u => u.invitation_status === 'Pending').length}</p>
              <p className="text-sm text-gray-500">Pending Invites</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Association Users
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invited</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    No users found. Click "Invite User" to add members to your association.
                  </TableCell>
                </TableRow>
              ) : (
                users.map(user => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.profile_picture_url} />
                          <AvatarFallback>
                            {getInitials(user.full_name, user.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium">{user.full_name || user.email}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={roleColors[user.association_role] || 'bg-gray-100 text-gray-800'}>
                        {user.association_role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColors[user.invitation_status] || 'bg-gray-100 text-gray-800'}>
                        {user.invitation_status || 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.invited_at ? (
                        <span className="text-sm text-gray-600">
                          {format(new Date(user.invited_at), 'MMM d, yyyy')}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedUserId(user.id);
                            setIsRoleAssignmentOpen(true);
                          }}>
                            <Shield className="mr-2 h-4 w-4" />
                            Manage Roles
                          </DropdownMenuItem>
                          {user.invitation_status === 'Pending' && (
                            <DropdownMenuItem onClick={() => handleResendInvitation(user)}>
                              <Mail className="mr-2 h-4 w-4" />
                              Resend Invitation
                            </DropdownMenuItem>
                          )}
                          {user.id !== currentUser?.id && (
                            <DropdownMenuItem 
                              onClick={() => setUserToDelete(user)}
                              className="text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Remove User
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invite Form */}
      <UserInviteForm
        isOpen={showInviteForm}
        onClose={() => setShowInviteForm(false)}
        onSuccess={() => {
          loadData();
          setShowInviteForm(false);
        }}
      />

      {/* Role Assignment */}
      <UserRoleAssignment
        isOpen={isRoleAssignmentOpen}
        onClose={() => {
          setIsRoleAssignmentOpen(false);
          setSelectedUserId(null);
        }}
        userId={selectedUserId}
        currentUser={currentUser}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!userToDelete} onOpenChange={() => setUserToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {userToDelete?.full_name || userToDelete?.email} from your association?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-red-600 hover:bg-red-700">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}