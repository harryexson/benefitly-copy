import React, { useState, useEffect } from 'react';
import { Role } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Edit, Trash2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function RoleManagement({ user }) {
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#6B7280',
    priority: 0,
    permissions: {
      members: { view: false, create: false, edit: false, delete: false, approve: false },
      events: { view: false, create: false, edit: false, delete: false, publish: false },
      financials: { view: false, view_reports: false, manage_contributions: false, approve_payouts: false, manage_expenses: false },
      reports: { view: false, generate: false, customize: false, schedule: false, distribute: false },
      community: { view: true, post_discussions: true, create_announcements: false, moderate: false },
      users: { view: false, invite: false, manage_roles: false, delete: false },
      settings: { view: false, edit_organization: false, manage_integrations: false, manage_billing: false }
    }
  });

  const isAdmin = user?.association_role === 'Administrator';

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setIsLoading(true);
      const roleList = await Role.list('name');
      setRoles(roleList);
    } catch (error) {
      console.error('Failed to load roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Role name is required');
      return;
    }

    try {
      if (editingRole) {
        await Role.update(editingRole.id, formData);
        toast.success('Role updated successfully');
      } else {
        await Role.create(formData);
        toast.success('Role created successfully');
      }
      setIsDialogOpen(false);
      setEditingRole(null);
      resetForm();
      loadRoles();
    } catch (error) {
      console.error('Failed to save role:', error);
      toast.error('Failed to save role');
    }
  };

  const handleDelete = async (role) => {
    if (role.is_system_role) {
      toast.error('Cannot delete system roles');
      return;
    }

    if (!confirm(`Delete role "${role.name}"? All users with this role will lose its permissions.`)) {
      return;
    }

    try {
      await Role.delete(role.id);
      toast.success('Role deleted');
      loadRoles();
    } catch (error) {
      console.error('Failed to delete role:', error);
      toast.error('Failed to delete role');
    }
  };

  const handleEdit = (role) => {
    setEditingRole(role);
    setFormData({
      name: role.name,
      description: role.description || '',
      color: role.color || '#6B7280',
      priority: role.priority || 0,
      permissions: role.permissions || formData.permissions
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      color: '#6B7280',
      priority: 0,
      permissions: {
        members: { view: false, create: false, edit: false, delete: false, approve: false },
        events: { view: false, create: false, edit: false, delete: false, publish: false },
        financials: { view: false, view_reports: false, manage_contributions: false, approve_payouts: false, manage_expenses: false },
        reports: { view: false, generate: false, customize: false, schedule: false, distribute: false },
        community: { view: true, post_discussions: true, create_announcements: false, moderate: false },
        users: { view: false, invite: false, manage_roles: false, delete: false },
        settings: { view: false, edit_organization: false, manage_integrations: false, manage_billing: false }
      }
    });
  };

  const updatePermission = (category, permission, value) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [category]: {
          ...formData.permissions[category],
          [permission]: value
        }
      }
    });
  };

  const permissionCategories = [
    {
      key: 'members',
      label: 'Members',
      permissions: [
        { key: 'view', label: 'View members' },
        { key: 'create', label: 'Add new members' },
        { key: 'edit', label: 'Edit member details' },
        { key: 'delete', label: 'Delete members' },
        { key: 'approve', label: 'Approve member applications' }
      ]
    },
    {
      key: 'events',
      label: 'Events',
      permissions: [
        { key: 'view', label: 'View events' },
        { key: 'create', label: 'Create events' },
        { key: 'edit', label: 'Edit events' },
        { key: 'delete', label: 'Delete events' },
        { key: 'publish', label: 'Publish events' }
      ]
    },
    {
      key: 'financials',
      label: 'Financials',
      permissions: [
        { key: 'view', label: 'View financial data' },
        { key: 'view_reports', label: 'View financial reports' },
        { key: 'manage_contributions', label: 'Manage contributions' },
        { key: 'approve_payouts', label: 'Approve payouts' },
        { key: 'manage_expenses', label: 'Manage expenses' }
      ]
    },
    {
      key: 'reports',
      label: 'Reports',
      permissions: [
        { key: 'view', label: 'View reports' },
        { key: 'generate', label: 'Generate reports' },
        { key: 'customize', label: 'Customize reports' },
        { key: 'schedule', label: 'Schedule reports' },
        { key: 'distribute', label: 'Distribute reports' }
      ]
    },
    {
      key: 'community',
      label: 'Community',
      permissions: [
        { key: 'view', label: 'View community' },
        { key: 'post_discussions', label: 'Post discussions' },
        { key: 'create_announcements', label: 'Create announcements' },
        { key: 'moderate', label: 'Moderate content' }
      ]
    },
    {
      key: 'users',
      label: 'User Management',
      permissions: [
        { key: 'view', label: 'View users' },
        { key: 'invite', label: 'Invite users' },
        { key: 'manage_roles', label: 'Manage user roles' },
        { key: 'delete', label: 'Delete users' }
      ]
    },
    {
      key: 'settings',
      label: 'Settings',
      permissions: [
        { key: 'view', label: 'View settings' },
        { key: 'edit_organization', label: 'Edit organization info' },
        { key: 'manage_integrations', label: 'Manage integrations' },
        { key: 'manage_billing', label: 'Manage billing' }
      ]
    }
  ];

  if (!isAdmin) {
    return (
      <div className="max-w-6xl mx-auto">
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">You don't have permission to manage roles</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Role Management</h2>
          <p className="text-gray-500">Define custom roles and permissions for your association</p>
        </div>
        <Button onClick={() => {
          resetForm();
          setEditingRole(null);
          setIsDialogOpen(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          Create Role
        </Button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map(role => (
          <Card key={role.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: role.color }}
                  />
                  <CardTitle className="text-lg">{role.name}</CardTitle>
                </div>
                {!role.is_system_role && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(role)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(role)}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
              {role.description && (
                <CardDescription>{role.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {role.is_system_role && (
                <Badge variant="outline" className="mb-2">System Role</Badge>
              )}
              <div className="text-xs text-gray-500">
                Priority: {role.priority || 0}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingRole ? 'Edit Role' : 'Create New Role'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Role Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Treasurer, Secretary"
                />
              </div>
              <div className="space-y-2">
                <Label>Priority</Label>
                <Input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 0 })}
                  placeholder="0"
                />
                <p className="text-xs text-gray-500">Higher priority takes precedence in permission conflicts</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of this role"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <Input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="w-24 h-10"
              />
            </div>

            <div className="space-y-4">
              <Label className="text-lg">Permissions</Label>
              <Tabs defaultValue={permissionCategories[0].key}>
                <TabsList className="grid grid-cols-4 lg:grid-cols-7">
                  {permissionCategories.map(cat => (
                    <TabsTrigger key={cat.key} value={cat.key}>{cat.label}</TabsTrigger>
                  ))}
                </TabsList>
                {permissionCategories.map(category => (
                  <TabsContent key={category.key} value={category.key} className="space-y-3">
                    {category.permissions.map(perm => (
                      <div key={perm.key} className="flex items-center justify-between">
                        <Label className="text-sm font-normal">{perm.label}</Label>
                        <Switch
                          checked={formData.permissions[category.key]?.[perm.key] || false}
                          onCheckedChange={(checked) => updatePermission(category.key, perm.key, checked)}
                        />
                      </div>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>
              {editingRole ? 'Update Role' : 'Create Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}