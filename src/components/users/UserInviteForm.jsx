import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Loader2, UserPlus, Shield } from 'lucide-react';
import { Member, Role } from '@/entities/all';

export default function UserInviteForm({ isOpen, onClose, onSuccess }) {
  const [isLoading, setIsLoading] = useState(false);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [selectedRoles, setSelectedRoles] = useState([]);
  const [formData, setFormData] = useState({
    email: '',
    role: 'Member',
    member_id: null
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      const [membersList, rolesList] = await Promise.all([
        Member.list(),
        Role.list('name')
      ]);
      setMembers(membersList);
      setRoles(rolesList);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const toggleRole = (roleId) => {
    setSelectedRoles(prev => 
      prev.includes(roleId) 
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await base44.functions.invoke('inviteUser', {
        ...formData,
        role_ids: selectedRoles
      });
      
      if (response.data.success) {
        toast.success('User invitation sent successfully!');
        onSuccess();
        onClose();
        setFormData({
          email: '',
          role: 'Member',
          member_id: null
        });
        setSelectedRoles([]);
      } else {
        toast.error(response.data.error || 'Failed to send invitation');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New User
          </DialogTitle>
          <DialogDescription>
            Send an invitation to add a new user to your association
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <Label>Email Address *</Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="user@example.com"
                required
              />
            </div>

            <div>
              <Label>Base Role *</Label>
              <Select value={formData.role} onValueChange={(val) => setFormData({ ...formData, role: val })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Administrator">Administrator</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="Member">Member</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Base access level - you can assign additional custom roles below
              </p>
            </div>

            <div>
              <Label>Link to Member Profile (Optional)</Label>
              <Select 
                value={formData.member_id || 'none'} 
                onValueChange={(val) => setFormData({ ...formData, member_id: val === 'none' ? null : val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a member to link" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No member link</SelectItem>
                  {members.map(member => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.first_name} {member.last_name} ({member.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Link this user to an existing member profile for portal access
              </p>
            </div>
          </div>

          {/* Custom Roles */}
          {roles.length > 0 && (
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Additional Custom Roles (Optional)
              </Label>
              <p className="text-sm text-gray-500">
                Assign custom roles with specific permissions for this user
              </p>
              <ScrollArea className="h-64 border rounded-lg p-4">
                <div className="space-y-2">
                  {roles.map(role => (
                    <div key={role.id} className="flex items-start space-x-3 p-2 hover:bg-gray-50 rounded">
                      <Checkbox
                        id={role.id}
                        checked={selectedRoles.includes(role.id)}
                        onCheckedChange={() => toggleRole(role.id)}
                      />
                      <div className="flex-1">
                        <Label htmlFor={role.id} className="flex items-center gap-2 cursor-pointer font-normal">
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: role.color }}
                          />
                          <span>{role.name}</span>
                          {role.is_system_role && (
                            <Badge variant="outline" className="text-xs">System</Badge>
                          )}
                        </Label>
                        {role.description && (
                          <p className="text-xs text-gray-500 mt-1">{role.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Send Invitation
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}