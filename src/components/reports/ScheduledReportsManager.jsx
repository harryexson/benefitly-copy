import React, { useState, useEffect } from 'react';
import { ScheduledReport, User } from '@/entities/all';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Pencil, Trash2, Mail, Clock, Play, Pause, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, addWeeks, addMonths, addQuarters } from 'date-fns';
import { base44 } from '@/api/base44Client';

const REPORT_TYPES = [
  { value: 'profit_loss', label: 'Profit & Loss Statement' },
  { value: 'balance_sheet', label: 'Balance Sheet' },
  { value: 'cash_flow', label: 'Cash Flow Statement' },
  { value: 'expense_summary', label: 'Expense Summary' },
  { value: 'contribution_summary', label: 'Contribution Summary' },
  { value: 'full_financial', label: 'Full Financial Report' }
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' }
];

const PERIOD_TYPES = [
  { value: 'last_month', label: 'Last Month' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'year_to_date', label: 'Year to Date' },
  { value: 'custom', label: 'Custom Range' }
];

export default function ScheduledReportsManager() {
  const [scheduledReports, setScheduledReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    report_type: 'profit_loss',
    frequency: 'monthly',
    recipients: '',
    period_type: 'last_month',
    include_charts: true,
    is_active: true,
    custom_start_date: '',
    custom_end_date: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [reports, user] = await Promise.all([
        ScheduledReport.list(),
        User.me()
      ]);
      setScheduledReports(reports);
      setCurrentUser(user);
    } catch (error) {
      console.error('Failed to load scheduled reports:', error);
      toast.error('Failed to load scheduled reports');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateNextRunDate = (frequency) => {
    const today = new Date();
    switch (frequency) {
      case 'daily':
        return addDays(today, 1);
      case 'weekly':
        return addWeeks(today, 1);
      case 'monthly':
        return addMonths(today, 1);
      case 'quarterly':
        return addQuarters(today, 1);
      default:
        return addMonths(today, 1);
    }
  };

  const handleOpenDialog = (report = null) => {
    if (report) {
      setEditingReport(report);
      setFormData({
        name: report.name,
        report_type: report.report_type,
        frequency: report.frequency,
        recipients: report.recipients?.join(', ') || '',
        period_type: report.period_type || 'last_month',
        include_charts: report.include_charts !== false,
        is_active: report.is_active !== false,
        custom_start_date: report.custom_start_date || '',
        custom_end_date: report.custom_end_date || ''
      });
    } else {
      setEditingReport(null);
      setFormData({
        name: '',
        report_type: 'profit_loss',
        frequency: 'monthly',
        recipients: currentUser?.email || '',
        period_type: 'last_month',
        include_charts: true,
        is_active: true,
        custom_start_date: '',
        custom_end_date: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name || !formData.recipients) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSaving(true);
    try {
      const recipientList = formData.recipients.split(',').map(e => e.trim()).filter(e => e);
      const nextRunDate = calculateNextRunDate(formData.frequency);

      const reportData = {
        name: formData.name,
        report_type: formData.report_type,
        frequency: formData.frequency,
        recipients: recipientList,
        period_type: formData.period_type,
        include_charts: formData.include_charts,
        is_active: formData.is_active,
        next_run_date: format(nextRunDate, 'yyyy-MM-dd'),
        custom_start_date: formData.period_type === 'custom' ? formData.custom_start_date : null,
        custom_end_date: formData.period_type === 'custom' ? formData.custom_end_date : null
      };

      if (editingReport) {
        await ScheduledReport.update(editingReport.id, reportData);
        toast.success('Scheduled report updated');
      } else {
        await ScheduledReport.create(reportData);
        toast.success('Scheduled report created');
      }

      setIsDialogOpen(false);
      loadData();
    } catch (error) {
      console.error('Failed to save scheduled report:', error);
      toast.error('Failed to save scheduled report');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (report) => {
    if (!confirm(`Delete scheduled report "${report.name}"?`)) return;

    try {
      await ScheduledReport.delete(report.id);
      toast.success('Scheduled report deleted');
      loadData();
    } catch (error) {
      console.error('Failed to delete report:', error);
      toast.error('Failed to delete scheduled report');
    }
  };

  const handleToggleActive = async (report) => {
    try {
      await ScheduledReport.update(report.id, { is_active: !report.is_active });
      toast.success(report.is_active ? 'Report paused' : 'Report activated');
      loadData();
    } catch (error) {
      console.error('Failed to toggle report:', error);
      toast.error('Failed to update report');
    }
  };

  const handleSendNow = async (report) => {
    try {
      toast.info('Generating and sending report...');
      await base44.functions.invoke('sendScheduledReport', { reportId: report.id });
      toast.success('Report sent successfully');
      loadData();
    } catch (error) {
      console.error('Failed to send report:', error);
      toast.error('Failed to send report');
    }
  };

  const getReportTypeLabel = (type) => {
    return REPORT_TYPES.find(t => t.value === type)?.label || type;
  };

  const getFrequencyLabel = (freq) => {
    return FREQUENCIES.find(f => f.value === freq)?.label || freq;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Scheduled Reports</CardTitle>
            <CardDescription>Automate financial report delivery to administrators</CardDescription>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="w-4 h-4 mr-2" />
            New Schedule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {scheduledReports.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-medium text-gray-900 mb-2">No scheduled reports</h3>
            <p className="text-sm text-gray-500 mb-4">
              Set up automated financial reports to be emailed to administrators
            </p>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Schedule
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Report Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Frequency</TableHead>
                <TableHead>Recipients</TableHead>
                <TableHead>Next Run</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {scheduledReports.map(report => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.name}</TableCell>
                  <TableCell>{getReportTypeLabel(report.report_type)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      {getFrequencyLabel(report.frequency)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[150px] truncate" title={report.recipients?.join(', ')}>
                      {report.recipients?.length || 0} recipient(s)
                    </div>
                  </TableCell>
                  <TableCell>
                    {report.next_run_date ? format(new Date(report.next_run_date), 'MMM d, yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    <Badge variant={report.is_active ? 'default' : 'secondary'}>
                      {report.is_active ? 'Active' : 'Paused'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleSendNow(report)}
                        title="Send now"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(report)}
                        title={report.is_active ? 'Pause' : 'Activate'}
                      >
                        {report.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenDialog(report)}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(report)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Create/Edit Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingReport ? 'Edit Scheduled Report' : 'New Scheduled Report'}</DialogTitle>
              <DialogDescription>
                Configure automated financial report delivery
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Report Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Monthly Financial Summary"
                />
              </div>

              <div className="space-y-2">
                <Label>Report Type *</Label>
                <Select
                  value={formData.report_type}
                  onValueChange={(value) => setFormData({ ...formData, report_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPORT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Frequency *</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(value) => setFormData({ ...formData, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map(freq => (
                      <SelectItem key={freq.value} value={freq.value}>
                        {freq.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Report Period</Label>
                <Select
                  value={formData.period_type}
                  onValueChange={(value) => setFormData({ ...formData, period_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIOD_TYPES.map(period => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.period_type === 'custom' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input
                      type="date"
                      value={formData.custom_start_date}
                      onChange={(e) => setFormData({ ...formData, custom_start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input
                      type="date"
                      value={formData.custom_end_date}
                      onChange={(e) => setFormData({ ...formData, custom_end_date: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="recipients">Recipients (comma-separated emails) *</Label>
                <Input
                  id="recipients"
                  value={formData.recipients}
                  onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                  placeholder="admin@org.com, treasurer@org.com"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Include Charts</Label>
                  <p className="text-xs text-gray-500">Add visual charts to the report</p>
                </div>
                <Switch
                  checked={formData.include_charts}
                  onCheckedChange={(checked) => setFormData({ ...formData, include_charts: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-xs text-gray-500">Enable/disable this schedule</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Saving...' : editingReport ? 'Update' : 'Create'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}