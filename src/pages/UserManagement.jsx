import React, { useState, useEffect } from 'react';
import { User, BackOfficeUser } from '@/entities/all';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { toast } from 'sonner';
import BackOfficeUserForm from '../components/backoffice/BackOfficeUserForm';

export default function UserManagement() {
  const [platformUsers, setPlatformUsers] = useState([]);
  const [backOfficeUsers, setBackOfficeUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [pUsers, boUsers] = await Promise.all([
        User.list(),
        BackOfficeUser.list()
      ]);
      setPlatformUsers(pUsers);
      setBackOfficeUsers(boUsers);
    } catch (error) {
      if (error.name === 'CanceledError' || (error.message && error.message.includes('aborted'))) {
        console.log('Data fetch aborted.');
      } else {
        toast.error('Failed to load users.');
        console.error(error);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSave = () => {
    setIsFormOpen(false);
    loadData();
  };

  const getPlatformUser = (userId) => {
    return platformUsers.find(u => u.id === userId);
  };

  const handleDelete = async (boUserId) => {
    if (confirm('Are you sure you want to delete this Back Office user? This cannot be undone.')) {
      try {
        await BackOfficeUser.delete(boUserId);
        toast.success('User deleted successfully.');
        loadData();
      } catch (error) {
        toast.error('Failed to delete user.');
        console.error(error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Platform Users</CardTitle>
          <CardDescription>
            List of all users with an account on the Benevolent platform. Roles are managed here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Placeholder for platform user management table */}
          <p className="text-sm text-gray-500">Platform user role management table coming soon...</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Back Office Credentials</CardTitle>
            <CardDescription>
              Manage username/password credentials for accessing the Back Office.
            </CardDescription>
          </div>
          <Button onClick={() => setIsFormOpen(true)}>
            <PlusCircle className="w-4 h-4 mr-2" />
            Create Credential
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Username</TableHead>
                <TableHead>Platform Account</TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan="4" className="text-center">Loading...</TableCell></TableRow>
              ) : backOfficeUsers.length > 0 ? (
                backOfficeUsers.map(boUser => {
                  const platformUser = getPlatformUser(boUser.user_id);
                  return (
                    <TableRow key={boUser.id}>
                      <TableCell className="font-medium">{boUser.username}</TableCell>
                      <TableCell>{platformUser?.full_name || 'N/A'} ({platformUser?.email || 'N/A'})</TableCell>
                      <TableCell>{platformUser?.back_office_role || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(boUser.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow><TableCell colSpan="4" className="text-center h-24">No Back Office credentials found. Click "Create Credential" to add the first one.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Back Office Credential</DialogTitle>
            <DialogDescription>
              Assign a username and password to a user with a Back Office role.
            </DialogDescription>
          </DialogHeader>
          <BackOfficeUserForm 
            users={platformUsers}
            onSave={handleSave}
            onCancel={() => setIsFormOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}