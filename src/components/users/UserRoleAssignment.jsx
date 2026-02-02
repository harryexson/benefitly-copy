import React, { useState, useEffect } from 'react';
import { Role, UserRole } from '@/entities/all';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function UserRoleAssignment({ isOpen, onClose, userId, currentUser }) {
  const [roles, setRoles] = useState([]);
  const [userRoles, setUserRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadData();
    }
  }, [isOpen, userId]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [roleList, userRoleList] = await Promise.all([
        Role.list('name'),
        UserRole.filter({ user_id: userId, is_active: true })
      ]);
      
      setRoles(roleList);
      setUserRoles(userRoleList);
      setSelectedRoles(userRoleList.map(ur => ur.role_id));
    } catch (error) {
      console.error('Failed to load roles:', error);
      toast.error('Failed to load roles');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Remove roles that are no longer selected
      const rolesToRemove = userRoles.filter(ur => !selectedRoles.includes(ur.role_id));
      for (const ur of rolesToRemove) {
        await UserRole.delete(ur.id);
      }

      // Add new roles
      const existingRoleIds = userRoles.map(ur => ur.role_id);
      const rolesToAdd = selectedRoles.filter(roleId => !existingRoleIds.includes(roleId));
      
      for (const roleId of rolesToAdd) {
        await UserRole.create({
          user_id: userId,
          role_id: roleId,
          assigned_by: currentUser.id,
          assigned_at: new Date().toISOString(),
          is_active: true
        });
      }

      toast.success('Roles updated successfully');
      onClose();
    } catch (error) {
      console.error('Failed to save roles:', error);
      toast.error('Failed to save roles');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleRole = (roleId) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Assign Roles
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] pr-4">
          <div className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading roles...</p>
            ) : roles.length === 0 ? (
              <p className="text-sm text-gray-500">No roles available. Create roles first.</p>
            ) : (
              roles.map(role => (
                <div key={role.id} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                  <Checkbox
                    id={role.id}
                    checked={selectedRoles.includes(role.id)}
                    onCheckedChange={() => toggleRole(role.id)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={role.id} className="flex items-center gap-2 cursor-pointer">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: role.color }}
                      />
                      <span className="font-medium">{role.name}</span>
                      {role.is_system_role && (
                        <Badge variant="outline" className="text-xs">System</Badge>
                      )}
                    </Label>
                    {role.description && (
                      <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Roles'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}