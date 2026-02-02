import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { User } from '@/entities/all';
import { Users, Shield, Mail, Calendar, Plus, Edit } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

export default function StaffManagement() {
  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    back_office_role: 'None'
  });

  useEffect(() => {
    loadStaff();
  }, []);

  const loadStaff = async () => {
    try {
      const users = await User.list();
      const backOfficeStaff = users.filter(u => u.back_office_role && u.back_office_role !== 'None');
      setStaff(backOfficeStaff);
    } catch (error) {
      console.error('Failed to load staff:', error);
      toast.error('Failed to load staff');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingStaff) {
        await User.update(editingStaff.id, {
          back_office_role: formData.back_office_role
        });
        toast.success('Staff member updated');
      } else {
        // In a real app, you'd invite the user via email
        toast.info('User invitation feature coming soon');
      }
      setIsDialogOpen(false);
      loadStaff();
    } catch (error) {
      console.error('Failed to save staff:', error);
      toast.error('Failed to save staff member');
    }
  };

  const roleColors = {
    'Super Admin': 'bg-purple-100 text-purple-800',
    'Billing': 'bg-green-100 text-green-800',
    'Customer Support': 'bg-blue-100 text-blue-800',
    'Marketing': 'bg-orange-100 text-orange-800',
    'Developer': 'bg-gray-800 text-white'
  };

  const rolePermissions = {
    'Super Admin': ['Full system access', 'User management', 'All modules'],
    'Billing': ['Subscription management', 'Payment processing', 'Financial reports'],
    'Customer Support': ['Support tickets', 'Customer communication', 'Basic account access'],
    'Marketing': ['Campaign management', 'Analytics', 'Market research'],
    'Developer': ['System settings', 'API access', 'Technical configuration']
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Staff & Team Management</CardTitle>
              <CardDescription>Manage back office staff roles and permissions</CardDescription>
            </div>
            <Button onClick={() => {
              setEditingStaff(null);
              setFormData({ email: '', full_name: '', back_office_role: 'None' });
              setIsDialogOpen(true);
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Staff Member
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{staff.length}</p>
                      <p className="text-sm text-gray-500">Total Staff</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Shield className="h-8 w-8 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {staff.filter(s => s.back_office_role === 'Super Admin').length}
                      </p>
                      <p className="text-sm text-gray-500">Super Admins</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Mail className="h-8 w-8 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {staff.filter(s => s.back_office_role === 'Customer Support').length}
                      </p>
                      <p className="text-sm text-gray-500">Support Team</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-8 w-8 text-orange-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {staff.filter(s => {
                          const created = new Date(s.created_date);
                          const thirtyDaysAgo = new Date();
                          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                          return created > thirtyDaysAgo;
                        }).length}
                      </p>
                      <p className="text-sm text-gray-500">New (30d)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Staff List */}
            <div className="space-y-2">
              {staff.map(member => (
                <Card key={member.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
                          {member.full_name?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-lg">{member.full_name}</h4>
                          <p className="text-sm text-gray-500">{member.email}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={roleColors[member.back_office_role] || 'bg-gray-100 text-gray-800'}>
                              {member.back_office_role}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              Joined {format(new Date(member.created_date), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingStaff(member);
                            setFormData({
                              email: member.email,
                              full_name: member.full_name,
                              back_office_role: member.back_office_role
                            });
                            setIsDialogOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Edit Role
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Role Descriptions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Role Permissions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(rolePermissions).map(([role, permissions]) => (
                    <div key={role} className="p-4 border rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={roleColors[role]}>{role}</Badge>
                      </div>
                      <ul className="space-y-1 text-sm text-gray-600">
                        {permissions.map((perm, i) => (
                          <li key={i}>• {perm}</li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                disabled={!!editingStaff}
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={!!editingStaff}
              />
            </div>

            <div className="space-y-2">
              <Label>Back Office Role</Label>
              <Select
                value={formData.back_office_role}
                onValueChange={(value) => setFormData({ ...formData, back_office_role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="None">None</SelectItem>
                  <SelectItem value="Super Admin">Super Admin</SelectItem>
                  <SelectItem value="Billing">Billing</SelectItem>
                  <SelectItem value="Customer Support">Customer Support</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Developer">Developer</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingStaff ? 'Update' : 'Add'} Staff Member
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}