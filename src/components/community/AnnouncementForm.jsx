import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell } from 'lucide-react';

export default function AnnouncementForm({ 
  isOpen, 
  onClose, 
  onSave, 
  announcement = null,
  isSaving = false
}) {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'normal',
    is_pinned: false,
    is_published: true,
    expires_at: '',
    send_email_notification: false
  });

  useEffect(() => {
    if (announcement) {
      setFormData({
        title: announcement.title || '',
        content: announcement.content || '',
        priority: announcement.priority || 'normal',
        is_pinned: announcement.is_pinned || false,
        is_published: announcement.is_published ?? true,
        expires_at: announcement.expires_at || '',
        send_email_notification: false // Don't re-send on edit
      });
    } else {
      setFormData({
        title: '',
        content: '',
        priority: 'normal',
        is_pinned: false,
        is_published: true,
        expires_at: '',
        send_email_notification: false
      });
    }
  }, [announcement, isOpen]);

  const handleSave = () => {
    if (!formData.title.trim() || !formData.content.trim()) {
      return;
    }
    onSave(formData);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>
            {announcement ? 'Edit Announcement' : 'Create Announcement'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Announcement title..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content *</Label>
            <Textarea
              id="content"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write your announcement..."
              rows={6}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(value) => setFormData({ ...formData, priority: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expires">Expires On (Optional)</Label>
              <Input
                id="expires"
                type="date"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="pinned" className="font-medium">Pin Announcement</Label>
              <p className="text-xs text-gray-500">Keep at the top of the list</p>
            </div>
            <Switch
              id="pinned"
              checked={formData.is_pinned}
              onCheckedChange={(checked) => setFormData({ ...formData, is_pinned: checked })}
            />
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="published" className="font-medium">Publish Immediately</Label>
              <p className="text-xs text-gray-500">Make visible to all members</p>
            </div>
            <Switch
              id="published"
              checked={formData.is_published}
              onCheckedChange={(checked) => setFormData({ ...formData, is_published: checked })}
            />
          </div>

          {!announcement && (
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <Label htmlFor="notify" className="font-medium flex items-center gap-2">
                  <Bell className="h-4 w-4" />
                  Send Email Notification
                </Label>
                <p className="text-xs text-gray-500">Email all members about this announcement</p>
              </div>
              <Switch
                id="notify"
                checked={formData.send_email_notification}
                onCheckedChange={(checked) => setFormData({ ...formData, send_email_notification: checked })}
              />
            </div>
          )}

          {formData.send_email_notification && (
            <Alert>
              <AlertDescription>
                An email will be sent to all members with email notifications enabled.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !formData.title || !formData.content}>
            {isSaving ? 'Saving...' : announcement ? 'Update' : 'Publish'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}