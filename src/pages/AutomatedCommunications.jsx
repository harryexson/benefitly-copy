import React, { useState, useEffect } from 'react';
import { CommunicationAutomation } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Zap, Plus, Edit, Trash2, Play, Pause, Mail, MessageSquare } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { base44 } from '@/api/base44Client';

export default function AutomatedCommunications() {
  const [automations, setAutomations] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [isTwilioConfigured, setIsTwilioConfigured] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    trigger_type: 'contribution_reminder',
    days_before: 7,
    communication_channel: 'email',
    subject: '',
    email_body: '',
    sms_body: '',
    is_active: true,
    target_audience: 'all_members'
  });

  useEffect(() => {
    loadAutomations();
    checkTwilioConfig();
  }, []);

  const loadAutomations = async () => {
    try {
      setIsLoading(true);
      const data = await CommunicationAutomation.list('-created_date');
      setAutomations(data);
    } catch (error) {
      console.error('Failed to load automations:', error);
      toast.error('Failed to load automation rules');
    } finally {
      setIsLoading(false);
    }
  };

  const checkTwilioConfig = async () => {
    try {
      const response = await base44.functions.invoke('checkTwilioConfig');
      setIsTwilioConfigured(response.data.configured);
    } catch (error) {
      setIsTwilioConfigured(false);
    }
  };

  const handleSave = async () => {
    if (!formData.name || !formData.trigger_type) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      if (editingAutomation) {
        await CommunicationAutomation.update(editingAutomation.id, formData);
        toast.success('Automation updated successfully');
      } else {
        await CommunicationAutomation.create(formData);
        toast.success('Automation created successfully');
      }
      
      setIsDialogOpen(false);
      setEditingAutomation(null);
      resetForm();
      loadAutomations();
    } catch (error) {
      console.error('Failed to save automation:', error);
      toast.error('Failed to save automation rule');
    }
  };

  const handleEdit = (automation) => {
    setEditingAutomation(automation);
    setFormData(automation);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this automation?')) return;
    
    try {
      await CommunicationAutomation.delete(id);
      toast.success('Automation deleted');
      loadAutomations();
    } catch (error) {
      console.error('Failed to delete automation:', error);
      toast.error('Failed to delete automation');
    }
  };

  const handleToggleActive = async (automation) => {
    try {
      await CommunicationAutomation.update(automation.id, {
        is_active: !automation.is_active
      });
      toast.success(automation.is_active ? 'Automation paused' : 'Automation activated');
      loadAutomations();
    } catch (error) {
      console.error('Failed to toggle automation:', error);
      toast.error('Failed to update automation');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      trigger_type: 'contribution_reminder',
      days_before: 7,
      communication_channel: 'email',
      subject: '',
      email_body: '',
      sms_body: '',
      is_active: true,
      target_audience: 'all_members'
    });
  };

  const getTriggerLabel = (type) => {
    const labels = {
      contribution_reminder: 'Contribution Reminder',
      event_reminder: 'Event Reminder',
      membership_renewal: 'Membership Renewal',
      payment_overdue: 'Payment Overdue',
      welcome_new_member: 'Welcome New Member'
    };
    return labels[type] || type;
  };

  const getPlaceholders = () => {
    return `Available placeholders:
    {member_name} - Member's full name
    {first_name} - Member's first name
    {amount_due} - Amount owed
    {due_date} - Payment due date
    {event_title} - Event name
    {event_date} - Event date
    {portal_link} - Link to member portal`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Automated Communications</h2>
          <p className="text-gray-500">Set up automated reminders and notifications</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) {
            setEditingAutomation(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              New Automation
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingAutomation ? 'Edit Automation' : 'Create New Automation'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Automation Name</Label>
                <Input
                  placeholder="e.g., 7-Day Payment Reminder"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trigger Type</Label>
                  <Select value={formData.trigger_type} onValueChange={(value) => setFormData({...formData, trigger_type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contribution_reminder">Contribution Reminder</SelectItem>
                      <SelectItem value="event_reminder">Event Reminder</SelectItem>
                      <SelectItem value="membership_renewal">Membership Renewal</SelectItem>
                      <SelectItem value="payment_overdue">Payment Overdue</SelectItem>
                      <SelectItem value="welcome_new_member">Welcome New Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Days Before/After</Label>
                  <Input
                    type="number"
                    value={formData.days_before}
                    onChange={(e) => setFormData({...formData, days_before: parseInt(e.target.value)})}
                  />
                  <p className="text-xs text-gray-500">Positive = before, Negative = after</p>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Communication Channel</Label>
                <Select 
                  value={formData.communication_channel} 
                  onValueChange={(value) => setFormData({...formData, communication_channel: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="email">Email Only</SelectItem>
                    <SelectItem value="sms" disabled={!isTwilioConfigured}>
                      SMS Only {!isTwilioConfigured && '(Not configured)'}
                    </SelectItem>
                    <SelectItem value="both" disabled={!isTwilioConfigured}>
                      Email & SMS {!isTwilioConfigured && '(SMS not configured)'}
                    </SelectItem>
                  </SelectContent>
                </Select>
                {!isTwilioConfigured && (
                  <Alert>
                    <AlertDescription className="text-xs">
                      SMS not available. Configure Twilio in Settings to enable SMS notifications.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Select value={formData.target_audience} onValueChange={(value) => setFormData({...formData, target_audience: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_members">All Members</SelectItem>
                    <SelectItem value="active_only">Active Members Only</SelectItem>
                    <SelectItem value="overdue_only">Overdue Payments Only</SelectItem>
                    <SelectItem value="specific_event">Specific Event</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {(formData.communication_channel === 'email' || formData.communication_channel === 'both') && (
                <>
                  <div className="space-y-2">
                    <Label>Email Subject</Label>
                    <Input
                      placeholder="Payment Reminder: {event_title}"
                      value={formData.subject}
                      onChange={(e) => setFormData({...formData, subject: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Email Body</Label>
                    <Textarea
                      placeholder="Hi {first_name}, this is a reminder that your payment of {amount_due} is due on {due_date}."
                      value={formData.email_body}
                      onChange={(e) => setFormData({...formData, email_body: e.target.value})}
                      rows={6}
                    />
                    <details className="text-xs text-gray-500">
                      <summary className="cursor-pointer">Available placeholders</summary>
                      <pre className="mt-2 whitespace-pre-wrap">{getPlaceholders()}</pre>
                    </details>
                  </div>
                </>
              )}

              {(formData.communication_channel === 'sms' || formData.communication_channel === 'both') && (
                <div className="space-y-2">
                  <Label>SMS Message (max 160 characters)</Label>
                  <Textarea
                    placeholder="Hi {first_name}, payment of {amount_due} due {due_date}. Pay at {portal_link}"
                    value={formData.sms_body}
                    onChange={(e) => setFormData({...formData, sms_body: e.target.value.slice(0, 160)})}
                    rows={3}
                    maxLength={160}
                  />
                  <p className="text-xs text-gray-500">{formData.sms_body.length}/160 characters</p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({...formData, is_active: checked})}
                />
                <Label>Active (automation will run automatically)</Label>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave}>
                {editingAutomation ? 'Update' : 'Create'} Automation
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Active Automations
          </CardTitle>
          <CardDescription>Manage your automated communication rules</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-gray-500 py-8">Loading automations...</p>
          ) : automations.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No automations configured yet</p>
              <Button onClick={() => setIsDialogOpen(true)}>Create Your First Automation</Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Trigger</TableHead>
                  <TableHead>Timing</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {automations.map(automation => (
                  <TableRow key={automation.id}>
                    <TableCell className="font-medium">{automation.name}</TableCell>
                    <TableCell>{getTriggerLabel(automation.trigger_type)}</TableCell>
                    <TableCell>
                      {automation.days_before > 0 ? `${automation.days_before} days before` : 
                       automation.days_before < 0 ? `${Math.abs(automation.days_before)} days after` :
                       'On the day'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(automation.communication_channel === 'email' || automation.communication_channel === 'both') && (
                          <Mail className="h-4 w-4 text-blue-600" />
                        )}
                        {(automation.communication_channel === 'sms' || automation.communication_channel === 'both') && (
                          <MessageSquare className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={automation.is_active ? 'default' : 'secondary'}>
                        {automation.is_active ? 'Active' : 'Paused'}
                      </Badge>
                    </TableCell>
                    <TableCell>{automation.send_count || 0}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleToggleActive(automation)}
                        >
                          {automation.is_active ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(automation)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(automation.id)}
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}